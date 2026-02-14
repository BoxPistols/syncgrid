import type { SyncGridGroup } from '../types'
import type { Messages } from '../i18n'
import type { DragHandlers } from '../hooks/useDragReorder'

interface Props {
  group: SyncGridGroup
  onClick: (group: SyncGridGroup) => void
  onContextMenu: (group: SyncGridGroup, x: number, y: number) => void
  t: Messages
  dragHandlers?: DragHandlers
  isDragging?: boolean
  isDropTarget?: boolean
  dropMode?: 'before' | 'after' | 'into' | null
}

export function FolderCard({ group, onClick, onContextMenu, t, dragHandlers, isDragging, isDropTarget, dropMode }: Props) {
  const totalItems = countAll(group)

  const className = [
    'sg-folder-card',
    isDragging && 'sg-folder-card--dragging',
    isDropTarget && dropMode === 'before' && 'sg-folder-card--drop-before',
    isDropTarget && dropMode === 'after' && 'sg-folder-card--drop-after',
    isDropTarget && dropMode === 'into' && 'sg-folder-card--drop-into',
  ].filter(Boolean).join(' ')

  return (
    <div className={className} role="button" tabIndex={0}
      onClick={() => onClick(group)}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(group) }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(group, e.clientX, e.clientY) }}
      {...dragHandlers}
    >
      <div className="sg-folder-card__icon">📁</div>
      <span className="sg-folder-card__title">{group.title}</span>
      <span className="sg-folder-card__count">{t.items(totalItems)}</span>
      <button className="sg-folder-card__menu"
        onClick={(e) => { e.stopPropagation(); onContextMenu(group, e.clientX, e.clientY) }}
        title="⋯">⋯</button>
    </div>
  )
}

function countAll(g: SyncGridGroup): number {
  return g.items.length + g.children.reduce((sum, c) => sum + countAll(c), 0)
}
