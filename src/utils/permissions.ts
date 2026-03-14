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
