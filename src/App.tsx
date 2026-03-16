import { useState, useCallback, useEffect } from 'react'
import { useBookmarks } from './hooks/useBookmarks'
import { useSettings } from './hooks/useSettings'
import { useTheme } from './hooks/useTheme'
import { useI18n } from './hooks/useI18n'
import { useAutoSync } from './hooks/useAutoSync'
import { useNavigation } from './hooks/useNavigation'
import { useSelection } from './hooks/useSelection'
import { useFiltering } from './hooks/useFiltering'
import { useMetadata } from './hooks/useMetadata'
import { useDragReorder } from './hooks/useDragReorder'
import { TopBar } from './components/TopBar'
import { BookmarkCard } from './components/BookmarkCard'
import { FolderCard } from './components/FolderCard'
import { EditBookmarkModal } from './components/EditBookmarkModal'
import { ContextMenu, type MenuItem } from './components/ContextMenu'
import { AddBookmarkForm } from './components/AddBookmarkForm'
import { SettingsPanel } from './components/SettingsPanel'
import { ConfirmDialog } from './components/ConfirmDialog'
import { TrashPanel } from './components/TrashPanel'
import { Icon } from './components/Icon'
import { OnboardingTour } from './components/OnboardingTour'
import { ShortcutCheatSheet } from './components/ShortcutCheatSheet'
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
import type { SyncGridItem, SyncGridGroup, LayoutMode, SortMode } from './types'
import { isComposing, matchesBinding } from './utils/keyboard'

import './styles/global.css'

export default function App() {
  const { groups, loading, refresh } = useBookmarks()
  const { settings, updateSettings, loaded } = useSettings()
  useTheme(settings.theme)
  const t = useI18n(settings.locale)

  // --- Extracted hooks ---
  const { allMeta, handleSetStatus, handleSaveMeta } = useMetadata(groups)
  const nav = useNavigation(groups, settings, loaded, updateSettings)
  const { query, setQuery, searchResults, filterTag, setFilterTag, filterStatus, setFilterStatus, allTagsInFolder, applyFiltersAndSort } =
    useFiltering(groups, nav.currentFolder, allMeta, settings.sort)

  // --- Auto Sync ---
  const handleSynced = useCallback(
    (syncedAt: string) => updateSettings({ lastSyncedAt: syncedAt }),
    [updateSettings],
  )
  useAutoSync(groups, handleSynced)

  // --- UI State ---
  const [editItem, setEditItem] = useState<SyncGridItem | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState<'tab' | 'subfolder' | false>(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string
    onConfirm: () => void
    confirmLabel?: string
  } | null>(null)
  const [showTrash, setShowTrash] = useState(false)
  const [showCheatSheet, setShowCheatSheet] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  // --- Selection ---
  const { selectedIds, toggleSelect, clearSelection, handleDeleteSelected, handleMoveSelected, selectAll } =
    useSelection(nav.currentFolder, refresh, t, setConfirmDialog)

  // --- Drag & Drop ---
  const { dragState, getDragHandlers, getTabHandlers, getBreadcrumbDropHandlers } = useDragReorder(
    nav.currentFolder,
    selectedIds,
  )

  // Tab/Folder切替時に選択解除をラップ
  const handleSelectTab = useCallback(
    (id: string) => {
      clearSelection()
      setQuery('')
      nav.handleSelectTab(id)
    },
    [clearSelection, setQuery, nav],
  )

  const handleOpenFolder = useCallback(
    (group: SyncGridGroup) => {
      clearSelection()
      nav.handleOpenFolder(group)
    },
    [clearSelection, nav],
  )

  // --- Onboarding ---
  useEffect(() => {
    chrome.storage.local.get('syncgrid_onboarded').then((r) => {
      if (!r.syncgrid_onboarded) setShowWelcome(true)
    })
  }, [])

  const handleCompleteTour = useCallback(() => {
    setShowTour(false)
    chrome.storage.local.set({ syncgrid_onboarded: true })
  }, [])

  const handleStartTour = useCallback(() => {
    setShowWelcome(false)
    chrome.storage.local.set({ syncgrid_onboarded: true })
    setShowTour(true)
  }, [])

  const handleSkipWelcome = useCallback(() => {
    setShowWelcome(false)
    chrome.storage.local.set({ syncgrid_onboarded: true })
  }, [])

  // --- Layout ---
  const gridClass = [
    'sg-dial__grid',
    settings.layout !== 'card' && `sg-dial__grid--${settings.layout}`,
    settings.layout === 'card' && settings.cardSize !== 'md' && `sg-dial__grid--size-${settings.cardSize}`,
  ]
    .filter(Boolean)
    .join(' ')

  const handleChangeLayout = useCallback(
    (layout: LayoutMode) => updateSettings({ layout }),
    [updateSettings],
  )

  const handleChangeSort = useCallback(
    (sort: SortMode) => updateSettings({ sort }),
    [updateSettings],
  )

  const handleToggleTheme = useCallback(
    () => updateSettings((prev) => ({ theme: prev.theme === 'dark' ? 'light' : prev.theme === 'light' ? 'dark' : 'dark' })),
    [updateSettings],
  )

  // --- Group/Folder CRUD ---
  const handleAddGroup = useCallback(() => { setCreatingGroup('tab'); setNewGroupName('') }, [])

  const handleCreateGroup = useCallback(async () => {
    const name = newGroupName.trim()
    if (!name) { setCreatingGroup(false); return }
    await createGroup(name, await getRootId())
    setCreatingGroup(false)
    setNewGroupName('')
    await refresh()
  }, [newGroupName, refresh])

  const handleCreateSubfolder = useCallback(async () => {
    const name = newGroupName.trim()
    if (!name) { setCreatingGroup(false); return }
    await createGroup(name, nav.currentFolder?.id || (await getRootId()))
    setCreatingGroup(false)
    setNewGroupName('')
    await refresh()
  }, [newGroupName, nav.currentFolder, refresh])

  const handleAddBookmark = useCallback(
    async (url: string, title: string) => {
      if (!nav.currentFolder) return
      await addBookmark(nav.currentFolder.id, title, url)
      setShowAddForm(false)
      await refresh()
    },
    [nav.currentFolder, refresh],
  )

  const handleSaveBookmark = useCallback(
    async (id: string, title: string, url: string, tags: string[]) => {
      await updateBookmark(id, { title, url })
      await handleSaveMeta(id, tags)
      setEditItem(null)
      await refresh()
    },
    [refresh, handleSaveMeta],
  )

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      await removeBookmark(id)
      setEditItem(null)
      await refresh()
    },
    [refresh],
  )

  const handleFolderRename = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim()
      if (trimmed) await renameGroup(id, trimmed)
      setRenamingFolderId(null)
      await refresh()
    },
    [refresh],
  )

  const handleRenameSubmit = useCallback(async () => {
    if (!renamingTabId) return
    const name = renameValue.trim()
    if (name) await renameGroup(renamingTabId, name)
    setRenamingTabId(null)
    setRenameValue('')
    await refresh()
  }, [renamingTabId, renameValue, refresh])

  // --- Context menus ---
  const handleBookmarkContext = useCallback(
    (item: SyncGridItem, x: number, y: number) => {
      setCtxMenu({
        x, y,
        items: [
          { label: t.openNewTab, icon: 'link', action: () => { window.open(item.url, '_blank'); handleSetStatus(item.id, 'read') } },
          { label: t.edit, icon: 'edit', action: () => setEditItem(item) },
          { label: '---', action: () => {} },
          { label: t.statusUnread, icon: 'sparkle', action: () => handleSetStatus(item.id, 'unread') },
          { label: t.statusLater, icon: 'pin', action: () => handleSetStatus(item.id, 'later') },
          { label: t.statusStarred, icon: 'sparkle', action: () => handleSetStatus(item.id, 'starred') },
          { label: t.statusRead, icon: 'check-circle', action: () => handleSetStatus(item.id, 'read') },
          { label: '---', action: () => {} },
          { label: t.delete, icon: 'trash', danger: true, action: async () => { await removeBookmark(item.id); refresh() } },
        ],
      })
    },
    [refresh, t, handleSetStatus],
  )

  const handleFolderContext = useCallback(
    (group: SyncGridGroup, x: number, y: number) => {
      setCtxMenu({
        x, y,
        items: [
          { label: t.open, icon: 'folder-open', action: () => handleOpenFolder(group) },
          { label: t.rename, icon: 'edit', action: () => setRenamingFolderId(group.id) },
          { label: '---', action: () => {} },
          {
            label: t.delete, icon: 'trash', danger: true,
            action: () => setConfirmDialog({
              message: t.confirmDeleteFolder(group.title),
              confirmLabel: t.delete,
              onConfirm: async () => { setConfirmDialog(null); await deleteGroup(group.id); nav.setPath((prev) => { const idx = prev.indexOf(group.id); return idx >= 0 ? prev.slice(0, idx) : prev }); refresh() },
            }),
          },
        ],
      })
    },
    [refresh, handleOpenFolder, t, nav],
  )

  const handleTabContext = useCallback(
    (group: SyncGridGroup, e: React.MouseEvent) => {
      e.preventDefault()
      setCtxMenu({
        x: e.clientX, y: e.clientY,
        items: [
          { label: t.rename, icon: 'edit', action: () => { setRenamingTabId(group.id); setRenameValue(group.title) } },
          { label: '---', action: () => {} },
          {
            label: t.delete, icon: 'trash', danger: true,
            action: () => setConfirmDialog({
              message: t.confirmDeleteTab(group.title),
              confirmLabel: t.delete,
              onConfirm: async () => {
                setConfirmDialog(null)
                await deleteGroup(group.id)
                if (nav.activeTabId === group.id) {
                  const rem = groups.filter((g) => g.id !== group.id)
                  if (rem.length > 0) updateSettings({ activeTabId: rem[0].id })
                }
                refresh()
              },
            }),
          },
        ],
      })
    },
    [groups, nav.activeTabId, updateSettings, refresh, t],
  )

  // --- Global keyboard shortcuts ---
  useEffect(() => {
    const sc = settings.shortcuts
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isComposing(e)) return
      if (matchesBinding(e, sc.search)) { e.preventDefault(); document.querySelector<HTMLInputElement>('.sg-topbar__search-input')?.focus() }
      else if (matchesBinding(e, sc.addBookmark)) { e.preventDefault(); setShowAddForm(true) }
      else if (matchesBinding(e, sc.layoutCard)) { e.preventDefault(); updateSettings({ layout: 'card' }) }
      else if (matchesBinding(e, sc.layoutList)) { e.preventDefault(); updateSettings({ layout: 'list' }) }
      else if (matchesBinding(e, sc.layoutCompact)) { e.preventDefault(); updateSettings({ layout: 'compact' }) }
      else if (matchesBinding(e, sc.deleteSelected) && selectedIds.size > 0) { e.preventDefault(); handleDeleteSelected() }
      else if (matchesBinding(e, sc.selectAll)) { e.preventDefault(); selectAll() }
      else if (e.key === 'Escape' && selectedIds.size > 0) clearSelection()
      else if (e.key === '?' && !e.ctrlKey && !e.metaKey) setShowCheatSheet((v) => !v)
      // 数字キー 1-9 でタブ切替、0 で最後のタブ（修飾キーなし、入力欄以外）
      else if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
        const allTabs = ['__all__', ...groups.map((g) => g.id)]
        const idx = e.key === '0' ? allTabs.length - 1 : parseInt(e.key, 10) - 1
        if (idx >= 0 && idx < allTabs.length) {
          e.preventDefault()
          handleSelectTab(allTabs[idx])
        }
      }
    }
    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [settings.shortcuts, selectedIds, handleDeleteSelected, updateSettings, selectAll, clearSelection, groups, handleSelectTab])

  // --- UI helper fragments ---
  const statusFilterChips = (
    <div className="sg-status-filter">
      {([null, 'unread', 'later', 'starred', 'read'] as const).map((s) => (
        <button key={s ?? 'all'} className={`sg-status-filter__btn ${filterStatus === s ? 'sg-status-filter__btn--active' : ''}`} onClick={() => setFilterStatus(s)}>
          {s === null ? t.statusAll : s === 'unread' ? t.statusUnread : s === 'later' ? t.statusLater : s === 'starred' ? t.statusStarred : t.statusRead}
        </button>
      ))}
    </div>
  )

  const sortDropdown = (
    <div className="sg-sort">
      <select className="sg-sort__select" value={settings.sort} onChange={(e) => handleChangeSort(e.target.value as SortMode)} aria-label={t.sort}>
        <option value="manual">{t.sortManual}</option>
        <option value="name-asc">{t.sortNameAsc}</option>
        <option value="name-desc">{t.sortNameDesc}</option>
        <option value="date-new">{t.sortDateNew}</option>
        <option value="date-old">{t.sortDateOld}</option>
        <option value="domain">{t.sortDomain}</option>
        <option value="last-read">{t.sortLastRead}</option>
      </select>
    </div>
  )

  // --- Render ---
  if (loading || !loaded) return <div className="sg-loading">{t.loading}</div>

  if (showWelcome && groups.length === 0) {
    return (
      <div className="sg-welcome">
        <div className="sg-welcome__logo"><Icon name="zap" size={48} /></div>
        <h1 className="sg-welcome__title">{t.welcomeTitle}</h1>
        <p className="sg-welcome__desc">{t.welcomeDesc}</p>
        <div className="sg-welcome__features">
          <div className="sg-welcome__feature"><div className="sg-welcome__feature-icon"><Icon name="search" size={20} /></div><div className="sg-welcome__feature-text"><strong>{t.featureSearch}</strong>{t.featureSearchDesc}</div></div>
          <div className="sg-welcome__feature"><div className="sg-welcome__feature-icon"><Icon name="sparkle" size={20} /></div><div className="sg-welcome__feature-text"><strong>{t.featureAi}</strong>{t.featureAiDesc}</div></div>
          <div className="sg-welcome__feature"><div className="sg-welcome__feature-icon"><Icon name="folder" size={20} /></div><div className="sg-welcome__feature-text"><strong>{t.featureLayout}</strong>{t.featureLayoutDesc}</div></div>
          <div className="sg-welcome__feature"><div className="sg-welcome__feature-icon"><Icon name="refresh" size={20} /></div><div className="sg-welcome__feature-text"><strong>{t.featureSync}</strong>{t.featureSyncDesc}</div></div>
        </div>
        <div className="sg-welcome__actions">
          <button className="sg-btn sg-btn--primary" onClick={handleStartTour}>{t.startTour}</button>
          <button className="sg-btn sg-btn--ghost" onClick={handleSkipWelcome}>{t.skipTour}</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <TopBar query={query} onQueryChange={setQuery} theme={settings.theme} onToggleTheme={handleToggleTheme} onOpenSettings={() => setShowSettings(true)} layout={settings.layout} cardSize={settings.cardSize} onChangeLayout={handleChangeLayout} onChangeCardSize={(size) => updateSettings({ cardSize: size })} t={t} />

      {/* Tab Bar */}
      <div className="sg-tabbar" role="tablist">
        <button className={`sg-tab ${nav.activeTabId === '__all__' ? 'sg-tab--active' : ''}`} role="tab" aria-selected={nav.activeTabId === '__all__'} onClick={() => handleSelectTab('__all__')} title="1">
          {t.allBookmarks}
          <span className="sg-tab__count">{flattenGroups(groups).reduce((sum, g) => sum + g.items.length, 0)}</span>
        </button>
        {groups.map((g, idx) => (
          <button key={g.id} className={`sg-tab ${g.id === nav.activeTabId ? 'sg-tab--active' : ''} ${dragState.dropTabId === g.id && dragState.draggingId !== g.id ? 'sg-tab--drop-target' : ''} ${dragState.draggingId === g.id ? 'sg-tab--dragging' : ''}`} role="tab" aria-selected={g.id === nav.activeTabId} title={idx < 8 ? String(idx + 2) : undefined} onClick={() => handleSelectTab(g.id)} onContextMenu={(e) => handleTabContext(g, e)} onDoubleClick={() => { setRenamingTabId(g.id); setRenameValue(g.title) }} {...getTabHandlers(g.id)}>
            {renamingTabId === g.id ? (
              <input className="sg-tab__rename" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={handleRenameSubmit} onKeyDown={(e) => { if (isComposing(e)) return; if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenamingTabId(null) }} autoFocus onClick={(e) => e.stopPropagation()} />
            ) : (<>{g.title}<span className="sg-tab__count">{countAll(g)}</span></>)}
          </button>
        ))}
        {creatingGroup === 'tab' ? (
          <div className="sg-tab sg-tab--creating">
            <input className="sg-tab__rename" placeholder={t.groupNamePlaceholder} value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onBlur={handleCreateGroup} onKeyDown={(e) => { if (isComposing(e)) return; if (e.key === 'Enter') handleCreateGroup(); if (e.key === 'Escape') setCreatingGroup(false) }} autoFocus />
          </div>
        ) : (
          <button className="sg-tab sg-tab--add" onClick={handleAddGroup} title={t.newGroup} aria-label={t.newGroup}><Icon name="plus" size={14} /></button>
        )}
        <button className="sg-tab sg-tab--add" onClick={() => setShowTrash(true)} title={t.trash} aria-label={t.trash}><Icon name="trash" size={14} /></button>
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="sg-selection-bar">
          <span>{t.selected(selectedIds.size)}</span>
          <select className="sg-sort__select" value="" onChange={(e) => { if (e.target.value) handleMoveSelected(e.target.value) }}>
            <option value="" disabled>{t.moveSelected}</option>
            {groups.map((g) => (<option key={g.id} value={g.id}>{g.title}</option>))}
            {nav.currentFolder?.children.filter((c) => !selectedIds.has(c.id)).map((c) => (<option key={c.id} value={c.id}>{'  └ ' + c.title}</option>))}
          </select>
          <button className="sg-btn sg-btn--sm sg-btn--danger" onClick={handleDeleteSelected}><Icon name="trash" size={12} /> {t.deleteSelected}</button>
          <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={clearSelection}>{t.clearSelection}</button>
        </div>
      )}

      {/* Content */}
      <div key={nav.pageKey} className="sg-page-transition">
        {searchResults ? (
          <div className="sg-dial">
            <div className="sg-toolbar"><span className="sg-toolbar__title">{t.searchResults(query, searchResults.length)}</span></div>
            {searchResults.length > 0 ? (
              <div className={gridClass}>{searchResults.map((item) => (<BookmarkCard key={item.id} item={item} onContextMenu={handleBookmarkContext} t={t} locale={settings.locale} />))}</div>
            ) : (
              <div className="sg-empty"><div className="sg-empty__icon"><Icon name="search" size={48} /></div><p className="sg-empty__text">{t.noSearchResults}</p></div>
            )}
          </div>
        ) : nav.allItems ? (
          <div className="sg-dial">
            <div className="sg-toolbar">
              <span className="sg-toolbar__title">{t.allBookmarks} ({nav.allItems.length})</span>
              {statusFilterChips}
              {sortDropdown}
            </div>
            <div className={gridClass}>
              {applyFiltersAndSort(nav.allItems).map((item) => (
                <BookmarkCard key={item.id} item={item} onContextMenu={handleBookmarkContext} t={t} locale={settings.locale} tags={allMeta[item.id]?.tags} status={allMeta[item.id]?.status} ogp={allMeta[item.id]?.ogp} onOpen={(id) => handleSetStatus(id, 'read')} />
              ))}
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="sg-empty"><div className="sg-empty__icon"><Icon name="folder" size={48} /></div><p className="sg-empty__text sg-preline">{t.noGroups}</p></div>
        ) : nav.currentFolder ? (
          <div className="sg-dial">
            {nav.path.length > 0 && (
              <nav className="sg-breadcrumb" aria-label="breadcrumb">
                {nav.breadcrumb.map((crumb, i) => {
                  const crumbParentId = i === 0 ? nav.activeGroup?.id : nav.breadcrumb[i]?.id
                  return (
                    <span key={crumb.id || 'root'}>
                      {i > 0 && <span className="sg-breadcrumb__sep"> › </span>}
                      {i < nav.breadcrumb.length - 1 && crumbParentId ? (
                        <button className={`sg-breadcrumb__item ${dragState.dropBreadcrumbId === crumbParentId ? 'sg-breadcrumb__item--drop-target' : ''}`} onClick={() => nav.handleBreadcrumbClick(i)} {...getBreadcrumbDropHandlers(crumbParentId)}>{crumb.title}</button>
                      ) : (
                        <span className="sg-breadcrumb__current" aria-current="page">{crumb.title}</span>
                      )}
                    </span>
                  )
                })}
              </nav>
            )}

            <div className="sg-toolbar">
              {nav.path.length > 0 && (() => {
                const parentId = nav.path.length >= 2 ? nav.path[nav.path.length - 2] : nav.activeGroup?.id
                return parentId ? (
                  <button className={`sg-btn--icon ${dragState.dropBreadcrumbId === parentId ? 'sg-breadcrumb__item--drop-target' : ''}`} onClick={() => nav.setPath((p) => p.slice(0, -1))} title={t.back} aria-label={t.back} {...getBreadcrumbDropHandlers(parentId)}><Icon name="arrow-left" size={14} /></button>
                ) : (
                  <button className="sg-btn--icon" onClick={() => nav.setPath((p) => p.slice(0, -1))} title={t.back} aria-label={t.back}><Icon name="arrow-left" size={14} /></button>
                )
              })()}
              <span className="sg-toolbar__title">{nav.path.length === 0 ? '' : nav.currentFolder.title}</span>
              {statusFilterChips}
              {sortDropdown}
              {allTagsInFolder.length > 0 && (
                <div className="sg-tags">
                  <button className={`sg-tag ${!filterTag ? 'sg-tag--active' : ''}`} onClick={() => setFilterTag(null)}>{t.allTags}</button>
                  {allTagsInFolder.map((tag) => (<button key={tag} className={`sg-tag ${filterTag === tag ? 'sg-tag--active' : ''}`} onClick={() => setFilterTag(filterTag === tag ? null : tag)}>{tag}</button>))}
                </div>
              )}
              <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={() => setShowAddForm(!showAddForm)}>{showAddForm ? t.cancel : t.addBookmark('Ctrl')}</button>
              <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={() => { setCreatingGroup('subfolder'); setNewGroupName('') }}>{t.newFolder}</button>
            </div>

            {showAddForm && (<div className="sg-add-form-wrapper"><AddBookmarkForm onAdd={handleAddBookmark} onCancel={() => setShowAddForm(false)} t={t} aiSettings={settings.ai} /></div>)}

            {creatingGroup === 'subfolder' && (
              <div className="sg-add-form-wrapper"><div className="sg-add-form">
                <input className="sg-add-form__input" placeholder={t.groupNamePlaceholder} value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onBlur={handleCreateSubfolder} onKeyDown={(e) => { if (isComposing(e)) return; if (e.key === 'Enter') handleCreateSubfolder(); if (e.key === 'Escape') setCreatingGroup(false) }} autoFocus />
              </div></div>
            )}

            {nav.currentFolder.children.length === 0 && nav.currentFolder.items.length === 0 ? (
              <div className="sg-empty"><div className="sg-empty__icon"><Icon name="pin" size={48} /></div><p className="sg-empty__text sg-preline">{t.emptyFolder}</p></div>
            ) : (
              <div className={gridClass}>
                {nav.currentFolder.children.map((child) => (
                  <FolderCard key={child.id} group={child} onClick={handleOpenFolder} onContextMenu={handleFolderContext} t={t} dragHandlers={getDragHandlers(child.id, 'folder')} isDragging={dragState.draggingId === child.id} isDropTarget={dragState.dropTargetId === child.id} dropMode={dragState.dropTargetId === child.id ? dragState.dropMode : null} isSelected={selectedIds.has(child.id)} onToggleSelect={toggleSelect} isRenaming={renamingFolderId === child.id} onStartRename={() => setRenamingFolderId(child.id)} onRename={handleFolderRename} />
                ))}
                {applyFiltersAndSort(nav.currentFolder.items).map((item) => (
                  <BookmarkCard key={item.id} item={item} onContextMenu={handleBookmarkContext} dragHandlers={getDragHandlers(item.id, 'bookmark')} isDragging={dragState.draggingId === item.id} isDropTarget={dragState.dropTargetId === item.id} dropMode={dragState.dropTargetId === item.id && dragState.dropMode !== 'into' ? dragState.dropMode : null} t={t} locale={settings.locale} isSelected={selectedIds.has(item.id)} onToggleSelect={toggleSelect} tags={allMeta[item.id]?.tags} status={allMeta[item.id]?.status} ogp={allMeta[item.id]?.ogp} onOpen={(id) => handleSetStatus(id, 'read')} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Modals */}
      {editItem && (<EditBookmarkModal item={editItem} onSave={handleSaveBookmark} onDelete={handleDeleteBookmark} onClose={() => setEditItem(null)} t={t} initialTags={allMeta[editItem.id]?.tags} aiSettings={settings.ai} />)}
      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}
      {showSettings && (<SettingsPanel settings={settings} groups={groups} t={t} onUpdateSettings={updateSettings} onClose={() => setShowSettings(false)} onRefresh={refresh} />)}
      {confirmDialog && (<ConfirmDialog message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} confirmLabel={confirmDialog.confirmLabel} t={t} />)}
      {showTrash && (<TrashPanel onClose={() => setShowTrash(false)} onRestored={refresh} t={t} locale={settings.locale} />)}
      {showCheatSheet && (<ShortcutCheatSheet shortcuts={settings.shortcuts} onClose={() => setShowCheatSheet(false)} t={t} />)}
      {showTour && (<OnboardingTour steps={[
        { target: '.sg-topbar__search', title: t.featureSearch, description: t.tourSearch },
        { target: '.sg-layout-switcher', title: t.featureLayout, description: t.tourLayout, position: 'bottom' },
        { target: '.sg-tab--add', title: t.addBookmark('Ctrl'), description: t.tourAdd },
        { target: '.sg-btn--icon:last-child', title: t.settings, description: t.tourSettings },
      ]} onComplete={handleCompleteTour} t={t} />)}
    </>
  )
}
