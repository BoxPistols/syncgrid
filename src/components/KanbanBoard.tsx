import { useState, useCallback, useRef, memo } from 'react'
import type { SyncGridItem, BookmarkMeta, KanbanColumn } from '../types'
import { KanbanColumnComponent } from './KanbanColumn'
import { Icon } from './Icon'
import type { Messages } from '../i18n'

interface Props {
  kanbanColumns: Record<KanbanColumn, SyncGridItem[]>
  allMeta: Record<string, BookmarkMeta>
  dueDates: Map<string, number>
  locale: string
  onMoveItem: (bookmarkId: string, toColumn: KanbanColumn, toOrder: number) => void
  onContextMenu: (item: SyncGridItem, x: number, y: number) => void
  onOpen: (id: string) => void
  onMarkRead?: (id: string) => void
  onReload: () => void
  t: Messages
}

interface DragData {
  bookmarkId: string
  fromColumn: KanbanColumn | null
}

const COLUMNS: { key: KanbanColumn; labelKey: 'kanbanTodo' | 'kanbanDoing' | 'kanbanDone' }[] = [
  { key: 'todo', labelKey: 'kanbanTodo' },
  { key: 'doing', labelKey: 'kanbanDoing' },
  { key: 'done', labelKey: 'kanbanDone' },
]

export const KanbanBoard = memo(function KanbanBoard({
  kanbanColumns,
  allMeta,
  dueDates,
  locale,
  onMoveItem,
  onContextMenu,
  onOpen,
  onMarkRead,
  onReload,
  t,
}: Props) {
  const [syncing, setSyncing] = useState(false)

  const handleSync = useCallback(async () => {
    setSyncing(true)
    await onReload()
    setTimeout(() => setSyncing(false), 600)
  }, [onReload])

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dropMode, setDropMode] = useState<'before' | 'after' | null>(null)
  const [dropColumn, setDropColumn] = useState<KanbanColumn | null>(null)
  const dragDataRef = useRef<DragData | null>(null)

  const totalItems = kanbanColumns.todo.length + kanbanColumns.doing.length + kanbanColumns.done.length

  // --- カード D&D ハンドラ ---
  const handleCardDragStart = useCallback(
    (e: React.DragEvent, bookmarkId: string) => {
      // どの列にいるか特定
      let fromColumn: KanbanColumn | null = null
      for (const col of COLUMNS) {
        if (kanbanColumns[col.key].some((i) => i.id === bookmarkId)) {
          fromColumn = col.key
          break
        }
      }
      dragDataRef.current = { bookmarkId, fromColumn }
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', bookmarkId)
      setTimeout(() => setDraggingId(bookmarkId), 0)
    },
    [kanbanColumns],
  )

  const handleCardDragOver = useCallback(
    (e: React.DragEvent, targetBookmarkId: string) => {
      const data = dragDataRef.current
      if (!data || data.bookmarkId === targetBookmarkId) return
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = 'move'

      const rect = e.currentTarget.getBoundingClientRect()
      const relY = (e.clientY - rect.top) / rect.height
      const mode: 'before' | 'after' = relY < 0.5 ? 'before' : 'after'

      setDropTargetId(targetBookmarkId)
      setDropMode(mode)
      setDropColumn(null)
    },
    [],
  )

  const handleCardDragLeave = useCallback(
    (e: React.DragEvent, targetBookmarkId: string) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDropTargetId((prev) => (prev === targetBookmarkId ? null : prev))
        setDropMode(null)
      }
    },
    [],
  )

  const handleCardDrop = useCallback(
    (e: React.DragEvent, targetBookmarkId: string) => {
      e.preventDefault()
      e.stopPropagation()
      const data = dragDataRef.current
      if (!data || data.bookmarkId === targetBookmarkId) return

      // ターゲットがどの列にいるか特定
      let targetColumn: KanbanColumn | null = null
      let targetIndex = 0
      for (const col of COLUMNS) {
        const idx = kanbanColumns[col.key].findIndex((i) => i.id === targetBookmarkId)
        if (idx >= 0) {
          targetColumn = col.key
          targetIndex = idx
          break
        }
      }
      if (!targetColumn) return

      const rect = e.currentTarget.getBoundingClientRect()
      const relY = (e.clientY - rect.top) / rect.height
      const order = relY < 0.5 ? targetIndex : targetIndex + 1

      onMoveItem(data.bookmarkId, targetColumn, order)
      if (targetColumn === 'done' && onMarkRead) onMarkRead(data.bookmarkId)
      resetDrag()
    },
    [kanbanColumns, onMoveItem, onMarkRead],
  )

  const handleCardDragEnd = useCallback(() => {
    resetDrag()
  }, [])

  // --- 列への直接ドロップ（空列やカード外のエリア） ---
  const handleColumnDragOver = useCallback(
    (_e: React.DragEvent, column: KanbanColumn) => {
      setDropColumn(column)
      setDropTargetId(null)
      setDropMode(null)
    },
    [],
  )

  const handleColumnDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDropColumn(null)
      }
    },
    [],
  )

  const handleColumnDrop = useCallback(
    (e: React.DragEvent, column: KanbanColumn) => {
      e.preventDefault()
      const data = dragDataRef.current
      if (!data) return

      const order = kanbanColumns[column].length
      onMoveItem(data.bookmarkId, column, order)
      if (column === 'done' && onMarkRead) onMarkRead(data.bookmarkId)
      resetDrag()
    },
    [kanbanColumns, onMoveItem, onMarkRead],
  )

  function resetDrag() {
    dragDataRef.current = null
    setDraggingId(null)
    setDropTargetId(null)
    setDropMode(null)
    setDropColumn(null)
  }

  if (totalItems === 0) {
    return (
      <div className="sg-kanban sg-kanban--empty">
        <div className="sg-kanban__empty-state">
          <Icon name="columns" size={48} className="sg-kanban__empty-icon" />
          <p className="sg-kanban__empty-text">{t.kanbanEmpty}</p>
          <button className="sg-btn sg-btn--sm sg-btn--ghost sg-kanban__sync-btn" onClick={handleSync} disabled={syncing}>
            <Icon name="refresh" size={12} className={syncing ? 'sg-icon--spin' : ''} /> Sync
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="sg-kanban">
      <div className="sg-kanban__toolbar">
        <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={handleSync} title="Sync" disabled={syncing}>
          <Icon name="refresh" size={12} className={syncing ? 'sg-icon--spin' : ''} /> Sync
        </button>
      </div>
      <div className="sg-kanban__columns">
        {COLUMNS.map((col) => (
          <KanbanColumnComponent
            key={col.key}
            column={col.key}
            title={t[col.labelKey]}
            items={kanbanColumns[col.key]}
            allMeta={allMeta}
            dueDates={dueDates}
            locale={locale}
            onContextMenu={onContextMenu}
            onOpen={onOpen}
            t={t}
            draggingId={draggingId}
            dropTargetId={dropTargetId}
            dropMode={dropMode}
            isColumnDropTarget={dropColumn === col.key}
            onCardDragStart={handleCardDragStart}
            onCardDragOver={handleCardDragOver}
            onCardDragLeave={handleCardDragLeave}
            onCardDrop={handleCardDrop}
            onCardDragEnd={handleCardDragEnd}
            onColumnDragOver={handleColumnDragOver}
            onColumnDragLeave={handleColumnDragLeave}
            onColumnDrop={handleColumnDrop}
          />
        ))}
      </div>
    </div>
  )
})
