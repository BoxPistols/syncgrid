import type { KanbanColumn, KanbanState } from '../types'

const STORAGE_KEY = 'syncgrid_kanban'

const EMPTY_STATE: KanbanState = { items: [] }

/**
 * 保存結果。state は updatedAt をスタンプした保存済み状態（引数は変異させない）。
 * synced=false は sync ミラーが失敗（quota等）した場合で、local保存は成功している。
 * conflictState は「sync側により新しい状態があり保存が負けた」場合の最新状態
 * （localにも反映済み。放置すると次回ロードで黙って巻き戻るため、即時採用してUIへ返す）。
 */
export interface SaveResult {
  state: KanbanState
  synced: boolean
  conflictState?: KanbanState
}

/** 変更系ヘルパの結果。conflict=true は他端末の新しい変更に負けた（state はその最新状態） */
export interface KanbanMutationResult {
  state: KanbanState
  synced: boolean
  conflict?: boolean
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
 * local と sync の両方を読み、updatedAt が新しい方を採用する（board単位のlast-write-wins）。
 * sync の方が新しければ local へ書き戻し、古い local が以降の保存で sync を潰すのを防ぐ。
 */
export async function loadKanban(): Promise<KanbanState> {
  const local = globalThis.chrome?.storage?.local
  const sync = globalThis.chrome?.storage?.sync

  let localState: KanbanState | undefined
  if (local?.get) {
    const result = await local.get(STORAGE_KEY)
    if (isValidState(result[STORAGE_KEY])) localState = result[STORAGE_KEY]
  }
  let syncState: KanbanState | undefined
  if (sync?.get) {
    try {
      const result = await sync.get(STORAGE_KEY)
      if (isValidState(result[STORAGE_KEY])) syncState = result[STORAGE_KEY]
    } catch {
      // sync が読めない環境では local のみで動作する
    }
  }

  let stored: KanbanState | undefined
  if (syncState && (!localState || (syncState.updatedAt ?? 0) > (localState.updatedAt ?? 0))) {
    stored = syncState
    if (local?.set) {
      // 他端末の新しい状態を local へ反映（updatedAt はそのまま = 再スタンプしない）
      await local.set({ [STORAGE_KEY]: syncState })
    }
  } else {
    stored = localState
  }

  if (!stored) return { ...EMPTY_STATE }

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
  // board単位のlast-write-wins用タイムスタンプ（引数は変異させず、スタンプ済みコピーを保存・返却する）
  const stamped: KanbanState = { ...state, updatedAt: Date.now() }

  const local = globalThis.chrome?.storage?.local
  if (local?.set) {
    // 主保存。失敗（QUOTA_BYTES 超過など）は呼び出し側へ伝播させる
    await local.set({ [STORAGE_KEY]: stamped })
  }

  const sync = globalThis.chrome?.storage?.sync
  if (sync?.set) {
    try {
      // 他端末がより新しい状態を書いていたら上書きしない（古い状態でsyncを潰す事故の防止）。
      // remoteを即時採用してlocalへも反映する（放置すると次回ロードで黙って巻き戻るため）
      if (sync.get) {
        const result = await sync.get(STORAGE_KEY)
        const current = result[STORAGE_KEY]
        if (isValidState(current) && (current.updatedAt ?? 0) > (stamped.updatedAt ?? 0)) {
          if (local?.set) await local.set({ [STORAGE_KEY]: current })
          return { state: stamped, synced: false, conflictState: current }
        }
      }
      await sync.set({ [STORAGE_KEY]: stamped })
      return { state: stamped, synced: true }
    } catch {
      // sync は 8KB/item・120回/分 の制限で失敗しうる。local には保存済みなので実害は同期のみ
      return { state: stamped, synced: false }
    }
  }
  return { state: stamped, synced: false }
}

export async function addToKanban(
  url: string,
  column: KanbanColumn = 'todo',
): Promise<KanbanMutationResult> {
  const state = await loadKanban()
  if (state.items.some((i) => i.url === url)) return { state, synced: true }
  const maxOrder = state.items
    .filter((i) => i.column === column)
    .reduce((max, i) => Math.max(max, i.order), -1)
  state.items.push({ url, column, order: maxOrder + 1 })
  return toMutationResult(await saveKanban(state))
}

export async function removeFromKanban(url: string): Promise<KanbanMutationResult> {
  const state = await loadKanban()
  state.items = state.items.filter((i) => i.url !== url)
  return toMutationResult(await saveKanban(state))
}

/** 競合時は remote 側の最新状態を結果として返す */
function toMutationResult(save: SaveResult): KanbanMutationResult {
  return {
    state: save.conflictState ?? save.state,
    synced: save.synced,
    conflict: !!save.conflictState,
  }
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
  const item = state.items.find((i) => i.url === url)
  if (!item) return { state, synced: true }

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

  return toMutationResult(await saveKanban(state))
}

/** 期限を設定/解除 */
export async function setDueDateInKanban(
  url: string,
  dueDate: number | undefined,
): Promise<KanbanMutationResult> {
  const state = await loadKanban()
  const item = state.items.find((i) => i.url === url)
  if (!item) return { state, synced: true }
  item.dueDate = dueDate
  return toMutationResult(await saveKanban(state))
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
