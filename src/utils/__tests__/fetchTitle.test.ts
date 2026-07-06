/**
 * タイトル・OGP取得テスト — 主要サイトURLパターン網羅 (TDD)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPageTitle, fetchOgp, refetchTitle } from '../fetchTitle'

// chrome.permissions モック
const g = globalThis as unknown as {
  chrome: { permissions: { contains: () => Promise<boolean>; request: () => Promise<boolean> } }
}
g.chrome = {
  permissions: {
    contains: () => Promise.resolve(true),
    request: () => Promise.resolve(true),
  },
} as typeof g.chrome

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

/** oEmbedレスポンスのモック */
function mockOembed(data: Record<string, string>) {
  mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) })
}

/** HTMLレスポンスのモック */
function mockHtml(html: string, contentType = 'text/html; charset=utf-8') {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    headers: { get: () => contentType },
    text: () => Promise.resolve(html),
    body: {
      getReader: () => {
        let done = false
        return {
          read: () => {
            if (done) return Promise.resolve({ done: true, value: undefined })
            done = true
            return Promise.resolve({ done: false, value: new TextEncoder().encode(html) })
          },
          cancel: () => Promise.resolve(),
        }
      },
    },
  })
}

// =====================
// oEmbed テスト
// =====================
describe('oEmbed タイトル取得', () => {
  it('YouTube (youtube.com/watch)', async () => {
    mockOembed({ title: 'Claude Code Tips 2026' })
    expect(await fetchPageTitle('https://www.youtube.com/watch?v=_t61HTnLCmg')).toBe('Claude Code Tips 2026')
  })

  it('YouTube (youtu.be短縮URL)', async () => {
    mockOembed({ title: 'Short URL Video' })
    expect(await fetchPageTitle('https://youtu.be/_t61HTnLCmg')).toBe('Short URL Video')
  })

  it('Vimeo', async () => {
    mockOembed({ title: 'Design System Overview' })
    expect(await fetchPageTitle('https://vimeo.com/123456789')).toBe('Design System Overview')
  })

  it('X/Twitter ツイート（titleあり）', async () => {
    mockOembed({ title: 'Important announcement' })
    expect(await fetchPageTitle('https://x.com/user/status/123')).toBe('Important announcement')
  })

  it('X/Twitter（titleなし → HTMLフォールバック）', async () => {
    mockOembed({ author_name: 'tsubotax' }) // titleなし → null
    mockHtml('<html><head><title>tsubotax on X</title></head></html>')
    expect(await fetchPageTitle('https://x.com/tsubotax/article/123')).toBe('tsubotax on X')
  })
})

// =====================
// HTML <title> タグ取得
// =====================
describe('HTML <title> タグ取得', () => {
  const cases: [string, string, string][] = [
    ['Zenn記事', '<title>Claude Codeを加速させる</title>', 'Claude Codeを加速させる'],
    ['Qiita', '<title>セキュリティ設定 - Qiita</title>', 'セキュリティ設定 - Qiita'],
    ['note', '<title>LM Link｜Matsukaze</title>', 'LM Link｜Matsukaze'],
    ['GitHub', '<title>anthropics/claude-code</title>', 'anthropics/claude-code'],
    ['Wikipedia', '<title>React - Wikipedia</title>', 'React - Wikipedia'],
    ['Stack Overflow', '<title>How to use hooks?</title>', 'How to use hooks?'],
    ['Medium', '<title>Design Systems | Medium</title>', 'Design Systems | Medium'],
    ['Reddit', '<title>AI tools : programming</title>', 'AI tools : programming'],
    ['Hacker News', '<title>Show HN: Project</title>', 'Show HN: Project'],
    ['Amazon', '<title>プログラミング入門書</title>', 'プログラミング入門書'],
    ['Notion', '<title>プロジェクト計画書</title>', 'プロジェクト計画書'],
    ['Figma', '<title>My-Design – Figma</title>', 'My-Design – Figma'],
    ['NHK', '<title>最新ニュース - NHK</title>', '最新ニュース - NHK'],
    ['Vercel', '<title>My App</title>', 'My App'],
  ]

  for (const [name, titleTag, expected] of cases) {
    it(name, async () => {
      // oEmbed非対応URL → fetchOembedTitleはfetch呼ばず即null
      // ホスト名に空白は使えないため除去（"Stack Overflow" → stackoverflow）
      const host = name.toLowerCase().replace(/\s+/g, '')
      mockHtml(`<html><head>${titleTag}</head></html>`)
      expect(await fetchPageTitle(`https://${host}.example.com/`)).toBe(expected)
    })
  }
})

// =====================
// OGP情報抽出
// =====================
describe('OGP情報抽出', () => {
  it('og:title, og:description, og:image, og:site_name', async () => {
    mockHtml(`<html><head>
      <meta property="og:title" content="Claude Code完全ガイド">
      <meta property="og:description" content="使い方を解説">
      <meta property="og:image" content="https://example.com/img.png">
      <meta property="og:site_name" content="Zenn">
    </head></html>`)
    const r = await fetchOgp('https://zenn.dev/user/articles/abc')
    expect(r?.title).toBe('Claude Code完全ガイド')
    expect(r?.description).toBe('使い方を解説')
    expect(r?.image).toBe('https://example.com/img.png')
    expect(r?.siteName).toBe('Zenn')
  })

  it('YouTube: oEmbedからOGP', async () => {
    mockOembed({ title: 'Video', author_name: 'Ch', thumbnail_url: 'https://i.ytimg.com/t.jpg', provider_name: 'YouTube' })
    const r = await fetchOgp('https://www.youtube.com/watch?v=abc')
    expect(r?.title).toBe('Video')
    expect(r?.image).toBe('https://i.ytimg.com/t.jpg')
    expect(r?.siteName).toBe('YouTube')
  })

  it('descriptionフォールバック (meta name)', async () => {
    mockHtml('<html><head><title>Ex</title><meta name="description" content="Site desc"></head></html>')
    const r = await fetchOgp('https://example.com/')
    expect(r?.description).toBe('Site desc')
  })
})

// =====================
// HTMLエンティティ
// =====================
describe('HTMLエンティティデコード', () => {
  const entities: [string, string][] = [
    ['React &amp; TypeScript', 'React & TypeScript'],
    ['&lt;code&gt;', '<code>'],
    ['&quot;hello&quot;', '"hello"'],
    ["It&#39;s", "It's"],
    ['&#x2603;', '☃'],
    ['&#9731;', '☃'],
  ]

  for (const [input, expected] of entities) {
    it(`"${input}" → "${expected}"`, async () => {
      mockHtml(`<html><head><title>${input}</title></head></html>`)
      expect(await fetchPageTitle('https://entity.example.com/')).toBe(expected)
    })
  }
})

// =====================
// エラーハンドリング
// =====================
describe('エラーハンドリング', () => {
  it('タイムアウト → null', async () => {
    mockFetch.mockRejectedValue(new Error('timeout'))
    expect(await fetchPageTitle('https://slow.example.com/')).toBeNull()
  })

  it('404 → null', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    expect(await fetchPageTitle('https://example.com/404')).toBeNull()
  })

  it('非HTML → null', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, headers: { get: () => 'application/json' } })
    expect(await fetchPageTitle('https://api.example.com/')).toBeNull()
  })

  it('空<title> → null', async () => {
    mockHtml('<html><head><title></title></head></html>')
    expect(await fetchPageTitle('https://empty.example.com/')).toBeNull()
  })

  it('<title>なし → null', async () => {
    mockHtml('<html><head></head><body></body></html>')
    expect(await fetchPageTitle('https://notitle.example.com/')).toBeNull()
  })
})

// =====================
// refetchTitle
// =====================
describe('refetchTitle 強制再取得', () => {
  it('oEmbed成功 → 結果返す', async () => {
    mockOembed({ title: 'YouTube Video' })
    expect(await refetchTitle('https://www.youtube.com/watch?v=abc')).toBe('YouTube Video')
  })

  it('oEmbed非対応 → HTMLフォールバック', async () => {
    mockHtml('<html><head><title>Fallback</title></head></html>')
    expect(await refetchTitle('https://example.com/')).toBe('Fallback')
  })
})

// =====================
// URLガード（file://・保護オリジンでfetchしない）
// =====================
describe('URLガード — fetch自体を発生させない', () => {
  it('file:// URL → fetchを一切呼ばず null', async () => {
    const r = await fetchOgp('file:///Users/x/Desktop/onboarding/pdf/onboarding-all.html')
    expect(r).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('Chrome Web Store の保護オリジン → fetchを一切呼ばず null', async () => {
    const r = await fetchOgp('https://chromewebstore.google.com/detail/crx-gcal-url-opener/abc')
    expect(r).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('file:// URL の refetchTitle → fetchを呼ばず null', async () => {
    expect(await refetchTitle('file:///tmp/x.html')).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
