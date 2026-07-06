import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useDragReorder } from '../useDragReorder'
import { createMockChrome, type MockNode } from '../../utils/chromeMock'

/**
 * useDragReorder のドロップ経路テスト
 * chromeMock(実機Chrome意味論に整合済み)の上で、dragstart → drop の
 * 結果順序を検証する。前方移動の no-op 化(index 二重補正)の回帰防止が主目的。
 */

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const seed = (): MockNode => ({
  id: '0',
  title: '',
  children: [
    {
      id: '1',
      parentId: '0',
      title: 'Bookmarks Bar',
      children: [
        {
          id: 'f',
          parentId: '1',
          title: 'FolderF',
          children: [
            { id: 'A', parentId: 'f', title: 'A', url: 'https://a.example/' },
            { id: 'B', parentId: 'f', title: 'B', url: 'https://b.example/' },
            { id: 'C', parentId: 'f', title: 'C', url: 'https://c.example/' },
          ],
        },
        {
          id: 'g',
          parentId: '1',
          title: 'FolderG',
          children: [
            { id: 'D', parentId: 'g', title: 'D', url: 'https://d.example/' },
            { id: 'E', parentId: 'g', title: 'E', url: 'https://e.example/' },
          ],
        },
      ],
    },
  ],
})

async function order(folderId: string): Promise<string> {
  const [tree] = await chrome.bookmarks.getSubTree(folderId)
  return (tree.children ?? []).map((c) => c.id).join('')
}

type HookApi = ReturnType<typeof useDragReorder>

let api: HookApi | null = null

function Harness({
  onApi,
  onReorderDone,
}: {
  onApi: (a: HookApi) => void
  onReorderDone?: () => void
}) {
  const hookApi = useDragReorder(undefined, undefined, onReorderDone)
  useEffect(() => {
    onApi(hookApi)
  })
  return null
}

/** relX(0〜1)の位置でカード上にポインタがある DragEvent を合成する */
function dragEvent(relX: number): React.DragEvent {
  return {
    preventDefault: () => {},
    stopPropagation: () => {},
    clientX: relX * 100,
    dataTransfer: { effectAllowed: 'move', dropEffect: 'move', setData: () => {} },
    currentTarget: {
      getBoundingClientRect: () => ({
        left: 0,
        width: 100,
        top: 0,
        height: 40,
        right: 100,
        bottom: 40,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
      contains: () => false,
    },
  } as unknown as React.DragEvent
}

async function dragAndDrop(sourceId: string, targetId: string, relX: number): Promise<void> {
  if (!api) throw new Error('Harness not mounted')
  const source = api.getDragHandlers(sourceId, 'bookmark')
  const target = api.getDragHandlers(targetId, 'bookmark')
  await act(async () => {
    source.onDragStart(dragEvent(0.5))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
  await act(async () => {
    await target.onDrop(dragEvent(relX))
  })
}

describe('useDragReorder — カードのドロップで実順序が変わる', () => {
  let root: Root

  beforeEach(async () => {
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome(seed())
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

  it('前方移動: A を隣の B の直後へドロップ → BAC(従来 no-op だった回帰ケース)', async () => {
    await dragAndDrop('A', 'B', 0.9) // relX > 0.5 = after
    expect(await order('f')).toBe('BAC')
  })

  it('前方移動: A を C の直後(末尾)へドロップ → BCA', async () => {
    await dragAndDrop('A', 'C', 0.9)
    expect(await order('f')).toBe('BCA')
  })

  it('前方移動: A を C の直前へドロップ → BAC', async () => {
    await dragAndDrop('A', 'C', 0.1) // relX < 0.5 = before
    expect(await order('f')).toBe('BAC')
  })

  it('後方移動: C を A の直前へドロップ → CAB', async () => {
    await dragAndDrop('C', 'A', 0.1)
    expect(await order('f')).toBe('CAB')
  })

  it('後方移動: C を A の直後へドロップ → ACB(no-opでないことを確認)', async () => {
    await dragAndDrop('C', 'B', 0.1) // B の直前 = A の直後
    expect(await order('f')).toBe('ACB')
  })

  it('別フォルダへの移動: A を E の直前へドロップ → g が DAE、f が BC', async () => {
    await dragAndDrop('A', 'E', 0.1)
    expect(await order('g')).toBe('DAE')
    expect(await order('f')).toBe('BC')
  })
})

/** カード矩形を持つ偽コンテナ(隙間・背景ドロップの最近傍判定用) */
function fakeContainer(
  cards: Array<{ id: string; left: number; right: number; top: number; bottom: number }>,
): HTMLElement {
  return {
    querySelectorAll: () =>
      cards.map((c) => ({
        dataset: { sgCardId: c.id },
        getBoundingClientRect: () => ({
          left: c.left,
          right: c.right,
          top: c.top,
          bottom: c.bottom,
          width: c.right - c.left,
          height: c.bottom - c.top,
          x: c.left,
          y: c.top,
          toJSON: () => ({}),
        }),
      })),
  } as unknown as HTMLElement
}

function containerDragEvent(container: HTMLElement, x: number, y: number): React.DragEvent {
  return {
    preventDefault: () => {},
    stopPropagation: () => {},
    clientX: x,
    clientY: y,
    dataTransfer: { effectAllowed: 'move', dropEffect: 'move', setData: () => {} },
    currentTarget: container,
  } as unknown as React.DragEvent
}

describe('useDragReorder — コンテナドロップ(隙間・背景の不感地帯解消)', () => {
  let root: Root

  beforeEach(async () => {
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome(seed())
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

  it('カード間の隙間へのドロップ: 最近傍カードの before/after に解決される', async () => {
    // A[0-100] gap B[116-216] gap C[232-332] を模したレイアウト
    const container = fakeContainer([
      { id: 'A', left: 0, right: 100, top: 0, bottom: 40 },
      { id: 'B', left: 116, right: 216, top: 0, bottom: 40 },
      { id: 'C', left: 232, right: 332, top: 0, bottom: 40 },
    ])
    await act(async () => {
      api!.getDragHandlers('A', 'bookmark').onDragStart(dragEvent(0.5))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    // B と C の間の隙間(x=224)にドロップ → 最近傍 B の after
    await act(async () => {
      await api!.getContainerHandlers('f').onDrop(containerDragEvent(container, 224, 20))
    })
    expect(await order('f')).toBe('BAC')
  })

  it('行末余白・背景へのドロップ: 末尾カードの after に解決される', async () => {
    const container = fakeContainer([
      { id: 'A', left: 0, right: 100, top: 0, bottom: 40 },
      { id: 'B', left: 116, right: 216, top: 0, bottom: 40 },
      { id: 'C', left: 232, right: 332, top: 0, bottom: 40 },
    ])
    await act(async () => {
      api!.getDragHandlers('A', 'bookmark').onDragStart(dragEvent(0.5))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    // グリッド下の背景(y=200)かつ右端寄り → 最近傍 C の after = 末尾
    await act(async () => {
      await api!.getContainerHandlers('f').onDrop(containerDragEvent(container, 400, 200))
    })
    expect(await order('f')).toBe('BCA')
  })

  it('カードが1枚もないコンテナへのドロップ: fallback フォルダの末尾へ移動', async () => {
    const container = fakeContainer([])
    await act(async () => {
      api!.getDragHandlers('A', 'bookmark').onDragStart(dragEvent(0.5))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await act(async () => {
      await api!.getContainerHandlers('g').onDrop(containerDragEvent(container, 50, 50))
    })
    expect(await order('g')).toBe('DEA')
    expect(await order('f')).toBe('BC')
  })
})

describe('useDragReorder — onReorderDone 通知', () => {
  it('before/after ドロップ成立時に onReorderDone が呼ばれる(ソート自動切替のトリガ)', async () => {
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome(seed())
    api = null
    let called = 0
    const root = createRoot(document.createElement('div'))
    await act(async () => {
      root.render(
        <Harness
          onApi={(a) => {
            api = a
          }}
          onReorderDone={() => {
            called += 1
          }}
        />,
      )
    })

    await dragAndDrop('A', 'B', 0.9)
    expect(called).toBe(1)
    expect(await order('f')).toBe('BAC')

    await act(async () => {
      root.unmount()
    })
  })
})
