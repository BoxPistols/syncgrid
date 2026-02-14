import { useState, useCallback, useRef } from 'react'
import type { SyncGridGroup } from '../types'

type DragItemType = 'bookmark' | 'folder'
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

const INITIAL_STATE: DragState = {
  draggingId: null,
  draggingType: null,
  dropTargetId: null,
  dropMode: null,
  dropTabId: null,
  dropBreadcrumbId: null,
}

export function useDragReorder(currentFolder: SyncGridGroup | null) {
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

        let mode: DropMode
        if (type === 'folder' && data.id !== id) {
          // フォルダカード: 左30% = before, 中央40% = into, 右30% = after
          mode = relX < 0.3 ? 'before' : relX > 0.7 ? 'after' : 'into'
        } else {
          // ブックマークカード: 左50% = before, 右50% = after
          mode = relX < 0.5 ? 'before' : 'after'
        }

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
        if (!data || !currentFolder || data.id === id) return

        try {
          const rect = e.currentTarget.getBoundingClientRect()
          const relX = (e.clientX - rect.left) / rect.width

          let mode: DropMode
          if (type === 'folder') {
            mode = relX < 0.3 ? 'before' : relX > 0.7 ? 'after' : 'into'
          } else {
            mode = relX < 0.5 ? 'before' : 'after'
          }

          if (mode === 'into') {
            // フォルダの中に移動（末尾に追加）
            await chrome.bookmarks.move(data.id, { parentId: id })
          } else {
            // 同一フォルダ内の並べ替え
            const [parentTree] = await chrome.bookmarks.getSubTree(currentFolder.id)
            const chromeChildren = parentTree.children ?? []

            const targetChromeIdx = chromeChildren.findIndex((c) => c.id === id)
            if (targetChromeIdx < 0) return

            const sourceChromeIdx = chromeChildren.findIndex((c) => c.id === data.id)
            if (sourceChromeIdx < 0) return

            let moveIdx = mode === 'before' ? targetChromeIdx : targetChromeIdx + 1
            if (sourceChromeIdx < moveIdx) {
              moveIdx -= 1
            }

            await chrome.bookmarks.move(data.id, {
              parentId: currentFolder.id,
              index: moveIdx,
            })
          }
        } catch (err) {
          console.error('[SyncGrid] Drop failed:', err)
        } finally {
          dragDataRef.current = null
          setDragState(INITIAL_STATE)
        }
      },
    }),
    [currentFolder],
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
          await chrome.bookmarks.move(data.id, { parentId: tabId })
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

  // --- Breadcrumb / back button drop handlers ---
  const getBreadcrumbDropHandlers = useCallback(
    (parentId: string): ZoneDropHandlers => ({
      onDragOver(e: React.DragEvent) {
        const data = dragDataRef.current
        if (!data) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragState((prev) => {
          if (prev.dropBreadcrumbId === parentId) return prev
          return { ...prev, dropTargetId: null, dropMode: null, dropTabId: null, dropBreadcrumbId: parentId }
        })
      },

      onDragEnter(e: React.DragEvent) {
        if (!dragDataRef.current) return
        e.preventDefault()
      },

      onDragLeave(e: React.DragEvent) {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragState((prev) => {
            if (prev.dropBreadcrumbId !== parentId) return prev
            return { ...prev, dropBreadcrumbId: null }
          })
        }
      },

      async onDrop(e: React.DragEvent) {
        e.preventDefault()
        const data = dragDataRef.current
        if (!data) return

        try {
          await chrome.bookmarks.move(data.id, { parentId })
        } catch (err) {
          console.error('[SyncGrid] Breadcrumb drop failed:', err)
        } finally {
          dragDataRef.current = null
          setDragState(INITIAL_STATE)
        }
      },
    }),
    [],
  )

  return { dragState, getDragHandlers, getTabDropHandlers, getBreadcrumbDropHandlers }
}
