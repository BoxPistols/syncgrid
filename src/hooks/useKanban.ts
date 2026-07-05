import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { SyncGridGroup, SyncGridItem, KanbanColumn, KanbanState } from '../types'
import {
  loadKanban,
  addToKanban as addToKanbanStorage,
  removeFromKanban as removeFromKanbanStorage,
  moveInKanban as moveInKanbanStorage,
  setDueDateInKanban,
  cleanupKanban,
} from '../utils/kanban'
import { flattenGroups } from '../utils/bookmarks'

interface UseKanbanOptions {
  /** 保存失敗時に呼ばれる（トースト表示など） */
  onError?: () => void
}

export function useKanban(groups: SyncGridGroup[], options: UseKanbanOptions = {}) {
  const { onError } = options
  const [kanbanState, setKanbanState] = useState<KanbanState>({ items: [] })
  const [now, setNow] = useState(() => Date.now())

  // 最新の onError を ref 経由で参照（コールバックの依存を安定させる）
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

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

  // 他端末（sync）・同一端末の別タブ（local）からの変更を検知してUIに反映
  useEffect(() => {
    const handleChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if ((areaName === 'sync' || areaName === 'local') && changes.syncgrid_kanban?.newValue) {
        const incoming = changes.syncgrid_kanban.newValue as KanbanState
        // 古い変更（自分の書き込みechoの遅延や、他PCの旧状態）は無視して収束を保つ
        setKanbanState((prev) =>
          (incoming.updatedAt ?? 0) < (prev.updatedAt ?? 0) ? prev : incoming,
        )
      }
    }
    chrome.storage.onChanged.addListener(handleChange)
    return () => chrome.storage.onChanged.removeListener(handleChange)
  }, [])

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

  // storage 書き込みを実行し、成功時に state 反映・失敗時にロールバック（再読込）＋通知する
  const runMutation = useCallback(async (fn: () => Promise<KanbanState>) => {
    try {
      const state = await fn()
      setKanbanState(state)
    } catch {
      // local 保存に失敗（quota 超過など）: 永続化された状態へ巻き戻す
      onErrorRef.current?.()
      try {
        setKanbanState(await loadKanban())
      } catch {
        // 読み込みも失敗した場合は現状維持
      }
    }
  }, [])

  const addToKanban = useCallback(
    async (bookmarkId: string, column: KanbanColumn = 'todo') => {
      const url = idToUrl.get(bookmarkId)
      if (!url) return
      await runMutation(() => addToKanbanStorage(url, column))
    },
    [idToUrl, runMutation],
  )

  const removeFromKanban = useCallback(
    async (bookmarkId: string) => {
      const url = idToUrl.get(bookmarkId)
      if (!url) return
      await runMutation(() => removeFromKanbanStorage(url))
    },
    [idToUrl, runMutation],
  )

  const moveItem = useCallback(
    async (bookmarkId: string, toColumn: KanbanColumn, beforeBookmarkId: string | null) => {
      const url = idToUrl.get(bookmarkId)
      if (!url) return
      const beforeUrl = beforeBookmarkId ? idToUrl.get(beforeBookmarkId) ?? null : null
      await runMutation(() => moveInKanbanStorage(url, toColumn, beforeUrl))
    },
    [idToUrl, runMutation],
  )

  const setDueDate = useCallback(
    async (bookmarkId: string, dueDate: number | undefined) => {
      const url = idToUrl.get(bookmarkId)
      if (!url) return
      await runMutation(() => setDueDateInKanban(url, dueDate))
    },
    [idToUrl, runMutation],
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
    return kanbanState.items
      .filter((ki) => ki.dueDate && ki.dueDate < now && ki.column !== 'done')
      .map((ki) => urlMap.get(ki.url))
      .filter((item): item is SyncGridItem => !!item)
  }, [kanbanState, urlMap, now])

  const reloadKanban = useCallback(async () => {
    const state = await loadKanban()
    setKanbanState(state)
  }, [])

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
    reloadKanban,
  }
}
