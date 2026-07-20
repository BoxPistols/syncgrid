import { useMemo, type ReactNode } from 'react'
import { getMessages, type Locale } from '../i18n'
import { I18nContext, type I18nContextValue } from './i18n-context'

/** t / locale をツリー全体へ配布する Provider。locale はほぼ不変のため再レンダリング影響なし */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18nContextValue>(() => ({ t: getMessages(locale), locale }), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
