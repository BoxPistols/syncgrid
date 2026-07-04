import { memo } from 'react'
import { Icon, type IconName } from './Icon'
import type { ToastItem, ToastType } from '../hooks/useToast'

interface Props {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
  dismissLabel: string
}

const ICON_BY_TYPE: Record<ToastType, IconName> = {
  info: 'help-circle',
  success: 'check-circle',
  error: 'x-circle',
  warning: 'warning',
}

/** 画面右下に積み重なるトースト通知の表示コンテナ */
export const ToastContainer = memo(function ToastContainer({ toasts, onDismiss, dismissLabel }: Props) {
  if (toasts.length === 0) return null

  return (
    <div className="sg-toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`sg-toast sg-toast--${toast.type}`}>
          <Icon name={ICON_BY_TYPE[toast.type]} size={16} className="sg-toast__icon" />
          <span className="sg-toast__message">{toast.message}</span>
          <button
            className="sg-toast__close"
            onClick={() => onDismiss(toast.id)}
            aria-label={dismissLabel}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
})
