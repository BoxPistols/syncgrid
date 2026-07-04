import type { KanbanColumn, KanbanState } from '../types'

const STORAGE_KEY = 'syncgrid_kanban'

const EMPTY_STATE: KanbanState = { items: [] }

/** 保存結果。synced=false は sync ミラーが失敗（quota等）した場合。local保存は成功している */
export interface SaveResult {
  synced: boolean
}

function isValidState(value: unknown): value is KanbanState {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as KanbanState).items)
  )
}

/**
 * 旧形式（bookmarkId のみ）→ 新形式（url）へマイグレーション。
 * url を持たないアイテムは破棄する。変換が発生した場合は再保存する。
 */
function migrate(stored: KanbanState): { state: KanbanState; changed: boolean } {
  const raw = stored as unknown as { items: Array<Record<string, unknown>> }
  const hasOld = raw.items.some((i) => 'bookmarkId' in i && !('url' in i))
  if (!hasOld) return { state: stored, changed: false }
  const items = raw.items.filter((i) => 'url' in i && typeof i.url === 'string')
  return { state: { items } as unknown as KanbanState, changed: true }
}

/**
 * カンバン状態を読み込む。
 * 主保存は chrome.storage.local。local に無ければ sync ミラーから復元する
 * （新デバイスでの初回起動など）。
 */
export async function loadKanban(): Promise<KanbanState> {
  const local = globalThis.chrome?.storage?.local
  const sync = globalThis.chrome?.storage?.sync

  let stored: unknown
  if (local?.get) {
    const result = await local.get(STORAGE_KEY)
    stored = result[STORAGE_KEY]
  }
  // local に無ければ sync から復元
  if (!isValidState(stored) && sync?.get) {
    const result = await sync.get(STORAGE_KEY)
    stored = result[STORAGE_KEY]
  }

  if (!isValidState(stored)) return { ...EMPTY_STATE }

  const { state, changed } = migrate(stored)
  if (changed) {
    // マイグレーション結果を永続化（成否は問わない）
    saveKanban(state).catch(() => {})
  }
  return state
}

/**
 * カンバン状態を保存する。
 * local を主保存として確実に書き込み（失敗時は throw）、
 * sync へはベストエフォートでミラーする（quota 超過等は握りつぶし synced=false を返す）。
 */
export async function saveKanban(state: KanbanState): Promise<SaveResult> {
  const local = globalThis.chrome?.storage?.local
  if (local?.set) {
    // 主保存。失敗（QUOTA_BYTES 超過など）は呼び出し側へ伝播させる
    await local.set({ [STORAGE_KEY]: state })
  }

  const sync = globalThis.chrome?.storage?.sync
  if (sync?.set) {
    try {
      await sync.set({ [STORAGE_KEY]: state })
      return { synced: true }
    } catch {
      // sync は 8KB/item・120回/分 の制限で失敗しうる。local には保存済みなので実害は同期のみ
      return { synced: false }
    }
  }
  return { synced: false }
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

/**
 * カンバンアイテムを移動する。
 * 挿入位置は「beforeUrl のカードの直前」で指定する（beforeUrl=null なら列末尾）。
 * ドラッグ対象を除いた並びに対してアンカー解決するため、index ずれ（off-by-one）が起きない。
 */
export async function moveInKanban(
  url: string,
  toColumn: KanbanColumn,
  beforeUrl: string | null,
): Promise<KanbanState> {
  const state = await loadKanban()
  const item = state.items.find((i) => i.url === url)
  if (!item) return state

  const fromColumn = item.column
  item.column = toColumn

  // 移動元の列を詰め直す（別列へ移った場合）
  if (fromColumn !== toColumn) {
    state.items
      .filter((i) => i.column === fromColumn)
      .sort((a, b) => a.order - b.order)
      .forEach((ci, idx) => { ci.order = idx })
  }

  // 移動先の列: ドラッグ対象を除いた並びにアンカー挿入
  const colItems = state.items
    .filter((i) => i.column === toColumn && i.url !== url)
    .sort((a, b) => a.order - b.order)
  const anchorIdx = beforeUrl ? colItems.findIndex((i) => i.url === beforeUrl) : -1
  const insertAt = anchorIdx >= 0 ? anchorIdx : colItems.length
  colItems.splice(insertAt, 0, item)
  colItems.forEach((ci, idx) => { ci.order = idx })

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
