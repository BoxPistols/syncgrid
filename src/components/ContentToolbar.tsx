import { Icon } from './Icon'
import type { LayoutMode, SortMode } from '../types'
import type { Messages } from '../i18n'

interface Props {
  layout: LayoutMode
  sort: SortMode
  onChangeLayout: (layout: LayoutMode) => void
  onChangeSort: (sort: SortMode) => void
  t: Messages
}

/** レイアウト切替 + ソート選択のツールバー要素 */
export function ContentToolbar({ layout, sort, onChangeLayout, onChangeSort, t }: Props) {
  return (
    <>
      <div className="sg-layout-switcher" role="radiogroup" aria-label={t.layout}>
        <button
          className={`sg-layout-switcher__btn${layout === 'tabmark' ? ' sg-layout-switcher__btn--active' : ''}`}
          onClick={() => onChangeLayout('tabmark')}
          title={t.layoutTabmark}
          aria-label={t.layoutTabmark}
          role="radio"
          aria-checked={layout === 'tabmark'}
        >
          <Icon name="grid" size={13} />
        </button>
        <button
          className={`sg-layout-switcher__btn${layout === 'list' ? ' sg-layout-switcher__btn--active' : ''}`}
          onClick={() => onChangeLayout('list')}
          title={t.layoutList}
          aria-label={t.layoutList}
          role="radio"
          aria-checked={layout === 'list'}
        >
          <Icon name="more" size={13} />
        </button>
      </div>
      <div className="sg-sort">
        <select className="sg-sort__select" value={sort} onChange={(e) => onChangeSort(e.target.value as SortMode)} aria-label={t.sort}>
          <option value="manual">{t.sortManual}</option>
          <option value="name-asc">{t.sortNameAsc}</option>
          <option value="name-desc">{t.sortNameDesc}</option>
          <option value="date-new">{t.sortDateNew}</option>
          <option value="date-old">{t.sortDateOld}</option>
          <option value="domain">{t.sortDomain}</option>
          <option value="last-used">{t.sortLastUsed}</option>
        </select>
      </div>
    </>
  )
}
