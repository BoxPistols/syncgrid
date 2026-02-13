import { describe, it, expect } from 'vitest'
import { getFaviconUrl, getDomain } from '../favicon'

describe('getDomain', () => {
  it('extracts hostname from URL', () => {
    expect(getDomain('https://github.com/user/repo')).toBe('github.com')
  })

  it('strips www prefix', () => {
    expect(getDomain('https://www.example.com/path')).toBe('example.com')
  })

  it('returns input on invalid URL', () => {
    expect(getDomain('not-a-url')).toBe('not-a-url')
  })

  it('handles URLs with ports', () => {
    expect(getDomain('http://localhost:3000')).toBe('localhost')
  })

  it('handles subdomains', () => {
    expect(getDomain('https://docs.google.com')).toBe('docs.google.com')
  })
})

describe('getFaviconUrl', () => {
  it('returns chrome favicon URL for valid URL', () => {
    const result = getFaviconUrl('https://github.com', 64)
    expect(result).toContain('_favicon')
    expect(result).toContain('github.com')
    expect(result).toContain('size=64')
  })

  it('returns empty string for invalid URL', () => {
    expect(getFaviconUrl('not-a-url')).toBe('')
  })

  it('defaults size to 32', () => {
    const result = getFaviconUrl('https://example.com')
    expect(result).toContain('size=32')
  })
})
