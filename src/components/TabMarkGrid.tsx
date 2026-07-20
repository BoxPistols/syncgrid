import { memo } from 'react'
import { TabMarkCard, TabMarkFolderCard } from './TabMarkCard'
import type { SyncGridItem, SyncGridGroup } from '../types'
import type { DragHandlers, DragState } from '../hooks/useDragReorder'

interface Props {
  items: SyncGridItem[]
  folders?: SyncGridGroup[]
  onSelectFolder?: (id: string) => void
  onContextMenu: (item: SyncGridItem, x: number, y: number) => void
  onTrackUsage: (id: string) => void
  getDragHandlers: (id: string, type: 'bookmark' | 'folder') => DragHandlers
  dragState: DragState
  pinnedUrls?: Record<string, number>
}

/**
 * TabMark風コンパクトグリッド。
 * per-item のドラッグ状態計算（isDragging/isDropTarget/dropMode）を内部に閉じ込める。
 */
export const TabMarkGrid = memo(function TabMarkGrid({
  items,
  folders,
  onSelectFolder,
  onContextMenu,
  onTrackUsage,
  getDragHandlers,
  dragState,
  pinnedUrls,
}: Props) {
  return (
    <div className="sg-tm-grid">
      {folders && onSelectFolder && folders.map((child) => (
        <TabMarkFolderCard
          key={child.id}
          group={child}
          onSelect={onSelectFolder}
          dragHandlers={getDragHandlers(child.id, 'folder')}
          isDragging={dragState.draggingId === child.id}
          isDropTarget={dragState.dropTargetId === child.id && dragState.dropMode === 'into'}
        />
      ))}
      {items.map((item) => (
        <TabMarkCard
          key={item.id}
          item={item}
          onContextMenu={onContextMenu}
          onTrackUsage={onTrackUsage}
          dragHandlers={getDragHandlers(item.id, 'bookmark')}
          isDragging={dragState.draggingId === item.id}
          isDropTarget={dragState.dropTargetId === item.id}
          dropMode={dragState.dropTargetId === item.id ? (dragState.dropMode as 'before' | 'after' | null) : null}
          isPinned={pinnedUrls ? item.url in pinnedUrls : false}
        />
      ))}
    </div>
  )
})
