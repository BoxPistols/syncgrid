/**
 * ナビゲーション状態管理 — タブ切替
 * フォルダはアコーディオンセクションでインライン表示するため、ドリルダウン不要
 */
import { useMemo, useEffect, useCallback } from 'react'
import type { SyncGridGroup, SyncGridItem, SyncGridSettings } from '../types'
import { flattenGroups } from '../utils/bookmarks'

export function useNavigation(
  groups: SyncGridGroup[],
  settings: SyncGridSettings,
  loaded: boolean,
  updateSettings: (patch: Partial<SyncGridSettings>) => void,
) {
  const activeTabId = useMemo(() => {
    const stored = settings.activeTabId
    if (stored === '__all__' || stored === '__kanban__') return stored
    if (stored && groups.find((g) => g.id === stored)) return stored
    return groups[0]?.id || ''
  }, [settings.activeTabId, groups])

  const activeGroup = activeTabId === '__all__' || activeTabId === '__kanban__' ? null : (groups.find((g) => g.id === activeTabId) ?? groups[0])

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
    if (loaded && groups.length > 0 && settings.activeTabId !== activeTabId && activeTabId !== '__all__' && activeTabId !== '__kanban__') {
      updateSettings({ activeTabId })
    }
  }, [loaded, groups, settings.activeTabId, activeTabId, updateSettings])

  const handleSelectTab = useCallback(
    (id: string) => {
      updateSettings({ activeTabId: id })
    },
    [updateSettings],
  )

  const pageKey = activeTabId

  return {
    activeTabId,
    activeGroup,
    allItems,
    currentFolder: activeGroup,
    pageKey,
    handleSelectTab,
  }
}
