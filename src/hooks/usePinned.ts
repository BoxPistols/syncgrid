import { useState, useEffect, useCallback, useRef } from 'react'
import { MAX_PINNED, type PinnedMap } from '../types'

const STORAGE_KEY = 'syncgrid_pinned'
const SYNC_DEBOUNCE_MS = 3000

function trim(record: PinnedMap): PinnedMap {
  const entries = Object.entries(record).sort(([, a], [, b]) => b - a)
  return Object.fromEntries(entries.slice(0, MAX_PINNED))
}

/**
 * ピン留めブックマークの管理。
 * URL キーで保存し端末間同期に対応（ブックマークIDは端末間で不安定なため）。
 * local へ即時保存 + sync へ3秒デバウンスでミラー（useLastUsed と同方式）。
 */
export function usePinned() {
  const [pinnedUrls, setPinnedUrls] = useState<PinnedMap>({})
  const syncTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    chrome.storage.sync.get(STORAGE_KEY)
      .then((res) => {
        const synced = res[STORAGE_KEY]
        if (synced && typeof synced === 'object') {
          const data = synced as PinnedMap
          setPinnedUrls(data)
          chrome.storage.local.set({ [STORAGE_KEY]: data })
        } else {
          return chrome.storage.local.get(STORAGE_KEY).then((localRes) => {
            const stored = localRes[STORAGE_KEY]
            if (stored && typeof stored === 'object') setPinnedUrls(stored as PinnedMap)
          })
        }
      })
      .catch(() => {
        chrome.storage.local.get(STORAGE_KEY).then((res) => {
          const stored = res[STORAGE_KEY]
          if (stored && typeof stored === 'object') setPinnedUrls(stored as PinnedMap)
        })
      })
  }, [])

  const persist = useCallback((next: PinnedMap) => {
    chrome.storage.local.set({ [STORAGE_KEY]: next })
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      chrome.storage.sync.set({ [STORAGE_KEY]: next }).catch(() => {})
    }, SYNC_DEBOUNCE_MS)
  }, [])

  const isPinned = useCallback((url: string) => url in pinnedUrls, [pinnedUrls])

  /** ピン留めをトグルする。上限超過で追加できなかった場合は false を返す */
  const togglePin = useCallback(
    (url: string): boolean => {
      if (url in pinnedUrls) {
        const next = { ...pinnedUrls }
        delete next[url]
        setPinnedUrls(next)
        persist(next)
        return true
      }
      if (Object.keys(pinnedUrls).length >= MAX_PINNED) return false
      const next = trim({ ...pinnedUrls, [url]: Date.now() })
      setPinnedUrls(next)
      persist(next)
      return true
    },
    [pinnedUrls, persist],
  )

  return { pinnedUrls, isPinned, togglePin }
}
