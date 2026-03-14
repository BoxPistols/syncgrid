import { useState, useEffect, useCallback } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { getImportableFolders, importChromeFolder, getRootId, type ChromeFolder } from '../utils/bookmarks'
import type { Messages } from '../i18n'

interface Props {
  onDone: () => void
  onClose: () => void
  t: Messages
}

export function BookmarkImport({ onDone, onClose, t }: Props) {
  const trapRef = useFocusTrap<HTMLDivElement>()
  const [folders, setFolders] = useState<ChromeFolder[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    getImportableFolders().then((f) => {
      setFolders(f)
      setLoading(false)
    })
  }, [])

  const toggleFolder = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(folders.map((f) => f.id)))
  }, [folders])

  const deselectAll = useCallback(() => {
    setSelected(new Set())
  }, [])

  const handleImport = useCallback(async () => {
    if (selected.size === 0) return
    setImporting(true)
    const rootId = await getRootId()
    for (const folderId of selected) {
      await importChromeFolder(folderId, rootId)
    }
    setResult(t.importChromeSuccess(selected.size))
    setImporting(false)
    setTimeout(() => {
      onDone()
      onClose()
    }, 1000)
  }, [selected, onDone, onClose, t])

  return (
    <div className="sg-modal-overlay sg-confirm-overlay" onClick={onClose}>
      <div
        ref={trapRef}
        className="sg-modal sg-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label={t.importChrome}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <div className="sg-modal__header">
          <span className="sg-modal__title">{t.importChrome}</span>
          <button className="sg-modal__close" onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </div>

        <div className="sg-modal__body">
          <p className="sg-settings__desc">{t.importChromeDesc}</p>

          {loading ? (
            <div className="sg-loading">{t.loading}</div>
          ) : folders.length === 0 ? (
            <p className="sg-settings__desc">{t.noFolders}</p>
          ) : (
            <>
              <div className="sg-import__actions">
                <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={selectAll}>
                  {t.selectAll}
                </button>
                <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={deselectAll}>
                  {t.deselectAll}
                </button>
              </div>

              <div className="sg-import__list">
                {folders.map((folder) => (
                  <label key={folder.id} className="sg-import__item">
                    <input
                      type="checkbox"
                      className="sg-import__checkbox"
                      checked={selected.has(folder.id)}
                      onChange={() => toggleFolder(folder.id)}
                    />
                    <span className="sg-import__name">
                      {folder.path ? `${folder.path} / ` : ''}
                      {folder.title}
                    </span>
                    <span className="sg-import__count">{t.bookmarkCount(folder.bookmarkCount)}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {result && <p className="sg-settings__status sg-settings__status--ok">✅ {result}</p>}
        </div>

        <div className="sg-modal__footer">
          <div className="sg-spacer" />
          <button className="sg-btn sg-btn--ghost" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            className="sg-btn sg-btn--primary"
            onClick={handleImport}
            disabled={selected.size === 0 || importing}
          >
            {importing ? t.loading : t.importSelected}
          </button>
        </div>
      </div>
    </div>
  )
}
