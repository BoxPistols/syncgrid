import { Icon } from './Icon'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { Messages } from '../i18n'

interface Props {
  targetId: string
  dueDates: Map<string, number>
  onSetDueDate: (id: string, dueDate: number | undefined) => void
  onClose: () => void
  t: Messages
}

/** Kanban アイテムの期限設定モーダル */
export function DueDateModal({ targetId, dueDates, onSetDueDate, onClose, t }: Props) {
  const trapRef = useFocusTrap<HTMLDivElement>()
  const current = dueDates.get(targetId)

  return (
    <div className="sg-modal-overlay" onClick={onClose}>
      <div ref={trapRef} className="sg-modal" role="dialog" aria-modal="true" aria-label={t.kanbanSetDueDate} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
        <div className="sg-modal__header">
          <span className="sg-modal__title">{t.kanbanSetDueDate}</span>
          <button className="sg-modal__close" onClick={onClose} aria-label={t.close}><Icon name="close" size={12} /></button>
        </div>
        <div className="sg-modal__body">
          <input
            type="date"
            className="sg-add-form__input"
            defaultValue={current ? new Date(current).toISOString().split('T')[0] : ''}
            autoFocus
            onChange={(e) => {
              const v = e.target.value
              if (v) {
                onSetDueDate(targetId, new Date(v + 'T23:59:59').getTime())
                onClose()
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
