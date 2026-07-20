import { memo, useCallback } from 'react'
import type { SyncGridItem, BookmarkMeta, KanbanColumn as KanbanColumnType } from '../types'
import { KanbanCard } from './KanbanCard'
import { useI18nContext } from '../context/i18n-context'

interface Props {
  column: KanbanColumnType
  title: string
  items: SyncGridItem[]
  allMeta: Record<string, BookmarkMeta>
  dueDates: Map<string, number>
  onContextMenu: (item: SyncGridItem, x: number, y: number) => void
  onOpen: (id: string) => void
  // D&D state
  draggingId: string | null
  dropTargetId: string | null
  dropMode: 'before' | 'after' | null
  isColumnDropTarget: boolean
  // D&D handlers
  onCardDragStart: (e: React.DragEvent, bookmarkId: string) => void
  onCardDragOver: (e: React.DragEvent, bookmarkId: string) => void
  onCardDragLeave: (e: React.DragEvent, bookmarkId: string) => void
  onCardDrop: (e: React.DragEvent, bookmarkId: string) => void
  onCardDragEnd: () => void
  onColumnDragOver: (e: React.DragEvent, column: KanbanColumnType) => void
  onColumnDragLeave: (e: React.DragEvent) => void
  onColumnDrop: (e: React.DragEvent, column: KanbanColumnType) => void
}

export const KanbanColumnComponent = memo(function KanbanColumnComponent({
  column,
  title,
  items,
  allMeta,
  dueDates,
  onContextMenu,
  onOpen,
  draggingId,
  dropTargetId,
  dropMode,
  isColumnDropTarget,
  onCardDragStart,
  onCardDragOver,
  onCardDragLeave,
  onCardDrop,
  onCardDragEnd,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
}: Props) {
  const { t } = useI18nContext()
  const handleColumnDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      onColumnDragOver(e, column)
    },
    [column, onColumnDragOver],
  )

  const handleColumnDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      onColumnDrop(e, column)
    },
    [column, onColumnDrop],
  )

  const cls = [
    'sg-kanban-col',
    isColumnDropTarget && 'sg-kanban-col--drop-target',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      onDragOver={handleColumnDragOver}
      onDragLeave={onColumnDragLeave}
      onDrop={handleColumnDrop}
    >
      <div className="sg-kanban-col__header">
        <span>{title}</span>
        <span className="sg-kanban-col__count">{items.length}</span>
      </div>
      <div className="sg-kanban-col__body">
        {items.length === 0 ? (
          <div className="sg-kanban-col__empty">{t.kanbanColumnEmpty}</div>
        ) : (
          items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              meta={allMeta[item.id]}
              dueDate={dueDates.get(item.id)}
              onContextMenu={onContextMenu}
              onOpen={onOpen}
              isDragging={draggingId === item.id}
              isDropBefore={dropTargetId === item.id && dropMode === 'before'}
              isDropAfter={dropTargetId === item.id && dropMode === 'after'}
              onDragStart={onCardDragStart}
              onDragOver={onCardDragOver}
              onDragLeave={onCardDragLeave}
              onDrop={onCardDrop}
              onDragEnd={onCardDragEnd}
            />
          ))
        )}
      </div>
    </div>
  )
})
