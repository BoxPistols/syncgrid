import { useMemo, useState, memo } from 'react'
import { getFaviconUrl, getDomain } from '../utils/favicon'
import type { SyncGridGroup } from '../types'
import { flattenGroups } from '../utils/bookmarks'

interface Props {
  groups: SyncGridGroup[]
  lastUsed: Record<string, number>
}

const MAX_ITEMS = 10

function FaviconCircle({ url, title }: { url: string; title: string }) {
  const [failed, setFailed] = useState(false)
  const domain = getDomain(url)
  const initial = domain.charAt(0).toUpperCase()
  const faviconUrl = getFaviconUrl(url, 32)

  return (
    <a
      href={url}
      className="sg-speeddial__item"
      title={title}
      aria-label={title}
    >
      <div className="sg-speeddial__circle">
        {!failed && faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            width={28}
            height={28}
            onError={() => setFailed(true)}
            aria-hidden="true"
          />
        ) : (
          <span className="sg-speeddial__initial" aria-hidden="true">{initial}</span>
        )}
      </div>
      <span className="sg-speeddial__label">{title || domain}</span>
    </a>
  )
}

export const SpeedDialBar = memo(function SpeedDialBar({ groups, lastUsed }: Props) {
  const items = useMemo(() => {
    const allItems = flattenGroups(groups).flatMap((g) => g.items)
    const hasUsageData = Object.keys(lastUsed).length > 0

    if (hasUsageData) {
      return allItems
        .filter((item) => lastUsed[item.id])
        .sort((a, b) => (lastUsed[b.id] ?? 0) - (lastUsed[a.id] ?? 0))
        .slice(0, MAX_ITEMS)
    }
    return allItems.slice(0, MAX_ITEMS)
  }, [groups, lastUsed])

  if (items.length === 0) return null

  return (
    <div className="sg-speeddial" aria-label="クイックアクセス">
      {items.map((item) => (
        <FaviconCircle key={item.id} url={item.url} title={item.title} />
      ))}
    </div>
  )
})
