import { SYNCGRID_ROOT, type SyncGridGroup, type SyncGridItem } from '../types'

/** タブレベルの未分類グループID（__SyncGrid__ルート直下の所属なしブックマークを集約） */
export const UNGROUPED_ID = '__ungrouped__'

/**
 * __SyncGrid__ ルートフォルダを取得（なければ作成）
 */
export async function getOrCreateRoot(): Promise<chrome.bookmarks.BookmarkTreeNode> {
  const results = await chrome.bookmarks.search({ title: SYNCGRID_ROOT })
  const root = results.find((node) => !node.url && node.title === SYNCGRID_ROOT)
  if (root) return root

  return chrome.bookmarks.create({
    parentId: '2',
    title: SYNCGRID_ROOT,
  })
}

/**
 * BookmarkTreeNode → SyncGridGroup に再帰変換
 */
function parseGroup(node: chrome.bookmarks.BookmarkTreeNode, depth: number): SyncGridGroup {
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
      id: UNGROUPED_ID,
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
export async function createGroup(title: string, parentId?: string): Promise<chrome.bookmarks.BookmarkTreeNode> {
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
  url: string,
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
  changes: { title?: string; url?: string },
): Promise<chrome.bookmarks.BookmarkTreeNode> {
  return chrome.bookmarks.update(id, changes)
}

/** ブックマークを別グループに移動 */
export async function moveBookmark(
  id: string,
  newParentId: string,
  index?: number,
): Promise<chrome.bookmarks.BookmarkTreeNode> {
  return chrome.bookmarks.move(id, { parentId: newParentId, index })
}

/** グループ（フォルダ）を並べ替え / 別の親に移動 */
export async function moveGroup(id: string, newParentId: string, index?: number): Promise<void> {
  await chrome.bookmarks.move(id, { parentId: newParentId, index })
}

/**
 * ツリーからグループを再帰検索
 */
export function findGroupById(groups: SyncGridGroup[], id: string): SyncGridGroup | undefined {
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
export function findGroupForItem(groups: SyncGridGroup[], itemId: string): string | undefined {
  for (const group of groups) {
    if (group.items.some((item) => item.id === itemId)) return group.id
    const found = findGroupForItem(group.children, itemId)
    if (found) return found
  }
  return undefined
}

/**
 * グループ内の全アイテム数を再帰的にカウント
 */
export function countAll(g: SyncGridGroup): number {
  return g.items.length + g.children.reduce((sum, c) => sum + countAll(c), 0)
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

/**
 * 全グループ配下の全ブックマークアイテムを1次元配列で取得
 */
export function getAllItems(groups: SyncGridGroup[]): SyncGridItem[] {
  const items: SyncGridItem[] = []
  for (const group of flattenGroups(groups)) {
    items.push(...group.items)
  }
  return items
}

/**
 * ツリー全体からIDでブックマークアイテムを検索（中間配列を作らず走査）
 */
export function findItemById(groups: SyncGridGroup[], id: string): SyncGridItem | undefined {
  for (const group of flattenGroups(groups)) {
    const found = group.items.find((item) => item.id === id)
    if (found) return found
  }
  return undefined
}

/** Chrome bookmark tree内のフォルダ情報 */
export interface ChromeFolder {
  id: string
  title: string
  path: string
  bookmarkCount: number
  children: chrome.bookmarks.BookmarkTreeNode[]
}

/**
 * Chromeブックマークツリーからインポート可能なフォルダ一覧を取得
 * __SyncGrid__ フォルダは除外
 */
export async function getImportableFolders(): Promise<ChromeFolder[]> {
  const tree = await chrome.bookmarks.getTree()
  const folders: ChromeFolder[] = []

  function countBookmarks(node: chrome.bookmarks.BookmarkTreeNode): number {
    if (node.url) return 1
    return (node.children ?? []).reduce((sum, c) => sum + countBookmarks(c), 0)
  }

  function traverse(node: chrome.bookmarks.BookmarkTreeNode, path: string) {
    if (node.title === SYNCGRID_ROOT) return
    if (!node.url && node.children) {
      // ルートノード(id=0)とその直下は表示しない（Bookmarks Bar等の中身を見せる）
      if (node.id !== '0' && node.id !== '1' && node.id !== '2') {
        folders.push({
          id: node.id,
          title: node.title,
          path,
          bookmarkCount: countBookmarks(node),
          children: node.children,
        })
      }
      for (const child of node.children) {
        if (!child.url) {
          const childPath = path ? `${path} / ${node.title}` : node.title
          traverse(child, childPath)
        }
      }
    }
  }

  for (const root of tree) {
    traverse(root, '')
  }

  return folders
}

/**
 * Chromeブックマークフォルダの内容をSyncGridにインポート（再帰コピー）
 */
export async function importChromeFolder(folderId: string, targetParentId: string): Promise<void> {
  const [folder] = await chrome.bookmarks.getSubTree(folderId)
  if (!folder.children) return

  const group = await createGroup(folder.title, targetParentId)

  for (const child of folder.children) {
    if (child.url) {
      await addBookmark(group.id, child.title, child.url)
    } else {
      await importChromeFolder(child.id, group.id)
    }
  }
}
