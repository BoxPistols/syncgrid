import type { Locale } from '../i18n'

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
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
] as const

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'none',
  openaiApiKey: '',
  openaiModel: 'gpt-4.1-nano',
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
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
}

export const DEFAULT_SETTINGS: SyncGridSettings = {
  theme: 'system',
  locale: 'ja',
  activeTabId: '',
  lastPath: [],
  lastSyncedAt: '',
  ai: DEFAULT_AI_SETTINGS,
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
