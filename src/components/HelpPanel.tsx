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

const QUICK_START: { titleKey: keyof Messages; descKey: keyof Messages }[] = [
  { titleKey: 'helpQsTabs', descKey: 'helpQsTabsDesc' },
  { titleKey: 'helpQsAdd', descKey: 'helpQsAddDesc' },
  { titleKey: 'helpQsFolders', descKey: 'helpQsFoldersDesc' },
  { titleKey: 'helpQsDrag', descKey: 'helpQsDragDesc' },
]

const FEATURE_REFS: { icon: IconName; titleKey: keyof Messages; descKey: keyof Messages }[] = [
  { icon: 'sparkle', titleKey: 'helpRefLayout', descKey: 'helpRefLayoutDesc' },
  { icon: 'search', titleKey: 'helpRefSearch', descKey: 'helpRefSearchDesc' },
  { icon: 'tag', titleKey: 'helpRefFilter', descKey: 'helpRefFilterDesc' },
  { icon: 'link', titleKey: 'helpRefOgp', descKey: 'helpRefOgpDesc' },
  { icon: 'keyboard', titleKey: 'helpRefShortcuts', descKey: 'helpRefShortcutsDesc' },
  { icon: 'bot', titleKey: 'helpRefAi', descKey: 'helpRefAiDesc' },
  { icon: 'download', titleKey: 'helpRefExport', descKey: 'helpRefExportDesc' },
  { icon: 'refresh', titleKey: 'helpRefSync', descKey: 'helpRefSyncDesc' },
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
        {/* Hero */}
        <button className="sg-help-hero__close" onClick={onClose} aria-label={t.close}>
          <Icon name="close" size={12} />
        </button>

        <div className="sg-help-hero">
          <div className="sg-help-hero__icon">
            <Icon name="grid" size={28} />
          </div>
          <h2 className="sg-help-hero__title">SyncGrid</h2>
          <p className="sg-help-hero__tagline">
            {t.helpTagline}<span className="sg-help-hero__accent">{t.helpTaglineAccent}</span>
          </p>
          <span className="sg-help-hero__version">v{getAppVersion()}</span>
        </div>

        <div className="sg-modal__body sg-help-panel">
          {/* Feature highlights */}
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

          {/* Quick Start */}
          <div className="sg-help-section">
            <div className="sg-help-section__header">
              <Icon name="help-circle" size={16} />
              <h3 className="sg-help-section__title">{t.helpQuickStart}</h3>
            </div>
            <div className="sg-help-steps">
              {QUICK_START.map(({ titleKey, descKey }, i) => (
                <div key={titleKey} className="sg-help-step">
                  <span className="sg-help-step__number">{i + 1}</span>
                  <div>
                    <div className="sg-help-step__title">{t[titleKey] as string}</div>
                    <div className="sg-help-step__desc">{t[descKey] as string}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Reference */}
          <div className="sg-help-section">
            <div className="sg-help-section__header">
              <Icon name="grid" size={16} />
              <h3 className="sg-help-section__title">{t.helpFeatureRef}</h3>
            </div>
            <div className="sg-help-features">
              {FEATURE_REFS.map(({ icon, titleKey, descKey }) => (
                <div key={titleKey} className="sg-help-feature">
                  <div className="sg-help-feature__icon">
                    <Icon name={icon} size={16} />
                  </div>
                  <div className="sg-help-feature__title">{t[titleKey] as string}</div>
                  <div className="sg-help-feature__desc">{t[descKey] as string}</div>
                </div>
              ))}
            </div>
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
