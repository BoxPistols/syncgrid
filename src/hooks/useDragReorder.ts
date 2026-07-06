import { useState, useCallback, useRef } from 'react'
import { getRootId, UNGROUPED_ID } from '../utils/bookmarks'

type DragItemType = 'bookmark' | 'folder' | 'tab'
type DropMode = 'before' | 'after' | 'into' | null

export interface DragState {
  draggingId: string | null
  draggingType: DragItemType | null
  dropTargetId: string | null
  dropMode: DropMode
  dropTabId: string | null
}

export interface DragHandlers {
  draggable: true
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}


function calcDropMode(
  relX: number,
  targetType: DragItemType,
  dragType: DragItemType,
  dragId: string,
  targetId: string,
  selectedIds?: Set<string>,
): DropMode {
  if (dragId === targetId) return null
  // フォルダ同士 → 並べ替え（before/after）を優先
  if (dragType === 'folder' && targetType === 'folder') {
    return relX < 0.5 ? 'before' : 'after'
  }
  // 複数選択中のアイテムをフォルダにドロップ → 常にinto
  if (targetType === 'folder' && selectedIds && selectedIds.size > 1) {
    return 'into'
  }
  // ブックマーク → フォルダ: 中央60%をintoに
  if (targetType === 'folder') {
    return relX < 0.2 ? 'before' : relX > 0.8 ? 'after' : 'into'
  }
  return relX < 0.5 ? 'before' : 'after'
}

const INITIAL_STATE: DragState = {
  draggingId: null,
  draggingType: null,
  dropTargetId: null,
  dropMode: null,
  dropTabId: null,
}

/**
 * ターゲットカードの隣（before/after）へ移動する。移動が成立したら true。
 * bookmarks.moveのindexは「移動前リスト上の挿入位置」解釈。
 * 同一親内の前方移動はChrome側が内部補正するため、こちらで-1補正すると二重になる(2026-07実測)
 */
async function moveRelativeTo(
  sourceId: string,
  targetId: string,
  mode: 'before' | 'after',
): Promise<boolean> {
  const [targetNode] = await chrome.bookmarks.get(targetId)
  const parentId = targetNode.parentId!
  const [parentTree] = await chrome.bookmarks.getSubTree(parentId)
  const chromeChildren = parentTree.children ?? []

  const targetChromeIdx = chromeChildren.findIndex((c) => c.id === targetId)
  if (targetChromeIdx < 0) return false

  const moveIdx = mode === 'before' ? targetChromeIdx : targetChromeIdx + 1
  await chrome.bookmarks.move(sourceId, { parentId, index: moveIdx })
  return true
}

/** コンテナ内の最近傍カード（隙間・行末・背景へのドロップ先解決） */
function findNearestCard(
  container: HTMLElement,
  x: number,
  y: number,
): { id: string; mode: 'before' | 'after' } | null {
  let best: HTMLElement | null = null
  let bestDist = Infinity
  for (const el of container.querySelectorAll<HTMLElement>('[data-sg-card-id]')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue // 折りたたみ等で非表示のカードは除外
    const dx = Math.max(r.left - x, 0, x - r.right)
    const dy = Math.max(r.top - y, 0, y - r.bottom)
    const dist = dx * dx + dy * dy
    if (dist < bestDist) {
      bestDist = dist
      best = el
    }
  }
  if (!best) return null
  const rect = best.getBoundingClientRect()
  return {
    id: best.dataset.sgCardId as string,
    mode: x < rect.left + rect.width / 2 ? 'before' : 'after',
  }
}

export function useDragReorder(
  selectedIds?: Set<string>,
  onKanbanDrop?: (bookmarkId: string) => void,
  onReorderDone?: () => void,
) {
  const [dragState, setDragState] = useState<DragState>(INITIAL_STATE)

  const dragDataRef = useRef<{
    id: string
    type: DragItemType
  } | null>(null)

  // --- Card drag handlers (grid items) ---
  const getDragHandlers = useCallback(
    (id: string, type: DragItemType): DragHandlers => ({
      draggable: true,

      onDragStart(e: React.DragEvent) {
        dragDataRef.current = { id, type }
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', id)
        setTimeout(() => {
          setDragState({
            ...INITIAL_STATE,
            draggingId: id,
            draggingType: type,
          })
        }, 0)
      },

      onDragEnd() {
        dragDataRef.current = null
        setDragState(INITIAL_STATE)
      },

      onDragOver(e: React.DragEvent) {
        const data = dragDataRef.current
        if (!data || data.id === id) return
        e.preventDefault()
        e.stopPropagation() // コンテナ側の最近傍判定と二重処理しない
        e.dataTransfer.dropEffect = 'move'

        const rect = e.currentTarget.getBoundingClientRect()
        const relX = (e.clientX - rect.left) / rect.width
        const mode = calcDropMode(relX, type, data.type, data.id, id, selectedIds)

        setDragState((prev) => {
          if (prev.dropTargetId === id && prev.dropMode === mode) return prev
          return { ...prev, dropTargetId: id, dropMode: mode, dropTabId: null }
        })
      },

      onDragEnter(e: React.DragEvent) {
        const data = dragDataRef.current
        if (!data || data.id === id) return
        e.preventDefault()
      },

      onDragLeave(e: React.DragEvent) {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragState((prev) => {
            if (prev.dropTargetId !== id) return prev
            return { ...prev, dropTargetId: null, dropMode: null }
          })
        }
      },

      async onDrop(e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation() // コンテナ側の最近傍判定と二重処理しない
        const data = dragDataRef.current
        if (!data || data.id === id) return

        try {
          const rect = e.currentTarget.getBoundingClientRect()
          const relX = (e.clientX - rect.left) / rect.width
          const mode = calcDropMode(relX, type, data.type, data.id, id, selectedIds)

          // 複数選択中のアイテムがドラッグされた場合、全選択アイテムを移動
          const idsToMove =
            selectedIds && selectedIds.size > 1 && selectedIds.has(data.id) ? [...selectedIds] : [data.id]

          if (mode === 'into') {
            for (const moveId of idsToMove) {
              if (moveId !== id) await chrome.bookmarks.move(moveId, { parentId: id })
            }
          } else if (mode) {
            // 並べ替えが成立した時のみ通知（表示ソートがmanual以外なら呼び出し側で切替）
            if (await moveRelativeTo(data.id, id, mode)) onReorderDone?.()
          }
        } catch (err) {
          console.error('[SyncGrid] Drop failed:', err)
        } finally {
          dragDataRef.current = null
          setDragState(INITIAL_STATE)
        }
      },
    }),
    [selectedIds, onReorderDone],
  )

  // --- Container handlers (グリッドの隙間・行末・背景へのドロップを最近傍カードに解決) ---
  const getContainerHandlers = useCallback(
    (fallbackParentId?: string) => ({
      onDragOver(e: React.DragEvent) {
        const data = dragDataRef.current
        if (!data || data.type === 'tab') return
        const nearest = findNearestCard(e.currentTarget as HTMLElement, e.clientX, e.clientY)
        if (!nearest && !fallbackParentId) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (nearest && nearest.id !== data.id) {
          setDragState((prev) => {
            if (prev.dropTargetId === nearest.id && prev.dropMode === nearest.mode) return prev
            return { ...prev, dropTargetId: nearest.id, dropMode: nearest.mode, dropTabId: null }
          })
        }
      },

      async onDrop(e: React.DragEvent) {
        const data = dragDataRef.current
        if (!data || data.type === 'tab') return
        e.preventDefault()

        try {
          const nearest = findNearestCard(e.currentTarget as HTMLElement, e.clientX, e.clientY)
          if (nearest && nearest.id !== data.id) {
            if (await moveRelativeTo(data.id, nearest.id, nearest.mode)) onReorderDone?.()
          } else if (!nearest && fallbackParentId) {
            // カードが1枚もないビュー: フォルダ末尾へ移動
            await chrome.bookmarks.move(data.id, { parentId: fallbackParentId })
          }
        } catch (err) {
          console.error('[SyncGrid] Container drop failed:', err)
        } finally {
          dragDataRef.current = null
          setDragState(INITIAL_STATE)
        }
      },
    }),
    [onReorderDone],
  )

  // --- Tab unified handlers (タブ自体のD&D + アイテム→タブへのドロップを統合) ---
  const getTabHandlers = useCallback(
    (tabId: string) => ({
      draggable: true,

      onDragStart(e: React.DragEvent) {
        dragDataRef.current = { id: tabId, type: 'tab' }
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', tabId)
        setTimeout(() => {
          setDragState({
            ...INITIAL_STATE,
            draggingId: tabId,
            draggingType: 'tab',
          })
        }, 0)
      },

      onDragEnd() {
        dragDataRef.current = null
        setDragState(INITIAL_STATE)
      },

      onDragOver(e: React.DragEvent) {
        const data = dragDataRef.current
        if (!data || data.id === tabId) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragState((prev) => {
          if (prev.dropTabId === tabId) return prev
          return { ...prev, dropTargetId: null, dropMode: null, dropTabId: tabId }
        })
      },

      onDragEnter(e: React.DragEvent) {
        const data = dragDataRef.current
        if (!data || data.id === tabId) return
        e.preventDefault()
      },

      onDragLeave(e: React.DragEvent) {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragState((prev) => {
            if (prev.dropTabId !== tabId) return prev
            return { ...prev, dropTabId: null }
          })
        }
      },

      async onDrop(e: React.DragEvent) {
        e.preventDefault()
        const data = dragDataRef.current
        if (!data || data.id === tabId) return

        try {
          if (data.type === 'tab') {
            // タブ同士の並び替え
            const rootId = await getRootId()
            const [rootTree] = await chrome.bookmarks.getSubTree(rootId)
            const children = rootTree.children ?? []

            const sourceIdx = children.findIndex((c) => c.id === data.id)
            const targetIdx = children.findIndex((c) => c.id === tabId)
            if (sourceIdx < 0 || targetIdx < 0) return

            let moveIdx = targetIdx
            if (sourceIdx < moveIdx) moveIdx += 1

            await chrome.bookmarks.move(data.id, { parentId: rootId, index: moveIdx })
          } else if (tabId === '__kanban__') {
            // カード → カンバンへ追加
            if (onKanbanDrop) {
              const idsToAdd =
                selectedIds && selectedIds.size > 1 && selectedIds.has(data.id) ? [...selectedIds] : [data.id]
              for (const addId of idsToAdd) onKanbanDrop(addId)
            }
          } else {
            // カード/フォルダ → タブへ移動（複数選択対応）
            const targetId = tabId === UNGROUPED_ID ? await getRootId() : tabId
            const idsToMove =
              selectedIds && selectedIds.size > 1 && selectedIds.has(data.id) ? [...selectedIds] : [data.id]
            for (const moveId of idsToMove) {
              await chrome.bookmarks.move(moveId, { parentId: targetId })
            }
          }
        } catch (err) {
          console.error('[SyncGrid] Tab drop failed:', err)
        } finally {
          dragDataRef.current = null
          setDragState(INITIAL_STATE)
        }
      },
    }),
    [selectedIds, onKanbanDrop],
  )

  return { dragState, getDragHandlers, getTabHandlers, getContainerHandlers }
}
