/**
 * Background Service Worker — OGP/タイトル取得のCORSプロキシ
 * newtabページからの直接fetchはCORSでブロックされるため、
 * service worker経由でfetchすることでhost_permissionsを活用する
 */

chrome.runtime.onMessage.addListener(
  (message: { type: string; url: string }, _sender, sendResponse) => {
    if (message.type !== 'FETCH_HTML') return false

    fetchHtml(message.url)
      .then((html) => sendResponse({ html }))
      .catch(() => sendResponse({ html: null }))

    return true // 非同期レスポンスを示す
  },
)

async function fetchHtml(url: string): Promise<string | null> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: 'text/html' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const contentType = res.headers.get('content-type')
  if (contentType && !contentType.includes('text/html')) return null

  const reader = res.body?.getReader()
  if (!reader) return null

  const chunks: Uint8Array[] = []
  let totalLength = 0
  const MAX_HEAD_SIZE = 32768

  while (totalLength < MAX_HEAD_SIZE) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      totalLength += value.length
    }
    const lastChunk = chunks[chunks.length - 1]
    const peek = new TextDecoder('ascii').decode(lastChunk)
    if (peek.toLowerCase().includes('</head>')) break
  }
  reader.cancel()

  const bytes = mergeChunks(chunks, totalLength)
  const encoding = detectEncoding(contentType, bytes)
  const decoderName = resolveEncoding(encoding)
  return new TextDecoder(decoderName, { fatal: false }).decode(bytes)
}

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
