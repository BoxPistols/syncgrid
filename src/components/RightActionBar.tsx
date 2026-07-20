import { memo } from 'react'
import { Icon } from './Icon'
import type { Messages } from '../i18n'

interface Props {
  theme: string
  onToggleTheme: () => void
  onOpenSettings: () => void
  onOpenTrash: () => void
  onOpenHelp: () => void
  onToggleKanban: () => void
  isKanbanActive: boolean
  t: Messages
}

export const RightActionBar = memo(function RightActionBar({
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenTrash,
  onOpenHelp,
  onToggleKanban,
  isKanbanActive,
  t,
}: Props) {
  return (
    <aside className="sg-action-bar" aria-label="アクション">
      <button
        className="sg-action-bar__btn"
        onClick={onToggleTheme}
        title={t.toggleTheme}
        aria-label={t.toggleTheme}
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
      </button>

      <div className="sg-action-bar__sep" />

      <button
        className={`sg-action-bar__btn${isKanbanActive ? ' sg-action-bar__btn--active' : ''}`}
        onClick={onToggleKanban}
        title="Kanban"
        aria-label="Kanban"
      >
        <Icon name="columns" size={16} />
      </button>

      <button
        className="sg-action-bar__btn"
        onClick={onOpenTrash}
        title={t.trash}
        aria-label={t.trash}
      >
        <Icon name="trash" size={16} />
      </button>

      <div className="sg-action-bar__sep" />

      <button
        className="sg-action-bar__btn"
        onClick={onOpenHelp}
        title={t.help ?? 'ヘルプ'}
        aria-label={t.help ?? 'ヘルプ'}
      >
        <Icon name="help-circle" size={16} />
      </button>

      <button
        className="sg-action-bar__btn"
        onClick={onOpenSettings}
        title={t.settings}
        aria-label={t.settings}
      >
        <Icon name="settings" size={16} />
      </button>
    </aside>
  )
})
