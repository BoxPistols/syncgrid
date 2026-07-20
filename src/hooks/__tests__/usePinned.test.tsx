import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { usePinned } from '../usePinned'
import { createMockChrome } from '../../utils/chromeMock'
import { MAX_PINNED, type PinnedMap } from '../../types'

/**
 * usePinned のストレージ連携テスト
 * - sync 優先読込 → local フォールバック
 * - togglePin の local 即時保存と上限制御
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const KEY = 'syncgrid_pinned'

type HookApi = ReturnType<typeof usePinned>

let api: HookApi | null = null

function Harness({ onApi }: { onApi: (a: HookApi) => void }) {
  const hookApi = usePinned()
  useEffect(() => {
    onApi(hookApi)
  })
  return null
}

async function mount(root: Root) {
  await act(async () => {
    root.render(
      <Harness
        onApi={(a) => {
          api = a
        }}
      />,
    )
  })
}

describe('usePinned', () => {
  let root: Root

  beforeEach(() => {
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome()
    api = null
    root = createRoot(document.createElement('div'))
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    vi.useRealTimers()
  })

  it('sync にデータがあれば優先して読み込み、local にミラーする', async () => {
    const synced: PinnedMap = { 'https://a.example/': 100 }
    await chrome.storage.sync.set({ [KEY]: synced })
    await mount(root)

    expect(api!.isPinned('https://a.example/')).toBe(true)
    const local = await chrome.storage.local.get(KEY)
    expect(local[KEY]).toEqual(synced)
  })

  it('sync が空なら local から読み込む', async () => {
    await chrome.storage.local.set({ [KEY]: { 'https://b.example/': 200 } })
    await mount(root)

    expect(api!.isPinned('https://b.example/')).toBe(true)
  })

  it('togglePin で追加すると local に即時保存される', async () => {
    await mount(root)
    await act(async () => {
      api!.togglePin('https://c.example/')
    })

    expect(api!.isPinned('https://c.example/')).toBe(true)
    const local = await chrome.storage.local.get(KEY)
    expect(Object.keys((local[KEY] ?? {}) as PinnedMap)).toContain('https://c.example/')
  })

  it('togglePin で解除できる', async () => {
    await chrome.storage.local.set({ [KEY]: { 'https://d.example/': 300 } })
    await mount(root)
    await act(async () => {
      api!.togglePin('https://d.example/')
    })

    expect(api!.isPinned('https://d.example/')).toBe(false)
    const local = await chrome.storage.local.get(KEY)
    expect((local[KEY] ?? {}) as PinnedMap).toEqual({})
  })

  it('上限到達時は追加できず false を返す', async () => {
    const full: PinnedMap = {}
    for (let i = 0; i < MAX_PINNED; i++) full[`https://x${i}.example/`] = i + 1
    await chrome.storage.local.set({ [KEY]: full })
    await mount(root)

    let result: boolean | undefined
    await act(async () => {
      result = api!.togglePin('https://overflow.example/')
    })

    expect(result).toBe(false)
    expect(api!.isPinned('https://overflow.example/')).toBe(false)
  })
})
