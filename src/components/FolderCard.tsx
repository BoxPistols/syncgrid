import { Icon } from './Icon'
import type { SyncGridGroup } from '../types'
import type { Messages } from '../i18n'
import type { DragHandlers } from '../hooks/useDragReorder'
import { countAll } from '../utils/bookmarks'

interface Props {
  group: SyncGridGroup
  onClick: (group: SyncGridGroup) => void
  onContextMenu: (group: SyncGridGroup, x: number, y: number) => void
  t: Messages
  dragHandlers?: DragHandlers
  isDragging?: boolean
  isDropTarget?: boolean
  dropMode?: 'before' | 'after' | 'into' | null
  isSelected?: boolean
  onToggleSelect?: (id: string, e: React.MouseEvent) => boolean
}

export function FolderCard({
  group,
  onClick,
  onContextMenu,
  t,
  dragHandlers,
  isDragging,
  isDropTarget,
  dropMode,
  isSelected,
  onToggleSelect,
}: Props) {
  const totalItems = countAll(group)

  const className = [
    'sg-folder-card',
    isSelected && 'sg-folder-card--selected',
    isDragging && 'sg-folder-card--dragging',
    isDropTarget && dropMode === 'before' && 'sg-folder-card--drop-before',
    isDropTarget && dropMode === 'after' && 'sg-folder-card--drop-after',
    isDropTarget && dropMode === 'into' && 'sg-folder-card--drop-into',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (onToggleSelect?.(group.id, e)) return
        onClick(group)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(group)
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu(group, e.clientX, e.clientY)
      }}
      {...dragHandlers}
    >
      <div className="sg-folder-card__icon"><Icon name="folder" size={24} /></div>
      <span className="sg-folder-card__title">{group.title}</span>
      <span className="sg-folder-card__count">{t.items(totalItems)}</span>
      <button
        className="sg-folder-card__menu"
        onClick={(e) => {
          e.stopPropagation()
          onContextMenu(group, e.clientX, e.clientY)
        }}
        aria-label={t.menu}
      >
        <Icon name="more" size={14} />
      </button>
    </div>
  )
}
