/**
 * Chrome拡張パーミッション管理
 * タイトル自動取得にはオプショナルhost_permissionsが必要
 */

const TITLE_FETCH_ORIGINS: chrome.permissions.Permissions = {
  origins: ['https://*/*', 'http://*/*'],
}

/** タイトル取得用パーミッションが付与済みか確認 */
export async function hasTitleFetchPermission(): Promise<boolean> {
  try {
    return await chrome.permissions.contains(TITLE_FETCH_ORIGINS)
  } catch {
    return false
  }
}

/** タイトル取得用パーミッションをリクエスト（ユーザージェスチャー必須） */
export async function requestTitleFetchPermission(): Promise<boolean> {
  try {
    return await chrome.permissions.request(TITLE_FETCH_ORIGINS)
  } catch {
    return false
  }
}

/** AIプロバイダ別のAPIエンドポイントorigin */
const AI_PROVIDER_ORIGINS: Record<string, string> = {
  openai: 'https://api.openai.com/*',
  gemini: 'https://generativelanguage.googleapis.com/*',
}

/** 指定AIプロバイダのホスト権限が付与済みか確認 */
export async function hasAiPermission(provider: string): Promise<boolean> {
  const origin = AI_PROVIDER_ORIGINS[provider]
  if (!origin) return false
  try {
    return await chrome.permissions.contains({ origins: [origin] })
  } catch {
    return false
  }
}

/** 指定AIプロバイダのホスト権限をリクエスト（ユーザージェスチャー必須） */
export async function requestAiPermission(provider: string): Promise<boolean> {
  const origin = AI_PROVIDER_ORIGINS[provider]
  if (!origin) return false
  try {
    return await chrome.permissions.request({ origins: [origin] })
  } catch {
    return false
  }
}

/**
 * AIホスト権限を確保する（未付与ならリクエスト）。
 * ユーザージェスチャー起点のAI機能から呼ぶこと。
 * 付与できなくても false を返すだけで、後続のfetch失敗として扱われる。
 */
export async function ensureAiPermission(provider: string): Promise<boolean> {
  if (await hasAiPermission(provider)) return true
  return requestAiPermission(provider)
}
