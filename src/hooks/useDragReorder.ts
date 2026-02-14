import { useState, useCallback, useRef } from 'react'
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

      // Chrome APIの実際の子ノード配列を取得（フォルダ/ブックマーク混在順）
      const [parentTree] = await chrome.bookmarks.getSubTree(currentFolder.id)
      const chromeChildren = parentTree.children ?? []

      const targetChromeIdx = chromeChildren.findIndex(c => c.id === id)
      if (targetChromeIdx < 0) return

      const sourceChromeIdx = chromeChildren.findIndex(c => c.id === data.id)
      if (sourceChromeIdx < 0) return

      // ドロップ位置のChrome indexを計算
      let moveIdx = dropBefore ? targetChromeIdx : targetChromeIdx + 1

      // Chrome move APIはソースを先に除去してからインデックスを適用する
      if (sourceChromeIdx < moveIdx) {
        moveIdx -= 1
      }

      await chrome.bookmarks.move(data.id, {
        parentId: currentFolder.id,
        index: moveIdx,
      })

      dragDataRef.current = null
      setDragState(INITIAL_STATE)
    },
  }), [currentFolder])

  return { dragState, getDragHandlers }
}
