import { useState, useEffect, useCallback, useRef } from 'react'
import { loadGitHubCache, fetchGitHubActivity, GITHUB_CACHE_TTL_MS } from '../utils/github'
import type { GitHubActivityItem } from '../types'

/**
 * GitHub 仮想フォルダのデータ供給。
 * キャッシュ読込 → TTL(10分) 超過時のみ fetch。手動 refresh あり。
 * enabled=false（Token未設定 or 非アクティブ）の間は一切通信しない。
 */
export function useGitHubActivity(token: string, enabled: boolean) {
  const [items, setItems] = useState<GitHubActivityItem[]>([])
  const [login, setLogin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchingRef = useRef(false)

  const refresh = useCallback(
    async (force: boolean) => {
      if (!token || fetchingRef.current) return
      const prev = await loadGitHubCache()
      if (prev) {
        setItems(prev.items)
        setLogin(prev.login)
      }
      const fresh = prev && Date.now() - prev.fetchedAt < GITHUB_CACHE_TTL_MS
      if (fresh && !force) return

      fetchingRef.current = true
      setLoading(true)
      setError(null)
      try {
        const result = await fetchGitHubActivity(token, prev)
        if (result.ok && result.cache) {
          setItems(result.cache.items)
          setLogin(result.cache.login)
        } else {
          setError(result.error ?? 'fetch failed')
        }
      } finally {
        fetchingRef.current = false
        setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    if (!enabled || !token) return
    refresh(false)
  }, [enabled, token, refresh])

  const refreshNow = useCallback(() => refresh(true), [refresh])

  return { items, login, loading, error, refresh: refreshNow }
}
