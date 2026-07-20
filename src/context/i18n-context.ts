import { createContext, useContext } from 'react'
import type { Messages, Locale } from '../i18n'

export interface I18nContextValue {
  t: Messages
  locale: Locale
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function useI18nContext(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18nContext must be used within I18nProvider')
  return ctx
}
