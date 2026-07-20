import { useState, useCallback } from 'react'
import { deleteGroup } from '../utils/bookmarks'
import type { MenuItem } from '../components/ContextMenu'
import type { SyncGridItem, SyncGridGroup, KanbanColumn } from '../types'
import type { Messages } from '../i18n'
import type { ConfirmDialogState } from './useBookmarkCrud'

interface ContextMenuDeps {
  t: Messages
  isInKanban: (id: string) => boolean
  addToKanban: (id: string) => void
  removeFromKanban: (id: string) => void
  moveKanbanItem: (id: string, column: KanbanColumn, beforeId: string | null) => void
  setDueDate: (id: string, dueDate: number | undefined) => void
  dueDates: Map<string, number>
  isPinnedUrl: (url: string) => boolean
  togglePinUrl: (url: string) => void
  requestDeleteBookmark: (item: SyncGridItem) => void
  setEditItem: (item: SyncGridItem | null) => void
  setDueDateTarget: (id: string | null) => void
  setRenamingFolderId: (id: string | null) => void
  setConfirmDialog: (dialog: ConfirmDialogState | null) => void
  refresh: () => Promise<void> | void
}

export interface CtxMenuState {
  x: number
  y: number
  items: MenuItem[]
}

/**
 * ブックマーク / カンバン内 / フォルダの各コンテキストメニュー構築と表示状態。
 */
export function useAppContextMenus({
  t,
  isInKanban,
  addToKanban,
  removeFromKanban,
  moveKanbanItem,
  setDueDate,
  dueDates,
  isPinnedUrl,
  togglePinUrl,
  requestDeleteBookmark,
  setEditItem,
  setDueDateTarget,
  setRenamingFolderId,
  setConfirmDialog,
  refresh,
}: ContextMenuDeps) {
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null)

  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])

  const onBookmarkContext = useCallback(
    (item: SyncGridItem, x: number, y: number) => {
      setCtxMenu({
        x, y,
        items: [
          { label: t.openNewTab, icon: 'link', shortcut: 'O', action: () => window.open(item.url, '_blank') },
          { label: t.edit, icon: 'edit', shortcut: 'E', action: () => setEditItem(item) },
          { label: '---', action: () => {} },
          isPinnedUrl(item.url)
            ? { label: t.unpin, icon: 'pin', shortcut: 'P', action: () => togglePinUrl(item.url) }
            : { label: t.pin, icon: 'pin', shortcut: 'P', action: () => togglePinUrl(item.url) },
          isInKanban(item.id)
            ? { label: t.removeFromKanban, icon: 'columns', shortcut: 'K', action: () => removeFromKanban(item.id) }
            : { label: t.addToKanban, icon: 'columns', shortcut: 'K', action: () => addToKanban(item.id) },
          { label: '---', action: () => {} },
          { label: t.delete, icon: 'trash', danger: true, action: () => requestDeleteBookmark(item) },
        ],
      })
    },
    [t, isInKanban, addToKanban, removeFromKanban, requestDeleteBookmark, setEditItem, isPinnedUrl, togglePinUrl],
  )

  // カンバン内ブックマークのコンテキストメニュー
  const onKanbanContext = useCallback(
    (item: SyncGridItem, x: number, y: number) => {
      setCtxMenu({
        x, y,
        items: [
          { label: t.openNewTab, icon: 'link', shortcut: 'O', action: () => window.open(item.url, '_blank') },
          { label: t.edit, icon: 'edit', shortcut: 'E', action: () => setEditItem(item) },
          { label: '---', action: () => {} },
          { label: t.kanbanTodo, icon: 'columns', action: () => moveKanbanItem(item.id, 'todo', null) },
          { label: t.kanbanDoing, icon: 'columns', action: () => moveKanbanItem(item.id, 'doing', null) },
          { label: t.kanbanDone, icon: 'columns', action: () => moveKanbanItem(item.id, 'done', null) },
          { label: '---', action: () => {} },
          { label: t.kanbanSetDueDate, icon: 'pin', action: () => setDueDateTarget(item.id) },
          ...(dueDates.get(item.id) ? [{ label: t.kanbanClearDueDate, icon: 'close' as const, action: () => setDueDate(item.id, undefined) }] : []),
          { label: '---', action: () => {} },
          { label: t.removeFromKanban, icon: 'close', danger: true, action: () => removeFromKanban(item.id) },
        ],
      })
    },
    [t, moveKanbanItem, removeFromKanban, setDueDate, dueDates, setEditItem, setDueDateTarget],
  )

  const onFolderContext = useCallback(
    (group: SyncGridGroup, x: number, y: number) => {
      setCtxMenu({
        x, y,
        items: [
          { label: t.rename, icon: 'edit', action: () => setRenamingFolderId(group.id) },
          { label: '---', action: () => {} },
          {
            label: t.delete, icon: 'trash', danger: true,
            action: () => setConfirmDialog({
              message: t.confirmDeleteFolder(group.title),
              confirmLabel: t.delete,
              onConfirm: async () => { setConfirmDialog(null); await deleteGroup(group.id); refresh() },
            }),
          },
        ],
      })
    },
    [refresh, t, setRenamingFolderId, setConfirmDialog],
  )

  return { ctxMenu, closeCtxMenu, onBookmarkContext, onKanbanContext, onFolderContext }
}
