import { DEFAULT_SETTINGS, type SyncGridSettings, type BookmarkMeta } from '../types'

const SETTINGS_KEY = 'syncgrid_settings'
const META_PREFIX = 'meta_'

/**
 * 設定を読み込み
 */
export async function loadSettings(): Promise<SyncGridSettings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY)
  const stored = result[SETTINGS_KEY] as Partial<SyncGridSettings> | undefined
  return { ...DEFAULT_SETTINGS, ...stored }
}

/**
 * 設定を保存
 */
export async function saveSettings(settings: Partial<SyncGridSettings>): Promise<void> {
  const current = await loadSettings()
  await chrome.storage.local.set({
    [SETTINGS_KEY]: { ...current, ...settings },
  })
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
