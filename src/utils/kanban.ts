import type { KanbanColumn, KanbanState } from '../types'

const STORAGE_KEY = 'syncgrid_kanban'

const EMPTY_STATE: KanbanState = { items: [] }

export async function loadKanban(): Promise<KanbanState> {
  const storage = globalThis.chrome?.storage?.sync
  if (!storage?.get) return { ...EMPTY_STATE }
  const result = await storage.get(STORAGE_KEY)
  const stored = result[STORAGE_KEY]
  if (!stored || typeof stored !== 'object' || !Array.isArray((stored as KanbanState).items)) {
    return { ...EMPTY_STATE }
  }
  // マイグレーション: 旧形式（bookmarkId）→ 新形式（url）
  const raw = stored as { items: Array<Record<string, unknown>> }
  const hasOld = raw.items.some((i) => 'bookmarkId' in i && !('url' in i))
  if (hasOld) {
    raw.items = raw.items.filter((i) => 'url' in i && typeof i.url === 'string')
    const cleaned = { items: raw.items } as unknown as KanbanState
    saveKanban(cleaned)
    return cleaned
  }
  return stored as KanbanState
}

export async function saveKanban(state: KanbanState): Promise<void> {
  const storage = globalThis.chrome?.storage?.sync
  if (!storage?.set) return
  await storage.set({ [STORAGE_KEY]: state })
}

export async function addToKanban(url: string, column: KanbanColumn = 'todo'): Promise<KanbanState> {
  const state = await loadKanban()
  if (state.items.some((i) => i.url === url)) return state
  const maxOrder = state.items
    .filter((i) => i.column === column)
    .reduce((max, i) => Math.max(max, i.order), -1)
  state.items.push({ url, column, order: maxOrder + 1 })
  await saveKanban(state)
  return state
}

export async function removeFromKanban(url: string): Promise<KanbanState> {
  const state = await loadKanban()
  state.items = state.items.filter((i) => i.url !== url)
  await saveKanban(state)
  return state
}

export async function moveInKanban(
  url: string,
  toColumn: KanbanColumn,
  toOrder: number,
): Promise<KanbanState> {
  const state = await loadKanban()
  const item = state.items.find((i) => i.url === url)
  if (!item) return state

  const fromColumn = item.column

  if (fromColumn === toColumn) {
    const colItems = state.items
      .filter((i) => i.column === toColumn && i.url !== url)
      .sort((a, b) => a.order - b.order)
    colItems.splice(toOrder, 0, item)
    colItems.forEach((ci, idx) => { ci.order = idx })
  } else {
    const fromItems = state.items
      .filter((i) => i.column === fromColumn && i.url !== url)
      .sort((a, b) => a.order - b.order)
    fromItems.forEach((ci, idx) => { ci.order = idx })

    const toItems = state.items
      .filter((i) => i.column === toColumn)
      .sort((a, b) => a.order - b.order)
    item.column = toColumn
    toItems.splice(toOrder, 0, item)
    toItems.forEach((ci, idx) => { ci.order = idx })
  }

  await saveKanban(state)
  return state
}

/** 期限を設定/解除 */
export async function setDueDateInKanban(
  url: string,
  dueDate: number | undefined,
): Promise<KanbanState> {
  const state = await loadKanban()
  const item = state.items.find((i) => i.url === url)
  if (!item) return state
  item.dueDate = dueDate
  await saveKanban(state)
  return state
}

/** ブックマークに存在しないURLをカンバンから除去 */
export async function cleanupKanban(validUrls: Set<string>): Promise<KanbanState> {
  const state = await loadKanban()
  const before = state.items.length
  state.items = state.items.filter((i) => validUrls.has(i.url))
  if (state.items.length !== before) {
    await saveKanban(state)
  }
  return state
}
