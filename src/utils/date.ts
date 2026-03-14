/**
 * 日付フォーマットユーティリティ
 */

/** 相対日時を返す（今日、昨日、X日前、それ以前は日付） */
export function formatRelativeDate(timestamp: number | undefined, locale: string): string {
  if (!timestamp) return ''
  const now = Date.now()
  const diff = now - timestamp
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) return locale === 'ja' ? 'たった今' : 'just now'
    return locale === 'ja' ? `${hours}時間前` : `${hours}h ago`
  }
  if (days === 1) return locale === 'ja' ? '昨日' : 'yesterday'
  if (days < 7) return locale === 'ja' ? `${days}日前` : `${days}d ago`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return locale === 'ja' ? `${weeks}週間前` : `${weeks}w ago`
  }

  return new Date(timestamp).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
