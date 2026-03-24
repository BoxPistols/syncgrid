import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useBookmarks } from './hooks/useBookmarks'
import { useSettings } from './hooks/useSettings'
import { useTheme } from './hooks/useTheme'
import { useI18n } from './hooks/useI18n'
import { useAutoSync } from './hooks/useAutoSync'
import { useNavigation } from './hooks/useNavigation'
import { useSelection } from './hooks/useSelection'
import { useFiltering } from './hooks/useFiltering'
import { useMetadata } from './hooks/useMetadata'
import { useCollapse } from './hooks/useCollapse'
import { useDragReorder } from './hooks/useDragReorder'
import { TopBar } from './components/TopBar'
import { BookmarkCard } from './components/BookmarkCard'
import { FolderSection } from './components/FolderSection'
import { EditBookmarkModal } from './components/EditBookmarkModal'
import { ContextMenu, type MenuItem } from './components/ContextMenu'
import { AddBookmarkForm } from './components/AddBookmarkForm'
import { AiCategorizeModal } from './components/AiCategorizeModal'
import { SettingsPanel } from './components/SettingsPanel'
import { ConfirmDialog } from './components/ConfirmDialog'
import { TrashPanel } from './components/TrashPanel'
import { Icon } from './components/Icon'
import { OnboardingTour } from './components/OnboardingTour'
import { KeyboardShortcutsPanel } from './components/KeyboardShortcutsPanel'
import { HelpPanel } from './components/HelpPanel'
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
  const {
    query, setQuery, localQuery, setLocalQuery, searchResults, localSearchResults,
    filterTag, setFilterTag, filterStatus, setFilterStatus,
    allTagsInFolder, applyFiltersAndSort,
  } = useFiltering(groups, nav.currentFolder, allMeta, settings.sort)
  const { collapsedIds, toggleCollapse, expandAll, collapseAll } = useCollapse()

  // 全フォルダIDを再帰収集（一括折りたたみ用）
  const allFolderIds = useMemo(() => {
    if (!nav.currentFolder) return []
    const ids: string[] = []
    const collect = (group: SyncGridGroup) => {
      ids.push(group.id)
      for (const child of group.children) collect(child)
    }
    for (const child of nav.currentFolder.children) collect(child)
    return ids
  }, [nav.currentFolder])

  // --- 積読サジェスト ---
  const STALE_DAYS = 7
  const [staleDismissedAt, setStaleDismissedAt] = useState(0)
  const staleItems = useMemo(() => {
    const cutoff = Date.now() - STALE_DAYS * 86400000
    const items: SyncGridItem[] = []
    for (const g of flattenGroups(groups)) {
      for (const item of g.items) {
        const meta = allMeta[item.id]
        if (meta?.status === 'later') {
          const lastTouch = meta.lastReadAt ?? item.dateAdded ?? 0
          if (lastTouch < cutoff) items.push(item)
        }
      }
    }
    return items
  }, [groups, allMeta])
  const showStaleReminder = staleItems.length > 0 && Date.now() - staleDismissedAt > 86400000

  // --- OGPナッジ ---
  const [ogpNudgeState, setOgpNudgeState] = useState<'hidden' | 'no-permission' | 'low-coverage'>('hidden')

  useEffect(() => {
    const checkOgpNudge = async () => {
      const storage = await chrome.storage.local.get(['ogpNudgeInstalledAt', 'ogpNudgeDismissedAt'])
      // 初回インストール日を記録
      if (!storage.ogpNudgeInstalledAt) {
        await chrome.storage.local.set({ ogpNudgeInstalledAt: Date.now() })
      }
      const installedAt = (storage.ogpNudgeInstalledAt as number | undefined) || Date.now()
      const dismissedAt = (storage.ogpNudgeDismissedAt as number | undefined) || 0
      // 非表示後72時間は再表示しない
      if (Date.now() - dismissedAt < 72 * 3600000) return

      const { hasTitleFetchPermission } = await import('./utils/permissions')
      const granted = await hasTitleFetchPermission()
      const allItems = flattenGroups(groups).flatMap((g) => g.items)
      const total = allItems.length

      if (!granted && total >= 5) {
        setOgpNudgeState('no-permission')
        return
      }

      if (granted) {
        const withOgp = allItems.filter((item) => allMeta[item.id]?.ogp?.image || allMeta[item.id]?.ogp?.description).length
        const coverage = total > 0 ? withOgp / total : 1
        const daysSinceInstall = (Date.now() - installedAt) / 86400000
        // インストール3日後以降 + カバレッジ50%未満 + 10件以上
        if (daysSinceInstall >= 3 && coverage < 0.5 && total >= 10) {
          setOgpNudgeState('low-coverage')
        }
      }
    }
    if (!loading) checkOgpNudge()
  }, [loading, groups, allMeta])

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
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showAiCategorize, setShowAiCategorize] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  // --- Selection ---
  const { selectedIds, toggleSelect, clearSelection, handleDeleteSelected, handleMoveSelected, selectAll } =
    useSelection(nav.currentFolder, refresh, t, setConfirmDialog)

  // --- Drag & Drop ---
  const { dragState, getDragHandlers, getTabHandlers } = useDragReorder(
    selectedIds,
  )

  // Tab切替時に選択解除をラップ
  const handleSelectTab = useCallback(
    (id: string) => {
      clearSelection()
      setQuery('')
      nav.handleSelectTab(id)
    },
    [clearSelection, setQuery, nav],
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
    `sg-dial__grid--${settings.layout}`,
    (settings.layout === 'card' || settings.layout === 'magazine') && settings.cardSize !== 'md' && `sg-dial__grid--size-${settings.cardSize}`,
    settings.layout !== 'list' && settings.gridColumns !== 'auto' && `sg-dial__grid--cols-${settings.gridColumns}`,
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

  // --- OGP Refresh ---
  const handleRefreshOgp = useCallback(async () => {
    const { loadAllMeta, saveMeta } = await import('./utils/storage')
    const meta = await loadAllMeta()
    for (const [id, m] of Object.entries(meta)) {
      if (m.ogp) {
        await saveMeta(id, { ...m, ogp: undefined })
      }
    }
    refresh()
  }, [refresh])

  const handleDismissOgpNudge = useCallback(() => {
    setOgpNudgeState('hidden')
    chrome.storage.local.set({ ogpNudgeDismissedAt: Date.now() })
  }, [])

  const handleOgpNudgeGrant = useCallback(async () => {
    const { requestTitleFetchPermission } = await import('./utils/permissions')
    const granted = await requestTitleFetchPermission()
    if (granted) {
      setOgpNudgeState('hidden')
      chrome.storage.local.set({ ogpNudgeDismissedAt: Date.now() })
      await handleRefreshOgp()
    }
  }, [handleRefreshOgp])

  const handleOgpNudgeRefresh = useCallback(async () => {
    setOgpNudgeState('hidden')
    chrome.storage.local.set({ ogpNudgeDismissedAt: Date.now() })
    await handleRefreshOgp()
  }, [handleRefreshOgp])

  // --- Tab Reorder (Cmd+[ / Cmd+]) ---
  const handleMoveTab = useCallback(async (direction: -1 | 1) => {
    if (nav.activeTabId === '__all__') return
    const rootId = await getRootId()
    const [rootTree] = await chrome.bookmarks.getSubTree(rootId)
    const children = rootTree.children ?? []
    const sourceIdx = children.findIndex((c) => c.id === nav.activeTabId)
    if (sourceIdx < 0) return
    const targetIdx = sourceIdx + direction
    if (targetIdx < 0 || targetIdx >= children.length) return
    // 前方→後方移動時は+1補正（chrome.bookmarks.move仕様）
    const moveIdx = direction > 0 ? targetIdx + 1 : targetIdx
    await chrome.bookmarks.move(nav.activeTabId, { parentId: rootId, index: moveIdx })
    await refresh()
  }, [nav.activeTabId, refresh])

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
          { label: t.openNewTab, icon: 'link', shortcut: 'O', action: () => { window.open(item.url, '_blank'); handleSetStatus(item.id, 'read') } },
          { label: t.edit, icon: 'edit', shortcut: 'E', action: () => setEditItem(item) },
          { label: '---', action: () => {} },
          { label: t.statusUnread, icon: 'sparkle', shortcut: 'U', action: () => handleSetStatus(item.id, 'unread') },
          { label: t.statusLater, icon: 'pin', shortcut: 'L', action: () => handleSetStatus(item.id, 'later') },
          { label: t.statusStarred, icon: 'sparkle', shortcut: 'S', action: () => handleSetStatus(item.id, 'starred') },
          { label: t.statusRead, icon: 'check-circle', shortcut: 'R', action: () => handleSetStatus(item.id, 'read') },
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
          { label: t.rename, icon: 'edit', action: () => setRenamingFolderId(group.id) },
          { label: '---', action: () => {} },
          {
            label: t.delete, icon: 'trash', danger: true,
            action: () => setConfirmDialog({
              message: t.confirmDeleteFolder(group.title),
              confirmLabel: t.delete,
              onConfirm: async () => { setConfirmDialog(null); await deleteGroup(group.id); refresh() },
            }),
          },
        ],
      })
    },
    [refresh, t],
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

  // --- 数字キー連続入力でタブ切替（0始まり、2桁以上対応） ---
  const tabDigitBuf = useRef('')
  const tabDigitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const groupsRef = useRef(groups)
  groupsRef.current = groups
  const handleSelectTabRef = useRef(handleSelectTab)
  handleSelectTabRef.current = handleSelectTab

  const commitTabDigit = useCallback(() => {
    const buf = tabDigitBuf.current
    tabDigitBuf.current = ''
    if (!buf) return
    const idx = parseInt(buf, 10)
    const allTabs = ['__all__', ...groupsRef.current.map((g) => g.id)]
    if (idx >= 0 && idx < allTabs.length) {
      handleSelectTabRef.current(allTabs[idx])
    }
  }, [])

  // --- Global keyboard shortcuts ---
  useEffect(() => {
    const sc = settings.shortcuts
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isComposing(e)) return
      if (matchesBinding(e, sc.search)) { e.preventDefault(); document.querySelector<HTMLInputElement>('.sg-topbar__search-input')?.focus() }
      else if (matchesBinding(e, sc.addBookmark)) { e.preventDefault(); setShowAddForm(true) }
      else if (matchesBinding(e, sc.layoutMagazine)) { e.preventDefault(); updateSettings({ layout: 'magazine' }) }
      else if (matchesBinding(e, sc.layoutCard)) { e.preventDefault(); updateSettings({ layout: 'card' }) }
      else if (matchesBinding(e, sc.layoutList)) { e.preventDefault(); updateSettings({ layout: 'list' }) }
      else if (matchesBinding(e, sc.deleteSelected) && selectedIds.size > 0) { e.preventDefault(); handleDeleteSelected() }
      else if (matchesBinding(e, sc.selectAll)) { e.preventDefault(); selectAll() }
      else if (e.key === 'Escape' && selectedIds.size > 0) clearSelection()
      else if (e.key === '?' && !e.ctrlKey && !e.metaKey) setShowShortcutsPanel((v) => !v)
      // Cmd+[ / Cmd+] でアクティブタブを左右に移動
      else if ((e.metaKey || e.ctrlKey) && e.key === '[') { e.preventDefault(); handleMoveTab(-1) }
      else if ((e.metaKey || e.ctrlKey) && e.key === ']') { e.preventDefault(); handleMoveTab(1) }
      // 数字キー 0始まりでタブ切替（2桁以上対応：素早く連続入力で確定）
      else if (/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
        e.preventDefault()
        if (tabDigitTimer.current) clearTimeout(tabDigitTimer.current)
        tabDigitBuf.current += e.key
        tabDigitTimer.current = setTimeout(commitTabDigit, 400)
      }
    }
    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [settings.shortcuts, selectedIds, handleDeleteSelected, updateSettings, selectAll, clearSelection, commitTabDigit, handleMoveTab])

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

  // FolderSection共通props
  const folderSectionProps = {
    collapsedIds,
    onToggleCollapse: toggleCollapse,
    gridClass,
    onBookmarkContext: handleBookmarkContext,
    onFolderContext: handleFolderContext,
    applyFiltersAndSort,
    allMeta,
    handleSetStatus,
    selectedIds,
    toggleSelect,
    getDragHandlers,
    dragState,
    t,
    locale: settings.locale,
    renamingFolderId,
    onStartRename: (id: string) => setRenamingFolderId(id),
    onFolderRename: handleFolderRename,
  }

  // --- Render ---
  if (loading || !loaded) return <div className="sg-loading">{t.loading}</div>

  if (showWelcome && groups.length === 0) {
    return (
      <div className="sg-welcome">
        <div className="sg-welcome__logo"><Icon name="grid" size={48} /></div>
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
      <TopBar query={query} onQueryChange={setQuery} theme={settings.theme} onToggleTheme={handleToggleTheme} onOpenSettings={() => setShowSettings(true)} onOpenShortcuts={() => setShowShortcutsPanel(true)} onOpenHelp={() => setShowHelp(true)} onRefreshOgp={handleRefreshOgp} layout={settings.layout} cardSize={settings.cardSize} gridColumns={settings.gridColumns} onChangeLayout={handleChangeLayout} onChangeCardSize={(size) => updateSettings({ cardSize: size })} onChangeGridColumns={(cols) => updateSettings({ gridColumns: cols })} t={t} />

      {/* Tab Bar */}
      <div className="sg-tabbar" role="tablist">
        <button className={`sg-tab ${nav.activeTabId === '__all__' ? 'sg-tab--active' : ''}`} role="tab" aria-selected={nav.activeTabId === '__all__'} onClick={() => handleSelectTab('__all__')} title="0">
          <span className="sg-tab__shortcut">0</span>
          {t.allBookmarks}
          <span className="sg-tab__count">{flattenGroups(groups).reduce((sum, g) => sum + g.items.length, 0)}</span>
        </button>
        {groups.map((g, idx) => (
          <button key={g.id} className={`sg-tab ${g.id === nav.activeTabId ? 'sg-tab--active' : ''} ${dragState.dropTabId === g.id && dragState.draggingId !== g.id ? 'sg-tab--drop-target' : ''} ${dragState.draggingId === g.id ? 'sg-tab--dragging' : ''}`} role="tab" aria-selected={g.id === nav.activeTabId} title={String(idx + 1)} onClick={() => handleSelectTab(g.id)} onContextMenu={(e) => handleTabContext(g, e)} onDoubleClick={() => { setRenamingTabId(g.id); setRenameValue(g.title) }} {...getTabHandlers(g.id)}>
            {renamingTabId === g.id ? (
              <input className="sg-tab__rename" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onBlur={handleRenameSubmit} onKeyDown={(e) => { if (isComposing(e)) return; if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenamingTabId(null) }} autoFocus onClick={(e) => e.stopPropagation()} />
            ) : (<><span className="sg-tab__shortcut">{idx + 1}</span>{g.title}<span className="sg-tab__count">{countAll(g)}</span></>)}
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

      {/* 積読サジェスト */}
      {showStaleReminder && (
        <div className="sg-stale-banner">
          <Icon name="pin" size={14} />
          <span>{t.staleReminder(staleItems.length)}</span>
          <button className="sg-btn sg-btn--sm sg-btn--primary" onClick={() => setFilterStatus('later')}>
            {t.staleReminderAction}
          </button>
          <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={() => setStaleDismissedAt(Date.now())}>
            {t.staleReminderDismiss}
          </button>
        </div>
      )}

      {/* OGPナッジ */}
      {ogpNudgeState !== 'hidden' && (
        <div className="sg-ogp-nudge">
          <Icon name="link" size={14} />
          <span>{ogpNudgeState === 'no-permission' ? t.ogpNudgeNoPermission : t.ogpNudgeLowCoverage}</span>
          {ogpNudgeState === 'no-permission' ? (
            <button className="sg-btn sg-btn--sm sg-btn--primary" onClick={handleOgpNudgeGrant}>
              <Icon name="lock" size={12} /> {t.ogpNudgeGrant}
            </button>
          ) : (
            <button className="sg-btn sg-btn--sm sg-btn--primary" onClick={handleOgpNudgeRefresh}>
              <Icon name="refresh" size={12} /> {t.ogpNudgeRefresh}
            </button>
          )}
          <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={handleDismissOgpNudge}>
            {t.ogpNudgeDismiss}
          </button>
        </div>
      )}

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
            <div className="sg-toolbar">
              <input
                type="text"
                className="sg-local-search"
                placeholder={t.searchInTab}
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              {statusFilterChips}
              {sortDropdown}
              {allTagsInFolder.length > 0 && (
                <div className="sg-tags">
                  <button className={`sg-tag ${!filterTag ? 'sg-tag--active' : ''}`} onClick={() => setFilterTag(null)}>{t.allTags}</button>
                  {allTagsInFolder.map((tag) => (<button key={tag} className={`sg-tag ${filterTag === tag ? 'sg-tag--active' : ''}`} onClick={() => setFilterTag(filterTag === tag ? null : tag)}>{tag}</button>))}
                </div>
              )}
              {allFolderIds.length > 0 && (
                <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={() => {
                  const allCollapsed = allFolderIds.every((id) => collapsedIds.has(id))
                  if (allCollapsed) expandAll()
                  else collapseAll(allFolderIds)
                }}>
                  {allFolderIds.every((id) => collapsedIds.has(id)) ? t.expandAll : t.collapseAll}
                </button>
              )}
              {settings.ai.provider !== 'none' && nav.currentFolder && nav.currentFolder.items.length > 0 && (
                <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={() => setShowAiCategorize(true)}>
                  <Icon name="bot" size={12} /> {t.aiCategorizeBtn}
                </button>
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

            {/* タブ内検索結果 */}
            {localSearchResults ? (
              localSearchResults.length === 0 ? (
                <div className="sg-empty"><div className="sg-empty__icon"><Icon name="search" size={48} /></div><p className="sg-empty__text">{t.noSearchResults}</p></div>
              ) : (
                <div className={gridClass}>
                  {applyFiltersAndSort(localSearchResults).map((item) => (
                    <BookmarkCard key={item.id} item={item} onContextMenu={handleBookmarkContext} t={t} locale={settings.locale} tags={allMeta[item.id]?.tags} status={allMeta[item.id]?.status} ogp={allMeta[item.id]?.ogp} onOpen={(id) => handleSetStatus(id, 'read')} />
                  ))}
                </div>
              )
            ) : nav.currentFolder.children.length === 0 && nav.currentFolder.items.length === 0 ? (
              <div className="sg-empty"><div className="sg-empty__icon"><Icon name="pin" size={48} /></div><p className="sg-empty__text sg-preline">{t.emptyFolder}</p></div>
            ) : (
              <>
                {/* ルート直下のブックマーク */}
                {nav.currentFolder.items.length > 0 && (
                  <div className={gridClass}>
                    {applyFiltersAndSort(nav.currentFolder.items).map((item) => (
                      <BookmarkCard key={item.id} item={item} onContextMenu={handleBookmarkContext} dragHandlers={getDragHandlers(item.id, 'bookmark')} isDragging={dragState.draggingId === item.id} isDropTarget={dragState.dropTargetId === item.id} dropMode={dragState.dropTargetId === item.id && dragState.dropMode !== 'into' ? dragState.dropMode : null} t={t} locale={settings.locale} isSelected={selectedIds.has(item.id)} onToggleSelect={toggleSelect} tags={allMeta[item.id]?.tags} status={allMeta[item.id]?.status} ogp={allMeta[item.id]?.ogp} onOpen={(id) => handleSetStatus(id, 'read')} />
                    ))}
                  </div>
                )}

                {/* フォルダをアコーディオンセクションとして表示 */}
                {nav.currentFolder.children.map((child) => (
                  <FolderSection key={child.id} group={child} depth={0} {...folderSectionProps} />
                ))}
              </>
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
      {showShortcutsPanel && (<KeyboardShortcutsPanel settings={settings} onUpdateSettings={updateSettings} onClose={() => setShowShortcutsPanel(false)} t={t} />)}
      {showHelp && (<HelpPanel onClose={() => setShowHelp(false)} t={t} />)}
      {showAiCategorize && nav.currentFolder && (
        <AiCategorizeModal
          items={nav.currentFolder.items}
          parentFolder={nav.currentFolder}
          aiSettings={settings.ai}
          onDone={() => { setShowAiCategorize(false); refresh() }}
          onClose={() => setShowAiCategorize(false)}
          t={t}
        />
      )}
      {showTour && (<OnboardingTour steps={[
        { target: '.sg-topbar__search', title: t.featureSearch, description: t.tourSearch },
        { target: '.sg-layout-switcher', title: t.featureLayout, description: t.tourLayout, position: 'bottom' },
        { target: '.sg-tab--add', title: t.addBookmark('Ctrl'), description: t.tourAdd },
        { target: '.sg-btn--icon:last-child', title: t.settings, description: t.tourSettings },
      ]} onComplete={handleCompleteTour} t={t} />)}
    </>
  )
}
