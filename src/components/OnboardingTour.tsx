/**
 * オンボーディングツアー — intro.js相当を軽量自前実装
 * ランタイム依存なし（React + CSSのみ）
 */

import { useState, useEffect, useCallback } from 'react'
import { Icon } from './Icon'
import type { Messages } from '../i18n'

interface TourStep {
  target: string // CSSセレクタ
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

interface Props {
  steps: TourStep[]
  onComplete: () => void
  t: Messages
}

export function OnboardingTour({ steps, onComplete, t }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const step = steps[currentStep]

  // ターゲット要素の位置を取得
  useEffect(() => {
    if (!step) return
    const el = document.querySelector(step.target)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const timer = setTimeout(() => {
        setRect(el.getBoundingClientRect())
      }, 300)
      return () => clearTimeout(timer)
    }
    // ターゲットが見つからない場合は中央表示（rectはnull初期値のまま）
  }, [step])

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      onComplete()
    }
  }, [currentStep, steps.length, onComplete])

  const handleSkip = useCallback(() => {
    onComplete()
  }, [onComplete])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip()
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext()
      if (e.key === 'ArrowLeft' && currentStep > 0) setCurrentStep((s) => s - 1)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleNext, handleSkip, currentStep])

  if (!step) return null

  const pos = step.position ?? 'bottom'
  const tooltipStyle: React.CSSProperties = rect
    ? {
        left: pos === 'right' ? rect.right + 12 : pos === 'left' ? rect.left - 320 - 12 : rect.left,
        top: pos === 'bottom' ? rect.bottom + 12 : pos === 'top' ? rect.top - 12 : rect.top,
        transform: pos === 'top' ? 'translateY(-100%)' : undefined,
      }
    : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <div className="sg-tour-overlay">
      {/* スポットライト穴 */}
      {rect && (
        <div
          className="sg-tour-spotlight"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      {/* ツールチップ */}
      <div className="sg-tour-tooltip" style={tooltipStyle}>
        <div className="sg-tour-tooltip__header">
          <span className="sg-tour-tooltip__step">
            {currentStep + 1} / {steps.length}
          </span>
          <button className="sg-tour-tooltip__close" onClick={handleSkip}>
            <Icon name="close" size={12} />
          </button>
        </div>
        <h3 className="sg-tour-tooltip__title">{step.title}</h3>
        <p className="sg-tour-tooltip__desc">{step.description}</p>
        <div className="sg-tour-tooltip__actions">
          <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={handleSkip}>
            {t.close}
          </button>
          <button className="sg-btn sg-btn--sm sg-btn--primary" onClick={handleNext}>
            {currentStep < steps.length - 1 ? 'Next →' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
