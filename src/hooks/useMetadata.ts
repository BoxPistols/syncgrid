/**
 * ブックマークメタデータ管理（タグ、OGP、ステータス）
 */
import { useState, useEffect, useCallback } from 'react'
import type { SyncGridGroup, BookmarkMeta, ReadStatus } from '../types'
import { loadAllMeta, saveMeta } from '../utils/storage'

export function useMetadata(groups: SyncGridGroup[]) {
  const [allMeta, setAllMeta] = useState<Record<string, BookmarkMeta>>({})

  useEffect(() => {
    loadAllMeta().then(setAllMeta)
  }, [groups])

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
