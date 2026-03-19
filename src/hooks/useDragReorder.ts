import { useState, useCallback, useRef } from 'react'
import { getRootId } from '../utils/bookmarks'
import type { SyncGridGroup } from '../types'

type DragItemType = 'bookmark' | 'folder' | 'tab'
type DropMode = 'before' | 'after' | 'into' | null

export interface DragState {
  draggingId: string | null
  draggingType: DragItemType | null
  dropTargetId: string | null
  dropMode: DropMode
  dropTabId: string | null
  dropBreadcrumbId: string | null
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

export interface ZoneDropHandlers {
  onDragOver: (e: React.DragEvent) => void
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

function calcDropMode(
  relX: number,
  targetType: DragItemType,
  dragId: string,
  targetId: string,
  selectedIds?: Set<string>,
): DropMode {
  // 複数選択中のアイテムをフォルダにドロップ → 常にinto
  if (targetType === 'folder' && dragId !== targetId && selectedIds && selectedIds.size > 1) {
    return 'into'
  }
  if (targetType === 'folder' && dragId !== targetId) {
    // フォルダへのドロップ判定を緩くする（中央60%をintoに）
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
  dropBreadcrumbId: null,
}

export function useDragReorder(currentFolder: SyncGridGroup | null, selectedIds?: Set<string>) {
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
        e.dataTransfer.dropEffect = 'move'

        const rect = e.currentTarget.getBoundingClientRect()
        const relX = (e.clientX - rect.left) / rect.width
        const mode = calcDropMode(relX, type, data.id, id, selectedIds)

        setDragState((prev) => {
          if (prev.dropTargetId === id && prev.dropMode === mode) return prev
          return { ...prev, dropTargetId: id, dropMode: mode, dropTabId: null, dropBreadcrumbId: null }
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
        const data = dragDataRef.current
        if (!data || data.id === id) return

        try {
          const rect = e.currentTarget.getBoundingClientRect()
          const relX = (e.clientX - rect.left) / rect.width
          const mode = calcDropMode(relX, type, data.id, id, selectedIds)

          // 複数選択中のアイテムがドラッグされた場合、全選択アイテムを移動
          const idsToMove =
            selectedIds && selectedIds.size > 1 && selectedIds.has(data.id) ? [...selectedIds] : [data.id]

          if (mode === 'into') {
            for (const moveId of idsToMove) {
              if (moveId !== id) await chrome.bookmarks.move(moveId, { parentId: id })
            }
          } else {
            // ドロップターゲットの実際の親フォルダを取得（異なるフォルダ間のドロップに対応）
            const [targetNode] = await chrome.bookmarks.get(id)
            const parentId = targetNode.parentId!
            const [parentTree] = await chrome.bookmarks.getSubTree(parentId)
            const chromeChildren = parentTree.children ?? []

            const targetChromeIdx = chromeChildren.findIndex((c) => c.id === id)
            if (targetChromeIdx < 0) return

            // ソースが同じ親内にあるかチェック（異なる親ならindexのオフセット不要）
            const sourceChromeIdx = chromeChildren.findIndex((c) => c.id === data.id)
            let moveIdx = mode === 'before' ? targetChromeIdx : targetChromeIdx + 1
            if (sourceChromeIdx >= 0 && sourceChromeIdx < moveIdx) {
              moveIdx -= 1
            }

            await chrome.bookmarks.move(data.id, { parentId, index: moveIdx })
          }
        } catch (err) {
          console.error('[SyncGrid] Drop failed:', err)
        } finally {
          dragDataRef.current = null
          setDragState(INITIAL_STATE)
        }
      },
    }),
    [currentFolder, selectedIds],
  )

  // --- Tab bar drop handlers ---
  const getTabDropHandlers = useCallback(
    (tabId: string): ZoneDropHandlers => ({
      onDragOver(e: React.DragEvent) {
        const data = dragDataRef.current
        if (!data) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragState((prev) => {
          if (prev.dropTabId === tabId) return prev
          return { ...prev, dropTargetId: null, dropMode: null, dropTabId: tabId, dropBreadcrumbId: null }
        })
      },

      onDragEnter(e: React.DragEvent) {
        if (!dragDataRef.current) return
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
        if (!data) return

        try {
          const targetId = tabId === '__ungrouped__' ? await getRootId() : tabId
          await chrome.bookmarks.move(data.id, { parentId: targetId })
        } catch (err) {
          console.error('[SyncGrid] Tab drop failed:', err)
        } finally {
          dragDataRef.current = null
          setDragState(INITIAL_STATE)
        }
      },
    }),
    [],
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
          return { ...prev, dropTargetId: null, dropMode: null, dropTabId: tabId, dropBreadcrumbId: null }
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
          } else {
            // カード/フォルダ → タブへ移動（複数選択対応）
            const targetId = tabId === '__ungrouped__' ? await getRootId() : tabId
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
    [selectedIds],
  )

  return { dragState, getDragHandlers, getTabDropHandlers, getTabHandlers }
}
