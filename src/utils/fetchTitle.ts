/**
 * ページの<title>タグを取得するユーティリティ
 * Chrome拡張のoptional_host_permissionsでCORSバイパス
 */

import { hasTitleFetchPermission, requestTitleFetchPermission } from './permissions'

/**
 * ページタイトルを取得（パーミッション確認済みの場合のみ）
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

/** 実際のfetch処理 — 全<head>部分を読んでからエンコーディング検出+デコード */
async function doFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'text/html' },
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type')

    // ArrayBufferとして先頭を読む（<title>は<head>内にあるので50KB十分）
    const reader = res.body?.getReader()
    if (!reader) return null

    const chunks: Uint8Array[] = []
    let totalLength = 0
    while (totalLength < 65536) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        totalLength += value.length
      }
      // </head>が見つかったら早期終了
      const peek = new TextDecoder('ascii', { fatal: false }).decode(chunks[chunks.length - 1])
      if (peek.includes('</head>') || peek.includes('</HEAD>')) break
    }
    reader.cancel()

    const bytes = mergeChunks(chunks, totalLength)

    // エンコーディング検出
    const encoding = detectEncoding(contentType, bytes)
    const decoderName = resolveEncoding(encoding)

    // デコード
    const html = new TextDecoder(decoderName, { fatal: false }).decode(bytes)
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (!match) return null

    return decodeHtmlEntities(match[1].replace(/\s+/g, ' ').trim())
  } catch {
    return null
  }
}

/** Content-Typeヘッダー・HTML meta からエンコーディングを検出 */
function detectEncoding(contentType: string | null, bytes: Uint8Array): string {
  // Content-Typeヘッダーから
  if (contentType) {
    const m = contentType.match(/charset=["']?([^"'\s;]+)/i)
    if (m) return m[1]
  }

  // HTML先頭をASCIIで読んでmeta charsetを検索
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
    shiftjis: 'shift_jis',
    shift_jis: 'shift_jis',
    sjis: 'shift_jis',
    xsjis: 'shift_jis',
    csshiftjis: 'shift_jis',
    ms932: 'shift_jis',
    windows31j: 'shift_jis',
    eucjp: 'euc-jp',
    xeucjp: 'euc-jp',
    cseucpkdfmtjapanese: 'euc-jp',
    iso2022jp: 'iso-2022-jp',
    csiso2022jp: 'iso-2022-jp',
    euckr: 'euc-kr',
    big5: 'big5',
    gb2312: 'gb18030',
    gbk: 'gbk',
    gb18030: 'gb18030',
    utf8: 'utf-8',
    utf16: 'utf-16le',
    utf16le: 'utf-16le',
    utf16be: 'utf-16be',
    latin1: 'windows-1252',
    iso88591: 'windows-1252',
    ascii: 'utf-8',
  }
  // マップに一致すればそれを、なければそのまま渡す（TextDecoderが判断）
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
