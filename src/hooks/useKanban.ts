import { useState, useEffect, useCallback, useMemo } from 'react'
import type { SyncGridGroup, SyncGridItem, KanbanColumn, KanbanState } from '../types'
import {
  addToKanban as addToKanbanStorage,
  removeFromKanban as removeFromKanbanStorage,
  moveInKanban as moveInKanbanStorage,
  setDueDateInKanban,
  cleanupKanban,
} from '../utils/kanban'
import { flattenGroups } from '../utils/bookmarks'

export function useKanban(groups: SyncGridGroup[]) {
  const [kanbanState, setKanbanState] = useState<KanbanState>({ items: [] })

  // 全ブックマークのフラットマップ（ID→アイテム）
  const itemMap = useMemo(() => {
    const map = new Map<string, SyncGridItem>()
    for (const g of flattenGroups(groups)) {
      for (const item of g.items) {
        map.set(item.id, item)
      }
    }
    return map
  }, [groups])

  // 初回ロード + クリーンアップ
  useEffect(() => {
    if (itemMap.size === 0) return
    cleanupKanban(new Set(itemMap.keys())).then(setKanbanState)
  }, [itemMap])

  // 列ごとの解決済みアイテム
  const kanbanColumns = useMemo(() => {
    const cols: Record<KanbanColumn, SyncGridItem[]> = {
      todo: [],
      doing: [],
      done: [],
    }
    const sorted = [...kanbanState.items].sort((a, b) => a.order - b.order)
    for (const ki of sorted) {
      const item = itemMap.get(ki.bookmarkId)
      if (item) cols[ki.column].push(item)
    }
    return cols
  }, [kanbanState, itemMap])

  const kanbanItemCount = kanbanState.items.length

  const isInKanban = useCallback(
    (bookmarkId: string) => kanbanState.items.some((i) => i.bookmarkId === bookmarkId),
    [kanbanState],
  )

  const addToKanban = useCallback(
    async (bookmarkId: string, column: KanbanColumn = 'todo') => {
      const state = await addToKanbanStorage(bookmarkId, column)
      setKanbanState(state)
    },
    [],
  )

  const removeFromKanban = useCallback(
    async (bookmarkId: string) => {
      const state = await removeFromKanbanStorage(bookmarkId)
      setKanbanState(state)
    },
    [],
  )

  const moveItem = useCallback(
    async (bookmarkId: string, toColumn: KanbanColumn, toOrder: number) => {
      const state = await moveInKanbanStorage(bookmarkId, toColumn, toOrder)
      setKanbanState(state)
    },
    [],
  )

  const setDueDate = useCallback(
    async (bookmarkId: string, dueDate: number | undefined) => {
      const state = await setDueDateInKanban(bookmarkId, dueDate)
      setKanbanState(state)
    },
    [],
  )

  // 期限情報のマップ（bookmarkId → dueDate）
  const dueDates = useMemo(() => {
    const map = new Map<string, number>()
    for (const ki of kanbanState.items) {
      if (ki.dueDate) map.set(ki.bookmarkId, ki.dueDate)
    }
    return map
  }, [kanbanState])

  // 期限超過アイテム（done列以外）
  const overdueItems = useMemo(() => {
    const now = Date.now()
    return kanbanState.items
      .filter((ki) => ki.dueDate && ki.dueDate < now && ki.column !== 'done')
      .map((ki) => itemMap.get(ki.bookmarkId))
      .filter((item): item is SyncGridItem => !!item)
  }, [kanbanState, itemMap])

  return {
    kanbanState,
    kanbanColumns,
    kanbanItemCount,
    isInKanban,
    addToKanban,
    removeFromKanban,
    moveItem,
    setDueDate,
    dueDates,
    overdueItems,
  }
}
