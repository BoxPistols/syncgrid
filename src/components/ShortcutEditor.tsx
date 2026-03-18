import { useState, useEffect, useRef, useCallback } from 'react'
import type { ShortcutConfig, ShortcutAction, KeyBinding } from '../types'
import { DEFAULT_SHORTCUTS } from '../types'
import { formatBinding, captureBinding } from '../utils/keyboard'
import type { Messages } from '../i18n'

interface Props {
  shortcuts: ShortcutConfig
  onChange: (shortcuts: ShortcutConfig) => void
  t: Messages
}

const ACTIONS: { key: ShortcutAction; labelKey: keyof Messages }[] = [
  { key: 'search', labelKey: 'shortcutSearch' },
  { key: 'addBookmark', labelKey: 'shortcutAddBookmark' },
  { key: 'layoutMagazine', labelKey: 'shortcutLayoutMagazine' },
  { key: 'layoutCard', labelKey: 'shortcutLayoutCard' },
  { key: 'layoutList', labelKey: 'shortcutLayoutList' },
  { key: 'deleteSelected', labelKey: 'shortcutDeleteSelected' },
  { key: 'selectAll', labelKey: 'shortcutSelectAll' },
]

export function ShortcutEditor({ shortcuts, onChange, t }: Props) {
  const [recording, setRecording] = useState<ShortcutAction | null>(null)
  const recRef = useRef<HTMLDivElement>(null)

  const handleRecord = useCallback(
    (action: ShortcutAction) => {
      setRecording(action)
    },
    [],
  )

  useEffect(() => {
    if (!recording) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const binding = captureBinding(e)
      if (!binding) return

      onChange({ ...shortcuts, [recording]: binding })
      setRecording(null)
    }

    const handleClick = (e: MouseEvent) => {
      if (recRef.current && !recRef.current.contains(e.target as Node)) {
        setRecording(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [recording, shortcuts, onChange])

  const handleReset = useCallback(() => {
    onChange(DEFAULT_SHORTCUTS)
  }, [onChange])

  return (
    <div ref={recRef}>
      <table className="sg-shortcut-table">
        <tbody>
          {ACTIONS.map(({ key, labelKey }) => (
            <tr key={key}>
              <td>{t[labelKey] as string}</td>
              <td>
                <div
                  className={`sg-shortcut__key ${recording === key ? 'sg-shortcut__key--recording' : ''}`}
                  tabIndex={0}
                  role="button"
                  onClick={() => handleRecord(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleRecord(key)
                    }
                  }}
                >
                  {recording === key ? t.shortcutPressKey : formatBinding(shortcuts[key] as KeyBinding)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sg-shortcut-table__footer">
        <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={handleReset}>
          {t.shortcutReset}
        </button>
      </div>
    </div>
  )
}
