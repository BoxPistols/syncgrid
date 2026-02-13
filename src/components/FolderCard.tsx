import type { SyncGridGroup } from '../types'
import type { Messages } from '../i18n'

interface Props {
  group: SyncGridGroup
  onClick: (group: SyncGridGroup) => void
  onContextMenu: (group: SyncGridGroup, x: number, y: number) => void
  t: Messages
}

export function FolderCard({ group, onClick, onContextMenu, t }: Props) {
  const totalItems = countAll(group)

  return (
    <div className="sg-folder-card" role="button" tabIndex={0}
      onClick={() => onClick(group)}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(group) }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(group, e.clientX, e.clientY) }}
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
