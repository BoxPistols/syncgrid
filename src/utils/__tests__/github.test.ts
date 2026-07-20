import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mapEventsToItems, fetchGitHubActivity, testGitHubConnection } from '../github'
import { createMockChrome } from '../chromeMock'

beforeEach(() => {
  ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const at = '2026-07-20T00:00:00Z'

describe('mapEventsToItems', () => {
  it('PushEvent はコミット単位に展開される', () => {
    const items = mapEventsToItems([
      {
        id: '1',
        type: 'PushEvent',
        created_at: at,
        repo: { name: 'user/repo' },
        payload: {
          commits: [
            { sha: 'abcdef1234567', message: 'feat: first\n\nbody' },
            { sha: '9876543210fed', message: 'fix: second' },
          ],
        },
      },
    ])
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      kind: 'commit',
      title: 'feat: first',
      url: 'https://github.com/user/repo/commit/abcdef1234567',
      repo: 'user/repo',
    })
  })

  it('PR / Issue / Star / Release / Create(repository) をマッピングする', () => {
    const items = mapEventsToItems([
      { id: '2', type: 'PullRequestEvent', created_at: at, repo: { name: 'u/r' }, payload: { pull_request: { title: 'PR!', html_url: 'https://github.com/u/r/pull/1' } } },
      { id: '3', type: 'IssuesEvent', created_at: at, repo: { name: 'u/r' }, payload: { issue: { title: 'Bug', html_url: 'https://github.com/u/r/issues/2' } } },
      { id: '4', type: 'WatchEvent', created_at: at, repo: { name: 'u/starred' }, payload: {} },
      { id: '5', type: 'ReleaseEvent', created_at: at, repo: { name: 'u/r' }, payload: { release: { name: 'v1', html_url: 'https://github.com/u/r/releases/v1' } } },
      { id: '6', type: 'CreateEvent', created_at: at, repo: { name: 'u/new' }, payload: { ref_type: 'repository' } },
      { id: '7', type: 'CreateEvent', created_at: at, repo: { name: 'u/r' }, payload: { ref_type: 'branch', ref: 'dev' } },
      { id: '8', type: 'ForkEvent', created_at: at, repo: { name: 'u/r' }, payload: {} },
    ])
    expect(items.map((i) => i.kind)).toEqual(['pr', 'issue', 'star', 'release', 'create'])
  })
})

describe('testGitHubConnection', () => {
  it('Token 未設定はエラー', async () => {
    const r = await testGitHubConnection('')
    expect(r.ok).toBe(false)
  })

  it('成功時に login を返す', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ login: 'octocat' }), { status: 200 })))
    const r = await testGitHubConnection('tkn')
    expect(r).toEqual({ ok: true, login: 'octocat' })
  })

  it('401 はエラーとして返す', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401, statusText: 'Unauthorized' })))
    const r = await testGitHubConnection('bad')
    expect(r.ok).toBe(false)
    expect(r.error).toContain('401')
  })
})

describe('fetchGitHubActivity', () => {
  it('成功時にイベントをマッピングしてキャッシュ保存する', async () => {
    const events = [
      { id: '1', type: 'WatchEvent', created_at: at, repo: { name: 'u/star' }, payload: {} },
    ]
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(events), { status: 200, headers: { ETag: 'W/"abc"' } })))
    const r = await fetchGitHubActivity('tkn', null)
    expect(r.ok).toBe(true)
    expect(r.cache?.items[0]?.kind).toBe('star')
    expect(r.cache?.etag).toBe('W/"abc"')
    const stored = await chrome.storage.local.get('syncgrid_github_cache')
    expect(stored['syncgrid_github_cache']).toBeTruthy()
  })

  it('304 のときは前回キャッシュを維持して fetchedAt のみ更新', async () => {
    const prev = { login: 'octocat', items: [], fetchedAt: 1, etag: 'W/"abc"' }
    const fetchMock = vi.fn(async () => new Response(null, { status: 304 }))
    vi.stubGlobal('fetch', fetchMock)
    const r = await fetchGitHubActivity('tkn', prev)
    expect(r.ok).toBe(true)
    expect(r.cache?.login).toBe('octocat')
    expect(r.cache?.fetchedAt).toBeGreaterThan(1)
    const headers = (fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }])[1].headers
    expect(headers['If-None-Match']).toBe('W/"abc"')
  })

  it('API エラーは ok:false で返す', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403, statusText: 'rate limited' })))
    const r = await fetchGitHubActivity('tkn', null)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('403')
  })
})
