import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { getFaviconUrl, getDomain } from '../utils/favicon'
import { flattenGroups } from '../utils/bookmarks'
import { isComposing, MOD_LABEL } from '../utils/keyboard'
import type { SyncGridGroup, SyncGridItem } from '../types'

interface Props {
  groups: SyncGridGroup[]
  lastUsed: Record<string, number>
  onClose: () => void
}

function buildHistory(
  groups: SyncGridGroup[],
  lastUsed: Record<string, number>,
): SyncGridItem[] {
  const allItems: SyncGridItem[] = []
  for (const g of flattenGroups(groups)) allItems.push(...g.items)

  const usedIds = Object.entries(lastUsed)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id)

  const usedSet = new Set(usedIds)
  const used = usedIds
    .map((id) => allItems.find((i) => i.id === id))
    .filter((i): i is SyncGridItem => !!i)

  // 残り（未使用）をdate順で補完
  const rest = allItems
    .filter((i) => !usedSet.has(i.id))
    .sort((a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0))

  return [...used, ...rest].slice(0, 50)
}

export const CommandPalette = memo(function CommandPalette({ groups, lastUsed, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const allItems = buildHistory(groups, lastUsed)
  const filtered = query.trim()
    ? allItems.filter(
        (i) =>
          i.title.toLowerCase().includes(query.toLowerCase()) ||
          getDomain(i.url).toLowerCase().includes(query.toLowerCase()),
      )
    : allItems

  // フォーカス
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // cursor を filtered 範囲内にクランプ（描画時に導出。effect での setState を避ける）
  const cursorPos = Math.min(cursor, Math.max(filtered.length - 1, 0))

  // cursor のアイテムを表示範囲内にスクロール
  useEffect(() => {
    const el = listRef.current?.children[cursorPos] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursorPos])

  const open = useCallback((item: SyncGridItem) => {
    window.open(item.url, '_blank', 'noopener,noreferrer')
    onClose()
  }, [onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing(e)) return
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(Math.min(cursorPos + 1, filtered.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(Math.max(cursorPos - 1, 0)); return }
    if (e.key === 'Enter' && filtered[cursorPos]) { open(filtered[cursorPos]); return }
  }, [filtered, cursorPos, open, onClose])

  return (
    <div className="sg-cmdpal__backdrop" onClick={onClose}>
      <div
        className="sg-cmdpal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="コマンドパレット"
        aria-modal="true"
      >
        {/* 検索入力 */}
        <div className="sg-cmdpal__search">
          <svg className="sg-cmdpal__search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="sg-cmdpal__input"
            placeholder="最近使ったブックマークを検索…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="sg-cmdpal__esc">Esc</kbd>
        </div>

        {/* ヘッダ */}
        <div className="sg-cmdpal__header">
          <span>{query ? `「${query}」の結果 ${filtered.length}件` : `最近使った ${Math.min(allItems.length, 50)}件`}</span>
          <span className="sg-cmdpal__hint">↑↓ 移動 · Enter 開く · {MOD_LABEL}K 閉じる</span>
        </div>

        {/* リスト */}
        <ul className="sg-cmdpal__list" ref={listRef} role="listbox">
          {filtered.length === 0 ? (
            <li className="sg-cmdpal__empty">一致するブックマークが見つかりませんでした</li>
          ) : (
            filtered.map((item, i) => (
              <PaletteItem
                key={item.id}
                item={item}
                active={i === cursorPos}
                rank={i}
                lastUsedAt={lastUsed[item.id]}
                onPointerEnter={() => setCursor(i)}
                onClick={() => open(item)}
              />
            ))
          )}
        </ul>
      </div>
    </div>
  )
})

interface ItemProps {
  item: SyncGridItem
  active: boolean
  rank: number
  lastUsedAt?: number
  onPointerEnter: () => void
  onClick: () => void
}

const PaletteItem = memo(function PaletteItem({ item, active, rank, lastUsedAt, onPointerEnter, onClick }: ItemProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const domain = getDomain(item.url)
  const initial = domain.charAt(0).toUpperCase()
  const faviconUrl = getFaviconUrl(item.url, 20)

  const relTime = lastUsedAt ? formatRelTime(lastUsedAt) : null

  return (
    <li
      className={`sg-cmdpal__item${active ? ' sg-cmdpal__item--active' : ''}`}
      role="option"
      aria-selected={active}
      onPointerEnter={onPointerEnter}
      onClick={onClick}
    >
      <span className="sg-cmdpal__rank">{rank + 1}</span>
      <span className="sg-cmdpal__favicon">
        {!imgFailed && faviconUrl ? (
          <img src={faviconUrl} alt="" width={16} height={16} onError={() => setImgFailed(true)} />
        ) : (
          <span className="sg-cmdpal__initial">{initial}</span>
        )}
      </span>
      <span className="sg-cmdpal__title">{item.title || domain}</span>
      <span className="sg-cmdpal__domain">{domain}</span>
      {relTime && <span className="sg-cmdpal__time">{relTime}</span>}
    </li>
  )
})

function formatRelTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'たった今'
  if (m < 60) return `${m}分前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}日前`
  return `${Math.floor(d / 30)}ヶ月前`
}
