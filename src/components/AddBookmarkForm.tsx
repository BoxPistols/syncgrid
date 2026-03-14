import { useState, useRef, useEffect, useCallback } from 'react'
import type { Messages } from '../i18n'
import type { AISettings } from '../types'
import { generateTitle } from '../utils/ai'
import { fetchPageTitle, fetchPageTitleWithPermission } from '../utils/fetchTitle'
import { isModKey, isComposing, MOD_LABEL, ENTER_LABEL } from '../utils/keyboard'

interface Props {
  onAdd: (url: string, title: string) => void
  onCancel: () => void
  t: Messages
  aiSettings: AISettings
}

export function AddBookmarkForm({ onAdd, onCancel, t, aiSettings }: Props) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [fetchingTitle, setFetchingTitle] = useState(false)
  const urlRef = useRef<HTMLInputElement>(null)
  const fetchAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    urlRef.current?.focus()
  }, [])

  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    if (!/^https?:\/\//i.test(trimmed)) return 'https://' + trimmed
    return trimmed
  }

  // URL確定時（blur）に自動タイトル取得（パーミッション付与済みの場合のみ）
  const handleUrlBlur = useCallback(async () => {
    const finalUrl = normalizeUrl(url)
    if (!finalUrl || title.trim()) return

    fetchAbortRef.current?.abort()
    const controller = new AbortController()
    fetchAbortRef.current = controller

    setFetchingTitle(true)
    try {
      const pageTitle = await fetchPageTitle(finalUrl)
      if (!controller.signal.aborted && pageTitle) {
        setTitle(pageTitle)
      }
    } finally {
      if (!controller.signal.aborted) {
        setFetchingTitle(false)
      }
    }
  }, [url, title])

  // 明示的にタイトル取得（パーミッション未付与なら要求）
  const handleFetchTitle = useCallback(async () => {
    const finalUrl = normalizeUrl(url)
    if (!finalUrl) return

    setFetchingTitle(true)
    try {
      const pageTitle = await fetchPageTitleWithPermission(finalUrl)
      if (pageTitle) {
        setTitle(pageTitle)
      }
    } finally {
      setFetchingTitle(false)
    }
  }, [url])

  const handleSubmit = () => {
    const finalUrl = normalizeUrl(url)
    if (!finalUrl) return
    onAdd(finalUrl, title.trim() || finalUrl)
    setUrl('')
    setTitle('')
    urlRef.current?.focus()
  }

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (isComposing(e)) return // IME変換中は無視

    if (e.key === 'Escape') {
      onCancel()
      return
    }

    // Cmd+Enter / Ctrl+Enter で送信
    if (e.key === 'Enter' && isModKey(e)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleAiGenerate = async () => {
    const finalUrl = normalizeUrl(url)
    if (!finalUrl) return
    if (aiSettings.provider === 'none') {
      setAiError(t.aiNotConfigured)
      setTimeout(() => setAiError(''), 3000)
      return
    }

    setAiLoading(true)
    setAiError('')
    try {
      const generated = await generateTitle(finalUrl, aiSettings)
      setTitle(generated)
    } catch {
      setAiError(t.aiError)
      setTimeout(() => setAiError(''), 3000)
    } finally {
      setAiLoading(false)
    }
  }

  const showAiBtn = url.trim().length > 0 && aiSettings.provider !== 'none'

  return (
    <form
      className="sg-add-form"
      onSubmit={(e) => {
        e.preventDefault()
        // form submit はCmd+Enterでのみ発火させる（Enterキー単体では発火しない）
      }}
      onKeyDown={handleFormKeyDown}
    >
      <input
        ref={urlRef}
        type="text"
        className="sg-add-form__input"
        placeholder={t.urlPlaceholder}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={handleUrlBlur}
        autoComplete="off"
        spellCheck={false}
      />
      <div className="sg-add-form__title-row">
        <input
          type="text"
          className="sg-add-form__input"
          placeholder={fetchingTitle ? t.fetchingTitle : t.titlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          disabled={fetchingTitle}
        />
        {url.trim() && (
          <button
            type="button"
            className="sg-btn sg-btn--sm sg-btn--ghost"
            onClick={handleFetchTitle}
            disabled={fetchingTitle}
            title={t.fetchingTitle}
          >
            {fetchingTitle ? '⏳' : '🔍'}
          </button>
        )}
        {showAiBtn && (
          <button
            type="button"
            className="sg-btn sg-btn--sm sg-btn--ai"
            onClick={handleAiGenerate}
            disabled={aiLoading || fetchingTitle}
            title={t.aiGenerateTitle}
          >
            {aiLoading ? '⏳' : '✨'} {t.aiGenerateTitle}
          </button>
        )}
      </div>
      {aiError && <span className="sg-add-form__error">{aiError}</span>}
      <div className="sg-add-form__actions">
        <button
          type="button"
          className="sg-btn sg-btn--primary"
          disabled={!url.trim() || fetchingTitle}
          onClick={handleSubmit}
        >
          {t.add}
        </button>
        <span className="sg-add-form__hint">{t.submitHint(MOD_LABEL, ENTER_LABEL)}</span>
        <button type="button" className="sg-btn sg-btn--ghost" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </form>
  )
}
