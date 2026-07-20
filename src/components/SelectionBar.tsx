import { Icon } from './Icon'
import type { SyncGridGroup } from '../types'
import type { Messages } from '../i18n'

interface Props {
  count: number
  groups: SyncGridGroup[]
  currentFolder: SyncGridGroup | null
  selectedIds: Set<string>
  onMove: (targetId: string) => void
  onDelete: () => void
  onClear: () => void
  t: Messages
}

/** 複数選択時の一括操作バー（移動 / 削除 / 選択解除） */
export function SelectionBar({ count, groups, currentFolder, selectedIds, onMove, onDelete, onClear, t }: Props) {
  return (
    <div className="sg-selection-bar">
      <span>{t.selected(count)}</span>
      <select className="sg-sort__select" value="" onChange={(e) => { if (e.target.value) onMove(e.target.value) }}>
        <option value="" disabled>{t.moveSelected}</option>
        {groups.map((g) => (<option key={g.id} value={g.id}>{g.title}</option>))}
        {currentFolder?.children.filter((c) => !selectedIds.has(c.id)).map((c) => (<option key={c.id} value={c.id}>{'  └ ' + c.title}</option>))}
      </select>
      <button className="sg-btn sg-btn--sm sg-btn--danger" onClick={onDelete}><Icon name="trash" size={12} /> {t.deleteSelected}</button>
      <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={onClear}>{t.clearSelection}</button>
    </div>
  )
}
