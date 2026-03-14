/**
 * ページの<title>タグを取得するユーティリティ
 * Chrome拡張のoptional_host_permissionsでCORSバイパス
 */

import { hasTitleFetchPermission, requestTitleFetchPermission } from './permissions'

/**
 * ページタイトルを取得（パーミッション確認済みの場合のみ）
 * パーミッション未付与時はnullを返す
 */
export async function fetchPageTitle(url: string): Promise<string | null> {
  const hasPermission = await hasTitleFetchPermission()
  if (!hasPermission) return null
  return doFetch(url)
}

/**
 * パーミッションをリクエストしてからページタイトルを取得
 * ユーザージェスチャー（ボタンクリック等）のコンテキストで呼ぶこと
 */
export async function fetchPageTitleWithPermission(url: string): Promise<string | null> {
  const granted = await requestTitleFetchPermission()
  if (!granted) return null
  return doFetch(url)
}

/**
 * Content-TypeヘッダーまたはHTML内のmeta charsetからエンコーディングを検出
 */
function detectEncoding(contentType: string | null, htmlBytes: Uint8Array): string {
  // Content-Typeヘッダーから検出
  if (contentType) {
    const match = contentType.match(/charset=([^\s;]+)/i)
    if (match) return match[1].trim()
  }

  // HTMLの先頭部分をASCIIとして読んでmeta charsetを探す
  const ascii = new TextDecoder('ascii', { fatal: false }).decode(htmlBytes.slice(0, 2000))

  // <meta charset="xxx">
  const metaCharset = ascii.match(/<meta[^>]+charset=["']?([^"'\s;>]+)/i)
  if (metaCharset) return metaCharset[1]

  // <meta http-equiv="Content-Type" content="text/html; charset=xxx">
  const httpEquiv = ascii.match(/content=["'][^"']*charset=([^"'\s;]+)/i)
  if (httpEquiv) return httpEquiv[1]

  return 'utf-8'
}

/** 実際のfetch処理 */
async function doFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'text/html' },
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type')
    const reader = res.body?.getReader()
    if (!reader) return null

    const chunks: Uint8Array[] = []
    let totalLength = 0

    while (totalLength < 50000) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        totalLength += value.length
      }

      // チャンクを結合してエンコーディング検出 + title検索
      const merged = mergeChunks(chunks, totalLength)
      const encoding = detectEncoding(contentType, merged)
      const html = new TextDecoder(normalizeEncoding(encoding), { fatal: false }).decode(merged)

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

/** Uint8Arrayの配列を結合 */
function mergeChunks(chunks: Uint8Array[], totalLength: number): Uint8Array {
  if (chunks.length === 1) return chunks[0]
  const merged = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return merged
}

/** TextDecoderが受け付けるエンコーディング名に正規化 */
function normalizeEncoding(encoding: string): string {
  const lower = encoding.toLowerCase().replace(/[_-]/g, '')
  const map: Record<string, string> = {
    shiftjis: 'shift_jis',
    sjis: 'shift_jis',
    xsjis: 'shift_jis',
    eucjp: 'euc-jp',
    xeucjp: 'euc-jp',
    iso2022jp: 'iso-2022-jp',
  }
  return map[lower] ?? encoding
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
