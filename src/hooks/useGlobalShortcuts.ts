import { useEffect, useCallback, useRef } from 'react'
import { isComposing, matchesBinding } from '../utils/keyboard'
import { getRootId } from '../utils/bookmarks'
import type { ShortcutConfig, SyncGridGroup, LayoutMode } from '../types'

interface GlobalShortcutsDeps {
  shortcuts: ShortcutConfig
  selectedIds: Set<string>
  activeTabId: string
  groups: SyncGridGroup[]
  refresh: () => Promise<void> | void
  handleSelectTab: (id: string) => void
  openAddForm: () => void
  setLayout: (layout: LayoutMode) => void
  handleDeleteSelected: () => void
  selectAll: () => void
  clearSelection: () => void
  toggleShortcutsPanel: () => void
  togglePalette: () => void
}

/**
 * グローバルキーボードショートカット一式。
 * - 設定済みバインド（検索/追加/レイアウト/削除/全選択）
 * - K: カンバン切替、Cmd/Ctrl+K: コマンドパレット
 * - Cmd+[ / Cmd+]: アクティブタブの並び替え
 * - 数字キー連続入力でタブ切替（0始まり、2桁以上対応）
 */
export function useGlobalShortcuts({
  shortcuts,
  selectedIds,
  activeTabId,
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
}: GlobalShortcutsDeps): void {
  // 数字キー連続入力バッファ（refパターンでリスナー再登録を増やさない）
  const tabDigitBuf = useRef('')
  const tabDigitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const groupsRef = useRef(groups)
  const handleSelectTabRef = useRef(handleSelectTab)
  useEffect(() => {
    groupsRef.current = groups
  }, [groups])
  useEffect(() => {
    handleSelectTabRef.current = handleSelectTab
  }, [handleSelectTab])

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

  // --- Tab Reorder (Cmd+[ / Cmd+]) ---
  const handleMoveTab = useCallback(async (direction: -1 | 1) => {
    if (activeTabId === '__all__') return
    const rootId = await getRootId()
    const [rootTree] = await chrome.bookmarks.getSubTree(rootId)
    const children = rootTree.children ?? []
    const sourceIdx = children.findIndex((c) => c.id === activeTabId)
    if (sourceIdx < 0) return
    const targetIdx = sourceIdx + direction
    if (targetIdx < 0 || targetIdx >= children.length) return
    // 前方→後方移動時は+1補正（chrome.bookmarks.move仕様）
    const moveIdx = direction > 0 ? targetIdx + 1 : targetIdx
    await chrome.bookmarks.move(activeTabId, { parentId: rootId, index: moveIdx })
    await refresh()
  }, [activeTabId, refresh])

  useEffect(() => {
    const sc = shortcuts
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isComposing(e)) return
      if (matchesBinding(e, sc.search)) { e.preventDefault(); document.querySelector<HTMLInputElement>('.sg-center-search__input')?.focus() }
      else if (matchesBinding(e, sc.addBookmark)) { e.preventDefault(); openAddForm() }
      else if (matchesBinding(e, sc.layoutTabmark)) { e.preventDefault(); setLayout('tabmark') }
      else if (matchesBinding(e, sc.layoutList)) { e.preventDefault(); setLayout('list') }
      else if (matchesBinding(e, sc.deleteSelected) && selectedIds.size > 0) { e.preventDefault(); handleDeleteSelected() }
      else if (matchesBinding(e, sc.selectAll)) { e.preventDefault(); selectAll() }
      else if (e.key === 'Escape' && selectedIds.size > 0) clearSelection()
      else if (e.key === '?' && !e.ctrlKey && !e.metaKey) toggleShortcutsPanel()
      // K でカンバン切替（入力欄以外）
      else if (e.key === 'k' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
        e.preventDefault()
        handleSelectTab(activeTabId === '__kanban__' ? '__all__' : '__kanban__')
      }
      // Cmd/Ctrl+K コマンドパレット
      else if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); togglePalette() }
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
  }, [shortcuts, selectedIds, handleDeleteSelected, setLayout, selectAll, clearSelection, commitTabDigit, handleMoveTab, handleSelectTab, activeTabId, openAddForm, toggleShortcutsPanel, togglePalette])
}
