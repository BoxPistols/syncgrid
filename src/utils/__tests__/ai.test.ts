import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateTitle } from '../ai'
import type { AISettings } from '../../types'
import { DEFAULT_AI_SETTINGS } from '../../types'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

const openaiSettings: AISettings = {
  ...DEFAULT_AI_SETTINGS,
  provider: 'openai',
  openaiApiKey: 'sk-test-key',
  openaiModel: 'gpt-4.1-nano',
}

const geminiSettings: AISettings = {
  ...DEFAULT_AI_SETTINGS,
  provider: 'gemini',
  geminiApiKey: 'test-gemini-key',
  geminiModel: 'gemini-2.5-flash',
}

describe('generateTitle', () => {
  it('throws when provider is none', async () => {
    await expect(
      generateTitle('https://example.com', DEFAULT_AI_SETTINGS)
    ).rejects.toThrow('AI provider not configured')
  })

  it('calls OpenAI API correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Example Site' } }],
      }),
    })

    const result = await generateTitle('https://example.com', openaiSettings)

    expect(result).toBe('Example Site')
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Authorization']).toBe('Bearer sk-test-key')
    const body = JSON.parse(opts.body)
    expect(body.model).toBe('gpt-4.1-nano')
  })

  it('calls Gemini API correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: 'Example Page' }] } }],
      }),
    })

    const result = await generateTitle('https://example.com', geminiSettings)

    expect(result).toBe('Example Page')
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('generativelanguage.googleapis.com')
    expect(url).toContain('gemini-2.5-flash')
    expect(url).toContain('key=test-gemini-key')
  })

  it('throws on OpenAI API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    })

    await expect(
      generateTitle('https://example.com', openaiSettings)
    ).rejects.toThrow('OpenAI API error (401)')
  })

  it('throws on Gemini API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    })

    await expect(
      generateTitle('https://example.com', geminiSettings)
    ).rejects.toThrow('Gemini API error (403)')
  })

  it('throws on empty OpenAI response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ choices: [] }),
    })

    await expect(
      generateTitle('https://example.com', openaiSettings)
    ).rejects.toThrow('Empty response from OpenAI')
  })

  it('throws on empty Gemini response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ candidates: [] }),
    })

    await expect(
      generateTitle('https://example.com', geminiSettings)
    ).rejects.toThrow('Empty response from Gemini')
  })

  it('throws when OpenAI API key is empty', async () => {
    const noKey = { ...openaiSettings, openaiApiKey: '' }
    await expect(
      generateTitle('https://example.com', noKey)
    ).rejects.toThrow('OpenAI API key not set')
  })

  it('throws when Gemini API key is empty', async () => {
    const noKey = { ...geminiSettings, geminiApiKey: '' }
    await expect(
      generateTitle('https://example.com', noKey)
    ).rejects.toThrow('Gemini API key not set')
  })
})
