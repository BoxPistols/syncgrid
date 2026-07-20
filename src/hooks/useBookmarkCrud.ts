import { useState, useCallback } from 'react'
import {
  addBookmark,
  removeBookmark,
  updateBookmark,
  createGroup,
  renameGroup,
  getRootId,
  findItemById,
  findGroupById,
} from '../utils/bookmarks'
import { addToTrash } from '../utils/trash'
import type { SyncGridItem, SyncGridGroup } from '../types'
import type { Messages } from '../i18n'
import type { ToastType } from './useToast'

export interface ConfirmDialogState {
  message: string
  onConfirm: () => void
  confirmLabel?: string
}

interface CrudDeps {
  groups: SyncGridGroup[]
  currentFolder: SyncGridGroup | null
  refresh: () => Promise<void> | void
  showToast: (message: string, type?: ToastType) => void
  t: Messages
  setConfirmDialog: (dialog: ConfirmDialogState | null) => void
  handleSaveMeta: (id: string, tags: string[]) => Promise<void> | void
}

/**
 * ブックマーク・フォルダの CRUD と、それに付随するフォーム/編集 UI 状態。
 * 削除はゴミ箱経由（確認ダイアログ + トースト + 復元可能）。
 */
export function useBookmarkCrud({ groups, currentFolder, refresh, showToast, t, setConfirmDialog, handleSaveMeta }: CrudDeps) {
  const [editItem, setEditItem] = useState<SyncGridItem | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState<'tab' | 'subfolder' | false>(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)

  // 失敗時にエラートーストを出す共通ラッパ（各CRUDハンドラの try/catch を集約）
  const runWithErrorToast = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn()
      } catch {
        showToast(t.actionFailed, 'error')
      }
    },
    [showToast, t],
  )

  const handleCreateSubfolder = useCallback(async () => {
    const name = newGroupName.trim()
    if (!name) { setCreatingGroup(false); return }
    await runWithErrorToast(async () => {
      await createGroup(name, currentFolder?.id || (await getRootId()))
      setCreatingGroup(false)
      setNewGroupName('')
      await refresh()
    })
  }, [newGroupName, currentFolder, refresh, runWithErrorToast])

  const handleAddBookmark = useCallback(
    async (url: string, title: string) => {
      if (!currentFolder) return
      const folderId = currentFolder.id
      await runWithErrorToast(async () => {
        await addBookmark(folderId, title, url)
        setShowAddForm(false)
        await refresh()
      })
    },
    [currentFolder, refresh, runWithErrorToast],
  )

  const handleSaveBookmark = useCallback(
    async (id: string, title: string, url: string, tags: string[]) => {
      await runWithErrorToast(async () => {
        await updateBookmark(id, { title, url })
        await handleSaveMeta(id, tags)
        setEditItem(null)
        await refresh()
      })
    },
    [refresh, handleSaveMeta, runWithErrorToast],
  )

  // ブックマークをゴミ箱経由で削除する共通処理（確認ダイアログ＋トースト＋復元可能）
  const requestDeleteBookmark = useCallback(
    (item: SyncGridItem) => {
      setConfirmDialog({
        message: t.confirmDeleteBookmark(item.title || item.url),
        confirmLabel: t.delete,
        onConfirm: async () => {
          setConfirmDialog(null)
          try {
            const parentTitle = findGroupById(groups, item.parentId)?.title ?? ''
            await addToTrash({
              id: `trash_${Date.now()}_${item.id}`,
              title: item.title,
              url: item.url,
              parentId: item.parentId,
              parentTitle,
              deletedAt: Date.now(),
            })
            await removeBookmark(item.id)
            setEditItem(null)
            showToast(t.bookmarkDeleted, 'success')
            await refresh()
          } catch {
            showToast(t.actionFailed, 'error')
          }
        },
      })
    },
    [t, groups, refresh, showToast, setConfirmDialog],
  )

  // 編集モーダルからの削除（id受け取り→itemを解決）
  const handleDeleteBookmark = useCallback(
    (id: string) => {
      const item = editItem?.id === id ? editItem : findItemById(groups, id)
      if (item) requestDeleteBookmark(item)
    },
    [editItem, groups, requestDeleteBookmark],
  )

  const handleFolderRename = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim()
      if (trimmed) await renameGroup(id, trimmed)
      setRenamingFolderId(null)
      await refresh()
    },
    [refresh],
  )

  return {
    editItem, setEditItem,
    showAddForm, setShowAddForm,
    creatingGroup, setCreatingGroup,
    newGroupName, setNewGroupName,
    renamingFolderId, setRenamingFolderId,
    handleCreateSubfolder,
    handleAddBookmark,
    handleSaveBookmark,
    requestDeleteBookmark,
    handleDeleteBookmark,
    handleFolderRename,
  }
}
