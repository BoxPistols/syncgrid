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
import { fetchPageTitle } from './fetchTitle'
import { ensureAiPermission } from './permissions'

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

/**
 * URLからブックマークタイトルを生成
 * 1. まずページの<title>タグを直接取得（CORS許可時）
 * 2. 取得できない場合はAIにフォールバック
 */
export async function generateTitle(url: string, settings: AISettings): Promise<string> {
  // まずページの<title>タグを直接取得
  const pageTitle = await fetchPageTitle(url)
  if (pageTitle) return pageTitle

  // AI フォールバック
  if (settings.provider === 'none') {
    throw new Error('AI provider not configured')
  }

  const prompt = [
    'Given this URL, generate a concise, descriptive bookmark title (max 60 chars).',
    'IMPORTANT: Use the SAME LANGUAGE as the page content. If the page is Japanese, respond in Japanese. Do NOT translate.',
    'If you can determine the actual page title from the URL structure, use that.',
    'Return ONLY the title text, nothing else.',
    '',
    `URL: ${url}`,
  ].join('\n')

  if (settings.provider === 'openai') {
    return callOpenAI(prompt, settings.openaiApiKey, settings.openaiModel)
  }

  if (settings.provider === 'gemini') {
    return callGemini(prompt, settings.geminiApiKey, settings.geminiModel)
  }

  throw new Error(`Unknown provider: ${settings.provider}`)
}

/**
 * URLからタグを自動生成
 * 返り値: タグ文字列の配列 (最大5個)
 */
export async function generateTags(url: string, title: string, settings: AISettings): Promise<string[]> {
  if (settings.provider === 'none') {
    throw new Error('AI provider not configured')
  }

  const prompt = [
    'Given this bookmark URL and title, suggest 3-5 short tags for categorization.',
    'Rules:',
    '- Each tag should be 1-2 words, lowercase',
    '- Use the same language as the title. If the title is Japanese, use Japanese tags.',
    '- Return ONLY a JSON array of strings, nothing else.',
    '- Example: ["tech","react","frontend"]',
    '',
    `URL: ${url}`,
    `Title: ${title}`,
  ].join('\n')

  const raw =
    settings.provider === 'openai'
      ? await callOpenAI(prompt, settings.openaiApiKey, settings.openaiModel)
      : await callGemini(prompt, settings.geminiApiKey, settings.geminiModel)

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === 'string').slice(0, 5)
  } catch {
    // JSONパース失敗時はカンマ区切りとして処理
    return raw
      .replace(/[[\]"]/g, '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5)
  }
  return []
}

/**
 * 複数ブックマークを自動分類（フォルダ提案）
 */
export async function suggestCategories(
  items: { title: string; url: string }[],
  settings: AISettings,
): Promise<Record<string, string[]>> {
  if (settings.provider === 'none') throw new Error('AI provider not configured')

  const list = items.map((i) => `- ${i.title} (${i.url})`).join('\n')
  const prompt = [
    'Given these bookmarks, suggest 3-6 category folders and assign each bookmark to a category.',
    'Use the same language as the bookmark titles.',
    'Return ONLY valid JSON: {"categoryName": ["bookmark title 1", "bookmark title 2"], ...}',
    '',
    list,
  ].join('\n')

  const raw =
    settings.provider === 'openai'
      ? await callOpenAI(prompt, settings.openaiApiKey, settings.openaiModel, 500)
      : await callGemini(prompt, settings.geminiApiKey, settings.geminiModel, 500)

  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/** Call OpenAI Chat Completions API */
async function callOpenAI(prompt: string, apiKey: string, model: string, maxTokens: number = 100): Promise<string> {
  if (!apiKey) throw new Error('OpenAI API key not set')
  await ensureAiPermission('openai')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates concise bookmark titles. Always respond in the same language as the page content. Never translate.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
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
async function callGemini(prompt: string, apiKey: string, model: string, maxTokens: number = 100): Promise<string> {
  if (!apiKey) throw new Error('Gemini API key not set')
  await ensureAiPermission('gemini')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
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
