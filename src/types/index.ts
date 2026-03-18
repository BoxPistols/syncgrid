import type { Locale } from '../i18n'

/** レイアウトモード: magazine(小カードグリッド) / card(大カード) / list(横長行) */
export type LayoutMode = 'magazine' | 'card' | 'list'

/** カードサイズ */
export type CardSize = 'sm' | 'md' | 'lg'

/** グリッド列数 (auto=自動, 2-6=固定列数) */
export type GridColumns = 'auto' | 2 | 3 | 4 | 5 | 6

/** ソートモード */
export type SortMode = 'manual' | 'name-asc' | 'name-desc' | 'date-new' | 'date-old' | 'domain' | 'last-read'

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
  layoutMagazine: KeyBinding
  layoutCard: KeyBinding
  layoutList: KeyBinding
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

/** OGPプレビュー情報（キャッシュ用） */
export interface OgpData {
  title?: string
  description?: string
  image?: string
  siteName?: string
  fetchedAt: number
}

/** ゴミ箱アイテム */
export interface TrashItem {
  id: string
  title: string
  url: string
  parentId: string
  parentTitle: string
  deletedAt: number
}

/** ブックマーク閲覧ステータス */
export type ReadStatus = 'unread' | 'read' | 'later' | 'starred'

/** ローカルメタデータ（chrome.storage.local） */
export interface BookmarkMeta {
  memo: string
  tags?: string[]
  ogp?: OgpData
  status?: ReadStatus
  lastReadAt?: number
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
  /** 最終同期日時 (ISO string) */
  lastSyncedAt: string
  /** AI設定 */
  ai: AISettings
  /** レイアウトモード */
  layout: LayoutMode
  /** カードサイズ */
  cardSize: CardSize
  /** グリッド列数 */
  gridColumns: GridColumns
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
  layoutMagazine: kb('1', { mod: true }),
  layoutCard: kb('2', { mod: true }),
  layoutList: kb('3', { mod: true }),
  deleteSelected: kb('Delete'),
  selectAll: kb('a', { mod: true }),
}

export const DEFAULT_SETTINGS: SyncGridSettings = {
  theme: 'system',
  locale: 'ja',
  activeTabId: '',
  lastSyncedAt: '',
  ai: DEFAULT_AI_SETTINGS,
  layout: 'list', // magazine | card | list
  cardSize: 'md',
  gridColumns: 'auto' as GridColumns,
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
