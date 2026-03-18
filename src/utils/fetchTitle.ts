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
 * OGP情報を取得
 * 優先順: oEmbed → HTMLフェッチ（権限有無に関わらず試行）
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

  // 権限有無に関わらずHTMLフェッチを試行（CORS許可サイトでも取得可能）
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

/**
 * ページの<head>部分をHTMLとして取得
 * background service worker 経由でfetchすることでCORSを回避
 */
async function fetchHead(url: string): Promise<string | null> {
  try {
    // background service workerが利用可能な場合はそちらを使う（CORS回避）
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      const response: { html: string | null } = await chrome.runtime.sendMessage({
        type: 'FETCH_HTML',
        url,
      })
      return response?.html ?? null
    }

    // dev環境フォールバック: 直接fetch
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'text/html' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type')
    if (contentType && !contentType.includes('text/html')) return null
    const text = await res.text()
    return text.slice(0, 32768)
  } catch {
    return null
  }
}

/** HTMLから<title>を抽出 */
function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match) return null
  const title = decodeHtmlEntities(match[1].replace(/\s+/g, ' ').trim())
  return title || null // 空文字はnull
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
