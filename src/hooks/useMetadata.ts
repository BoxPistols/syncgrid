/**
 * ブックマークメタデータ管理（タグ、OGP、ステータス）
 * OGPはバックグラウンドでfetch + 24hキャッシュ
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import type { SyncGridGroup, BookmarkMeta, ReadStatus, SyncGridItem } from '../types'
import { loadAllMeta, saveMeta } from '../utils/storage'
import { fetchOgp } from '../utils/fetchTitle'
import { flattenGroups } from '../utils/bookmarks'

const OGP_CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

export function useMetadata(groups: SyncGridGroup[]) {
  const [allMeta, setAllMeta] = useState<Record<string, BookmarkMeta>>({})
  const fetchingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    loadAllMeta().then(setAllMeta)
  }, [groups])

  // バックグラウンドOGPフェッチ — キャッシュ切れ or 未取得のアイテムを自動取得
  useEffect(() => {
    const allItems: SyncGridItem[] = []
    for (const g of flattenGroups(groups)) {
      allItems.push(...g.items)
    }

    // OGP未取得 or キャッシュ切れのアイテムを抽出（最大5件ずつ）
    const needsFetch = allItems
      .filter((item) => {
        const meta = allMeta[item.id]
        if (fetchingRef.current.has(item.id)) return false
        if (!meta?.ogp) return true
        return Date.now() - meta.ogp.fetchedAt > OGP_CACHE_TTL
      })
      .slice(0, 5) // 同時5件まで（負荷制限）

    if (needsFetch.length === 0) return

    for (const item of needsFetch) {
      fetchingRef.current.add(item.id)
      fetchOgp(item.url).then((ogp) => {
        fetchingRef.current.delete(item.id)
        if (!ogp) return
        const existing = allMeta[item.id]
        saveMeta(item.id, { memo: existing?.memo ?? '', tags: existing?.tags, ogp, status: existing?.status, lastReadAt: existing?.lastReadAt })
        setAllMeta((prev) => ({ ...prev, [item.id]: { ...prev[item.id], memo: prev[item.id]?.memo ?? '', ogp } }))
      })
    }
  }, [groups, allMeta])

  const handleSetStatus = useCallback(
    async (id: string, newStatus: ReadStatus) => {
      const meta = allMeta[id]
      await saveMeta(id, {
        memo: meta?.memo ?? '',
        tags: meta?.tags,
        ogp: meta?.ogp,
        status: newStatus,
        lastReadAt: newStatus === 'read' ? Date.now() : meta?.lastReadAt,
      })
      loadAllMeta().then(setAllMeta)
    },
    [allMeta],
  )

  const handleSaveMeta = useCallback(
    async (id: string, tags: string[]) => {
      const existingMeta = allMeta[id]
      await saveMeta(id, { memo: existingMeta?.memo ?? '', tags, ogp: existingMeta?.ogp, status: existingMeta?.status, lastReadAt: existingMeta?.lastReadAt })
      loadAllMeta().then(setAllMeta)
    },
    [allMeta],
  )

  return { allMeta, handleSetStatus, handleSaveMeta }
}
