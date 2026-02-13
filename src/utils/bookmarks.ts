import { SYNCGRID_ROOT, type SyncGridGroup, type SyncGridItem } from '../types'

/**
 * __SyncGrid__ ルートフォルダを取得（なければ作成）
 */
export async function getOrCreateRoot(): Promise<chrome.bookmarks.BookmarkTreeNode> {
  const results = await chrome.bookmarks.search({ title: SYNCGRID_ROOT })
  const root = results.find(
    (node) => !node.url && node.title === SYNCGRID_ROOT
  )
  if (root) return root

  return chrome.bookmarks.create({
    parentId: '2',
    title: SYNCGRID_ROOT,
  })
}

/**
 * BookmarkTreeNode → SyncGridGroup に再帰変換
 */
function parseGroup(
  node: chrome.bookmarks.BookmarkTreeNode,
  depth: number
): SyncGridGroup {
  const items: SyncGridItem[] = []
  const children: SyncGridGroup[] = []

  if (node.children) {
    for (const child of node.children) {
      if (child.url) {
        items.push({
          id: child.id,
          title: child.title,
          url: child.url,
          dateAdded: child.dateAdded,
          parentId: node.id,
        })
      } else if (child.children !== undefined || !child.url) {
        // フォルダ → 再帰
        children.push(parseGroup(child, depth + 1))
      }
    }
  }

  return {
    id: node.id,
    title: node.title,
    items,
    children,
    parentId: node.parentId ?? '',
    depth,
  }
}

/**
 * __SyncGrid__ 配下のグループとアイテムを再帰的に取得
 */
export async function loadGroups(): Promise<SyncGridGroup[]> {
  const root = await getOrCreateRoot()
  const [tree] = await chrome.bookmarks.getSubTree(root.id)

  if (!tree.children) return []

  const groups: SyncGridGroup[] = []
  const ungroupedItems: SyncGridItem[] = []

  for (const child of tree.children) {
    if (!child.url) {
      groups.push(parseGroup(child, 0))
    } else {
      ungroupedItems.push({
        id: child.id,
        title: child.title,
        url: child.url,
        dateAdded: child.dateAdded,
        parentId: root.id,
      })
    }
  }

  if (ungroupedItems.length > 0) {
    groups.push({
      id: '__ungrouped__',
      title: '未分類',
      items: ungroupedItems,
      children: [],
      parentId: root.id,
      depth: 0,
    })
  }

  return groups
}

/**
 * ルートフォルダIDを取得
 */
export async function getRootId(): Promise<string> {
  const root = await getOrCreateRoot()
  return root.id
}

/**
 * 新しいグループ（フォルダ）を作成 — parentId指定でネスト可能
 */
export async function createGroup(
  title: string,
  parentId?: string
): Promise<chrome.bookmarks.BookmarkTreeNode> {
  const effectiveParentId = parentId ?? (await getOrCreateRoot()).id
  return chrome.bookmarks.create({
    parentId: effectiveParentId,
    title,
  })
}

/** グループ名を変更 */
export async function renameGroup(id: string, title: string): Promise<void> {
  await chrome.bookmarks.update(id, { title })
}

/** グループを削除（中のブックマーク・サブグループもすべて削除） */
export async function deleteGroup(id: string): Promise<void> {
  await chrome.bookmarks.removeTree(id)
}

/** ブックマークを追加 */
export async function addBookmark(
  parentId: string,
  title: string,
  url: string
): Promise<chrome.bookmarks.BookmarkTreeNode> {
  return chrome.bookmarks.create({ parentId, title, url })
}

/** ブックマークを削除 */
export async function removeBookmark(id: string): Promise<void> {
  return chrome.bookmarks.remove(id)
}

/** ブックマークのタイトル/URLを更新 */
export async function updateBookmark(
  id: string,
  changes: { title?: string; url?: string }
): Promise<chrome.bookmarks.BookmarkTreeNode> {
  return chrome.bookmarks.update(id, changes)
}

/** ブックマークを別グループに移動 */
export async function moveBookmark(
  id: string,
  newParentId: string,
  index?: number
): Promise<chrome.bookmarks.BookmarkTreeNode> {
  return chrome.bookmarks.move(id, { parentId: newParentId, index })
}

/** グループ（フォルダ）を並べ替え / 別の親に移動 */
export async function moveGroup(
  id: string,
  newParentId: string,
  index?: number
): Promise<void> {
  await chrome.bookmarks.move(id, { parentId: newParentId, index })
}

/**
 * ツリーからグループを再帰検索
 */
export function findGroupById(
  groups: SyncGridGroup[],
  id: string
): SyncGridGroup | undefined {
  for (const group of groups) {
    if (group.id === id) return group
    const found = findGroupById(group.children, id)
    if (found) return found
  }
  return undefined
}

/**
 * ツリーからアイテムが属するグループIDを再帰検索
 */
export function findGroupForItem(
  groups: SyncGridGroup[],
  itemId: string
): string | undefined {
  for (const group of groups) {
    if (group.items.some((item) => item.id === itemId)) return group.id
    const found = findGroupForItem(group.children, itemId)
    if (found) return found
  }
  return undefined
}

/**
 * ツリー全体をフラット化（全グループを1次元配列に）
 */
export function flattenGroups(groups: SyncGridGroup[]): SyncGridGroup[] {
  const result: SyncGridGroup[] = []
  for (const group of groups) {
    result.push(group)
    result.push(...flattenGroups(group.children))
  }
  return result
}
