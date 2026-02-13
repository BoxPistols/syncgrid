import { useState, useEffect, useCallback } from 'react'
import type { SyncGridGroup } from '../types'
import { loadGroups } from '../utils/bookmarks'

/**
 * Chrome Bookmarks APIからSyncGridデータを取得・監視するhook
 */
export function useBookmarks() {
  const [groups, setGroups] = useState<SyncGridGroup[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await loadGroups()
      setGroups(data)
    } catch (err) {
      console.error('[SyncGrid] Failed to load bookmarks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()

    // ブックマーク変更イベントを監視
    const events = [
      chrome.bookmarks.onCreated,
      chrome.bookmarks.onRemoved,
      chrome.bookmarks.onChanged,
      chrome.bookmarks.onMoved,
    ] as const

    events.forEach((event) => event.addListener(refresh))

    return () => {
      events.forEach((event) => event.removeListener(refresh))
    }
  }, [refresh])

  return { groups, loading, refresh }
}
