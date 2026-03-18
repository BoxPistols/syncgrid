import { Icon } from './Icon'
import type { IconName } from './Icon'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { getAppVersion } from '../utils/chromeMock'
import type { Messages } from '../i18n'

interface Props {
  onClose: () => void
  t: Messages
}

const FEATURES: { icon: IconName; titleKey: keyof Messages; descKey: keyof Messages }[] = [
  { icon: 'search', titleKey: 'featureSearch', descKey: 'featureSearchDesc' },
  { icon: 'sparkle', titleKey: 'featureLayout', descKey: 'featureLayoutDesc' },
  { icon: 'keyboard', titleKey: 'shortcuts', descKey: 'tourShortcuts' },
  { icon: 'refresh', titleKey: 'featureSync', descKey: 'featureSyncDesc' },
]

export function HelpPanel({ onClose, t }: Props) {
  const trapRef = useFocusTrap<HTMLDivElement>()

  return (
    <div className="sg-modal-overlay" onClick={onClose}>
      <div
        ref={trapRef}
        className="sg-modal sg-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label={t.help}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        {/* Hero — ヘッダー不要、閉じるボタンだけ浮かせる */}
        <button className="sg-help-hero__close" onClick={onClose} aria-label={t.close}>
          <Icon name="close" size={12} />
        </button>

        <div className="sg-help-hero">
          <div className="sg-help-hero__icon">
            <Icon name="zap" size={28} />
          </div>
          <h2 className="sg-help-hero__title">SyncGrid</h2>
          <p className="sg-help-hero__tagline">
            {t.helpTagline}<span className="sg-help-hero__accent">{t.helpTaglineAccent}</span>
          </p>
          <span className="sg-help-hero__version">v{getAppVersion()}</span>
        </div>

        <div className="sg-modal__body sg-help-panel">
          {/* Feature Grid */}
          <div className="sg-help-features">
            {FEATURES.map(({ icon, titleKey, descKey }) => (
              <div key={titleKey} className="sg-help-feature">
                <div className="sg-help-feature__icon">
                  <Icon name={icon} size={16} />
                </div>
                <div className="sg-help-feature__title">{t[titleKey] as string}</div>
                <div className="sg-help-feature__desc">{t[descKey] as string}</div>
              </div>
            ))}
          </div>

          {/* Security & Privacy */}
          <div className="sg-help-panel__section">
            <h4 className="sg-cheat__heading">{t.helpPrivacy}</h4>
            <p className="sg-settings__desc sg-settings__desc--pre">{t.securityDesc}</p>
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
