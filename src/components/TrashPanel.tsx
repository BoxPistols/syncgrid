import { useState, useEffect, useCallback } from 'react'
import { Icon } from './Icon'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { ConfirmDialog } from './ConfirmDialog'
import { loadTrash, restoreFromTrash, deleteFromTrash, emptyTrash } from '../utils/trash'
import { formatRelativeDate } from '../utils/date'
import type { TrashItem } from '../types'
import type { Messages } from '../i18n'

interface Props {
  onClose: () => void
  onRestored: () => void
  t: Messages
  locale: string
}

export function TrashPanel({ onClose, onRestored, t, locale }: Props) {
  const trapRef = useFocusTrap<HTMLDivElement>()
  const [items, setItems] = useState<TrashItem[]>([])
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  const [version, setVersion] = useState(0)

  useEffect(() => {
    loadTrash().then((data) => setItems(data.sort((a, b) => b.deletedAt - a.deletedAt)))
  }, [version])

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const handleRestore = useCallback(
    async (id: string) => {
      await restoreFromTrash(id)
      bump()
      onRestored()
    },
    [onRestored, bump],
  )

  const handleDelete = useCallback(async (id: string) => {
    await deleteFromTrash(id)
    bump()
  }, [bump])

  const handleEmptyTrash = useCallback(async () => {
    await emptyTrash()
    setItems([])
    setConfirmEmpty(false)
  }, [])

  return (
    <>
      <div className="sg-modal-overlay" onClick={onClose}>
        <div
          ref={trapRef}
          className="sg-modal sg-modal--wide"
          role="dialog"
          aria-modal="true"
          aria-label={t.trash}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
          }}
        >
          <div className="sg-modal__header">
            <span className="sg-modal__title">
              <Icon name="trash" size={16} /> {t.trash} ({t.trashCount(items.length)})
            </span>
            <button className="sg-modal__close" onClick={onClose} aria-label={t.close}>
              <Icon name="close" size={12} />
            </button>
          </div>

          <div className="sg-modal__body sg-settings">
            <p className="sg-settings__desc">{t.trashDesc}</p>

            {items.length === 0 ? (
              <p className="sg-settings__desc">{t.trashEmpty}</p>
            ) : (
              <div className="sg-import__list">
                {items.map((item) => (
                  <div key={item.id} className="sg-import__item">
                    <div className="sg-import__name">
                      <div>{item.title}</div>
                      <div className="sg-settings__desc">
                        {item.parentTitle} · {t.deletedAt(formatRelativeDate(item.deletedAt, locale))}
                      </div>
                    </div>
                    <button
                      className="sg-btn sg-btn--sm sg-btn--ghost"
                      onClick={() => handleRestore(item.id)}
                    >
                      <Icon name="refresh" size={12} /> {t.restore}
                    </button>
                    <button
                      className="sg-btn sg-btn--sm sg-btn--ghost"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sg-modal__footer">
            {items.length > 0 && (
              <button className="sg-btn sg-btn--sm sg-btn--danger" onClick={() => setConfirmEmpty(true)}>
                <Icon name="trash" size={12} /> {t.emptyTrash}
              </button>
            )}
            <div className="sg-spacer" />
            <button className="sg-btn sg-btn--ghost" onClick={onClose}>
              {t.close}
            </button>
          </div>
        </div>
      </div>

      {confirmEmpty && (
        <ConfirmDialog
          message={t.emptyTrash}
          onConfirm={handleEmptyTrash}
          onCancel={() => setConfirmEmpty(false)}
          confirmLabel={t.deletePermanently}
          t={t}
        />
      )}
    </>
  )
}
