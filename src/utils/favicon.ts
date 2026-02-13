/**
 * Chrome拡張 favicon API を使用（permission: "favicon" が必要）
 * chrome://favicon2/ はブラウザキャッシュから取得するので高速・確実
 * 外部ネットワーク不要
 */
export function getFaviconUrl(url: string, size: number = 32): string {
  try {
    const pageUrl = new URL(url).href
    // Chrome favicon2 API: キャッシュ済みファビコンを取得
    // show_fallback_monogram: ファビコンが無い場合にイニシャルアイコンを表示
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`
  } catch {
    return ''
  }
}

/**
 * URLからドメイン名を抽出
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
