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

  // URL→SyncGridItem マップ（URL基準でブックマーク解決）
  const urlMap = useMemo(() => {
    const map = new Map<string, SyncGridItem>()
    for (const g of flattenGroups(groups)) {
      for (const item of g.items) {
        map.set(item.url, item)
      }
    }
    return map
  }, [groups])

  // bookmarkId→URL 逆引き（外部APIはbookmarkIdを受け取るため）
  const idToUrl = useMemo(() => {
    const map = new Map<string, string>()
    for (const g of flattenGroups(groups)) {
      for (const item of g.items) {
        map.set(item.id, item.url)
      }
    }
    return map
  }, [groups])

  // 初回ロード + クリーンアップ（URLベース）
  useEffect(() => {
    if (urlMap.size === 0) return
    cleanupKanban(new Set(urlMap.keys())).then(setKanbanState)
  }, [urlMap])

  // 列ごとの解決済みアイテム
  const kanbanColumns = useMemo(() => {
    const cols: Record<KanbanColumn, SyncGridItem[]> = {
      todo: [],
      doing: [],
      done: [],
    }
    const sorted = [...kanbanState.items].sort((a, b) => a.order - b.order)
    for (const ki of sorted) {
      const item = urlMap.get(ki.url)
      if (item) cols[ki.column].push(item)
    }
    return cols
  }, [kanbanState, urlMap])

  const kanbanItemCount = kanbanState.items.length

  // 外部API: bookmarkIdで判定（内部でURL変換）
  const isInKanban = useCallback(
    (bookmarkId: string) => {
      const url = idToUrl.get(bookmarkId)
      return url ? kanbanState.items.some((i) => i.url === url) : false
    },
    [kanbanState, idToUrl],
  )

  const addToKanban = useCallback(
    async (bookmarkId: string, column: KanbanColumn = 'todo') => {
      const url = idToUrl.get(bookmarkId)
      if (!url) return
      const state = await addToKanbanStorage(url, column)
      setKanbanState(state)
    },
    [idToUrl],
  )

  const removeFromKanban = useCallback(
    async (bookmarkId: string) => {
      const url = idToUrl.get(bookmarkId)
      if (!url) return
      const state = await removeFromKanbanStorage(url)
      setKanbanState(state)
    },
    [idToUrl],
  )

  const moveItem = useCallback(
    async (bookmarkId: string, toColumn: KanbanColumn, toOrder: number) => {
      const url = idToUrl.get(bookmarkId)
      if (!url) return
      const state = await moveInKanbanStorage(url, toColumn, toOrder)
      setKanbanState(state)
    },
    [idToUrl],
  )

  const setDueDate = useCallback(
    async (bookmarkId: string, dueDate: number | undefined) => {
      const url = idToUrl.get(bookmarkId)
      if (!url) return
      const state = await setDueDateInKanban(url, dueDate)
      setKanbanState(state)
    },
    [idToUrl],
  )

  // 期限情報のマップ（bookmarkId → dueDate）
  const dueDates = useMemo(() => {
    const map = new Map<string, number>()
    for (const ki of kanbanState.items) {
      if (ki.dueDate) {
        const item = urlMap.get(ki.url)
        if (item) map.set(item.id, ki.dueDate)
      }
    }
    return map
  }, [kanbanState, urlMap])

  // 期限超過アイテム（done列以外）
  const overdueItems = useMemo(() => {
    const now = Date.now()
    return kanbanState.items
      .filter((ki) => ki.dueDate && ki.dueDate < now && ki.column !== 'done')
      .map((ki) => urlMap.get(ki.url))
      .filter((item): item is SyncGridItem => !!item)
  }, [kanbanState, urlMap])

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
