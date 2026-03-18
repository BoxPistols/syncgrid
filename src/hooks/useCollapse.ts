/**
 * フォルダセクションの展開/折りたたみ状態管理
 * デフォルトは全展開。折りたたみ状態を chrome.storage.local に永続化
 */
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'syncgrid_collapsed'

export function useCollapse() {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY).then((result) => {
      const ids: string[] = (result[STORAGE_KEY] as string[]) ?? []
      if (ids.length > 0) setCollapsedIds(new Set(ids))
    })
  }, [])

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      chrome.storage.local.set({ [STORAGE_KEY]: [...next] })
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set())
    chrome.storage.local.set({ [STORAGE_KEY]: [] })
  }, [])

  const collapseAll = useCallback((allFolderIds: string[]) => {
    const set = new Set(allFolderIds)
    setCollapsedIds(set)
    chrome.storage.local.set({ [STORAGE_KEY]: allFolderIds })
  }, [])

  return { collapsedIds, toggleCollapse, expandAll, collapseAll }
}
