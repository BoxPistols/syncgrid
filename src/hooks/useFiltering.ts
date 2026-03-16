/**
 * 検索・フィルタリング・ソート
 */
import { useState, useMemo, useCallback } from 'react'
import type { SyncGridItem, SyncGridGroup, SortMode, ReadStatus, BookmarkMeta } from '../types'
import { flattenGroups } from '../utils/bookmarks'
import { getDomain } from '../utils/favicon'

export function useFiltering(
  groups: SyncGridGroup[],
  currentFolder: SyncGridGroup | null,
  allMeta: Record<string, BookmarkMeta>,
  sort: SortMode,
) {
  const [query, setQuery] = useState('')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<ReadStatus | null>(null)

  const searchResults = useMemo(() => {
    if (!query.trim()) return null
    const q = query.toLowerCase()
    const all = flattenGroups(groups)
    const results: SyncGridItem[] = []
    for (const g of all) {
      for (const item of g.items) {
        if (item.title.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)) results.push(item)
      }
    }
    return results
  }, [query, groups])

  const allTagsInFolder = useMemo(() => {
    if (!currentFolder) return []
    const tagSet = new Set<string>()
    for (const item of currentFolder.items) {
      const meta = allMeta[item.id]
      if (meta?.tags) meta.tags.forEach((t) => tagSet.add(t))
    }
    return [...tagSet].sort()
  }, [currentFolder, allMeta])

  const filterItems = useCallback(
    (items: SyncGridItem[]): SyncGridItem[] => {
      let result = items
      if (filterTag) {
        result = result.filter((item) => allMeta[item.id]?.tags?.includes(filterTag))
      }
      if (filterStatus) {
        result = result.filter((item) => (allMeta[item.id]?.status ?? 'unread') === filterStatus)
      }
      return result
    },
    [filterTag, filterStatus, allMeta],
  )

  const sortItems = useCallback(
    (items: SyncGridItem[]): SyncGridItem[] => {
      if (sort === 'manual') return items
      const sorted = [...items]
      switch (sort) {
        case 'name-asc':
          return sorted.sort((a, b) => a.title.localeCompare(b.title))
        case 'name-desc':
          return sorted.sort((a, b) => b.title.localeCompare(a.title))
        case 'date-new':
          return sorted.sort((a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0))
        case 'date-old':
          return sorted.sort((a, b) => (a.dateAdded ?? 0) - (b.dateAdded ?? 0))
        case 'domain':
          return sorted.sort((a, b) => getDomain(a.url).localeCompare(getDomain(b.url)))
        case 'last-read':
          return sorted.sort((a, b) => (allMeta[b.id]?.lastReadAt ?? 0) - (allMeta[a.id]?.lastReadAt ?? 0))
        default:
          return items
      }
    },
    [sort, allMeta],
  )

  /** フィルタ+ソートを適用した結果（useMemo） */
  const applyFiltersAndSort = useCallback(
    (items: SyncGridItem[]) => sortItems(filterItems(items)),
    [sortItems, filterItems],
  )

  return {
    query,
    setQuery,
    searchResults,
    filterTag,
    setFilterTag,
    filterStatus,
    setFilterStatus,
    allTagsInFolder,
    filterItems,
    sortItems,
    applyFiltersAndSort,
  }
}
