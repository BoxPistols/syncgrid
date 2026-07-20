import { useState, useCallback, useMemo } from 'react'
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
import { useLastUsed } from './hooks/useLastUsed'
import { usePinned } from './hooks/usePinned'
import { useWallpaper } from './hooks/useWallpaper'
import { useGitHubActivity } from './hooks/useGitHubActivity'
import { useDragReorder } from './hooks/useDragReorder'
import { useKanban } from './hooks/useKanban'
import { useToast } from './hooks/useToast'
import { useOnboarding } from './hooks/useOnboarding'
import { useOgpNudge } from './hooks/useOgpNudge'
import { useBookmarkCrud, type ConfirmDialogState } from './hooks/useBookmarkCrud'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useAppContextMenus } from './hooks/useAppContextMenus'
import { I18nProvider } from './context/I18nContext'
import { FolderSidebar } from './components/FolderSidebar'
import { RightActionBar } from './components/RightActionBar'
import { CenterSearch } from './components/CenterSearch'
import { TabMarkGrid } from './components/TabMarkGrid'
import { BookmarkGrid } from './components/BookmarkGrid'
import { FolderSection } from './components/FolderSection'
import { EditBookmarkModal } from './components/EditBookmarkModal'
import { ContextMenu } from './components/ContextMenu'
import { AddBookmarkForm } from './components/AddBookmarkForm'
import { AiCategorizeModal } from './components/AiCategorizeModal'
import { SettingsPanel } from './components/SettingsPanel'
import { ConfirmDialog } from './components/ConfirmDialog'
import { TrashPanel } from './components/TrashPanel'
import { Icon } from './components/Icon'
import { OnboardingTour } from './components/OnboardingTour'
import { KeyboardShortcutsPanel } from './components/KeyboardShortcutsPanel'
import { HelpPanel } from './components/HelpPanel'
import { KanbanBoard } from './components/KanbanBoard'
import { ToastContainer } from './components/Toast'
import { SpeedDialBar } from './components/SpeedDialBar'
import { CommandPalette } from './components/CommandPalette'
import { GitHubActivityView } from './components/GitHubActivityView'
import { WelcomeScreen } from './components/WelcomeScreen'
import { SelectionBar } from './components/SelectionBar'
import { DueDateModal } from './components/DueDateModal'
import { ContentToolbar } from './components/ContentToolbar'
import { OgpNudgeBanner } from './components/OgpNudgeBanner'
import { getAllItems } from './utils/bookmarks'
import { MAX_PINNED, type SortMode } from './types'
import { isComposing } from './utils/keyboard'
import { pullKanbanFromSync } from './utils/localSync'

import './styles/global.css'

export default function App() {
  const { groups, loading, refresh } = useBookmarks()
  const { settings, updateSettings, loaded } = useSettings()
  useTheme(settings.theme)
  const t = useI18n(settings.locale)

  // --- Toast (操作の成否通知) ---
  const { toasts, showToast, dismiss: dismissToast } = useToast()

  // --- Extracted hooks ---
  const { allMeta, handleSaveMeta } = useMetadata(groups)
  const { lastUsed, trackUsage } = useLastUsed()
  const { pinnedUrls, isPinned, togglePin } = usePinned()
  const wallpaperVars = useWallpaper(settings.wallpaper, loaded)
  const nav = useNavigation(groups, settings, loaded, updateSettings)
  const {
    query, setQuery, searchResults,
    filterTag, setFilterTag,
    allTagsInFolder, applyFiltersAndSort,
  } = useFiltering(groups, nav.currentFolder, allMeta, settings.sort, lastUsed)
  const { collapsedIds, toggleCollapse } = useCollapse()
  const githubEnabled = settings.github.token !== ''
  const github = useGitHubActivity(settings.github.token, githubEnabled && nav.activeTabId === '__github__')
  const handleKanbanError = useCallback(() => showToast(t.kanbanSaveError, 'error'), [showToast, t])
  const handleKanbanSyncError = useCallback(() => showToast(t.kanbanSyncError, 'error'), [showToast, t])
  const { kanbanColumns, isInKanban, addToKanban, removeFromKanban, moveItem: moveKanbanItem, setDueDate, dueDates, overdueItems, reloadKanban } = useKanban(groups, { onError: handleKanbanError })

  // --- OGPナッジ ---
  const ogpNudge = useOgpNudge(groups, allMeta, loading, refresh)

  // --- Auto Sync ---
  const handleSynced = useCallback(
    (syncedAt: string) => updateSettings({ lastSyncedAt: syncedAt }),
    [updateSettings],
  )
  useAutoSync(groups, handleSynced, reloadKanban, handleKanbanSyncError)

  // --- UI State ---
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [showTrash, setShowTrash] = useState(false)
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showAiCategorize, setShowAiCategorize] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [dueDateTarget, setDueDateTarget] = useState<string | null>(null)

  // --- Onboarding ---
  const { showWelcome, showTour, startTour, completeTour, skipWelcome } = useOnboarding()

  // --- Selection ---
  const { selectedIds, toggleSelect, clearSelection, handleDeleteSelected, handleMoveSelected, selectAll } =
    useSelection(nav.currentFolder, refresh, t, setConfirmDialog)

  // --- Bookmark/Folder CRUD ---
  const crud = useBookmarkCrud({
    groups,
    currentFolder: nav.currentFolder,
    refresh,
    showToast,
    t,
    setConfirmDialog,
    handleSaveMeta,
  })

  // --- Drag & Drop ---
  const handleKanbanDrop = useCallback(
    (bookmarkId: string) => { addToKanban(bookmarkId) },
    [addToKanban],
  )
  // 並べ替えドロップ成立時: manual以外のソートでは結果が表示に反映されないため、手動ソートへ自動切替
  const handleReorderDone = useCallback(() => {
    if (settings.sort !== 'manual') {
      updateSettings({ sort: 'manual' })
      showToast(t.sortSwitchedToManual, 'success')
    }
  }, [settings.sort, updateSettings, showToast, t])
  const { dragState, getDragHandlers, getContainerHandlers } = useDragReorder(
    selectedIds,
    handleKanbanDrop,
    handleReorderDone,
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

  const handleChangeSort = useCallback(
    (sort: SortMode) => updateSettings({ sort }),
    [updateSettings],
  )

  // light → dark → system → light の3値循環（systemに到達できない不具合を修正）
  const handleToggleTheme = useCallback(
    () => updateSettings((prev) => ({ theme: prev.theme === 'light' ? 'dark' : prev.theme === 'dark' ? 'system' : 'light' })),
    [updateSettings],
  )

  // --- Pin ---
  const handleTogglePin = useCallback(
    (url: string) => {
      if (!togglePin(url)) showToast(t.pinLimitReached(MAX_PINNED), 'warning')
    },
    [togglePin, showToast, t],
  )
  // URL → SyncGridItem 解決（pinnedAt 降順）
  const pinnedItems = useMemo(() => {
    const urls = Object.keys(pinnedUrls)
    if (urls.length === 0) return []
    const byUrl = new Map(getAllItems(groups).map((i) => [i.url, i]))
    return Object.entries(pinnedUrls)
      .sort(([, a], [, b]) => b - a)
      .map(([url]) => byUrl.get(url))
      .filter((i): i is NonNullable<typeof i> => i != null)
  }, [pinnedUrls, groups])

  // --- Context menus ---
  const { ctxMenu, closeCtxMenu, onBookmarkContext, onKanbanContext, onFolderContext } = useAppContextMenus({
    t,
    isInKanban,
    addToKanban,
    removeFromKanban,
    moveKanbanItem,
    setDueDate,
    dueDates,
    isPinnedUrl: isPinned,
    togglePinUrl: handleTogglePin,
    requestDeleteBookmark: crud.requestDeleteBookmark,
    setEditItem: crud.setEditItem,
    setDueDateTarget,
    setRenamingFolderId: crud.setRenamingFolderId,
    setConfirmDialog,
    refresh,
  })

  // --- Global keyboard shortcuts ---
  const openAddForm = useCallback(() => crud.setShowAddForm(true), [crud])
  const setLayout = useCallback((layout: 'tabmark' | 'list') => updateSettings({ layout }), [updateSettings])
  const toggleShortcutsPanel = useCallback(() => setShowShortcutsPanel((v) => !v), [])
  const togglePalette = useCallback(() => setShowPalette((v) => !v), [])
  useGlobalShortcuts({
    shortcuts: settings.shortcuts,
    selectedIds,
    activeTabId: nav.activeTabId,
    groups,
    refresh,
    handleSelectTab,
    openAddForm,
    setLayout,
    handleDeleteSelected,
    selectAll,
    clearSelection,
    toggleShortcutsPanel,
    togglePalette,
  })

  // list モード用グリッドクラス
  const gridClass = 'sg-dial__grid sg-dial__grid--list'
  const isTabmark = settings.layout === 'tabmark'

  // --- Render ---
  if (loading || !loaded) return <div className="sg-loading">{t.loading}</div>

  // 初回起動時は既存ブックマークの有無に関わらずウェルカム画面を表示（skip/startでonboarded記録）
  if (showWelcome) {
    return <WelcomeScreen t={t} onStartTour={startTour} onSkip={skipWelcome} />
  }

  return (
    <I18nProvider locale={settings.locale}>
      {/* 壁紙レイヤー */}
      <div className="sg-wallpaper" style={wallpaperVars} />

      {/* 3カラムレイアウト */}
      <div className={`sg-layout${sidebarCollapsed ? ' sg-layout--sidebar-collapsed' : ''}`}>

        {/* 左: フォルダサイドバー */}
        <FolderSidebar
          groups={groups}
          activeTabId={nav.activeTabId}
          onSelectTab={handleSelectTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          t={t}
          totalCount={getAllItems(groups).length}
          githubEnabled={githubEnabled}
        />

        {/* 中央: メインコンテンツ */}
        <main className="sg-main">
          <div className="sg-main__header">
            <CenterSearch query={query} onQueryChange={setQuery} isGlobal={nav.activeTabId === '__all__'} t={t} />
            <SpeedDialBar groups={groups} lastUsed={lastUsed} />
            {nav.breadcrumb.length > 1 && (
              <nav className="sg-breadcrumb" aria-label="パス">
                <button className="sg-breadcrumb__back" onClick={nav.handleNavigateUp} aria-label="上のフォルダへ">
                  <Icon name="arrow-left" size={14} />
                </button>
                {nav.breadcrumb.map((seg, i) => (
                  <span key={seg.id} className="sg-breadcrumb__seg">
                    {i > 0 && <span className="sg-breadcrumb__sep" aria-hidden="true">›</span>}
                    <button
                      className={`sg-breadcrumb__item${i === nav.breadcrumb.length - 1 ? ' sg-breadcrumb__item--current' : ''}`}
                      onClick={() => handleSelectTab(seg.id)}
                      disabled={i === nav.breadcrumb.length - 1}
                    >
                      {seg.title}
                    </button>
                  </span>
                ))}
              </nav>
            )}
          </div>

          <div className="sg-main__body">
            {/* バナー類 */}
            {ogpNudge.nudgeState !== 'hidden' && (
              <OgpNudgeBanner
                state={ogpNudge.nudgeState}
                onGrant={ogpNudge.grantAndRefresh}
                onRefresh={ogpNudge.refreshNow}
                onDismiss={ogpNudge.dismiss}
                t={t}
              />
            )}
            {overdueItems.length > 0 && nav.activeTabId !== '__kanban__' && (
              <div className="sg-stale-banner">
                <Icon name="warning" size={14} />
                <span>{t.kanbanOverdue(overdueItems.length)}</span>
                <button className="sg-btn sg-btn--sm sg-btn--primary" onClick={() => handleSelectTab('__kanban__')}>{t.kanbanOverdueAction}</button>
              </div>
            )}
            {selectedIds.size > 0 && (
              <SelectionBar
                count={selectedIds.size}
                groups={groups}
                currentFolder={nav.currentFolder}
                selectedIds={selectedIds}
                onMove={handleMoveSelected}
                onDelete={handleDeleteSelected}
                onClear={clearSelection}
                t={t}
              />
            )}

            {/* コンテンツ本体 */}
            <div key={nav.pageKey} className="sg-page-transition" {...(nav.activeTabId !== '__kanban__' ? getContainerHandlers(nav.currentFolder?.id) : {})}>
              {nav.activeTabId === '__kanban__' ? (
                <KanbanBoard
                  kanbanColumns={kanbanColumns}
                  allMeta={allMeta}
                  dueDates={dueDates}
                  onMoveItem={moveKanbanItem}
                  onContextMenu={onKanbanContext}
                  onOpen={(id) => {
                    const item = [...kanbanColumns.todo, ...kanbanColumns.doing, ...kanbanColumns.done].find((i) => i.id === id)
                    if (item) window.open(item.url, '_blank')
                  }}
                  onReload={async () => { await pullKanbanFromSync(); await reloadKanban() }}
                />
              ) : nav.activeTabId === '__github__' ? (
                <GitHubActivityView
                  items={github.items}
                  login={github.login}
                  loading={github.loading}
                  error={github.error}
                  onRefresh={github.refresh}
                />
              ) : searchResults ? (
                <div className="sg-dial">
                  <h2 className="sg-section-heading">{t.searchResults(query, searchResults.length)}</h2>
                  {searchResults.length > 0 ? (
                    <TabMarkGrid
                      items={searchResults}
                      onContextMenu={onBookmarkContext}
                      onTrackUsage={trackUsage}
                      getDragHandlers={getDragHandlers}
                      dragState={dragState}
                    />
                  ) : (
                    <>
                      <div className="sg-empty"><div className="sg-empty__icon"><Icon name="search" size={48} /></div><p className="sg-empty__text">{t.noSearchResults}</p></div>
                      <div className="sg-web-search-hint">
                        <span>{t.webSearchHint} </span>
                        <button type="button" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_self')}>
                          {t.webSearchAction(query)}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : nav.allItems ? (
                <div className="sg-dial">
                  <div className="sg-toolbar">
                    <ContentToolbar layout={settings.layout} sort={settings.sort} onChangeLayout={setLayout} onChangeSort={handleChangeSort} t={t} />
                  </div>
                  {pinnedItems.length > 0 && (
                    <section className="sg-pinned-section">
                      <h2 className="sg-section-heading sg-pinned-section__heading"><Icon name="pin" size={11} /> {t.pinnedSection}</h2>
                      <TabMarkGrid
                        items={pinnedItems}
                        onContextMenu={onBookmarkContext}
                        onTrackUsage={trackUsage}
                        getDragHandlers={getDragHandlers}
                        dragState={dragState}
                        pinnedUrls={pinnedUrls}
                      />
                    </section>
                  )}
                  <h2 className="sg-section-heading">{t.allBookmarks} ({nav.allItems.length})</h2>
                  {isTabmark ? (
                    <TabMarkGrid
                      items={applyFiltersAndSort(nav.allItems)}
                      onContextMenu={onBookmarkContext}
                      onTrackUsage={trackUsage}
                      getDragHandlers={getDragHandlers}
                      dragState={dragState}
                      pinnedUrls={pinnedUrls}
                    />
                  ) : (
                    <BookmarkGrid
                      items={applyFiltersAndSort(nav.allItems)}
                      gridClass={gridClass}
                      onContextMenu={onBookmarkContext}
                      onOpen={trackUsage}
                      getDragHandlers={getDragHandlers}
                      dragState={dragState}
                      allMeta={allMeta}
                      pinnedUrls={pinnedUrls}
                    />
                  )}
                </div>
              ) : groups.length === 0 ? (
                <div className="sg-empty"><div className="sg-empty__icon"><Icon name="folder" size={48} /></div><p className="sg-empty__text sg-preline">{t.noGroups}</p></div>
              ) : nav.currentFolder ? (
                <div className="sg-dial">
                  <div className="sg-toolbar">
                    <ContentToolbar layout={settings.layout} sort={settings.sort} onChangeLayout={setLayout} onChangeSort={handleChangeSort} t={t} />
                    {allTagsInFolder.length > 0 && (
                      <div className="sg-tags">
                        <button className={`sg-tag ${!filterTag ? 'sg-tag--active' : ''}`} onClick={() => setFilterTag(null)}>{t.allTags}</button>
                        {allTagsInFolder.map((tag) => (<button key={tag} className={`sg-tag ${filterTag === tag ? 'sg-tag--active' : ''}`} onClick={() => setFilterTag(filterTag === tag ? null : tag)}>{tag}</button>))}
                      </div>
                    )}
                    {settings.ai.provider !== 'none' && nav.currentFolder && nav.currentFolder.items.length > 0 && (
                      <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={() => setShowAiCategorize(true)}><Icon name="bot" size={12} /> {t.aiCategorizeBtn}</button>
                    )}
                    <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={() => crud.setShowAddForm(!crud.showAddForm)}>{crud.showAddForm ? t.cancel : t.addBookmark('Ctrl')}</button>
                    <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={() => { crud.setCreatingGroup('subfolder'); crud.setNewGroupName('') }}>{t.newFolder}</button>
                  </div>

                  {crud.showAddForm && (<div className="sg-add-form-wrapper"><AddBookmarkForm onAdd={crud.handleAddBookmark} onCancel={() => crud.setShowAddForm(false)} t={t} aiSettings={settings.ai} /></div>)}
                  {crud.creatingGroup === 'subfolder' && (
                    <div className="sg-add-form-wrapper"><div className="sg-add-form">
                      <input className="sg-add-form__input" placeholder={t.groupNamePlaceholder} value={crud.newGroupName} onChange={(e) => crud.setNewGroupName(e.target.value)} onBlur={crud.handleCreateSubfolder} onKeyDown={(e) => { if (isComposing(e)) return; if (e.key === 'Enter') crud.handleCreateSubfolder(); if (e.key === 'Escape') crud.setCreatingGroup(false) }} autoFocus />
                    </div></div>
                  )}

                  <h2 className="sg-section-heading">{nav.currentFolder.title}</h2>

                  {nav.currentFolder.children.length === 0 && nav.currentFolder.items.length === 0 ? (
                    <div className="sg-empty"><div className="sg-empty__icon"><Icon name="pin" size={48} /></div><p className="sg-empty__text sg-preline">{t.emptyFolder}</p></div>
                  ) : isTabmark ? (
                    <TabMarkGrid
                      items={applyFiltersAndSort(nav.currentFolder.items)}
                      folders={nav.currentFolder.children}
                      onSelectFolder={handleSelectTab}
                      onContextMenu={onBookmarkContext}
                      onTrackUsage={trackUsage}
                      getDragHandlers={getDragHandlers}
                      dragState={dragState}
                      pinnedUrls={pinnedUrls}
                    />
                  ) : (
                    <FolderSection
                      key={nav.currentFolder.id}
                      group={nav.currentFolder}
                      depth={0}
                      collapsedIds={collapsedIds}
                      onToggleCollapse={toggleCollapse}
                      gridClass={gridClass}
                      onBookmarkContext={onBookmarkContext}
                      onFolderContext={onFolderContext}
                      applyFiltersAndSort={applyFiltersAndSort}
                      allMeta={allMeta}
                      selectedIds={selectedIds}
                      toggleSelect={toggleSelect}
                      getDragHandlers={getDragHandlers}
                      dragState={dragState}
                      pinnedUrls={pinnedUrls}
                      renamingFolderId={crud.renamingFolderId}
                      onStartRename={crud.setRenamingFolderId}
                      onFolderRename={crud.handleFolderRename}
                    />
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </main>

        {/* 右: アクションバー */}
        <RightActionBar
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          onOpenSettings={() => setShowSettings(true)}
          onOpenTrash={() => setShowTrash(true)}
          onOpenHelp={() => setShowHelp(true)}
          onToggleKanban={() => handleSelectTab(nav.activeTabId === '__kanban__' ? '__all__' : '__kanban__')}
          isKanbanActive={nav.activeTabId === '__kanban__'}
          t={t}
        />
      </div>

      {/* モーダル類（レイアウト外） */}
      {crud.editItem && (<EditBookmarkModal item={crud.editItem} onSave={crud.handleSaveBookmark} onDelete={crud.handleDeleteBookmark} onClose={() => crud.setEditItem(null)} t={t} initialTags={allMeta[crud.editItem.id]?.tags} aiSettings={settings.ai} />)}
      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={closeCtxMenu} />}
      {showSettings && (<SettingsPanel settings={settings} groups={groups} t={t} onUpdateSettings={updateSettings} onClose={() => setShowSettings(false)} onRefresh={refresh} onStartTour={startTour} />)}
      {confirmDialog && (<ConfirmDialog message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} confirmLabel={confirmDialog.confirmLabel} t={t} />)}
      {showTrash && (<TrashPanel onClose={() => setShowTrash(false)} onRestored={refresh} t={t} locale={settings.locale} />)}
      {showShortcutsPanel && (<KeyboardShortcutsPanel settings={settings} onUpdateSettings={updateSettings} onClose={() => setShowShortcutsPanel(false)} t={t} />)}
      {showHelp && (<HelpPanel onClose={() => setShowHelp(false)} t={t} />)}
      {dueDateTarget && (
        <DueDateModal
          targetId={dueDateTarget}
          dueDates={dueDates}
          onSetDueDate={setDueDate}
          onClose={() => setDueDateTarget(null)}
          t={t}
        />
      )}
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
        { target: '.sg-center-search__input', title: t.featureSearch, description: t.tourSearch },
        { target: '.sg-action-bar', title: t.featureLayout, description: t.tourLayout, position: 'bottom' },
        { target: '.sg-sidebar', title: t.addBookmark('Ctrl'), description: t.tourAdd },
        { target: '.sg-action-bar__btn:last-child', title: t.settings, description: t.tourSettings },
      ]} onComplete={completeTour} t={t} />)}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} dismissLabel={t.toastDismiss} />
      {showPalette && (
        <CommandPalette
          groups={groups}
          lastUsed={lastUsed}
          onClose={() => setShowPalette(false)}
        />
      )}
    </I18nProvider>
  )
}
