/**
 * ページのHTMLを取得して<title>タグを抽出する
 * CORSで失敗する場合はnullを返す
 */
export async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'text/html' },
    })
    if (!res.ok) return null
    const reader = res.body?.getReader()
    if (!reader) return null
    let html = ''
    const decoder = new TextDecoder()
    while (html.length < 50000) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (match) {
        reader.cancel()
        return decodeHtmlEntities(match[1].trim())
      }
    }
    reader.cancel()
    return null
  } catch {
    return null
  }
}

/** HTMLエンティティをデコード */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
}
