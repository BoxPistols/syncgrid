/**
 * AI自動分類モーダル — suggestCategories()の結果を表示し、フォルダ作成＆移動を適用
 */
import { useState, useCallback } from 'react'
import { Icon } from './Icon'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { suggestCategories } from '../utils/ai'
import { ensureAiPermission } from '../utils/permissions'
import { createGroup } from '../utils/bookmarks'
import type { SyncGridItem, SyncGridGroup, AISettings } from '../types'
import type { Messages } from '../i18n'

interface Props {
  items: SyncGridItem[]
  parentFolder: SyncGridGroup
  aiSettings: AISettings
  onDone: () => void
  onClose: () => void
  t: Messages
}

type Phase = 'loading' | 'result' | 'applying' | 'error'

export function AiCategorizeModal({ items, parentFolder, aiSettings, onDone, onClose, t }: Props) {
  const trapRef = useFocusTrap<HTMLDivElement>()
  const [phase, setPhase] = useState<Phase>('loading')
  const [categories, setCategories] = useState<Record<string, string[]>>({})
  const [error, setError] = useState('')

  // 初回ロード（モーダルを開いたジェスチャー直後にAIホスト権限を確保）
  useState(() => {
    ensureAiPermission(aiSettings.provider)
      .then((granted) => {
        if (!granted) throw new Error('AI host permission not granted')
        return suggestCategories(
          items.map((i) => ({ title: i.title, url: i.url })),
          aiSettings,
        )
      })
      .then((result) => {
        setCategories(result)
        setPhase('result')
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
        setPhase('error')
      })
  })

  // 適用: フォルダ作成 → ブックマーク移動
  const handleApply = useCallback(async () => {
    setPhase('applying')
    try {
      const titleToItem = new Map(items.map((i) => [i.title, i]))

      for (const [categoryName, titles] of Object.entries(categories)) {
        // フォルダ作成
        const folder = await createGroup(categoryName, parentFolder.id)

        // ブックマーク移動
        for (const title of titles) {
          const item = titleToItem.get(title)
          if (item) {
            await chrome.bookmarks.move(item.id, { parentId: folder.id })
          }
        }
      }

      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }, [categories, items, parentFolder.id, onDone])

  return (
    <div className="sg-modal-overlay" onClick={onClose}>
      <div
        ref={trapRef}
        className="sg-modal sg-modal--wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
      >
        <div className="sg-modal__header">
          <span className="sg-modal__title">
            <Icon name="bot" size={16} /> {t.aiCategorizeResult}
          </span>
          <button className="sg-modal__close" onClick={onClose} aria-label={t.close}>
            <Icon name="close" size={12} />
          </button>
        </div>

        <div className="sg-modal__body sg-settings">
          {phase === 'loading' && (
            <div className="sg-ai-categorize__loading">
              <Icon name="spinner" size={20} />
              <span>{t.aiCategorizing}</span>
            </div>
          )}

          {phase === 'error' && (
            <div className="sg-ai-categorize__error">
              <Icon name="x-circle" size={16} />
              <span>{t.aiCategorizeError}{error ? `: ${error}` : ''}</span>
            </div>
          )}

          {(phase === 'result' || phase === 'applying') && (
            <div className="sg-ai-categorize__results">
              {Object.entries(categories).map(([name, titles]) => (
                <div key={name} className="sg-ai-categorize__group">
                  <div className="sg-ai-categorize__group-header">
                    <Icon name="folder" size={14} />
                    <strong>{name}</strong>
                    <span className="sg-ai-categorize__count">{titles.length}</span>
                  </div>
                  <ul className="sg-ai-categorize__list">
                    {titles.map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sg-modal__footer">
          <div className="sg-spacer" />
          {phase === 'result' && (
            <button className="sg-btn sg-btn--primary" onClick={handleApply}>
              <Icon name="check-circle" size={14} /> {t.aiCategorizeApply}
            </button>
          )}
          {phase === 'applying' && (
            <button className="sg-btn sg-btn--primary" disabled>
              <Icon name="spinner" size={14} /> {t.aiCategorizing}
            </button>
          )}
          <button className="sg-btn sg-btn--ghost" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  )
}
