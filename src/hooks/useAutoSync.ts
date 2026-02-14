import { useEffect, useRef } from 'react'
import type { SyncGridGroup } from '../types'
import { getSyncHandle, syncToFolder } from '../utils/localSync'

const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Automatically syncs bookmark data to the user's local folder
 * when a sync folder is configured. Triggers:
 * 1. On bookmark data change (debounced)
 * 2. Every 5 minutes while active
 */
export function useAutoSync(groups: SyncGridGroup[], onSynced: (syncedAt: string) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const groupsRef = useRef(groups)

  useEffect(() => {
    groupsRef.current = groups
  }, [groups])

  useEffect(() => {
    const doSync = async () => {
      const handle = await getSyncHandle()
      if (!handle) return
      const result = await syncToFolder(groupsRef.current, handle)
      if (result.success) onSynced(result.syncedAt)
    }

    // Debounced sync on data change
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(doSync, 3000)

    return () => clearTimeout(timerRef.current)
  }, [groups, onSynced])

  // Periodic sync
  useEffect(() => {
    const interval = setInterval(async () => {
      const handle = await getSyncHandle()
      if (!handle) return
      const result = await syncToFolder(groupsRef.current, handle)
      if (result.success) onSynced(result.syncedAt)
    }, SYNC_INTERVAL)

    return () => clearInterval(interval)
  }, [onSynced])
}
