import { useState, useCallback, useMemo, useEffect } from 'react'
import { useBookmarks } from './hooks/useBookmarks'
import { useSettings } from './hooks/useSettings'
import { useTheme } from './hooks/useTheme'
import { useI18n } from './hooks/useI18n'
import { useAutoSync } from './hooks/useAutoSync'
import { TopBar } from './components/TopBar'
import { BookmarkCard } from './components/BookmarkCard'
import { FolderCard } from './components/FolderCard'
import { EditBookmarkModal } from './components/EditBookmarkModal'
import { ContextMenu, type MenuItem } from './components/ContextMenu'
import { AddBookmarkForm } from './components/AddBookmarkForm'
import { SettingsPanel } from './components/SettingsPanel'
import {
  addBookmark, removeBookmark, updateBookmark,
  createGroup, renameGroup, deleteGroup,
  getRootId, flattenGroups,
} from './utils/bookmarks'
import type { SyncGridItem, SyncGridGroup } from './types'

import './styles/global.css'

export default function App() {
  const { groups, loading, refresh } = useBookmarks()
  const { settings, updateSettings, loaded } = useSettings()
  useTheme(settings.theme)
  const t = useI18n(settings.locale)

  // --- Auto Sync ---
  const handleSynced = useCallback((syncedAt: string) => {
    updateSettings({ lastSyncedAt: syncedAt })
  }, [updateSettings])
  useAutoSync(groups, handleSynced)

  // --- Navigation State ---
  const [path, setPath] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [editItem, setEditItem] = useState<SyncGridItem | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [ctxMenu, setCtxMenu] = useState<{
    x: number; y: number; items: MenuItem[]
  } | null>(null)

  // --- Active Tab (computed — stale ID falls back to first group) ---
  const activeTabId = useMemo(() => {
    const stored = settings.activeTabId
    if (stored && groups.find(g => g.id === stored)) return stored
    return groups[0]?.id || ''
  }, [settings.activeTabId, groups])

  const activeGroup = groups.find(g => g.id === activeTabId) ?? groups[0]

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
      folder = folder?.children.find(c => c.id === id)
      if (!folder) break
    }
    return folder ?? activeGroup
  }, [activeGroup, path])

  // --- Breadcrumb ---
  const breadcrumb = useMemo(() => {
    if (!activeGroup) return []
    const crumbs: { id: string; title: string }[] = [{ id: '', title: activeGroup.title }]
    let folder: SyncGridGroup | undefined = activeGroup
    for (const id of path) {
      const next: SyncGridGroup | undefined = folder?.children.find(c => c.id === id)
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
        if (item.title.toLowerCase().includes(q) || item.url.toLowerCase().includes(q))
          results.push(item)
      }
    }
    return results
  }, [query, groups])

  // --- Handlers ---
  const handleSelectTab = useCallback((id: string) => {
    setPath([]); updateSettings({ activeTabId: id, lastPath: [] }); setQuery('')
  }, [updateSettings])

  const handleOpenFolder = useCallback((group: SyncGridGroup) => {
    setPath(prev => [...prev, group.id])
  }, [])

  const handleBreadcrumbClick = useCallback((index: number) => {
    setPath(prev => prev.slice(0, index))
  }, [])

  const handleToggleTheme = useCallback(() => {
    updateSettings((prev) => ({
      theme: prev.theme === 'dark' ? 'light' : prev.theme === 'light' ? 'dark' : 'dark',
    }))
  }, [updateSettings])

  const handleAddGroup = useCallback(() => {
    setCreatingGroup(true); setNewGroupName('')
  }, [])

  const handleCreateGroup = useCallback(async () => {
    const name = newGroupName.trim()
    if (!name) { setCreatingGroup(false); return }
    const parentId = currentFolder?.id || (await getRootId())
    await createGroup(name, parentId)
    setCreatingGroup(false); setNewGroupName('')
    await refresh()
  }, [newGroupName, currentFolder, refresh])

  const handleAddBookmark = useCallback(async (url: string, title: string) => {
    if (!currentFolder) return
    await addBookmark(currentFolder.id, title, url)
    setShowAddForm(false); await refresh()
  }, [currentFolder, refresh])

  const handleSaveBookmark = useCallback(async (id: string, title: string, url: string) => {
    await updateBookmark(id, { title, url })
    setEditItem(null); await refresh()
  }, [refresh])

  const handleDeleteBookmark = useCallback(async (id: string) => {
    await removeBookmark(id)
    setEditItem(null); await refresh()
  }, [refresh])

  const handleBookmarkContext = useCallback((item: SyncGridItem, x: number, y: number) => {
    setCtxMenu({ x, y, items: [
      { label: t.openNewTab, icon: '🔗', action: () => window.open(item.url, '_blank') },
      { label: t.edit, icon: '✏️', action: () => setEditItem(item) },
      { label: '---', action: () => {} },
      { label: t.delete, icon: '🗑️', danger: true, action: async () => { await removeBookmark(item.id); refresh() } },
    ]})
  }, [refresh, t])

  const handleFolderContext = useCallback((group: SyncGridGroup, x: number, y: number) => {
    setCtxMenu({ x, y, items: [
      { label: t.open, icon: '📂', action: () => handleOpenFolder(group) },
      { label: t.rename, icon: '✏️', action: () => { setRenamingTabId(group.id); setRenameValue(group.title) } },
      { label: '---', action: () => {} },
      { label: t.delete, icon: '🗑️', danger: true, action: async () => {
        if (confirm(t.confirmDeleteFolder(group.title))) {
          await deleteGroup(group.id)
          setPath(prev => { const idx = prev.indexOf(group.id); return idx >= 0 ? prev.slice(0, idx) : prev })
          refresh()
        }
      }},
    ]})
  }, [refresh, handleOpenFolder, t])

  const handleRenameSubmit = useCallback(async () => {
    if (!renamingTabId) return
    const name = renameValue.trim()
    if (name) await renameGroup(renamingTabId, name)
    setRenamingTabId(null); setRenameValue('')
    await refresh()
  }, [renamingTabId, renameValue, refresh])

  const handleTabContext = useCallback((group: SyncGridGroup, e: React.MouseEvent) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, items: [
      { label: t.rename, icon: '✏️', action: () => { setRenamingTabId(group.id); setRenameValue(group.title) } },
      { label: '---', action: () => {} },
      { label: t.delete, icon: '🗑️', danger: true, action: async () => {
        if (confirm(t.confirmDeleteTab(group.title))) {
          await deleteGroup(group.id)
          if (activeTabId === group.id) {
            const rem = groups.filter(g => g.id !== group.id)
            if (rem.length > 0) updateSettings({ activeTabId: rem[0].id })
          }
          refresh()
        }
      }},
    ]})
  }, [groups, activeTabId, updateSettings, refresh, t])

  // --- Render ---
  if (loading || !loaded) return <div className="sg-loading">{t.loading}</div>

  return (
    <>
      <TopBar query={query} onQueryChange={setQuery} theme={settings.theme}
        onToggleTheme={handleToggleTheme} onOpenSettings={() => setShowSettings(true)} t={t} />

      {/* Tab Bar */}
      <div className="sg-tabbar">
        {groups.map((g) => (
          <button key={g.id}
            className={`sg-tab ${g.id === activeTabId ? 'sg-tab--active' : ''}`}
            onClick={() => handleSelectTab(g.id)}
            onContextMenu={(e) => handleTabContext(g, e)}
            onDoubleClick={() => { setRenamingTabId(g.id); setRenameValue(g.title) }}
          >
            {renamingTabId === g.id ? (
              <input className="sg-tab__rename" value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenamingTabId(null) }}
                autoFocus onClick={(e) => e.stopPropagation()} />
            ) : (
              <>{g.title}<span className="sg-tab__count">{countAll(g)}</span></>
            )}
          </button>
        ))}
        {creatingGroup ? (
          <div className="sg-tab sg-tab--creating">
            <input className="sg-tab__rename" placeholder={t.groupNamePlaceholder} value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)} onBlur={handleCreateGroup}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateGroup(); if (e.key === 'Escape') setCreatingGroup(false) }}
              autoFocus />
          </div>
        ) : (
          <button className="sg-tab sg-tab--add" onClick={handleAddGroup} title={t.newGroup}>＋</button>
        )}
      </div>

      {/* Content */}
      {searchResults ? (
        <div className="sg-dial">
          <div className="sg-toolbar">
            <span className="sg-toolbar__title">{t.searchResults(query, searchResults.length)}</span>
          </div>
          {searchResults.length > 0 ? (
            <div className="sg-dial__grid">
              {searchResults.map(item => <BookmarkCard key={item.id} item={item} onContextMenu={handleBookmarkContext} />)}
            </div>
          ) : (
            <div className="sg-empty"><div className="sg-empty__icon">🔍</div><p className="sg-empty__text">{t.noSearchResults}</p></div>
          )}
        </div>
      ) : groups.length === 0 ? (
        <div className="sg-empty"><div className="sg-empty__icon">📂</div><p className="sg-empty__text" style={{ whiteSpace: 'pre-line' }}>{t.noGroups}</p></div>
      ) : currentFolder ? (
        <div className="sg-dial">
          {path.length > 0 && (
            <div className="sg-breadcrumb">
              {breadcrumb.map((crumb, i) => (
                <span key={crumb.id || 'root'}>
                  {i > 0 && <span className="sg-breadcrumb__sep"> › </span>}
                  {i < breadcrumb.length - 1
                    ? <button className="sg-breadcrumb__item" onClick={() => handleBreadcrumbClick(i)}>{crumb.title}</button>
                    : <span className="sg-breadcrumb__current">{crumb.title}</span>}
                </span>
              ))}
            </div>
          )}

          <div className="sg-toolbar">
            {path.length > 0 && <button className="sg-btn--icon" onClick={() => setPath(p => p.slice(0, -1))} title={t.back}>←</button>}
            <span className="sg-toolbar__title">{path.length === 0 ? '' : currentFolder.title}</span>
            <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? t.cancel : t.addBookmark}
            </button>
            <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={() => { setCreatingGroup(true); setNewGroupName('') }}>
              {t.newFolder}
            </button>
          </div>

          {showAddForm && (
            <div style={{ padding: '0 24px' }}>
              <AddBookmarkForm onAdd={handleAddBookmark} onCancel={() => setShowAddForm(false)} t={t} aiSettings={settings.ai} />
            </div>
          )}

          {currentFolder.children.length === 0 && currentFolder.items.length === 0 ? (
            <div className="sg-empty"><div className="sg-empty__icon">📌</div><p className="sg-empty__text" style={{ whiteSpace: 'pre-line' }}>{t.emptyFolder}</p></div>
          ) : (
            <div className="sg-dial__grid">
              {currentFolder.children.map(child => <FolderCard key={child.id} group={child} onClick={handleOpenFolder} onContextMenu={handleFolderContext} t={t} />)}
              {currentFolder.items.map(item => <BookmarkCard key={item.id} item={item} onContextMenu={handleBookmarkContext} />)}
            </div>
          )}
        </div>
      ) : null}

      {editItem && <EditBookmarkModal item={editItem} onSave={handleSaveBookmark} onDelete={handleDeleteBookmark} onClose={() => setEditItem(null)} t={t} />}
      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}
      {showSettings && <SettingsPanel settings={settings} groups={groups} t={t}
        onUpdateSettings={updateSettings} onClose={() => setShowSettings(false)} onRefresh={refresh} />}
    </>
  )
}

function countAll(g: SyncGridGroup): number {
  return g.items.length + g.children.reduce((sum, c) => sum + countAll(c), 0)
}
