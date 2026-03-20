/**
 * フォルダセクション — アコーディオン展開でフォルダ内容をインライン表示
 */
import { useState, memo } from 'react'
import { Icon } from './Icon'
import { BookmarkCard } from './BookmarkCard'
import { isComposing } from '../utils/keyboard'
import { countAll } from '../utils/bookmarks'
import type { SyncGridItem, SyncGridGroup, ReadStatus, BookmarkMeta } from '../types'
import type { DragHandlers, DragState } from '../hooks/useDragReorder'
import type { Messages } from '../i18n'

interface Props {
  group: SyncGridGroup
  depth: number
  collapsedIds: Set<string>
  onToggleCollapse: (id: string) => void
  gridClass: string
  onBookmarkContext: (item: SyncGridItem, x: number, y: number) => void
  onFolderContext: (group: SyncGridGroup, x: number, y: number) => void
  applyFiltersAndSort: (items: SyncGridItem[]) => SyncGridItem[]
  allMeta: Record<string, BookmarkMeta>
  handleSetStatus: (id: string, status: ReadStatus) => void
  selectedIds: Set<string>
  toggleSelect: (id: string, e: React.MouseEvent) => boolean
  getDragHandlers: (id: string, type: 'bookmark' | 'folder') => DragHandlers
  dragState: DragState
  t: Messages
  locale: string
  renamingFolderId: string | null
  onStartRename: (id: string) => void
  onFolderRename: (id: string, name: string) => void
}

export const FolderSection = memo(function FolderSection({
  group,
  depth,
  collapsedIds,
  onToggleCollapse,
  gridClass,
  onBookmarkContext,
  onFolderContext,
  applyFiltersAndSort,
  allMeta,
  handleSetStatus,
  selectedIds,
  toggleSelect,
  getDragHandlers,
  dragState,
  t,
  locale,
  renamingFolderId,
  onStartRename,
  onFolderRename,
}: Props) {
  const collapsed = collapsedIds.has(group.id)
  const totalItems = countAll(group)
  const isRenaming = renamingFolderId === group.id
  const [editValue, setEditValue] = useState(group.title)
  const folderDragHandlers = getDragHandlers(group.id, 'folder')
  const isDropTarget = dragState.dropTargetId === group.id && dragState.dropMode === 'into'
  const isDropBefore = dragState.dropTargetId === group.id && dragState.dropMode === 'before'
  const isDropAfter = dragState.dropTargetId === group.id && dragState.dropMode === 'after'
  const isDragging = dragState.draggingId === group.id

  const handleSubmitRename = () => {
    const name = editValue.trim()
    onFolderRename(group.id, name || group.title)
  }

  return (
    <section className={`sg-section ${isDragging ? 'sg-section--dragging' : ''}`} data-depth={depth}>
      <div
        className={`sg-section__header ${isDropTarget ? 'sg-section__header--drop-target' : ''} ${isDropBefore ? 'sg-section__header--drop-before' : ''} ${isDropAfter ? 'sg-section__header--drop-after' : ''}`}
        role="button"
        tabIndex={0}
        draggable
        onDragStart={folderDragHandlers.onDragStart}
        onDragEnd={folderDragHandlers.onDragEnd}
        onClick={() => {
          if (!isRenaming) onToggleCollapse(group.id)
        }}
        onKeyDown={(e) => {
          if (isRenaming) return
          if (isComposing(e)) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggleCollapse(group.id)
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation()
          setEditValue(group.title)
          onStartRename(group.id)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          onFolderContext(group, e.clientX, e.clientY)
        }}
        aria-expanded={!collapsed}
        onDragOver={folderDragHandlers.onDragOver}
        onDragEnter={folderDragHandlers.onDragEnter}
        onDragLeave={folderDragHandlers.onDragLeave}
        onDrop={folderDragHandlers.onDrop}
      >
        <span className={`sg-section__chevron ${collapsed ? 'sg-section__chevron--collapsed' : ''}`}>
          <Icon name="chevron-down" size={14} />
        </span>
        <Icon name={collapsed ? 'folder' : 'folder-open'} size={14} className="sg-section__icon" />
        {isRenaming ? (
          <input
            className="sg-tab__rename sg-section__rename"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmitRename}
            onKeyDown={(e) => {
              if (isComposing(e)) return
              if (e.key === 'Enter') handleSubmitRename()
              if (e.key === 'Escape') onFolderRename(group.id, group.title)
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="sg-section__title">{group.title}</span>
        )}
        <span className="sg-section__count">{t.items(totalItems)}</span>
        <button
          className="sg-section__menu"
          onClick={(e) => {
            e.stopPropagation()
            onFolderContext(group, e.clientX, e.clientY)
          }}
          aria-label={t.menu}
        >
          <Icon name="more" size={14} />
        </button>
      </div>

      {!collapsed && (
        <div className="sg-section__content">
          {/* ブックマーク */}
          {group.items.length > 0 && (
            <div className={gridClass}>
              {applyFiltersAndSort(group.items).map((item) => (
                <BookmarkCard
                  key={item.id}
                  item={item}
                  onContextMenu={onBookmarkContext}
                  dragHandlers={getDragHandlers(item.id, 'bookmark')}
                  isDragging={dragState.draggingId === item.id}
                  isDropTarget={dragState.dropTargetId === item.id}
                  dropMode={dragState.dropTargetId === item.id && dragState.dropMode !== 'into' ? dragState.dropMode : null}
                  t={t}
                  locale={locale}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={toggleSelect}
                  tags={allMeta[item.id]?.tags}
                  status={allMeta[item.id]?.status}
                  ogp={allMeta[item.id]?.ogp}
                  onOpen={(id) => handleSetStatus(id, 'read')}
                />
              ))}
            </div>
          )}

          {/* ネストされたサブフォルダ */}
          {group.children.map((child) => (
            <FolderSection
              key={child.id}
              group={child}
              depth={depth + 1}
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
              gridClass={gridClass}
              onBookmarkContext={onBookmarkContext}
              onFolderContext={onFolderContext}
              applyFiltersAndSort={applyFiltersAndSort}
              allMeta={allMeta}
              handleSetStatus={handleSetStatus}
              selectedIds={selectedIds}
              toggleSelect={toggleSelect}
              getDragHandlers={getDragHandlers}
              dragState={dragState}
              t={t}
              locale={locale}
              renamingFolderId={renamingFolderId}
              onStartRename={onStartRename}
              onFolderRename={onFolderRename}
            />
          ))}
        </div>
      )}
    </section>
  )
})
