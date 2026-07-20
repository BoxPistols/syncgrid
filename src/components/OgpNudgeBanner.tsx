import { Icon } from './Icon'
import type { OgpNudgeState } from '../hooks/useOgpNudge'
import type { Messages } from '../i18n'

interface Props {
  state: Exclude<OgpNudgeState, 'hidden'>
  onGrant: () => void
  onRefresh: () => void
  onDismiss: () => void
  t: Messages
}

/** OGP取得の権限付与 / 再取得を促すバナー */
export function OgpNudgeBanner({ state, onGrant, onRefresh, onDismiss, t }: Props) {
  return (
    <div className="sg-ogp-nudge">
      <Icon name="link" size={14} />
      <span>{state === 'no-permission' ? t.ogpNudgeNoPermission : t.ogpNudgeLowCoverage}</span>
      {state === 'no-permission' ? (
        <button className="sg-btn sg-btn--sm sg-btn--primary" onClick={onGrant}><Icon name="lock" size={12} /> {t.ogpNudgeGrant}</button>
      ) : (
        <button className="sg-btn sg-btn--sm sg-btn--primary" onClick={onRefresh}><Icon name="refresh" size={12} /> {t.ogpNudgeRefresh}</button>
      )}
      <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={onDismiss}>{t.ogpNudgeDismiss}</button>
    </div>
  )
}
