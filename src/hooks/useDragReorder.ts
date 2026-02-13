import { useState, useCallback, useRef } from 'react'
import { moveBookmark, moveGroup, toChromeIndex } from '../utils/bookmarks'
import type { SyncGridGroup } from '../types'

type DragItemType = 'bookmark' | 'folder'

export interface DragState {
  draggingId: string | null
  draggingType: DragItemType | null
  dropTargetId: string | null
  dropSide: 'before' | 'after' | null
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

const INITIAL_STATE: DragState = {
  draggingId: null,
  draggingType: null,
  dropTargetId: null,
  dropSide: null,
}

export function useDragReorder(currentFolder: SyncGridGroup | null) {
  const [dragState, setDragState] = useState<DragState>(INITIAL_STATE)

  const dragDataRef = useRef<{
    id: string
    type: DragItemType
  } | null>(null)

  const getDragHandlers = useCallback((
    id: string,
    type: DragItemType,
  ): DragHandlers => ({
    draggable: true,

    onDragStart(e: React.DragEvent) {
      dragDataRef.current = { id, type }
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
      setTimeout(() => {
        setDragState({
          draggingId: id,
          draggingType: type,
          dropTargetId: null,
          dropSide: null,
        })
      }, 0)
    },

    onDragEnd() {
      dragDataRef.current = null
      setDragState(INITIAL_STATE)
    },

    onDragOver(e: React.DragEvent) {
      const data = dragDataRef.current
      if (!data || data.type !== type || data.id === id) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'

      const rect = e.currentTarget.getBoundingClientRect()
      const midX = rect.left + rect.width / 2
      const side: 'before' | 'after' = e.clientX < midX ? 'before' : 'after'

      setDragState(prev => {
        if (prev.dropTargetId === id && prev.dropSide === side) return prev
        return { ...prev, dropTargetId: id, dropSide: side }
      })
    },

    onDragEnter(e: React.DragEvent) {
      const data = dragDataRef.current
      if (!data || data.type !== type || data.id === id) return
      e.preventDefault()
    },

    onDragLeave(e: React.DragEvent) {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragState(prev => {
          if (prev.dropTargetId !== id) return prev
          return { ...prev, dropTargetId: null, dropSide: null }
        })
      }
    },

    async onDrop(e: React.DragEvent) {
      e.preventDefault()
      const data = dragDataRef.current
      if (!data || !currentFolder || data.type !== type || data.id === id) return

      const rect = e.currentTarget.getBoundingClientRect()
      const midX = rect.left + rect.width / 2
      const dropBefore = e.clientX < midX

      const items = type === 'folder' ? currentFolder.children : currentFolder.items
      const targetIdx = items.findIndex(item => item.id === id)
      if (targetIdx < 0) return

      let targetVisualIdx = dropBefore ? targetIdx : targetIdx + 1

      const sourceIdx = items.findIndex(item => item.id === data.id)
      if (sourceIdx >= 0 && sourceIdx < targetVisualIdx) {
        targetVisualIdx -= 1
      }

      const chromeIdx = toChromeIndex(
        targetVisualIdx,
        type,
        currentFolder.children.length,
      )

      if (type === 'bookmark') {
        await moveBookmark(data.id, currentFolder.id, chromeIdx)
      } else {
        await moveGroup(data.id, currentFolder.id, chromeIdx)
      }

      dragDataRef.current = null
      setDragState(INITIAL_STATE)
    },
  }), [currentFolder])

  return { dragState, getDragHandlers }
}
