/**
 * ナビゲーション状態管理 — タブ切替 + サブフォルダドリルダウン
 */
import { useMemo, useEffect, useCallback } from 'react'
import type { SyncGridGroup, SyncGridItem, SyncGridSettings } from '../types'
import { flattenGroups, findGroupById } from '../utils/bookmarks'

/** groups ツリーをたどり targetId へのパスを返す（見つからなければ []） */
function buildPath(groups: SyncGridGroup[], targetId: string): SyncGridGroup[] {
  for (const g of groups) {
    if (g.id === targetId) return [g]
    const sub = buildPath(g.children, targetId)
    if (sub.length > 0) return [g, ...sub]
  }
  return []
}

export function useNavigation(
  groups: SyncGridGroup[],
  settings: SyncGridSettings,
  loaded: boolean,
  updateSettings: (patch: Partial<SyncGridSettings>) => void,
) {
  const activeTabId = useMemo(() => {
    const stored = settings.activeTabId
    if (stored === '__all__' || stored === '__kanban__' || stored === '__github__') return stored
    // トップレベル or サブフォルダどちらでも有効
    if (stored && findGroupById(groups, stored)) return stored
    return groups[0]?.id || ''
  }, [settings.activeTabId, groups])

  // 現在のフォルダ（全深さで検索）
  const currentFolder = useMemo<SyncGridGroup | null>(() => {
    if (activeTabId === '__all__' || activeTabId === '__kanban__' || activeTabId === '__github__') return null
    return findGroupById(groups, activeTabId) ?? groups[0] ?? null
  }, [activeTabId, groups])

  // ルートから現在フォルダまでのパス（ブレッドクラム用）
  const breadcrumb = useMemo<SyncGridGroup[]>(() => {
    if (!activeTabId || activeTabId === '__all__' || activeTabId === '__kanban__' || activeTabId === '__github__') return []
    return buildPath(groups, activeTabId)
  }, [activeTabId, groups])

  // ALLタブ用: 全ブックマークをフラット化
  const allItems = useMemo<SyncGridItem[] | null>(() => {
    if (activeTabId !== '__all__') return null
    const items: SyncGridItem[] = []
    for (const g of flattenGroups(groups)) {
      items.push(...g.items)
    }
    return items
  }, [activeTabId, groups])

  // Persist fallback（サブフォルダIDも有効として保存）
  useEffect(() => {
    if (
      loaded &&
      groups.length > 0 &&
      settings.activeTabId !== activeTabId &&
      activeTabId !== '__all__' &&
      activeTabId !== '__kanban__' &&
      activeTabId !== '__github__'
    ) {
      updateSettings({ activeTabId })
    }
  }, [loaded, groups, settings.activeTabId, activeTabId, updateSettings])

  const handleSelectTab = useCallback(
    (id: string) => {
      updateSettings({ activeTabId: id })
    },
    [updateSettings],
  )

  // 親フォルダへ（ブレッドクラムの1つ手前）
  const handleNavigateUp = useCallback(() => {
    if (breadcrumb.length <= 1) return
    const parent = breadcrumb[breadcrumb.length - 2]
    updateSettings({ activeTabId: parent.id })
  }, [breadcrumb, updateSettings])

  const pageKey = activeTabId

  return {
    activeTabId,
    activeGroup: currentFolder,
    allItems,
    currentFolder,
    breadcrumb,
    handleSelectTab,
    handleNavigateUp,
    pageKey,
  }
}
