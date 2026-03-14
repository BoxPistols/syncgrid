import { useState, useRef, useEffect, useCallback } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { fetchPageTitleWithPermission } from '../utils/fetchTitle'
import type { SyncGridItem } from '../types'
import type { Messages } from '../i18n'

interface Props {
  item: SyncGridItem
  onSave: (id: string, title: string, url: string) => void
  onDelete: (id: string) => void
  onClose: () => void
  t: Messages
}

export function EditBookmarkModal({ item, onSave, onDelete, onClose, t }: Props) {
  const [title, setTitle] = useState(item.title)
  const [url, setUrl] = useState(item.url)
  const [fetching, setFetching] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const trapRef = useFocusTrap<HTMLDivElement>()

  useEffect(() => {
    titleRef.current?.focus()
    titleRef.current?.select()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    onSave(item.id, title.trim() || url.trim(), url.trim())
  }

  const handleRefetchTitle = useCallback(async () => {
    const targetUrl = url.trim()
    if (!targetUrl) return
    setFetching(true)
    try {
      const pageTitle = await fetchPageTitleWithPermission(targetUrl)
      if (pageTitle) setTitle(pageTitle)
    } finally {
      setFetching(false)
    }
  }, [url])

  return (
    <div className="sg-modal-overlay" onClick={onClose}>
      <div
        ref={trapRef}
        className="sg-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t.editBookmark}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <div className="sg-modal__header">
          <span className="sg-modal__title">{t.editBookmark}</span>
          <button className="sg-modal__close" onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="sg-modal__body">
            <label className="sg-label">{t.title}</label>
            <div className="sg-settings__row">
              <input
                ref={titleRef}
                type="text"
                className="sg-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoComplete="off"
                disabled={fetching}
              />
              <button
                type="button"
                className="sg-btn sg-btn--sm sg-btn--ghost"
                onClick={handleRefetchTitle}
                disabled={fetching || !url.trim()}
                title={t.refetchTitle}
              >
                {fetching ? '⏳' : '🔄'} {t.refetchTitle}
              </button>
            </div>
            <label className="sg-label">{t.url}</label>
            <input
              type="text"
              className="sg-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="sg-modal__footer">
            <button
              type="button"
              className="sg-btn sg-btn--danger"
              onClick={() => {
                onDelete(item.id)
                onClose()
              }}
            >
              {t.delete}
            </button>
            <div className="sg-spacer" />
            <button type="button" className="sg-btn sg-btn--ghost" onClick={onClose}>
              {t.cancel}
            </button>
            <button type="submit" className="sg-btn sg-btn--primary" disabled={!url.trim()}>
              {t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
