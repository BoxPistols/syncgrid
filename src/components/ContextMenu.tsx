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

  // ビューポート内に収める
  const style: React.CSSProperties = {
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - items.length * 40 - 20),
  }

  return (
    <div ref={ref} className="sg-context-menu" style={style}>
      {items.map((item, i) =>
        item.label === '---' ? (
          <div key={i} className="sg-context-menu__sep" />
        ) : (
          <button
            key={i}
            className={`sg-context-menu__item ${item.danger ? 'sg-context-menu__item--danger' : ''}`}
            onClick={() => { item.action(); onClose() }}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </button>
        )
      )}
    </div>
  )
}
