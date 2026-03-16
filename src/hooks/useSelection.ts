/**
 * 複数選択・一括操作管理
 */
import { useState, useCallback } from 'react'
import type { SyncGridGroup, TrashItem } from '../types'
import type { Messages } from '../i18n'
import { removeBookmark, deleteGroup } from '../utils/bookmarks'
import { addMultipleToTrash } from '../utils/trash'

export function useSelection(
  currentFolder: SyncGridGroup | null,
  refresh: () => Promise<void>,
  t: Messages,
  setConfirmDialog: (d: { message: string; onConfirm: () => void; confirmLabel?: string } | null) => void,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      return true
    }
    return false
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return
    setConfirmDialog({
      message: t.selected(selectedIds.size),
      confirmLabel: t.delete,
      onConfirm: async () => {
        setConfirmDialog(null)
        const trashItems: TrashItem[] = []
        for (const id of selectedIds) {
          const item = currentFolder?.items.find((i) => i.id === id)
          if (item) {
            trashItems.push({
              id: `trash_${Date.now()}_${item.id}`,
              title: item.title,
              url: item.url,
              parentId: item.parentId,
              parentTitle: currentFolder?.title ?? '',
              deletedAt: Date.now(),
            })
          }
        }
        if (trashItems.length > 0) await addMultipleToTrash(trashItems)
        for (const id of selectedIds) {
          try {
            await removeBookmark(id)
          } catch {
            try {
              await deleteGroup(id)
            } catch { /* skip */ }
          }
        }
        setSelectedIds(new Set())
        refresh()
      },
    })
  }, [selectedIds, refresh, t, currentFolder, setConfirmDialog])

  const handleMoveSelected = useCallback(
    async (targetGroupId: string) => {
      for (const id of selectedIds) {
        try {
          await chrome.bookmarks.move(id, { parentId: targetGroupId })
        } catch { /* skip */ }
      }
      setSelectedIds(new Set())
      refresh()
    },
    [selectedIds, refresh],
  )

  const selectAll = useCallback(() => {
    if (currentFolder) {
      setSelectedIds(
        new Set([...currentFolder.items.map((i) => i.id), ...currentFolder.children.map((c) => c.id)]),
      )
    }
  }, [currentFolder])

  return {
    selectedIds,
    setSelectedIds,
    toggleSelect,
    clearSelection,
    handleDeleteSelected,
    handleMoveSelected,
    selectAll,
  }
}
