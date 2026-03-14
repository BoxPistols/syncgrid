import { useEffect, useRef } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { Messages } from '../i18n'

interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  t: Messages
}

export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel, t }: Props) {
  const trapRef = useFocusTrap<HTMLDivElement>()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <div className="sg-modal-overlay sg-confirm-overlay" onClick={onCancel}>
      <div
        ref={trapRef}
        className="sg-modal"
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
        }}
      >
        <div className="sg-modal__body">
          <p className="sg-confirm__message">{message}</p>
        </div>
        <div className="sg-modal__footer">
          <div className="sg-spacer" />
          <button ref={cancelRef} className="sg-btn sg-btn--ghost" onClick={onCancel}>
            {t.cancel}
          </button>
          <button className="sg-btn sg-btn--danger" onClick={onConfirm}>
            {confirmLabel ?? t.confirmOk}
          </button>
        </div>
      </div>
    </div>
  )
}
