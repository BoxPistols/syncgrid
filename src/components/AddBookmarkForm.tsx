import { useState, useRef, useEffect } from 'react'
import type { Messages } from '../i18n'
import type { AISettings } from '../types'
import { generateTitle } from '../utils/ai'

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
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    urlRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return
    let finalUrl = trimmedUrl
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl
    onAdd(finalUrl, title.trim() || finalUrl)
    setUrl('')
    setTitle('')
    urlRef.current?.focus()
  }

  const handleAiGenerate = async () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return
    if (aiSettings.provider === 'none') {
      setAiError(t.aiNotConfigured)
      setTimeout(() => setAiError(''), 3000)
      return
    }

    let finalUrl = trimmedUrl
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl

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

  const showAiBtn = url.trim().length > 0

  return (
    <form
      className="sg-add-form"
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <input
        ref={urlRef}
        type="text"
        className="sg-add-form__input"
        placeholder={t.urlPlaceholder}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      <div className="sg-add-form__title-row">
        <input
          type="text"
          className="sg-add-form__input"
          placeholder={t.titlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {showAiBtn && (
          <button
            type="button"
            className="sg-btn sg-btn--sm sg-btn--ai"
            onClick={handleAiGenerate}
            disabled={aiLoading}
            title={t.aiGenerateTitle}
          >
            {aiLoading ? '⏳' : '✨'} {t.aiGenerateTitle}
          </button>
        )}
      </div>
      {aiError && <span className="sg-add-form__error">{aiError}</span>}
      <div className="sg-add-form__actions">
        <button type="submit" className="sg-btn sg-btn--primary" disabled={!url.trim()}>
          {t.add}
        </button>
        <button type="button" className="sg-btn sg-btn--ghost" onClick={onCancel}>
          {t.cancel}
        </button>
      </div>
    </form>
  )
}
