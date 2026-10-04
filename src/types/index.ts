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

// 出典: developers.openai.com/api/docs/models（2026-09-07確認）。
// 1ティア1モデル。gpt-5.4系は2026-08に廃止され、gpt-5系も1世代前になっている。
// 素のgpt-5.6はsol（フラッグシップ課金）へルーティングされるので、ティアまでピン留めする。
export const OPENAI_MODELS = [
  { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna' },
  { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra' },
] as const

/**
 * セレクタから外したモデルIDの移行先。
 * 保存済み設定がOPENAI_MODELSに無いIDのままだと、selectの表示と実際の送信先がずれる。
 * gpt-5.4系は廃止済みなので、残っているとAPIが404を返す。
 */
export const OPENAI_MODEL_MIGRATION: Record<string, string> = {
  'gpt-5.4-nano': 'gpt-5.6-luna',
  'gpt-5.4-mini': 'gpt-5.6-luna',
  'gpt-5-nano': 'gpt-5.6-luna',
  'gpt-5-mini': 'gpt-5.6-luna',
  'gpt-4.1-nano': 'gpt-5.6-luna',
  'gpt-4o-mini': 'gpt-5.6-luna',
}

// 出典: ai.google.dev/gemini-api/docs/latest-model?hl=ja（2026-09-06確認）。
//
// 1ティアにつき1モデルだけ載せる。同じティアに世代違いを並べると、
// 選ぶと損をするだけの選択肢が増える。
// 無料枠は1日20回でプロジェクトとモデルごとに別勘定なので2モデル置けば回数は倍になるが
// （429のquotaIdがGenerateRequestsPerDayPerProjectPerModel-FreeTier、quotaValueが20）、
// それが効くのはアプリ自身のキーで無料枠を消費する場合だけ。
// この拡張は利用者が自分のキーを入力する方式なので当てはまらない。
//
// Flashの現行は3.8（2026-09-03にGAとして発表。latest-modelページに
// 「一般提供（GA）されており、本番環境で使用できます」と明記があり、
// gemini-flash-latestの解決先でもある。latestを叩いた429の本文が
// model: gemini-3.8-flashと名指しした, 2026-09-06実測）。
// 3.8世代にProは無く、Pro相当の最新は3.1-pro-preview。preview扱いだが
// GAの2.5-proは1世代前なので併記しない。
//
// モデル一覧ページ（docs/models?hl=ja）は翻訳が遅れていて3.7/3.8が未掲載。
// そちらだけを見て古いIDへ戻さないこと。versionが"3.0"なのも異常ではなく、
// GA済みのNano Banana系（gemini-3-pro-image等）も同じ値を返す。
export const GEMINI_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview' },
] as const

/**
 * セレクタから外したモデルIDの移行先。
 * 保存済み設定がGEMINI_MODELSに無いIDのままだと、selectの表示と実際の送信先がずれる。
 * モデルを撤去したら必ずここに1行足す。これが古いIDを消す唯一の経路になる。
 */
export const GEMINI_MODEL_MIGRATION: Record<string, string> = {
  'gemini-3.6-flash': 'gemini-3.8-flash',
  'gemini-2.5-flash': 'gemini-3.8-flash',
  'gemini-2.5-pro': 'gemini-3.1-pro-preview',
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'none',
  openaiApiKey: '',
  openaiModel: 'gpt-5.6-luna',
  geminiApiKey: '',
  geminiModel: 'gemini-3.8-flash',
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

/** エクスポートデータ形式（旧フォーマットの kanban フィールドはインポート時に黙って無視される） */
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
