import { describe, it, expect } from 'vitest'
import { ja } from '../ja'
import { en } from '../en'

describe('i18n key parity', () => {
  const jaKeys = Object.keys(ja).sort()
  const enKeys = Object.keys(en).sort()

  it('ja and en have the same keys', () => {
    expect(jaKeys).toEqual(enKeys)
  })

  it('no empty string values in ja', () => {
    for (const [key, value] of Object.entries(ja)) {
      if (typeof value === 'string') {
        expect(value.length, `ja.${key} is empty`).toBeGreaterThan(0)
      }
    }
  })

  it('no empty string values in en', () => {
    for (const [key, value] of Object.entries(en)) {
      if (typeof value === 'string') {
        expect(value.length, `en.${key} is empty`).toBeGreaterThan(0)
      }
    }
  })

  it('function values have same arity', () => {
    for (const key of jaKeys) {
      const jaVal = ja[key as keyof typeof ja]
      const enVal = en[key as keyof typeof en]
      if (typeof jaVal === 'function' && typeof enVal === 'function') {
        expect(jaVal.length, `${key}: arity mismatch`).toBe(enVal.length)
      }
    }
  })

  it('function values in ja are also functions in en', () => {
    for (const key of jaKeys) {
      const jaVal = ja[key as keyof typeof ja]
      const enVal = en[key as keyof typeof en]
      if (typeof jaVal === 'function') {
        expect(typeof enVal, `${key}: ja is function but en is not`).toBe('function')
      }
    }
  })
})
