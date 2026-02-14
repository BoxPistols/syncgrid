/**
 * AI API Client — OpenAI / Gemini
 *
 * Provides AI-powered features for SyncGrid:
 * - Generate bookmark titles from URLs
 *
 * Security:
 * - API keys are stored in chrome.storage.local (never sent except to the chosen provider)
 * - Only communicates with declared host_permissions endpoints
 */

import type { AISettings } from '../types'

/** Test AI API connection by calling a lightweight endpoint */
export async function testAiConnection(settings: AISettings): Promise<{ ok: boolean; error?: string }> {
  try {
    if (settings.provider === 'openai') {
      if (!settings.openaiApiKey) return { ok: false, error: 'API key not set' }
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${settings.openaiApiKey}` },
      })
      if (!res.ok) {
        const err = await res.text()
        return { ok: false, error: `${res.status}: ${err}` }
      }
      return { ok: true }
    }

    if (settings.provider === 'gemini') {
      if (!settings.geminiApiKey) return { ok: false, error: 'API key not set' }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${settings.geminiApiKey}`)
      if (!res.ok) {
        const err = await res.text()
        return { ok: false, error: `${res.status}: ${err}` }
      }
      return { ok: true }
    }

    return { ok: false, error: 'No provider selected' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/** Generate a bookmark title from a URL using the configured AI provider */
export async function generateTitle(url: string, settings: AISettings): Promise<string> {
  if (settings.provider === 'none') {
    throw new Error('AI provider not configured')
  }

  const prompt = `Given this URL, generate a concise, descriptive bookmark title (max 60 chars). Return ONLY the title text, nothing else.\n\nURL: ${url}`

  if (settings.provider === 'openai') {
    return callOpenAI(prompt, settings.openaiApiKey, settings.openaiModel)
  }

  if (settings.provider === 'gemini') {
    return callGemini(prompt, settings.geminiApiKey, settings.geminiModel)
  }

  throw new Error(`Unknown provider: ${settings.provider}`)
}

/** Call OpenAI Chat Completions API */
async function callOpenAI(prompt: string, apiKey: string, model: string): Promise<string> {
  if (!apiKey) throw new Error('OpenAI API key not set')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that generates concise bookmark titles.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 100,
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Empty response from OpenAI')
  return content
}

/** Call Gemini generateContent API */
async function callGemini(prompt: string, apiKey: string, model: string): Promise<string> {
  if (!apiKey) throw new Error('Gemini API key not set')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 100,
        temperature: 0.3,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!content) throw new Error('Empty response from Gemini')
  return content
}
