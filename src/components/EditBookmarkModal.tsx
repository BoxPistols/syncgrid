import { useState, useRef, useEffect } from 'react'
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
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus(); titleRef.current?.select() }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    onSave(item.id, title.trim() || url.trim(), url.trim())
  }

  return (
    <div className="sg-modal-overlay" onClick={onClose}>
      <div className="sg-modal" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
        <div className="sg-modal__header">
          <span className="sg-modal__title">{t.editBookmark}</span>
          <button className="sg-modal__close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="sg-modal__body">
            <label className="sg-label">{t.title}</label>
            <input ref={titleRef} type="text" className="sg-input" value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
            <label className="sg-label">{t.url}</label>
            <input type="text" className="sg-input" value={url} onChange={(e) => setUrl(e.target.value)} autoComplete="off" />
          </div>
          <div className="sg-modal__footer">
            <button type="button" className="sg-btn sg-btn--danger" onClick={() => { onDelete(item.id); onClose() }}>{t.delete}</button>
            <div style={{ flex: 1 }} />
            <button type="button" className="sg-btn sg-btn--ghost" onClick={onClose}>{t.cancel}</button>
            <button type="submit" className="sg-btn sg-btn--primary" disabled={!url.trim()}>{t.save}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
