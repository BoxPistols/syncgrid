/**
 * ゴミ箱機能 — 削除ブックマークを30日間保持
 * chrome.storage.local に保存
 */

import type { TrashItem } from '../types'

const TRASH_KEY = 'syncgrid_trash'
const TRASH_TTL = 30 * 24 * 60 * 60 * 1000 // 30日

/** ゴミ箱の全アイテムを取得（期限切れを自動削除） */
export async function loadTrash(): Promise<TrashItem[]> {
  const result = await chrome.storage.local.get(TRASH_KEY)
  const items: TrashItem[] = (result[TRASH_KEY] as TrashItem[]) ?? []
  const now = Date.now()
  const valid = items.filter((item) => now - item.deletedAt < TRASH_TTL)
  // 期限切れがあれば保存し直す
  if (valid.length !== items.length) {
    await chrome.storage.local.set({ [TRASH_KEY]: valid })
  }
  return valid
}

/** ゴミ箱にアイテムを追加 */
export async function addToTrash(item: TrashItem): Promise<void> {
  const items = await loadTrash()
  items.push(item)
  await chrome.storage.local.set({ [TRASH_KEY]: items })
}

/** ゴミ箱から複数アイテムを追加 */
export async function addMultipleToTrash(newItems: TrashItem[]): Promise<void> {
  const items = await loadTrash()
  items.push(...newItems)
  await chrome.storage.local.set({ [TRASH_KEY]: items })
}

/** ゴミ箱からアイテムを復元（Chrome Bookmarksに再作成） */
export async function restoreFromTrash(trashId: string): Promise<void> {
  const items = await loadTrash()
  const item = items.find((i) => i.id === trashId)
  if (!item) return

  try {
    await chrome.bookmarks.create({
      parentId: item.parentId,
      title: item.title,
      url: item.url,
    })
  } catch {
    // parentIdが無効の場合、SyncGridルートに復元
    const results = await chrome.bookmarks.search({ title: '__SyncGrid__' })
    const root = results.find((n) => !n.url)
    if (root) {
      await chrome.bookmarks.create({
        parentId: root.id,
        title: item.title,
        url: item.url,
      })
    }
  }

  const remaining = items.filter((i) => i.id !== trashId)
  await chrome.storage.local.set({ [TRASH_KEY]: remaining })
}

/** ゴミ箱からアイテムを完全削除 */
export async function deleteFromTrash(trashId: string): Promise<void> {
  const items = await loadTrash()
  const remaining = items.filter((i) => i.id !== trashId)
  await chrome.storage.local.set({ [TRASH_KEY]: remaining })
}

/** ゴミ箱を空にする */
export async function emptyTrash(): Promise<void> {
  await chrome.storage.local.set({ [TRASH_KEY]: [] })
}

/** ゴミ箱のアイテム数を取得 */
export async function trashCount(): Promise<number> {
  const items = await loadTrash()
  return items.length
}
