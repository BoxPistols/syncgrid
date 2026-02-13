import { ja } from './ja'
import { en } from './en'

export type Locale = 'ja' | 'en'

/** Messages type uses string unions instead of literal types */
export type Messages = {
  [K in keyof typeof ja]: (typeof ja)[K]  extends (...args: infer A) => string
    ? (...args: A) => string
    : string
}

const locales: Record<Locale, Messages> = { ja, en } as Record<Locale, Messages>

export function getMessages(locale: Locale): Messages {
  return locales[locale] ?? locales.ja
}
