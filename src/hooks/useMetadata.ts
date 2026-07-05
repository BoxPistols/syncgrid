/**
 * ブックマークメタデータ管理（タグ、OGP、ステータス）
 * OGPはバックグラウンドでfetch + 24hキャッシュ
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import type { SyncGridGroup, BookmarkMeta, ReadStatus, SyncGridItem, OgpData } from '../types'
import { loadAllMeta, saveMeta, pruneOrphanMeta } from '../utils/storage'
import { fetchOgp } from '../utils/fetchTitle'
import { flattenGroups } from '../utils/bookmarks'

const OGP_CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

export function useMetadata(groups: SyncGridGroup[]) {
  const [allMeta, setAllMeta] = useState<Record<string, BookmarkMeta>>({})
  const fetchingRef = useRef<Set<string>>(new Set())
  const prunedRef = useRef(false)

  useEffect(() => {
    loadAllMeta().then(setAllMeta)
  }, [groups])

  // 起動時に一度だけ、現存しないブックマークの孤立メタを掃除（storage.local肥大化対策）。
  // groupsが空の一時状態では実行しない（有効メタの誤削除を防ぐ）
  useEffect(() => {
    if (prunedRef.current) return
    const validIds = new Set<string>()
    for (const g of flattenGroups(groups)) {
      for (const item of g.items) validIds.add(item.id)
    }
    if (validIds.size === 0) return
    prunedRef.current = true
    pruneOrphanMeta(validIds).then((removed) => {
      if (removed > 0) loadAllMeta().then(setAllMeta)
    })
  }, [groups])

  // バックグラウンドOGPフェッチ — キャッシュ切れ or 未取得のアイテムを自動取得
  useEffect(() => {
    const allItems: SyncGridItem[] = []
    for (const g of flattenGroups(groups)) {
      allItems.push(...g.items)
    }

    // OGP未取得 or キャッシュ切れのアイテムを抽出（最大5件ずつ）
    const RETRY_TTL = 60 * 60 * 1000 // 1h — 取得失敗時の再試行間隔
    const needsFetch = allItems
      .filter((item) => {
        const meta = allMeta[item.id]
        if (fetchingRef.current.has(item.id)) return false
        if (!meta?.ogp) return true
        // 内容が空（取得失敗キャッシュ）なら短いTTLで再試行
        const ttl = meta.ogp.image || meta.ogp.description ? OGP_CACHE_TTL : RETRY_TTL
        return Date.now() - meta.ogp.fetchedAt > ttl
      })
      .slice(0, 5) // 同時5件まで（負荷制限）

    if (needsFetch.length === 0) return

    for (const item of needsFetch) {
      fetchingRef.current.add(item.id)
      fetchOgp(item.url).then((ogp) => {
        fetchingRef.current.delete(item.id)
        // 取得失敗でも fetchedAt を記録して無限リトライを防止（1時間後に再試行）
        const result: OgpData = ogp ?? { fetchedAt: Date.now() }
        const existing = allMeta[item.id]
        saveMeta(item.id, { memo: existing?.memo ?? '', tags: existing?.tags, ogp: result, status: existing?.status, lastReadAt: existing?.lastReadAt })
        setAllMeta((prev) => ({ ...prev, [item.id]: { ...prev[item.id], memo: prev[item.id]?.memo ?? '', ogp: result } }))
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
