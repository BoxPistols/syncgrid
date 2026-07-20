import { useRef, useCallback, memo } from 'react'
import type { Messages } from '../i18n'
import { MOD_LABEL, isComposing } from '../utils/keyboard'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  /** true = All表示（グローバル検索）、false = フォルダ内絞り込み */
  isGlobal: boolean
  t: Messages
}

export const CenterSearch = memo(function CenterSearch({ query, onQueryChange, isGlobal, t }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing(e)) return
    if (e.key === 'Enter' && query.trim()) {
      const q = encodeURIComponent(query.trim())
      if (e.metaKey || e.ctrlKey) {
        window.open(`https://www.google.com/search?q=${q}`, '_blank')
        window.open(`https://search.yahoo.co.jp/search?p=${q}`, '_blank')
        window.open(`https://www.bing.com/search?q=${q}`, '_blank')
      } else {
        window.open(`https://www.google.com/search?q=${q}`, '_self')
      }
    }
    if (e.key === 'Escape') {
      onQueryChange('')
      inputRef.current?.blur()
    }
  }, [query, onQueryChange])

  const placeholder = isGlobal
    ? t.searchPlaceholder(MOD_LABEL)
    : t.searchPlaceholderFolder

  return (
    <div className={`sg-center-search${isGlobal ? '' : ' sg-center-search--folder'}`}>
      <span className="sg-center-search__icon" aria-hidden="true">
        {isGlobal ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M7 12h10M11 18h2" />
          </svg>
        )}
      </span>
      <input
        ref={inputRef}
        type="text"
        className="sg-center-search__input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
        aria-label={placeholder}
      />
      {query && (
        <button
          className="sg-center-search__clear"
          onClick={() => { onQueryChange(''); inputRef.current?.focus() }}
          aria-label="検索をクリア"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
})
