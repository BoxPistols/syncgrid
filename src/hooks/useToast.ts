import { useState, useCallback, useRef } from 'react'

/** トーストの種別 */
export type ToastType = 'info' | 'success' | 'error' | 'warning'

/** 表示中のトースト */
export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const DEFAULT_DURATION = 4000

/**
 * 画面右下に短時間表示する通知（トースト）を管理するフック。
 * 操作の成否をユーザーへ非侵襲的に伝える用途。
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = DEFAULT_DURATION) => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, message, type }])
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
      return id
    },
    [dismiss],
  )

  return { toasts, showToast, dismiss }
}
