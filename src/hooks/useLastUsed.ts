import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'syncgrid_last_used'
const MAX_ENTRIES = 50
const SYNC_DEBOUNCE_MS = 3000

function trim(record: Record<string, number>): Record<string, number> {
  const entries = Object.entries(record).sort(([, a], [, b]) => b - a)
  return Object.fromEntries(entries.slice(0, MAX_ENTRIES))
}

export function useLastUsed() {
  const [lastUsed, setLastUsed] = useState<Record<string, number>>({})
  const syncTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    // sync を優先して読み込み（クロスデバイス対応）、失敗時は local にフォールバック
    chrome.storage.sync.get(STORAGE_KEY)
      .then((res) => {
        const synced = res[STORAGE_KEY]
        if (synced && typeof synced === 'object') {
          const data = synced as Record<string, number>
          setLastUsed(data)
          chrome.storage.local.set({ [STORAGE_KEY]: data })
        } else {
          return chrome.storage.local.get(STORAGE_KEY).then((localRes) => {
            const stored = localRes[STORAGE_KEY]
            if (stored && typeof stored === 'object') setLastUsed(stored as Record<string, number>)
          })
        }
      })
      .catch(() => {
        chrome.storage.local.get(STORAGE_KEY).then((res) => {
          const stored = res[STORAGE_KEY]
          if (stored && typeof stored === 'object') setLastUsed(stored as Record<string, number>)
        })
      })
  }, [])

  const trackUsage = useCallback((id: string) => {
    const now = Date.now()
    setLastUsed((prev) => {
      const trimmed = trim({ ...prev, [id]: now })
      // local に即時書き込み
      chrome.storage.local.set({ [STORAGE_KEY]: trimmed })
      // sync にデバウンス書き込み（レート制限対策）
      clearTimeout(syncTimer.current)
      syncTimer.current = setTimeout(() => {
        chrome.storage.sync.set({ [STORAGE_KEY]: trimmed }).catch(() => {})
      }, SYNC_DEBOUNCE_MS)
      return trimmed
    })
  }, [])

  return { lastUsed, trackUsage }
}
