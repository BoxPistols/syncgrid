import { Icon } from './Icon'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { formatBinding } from '../utils/keyboard'
import type { ShortcutConfig, KeyBinding } from '../types'
import type { Messages } from '../i18n'

interface Props {
  shortcuts: ShortcutConfig
  onClose: () => void
  t: Messages
}

const SECTIONS: { title: string; items: { key: keyof ShortcutConfig; labelKey: keyof Messages }[] }[] = [
  {
    title: 'Navigation',
    items: [
      { key: 'search', labelKey: 'shortcutSearch' },
      { key: 'addBookmark', labelKey: 'shortcutAddBookmark' },
    ],
  },
  {
    title: 'Layout',
    items: [
      { key: 'layoutCard', labelKey: 'shortcutLayoutCard' },
      { key: 'layoutList', labelKey: 'shortcutLayoutList' },
      { key: 'layoutMagazine', labelKey: 'shortcutLayoutMagazine' },
    ],
  },
  {
    title: 'Selection',
    items: [
      { key: 'selectAll', labelKey: 'shortcutSelectAll' },
      { key: 'deleteSelected', labelKey: 'shortcutDeleteSelected' },
    ],
  },
]

export function ShortcutCheatSheet({ shortcuts, onClose, t }: Props) {
  const trapRef = useFocusTrap<HTMLDivElement>()

  return (
    <div className="sg-modal-overlay" onClick={onClose}>
      <div
        ref={trapRef}
        className="sg-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === '?') onClose()
        }}
      >
        <div className="sg-modal__header">
          <span className="sg-modal__title">
            <Icon name="keyboard" size={16} /> Keyboard Shortcuts
          </span>
          <button className="sg-modal__close" onClick={onClose} aria-label={t.close}>
            <Icon name="close" size={12} />
          </button>
        </div>
        <div className="sg-modal__body">
          {SECTIONS.map((section) => (
            <div key={section.title} className="sg-cheat__section">
              <h4 className="sg-cheat__heading">{section.title}</h4>
              {section.items.map(({ key, labelKey }) => (
                <div key={key} className="sg-cheat__row">
                  <span className="sg-cheat__label">{t[labelKey] as string}</span>
                  <kbd className="sg-cheat__kbd">{formatBinding(shortcuts[key] as KeyBinding)}</kbd>
                </div>
              ))}
            </div>
          ))}
          <div className="sg-cheat__section">
            <h4 className="sg-cheat__heading">Other</h4>
            <div className="sg-cheat__row">
              <span className="sg-cheat__label">Show this sheet</span>
              <kbd className="sg-cheat__kbd">?</kbd>
            </div>
            <div className="sg-cheat__row">
              <span className="sg-cheat__label">Escape / Cancel</span>
              <kbd className="sg-cheat__kbd">Esc</kbd>
            </div>
            <div className="sg-cheat__row">
              <span className="sg-cheat__label">Multi-select</span>
              <kbd className="sg-cheat__kbd">Cmd/Ctrl + Click</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
