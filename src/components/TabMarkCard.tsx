import { useState, useCallback, useRef, useEffect, memo } from 'react'
import { getFaviconUrl, getDomain } from '../utils/favicon'
import { getCardColor } from '../utils/cardColor'
import { UrlPreview } from './UrlPreview'
import { Icon } from './Icon'
import type { SyncGridItem, SyncGridGroup } from '../types'
import type { DragHandlers } from '../hooks/useDragReorder'

interface BookmarkProps {
  item: SyncGridItem
  onContextMenu: (item: SyncGridItem, x: number, y: number) => void
  onTrackUsage?: (id: string) => void
  dragHandlers?: DragHandlers
  isDragging?: boolean
  isDropTarget?: boolean
  dropMode?: 'before' | 'after' | null
  isPinned?: boolean
}

interface FolderProps {
  group: SyncGridGroup
  onSelect: (id: string) => void
  dragHandlers?: DragHandlers
  isDragging?: boolean
  isDropTarget?: boolean
}

export const TabMarkFolderCard = memo(function TabMarkFolderCard({
  group,
  onSelect,
  dragHandlers,
  isDragging,
  isDropTarget,
}: FolderProps) {
  const bgColor = getCardColor(group.title)
  const cls = [
    'sg-tm-card sg-tm-card--folder',
    isDragging ? 'sg-tm-card--dragging' : '',
    isDropTarget ? 'sg-tm-card--drop-into' : '',
  ].filter(Boolean).join(' ')

  return (
    <button
      className={cls}
      style={{ '--tm-card-bg': bgColor } as React.CSSProperties}
      onClick={() => onSelect(group.id)}
      title={group.title}
      aria-label={group.title}
      data-sg-card-id={group.id}
      {...dragHandlers}
    >
      <Icon name="folder" size={24} />
      <span className="sg-tm-card__title">{group.title}</span>
      <span className="sg-tm-card__count">{group.items.length + group.children.length}件</span>
    </button>
  )
})

export const TabMarkCard = memo(function TabMarkCard({
  item,
  onContextMenu,
  onTrackUsage,
  dragHandlers,
  isDragging,
  isDropTarget,
  dropMode,
  isPinned,
}: BookmarkProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const domain = getDomain(item.url)
  const initial = domain.charAt(0).toUpperCase()
  const faviconUrl = getFaviconUrl(item.url, 32)
  const bgColor = getCardColor(domain)

  useEffect(() => {
    if (!preview) return
    const onScroll = () => { clearTimeout(hoverTimer.current); setPreview(null) }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [preview])

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (isDragging) return
    clearTimeout(leaveTimer.current)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    hoverTimer.current = setTimeout(() => {
      setPreview({ x: rect.left, y: rect.bottom })
    }, 600)
  }, [isDragging])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current)
    leaveTimer.current = setTimeout(() => setPreview(null), 50)
  }, [])

  const cls = [
    'sg-tm-card',
    isDragging ? 'sg-tm-card--dragging' : '',
    isDropTarget && dropMode === 'before' ? 'sg-tm-card--drop-before' : '',
    isDropTarget && dropMode === 'after'  ? 'sg-tm-card--drop-after'  : '',
  ].filter(Boolean).join(' ')

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onContextMenu(item, e.clientX, e.clientY)
  }, [item, onContextMenu])

  const handleClick = useCallback(() => {
    onTrackUsage?.(item.id)
  }, [item.id, onTrackUsage])

  return (
    <>
      <a
        href={item.url}
        className={cls}
        style={{ '--tm-card-bg': bgColor } as React.CSSProperties}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        title={item.title || domain}
        aria-label={item.title || domain}
        data-sg-card-id={item.id}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...dragHandlers}
      >
        <div className="sg-tm-card__favicon-wrap">
          {!imgFailed && faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              className="sg-tm-card__favicon"
              width={32}
              height={32}
              onError={() => setImgFailed(true)}
              draggable={false}
              aria-hidden="true"
            />
          ) : (
            <span className="sg-tm-card__favicon-fallback" aria-hidden="true">
              {initial}
            </span>
          )}
        </div>
        <span className="sg-tm-card__title">{item.title || domain}</span>
        <span className="sg-tm-card__domain">{domain}</span>
        {isPinned && (
          <span className="sg-tm-card__pin-badge" aria-hidden="true">
            <Icon name="pin" size={9} />
          </span>
        )}
      </a>
      {preview && (
        <UrlPreview url={item.url} bookmarkId={item.id} x={preview.x} y={preview.y} />
      )}
    </>
  )
})
