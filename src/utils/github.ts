/**
 * GitHub Activity Client — GitHub 仮想フォルダ用
 *
 * Security / Privacy:
 * - ユーザーが明示的に Token を設定した場合のみ通信する（ゼロテレメトリ原則）
 * - Token は chrome.storage.local のみに保存（sync には載せない）
 * - 通信は newtab 表示時（TTL超過時）と手動リフレッシュのみ。background ポーリングなし
 * - ETag による条件付きリクエストで 304 はレート未消費
 */

import type { GitHubActivityCache, GitHubActivityItem } from '../types'

const CACHE_KEY = 'syncgrid_github_cache'
export const GITHUB_CACHE_TTL_MS = 10 * 60 * 1000

const API_HEADERS = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
})

/** GitHub REST /user/events の必要フィールドのみの狭い型 */
interface GitHubEvent {
  id: string
  type: string
  created_at: string
  repo?: { name?: string }
  payload?: {
    commits?: { sha?: string; message?: string }[]
    pull_request?: { title?: string; html_url?: string }
    issue?: { title?: string; html_url?: string }
    release?: { name?: string; tag_name?: string; html_url?: string }
    ref_type?: string
    ref?: string | null
    action?: string
  }
}

/** Token 検証。成功時は login を返す */
export async function testGitHubConnection(token: string): Promise<{ ok: boolean; login?: string; error?: string }> {
  try {
    if (!token) return { ok: false, error: 'Token not set' }
    const res = await fetch('https://api.github.com/user', { headers: API_HEADERS(token) })
    if (!res.ok) {
      return { ok: false, error: `${res.status}: ${res.statusText}` }
    }
    const user = (await res.json()) as { login?: string }
    return { ok: true, login: user.login ?? '' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/** イベント配列を表示用アイテムへ変換する */
export function mapEventsToItems(events: GitHubEvent[]): GitHubActivityItem[] {
  const items: GitHubActivityItem[] = []
  for (const ev of events) {
    const repo = ev.repo?.name ?? ''
    const createdAt = Date.parse(ev.created_at) || 0
    const p = ev.payload ?? {}
    switch (ev.type) {
      case 'PushEvent':
        for (const c of p.commits ?? []) {
          if (!c.sha) continue
          items.push({
            id: `${ev.id}_${c.sha.slice(0, 7)}`,
            kind: 'commit',
            title: (c.message ?? '').split('\n')[0] || c.sha.slice(0, 7),
            url: `https://github.com/${repo}/commit/${c.sha}`,
            repo,
            createdAt,
          })
        }
        break
      case 'PullRequestEvent':
        if (p.pull_request?.html_url) {
          items.push({
            id: ev.id,
            kind: 'pr',
            title: p.pull_request.title ?? 'Pull Request',
            url: p.pull_request.html_url,
            repo,
            createdAt,
          })
        }
        break
      case 'IssuesEvent':
        if (p.issue?.html_url) {
          items.push({
            id: ev.id,
            kind: 'issue',
            title: p.issue.title ?? 'Issue',
            url: p.issue.html_url,
            repo,
            createdAt,
          })
        }
        break
      case 'WatchEvent':
        items.push({
          id: ev.id,
          kind: 'star',
          title: repo,
          url: `https://github.com/${repo}`,
          repo,
          createdAt,
        })
        break
      case 'ReleaseEvent':
        if (p.release?.html_url) {
          items.push({
            id: ev.id,
            kind: 'release',
            title: p.release.name || p.release.tag_name || 'Release',
            url: p.release.html_url,
            repo,
            createdAt,
          })
        }
        break
      case 'CreateEvent':
        if (p.ref_type === 'repository') {
          items.push({
            id: ev.id,
            kind: 'create',
            title: repo,
            url: `https://github.com/${repo}`,
            repo,
            createdAt,
          })
        }
        break
    }
  }
  return items
}

export async function loadGitHubCache(): Promise<GitHubActivityCache | null> {
  const res = await chrome.storage.local.get(CACHE_KEY)
  const v = res[CACHE_KEY]
  return v && typeof v === 'object' ? (v as GitHubActivityCache) : null
}

export async function saveGitHubCache(cache: GitHubActivityCache): Promise<void> {
  await chrome.storage.local.set({ [CACHE_KEY]: cache })
}

export async function clearGitHubCache(): Promise<void> {
  await chrome.storage.local.remove(CACHE_KEY)
}

/**
 * 直近アクティビティを取得してキャッシュを更新する。
 * ETag 一致（304）ならキャッシュをそのまま返す（レート未消費）。
 */
export async function fetchGitHubActivity(
  token: string,
  prev: GitHubActivityCache | null,
): Promise<{ ok: boolean; cache?: GitHubActivityCache; error?: string }> {
  try {
    if (!token) return { ok: false, error: 'Token not set' }
    const headers = API_HEADERS(token)
    if (prev?.etag) headers['If-None-Match'] = prev.etag

    const res = await fetch('https://api.github.com/user/events?per_page=60', { headers })

    if (res.status === 304 && prev) {
      const cache: GitHubActivityCache = { ...prev, fetchedAt: Date.now() }
      await saveGitHubCache(cache)
      return { ok: true, cache }
    }
    if (!res.ok) {
      return { ok: false, error: `${res.status}: ${res.statusText}` }
    }
    const events = (await res.json()) as GitHubEvent[]
    const cache: GitHubActivityCache = {
      login: prev?.login ?? '',
      items: mapEventsToItems(events),
      fetchedAt: Date.now(),
      etag: res.headers.get('ETag') ?? undefined,
    }
    await saveGitHubCache(cache)
    return { ok: true, cache }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
