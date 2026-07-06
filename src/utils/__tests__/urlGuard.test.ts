import { describe, it, expect } from 'vitest'
import { isFetchableUrl } from '../urlGuard'

describe('isFetchableUrl — OGP/タイトル取得前のURLガード', () => {
  it.each([
    'https://example.com/',
    'http://example.com/page?q=1',
  ])('http/https は許可: %s', (url) => {
    expect(isFetchableUrl(url)).toBe(true)
  })

  it.each([
    'file:///Users/x/Library/Mobile%20Documents/mock.html',
    'file:///Users/x/Desktop/onboarding/pdf/onboarding-all.html',
    'chrome://extensions/',
    'chrome-extension://abc/index.html',
    'data:text/html,hello',
    'javascript:alert(1)',
  ])('非httpスキームは拒否: %s', (url) => {
    expect(isFetchableUrl(url)).toBe(false)
  })

  it.each([
    'https://chromewebstore.google.com/detail/crx-gcal-url-opener/pjginhohpenlemfdcjbahjbhnpinfnlm',
    'https://chrome.google.com/webstore/detail/xyz',
  ])('拡張がアクセスできない保護オリジンは拒否: %s', (url) => {
    expect(isFetchableUrl(url)).toBe(false)
  })

  it('パース不能な文字列は拒否', () => {
    expect(isFetchableUrl('not a url')).toBe(false)
    expect(isFetchableUrl('')).toBe(false)
  })
})
