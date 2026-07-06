import { describe, it, expect, beforeEach } from 'vitest'
import { createMockChrome } from '../chromeMock'
import { loadKanban, saveKanban, addToKanban } from '../kanban'
import type { KanbanState } from '../../types'

/**
 * Kanban 永続化の複数端末同期(board単位 last-write-wins)テスト
 * - local と sync の新しい方を採用し、sync が新しければ local へ書き戻す
 * - sync により新しい状態があるときは古い状態で上書きしない
 */

const KEY = 'syncgrid_kanban'

const stateAt = (url: string, updatedAt?: number): KanbanState => ({
  items: [{ url, column: 'todo', order: 0 }],
  updatedAt,
})

async function getStored(area: 'local' | 'sync'): Promise<KanbanState | undefined> {
  const result = await chrome.storage[area].get(KEY)
  return result[KEY] as KanbanState | undefined
}

describe('loadKanban — local/sync の新しい方を採用', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome()
  })

  it('sync が新しい起動: sync を採用し local へ書き戻す(巻き戻り防止)', async () => {
    await chrome.storage.local.set({ [KEY]: stateAt('https://old.example/', 1000) })
    await chrome.storage.sync.set({ [KEY]: stateAt('https://new.example/', 2000) })

    const state = await loadKanban()

    expect(state.items[0].url).toBe('https://new.example/')
    const local = await getStored('local')
    expect(local?.updatedAt).toBe(2000)
    expect(local?.items[0].url).toBe('https://new.example/')
  })

  it('local が新しい起動: local を採用する', async () => {
    await chrome.storage.local.set({ [KEY]: stateAt('https://mine.example/', 3000) })
    await chrome.storage.sync.set({ [KEY]: stateAt('https://remote.example/', 2000) })

    const state = await loadKanban()
    expect(state.items[0].url).toBe('https://mine.example/')
  })

  it('updatedAt を持たない旧データ(local のみ)も読める(後方互換)', async () => {
    await chrome.storage.local.set({ [KEY]: { items: [{ url: 'https://legacy.example/', column: 'todo', order: 0 }] } })

    const state = await loadKanban()
    expect(state.items[0].url).toBe('https://legacy.example/')
  })

  it('local が空で sync にデータがある(新デバイス初回): sync から復元し local へ書き戻す', async () => {
    await chrome.storage.sync.set({ [KEY]: stateAt('https://synced.example/', 500) })

    const state = await loadKanban()
    expect(state.items[0].url).toBe('https://synced.example/')
    expect((await getStored('local'))?.items[0].url).toBe('https://synced.example/')
  })
})

describe('saveKanban — updatedAt スタンプと sync 上書きガード', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome()
  })

  it('保存時に updatedAt を付与し local と sync の両方へ書く', async () => {
    const result = await saveKanban(stateAt('https://a.example/'))

    expect(result.synced).toBe(true)
    const local = await getStored('local')
    const sync = await getStored('sync')
    expect(local?.updatedAt).toBeGreaterThan(0)
    expect(sync?.updatedAt).toBe(local?.updatedAt)
  })

  it('sync に自分より新しい状態がある場合は sync を上書きせず synced=false を返す', async () => {
    const future = Date.now() + 10_000_000
    await chrome.storage.sync.set({ [KEY]: stateAt('https://remote-newer.example/', future) })

    const result = await saveKanban(stateAt('https://mine.example/'))

    expect(result.synced).toBe(false)
    // sync はリモートの新しい状態のまま
    expect((await getStored('sync'))?.items[0].url).toBe('https://remote-newer.example/')
    // local には自分の状態が保存されている
    expect((await getStored('local'))?.items[0].url).toBe('https://mine.example/')
  })
})

describe('addToKanban — 変更系ヘルパの synced 伝搬', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome()
  })

  it('追加が成功し sync ミラーも成功すると synced=true', async () => {
    const { state, synced } = await addToKanban('https://x.example/')
    expect(synced).toBe(true)
    expect(state.items).toHaveLength(1)
  })

  it('重複追加は保存せず synced=true(通知を出さない)', async () => {
    await addToKanban('https://x.example/')
    const { state, synced } = await addToKanban('https://x.example/')
    expect(synced).toBe(true)
    expect(state.items).toHaveLength(1)
  })
})
