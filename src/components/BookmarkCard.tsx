import { useState, useRef, useCallback, useEffect, memo } from 'react'
import { getFaviconUrl, getDomain } from '../utils/favicon'
import { formatRelativeDate } from '../utils/date'
import { UrlPreview } from './UrlPreview'
import type { SyncGridItem, OgpData } from '../types'
import { Icon } from './Icon'
import { isComposing } from '../utils/keyboard'
import type { DragHandlers } from '../hooks/useDragReorder'
import { useI18nContext } from '../context/i18n-context'

interface Props {
  item: SyncGridItem
  onContextMenu: (item: SyncGridItem, x: number, y: number) => void
  dragHandlers?: DragHandlers
  isDragging?: boolean
  isDropTarget?: boolean
  dropMode?: 'before' | 'after' | null
  isPinned?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: string, e: React.MouseEvent) => boolean
  tags?: string[]
  onOpen?: (id: string) => void
  ogp?: OgpData
}

export const BookmarkCard = memo(function BookmarkCard({ item, onContextMenu, dragHandlers, isDragging, isDropTarget, dropMode, isPinned, isSelected, onToggleSelect, tags, onOpen, ogp }: Props) {
  const { t, locale } = useI18nContext()
  const [imgFailed, setImgFailed] = useState(false)
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const domain = getDomain(item.url)
  const initial = domain.charAt(0).toUpperCase()

  // スクロール時にプレビュー消す
  useEffect(() => {
    if (!preview) return
    const handleScroll = () => {
      clearTimeout(hoverTimer.current)
      setPreview(null)
    }
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [preview])

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (isDragging) return // ドラッグ中はプレビュー表示しない
    clearTimeout(leaveTimer.current)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    hoverTimer.current = setTimeout(() => {
      setPreview({ x: rect.left, y: rect.bottom })
    }, 600)
  }, [isDragging])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current)
    // 即座に消す（ちらつき防止の微小遅延）
    leaveTimer.current = setTimeout(() => setPreview(null), 50)
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
        data-sg-card-id={item.id}
        role="link"
        tabIndex={0}
        onClick={(e) => {
          if (onToggleSelect?.(item.id, e)) return
          window.open(item.url, '_blank', 'noopener,noreferrer')
          onOpen?.(item.id)
        }}
        onKeyDown={(e) => {
          if (isComposing(e)) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            window.open(item.url, '_blank', 'noopener,noreferrer')
          onOpen?.(item.id)
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
        {ogp?.image ? (
          <div className="sg-card__ogp-image">
            <img src={ogp.image} alt="" loading="lazy" draggable={false} onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        ) : (
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
        )}
        <span className="sg-card__title">
          {isPinned && <span className="sg-card__pin-badge" aria-hidden="true"><Icon name="pin" size={10} /></span>}
          {item.title}
        </span>
        {ogp?.description && (
          <p className="sg-card__desc">{ogp.description}</p>
        )}
        {tags && tags.length > 0 && (
          <div className="sg-tags sg-card__tags">
            {tags.map((tag) => (
              <span key={tag} className="sg-tag">{tag}</span>
            ))}
          </div>
        )}
        <span className="sg-card__meta">
          <span className="sg-card__domain">{domain}</span>
          <span className="sg-card__date">{formatRelativeDate(item.dateAdded, locale)}</span>
        </span>
        <button
          className="sg-card__menu"
          onClick={(e) => {
            e.stopPropagation()
            onContextMenu(item, e.clientX, e.clientY)
          }}
          aria-label={t.menu}
        >
          <Icon name="more" size={14} />
        </button>
      </div>
      {preview && (
        <UrlPreview url={item.url} bookmarkId={item.id} x={preview.x} y={preview.y} />
      )}
    </>
  )
})
