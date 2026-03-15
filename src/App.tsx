import { useState, useCallback, useMemo, useEffect } from 'react'
import { useBookmarks } from './hooks/useBookmarks'
import { useSettings } from './hooks/useSettings'
import { useTheme } from './hooks/useTheme'
import { useI18n } from './hooks/useI18n'
import { useAutoSync } from './hooks/useAutoSync'
import { useDragReorder } from './hooks/useDragReorder'
import { TopBar } from './components/TopBar'
import { BookmarkCard } from './components/BookmarkCard'
import { FolderCard } from './components/FolderCard'
import { EditBookmarkModal } from './components/EditBookmarkModal'
import { ContextMenu, type MenuItem } from './components/ContextMenu'
import { AddBookmarkForm } from './components/AddBookmarkForm'
import { SettingsPanel } from './components/SettingsPanel'
import { ConfirmDialog } from './components/ConfirmDialog'
import { Icon } from './components/Icon'
import {
  addBookmark,
  removeBookmark,
  updateBookmark,
  createGroup,
  renameGroup,
  deleteGroup,
  getRootId,
  flattenGroups,
  countAll,
} from './utils/bookmarks'
import type { SyncGridItem, SyncGridGroup, LayoutMode, SortMode, BookmarkMeta } from './types'
import { isComposing, matchesBinding } from './utils/keyboard'
import { getDomain } from './utils/favicon'
import { loadAllMeta, saveMeta } from './utils/storage'

import './styles/global.css'

export default function App() {
  const { groups, loading, refresh } = useBookmarks()
  const { settings, updateSettings, loaded } = useSettings()
  useTheme(settings.theme)
  const t = useI18n(settings.locale)

  // --- Auto Sync ---
  const handleSynced = useCallback(
    (syncedAt: string) => {
      updateSettings({ lastSyncedAt: syncedAt })
    },
    [updateSettings],
  )
  useAutoSync(groups, handleSynced)

  // --- Metadata (tags, ogp cache) ---
  const [allMeta, setAllMeta] = useState<Record<string, BookmarkMeta>>({})

  useEffect(() => {
    loadAllMeta().then(setAllMeta)
  }, [groups])

  // --- Navigation State ---
  const [path, setPath] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [editItem, setEditItem] = useState<SyncGridItem | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState<'tab' | 'subfolder' | false>(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [ctxMenu, setCtxMenu] = useState<{
    x: number
    y: number
    items: MenuItem[]
  } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string
    onConfirm: () => void
    confirmLabel?: string
  } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterTag, setFilterTag] = useState<string | null>(null)

  // --- Active Tab (computed — stale ID falls back to first group) ---
  const activeTabId = useMemo(() => {
    const stored = settings.activeTabId
    if (stored && groups.find((g) => g.id === stored)) return stored
    return groups[0]?.id || ''
  }, [settings.activeTabId, groups])

  const activeGroup = groups.find((g) => g.id === activeTabId) ?? groups[0]

  // Persist fallback to storage so it stays consistent
  useEffect(() => {
    if (loaded && groups.length > 0 && settings.activeTabId !== activeTabId) {
      updateSettings({ activeTabId, lastPath: [] })
    }
  }, [loaded, groups, settings.activeTabId, activeTabId, updateSettings])

  // --- Current folder ---
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

  // --- Drag & Drop ---
  const { dragState, getDragHandlers, getTabHandlers, getBreadcrumbDropHandlers } = useDragReorder(currentFolder)

  // --- Breadcrumb ---
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

  // --- Search ---
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

  // --- Selection handlers ---
  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl+Click → トグル選択
      e.preventDefault()
      e.stopPropagation()
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      return true
    }
    return false
  }, [])

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return
    setConfirmDialog({
      message: t.selected(selectedIds.size),
      confirmLabel: t.delete,
      onConfirm: async () => {
        setConfirmDialog(null)
        for (const id of selectedIds) {
          try {
            await removeBookmark(id)
          } catch {
            try {
              await deleteGroup(id)
            } catch { /* skip */ }
          }
        }
        setSelectedIds(new Set())
        refresh()
      },
    })
  }, [selectedIds, refresh, t])

  // --- Global keyboard shortcuts (設定ベース) ---
  useEffect(() => {
    const sc = settings.shortcuts
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isComposing(e)) return

      if (matchesBinding(e, sc.search)) {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('.sg-topbar__search-input')?.focus()
      } else if (matchesBinding(e, sc.addBookmark)) {
        e.preventDefault()
        setShowAddForm(true)
      } else if (matchesBinding(e, sc.layoutCard)) {
        e.preventDefault()
        updateSettings({ layout: 'card' })
      } else if (matchesBinding(e, sc.layoutList)) {
        e.preventDefault()
        updateSettings({ layout: 'list' })
      } else if (matchesBinding(e, sc.layoutCompact)) {
        e.preventDefault()
        updateSettings({ layout: 'compact' })
      } else if (matchesBinding(e, sc.deleteSelected)) {
        if (selectedIds.size > 0) {
          e.preventDefault()
          handleDeleteSelected()
        }
      } else if (matchesBinding(e, sc.selectAll)) {
        if (currentFolder) {
          e.preventDefault()
          const allIds = new Set([
            ...currentFolder.items.map((i) => i.id),
            ...currentFolder.children.map((c) => c.id),
          ])
          setSelectedIds(allIds)
        }
      } else if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set())
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [settings.shortcuts, selectedIds, handleDeleteSelected, updateSettings, currentFolder])

  // --- Page transition key ---
  const pageKey = searchResults ? 'search' : `${activeTabId}/${path.join('/')}`

  // --- Tag filter ---
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
      if (!filterTag) return items
      return items.filter((item) => allMeta[item.id]?.tags?.includes(filterTag))
    },
    [filterTag, allMeta],
  )

  // --- Layout class ---
  const gridClass = [
    'sg-dial__grid',
    settings.layout !== 'card' && `sg-dial__grid--${settings.layout}`,
    settings.layout === 'card' && settings.cardSize !== 'md' && `sg-dial__grid--size-${settings.cardSize}`,
  ]
    .filter(Boolean)
    .join(' ')

  // --- Sort ---
  const sortItems = useCallback(
    (items: SyncGridItem[]): SyncGridItem[] => {
      if (settings.sort === 'manual') return items
      const sorted = [...items]
      switch (settings.sort) {
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
        default:
          return items
      }
    },
    [settings.sort],
  )

  const handleChangeSort = useCallback(
    (sort: SortMode) => {
      updateSettings({ sort })
    },
    [updateSettings],
  )

  // --- Handlers ---
  const handleSelectTab = useCallback(
    (id: string) => {
      setPath([])
      setSelectedIds(new Set())
      updateSettings({ activeTabId: id, lastPath: [] })
      setQuery('')
    },
    [updateSettings],
  )

  const handleOpenFolder = useCallback((group: SyncGridGroup) => {
    setPath((prev) => [...prev, group.id])
    setSelectedIds(new Set())
  }, [])

  const handleBreadcrumbClick = useCallback((index: number) => {
    setPath((prev) => prev.slice(0, index))
  }, [])

  const handleChangeLayout = useCallback(
    (layout: LayoutMode) => {
      updateSettings({ layout })
    },
    [updateSettings],
  )

  const handleToggleTheme = useCallback(() => {
    updateSettings((prev) => ({
      theme: prev.theme === 'dark' ? 'light' : prev.theme === 'light' ? 'dark' : 'dark',
    }))
  }, [updateSettings])

  const handleAddGroup = useCallback(() => {
    setCreatingGroup('tab')
    setNewGroupName('')
  }, [])

  // タブバー「＋」→ 常にSyncGridルート直下にグループ（タブ）作成
  const handleCreateGroup = useCallback(async () => {
    const name = newGroupName.trim()
    if (!name) {
      setCreatingGroup(false)
      return
    }
    const rootId = await getRootId()
    await createGroup(name, rootId)
    setCreatingGroup(false)
    setNewGroupName('')
    await refresh()
  }, [newGroupName, refresh])

  // ツールバー「新規フォルダ」→ 現在のフォルダ内にサブフォルダ作成
  const handleCreateSubfolder = useCallback(async () => {
    const name = newGroupName.trim()
    if (!name) {
      setCreatingGroup(false)
      return
    }
    const parentId = currentFolder?.id || (await getRootId())
    await createGroup(name, parentId)
    setCreatingGroup(false)
    setNewGroupName('')
    await refresh()
  }, [newGroupName, currentFolder, refresh])

  const handleAddBookmark = useCallback(
    async (url: string, title: string) => {
      if (!currentFolder) return
      await addBookmark(currentFolder.id, title, url)
      setShowAddForm(false)
      await refresh()
    },
    [currentFolder, refresh],
  )

  const handleSaveBookmark = useCallback(
    async (id: string, title: string, url: string, tags: string[]) => {
      await updateBookmark(id, { title, url })
      const existingMeta = allMeta[id]
      await saveMeta(id, { memo: existingMeta?.memo ?? '', tags, ogp: existingMeta?.ogp })
      setEditItem(null)
      await refresh()
    },
    [refresh, allMeta],
  )

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      await removeBookmark(id)
      setEditItem(null)
      await refresh()
    },
    [refresh],
  )

  const handleBookmarkContext = useCallback(
    (item: SyncGridItem, x: number, y: number) => {
      setCtxMenu({
        x,
        y,
        items: [
          { label: t.openNewTab, icon: 'link', action: () => window.open(item.url, '_blank') },
          { label: t.edit, icon: 'edit', action: () => setEditItem(item) },
          { label: '---', action: () => {} },
          {
            label: t.delete,
            icon: 'trash',
            danger: true,
            action: async () => {
              await removeBookmark(item.id)
              refresh()
            },
          },
        ],
      })
    },
    [refresh, t],
  )

  const handleFolderContext = useCallback(
    (group: SyncGridGroup, x: number, y: number) => {
      setCtxMenu({
        x,
        y,
        items: [
          { label: t.open, icon: 'folder-open', action: () => handleOpenFolder(group) },
          {
            label: t.rename,
            icon: 'edit',
            action: () => {
              setRenamingTabId(group.id)
              setRenameValue(group.title)
            },
          },
          { label: '---', action: () => {} },
          {
            label: t.delete,
            icon: 'trash',
            danger: true,
            action: () => {
              setConfirmDialog({
                message: t.confirmDeleteFolder(group.title),
                confirmLabel: t.delete,
                onConfirm: async () => {
                  setConfirmDialog(null)
                  await deleteGroup(group.id)
                  setPath((prev) => {
                    const idx = prev.indexOf(group.id)
                    return idx >= 0 ? prev.slice(0, idx) : prev
                  })
                  refresh()
                },
              })
            },
          },
        ],
      })
    },
    [refresh, handleOpenFolder, t],
  )

  const handleRenameSubmit = useCallback(async () => {
    if (!renamingTabId) return
    const name = renameValue.trim()
    if (name) await renameGroup(renamingTabId, name)
    setRenamingTabId(null)
    setRenameValue('')
    await refresh()
  }, [renamingTabId, renameValue, refresh])

  const handleTabContext = useCallback(
    (group: SyncGridGroup, e: React.MouseEvent) => {
      e.preventDefault()
      setCtxMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            label: t.rename,
            icon: 'edit',
            action: () => {
              setRenamingTabId(group.id)
              setRenameValue(group.title)
            },
          },
          { label: '---', action: () => {} },
          {
            label: t.delete,
            icon: 'trash',
            danger: true,
            action: () => {
              setConfirmDialog({
                message: t.confirmDeleteTab(group.title),
                confirmLabel: t.delete,
                onConfirm: async () => {
                  setConfirmDialog(null)
                  await deleteGroup(group.id)
                  if (activeTabId === group.id) {
                    const rem = groups.filter((g) => g.id !== group.id)
                    if (rem.length > 0) updateSettings({ activeTabId: rem[0].id })
                  }
                  refresh()
                },
              })
            },
          },
        ],
      })
    },
    [groups, activeTabId, updateSettings, refresh, t],
  )

  // --- Render ---
  if (loading || !loaded) return <div className="sg-loading">{t.loading}</div>

  return (
    <>
      <TopBar
        query={query}
        onQueryChange={setQuery}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setShowSettings(true)}
        layout={settings.layout}
        cardSize={settings.cardSize}
        onChangeLayout={handleChangeLayout}
        onChangeCardSize={(size) => updateSettings({ cardSize: size })}
        t={t}
      />

      {/* Tab Bar */}
      <div className="sg-tabbar" role="tablist">
        {groups.map((g) => (
          <button
            key={g.id}
            className={`sg-tab ${g.id === activeTabId ? 'sg-tab--active' : ''} ${dragState.dropTabId === g.id && dragState.draggingId !== g.id ? 'sg-tab--drop-target' : ''} ${dragState.draggingId === g.id ? 'sg-tab--dragging' : ''}`}
            role="tab"
            aria-selected={g.id === activeTabId}
            onClick={() => handleSelectTab(g.id)}
            onContextMenu={(e) => handleTabContext(g, e)}
            onDoubleClick={() => {
              setRenamingTabId(g.id)
              setRenameValue(g.title)
            }}
            {...getTabHandlers(g.id)}
          >
            {renamingTabId === g.id ? (
              <input
                className="sg-tab__rename"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit()
                  if (e.key === 'Escape') setRenamingTabId(null)
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                {g.title}
                <span className="sg-tab__count">{countAll(g)}</span>
              </>
            )}
          </button>
        ))}
        {creatingGroup === 'tab' ? (
          <div className="sg-tab sg-tab--creating">
            <input
              className="sg-tab__rename"
              placeholder={t.groupNamePlaceholder}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onBlur={handleCreateGroup}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateGroup()
                if (e.key === 'Escape') setCreatingGroup(false)
              }}
              autoFocus
            />
          </div>
        ) : (
          <button className="sg-tab sg-tab--add" onClick={handleAddGroup} title={t.newGroup} aria-label={t.newGroup}>
            <Icon name="plus" size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="sg-selection-bar">
          <span>{t.selected(selectedIds.size)}</span>
          <button className="sg-btn sg-btn--sm sg-btn--danger" onClick={handleDeleteSelected}>
            {t.deleteSelected}
          </button>
          <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={() => setSelectedIds(new Set())}>
            {t.clearSelection}
          </button>
        </div>
      )}

      <div key={pageKey} className="sg-page-transition">
        {searchResults ? (
          <div className="sg-dial">
            <div className="sg-toolbar">
              <span className="sg-toolbar__title">{t.searchResults(query, searchResults.length)}</span>
            </div>
            {searchResults.length > 0 ? (
              <div className={gridClass}>
                {searchResults.map((item) => (
                  <BookmarkCard key={item.id} item={item} onContextMenu={handleBookmarkContext} t={t} locale={settings.locale} />
                ))}
              </div>
            ) : (
              <div className="sg-empty">
                <div className="sg-empty__icon"><Icon name="search" size={48} /></div>
                <p className="sg-empty__text">{t.noSearchResults}</p>
              </div>
            )}
          </div>
        ) : groups.length === 0 ? (
          <div className="sg-empty">
            <div className="sg-empty__icon"><Icon name="folder" size={48} /></div>
            <p className="sg-empty__text sg-preline">{t.noGroups}</p>
          </div>
        ) : currentFolder ? (
          <div className="sg-dial">
            {path.length > 0 && (
              <nav className="sg-breadcrumb" aria-label="breadcrumb">
                {breadcrumb.map((crumb, i) => {
                  const crumbParentId = i === 0 ? activeGroup?.id : breadcrumb[i]?.id
                  return (
                    <span key={crumb.id || 'root'}>
                      {i > 0 && <span className="sg-breadcrumb__sep"> › </span>}
                      {i < breadcrumb.length - 1 && crumbParentId ? (
                        <button
                          className={`sg-breadcrumb__item ${dragState.dropBreadcrumbId === crumbParentId ? 'sg-breadcrumb__item--drop-target' : ''}`}
                          onClick={() => handleBreadcrumbClick(i)}
                          {...getBreadcrumbDropHandlers(crumbParentId)}
                        >
                          {crumb.title}
                        </button>
                      ) : (
                        <span className="sg-breadcrumb__current" aria-current="page">
                          {crumb.title}
                        </span>
                      )}
                    </span>
                  )
                })}
              </nav>
            )}

            <div className="sg-toolbar">
              {path.length > 0 &&
                (() => {
                  const parentId = path.length >= 2 ? path[path.length - 2] : activeGroup?.id
                  return parentId ? (
                    <button
                      className={`sg-btn--icon ${dragState.dropBreadcrumbId === parentId ? 'sg-breadcrumb__item--drop-target' : ''}`}
                      onClick={() => setPath((p) => p.slice(0, -1))}
                      title={t.back}
                      aria-label={t.back}
                      {...getBreadcrumbDropHandlers(parentId)}
                    >
                      <Icon name="arrow-left" size={14} />
                    </button>
                  ) : (
                    <button
                      className="sg-btn--icon"
                      onClick={() => setPath((p) => p.slice(0, -1))}
                      title={t.back}
                      aria-label={t.back}
                    >
                      <Icon name="arrow-left" size={14} />
                    </button>
                  )
                })()}
              <span className="sg-toolbar__title">{path.length === 0 ? '' : currentFolder.title}</span>
              <div className="sg-sort">
                <select
                  className="sg-sort__select"
                  value={settings.sort}
                  onChange={(e) => handleChangeSort(e.target.value as SortMode)}
                  aria-label={t.sort}
                >
                  <option value="manual">{t.sortManual}</option>
                  <option value="name-asc">{t.sortNameAsc}</option>
                  <option value="name-desc">{t.sortNameDesc}</option>
                  <option value="date-new">{t.sortDateNew}</option>
                  <option value="date-old">{t.sortDateOld}</option>
                  <option value="domain">{t.sortDomain}</option>
                </select>
              </div>
              {allTagsInFolder.length > 0 && (
                <div className="sg-tags">
                  <button
                    className={`sg-tag ${!filterTag ? 'sg-tag--active' : ''}`}
                    onClick={() => setFilterTag(null)}
                  >
                    {t.allTags}
                  </button>
                  {allTagsInFolder.map((tag) => (
                    <button
                      key={tag}
                      className={`sg-tag ${filterTag === tag ? 'sg-tag--active' : ''}`}
                      onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={() => setShowAddForm(!showAddForm)}>
                {showAddForm ? t.cancel : t.addBookmark('Ctrl')}
              </button>
              <button
                className="sg-btn sg-btn--sm sg-btn--ghost"
                onClick={() => {
                  setCreatingGroup('subfolder')
                  setNewGroupName('')
                }}
              >
                {t.newFolder}
              </button>
            </div>

            {showAddForm && (
              <div className="sg-add-form-wrapper">
                <AddBookmarkForm
                  onAdd={handleAddBookmark}
                  onCancel={() => setShowAddForm(false)}
                  t={t}
                  aiSettings={settings.ai}
                />
              </div>
            )}

            {creatingGroup === 'subfolder' && (
              <div className="sg-add-form-wrapper">
                <div className="sg-add-form">
                  <input
                    className="sg-add-form__input"
                    placeholder={t.groupNamePlaceholder}
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onBlur={handleCreateSubfolder}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSubfolder()
                      if (e.key === 'Escape') setCreatingGroup(false)
                    }}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {currentFolder.children.length === 0 && currentFolder.items.length === 0 ? (
              <div className="sg-empty">
                <div className="sg-empty__icon"><Icon name="pin" size={48} /></div>
                <p className="sg-empty__text sg-preline">{t.emptyFolder}</p>
              </div>
            ) : (
              <div className={gridClass}>
                {currentFolder.children.map((child) => (
                  <FolderCard
                    key={child.id}
                    group={child}
                    onClick={handleOpenFolder}
                    onContextMenu={handleFolderContext}
                    t={t}
                    dragHandlers={getDragHandlers(child.id, 'folder')}
                    isDragging={dragState.draggingId === child.id}
                    isDropTarget={dragState.dropTargetId === child.id}
                    dropMode={dragState.dropTargetId === child.id ? dragState.dropMode : null}
                    isSelected={selectedIds.has(child.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
                {sortItems(filterItems(currentFolder.items)).map((item) => (
                  <BookmarkCard
                    key={item.id}
                    item={item}
                    onContextMenu={handleBookmarkContext}
                    dragHandlers={getDragHandlers(item.id, 'bookmark')}
                    isDragging={dragState.draggingId === item.id}
                    isDropTarget={dragState.dropTargetId === item.id}
                    dropMode={
                      dragState.dropTargetId === item.id && dragState.dropMode !== 'into' ? dragState.dropMode : null
                    }
                    t={t}
                    locale={settings.locale}
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={toggleSelect}
                    tags={allMeta[item.id]?.tags}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {editItem && (
        <EditBookmarkModal
          item={editItem}
          onSave={handleSaveBookmark}
          onDelete={handleDeleteBookmark}
          onClose={() => setEditItem(null)}
          t={t}
          initialTags={allMeta[editItem.id]?.tags}
          aiSettings={settings.ai}
        />
      )}
      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          groups={groups}
          t={t}
          onUpdateSettings={updateSettings}
          onClose={() => setShowSettings(false)}
          onRefresh={refresh}
        />
      )}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          confirmLabel={confirmDialog.confirmLabel}
          t={t}
        />
      )}
    </>
  )
}
