import { useState, useRef, useCallback } from 'react'
import { getFaviconUrl, getDomain } from '../utils/favicon'
import { formatRelativeDate } from '../utils/date'
import { UrlPreview } from './UrlPreview'
import type { SyncGridItem } from '../types'
import type { DragHandlers } from '../hooks/useDragReorder'
import type { Messages } from '../i18n'

interface Props {
  item: SyncGridItem
  onContextMenu: (item: SyncGridItem, x: number, y: number) => void
  dragHandlers?: DragHandlers
  isDragging?: boolean
  isDropTarget?: boolean
  dropMode?: 'before' | 'after' | null
  t: Messages
  locale?: string
  isSelected?: boolean
  onToggleSelect?: (id: string, e: React.MouseEvent) => boolean
  tags?: string[]
}

export function BookmarkCard({ item, onContextMenu, dragHandlers, isDragging, isDropTarget, dropMode, t, locale, isSelected, onToggleSelect, tags }: Props) {
  const [imgFailed, setImgFailed] = useState(false)
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const domain = getDomain(item.url)
  const initial = domain.charAt(0).toUpperCase()

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    hoverTimer.current = setTimeout(() => {
      setPreview({ x: rect.left, y: rect.bottom })
    }, 600) // 600ms遅延でプレビュー表示
  }, [])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current)
    setPreview(null)
  }, [])

  const className = [
    'sg-card',
    isSelected && 'sg-card--selected',
    isDragging && 'sg-card--dragging',
    isDropTarget && dropMode === 'before' && 'sg-card--drop-before',
    isDropTarget && dropMode === 'after' && 'sg-card--drop-after',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div
        className={className}
        role="link"
        tabIndex={0}
        onClick={(e) => {
          if (onToggleSelect?.(item.id, e)) return
          window.open(item.url, '_blank', 'noopener,noreferrer')
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            window.open(item.url, '_blank', 'noopener,noreferrer')
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          onContextMenu(item, e.clientX, e.clientY)
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...dragHandlers}
      >
        <div className="sg-card__icon">
          {imgFailed ? (
            <div className="sg-favicon sg-favicon--lg">{initial}</div>
          ) : (
            <img
              src={getFaviconUrl(item.url, 64)}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              draggable={false}
              onError={() => setImgFailed(true)}
            />
          )}
        </div>
        <span className="sg-card__title">{item.title}</span>
        {tags && tags.length > 0 && (
          <div className="sg-tags sg-card__tags">
            {tags.map((tag) => (
              <span key={tag} className="sg-tag">{tag}</span>
            ))}
          </div>
        )}
        <span className="sg-card__date">{formatRelativeDate(item.dateAdded, locale ?? 'ja')}</span>
        <span className="sg-card__domain">{domain}</span>
        <button
          className="sg-card__menu"
          onClick={(e) => {
            e.stopPropagation()
            onContextMenu(item, e.clientX, e.clientY)
          }}
          aria-label={t.menu}
        >
          ⋯
        </button>
      </div>
      {preview && (
        <UrlPreview url={item.url} bookmarkId={item.id} x={preview.x} y={preview.y} />
      )}
    </>
  )
}
