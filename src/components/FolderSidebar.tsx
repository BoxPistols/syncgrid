import { memo, useState, useCallback } from 'react'
import { Icon } from './Icon'
import { countAll } from '../utils/bookmarks'
import type { SyncGridGroup } from '../types'
import type { Messages } from '../i18n'

interface Props {
  groups: SyncGridGroup[]
  activeTabId: string
  onSelectTab: (id: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
  t: Messages
  totalCount: number
  /** GitHub Token 設定済みのときのみ仮想フォルダを表示 */
  githubEnabled?: boolean
}

function getInitialExpanded(groups: SyncGridGroup[], activeTabId: string): Set<string> {
  const ids = new Set<string>()
  function walk(gs: SyncGridGroup[], targetId: string): boolean {
    for (const g of gs) {
      if (g.id === targetId) return true
      if (walk(g.children, targetId)) {
        ids.add(g.id)
        return true
      }
    }
    return false
  }
  walk(groups, activeTabId)
  return ids
}

interface FolderItemProps {
  group: SyncGridGroup
  activeTabId: string
  onSelectTab: (id: string) => void
  depth: number
  collapsed: boolean
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
}

const FolderItem = memo(function FolderItem({
  group,
  activeTabId,
  onSelectTab,
  depth,
  collapsed,
  expandedIds,
  onToggleExpand,
}: FolderItemProps) {
  const hasChildren = group.children.length > 0
  const isExpanded = expandedIds.has(group.id)
  const isActive = group.id === activeTabId
  const indent = depth > 0 ? depth * 12 : 0

  return (
    <>
      <div
        className={`sg-sidebar__item${isActive ? ' sg-sidebar__item--active' : ''}`}
        style={indent > 0 ? { paddingLeft: `${18 + indent}px` } : undefined}
      >
        <button
          className="sg-sidebar__item-main"
          onClick={() => onSelectTab(group.id)}
          title={group.title}
        >
          <Icon name="folder" size={15} />
          {!collapsed && (
            <span className="sg-sidebar__item-label">{group.title}</span>
          )}
        </button>
        {!collapsed && (
          hasChildren ? (
            <button
              className={`sg-sidebar__chevron-btn${isExpanded ? ' sg-sidebar__chevron-btn--open' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleExpand(group.id) }}
              aria-label={isExpanded ? '折りたたむ' : '展開'}
              title={isExpanded ? '折りたたむ' : '展開'}
            >
              <Icon name="chevron-right" size={12} />
            </button>
          ) : (
            <span className="sg-sidebar__badge">{countAll(group)}</span>
          )
        )}
      </div>

      {!collapsed && hasChildren && isExpanded && group.children.map((child) => (
        <FolderItem
          key={child.id}
          group={child}
          activeTabId={activeTabId}
          onSelectTab={onSelectTab}
          depth={depth + 1}
          collapsed={collapsed}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </>
  )
})

export const FolderSidebar = memo(function FolderSidebar({
  groups,
  activeTabId,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  t,
  totalCount,
  githubEnabled,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    getInitialExpanded(groups, activeTabId),
  )

  // activeTabId / groups が外部から変わったとき（例: 設定から復元、ロード完了）祖先を自動展開。
  // effect での setState を避け、レンダー中の状態調整パターンで行う
  const [prevNav, setPrevNav] = useState<{ tab: string; groups: SyncGridGroup[] }>({ tab: activeTabId, groups })
  if (prevNav.tab !== activeTabId || prevNav.groups !== groups) {
    setPrevNav({ tab: activeTabId, groups })
    const ancestors = getInitialExpanded(groups, activeTabId)
    if (ancestors.size > 0) {
      const merged = new Set(expandedIds)
      ancestors.forEach((id) => merged.add(id))
      if (merged.size !== expandedIds.size) setExpandedIds(merged)
    }
  }

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return (
    <nav className={`sg-sidebar${collapsed ? ' sg-sidebar--collapsed' : ''}`} aria-label="フォルダナビゲーション">
      <div className="sg-sidebar__logo">
        <Icon name="grid" size={18} />
        {!collapsed && <span>SyncGrid</span>}
      </div>

      <div
        className={`sg-sidebar__item${activeTabId === '__all__' ? ' sg-sidebar__item--active' : ''}`}
      >
        <button
          className="sg-sidebar__item-main"
          onClick={() => onSelectTab('__all__')}
          title={t.allBookmarks}
        >
          <Icon name="folder-open" size={15} />
          {!collapsed && <span className="sg-sidebar__item-label">{t.allBookmarks}</span>}
        </button>
        {!collapsed && <span className="sg-sidebar__badge">{totalCount}</span>}
      </div>

      {githubEnabled && (
        <div
          className={`sg-sidebar__item${activeTabId === '__github__' ? ' sg-sidebar__item--active' : ''}`}
        >
          <button
            className="sg-sidebar__item-main"
            onClick={() => onSelectTab('__github__')}
            title={t.githubFolder}
          >
            <Icon name="github" size={15} />
            {!collapsed && <span className="sg-sidebar__item-label">{t.githubFolder}</span>}
          </button>
        </div>
      )}

      {groups.map((g) => (
        <FolderItem
          key={g.id}
          group={g}
          activeTabId={activeTabId}
          onSelectTab={onSelectTab}
          depth={0}
          collapsed={collapsed}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
        />
      ))}

      <div className="sg-sidebar__toggle">
        <button
          className="sg-sidebar__item sg-sidebar__toggle-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
          title={collapsed ? 'サイドバーを展開' : 'サイドバーを折りたたむ'}
        >
          <Icon name="arrow-left" size={14} />
          {!collapsed && <span className="sg-sidebar__item-label">折りたたむ</span>}
        </button>
      </div>
    </nav>
  )
})
