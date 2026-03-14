import type { Locale } from '../i18n'

/** レイアウトモード */
export type LayoutMode = 'card' | 'list' | 'compact'

/** ソートモード */
export type SortMode = 'manual' | 'name-asc' | 'name-desc' | 'date-new' | 'date-old' | 'domain'

/** キーバインド定義 */
export interface KeyBinding {
  key: string
  meta: boolean
  ctrl: boolean
  shift: boolean
  alt: boolean
}

/** ショートカット設定 */
export interface ShortcutConfig {
  search: KeyBinding
  addBookmark: KeyBinding
  layoutCard: KeyBinding
  layoutList: KeyBinding
  layoutCompact: KeyBinding
  deleteSelected: KeyBinding
  selectAll: KeyBinding
}

/** ショートカットアクション名 */
export type ShortcutAction = keyof ShortcutConfig

/** SyncGrid内のブックマーク1件 */
export interface SyncGridItem {
  id: string
  title: string
  url: string
  dateAdded?: number
  parentId: string
}

/** SyncGrid内のグループ（フォルダ） — 再帰構造 */
export interface SyncGridGroup {
  id: string
  title: string
  items: SyncGridItem[]
  children: SyncGridGroup[]
  parentId: string
  depth: number
}

/** ローカルメタデータ（chrome.storage.local） */
export interface BookmarkMeta {
  memo: string
}

/** AI プロバイダ */
export type AIProvider = 'none' | 'openai' | 'gemini'

/** AI設定 */
export interface AISettings {
  provider: AIProvider
  openaiApiKey: string
  openaiModel: string
  geminiApiKey: string
  geminiModel: string
}

export const OPENAI_MODELS = [
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { id: 'gpt-5-nano', label: 'GPT-5 Nano' },
  { id: 'gpt-5-mini', label: 'GPT-5 Mini' },
] as const

export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
] as const

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'none',
  openaiApiKey: '',
  openaiModel: 'gpt-4.1-nano',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
}

/** アプリ設定 */
export interface SyncGridSettings {
  theme: 'light' | 'dark' | 'system'
  locale: Locale
  activeTabId: string
  lastPath: string[]
  /** 最終同期日時 (ISO string) */
  lastSyncedAt: string
  /** AI設定 */
  ai: AISettings
  /** レイアウトモード */
  layout: LayoutMode
  /** ソートモード */
  sort: SortMode
  /** キーボードショートカット */
  shortcuts: ShortcutConfig
}

const _isMac =
  typeof navigator !== 'undefined' &&
  (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent))

/** OS判定済みデフォルトキーバインド */
function kb(key: string, opts: { mod?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean } = {}): KeyBinding {
  return {
    key,
    meta: opts.mod ? _isMac : false,
    ctrl: opts.mod ? !_isMac : !!opts.ctrl,
    shift: !!opts.shift,
    alt: !!opts.alt,
  }
}

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  search: kb('k', { mod: true }),
  addBookmark: kb('n', { ctrl: true }),
  layoutCard: kb('1', { mod: true }),
  layoutList: kb('2', { mod: true }),
  layoutCompact: kb('3', { mod: true }),
  deleteSelected: kb('Delete'),
  selectAll: kb('a', { mod: true }),
}

export const DEFAULT_SETTINGS: SyncGridSettings = {
  theme: 'system',
  locale: 'ja',
  activeTabId: '',
  lastPath: [],
  lastSyncedAt: '',
  ai: DEFAULT_AI_SETTINGS,
  layout: 'list',
  sort: 'manual',
  shortcuts: DEFAULT_SHORTCUTS,
}

/** エクスポートデータ形式 */
export interface SyncGridExport {
  version: 1
  exportedAt: string
  appName: 'SyncGrid'
  checksum: string
  data: SyncGridExportGroup[]
}

export interface SyncGridExportGroup {
  title: string
  items: { title: string; url: string }[]
  children: SyncGridExportGroup[]
}

/** SyncGridのルートフォルダ名 */
export const SYNCGRID_ROOT = '__SyncGrid__'
