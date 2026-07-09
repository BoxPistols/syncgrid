import type { KanbanColumn, KanbanItem, KanbanState } from '../types'
import { mergeKanban, migrateToV2 } from './kanbanMerge'

const STORAGE_KEY = 'syncgrid_kanban'

const EMPTY_STATE: KanbanState = { schema: 2, items: [], updatedAt: 0 }

/** 保存結果。state は updatedAt をスタンプした保存済み状態（引数は変異させない） */
export interface SaveResult {
  state: KanbanState
}

/** 変更系ヘルパの結果 */
export interface KanbanMutationResult {
  state: KanbanState
}

function isValidState(value: unknown): value is KanbanState {
  return (
    !!value &&
    typeof value === 'object' &&
    Array.isArray((value as { items?: unknown }).items)
  )
}

/**
 * カンバン状態を読み込む。
 * v1（board単位LWW、chrome.storage.sync ミラー併用）形式は自動でv2へマイグレーションする。
 * chrome.storage.sync に残る旧データは検出時に一度だけ取り込み、以後は使わない
 * （sync は拡張ID単位で分離される・8KB/item quota があり、カンバン同期の主経路には向かないため廃止）。
 */
export async function loadKanban(): Promise<KanbanState> {
  const local = globalThis.chrome?.storage?.local
  const sync = globalThis.chrome?.storage?.sync

  let localState: KanbanState | undefined
  if (local?.get) {
    const result = await local.get(STORAGE_KEY)
    if (isValidState(result[STORAGE_KEY])) localState = result[STORAGE_KEY]
  }

  // 旧 sync ミラーの一度きりの回収（以後 sync へは書かない）
  if (sync?.get) {
    try {
      const result = await sync.get(STORAGE_KEY)
      const legacySync = result[STORAGE_KEY]
      if (isValidState(legacySync)) {
        const migratedSync = migrateToV2(legacySync)
        const migratedLocal = localState ? migrateToV2(localState) : EMPTY_STATE
        const merged = mergeKanban([migratedLocal, migratedSync])
        if (local?.set) await local.set({ [STORAGE_KEY]: merged })
        if (sync.remove) await sync.remove(STORAGE_KEY).catch(() => {})
        localState = merged
      }
    } catch {
      // sync が読めない環境では local のみで動作する
    }
  }

  if (!localState) return { ...EMPTY_STATE }

  // schema:2 なら migrateToV2 はそのまま返す（無変換）ため、変換が発生したかどうかで再保存要否を判定できる
  const wasV2 = (localState as { schema?: number }).schema === 2
  const v2 = migrateToV2(localState)
  if (!wasV2) await saveKanban(v2)
  return v2
}

/** カンバン状態を local へ保存する（同期はフォルダ経由の kanbanSync.ts が別途担う） */
export async function saveKanban(state: KanbanState): Promise<SaveResult> {
  const stamped: KanbanState = { ...state, schema: 2, updatedAt: Date.now() }
  const local = globalThis.chrome?.storage?.local
  if (local?.set) {
    await local.set({ [STORAGE_KEY]: stamped })
  }
  return { state: stamped }
}

export async function addToKanban(
  url: string,
  column: KanbanColumn = 'todo',
): Promise<KanbanMutationResult> {
  const state = await loadKanban()
  const existing = state.items.find((i) => i.url === url)
  if (existing && !existing.deletedAt) return { state }

  const maxOrder = state.items
    .filter((i) => i.column === column && !i.deletedAt)
    .reduce((max, i) => Math.max(max, i.order), -1)
  const now = Date.now()
  const newItem: KanbanItem = { url, column, order: maxOrder + 1, updatedAt: now }

  if (existing) {
    // 以前削除されたアイテムの復活: 既存レコードを更新
    Object.assign(existing, newItem, { deletedAt: undefined })
  } else {
    state.items.push(newItem)
  }
  return toMutationResult(await saveKanban(state))
}

/** 削除はトゥームストーン化する（ハード削除は cleanupKanban / TTL 経過時のみ） */
export async function removeFromKanban(url: string): Promise<KanbanMutationResult> {
  const state = await loadKanban()
  const item = state.items.find((i) => i.url === url)
  if (!item) return { state }
  const now = Date.now()
  item.deletedAt = now
  item.updatedAt = now
  return toMutationResult(await saveKanban(state))
}

function toMutationResult(save: SaveResult): KanbanMutationResult {
  return { state: save.state }
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
): Promise<KanbanMutationResult> {
  const state = await loadKanban()
  const item = state.items.find((i) => i.url === url && !i.deletedAt)
  if (!item) return { state }

  const fromColumn = item.column
  const now = Date.now()
  item.column = toColumn
  item.updatedAt = now

  // 移動元の列を詰め直す（別列へ移った場合）
  if (fromColumn !== toColumn) {
    state.items
      .filter((i) => i.column === fromColumn && !i.deletedAt)
      .sort((a, b) => a.order - b.order)
      .forEach((ci, idx) => { ci.order = idx })
  }

  // 移動先の列: ドラッグ対象を除いた並びにアンカー挿入
  const colItems = state.items
    .filter((i) => i.column === toColumn && !i.deletedAt && i.url !== url)
    .sort((a, b) => a.order - b.order)
  const anchorIdx = beforeUrl ? colItems.findIndex((i) => i.url === beforeUrl) : -1
  const insertAt = anchorIdx >= 0 ? anchorIdx : colItems.length
  colItems.splice(insertAt, 0, item)
  colItems.forEach((ci, idx) => { ci.order = idx })

  return toMutationResult(await saveKanban(state))
}

/** 期限を設定/解除 */
export async function setDueDateInKanban(
  url: string,
  dueDate: number | undefined,
): Promise<KanbanMutationResult> {
  const state = await loadKanban()
  const item = state.items.find((i) => i.url === url && !i.deletedAt)
  if (!item) return { state }
  item.dueDate = dueDate
  item.updatedAt = Date.now()
  return toMutationResult(await saveKanban(state))
}

/** ブックマークに存在しないURLをカンバンから物理削除する（トゥームストーンは対象外） */
export async function cleanupKanban(validUrls: Set<string>): Promise<KanbanState> {
  const state = await loadKanban()
  const before = state.items.length
  state.items = state.items.filter((i) => i.deletedAt || validUrls.has(i.url))
  if (state.items.length !== before) {
    await saveKanban(state)
  }
  return state
}
