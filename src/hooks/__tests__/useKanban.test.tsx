import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useKanban } from '../useKanban'
import { createMockChrome } from '../../utils/chromeMock'
import type { KanbanState } from '../../types'

/**
 * useKanban の他端末変更(storage.onChanged sync)受信テスト
 * - 新しい updatedAt の変更は UI に反映され、local へ書き戻される(巻き戻り防止)
 * - 古い updatedAt の変更は無視される
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const KEY = 'syncgrid_kanban'

const stateAt = (url: string, updatedAt: number): KanbanState => ({
  items: [{ url, column: 'todo', order: 0 }],
  updatedAt,
})

type HookApi = ReturnType<typeof useKanban>

let api: HookApi | null = null

function Harness({ onApi }: { onApi: (a: HookApi) => void }) {
  const hookApi = useKanban([])
  useEffect(() => {
    onApi(hookApi)
  })
  return null
}

describe('useKanban — sync 変更の受信と local 書き戻し', () => {
  let root: Root

  beforeEach(async () => {
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome()
    api = null
    root = createRoot(document.createElement('div'))
    await act(async () => {
      root.render(
        <Harness
          onApi={(a) => {
            api = a
          }}
        />,
      )
    })
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
  })

  it('他端末の新しい変更(sync)を受信すると state に反映され local へ書き戻される', async () => {
    const remote = stateAt('https://remote.example/', 5000)
    await act(async () => {
      await chrome.storage.sync.set({ [KEY]: remote })
    })

    expect(api!.kanbanState.items[0]?.url).toBe('https://remote.example/')
    const local = (await chrome.storage.local.get(KEY))[KEY] as KanbanState
    expect(local.updatedAt).toBe(5000)
  })

  it('現 state より古い変更(sync)は無視される', async () => {
    await act(async () => {
      await chrome.storage.sync.set({ [KEY]: stateAt('https://newer.example/', 5000) })
    })
    await act(async () => {
      await chrome.storage.sync.set({ [KEY]: stateAt('https://stale.example/', 1000) })
    })

    expect(api!.kanbanState.items[0]?.url).toBe('https://newer.example/')
  })
})
