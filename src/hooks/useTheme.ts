import { useEffect, useMemo } from 'react'
import type { SyncGridSettings } from '../types'

/**
 * テーマ設定に応じてdocumentにクラスを付与するhook
 */
export function useTheme(theme: SyncGridSettings['theme']) {
  const isDark = useMemo(() => {
    if (theme === 'dark') return true
    if (theme === 'light') return false
    // system
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    if (theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return isDark
}
