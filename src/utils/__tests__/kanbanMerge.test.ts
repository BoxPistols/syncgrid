import { describe, it, expect } from 'vitest'
import { mergeKanban, migrateToV2, TOMBSTONE_TTL_MS } from '../kanbanMerge'
import type { KanbanState } from '../../types'

const item = (
  url: string,
  updatedAt: number,
  overrides: Partial<KanbanState['items'][number]> = {},
): KanbanState['items'][number] => ({
  url,
  column: 'todo',
  order: 0,
  updatedAt,
  ...overrides,
})

describe('mergeKanban — アイテム単位のlast-write-wins', () => {
  it('片方にしかないアイテムは両方とも生き残る(board総取りしない)', () => {
    const local: KanbanState = { schema: 2, items: [item('https://a.example/', 100)], updatedAt: 100 }
    const remote: KanbanState = { schema: 2, items: [item('https://b.example/', 200)], updatedAt: 200 }

    const merged = mergeKanban([local, remote])
    const urls = merged.items.map((i) => i.url).sort()
    expect(urls).toEqual(['https://a.example/', 'https://b.example/'])
  })

  it('同一URLは updatedAt が新しい方を採用する', () => {
    const local: KanbanState = { schema: 2, items: [item('https://a.example/', 100, { column: 'todo' })], updatedAt: 100 }
    const remote: KanbanState = { schema: 2, items: [item('https://a.example/', 200, { column: 'done' })], updatedAt: 200 }

    const merged = mergeKanban([local, remote])
    expect(merged.items).toHaveLength(1)
    expect(merged.items[0].column).toBe('done')
  })

  it('削除(新しいupdatedAt)は移動(古いupdatedAt)より優先される', () => {
    const now = Date.now()
    const local: KanbanState = {
      schema: 2,
      items: [item('https://a.example/', now, { deletedAt: now })],
      updatedAt: now,
    }
    const remote: KanbanState = {
      schema: 2,
      items: [item('https://a.example/', now - 1000, { column: 'doing' })],
      updatedAt: now - 1000,
    }

    const merged = mergeKanban([local, remote], now)
    expect(merged.items[0].deletedAt).toBe(now)
  })

  it('TTLを過ぎたトゥームストーンは結果から除去される', () => {
    const now = 1_000_000_000_000
    const local: KanbanState = {
      schema: 2,
      items: [item('https://a.example/', now - TOMBSTONE_TTL_MS - 1, { deletedAt: now - TOMBSTONE_TTL_MS - 1 })],
      updatedAt: now,
    }

    const merged = mergeKanban([local], now)
    expect(merged.items).toHaveLength(0)
  })
})

describe('migrateToV2 — v1(board単位LWW)からのマイグレーション', () => {
  it('schema欠落データはv2化され、各アイテムにupdatedAtが補われる', () => {
    const v1 = { items: [{ url: 'https://a.example/', column: 'todo', order: 0 }], updatedAt: 500 }
    const v2 = migrateToV2(v1)
    expect(v2.schema).toBe(2)
    expect(v2.items[0].updatedAt).toBe(500)
  })

  it('既にv2のデータはそのまま返す', () => {
    const v2: KanbanState = { schema: 2, items: [item('https://a.example/', 1)], updatedAt: 1 }
    expect(migrateToV2(v2)).toBe(v2)
  })

  it('不正な入力は空状態を返す', () => {
    expect(migrateToV2(null).items).toHaveLength(0)
    expect(migrateToV2({}).items).toHaveLength(0)
  })
})
