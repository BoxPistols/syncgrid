import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useKanban } from '../useKanban'
import { createMockChrome } from '../../utils/chromeMock'
import type { KanbanState } from '../../types'

/**
 * useKanban の local storage 変更受信テスト
 * - 同じ端末の別タブ・フォルダ同期の取り込み(pullKanbanFromSync)はどちらも
 *   chrome.storage.local への書き込みとして届くため、その反映を検証する
 * - 新しい updatedAt の変更は UI に反映され、古い変更は無視される
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const KEY = 'syncgrid_kanban'

const stateAt = (url: string, updatedAt: number): KanbanState => ({
  schema: 2,
  items: [{ url, column: 'todo', order: 0, updatedAt }],
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

describe('useKanban — local storage 変更の受信', () => {
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

  it('別タブ由来の新しい変更(local)を受信するとstateに反映される', async () => {
    const remote = stateAt('https://remote.example/', 5000)
    await act(async () => {
      await chrome.storage.local.set({ [KEY]: remote })
    })

    expect(api!.kanbanState.items[0]?.url).toBe('https://remote.example/')
  })

  it('現 state より古い変更(local)は無視される', async () => {
    await act(async () => {
      await chrome.storage.local.set({ [KEY]: stateAt('https://newer.example/', 5000) })
    })
    await act(async () => {
      await chrome.storage.local.set({ [KEY]: stateAt('https://stale.example/', 1000) })
    })

    expect(api!.kanbanState.items[0]?.url).toBe('https://newer.example/')
  })
})
