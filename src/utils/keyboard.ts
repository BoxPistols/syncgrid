/**
 * OS判定とキーボードショートカットユーティリティ
 * Mac/Windows/Linuxで適切なキー表示とイベント判定を行う
 */

const isMac =
  typeof navigator !== 'undefined' &&
  (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent))

/** Modifier key label (⌘ on Mac, Ctrl on others) */
export const MOD_LABEL = isMac ? '⌘' : 'Ctrl'

/** Enter key label */
export const ENTER_LABEL = isMac ? '⏎' : 'Enter'

/** Modifier key event check */
export function isModKey(e: KeyboardEvent | React.KeyboardEvent): boolean {
  return isMac ? e.metaKey : e.ctrlKey
}

/** IME変換中かどうかを判定 */
export function isComposing(e: KeyboardEvent | React.KeyboardEvent): boolean {
  if ('nativeEvent' in e) {
    return (e as React.KeyboardEvent).nativeEvent.isComposing
  }
  return (e as KeyboardEvent).isComposing
}
