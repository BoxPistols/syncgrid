import type { KanbanItem, KanbanState } from '../types'

/** トゥームストーン（削除済みアイテム）の保持期限。これを過ぎたら物理削除する */
export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30日

function newEmptyState(): KanbanState {
  return { schema: 2, items: [], updatedAt: 0 }
}

/**
 * 複数端末のカンバン状態をアイテム単位でマージする（純粋関数、副作用なし）。
 *
 * ルール:
 * - url をキーに突き合わせ、両方に存在すれば item.updatedAt が新しい方を採用
 * - 片方にしか存在しない場合はそのまま採用（従来の board 単位 last-write-wins のように
 *   「新しい方が総取りしてもう片方のカードが消える」ことはない）
 * - deletedAt を持つアイテムはトゥームストーンとして扱い、それ自体が updatedAt として比較される
 * - now を渡すと TOMBSTONE_TTL_MS を過ぎたトゥームストーンを結果から除去する（ファイル肥大防止）
 */
export function mergeKanban(states: KanbanState[], now: number = Date.now()): KanbanState {
  const merged = new Map<string, KanbanItem>()
  let latestBoardUpdatedAt = 0

  for (const state of states) {
    latestBoardUpdatedAt = Math.max(latestBoardUpdatedAt, state.updatedAt ?? 0)
    for (const item of state.items) {
      const existing = merged.get(item.url)
      if (!existing || item.updatedAt > existing.updatedAt) {
        merged.set(item.url, item)
      }
    }
  }

  const items = [...merged.values()].filter((item) => {
    if (!item.deletedAt) return true
    return now - item.deletedAt < TOMBSTONE_TTL_MS
  })

  return { schema: 2, items, updatedAt: latestBoardUpdatedAt }
}

/** v1（board単位LWW、schema欠落）データをv2形式へ変換する */
export function migrateToV2(stored: unknown): KanbanState {
  if (!stored || typeof stored !== 'object' || !Array.isArray((stored as { items?: unknown }).items)) {
    return newEmptyState()
  }
  const raw = stored as { items: Array<Record<string, unknown>>; updatedAt?: number; schema?: number }
  if (raw.schema === 2) return raw as unknown as KanbanState

  const boardUpdatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : 0
  const items: KanbanItem[] = raw.items
    .filter((i) => typeof i.url === 'string' && typeof i.column === 'string')
    .map((i) => ({
      url: i.url as string,
      column: i.column as KanbanItem['column'],
      order: typeof i.order === 'number' ? i.order : 0,
      dueDate: typeof i.dueDate === 'number' ? i.dueDate : undefined,
      updatedAt: typeof i.updatedAt === 'number' ? i.updatedAt : boardUpdatedAt,
    }))

  return { schema: 2, items, updatedAt: boardUpdatedAt }
}
