import { describe, it, expect, beforeEach } from 'vitest'
import { createMockChrome } from '../chromeMock'
import { loadKanban, saveKanban, addToKanban, removeFromKanban, moveInKanban } from '../kanban'
import type { KanbanState } from '../../types'

/**
 * Kanban 永続化(v2: アイテム単位last-write-wins + 削除トゥームストーン)テスト
 * - 同期経路は File System Access API 経由のフォルダ同期(localSync.ts)へ移管され、
 *   chrome.storage.local はローカル主保存のみを担う
 */

const KEY = 'syncgrid_kanban'

async function getLocal(): Promise<KanbanState | undefined> {
  const result = await chrome.storage.local.get(KEY)
  return result[KEY] as KanbanState | undefined
}

describe('loadKanban / saveKanban — v2ローカル保存', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome()
  })

  it('未保存状態は空のv2状態を返す', async () => {
    const state = await loadKanban()
    expect(state.schema).toBe(2)
    expect(state.items).toHaveLength(0)
  })

  it('保存時にschema:2とupdatedAtを付与する', async () => {
    const { state } = await saveKanban({ schema: 2, items: [{ url: 'https://a.example/', column: 'todo', order: 0, updatedAt: 1 }], updatedAt: 0 })
    expect(state.schema).toBe(2)
    expect(state.updatedAt).toBeGreaterThan(0)
    const local = await getLocal()
    expect(local?.items[0].url).toBe('https://a.example/')
  })

  it('旧v1形式(schema欠落、updatedAtなし)は読み込み時にv2へマイグレーションされる', async () => {
    await chrome.storage.local.set({
      [KEY]: { items: [{ url: 'https://legacy.example/', column: 'todo', order: 0 }], updatedAt: 500 },
    })

    const state = await loadKanban()
    expect(state.schema).toBe(2)
    expect(state.items[0].url).toBe('https://legacy.example/')
    expect(state.items[0].updatedAt).toBe(500)
  })

  it('旧bookmarkId形式(urlなし)が新形式と混在していても、後続のurl付きアイテムが誤って破棄されない', async () => {
    await chrome.storage.local.set({
      [KEY]: {
        items: [
          { bookmarkId: 'legacy-1', column: 'todo', order: 0 },
          { url: 'https://survivor.example/', column: 'todo', order: 1 },
        ],
        updatedAt: 500,
      },
    })

    const state = await loadKanban()
    expect(state.items).toHaveLength(1)
    expect(state.items[0].url).toBe('https://survivor.example/')
  })

  it('旧 chrome.storage.sync ミラーが残っていれば一度だけ取り込み、sync側は削除する', async () => {
    await chrome.storage.local.set({
      [KEY]: { items: [{ url: 'https://local-only.example/', column: 'todo', order: 0, updatedAt: 100 }], updatedAt: 100 },
    })
    await chrome.storage.sync.set({
      [KEY]: { items: [{ url: 'https://synced-only.example/', column: 'doing', order: 0, updatedAt: 200 }], updatedAt: 200 },
    })

    const state = await loadKanban()
    const urls = state.items.map((i) => i.url).sort()
    expect(urls).toEqual(['https://local-only.example/', 'https://synced-only.example/'])

    const syncAfter = await chrome.storage.sync.get(KEY)
    expect(syncAfter[KEY]).toBeUndefined()
  })
})

describe('addToKanban / removeFromKanban — アイテム単位の追加・削除', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome()
  })

  it('追加したアイテムが読み込める', async () => {
    const { state } = await addToKanban('https://x.example/')
    expect(state.items).toHaveLength(1)
    expect(state.items[0].deletedAt).toBeUndefined()
  })

  it('重複追加は無視される', async () => {
    await addToKanban('https://x.example/')
    const { state } = await addToKanban('https://x.example/')
    expect(state.items).toHaveLength(1)
  })

  it('削除はトゥームストーン化され、物理削除されない', async () => {
    await addToKanban('https://x.example/')
    const { state } = await removeFromKanban('https://x.example/')
    expect(state.items).toHaveLength(1)
    expect(state.items[0].deletedAt).toBeGreaterThan(0)
  })

  it('削除済みアイテムを再追加すると復活する', async () => {
    await addToKanban('https://x.example/')
    await removeFromKanban('https://x.example/')
    const { state } = await addToKanban('https://x.example/')
    expect(state.items).toHaveLength(1)
    expect(state.items[0].deletedAt).toBeUndefined()
  })
})

describe('moveInKanban — トゥームストーンを除いた並び替え', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome()
  })

  it('削除済みアイテムはアンカー解決の対象から除外される', async () => {
    await addToKanban('https://a.example/')
    await addToKanban('https://b.example/')
    await removeFromKanban('https://a.example/')

    const { state } = await moveInKanban('https://b.example/', 'doing', null)
    const b = state.items.find((i) => i.url === 'https://b.example/')
    expect(b?.column).toBe('doing')
  })
})
