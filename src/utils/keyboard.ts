/**
 * OS判定とキーボードショートカットユーティリティ
 */

import type { KeyBinding } from '../types'

export const isMac =
  typeof navigator !== 'undefined' &&
  (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent))

export const MOD_LABEL = isMac ? '⌘' : 'Ctrl'
export const ENTER_LABEL = isMac ? '⏎' : 'Enter'

/** プラットフォーム修飾キー判定 */
export function isModKey(e: KeyboardEvent | React.KeyboardEvent): boolean {
  return isMac ? e.metaKey : e.ctrlKey
}

/** IME変換中かどうか */
export function isComposing(e: KeyboardEvent | React.KeyboardEvent): boolean {
  if ('nativeEvent' in e) {
    return (e as React.KeyboardEvent).nativeEvent.isComposing
  }
  return (e as KeyboardEvent).isComposing
}

/** KeyboardEventがKeyBindingと一致するか判定 */
export function matchesBinding(e: KeyboardEvent, binding: KeyBinding): boolean {
  // 修飾キー自体の押下は無視
  if (['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) return false

  const keyMatch =
    e.key.toLowerCase() === binding.key.toLowerCase() ||
    (binding.key === 'Delete' && e.key === 'Backspace') // Delete/Backspace両対応

  return keyMatch && e.metaKey === binding.meta && e.ctrlKey === binding.ctrl && e.shiftKey === binding.shift && e.altKey === binding.alt
}

/** KeyBindingから表示用ラベルを生成 */
export function formatBinding(b: KeyBinding): string {
  const parts: string[] = []
  if (b.ctrl) parts.push(isMac ? '⌃' : 'Ctrl+')
  if (b.alt) parts.push(isMac ? '⌥' : 'Alt+')
  if (b.shift) parts.push(isMac ? '⇧' : 'Shift+')
  if (b.meta) parts.push(isMac ? '⌘' : 'Win+')

  const KEY_LABELS: Record<string, string> = {
    Delete: isMac ? '⌫' : 'Del',
    Backspace: isMac ? '⌫' : 'BS',
    Enter: isMac ? '⏎' : 'Enter',
    Escape: 'Esc',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    ' ': 'Space',
  }
  parts.push(KEY_LABELS[b.key] ?? b.key.toUpperCase())
  return parts.join('')
}

/** KeyboardEventからKeyBindingをキャプチャ */
export function captureBinding(e: KeyboardEvent): KeyBinding | null {
  if (['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) return null
  return {
    key: e.key,
    meta: e.metaKey,
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
  }
}
