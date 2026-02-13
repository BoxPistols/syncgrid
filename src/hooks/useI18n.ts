import { useMemo } from 'react'
import { getMessages, type Locale } from '../i18n'

export function useI18n(locale: Locale) {
  return useMemo(() => getMessages(locale), [locale])
}
