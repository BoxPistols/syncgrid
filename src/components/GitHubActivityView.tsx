import { memo } from 'react'
import { Icon, type IconName } from './Icon'
import { useI18nContext } from '../context/i18n-context'
import type { GitHubActivityItem, GitHubEventKind } from '../types'

interface Props {
  items: GitHubActivityItem[]
  login: string
  loading: boolean
  error: string | null
  onRefresh: () => void
}

const KIND_ICONS: Record<GitHubEventKind, IconName> = {
  commit: 'git-commit',
  pr: 'git-pr',
  issue: 'check-circle',
  star: 'star',
  release: 'tag',
  create: 'plus',
}

function formatRelTime(ts: number, locale: string): string {
  const diff = Date.now() - ts
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (diff < 3600000) return rtf.format(-Math.max(1, Math.floor(diff / 60000)), 'minute')
  if (diff < 86400000) return rtf.format(-Math.floor(diff / 3600000), 'hour')
  return rtf.format(-Math.floor(diff / 86400000), 'day')
}

const ActivityRow = memo(function ActivityRow({ item, locale }: { item: GitHubActivityItem; locale: string }) {
  return (
    <a
      className="sg-gh-item"
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      title={item.title}
    >
      <span className={`sg-gh-item__icon sg-gh-item__icon--${item.kind}`} aria-hidden="true">
        <Icon name={KIND_ICONS[item.kind]} size={14} />
      </span>
      <span className="sg-gh-item__title">{item.title}</span>
      <span className="sg-gh-item__repo">{item.repo}</span>
      <span className="sg-gh-item__time">{formatRelTime(item.createdAt, locale)}</span>
    </a>
  )
})

/**
 * GitHub 仮想フォルダビュー（読み取り専用）。
 * Bookmarks 非依存: D&D・選択・Kanban 追加は意図的に持たない。
 */
export const GitHubActivityView = memo(function GitHubActivityView({ items, login, loading, error, onRefresh }: Props) {
  const { t, locale } = useI18nContext()

  return (
    <div className="sg-dial sg-gh">
      <div className="sg-gh__header">
        <h2 className="sg-section-heading sg-gh__heading">
          <Icon name="github" size={13} /> GitHub
          {login && <span className="sg-gh__login">@{login}</span>}
        </h2>
        <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={onRefresh} disabled={loading}>
          <Icon name="refresh" size={12} className={loading ? 'sg-icon--spin' : ''} /> {t.githubRefresh}
        </button>
      </div>
      {error && (
        <p className="sg-gh__error"><Icon name="warning" size={13} /> {t.githubError}: {error}</p>
      )}
      {!error && items.length === 0 && !loading && (
        <div className="sg-empty">
          <div className="sg-empty__icon"><Icon name="github" size={48} /></div>
          <p className="sg-empty__text">{t.githubEmpty}</p>
        </div>
      )}
      <div className="sg-gh__list">
        {items.map((item) => (
          <ActivityRow key={item.id} item={item} locale={locale} />
        ))}
      </div>
    </div>
  )
})
