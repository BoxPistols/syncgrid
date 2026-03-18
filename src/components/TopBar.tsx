import { useRef } from 'react'
import type { Messages } from '../i18n'
import type { LayoutMode, CardSize, GridColumns } from '../types'
import { MOD_LABEL } from '../utils/keyboard'
import { Icon } from './Icon'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  theme: string
  onToggleTheme: () => void
  onOpenSettings: () => void
  onOpenShortcuts: () => void
  onOpenHelp: () => void
  onRefreshOgp: () => void
  layout: LayoutMode
  cardSize: CardSize
  gridColumns: GridColumns
  onChangeLayout: (layout: LayoutMode) => void
  onChangeCardSize: (size: CardSize) => void
  onChangeGridColumns: (cols: GridColumns) => void
  t: Messages
}

export function TopBar({ query, onQueryChange, theme, onToggleTheme, onOpenSettings, onOpenShortcuts, onOpenHelp, onRefreshOgp, layout, cardSize, gridColumns, onChangeLayout, onChangeCardSize, onChangeGridColumns, t }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="sg-topbar">
      <span className="sg-topbar__logo"><Icon name="zap" size={16} /> SyncGrid</span>

      <div className="sg-topbar__search">
        <span className="sg-topbar__search-icon">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          className="sg-topbar__search-input"
          placeholder={t.searchPlaceholder(MOD_LABEL)}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            className="sg-topbar__search-clear"
            onClick={() => {
              onQueryChange('')
              inputRef.current?.focus()
            }}
          >
            <Icon name="close" size={10} />
          </button>
        )}
      </div>

      <div className="sg-topbar__actions">
        {/* Layout switcher */}
        <div className="sg-layout-switcher" role="radiogroup" aria-label={t.layout}>
          {/* Magazine: 小カードグリッド */}
          <button
            className={`sg-layout-switcher__btn ${layout === 'magazine' ? 'sg-layout-switcher__btn--active' : ''}`}
            onClick={() => onChangeLayout('magazine')}
            title={`${t.layoutMagazine} (${MOD_LABEL}1)`}
            aria-label={t.layoutMagazine}
            role="radio"
            aria-checked={layout === 'magazine'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="0" y="0" width="6" height="6" rx="1" />
              <rect x="8" y="0" width="6" height="6" rx="1" />
              <rect x="0" y="8" width="6" height="6" rx="1" />
              <rect x="8" y="8" width="6" height="6" rx="1" />
            </svg>
          </button>
          {/* Card: 大カード */}
          <button
            className={`sg-layout-switcher__btn ${layout === 'card' ? 'sg-layout-switcher__btn--active' : ''}`}
            onClick={() => onChangeLayout('card')}
            title={`${t.layoutCard} (${MOD_LABEL}2)`}
            aria-label={t.layoutCard}
            role="radio"
            aria-checked={layout === 'card'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="0" y="0" width="14" height="6" rx="1" />
              <rect x="0" y="8" width="14" height="6" rx="1" />
            </svg>
          </button>
          {/* List: 横長行 */}
          <button
            className={`sg-layout-switcher__btn ${layout === 'list' ? 'sg-layout-switcher__btn--active' : ''}`}
            onClick={() => onChangeLayout('list')}
            title={`${t.layoutList} (${MOD_LABEL}3)`}
            aria-label={t.layoutList}
            role="radio"
            aria-checked={layout === 'list'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="0" y="1" width="14" height="3" rx="1" />
              <rect x="0" y="5.5" width="14" height="3" rx="1" />
              <rect x="0" y="10" width="14" height="3" rx="1" />
            </svg>
          </button>
        </div>

        {/* Card size (カード表示時のみ) */}
        {(layout === 'card' || layout === 'magazine') && (
          <div className="sg-layout-switcher" role="radiogroup" aria-label="Card size">
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <button
                key={size}
                className={`sg-layout-switcher__btn ${cardSize === size ? 'sg-layout-switcher__btn--active' : ''}`}
                onClick={() => onChangeCardSize(size)}
                title={size === 'sm' ? 'S' : size === 'md' ? 'M' : 'L'}
                role="radio"
                aria-checked={cardSize === size}
              >
                <span className={`sg-size-label sg-size-label--${size}`}>
                  {size === 'sm' ? 'S' : size === 'md' ? 'M' : 'L'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* 列数セレクト（card/magazine表示時のみ） */}
        {layout !== 'list' && (
          <select
            className="sg-cols-select"
            value={String(gridColumns)}
            onChange={(e) => {
              const v = e.target.value
              onChangeGridColumns(v === 'auto' ? 'auto' : (Number(v) as GridColumns))
            }}
            aria-label="Grid columns"
          >
            <option value="auto">Auto</option>
            <option value="2">2列</option>
            <option value="3">3列</option>
            <option value="4">4列</option>
            <option value="5">5列</option>
            <option value="6">6列</option>
          </select>
        )}

        <button className="sg-btn--icon sg-btn--icon-label" onClick={onRefreshOgp} title={t.ogpPermissionRefresh}>
          <Icon name="refresh" size={14} />
          <span>OGP</span>
        </button>
        <button className="sg-btn--icon" onClick={onToggleTheme} title={t.toggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
        </button>
        <button className="sg-btn--icon" onClick={onOpenShortcuts} title={t.shortcuts}>
          <Icon name="keyboard" size={16} />
        </button>
        <button className="sg-btn--icon" onClick={onOpenHelp} title={t.help}>
          <Icon name="help-circle" size={16} />
        </button>
        <button className="sg-btn--icon" onClick={onOpenSettings} title={t.settings}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
