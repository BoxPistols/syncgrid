/**
 * SyncGrid Data Export / Import
 *
 * Security:
 * - Export: SHA-256 checksum for integrity verification
 * - Import: Schema validation + URL sanitization + checksum verification
 * - No eval() or innerHTML — pure JSON parsing
 */

import type { SyncGridGroup, SyncGridExport, SyncGridExportGroup } from '../types'
import { SYNCGRID_ROOT } from '../types'

// ===== EXPORT =====

function groupToExport(group: SyncGridGroup): SyncGridExportGroup {
  return {
    title: group.title,
    items: group.items.map(i => ({ title: i.title, url: i.url })),
    children: group.children.map(groupToExport),
  }
}

async function sha256(data: string): Promise<string> {
  const buf = new TextEncoder().encode(data)
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function exportData(groups: SyncGridGroup[]): Promise<SyncGridExport> {
  const data = groups.map(groupToExport)
  const dataStr = JSON.stringify(data)
  const checksum = await sha256(dataStr)

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    appName: 'SyncGrid',
    checksum,
    data,
  }
}

export function downloadExport(exportObj: SyncGridExport): void {
  const json = JSON.stringify(exportObj, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const a = document.createElement('a')
  a.href = url
  a.download = `syncgrid-backup-${ts}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ===== IMPORT — with security validation =====

const MAX_IMPORT_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_TITLE_LENGTH = 512
const MAX_URL_LENGTH = 2048
const MAX_DEPTH = 10

/** Allowed URL protocols */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'ftp:', 'chrome:', 'chrome-extension:', 'file:']

function sanitizeString(s: unknown, maxLen: number): string {
  if (typeof s !== 'string') return ''
  // Strip control characters except newline/tab
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, maxLen)
}

function validateUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return ALLOWED_PROTOCOLS.includes(u.protocol)
  } catch {
    return false
  }
}

function validateExportGroup(g: unknown, depth: number): g is SyncGridExportGroup {
  if (depth > MAX_DEPTH) return false
  if (!g || typeof g !== 'object') return false
  const obj = g as Record<string, unknown>

  if (typeof obj.title !== 'string') return false
  if (!Array.isArray(obj.items)) return false
  if (!Array.isArray(obj.children)) return false

  for (const item of obj.items) {
    if (!item || typeof item !== 'object') return false
    const it = item as Record<string, unknown>
    if (typeof it.title !== 'string' || typeof it.url !== 'string') return false
    if (!validateUrl(it.url)) return false
  }

  for (const child of obj.children) {
    if (!validateExportGroup(child, depth + 1)) return false
  }

  return true
}

export async function validateImport(text: string): Promise<SyncGridExport | null> {
  if (text.length > MAX_IMPORT_SIZE) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>

  // Version check
  if (obj.version !== 1) return null
  if (obj.appName !== 'SyncGrid') return null
  if (typeof obj.checksum !== 'string') return null
  if (!Array.isArray(obj.data)) return null

  // Validate structure
  for (const group of obj.data) {
    if (!validateExportGroup(group, 0)) return null
  }

  // Verify checksum
  const dataStr = JSON.stringify(obj.data)
  const expected = await sha256(dataStr)
  if (expected !== obj.checksum) return null

  // Sanitize
  const sanitized = sanitizeExportData(obj.data as SyncGridExportGroup[])

  return {
    version: 1,
    exportedAt: sanitizeString(obj.exportedAt, 64),
    appName: 'SyncGrid',
    checksum: obj.checksum as string,
    data: sanitized,
  }
}

function sanitizeExportData(groups: SyncGridExportGroup[]): SyncGridExportGroup[] {
  return groups.map(g => ({
    title: sanitizeString(g.title, MAX_TITLE_LENGTH),
    items: g.items
      .filter(i => validateUrl(i.url))
      .map(i => ({
        title: sanitizeString(i.title, MAX_TITLE_LENGTH),
        url: sanitizeString(i.url, MAX_URL_LENGTH),
      })),
    children: sanitizeExportData(g.children),
  }))
}

export async function importToBookmarks(data: SyncGridExportGroup[]): Promise<void> {
  // Find or create root
  const results = await chrome.bookmarks.search({ title: SYNCGRID_ROOT })
  const root = results.find(n => !n.url && n.title === SYNCGRID_ROOT)

  if (root) {
    // Clear existing children
    const [tree] = await chrome.bookmarks.getSubTree(root.id)
    if (tree.children) {
      for (const child of tree.children) {
        await chrome.bookmarks.removeTree(child.id)
      }
    }
    await restoreGroups(data, root.id)
  } else {
    const newRoot = await chrome.bookmarks.create({ parentId: '2', title: SYNCGRID_ROOT })
    await restoreGroups(data, newRoot.id)
  }
}

async function restoreGroups(groups: SyncGridExportGroup[], parentId: string): Promise<void> {
  for (const group of groups) {
    const folder = await chrome.bookmarks.create({ parentId, title: group.title })
    for (const item of group.items) {
      await chrome.bookmarks.create({ parentId: folder.id, title: item.title, url: item.url })
    }
    await restoreGroups(group.children, folder.id)
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMPORT_SIZE) {
      reject(new Error('File too large'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
