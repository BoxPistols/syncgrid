import { memo } from 'react'
import { BookmarkCard } from './BookmarkCard'
import type { SyncGridItem, BookmarkMeta } from '../types'
import type { DragHandlers, DragState } from '../hooks/useDragReorder'

interface Props {
  items: SyncGridItem[]
  gridClass: string
  onContextMenu: (item: SyncGridItem, x: number, y: number) => void
  onOpen: (id: string) => void
  getDragHandlers: (id: string, type: 'bookmark' | 'folder') => DragHandlers
  dragState: DragState
  allMeta: Record<string, BookmarkMeta>
  pinnedUrls?: Record<string, number>
}

/**
 * 詳細リストグリッド（BookmarkCard の反復描画）。
 * per-item のドラッグ状態計算を内部に閉じ込める。
 */
export const BookmarkGrid = memo(function BookmarkGrid({
  items,
  gridClass,
  onContextMenu,
  onOpen,
  getDragHandlers,
  dragState,
  allMeta,
  pinnedUrls,
}: Props) {
  return (
    <div className={gridClass}>
      {items.map((item) => (
        <BookmarkCard
          key={item.id}
          item={item}
          onContextMenu={onContextMenu}
          dragHandlers={getDragHandlers(item.id, 'bookmark')}
          isDragging={dragState.draggingId === item.id}
          isDropTarget={dragState.dropTargetId === item.id}
          dropMode={dragState.dropTargetId === item.id && dragState.dropMode !== 'into' ? dragState.dropMode : null}
          onOpen={onOpen}
          ogp={allMeta[item.id]?.ogp}
          isPinned={pinnedUrls ? item.url in pinnedUrls : false}
        />
      ))}
    </div>
  )
})
