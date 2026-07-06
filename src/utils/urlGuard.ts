/**
 * OGP/タイトル取得で fetch してよい URL かの判定。
 * file:// 等の非 http スキームや、拡張に host permission が付与されない
 * 保護オリジンは fetch が常に失敗して chrome://extensions のエラーページを
 * 汚し続けるため、fetch 前に弾く。
 */

const FETCHABLE_PROTOCOLS = new Set(['http:', 'https:'])

/** 拡張に host permission が付与されない保護オリジン（CORSバイパス不可） */
const BLOCKED_HOSTS = new Set(['chromewebstore.google.com', 'chrome.google.com'])

export function isFetchableUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    return FETCHABLE_PROTOCOLS.has(url.protocol) && !BLOCKED_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}
