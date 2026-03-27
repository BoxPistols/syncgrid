import { memo, useCallback, useMemo } from 'react'
import { getFaviconUrl, getDomain } from '../utils/favicon'
import type { SyncGridItem, BookmarkMeta } from '../types'
import { Icon } from './Icon'
import type { Messages } from '../i18n'

interface Props {
  item: SyncGridItem
  meta?: BookmarkMeta
  dueDate?: number
  locale: string
  onContextMenu: (item: SyncGridItem, x: number, y: number) => void
  onOpen: (id: string) => void
  isDragging?: boolean
  isDropBefore?: boolean
  isDropAfter?: boolean
  t: Messages
  // D&D
  onDragStart: (e: React.DragEvent, bookmarkId: string) => void
  onDragOver: (e: React.DragEvent, bookmarkId: string) => void
  onDragLeave: (e: React.DragEvent, bookmarkId: string) => void
  onDrop: (e: React.DragEvent, bookmarkId: string) => void
  onDragEnd: () => void
}

function formatDueLabel(dueDate: number, locale: string, t: Messages): { label: string; status: 'overdue' | 'today' | 'tomorrow' | 'normal' } {
  const now = new Date()
  const due = new Date(dueDate)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const tomorrowStart = todayStart + 86400000
  const dayAfterTomorrow = tomorrowStart + 86400000

  if (dueDate < todayStart) {
    return { label: t.kanbanOverdueLabel, status: 'overdue' }
  }
  if (dueDate < tomorrowStart) {
    return { label: t.kanbanDueToday, status: 'today' }
  }
  if (dueDate < dayAfterTomorrow) {
    return { label: t.kanbanDueTomorrow, status: 'tomorrow' }
  }
  const formatted = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(due)
  return { label: formatted, status: 'normal' }
}

export const KanbanCard = memo(function KanbanCard({
  item,
  meta,
  dueDate,
  locale,
  onContextMenu,
  onOpen,
  isDragging,
  isDropBefore,
  isDropAfter,
  t,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: Props) {
  const domain = getDomain(item.url)

  const dueInfo = useMemo(
    () => dueDate ? formatDueLabel(dueDate, locale, t) : null,
    [dueDate, locale, t],
  )

  const handleClick = useCallback(() => {
    onOpen(item.id)
  }, [item.id, onOpen])

  const handleContext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onContextMenu(item, e.clientX, e.clientY)
    },
    [item, onContextMenu],
  )

  const cls = [
    'sg-kanban-card',
    isDragging && 'sg-kanban-card--dragging',
    isDropBefore && 'sg-kanban-card--drop-before',
    isDropAfter && 'sg-kanban-card--drop-after',
    dueInfo?.status === 'overdue' && 'sg-kanban-card--overdue',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      onClick={handleClick}
      onContextMenu={handleContext}
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onDragOver={(e) => onDragOver(e, item.id)}
      onDragLeave={(e) => onDragLeave(e, item.id)}
      onDrop={(e) => onDrop(e, item.id)}
      onDragEnd={onDragEnd}
    >
      <img
        className="sg-kanban-card__favicon"
        src={getFaviconUrl(item.url)}
        alt=""
        width={16}
        height={16}
        loading="lazy"
      />
      <div className="sg-kanban-card__body">
        <span className="sg-kanban-card__title">
          {meta?.ogp?.title || (item.title && item.title !== t.loading ? item.title : domain)}
        </span>
        <div className="sg-kanban-card__meta-row">
          <span className="sg-kanban-card__domain">{domain}</span>
          {dueInfo && (
            <span className={`sg-kanban-card__due sg-kanban-card__due--${dueInfo.status}`}>
              {dueInfo.label}
            </span>
          )}
        </div>
      </div>
      <button
        className="sg-kanban-card__menu"
        onClick={(e) => {
          e.stopPropagation()
          onContextMenu(item, e.clientX, e.clientY)
        }}
        aria-label={t.menu}
      >
        <Icon name="more" size={14} />
      </button>
    </div>
  )
})
