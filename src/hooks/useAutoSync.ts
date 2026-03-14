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
  const onSyncedRef = useRef(onSynced)

  useEffect(() => {
    groupsRef.current = groups
  }, [groups])

  useEffect(() => {
    onSyncedRef.current = onSynced
  }, [onSynced])

  // Debounced sync on data change
  useEffect(() => {
    const doSync = async () => {
      const handle = await getSyncHandle()
      if (!handle) return
      const result = await syncToFolder(groupsRef.current, handle)
      if (result.success) onSyncedRef.current(result.syncedAt)
    }

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(doSync, 3000)

    return () => clearTimeout(timerRef.current)
  }, [groups])

  // Periodic sync (stable — no dependency on onSynced)
  useEffect(() => {
    const interval = setInterval(async () => {
      const handle = await getSyncHandle()
      if (!handle) return
      const result = await syncToFolder(groupsRef.current, handle)
      if (result.success) onSyncedRef.current(result.syncedAt)
    }, SYNC_INTERVAL)

    return () => clearInterval(interval)
  }, [])
}
