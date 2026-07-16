/**
 * cleanupLegacyKanbanStorage のテスト
 *
 * 旧カンバン機能（2026-07 廃止）が残した storage キー `syncgrid_kanban` を、
 * 起動時掃除が local / sync の両方から冪等に削除することを固定する。
 * 掃除コード自体が撤去されるとき、このテストも一緒に削除してよい。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createMockChrome } from '../chromeMock'
import { cleanupLegacyKanbanStorage } from '../storage'

const KEY = 'syncgrid_kanban'

describe('cleanupLegacyKanbanStorage', () => {
  beforeEach(() => {
    // setup.ts のグローバル chrome を、sync エリアを持つ完全なモックへ差し替える
    // （旧 useKanban.test と同じ Harness パターンの差し込み方）
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome()
  })

  it('local と sync の両方から残留キーを削除する', async () => {
    await chrome.storage.local.set({ [KEY]: { items: [] }, syncgrid_settings: { locale: 'ja' } })
    await chrome.storage.sync.set({ [KEY]: { items: [{ url: 'https://a.example/', column: 'todo', order: 0 }] } })

    await cleanupLegacyKanbanStorage()

    expect(await chrome.storage.local.get(KEY)).toEqual({})
    expect(await chrome.storage.sync.get(KEY)).toEqual({})
    // 他のキーは温存される
    const settings = await chrome.storage.local.get('syncgrid_settings')
    expect(settings.syncgrid_settings).toEqual({ locale: 'ja' })
  })

  it('冪等: 空の storage に対して2回連続で実行してもエラーにならない', async () => {
    await expect(cleanupLegacyKanbanStorage()).resolves.toBeUndefined()
    await expect(cleanupLegacyKanbanStorage()).resolves.toBeUndefined()
    expect(await chrome.storage.local.get(KEY)).toEqual({})
  })

  it('sync が使えない環境でも throw せず local だけ掃除する', async () => {
    const mock = createMockChrome()
    // sync.remove が reject する環境（企業ポリシー等）を再現
    const brokenSync = {
      ...mock.storage.sync,
      remove: () => Promise.reject(new Error('sync disabled')),
    }
    ;(globalThis as unknown as { chrome: unknown }).chrome = {
      ...mock,
      storage: { ...mock.storage, sync: brokenSync },
    }
    await chrome.storage.local.set({ [KEY]: { items: [] } })

    await expect(cleanupLegacyKanbanStorage()).resolves.toBeUndefined()
    expect(await chrome.storage.local.get(KEY)).toEqual({})
  })
})
