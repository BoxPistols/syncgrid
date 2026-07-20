import { useState, useEffect, useCallback } from 'react'
import { getAllItems } from '../utils/bookmarks'
import type { SyncGridGroup, BookmarkMeta } from '../types'

export type OgpNudgeState = 'hidden' | 'no-permission' | 'low-coverage'

/**
 * OGP取得を促すナッジバナーの表示判定と、OGPキャッシュの再取得。
 * 非表示操作後72時間は再表示しない。
 */
export function useOgpNudge(
  groups: SyncGridGroup[],
  allMeta: Record<string, BookmarkMeta>,
  loading: boolean,
  refresh: () => void,
) {
  const [nudgeState, setNudgeState] = useState<OgpNudgeState>('hidden')

  useEffect(() => {
    const checkOgpNudge = async () => {
      const storage = await chrome.storage.local.get(['ogpNudgeInstalledAt', 'ogpNudgeDismissedAt'])
      // 初回インストール日を記録
      if (!storage.ogpNudgeInstalledAt) {
        await chrome.storage.local.set({ ogpNudgeInstalledAt: Date.now() })
      }
      const installedAt = (storage.ogpNudgeInstalledAt as number | undefined) || Date.now()
      const dismissedAt = (storage.ogpNudgeDismissedAt as number | undefined) || 0
      // 非表示後72時間は再表示しない
      if (Date.now() - dismissedAt < 72 * 3600000) return

      const { hasTitleFetchPermission } = await import('../utils/permissions')
      const granted = await hasTitleFetchPermission()
      const allItems = getAllItems(groups)
      const total = allItems.length

      if (!granted && total >= 5) {
        setNudgeState('no-permission')
        return
      }

      if (granted) {
        const withOgp = allItems.filter((item) => allMeta[item.id]?.ogp?.image || allMeta[item.id]?.ogp?.description).length
        const coverage = total > 0 ? withOgp / total : 1
        const daysSinceInstall = (Date.now() - installedAt) / 86400000
        // インストール3日後以降 + カバレッジ50%未満 + 10件以上
        if (daysSinceInstall >= 3 && coverage < 0.5 && total >= 10) {
          setNudgeState('low-coverage')
        }
      }
    }
    if (!loading) checkOgpNudge()
  }, [loading, groups, allMeta])

  // OGPキャッシュを全消去して再取得を促す
  const refreshOgp = useCallback(async () => {
    const { loadAllMeta, saveMeta } = await import('../utils/storage')
    const meta = await loadAllMeta()
    for (const [id, m] of Object.entries(meta)) {
      if (m.ogp) {
        await saveMeta(id, { ...m, ogp: undefined })
      }
    }
    refresh()
  }, [refresh])

  const dismiss = useCallback(() => {
    setNudgeState('hidden')
    chrome.storage.local.set({ ogpNudgeDismissedAt: Date.now() })
  }, [])

  const grantAndRefresh = useCallback(async () => {
    const { requestTitleFetchPermission } = await import('../utils/permissions')
    const granted = await requestTitleFetchPermission()
    if (granted) {
      setNudgeState('hidden')
      chrome.storage.local.set({ ogpNudgeDismissedAt: Date.now() })
      await refreshOgp()
    }
  }, [refreshOgp])

  const refreshNow = useCallback(async () => {
    setNudgeState('hidden')
    chrome.storage.local.set({ ogpNudgeDismissedAt: Date.now() })
    await refreshOgp()
  }, [refreshOgp])

  return { nudgeState, dismiss, grantAndRefresh, refreshNow }
}
