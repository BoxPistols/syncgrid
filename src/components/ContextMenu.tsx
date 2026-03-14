import { useEffect, useRef } from 'react'

export interface MenuItem {
  label: string
  icon?: string
  danger?: boolean
  action: () => void
}

interface Props {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  useEffect(() => {
    const firstBtn = ref.current?.querySelector<HTMLButtonElement>('.sg-context-menu__item')
    firstBtn?.focus()
  }, [])

  // ビューポート内に収める（負の値にならないよう保護）
  const menuHeight = items.length * 40 + 20
  const style: React.CSSProperties = {
    left: Math.max(0, Math.min(x, window.innerWidth - 200)),
    top: Math.max(0, Math.min(y, window.innerHeight - menuHeight)),
  }

  return (
    <div ref={ref} className="sg-context-menu" style={style} role="menu">
      {items.map((item, i) =>
        item.label === '---' ? (
          <div key={i} className="sg-context-menu__sep" role="separator" />
        ) : (
          <button
            key={i}
            className={`sg-context-menu__item ${item.danger ? 'sg-context-menu__item--danger' : ''}`}
            role="menuitem"
            onClick={() => {
              item.action()
              onClose()
            }}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </button>
        ),
      )}
    </div>
  )
}
