import { useRef } from 'react'
import type { Messages } from '../i18n'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  theme: string
  onToggleTheme: () => void
  onOpenSettings: () => void
  t: Messages
}

export function TopBar({ query, onQueryChange, theme, onToggleTheme, onOpenSettings, t }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="sg-topbar">
      <span className="sg-topbar__logo">⚡ SyncGrid</span>

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
          placeholder={t.searchPlaceholder}
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
            ✕
          </button>
        )}
      </div>

      <div className="sg-topbar__actions">
        <button className="sg-btn--icon" onClick={onToggleTheme} title={t.toggleTheme}>
          {theme === 'dark' ? '☀️' : '🌙'}
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
