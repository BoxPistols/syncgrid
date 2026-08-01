/**
 * Chrome拡張 favicon API を使用（permission: "favicon" が必要）
 * chrome://favicon2/ はブラウザキャッシュから取得するので高速・確実
 * 外部ネットワーク不要
 */
export function getFaviconUrl(url: string, size: number = 32): string {
  try {
    const pageUrl = new URL(url).href
    const extensionId = typeof chrome !== 'undefined' ? chrome.runtime?.id : undefined
    // The favicon endpoint is only available inside the loaded extension.
    // Avoid emitting an invalid chrome-extension:/// URL in Vite dev mode.
    if (!extensionId) return ''
    // Chrome favicon2 API: キャッシュ済みファビコンを取得
    // show_fallback_monogram: ファビコンが無い場合にイニシャルアイコンを表示
    return `chrome-extension://${extensionId}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`
  } catch {
    // 不正なURLの場合は空文字（BookmarkCardのfallback UIが表示される）
    return ''
  }
}

/**
 * URLからドメイン名を抽出
 * 不正なURLの場合は元のURLの先頭部分を返す
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    // URLパース不可の場合、プロトコルやパスを除去して返す
    const cleaned = url.replace(/^[a-z]+:\/\//i, '').split('/')[0]
    return cleaned || url
  }
}
