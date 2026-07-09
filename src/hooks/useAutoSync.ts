import { useEffect, useRef } from 'react'
import type { SyncGridGroup } from '../types'
import { getSyncHandle, syncToFolder, pullKanbanFromSync } from '../utils/localSync'

const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Automatically syncs bookmark data (push) and Kanban data (pull+merge) to/from
 * the user's local sync folder when one is configured. Triggers:
 * 1. On bookmark data change (debounced push)
 * 2. Every 5 minutes while active (push + Kanban pull)
 * 3. On tab focus (Kanban pull only — catches changes made by another device
 *    while this tab was in the background)
 */
export function useAutoSync(
  groups: SyncGridGroup[],
  onSynced: (syncedAt: string) => void,
  onKanbanPulled?: () => void,
  onKanbanPullError?: () => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const groupsRef = useRef(groups)
  const onSyncedRef = useRef(onSynced)
  const onKanbanPulledRef = useRef(onKanbanPulled)
  const onKanbanPullErrorRef = useRef(onKanbanPullError)

  useEffect(() => {
    groupsRef.current = groups
  }, [groups])

  useEffect(() => {
    onSyncedRef.current = onSynced
  }, [onSynced])

  useEffect(() => {
    onKanbanPulledRef.current = onKanbanPulled
    onKanbanPullErrorRef.current = onKanbanPullError
  }, [onKanbanPulled, onKanbanPullError])

  const pullKanban = async () => {
    try {
      const pulled = await pullKanbanFromSync()
      if (pulled) onKanbanPulledRef.current?.()
    } catch {
      onKanbanPullErrorRef.current?.()
    }
  }

  // Debounced push on data change
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

  // Periodic push + Kanban pull (stable — no dependency on onSynced)
  useEffect(() => {
    const interval = setInterval(async () => {
      const handle = await getSyncHandle()
      if (!handle) return
      const result = await syncToFolder(groupsRef.current, handle)
      if (result.success) onSyncedRef.current(result.syncedAt)
      await pullKanban()
    }, SYNC_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  // Pull Kanban changes on mount and when the tab regains focus
  useEffect(() => {
    pullKanban()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') pullKanban()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
    }
  }, [])
}
