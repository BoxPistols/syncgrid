/**
 * ナビゲーション状態管理 — タブ切替、フォルダ遷移、パンくず
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import type { SyncGridGroup, SyncGridItem, SyncGridSettings } from '../types'
import { flattenGroups } from '../utils/bookmarks'

export function useNavigation(
  groups: SyncGridGroup[],
  settings: SyncGridSettings,
  loaded: boolean,
  updateSettings: (patch: Partial<SyncGridSettings>) => void,
) {
  const [path, setPath] = useState<string[]>([])

  const activeTabId = useMemo(() => {
    const stored = settings.activeTabId
    if (stored === '__all__') return '__all__'
    if (stored && groups.find((g) => g.id === stored)) return stored
    return groups[0]?.id || ''
  }, [settings.activeTabId, groups])

  const activeGroup = activeTabId === '__all__' ? null : (groups.find((g) => g.id === activeTabId) ?? groups[0])

  // ALLタブ用: 全ブックマークをフラット化
  const allItems = useMemo<SyncGridItem[] | null>(() => {
    if (activeTabId !== '__all__') return null
    const items: SyncGridItem[] = []
    for (const g of flattenGroups(groups)) {
      items.push(...g.items)
    }
    return items
  }, [activeTabId, groups])

  // Persist fallback
  useEffect(() => {
    if (loaded && groups.length > 0 && settings.activeTabId !== activeTabId && activeTabId !== '__all__') {
      updateSettings({ activeTabId, lastPath: [] })
    }
  }, [loaded, groups, settings.activeTabId, activeTabId, updateSettings])

  const currentFolder = useMemo(() => {
    if (!activeGroup) return null
    if (path.length === 0) return activeGroup
    let folder: SyncGridGroup | undefined = activeGroup
    for (const id of path) {
      folder = folder?.children.find((c) => c.id === id)
      if (!folder) break
    }
    return folder ?? activeGroup
  }, [activeGroup, path])

  const breadcrumb = useMemo(() => {
    if (!activeGroup) return []
    const crumbs: { id: string; title: string }[] = [{ id: '', title: activeGroup.title }]
    let folder: SyncGridGroup | undefined = activeGroup
    for (const id of path) {
      const next: SyncGridGroup | undefined = folder?.children.find((c) => c.id === id)
      if (!next) break
      crumbs.push({ id: next.id, title: next.title })
      folder = next
    }
    return crumbs
  }, [activeGroup, path])

  const handleSelectTab = useCallback(
    (id: string) => {
      setPath([])
      updateSettings({ activeTabId: id, lastPath: [] })
    },
    [updateSettings],
  )

  const handleOpenFolder = useCallback((group: SyncGridGroup) => {
    setPath((prev) => [...prev, group.id])
  }, [])

  const handleBreadcrumbClick = useCallback((index: number) => {
    setPath((prev) => prev.slice(0, index))
  }, [])

  const pageKey = activeTabId === '__all__' ? 'all' : `${activeTabId}/${path.join('/')}`

  return {
    path,
    setPath,
    activeTabId,
    activeGroup,
    allItems,
    currentFolder,
    breadcrumb,
    pageKey,
    handleSelectTab,
    handleOpenFolder,
    handleBreadcrumbClick,
  }
}
