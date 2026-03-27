import type { KanbanColumn, KanbanState } from '../types'

const STORAGE_KEY = 'syncgrid_kanban'

const EMPTY_STATE: KanbanState = { items: [] }

export async function loadKanban(): Promise<KanbanState> {
  const result = await chrome.storage.sync.get(STORAGE_KEY)
  const stored = result[STORAGE_KEY]
  if (!stored || typeof stored !== 'object' || !Array.isArray((stored as KanbanState).items)) {
    return { ...EMPTY_STATE }
  }
  return stored as KanbanState
}

export async function saveKanban(state: KanbanState): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: state })
}

export async function addToKanban(bookmarkId: string, column: KanbanColumn = 'todo'): Promise<KanbanState> {
  const state = await loadKanban()
  if (state.items.some((i) => i.bookmarkId === bookmarkId)) return state
  const maxOrder = state.items
    .filter((i) => i.column === column)
    .reduce((max, i) => Math.max(max, i.order), -1)
  state.items.push({ bookmarkId, column, order: maxOrder + 1 })
  await saveKanban(state)
  return state
}

export async function removeFromKanban(bookmarkId: string): Promise<KanbanState> {
  const state = await loadKanban()
  state.items = state.items.filter((i) => i.bookmarkId !== bookmarkId)
  await saveKanban(state)
  return state
}

export async function moveInKanban(
  bookmarkId: string,
  toColumn: KanbanColumn,
  toOrder: number,
): Promise<KanbanState> {
  const state = await loadKanban()
  const item = state.items.find((i) => i.bookmarkId === bookmarkId)
  if (!item) return state

  const fromColumn = item.column

  // 同じ列内の並べ替え
  if (fromColumn === toColumn) {
    const colItems = state.items
      .filter((i) => i.column === toColumn && i.bookmarkId !== bookmarkId)
      .sort((a, b) => a.order - b.order)
    colItems.splice(toOrder, 0, item)
    colItems.forEach((ci, idx) => { ci.order = idx })
    item.column = toColumn
  } else {
    // 元列の再番号
    const fromItems = state.items
      .filter((i) => i.column === fromColumn && i.bookmarkId !== bookmarkId)
      .sort((a, b) => a.order - b.order)
    fromItems.forEach((ci, idx) => { ci.order = idx })

    // 先列に挿入
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
  bookmarkId: string,
  dueDate: number | undefined,
): Promise<KanbanState> {
  const state = await loadKanban()
  const item = state.items.find((i) => i.bookmarkId === bookmarkId)
  if (!item) return state
  item.dueDate = dueDate
  await saveKanban(state)
  return state
}

/** 削除済みブックマークをカンバンから除去 */
export async function cleanupKanban(validIds: Set<string>): Promise<KanbanState> {
  const state = await loadKanban()
  const before = state.items.length
  state.items = state.items.filter((i) => validIds.has(i.bookmarkId))
  if (state.items.length !== before) {
    await saveKanban(state)
  }
  return state
}
