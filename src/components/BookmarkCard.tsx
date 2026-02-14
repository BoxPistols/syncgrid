import { useState } from 'react'
import { getFaviconUrl, getDomain } from '../utils/favicon'
import type { SyncGridItem } from '../types'
import type { DragHandlers } from '../hooks/useDragReorder'

interface Props {
  item: SyncGridItem
  onContextMenu: (item: SyncGridItem, x: number, y: number) => void
  dragHandlers?: DragHandlers
  isDragging?: boolean
  isDropTarget?: boolean
  dropMode?: 'before' | 'after' | 'into' | null
}

export function BookmarkCard({ item, onContextMenu, dragHandlers, isDragging, isDropTarget, dropMode }: Props) {
  const [imgFailed, setImgFailed] = useState(false)
  const domain = getDomain(item.url)
  const initial = domain.charAt(0).toUpperCase()

  const className = [
    'sg-card',
    isDragging && 'sg-card--dragging',
    isDropTarget && dropMode === 'before' && 'sg-card--drop-before',
    isDropTarget && dropMode === 'after' && 'sg-card--drop-after',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={className}
      role="link"
      tabIndex={0}
      onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
      onKeyDown={(e) => { if (e.key === 'Enter') window.open(item.url, '_blank') }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(item, e.clientX, e.clientY) }}
      {...dragHandlers}
    >
      <div className="sg-card__icon">
        {imgFailed ? (
          <div className="sg-favicon sg-favicon--lg">{initial}</div>
        ) : (
          <img
            src={getFaviconUrl(item.url, 64)}
            alt="" width={48} height={48} loading="lazy" draggable={false}
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <span className="sg-card__title">{item.title}</span>
      <span className="sg-card__domain">{domain}</span>
      <button
        className="sg-card__menu"
        onClick={(e) => { e.stopPropagation(); onContextMenu(item, e.clientX, e.clientY) }}
        title="メニュー"
      >⋯</button>
    </div>
  )
}
