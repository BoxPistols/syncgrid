import { Icon } from './Icon'
import type { Messages } from '../i18n'

interface Props {
  t: Messages
  onStartTour: () => void
  onSkip: () => void
}

/** 初回起動時のウェルカム画面 */
export function WelcomeScreen({ t, onStartTour, onSkip }: Props) {
  return (
    <div className="sg-welcome">
      <div className="sg-welcome__logo"><Icon name="grid" size={48} /></div>
      <h1 className="sg-welcome__title">{t.welcomeTitle}</h1>
      <p className="sg-welcome__desc">{t.welcomeDesc}</p>
      <div className="sg-welcome__features">
        <div className="sg-welcome__feature"><div className="sg-welcome__feature-icon"><Icon name="search" size={20} /></div><div className="sg-welcome__feature-text"><strong>{t.featureSearch}</strong>{t.featureSearchDesc}</div></div>
        <div className="sg-welcome__feature"><div className="sg-welcome__feature-icon"><Icon name="sparkle" size={20} /></div><div className="sg-welcome__feature-text"><strong>{t.featureAi}</strong>{t.featureAiDesc}</div></div>
        <div className="sg-welcome__feature"><div className="sg-welcome__feature-icon"><Icon name="folder" size={20} /></div><div className="sg-welcome__feature-text"><strong>{t.featureLayout}</strong>{t.featureLayoutDesc}</div></div>
        <div className="sg-welcome__feature"><div className="sg-welcome__feature-icon"><Icon name="refresh" size={20} /></div><div className="sg-welcome__feature-text"><strong>{t.featureSync}</strong>{t.featureSyncDesc}</div></div>
      </div>
      <div className="sg-welcome__actions">
        <button className="sg-btn sg-btn--primary" onClick={onStartTour}>{t.startTour}</button>
        <button className="sg-btn sg-btn--ghost" onClick={onSkip}>{t.skipTour}</button>
      </div>
    </div>
  )
}
