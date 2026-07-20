import type { Locale } from '../i18n'

/** レイアウトモード: tabmark(コンパクトグリッド) / list(詳細リスト) */
export type LayoutMode = 'tabmark' | 'list'

/** ソートモード */
export type SortMode = 'manual' | 'name-asc' | 'name-desc' | 'date-new' | 'date-old' | 'domain' | 'last-used'

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
  layoutTabmark: KeyBinding
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

/** カンバン列 */
export type KanbanColumn = 'todo' | 'doing' | 'done'

/** カンバンアイテム（URLベースで端末間同期対応） */
export interface KanbanItem {
  /** 端末間の安定識別子 */
  url: string
  column: KanbanColumn
  /** 列内順序（疎な値。1000刻み推奨で挿入コストを軽減） */
  order: number
  /** 期限（UTCタイムスタンプ） */
  dueDate?: number
  /** このアイテムが最後に変更された時刻（アイテム単位last-write-wins用） */
  updatedAt: number
  /** 削除トゥームストーン（削除時刻）。存在する間はUI非表示、マージで「削除 vs 更新」を裁定 */
  deletedAt?: number
}

/** カンバン永続化データ（v2: アイテム単位マージ） */
export interface KanbanState {
  /** スキーマバージョン。v1（schema欠落）はロード時にv2へマイグレーションされる */
  schema: 2
  items: KanbanItem[]
  /** board全体の最終更新時刻（表示用。マージ判定には使わない） */
  updatedAt: number
}

/** ピン留め: URL → pinnedAt(ms)。URLキーで端末間同期に対応（Kanbanと同方針） */
export type PinnedMap = Record<string, number>

/** ピン留め上限（chrome.storage.sync の 8KB/item 制限内に収める） */
export const MAX_PINNED = 100

/** ローカルメタデータ（chrome.storage.local） */
export interface BookmarkMeta {
  memo: string
  tags?: string[]
  ogp?: OgpData
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
  { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano' },
  { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
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
  openaiModel: 'gpt-5.4-nano',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
}

/** GitHub 連携設定（Token は local のみ保存。sync には載せない） */
export interface GitHubSettings {
  token: string
}

export const DEFAULT_GITHUB_SETTINGS: GitHubSettings = { token: '' }

/** GitHub アクティビティ種別 */
export type GitHubEventKind = 'commit' | 'pr' | 'issue' | 'star' | 'release' | 'create'

/** GitHub 仮想フォルダの1アイテム（読み取り専用。Bookmarks には書き込まない） */
export interface GitHubActivityItem {
  /** event.id（コミットは +sha サフィックス） */
  id: string
  kind: GitHubEventKind
  title: string
  url: string
  /** "owner/name" */
  repo: string
  createdAt: number
}

/** GitHub アクティビティキャッシュ（chrome.storage.local、TTL管理） */
export interface GitHubActivityCache {
  login: string
  items: GitHubActivityItem[]
  fetchedAt: number
  etag?: string
}

/** 壁紙タイプ */
export type WallpaperType = 'default' | 'preset' | 'color' | 'image'

/** 壁紙設定（軽量メタのみ。画像本体は専用キー syncgrid_wallpaper_image に分離） */
export interface WallpaperSettings {
  type: WallpaperType
  /** WALLPAPER_PRESETS の id（type='preset' 時） */
  presetId: string
  /** 単色背景（type='color' 時） */
  color: string
  /** 前景コントラスト確保用オーバーレイ濃度 0–0.6 */
  dim: number
}

export const DEFAULT_WALLPAPER: WallpaperSettings = {
  type: 'default',
  presetId: '',
  color: '#04080f',
  dim: 0.15,
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
  /** ソートモード */
  sort: SortMode
  /** キーボードショートカット */
  shortcuts: ShortcutConfig
  /** 壁紙設定 */
  wallpaper: WallpaperSettings
  /** GitHub 連携設定 */
  github: GitHubSettings
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
  layoutTabmark: kb('1', { mod: true }),
  layoutList: kb('2', { mod: true }),
  deleteSelected: kb('Delete'),
  selectAll: kb('a', { mod: true }),
}

export const DEFAULT_SETTINGS: SyncGridSettings = {
  theme: 'system',
  locale: 'ja',
  activeTabId: '',
  lastSyncedAt: '',
  ai: DEFAULT_AI_SETTINGS,
  layout: 'list' as LayoutMode,
  sort: 'manual',
  shortcuts: DEFAULT_SHORTCUTS,
  wallpaper: DEFAULT_WALLPAPER,
  github: DEFAULT_GITHUB_SETTINGS,
}

/** エクスポートデータ形式 */
export interface SyncGridExport {
  version: 1
  exportedAt: string
  appName: 'SyncGrid'
  checksum: string
  data: SyncGridExportGroup[]
  /** カンバンデータ（v1.1〜） */
  kanban?: KanbanState
}

export interface SyncGridExportGroup {
  title: string
  items: { title: string; url: string }[]
  children: SyncGridExportGroup[]
}

/** SyncGridのルートフォルダ名 */
export const SYNCGRID_ROOT = '__SyncGrid__'
