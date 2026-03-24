import { Icon } from './Icon'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { ShortcutEditor } from './ShortcutEditor'
import type { SyncGridSettings } from '../types'
import type { Messages } from '../i18n'

interface Props {
  settings: SyncGridSettings
  onUpdateSettings: (patch: Partial<SyncGridSettings>) => void
  onClose: () => void
  t: Messages
}

export function KeyboardShortcutsPanel({ settings, onUpdateSettings, onClose, t }: Props) {
  const trapRef = useFocusTrap<HTMLDivElement>()

  return (
    <div className="sg-modal-overlay" onClick={onClose}>
      <div
        ref={trapRef}
        className="sg-modal sg-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label={t.shortcuts}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <div className="sg-modal__header">
          <span className="sg-modal__title">
            <Icon name="keyboard" size={16} /> {t.shortcuts}
          </span>
          <button className="sg-modal__close" onClick={onClose} aria-label={t.close}>
            <Icon name="close" size={12} />
          </button>
        </div>

        <div className="sg-modal__body sg-shortcuts-panel">
          {/* カスタマイズ可能なショートカット */}
          <div className="sg-shortcuts-panel__section">
            <h4 className="sg-cheat__heading">{t.shortcutsCustom}</h4>
            <ShortcutEditor
              shortcuts={settings.shortcuts}
              onChange={(shortcuts) => onUpdateSettings({ shortcuts })}
              t={t}
            />
          </div>

          {/* 固定ショートカット */}
          <div className="sg-shortcuts-panel__section">
            <h4 className="sg-cheat__heading">{t.shortcutsOther}</h4>
            <div className="sg-cheat__row">
              <span className="sg-cheat__label">{t.shortcutGoBack}</span>
              <kbd className="sg-cheat__kbd">⌘ / Alt + ←</kbd>
            </div>
            <div className="sg-cheat__row">
              <span className="sg-cheat__label">{t.shortcutTabSwitch}</span>
              <kbd className="sg-cheat__kbd">0 – 99</kbd>
            </div>
            <div className="sg-cheat__row">
              <span className="sg-cheat__label">{t.shortcutMultiSelect}</span>
              <kbd className="sg-cheat__kbd">⌘ / Ctrl + Click</kbd>
            </div>
            <div className="sg-cheat__row">
              <span className="sg-cheat__label">{t.shortcutShowShortcuts}</span>
              <kbd className="sg-cheat__kbd">?</kbd>
            </div>
            <div className="sg-cheat__row">
              <span className="sg-cheat__label">{t.shortcutEscape}</span>
              <kbd className="sg-cheat__kbd">Esc</kbd>
            </div>
          </div>
        </div>

        <div className="sg-modal__footer">
          <div className="sg-spacer" />
          <button className="sg-btn sg-btn--ghost" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  )
}
