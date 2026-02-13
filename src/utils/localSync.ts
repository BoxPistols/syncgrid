/**
 * Local Folder Sync — File System Access API
 *
 * Writes SyncGrid backup JSON to a user-selected local folder.
 * The folder is typically synced via cloud drives (Google Drive, OneDrive, iCloud, Dropbox).
 *
 * Security:
 * - Uses File System Access API — requires explicit user permission per session
 * - Directory handle is stored in IndexedDB (persisted across sessions)
 * - Only writes to the user-chosen directory; never reads other files
 * - File name is fixed: syncgrid-sync.json
 */

import type { SyncGridGroup, SyncGridExport } from '../types'
import { exportData } from './dataTransfer'

const SYNC_FILENAME = 'syncgrid-sync.json'
const IDB_NAME = 'syncgrid-fs'
const IDB_STORE = 'handles'
const IDB_KEY = 'syncDir'

// ===== IndexedDB for persisting directory handle =====

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveDirHandle(handle: FileSystemDirectoryHandle | null): Promise<void> {
  const db = await openIDB()
  const tx = db.transaction(IDB_STORE, 'readwrite')
  const store = tx.objectStore(IDB_STORE)
  if (handle) {
    store.put(handle, IDB_KEY)
  } else {
    store.delete(IDB_KEY)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function loadDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB()
    const tx = db.transaction(IDB_STORE, 'readonly')
    const store = tx.objectStore(IDB_STORE)
    const req = store.get(IDB_KEY)
    return new Promise((resolve) => {
      req.onsuccess = () => { db.close(); resolve(req.result ?? null) }
      req.onerror = () => { db.close(); resolve(null) }
    })
  } catch {
    return null
  }
}

// ===== Public API =====

/** Check if File System Access API is supported */
export function isSyncSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/** Prompt user to pick a directory */
export async function pickSyncFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    })
    await saveDirHandle(handle)
    return handle
  } catch {
    // User cancelled or denied
    return null
  }
}

/** Get saved directory handle (may require re-permission) */
export async function getSyncHandle(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await loadDirHandle()
  if (!handle) return null

  // Verify permission is still granted
  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' })
    if (perm === 'granted') return handle

    // Request permission again
    const req = await handle.requestPermission({ mode: 'readwrite' })
    return req === 'granted' ? handle : null
  } catch {
    return null
  }
}

/** Write sync file to the directory */
export async function syncToFolder(
  groups: SyncGridGroup[],
  handle?: FileSystemDirectoryHandle | null
): Promise<{ success: boolean; syncedAt: string }> {
  const dir = handle ?? await getSyncHandle()
  if (!dir) return { success: false, syncedAt: '' }

  try {
    const exportObj: SyncGridExport = await exportData(groups)
    const json = JSON.stringify(exportObj, null, 2)

    // Atomic write: write to temp file then rename
    const tmpName = `${SYNC_FILENAME}.tmp`
    const tmpFile = await dir.getFileHandle(tmpName, { create: true })
    const writable = await tmpFile.createWritable()
    await writable.write(json)
    await writable.close()

    // Rename: remove old, rename tmp (File System Access API doesn't have rename)
    try { await dir.removeEntry(SYNC_FILENAME) } catch { /* not found — OK */ }
    // Copy approach: write final, remove tmp
    const finalFile = await dir.getFileHandle(SYNC_FILENAME, { create: true })
    const finalWritable = await finalFile.createWritable()
    await finalWritable.write(json)
    await finalWritable.close()
    try { await dir.removeEntry(tmpName) } catch { /* cleanup */ }

    const syncedAt = new Date().toISOString()
    return { success: true, syncedAt }
  } catch (err) {
    console.error('[SyncGrid] Sync failed:', err)
    return { success: false, syncedAt: '' }
  }
}

/** Disconnect: clear saved handle */
export async function disconnectSync(): Promise<void> {
  await saveDirHandle(null)
}

/** Get the folder name (for display) */
export async function getSyncFolderName(): Promise<string | null> {
  const handle = await loadDirHandle()
  return handle?.name ?? null
}
