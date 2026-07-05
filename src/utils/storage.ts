import {
  DEFAULT_SETTINGS,
  DEFAULT_AI_SETTINGS,
  DEFAULT_SHORTCUTS,
  type SyncGridSettings,
  type BookmarkMeta,
  type LayoutMode,
  type SortMode,
} from '../types'

import type { ShortcutConfig } from '../types'

const SETTINGS_KEY = 'syncgrid_settings'
const META_PREFIX = 'meta_'

/**
 * 設定を読み込み（ネストされたオブジェクトもデフォルト値とマージ）
 */
export async function loadSettings(): Promise<SyncGridSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY)
  const stored = result[SETTINGS_KEY]
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return { ...DEFAULT_SETTINGS }
  }
  const s = stored as Partial<SyncGridSettings>
  const VALID_LAYOUTS: LayoutMode[] = ['magazine', 'card', 'list']
  const VALID_SORTS: SortMode[] = ['manual', 'name-asc', 'name-desc', 'date-new', 'date-old', 'domain', 'last-read']
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    ai: { ...DEFAULT_AI_SETTINGS, ...(s.ai ?? {}) },
    layout: VALID_LAYOUTS.includes(s.layout as LayoutMode) ? (s.layout as LayoutMode) : DEFAULT_SETTINGS.layout,
    sort: VALID_SORTS.includes(s.sort as SortMode) ? (s.sort as SortMode) : DEFAULT_SETTINGS.sort,
    shortcuts: migrateShortcuts(s.shortcuts),
  }
}

/** ショートカット設定のマイグレーション（旧compact→magazine） */
function migrateShortcuts(stored: Partial<ShortcutConfig> | undefined): ShortcutConfig {
  if (!stored) return DEFAULT_SHORTCUTS
  const result = { ...DEFAULT_SHORTCUTS }
  for (const key of Object.keys(DEFAULT_SHORTCUTS) as (keyof ShortcutConfig)[]) {
    if (stored[key]) result[key] = stored[key]
  }
  if (!stored.layoutMagazine && (stored as Record<string, unknown>).layoutCompact) {
    result.layoutMagazine = DEFAULT_SHORTCUTS.layoutMagazine
    result.layoutCard = DEFAULT_SHORTCUTS.layoutCard
    result.layoutList = DEFAULT_SHORTCUTS.layoutList
  }
  return result
}

/**
 * 設定を保存（プロミスチェーンにより並列書き込みの競合を防止）
 */
let saveQueue: Promise<void> = Promise.resolve()

export async function saveSettings(settings: Partial<SyncGridSettings>): Promise<void> {
  saveQueue = saveQueue.then(async () => {
    const current = await loadSettings()
    await chrome.storage.local.set({
      [SETTINGS_KEY]: { ...current, ...settings },
    })
  })
  return saveQueue
}

/**
 * ブックマークのメタデータを読み込み
 */
export async function loadMeta(bookmarkId: string): Promise<BookmarkMeta | null> {
  const key = META_PREFIX + bookmarkId
  const result = await chrome.storage.local.get(key)
  return (result[key] as BookmarkMeta) || null
}

/**
 * ブックマークのメタデータを保存
 */
export async function saveMeta(bookmarkId: string, meta: BookmarkMeta): Promise<void> {
  await chrome.storage.local.set({
    [META_PREFIX + bookmarkId]: meta,
  })
}

/**
 * 現存しないブックマークの孤立メタデータ（meta_*）を削除する。
 * 走査ついでに生存メタを返すので、呼び出し側は追加の loadAllMeta が不要。
 * @param validBookmarkIds 現存するブックマークIDの集合
 * @returns removed=削除件数、metas=生存メタのマップ
 */
export async function pruneOrphanMeta(
  validBookmarkIds: Set<string>,
): Promise<{ removed: number; metas: Record<string, BookmarkMeta> }> {
  const all = await chrome.storage.local.get(null)
  const orphanKeys: string[] = []
  const metas: Record<string, BookmarkMeta> = {}
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(META_PREFIX)) {
      const id = key.slice(META_PREFIX.length)
      if (validBookmarkIds.has(id)) {
        metas[id] = value as BookmarkMeta
      } else {
        orphanKeys.push(key)
      }
    }
  }
  if (orphanKeys.length > 0) {
    await chrome.storage.local.remove(orphanKeys)
  }
  return { removed: orphanKeys.length, metas }
}

/**
 * 全メタデータを一括読み込み
 */
export async function loadAllMeta(): Promise<Record<string, BookmarkMeta>> {
  const all = await chrome.storage.local.get(null)
  const metas: Record<string, BookmarkMeta> = {}
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(META_PREFIX)) {
      metas[key.replace(META_PREFIX, '')] = value as BookmarkMeta
    }
  }
  return metas
}
