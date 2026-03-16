/**
 * ページの<title>タグ・OGP情報を取得するユーティリティ
 * Chrome拡張のoptional_host_permissionsでCORSバイパス
 */

import { hasTitleFetchPermission, requestTitleFetchPermission } from './permissions'
import type { OgpData } from '../types'

/**
 * ページタイトルを取得
 * 優先順: oEmbed → HTMLフェッチ → null
 */
export async function fetchPageTitle(url: string): Promise<string | null> {
  const oembed = await fetchOembedTitle(url)
  if (oembed) return oembed

  const hasPermission = await hasTitleFetchPermission()
  if (!hasPermission) return null
  const html = await fetchHead(url)
  if (!html) return null
  return extractTitle(html)
}

/**
 * パーミッションをリクエストしてからページタイトルを取得
 * oEmbed → permission request → HTMLフェッチ
 */
export async function fetchPageTitleWithPermission(url: string): Promise<string | null> {
  const oembed = await fetchOembedTitle(url)
  if (oembed) return oembed

  const granted = await requestTitleFetchPermission()
  if (!granted) return null
  const html = await fetchHead(url)
  if (!html) return null
  return extractTitle(html)
}

/**
 * タイトル強制再取得 — キャッシュやパーミッション状態に関わらず全手段を試す
 */
export async function refetchTitle(url: string): Promise<string | null> {
  // 1. oEmbed（パーミッション不要）
  const oembed = await fetchOembedTitle(url)
  if (oembed) return oembed

  // 2. HTMLフェッチ（パーミッションがあれば）
  const hasPermission = await hasTitleFetchPermission()
  if (hasPermission) {
    const html = await fetchHead(url)
    if (html) {
      const title = extractTitle(html)
      if (title) return title
    }
  }

  // 3. パーミッションリクエスト（ユーザージェスチャーコンテキスト）
  const granted = await requestTitleFetchPermission()
  if (granted) {
    const html = await fetchHead(url)
    if (html) return extractTitle(html)
  }

  return null
}

/**
 * OGP情報を取得（パーミッション確認済みの場合のみ）
 */
export async function fetchOgp(url: string): Promise<OgpData | null> {
  // oEmbed対応サイトはoEmbedから基本情報を取得
  const oembedProviders: { pattern: RegExp; endpoint: string }[] = [
    { pattern: /(?:youtube\.com\/watch|youtu\.be\/)/, endpoint: 'https://www.youtube.com/oembed' },
    { pattern: /vimeo\.com\//, endpoint: 'https://vimeo.com/api/oembed.json' },
  ]
  for (const { pattern, endpoint } of oembedProviders) {
    if (pattern.test(url)) {
      try {
        const res = await fetch(`${endpoint}?url=${encodeURIComponent(url)}&format=json`, {
          signal: AbortSignal.timeout(5000),
        })
        if (res.ok) {
          const data = await res.json()
          return {
            title: data.title,
            description: data.author_name ? `by ${data.author_name}` : undefined,
            image: data.thumbnail_url,
            siteName: data.provider_name,
            fetchedAt: Date.now(),
          }
        }
      } catch { /* fallthrough */ }
    }
  }

  const hasPermission = await hasTitleFetchPermission()
  if (!hasPermission) return null
  const html = await fetchHead(url)
  if (!html) return null
  return extractOgp(html)
}

/**
 * oEmbed対応サイトからタイトルを取得（CORS不要・host_permissions不要）
 * YouTube, Vimeo等に対応
 */
async function fetchOembedTitle(url: string): Promise<string | null> {
  const oembedProviders: { pattern: RegExp; endpoint: string }[] = [
    { pattern: /(?:youtube\.com\/watch|youtu\.be\/)/, endpoint: 'https://www.youtube.com/oembed' },
    { pattern: /vimeo\.com\//, endpoint: 'https://vimeo.com/api/oembed.json' },
    { pattern: /(?:x\.com|twitter\.com)\//, endpoint: 'https://publish.twitter.com/oembed' },
  ]

  for (const { pattern, endpoint } of oembedProviders) {
    if (pattern.test(url)) {
      try {
        const res = await fetch(`${endpoint}?url=${encodeURIComponent(url)}&format=json`, {
          signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) continue
        const data = await res.json()
        if (data.title) return data.title as string
      } catch {
        continue
      }
    }
  }
  return null
}

/** ページの<head>部分をHTMLとして取得 */
async function fetchHead(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'text/html' },
      cache: 'no-store', // ブラウザのpreload処理を抑制
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type')
    // HTML以外のレスポンスは無視
    if (contentType && !contentType.includes('text/html')) return null

    const reader = res.body?.getReader()
    if (!reader) return null

    const chunks: Uint8Array[] = []
    let totalLength = 0
    const MAX_HEAD_SIZE = 32768 // 32KB — <head>内のOGPタグには十分

    while (totalLength < MAX_HEAD_SIZE) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        totalLength += value.length
      }
      // Check for </head> in the last 1KB of the current buffer to avoid re-decoding everything
      const lastChunk = chunks[chunks.length - 1]
      const peek = new TextDecoder('ascii').decode(lastChunk)
      if (peek.toLowerCase().includes('</head>')) break
    }
    reader.cancel()

    const bytes = mergeChunks(chunks, totalLength)
    const encoding = detectEncoding(contentType, bytes)
    const decoderName = resolveEncoding(encoding)
    return new TextDecoder(decoderName, { fatal: false }).decode(bytes)
  } catch {
    return null
  }
}

/** HTMLから<title>を抽出 */
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match) return null
  return decodeHtmlEntities(match[1].replace(/\s+/g, ' ').trim())
}

/** HTMLからOGP情報を抽出 */
function extractOgp(html: string): OgpData {
  const get = (property: string): string | undefined => {
    const re = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i')
    const m = html.match(re) ?? html.match(re2)
    return m ? decodeHtmlEntities(m[1].trim()) : undefined
  }

  // name="description" フォールバック
  const getDesc = (): string | undefined => {
    const re = /meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    const re2 = /meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i
    const m = html.match(re) ?? html.match(re2)
    return m ? decodeHtmlEntities(m[1].trim()) : undefined
  }

  return {
    title: get('og:title') ?? extractTitle(html) ?? undefined,
    description: get('og:description') ?? getDesc(),
    image: get('og:image'),
    siteName: get('og:site_name'),
    fetchedAt: Date.now(),
  }
}

/** Content-Typeヘッダー・HTML meta からエンコーディングを検出 */
function detectEncoding(contentType: string | null, bytes: Uint8Array): string {
  if (contentType) {
    const m = contentType.match(/charset=["']?([^"'\s;]+)/i)
    if (m) return m[1]
  }
  const head = new TextDecoder('ascii', { fatal: false }).decode(bytes.slice(0, 4000))
  const m1 = head.match(/<meta[^>]+charset=["']?([^"'\s;>]+)/i)
  if (m1) return m1[1]
  const m2 = head.match(/content=["'][^"']*charset=([^"'\s;]+)/i)
  if (m2) return m2[1]
  return 'utf-8'
}

/** TextDecoderが受け付けるエンコーディング名に変換 */
function resolveEncoding(raw: string): string {
  const key = raw.toLowerCase().replace(/[_\s-]/g, '')
  const map: Record<string, string> = {
    shiftjis: 'shift_jis', shift_jis: 'shift_jis', sjis: 'shift_jis',
    xsjis: 'shift_jis', csshiftjis: 'shift_jis', ms932: 'shift_jis', windows31j: 'shift_jis',
    eucjp: 'euc-jp', xeucjp: 'euc-jp', cseucpkdfmtjapanese: 'euc-jp',
    iso2022jp: 'iso-2022-jp', csiso2022jp: 'iso-2022-jp',
    euckr: 'euc-kr', big5: 'big5', gb2312: 'gb18030', gbk: 'gbk', gb18030: 'gb18030',
    utf8: 'utf-8', utf16: 'utf-16le', utf16le: 'utf-16le', utf16be: 'utf-16be',
    latin1: 'windows-1252', iso88591: 'windows-1252', ascii: 'utf-8',
  }
  return map[key] ?? raw.toLowerCase()
}

/** Uint8Array結合 */
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
