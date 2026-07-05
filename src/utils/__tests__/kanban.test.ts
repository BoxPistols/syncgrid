import { describe, it, expect, beforeEach } from 'vitest'
import { loadKanban, saveKanban } from '../kanban'
import type { KanbanState } from '../../types'

// chrome.storage.sync / local のインメモリモック
function makeArea() {
  const data: Record<string, unknown> = {}
  return {
    _data: data,
    get: (key: string) => Promise.resolve(key in data ? { [key]: data[key] } : {}),
    set: (items: Record<string, unknown>) => {
      Object.assign(data, items)
      return Promise.resolve()
    },
  }
}

const g = globalThis as unknown as {
  chrome: { storage: { sync: ReturnType<typeof makeArea>; local: ReturnType<typeof makeArea> } }
}

beforeEach(() => {
  g.chrome = { storage: { sync: makeArea(), local: makeArea() } } as typeof g.chrome
})

const KEY = 'syncgrid_kanban'

describe('loadKanban / saveKanban（sync=ソースオブトゥルース + updatedAt競合解決）', () => {
  it('saveKanban は sync と local の両方に updatedAt付きで書き込む', async () => {
    const state: KanbanState = { items: [{ url: 'https://a.com', column: 'todo', order: 0 }] }
    const result = await saveKanban(state)

    expect(result.synced).toBe(true)
    expect(g.chrome.storage.sync._data[KEY]).toBeDefined()
    expect(g.chrome.storage.local._data[KEY]).toBeDefined()
    expect((g.chrome.storage.sync._data[KEY] as KanbanState).updatedAt).toBeTypeOf('number')
  })

  it('sync と local が異なる場合、updatedAt が新しい方を採用する', async () => {
    g.chrome.storage.sync._data[KEY] = {
      items: [{ url: 'https://sync.com', column: 'todo', order: 0 }],
      updatedAt: 2000,
    }
    g.chrome.storage.local._data[KEY] = {
      items: [{ url: 'https://local.com', column: 'todo', order: 0 }],
      updatedAt: 1000,
    }

    const loaded = await loadKanban()
    expect(loaded.items[0].url).toBe('https://sync.com') // sync が新しい
  })

  it('local の方が新しければ local を採用する（オフライン編集の保持）', async () => {
    g.chrome.storage.sync._data[KEY] = {
      items: [{ url: 'https://sync.com', column: 'todo', order: 0 }],
      updatedAt: 1000,
    }
    g.chrome.storage.local._data[KEY] = {
      items: [{ url: 'https://local.com', column: 'todo', order: 0 }],
      updatedAt: 3000,
    }

    const loaded = await loadKanban()
    expect(loaded.items[0].url).toBe('https://local.com')
  })

  it('updatedAt が同値/未設定なら sync を優先（クロスPC同期のソースオブトゥルース）', async () => {
    g.chrome.storage.sync._data[KEY] = {
      items: [{ url: 'https://sync.com', column: 'todo', order: 0 }],
    }
    g.chrome.storage.local._data[KEY] = {
      items: [{ url: 'https://local.com', column: 'todo', order: 0 }],
    }

    const loaded = await loadKanban()
    expect(loaded.items[0].url).toBe('https://sync.com')
  })

  it('sync が空なら local にフォールバックする（開発/オフライン）', async () => {
    g.chrome.storage.local._data[KEY] = {
      items: [{ url: 'https://local.com', column: 'todo', order: 0 }],
      updatedAt: 1000,
    }

    const loaded = await loadKanban()
    expect(loaded.items[0].url).toBe('https://local.com')
  })

  it('両方空なら空の状態を返す', async () => {
    const loaded = await loadKanban()
    expect(loaded.items).toEqual([])
  })

  it('保存→読込のラウンドトリップで内容が一致する', async () => {
    const state: KanbanState = {
      items: [
        { url: 'https://a.com', column: 'todo', order: 0 },
        { url: 'https://b.com', column: 'done', order: 1, dueDate: 12345 },
      ],
    }
    await saveKanban(state)
    const loaded = await loadKanban()

    expect(loaded.items).toHaveLength(2)
    expect(loaded.items[1].dueDate).toBe(12345)
  })
})
