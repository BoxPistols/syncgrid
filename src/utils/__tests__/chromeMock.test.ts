import { describe, it, expect, beforeEach } from 'vitest'
import { createMockChrome, type MockNode } from '../chromeMock'

/**
 * chrome.bookmarks.move の index 意味論パリティテスト
 *
 * 期待値は実機 Chrome(Chrome for Testing 145、2026-07 実測)の挙動:
 * index は「移動前リスト上の挿入位置」解釈で、同一親内の前方移動は
 * Chrome 内部で -1 補正される(index == oldIndex+1 は no-op)。
 * mock がこの表からずれると「dev では動くが実機で壊れる」修正を再生産するため、
 * このテストは実測表そのものを固定化する。
 */

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

describe('chromeMock bookmarks.move — 実機Chromeとの意味論パリティ', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { chrome: typeof chrome }).chrome = createMockChrome(seed())
  })

  // 同一親内(初期順序 ABC)
  it.each([
    { move: 'A', index: 1, expected: 'ABC' }, // 前方 +1 は no-op
    { move: 'A', index: 2, expected: 'BAC' },
    { move: 'A', index: 3, expected: 'BCA' },
    { move: 'B', index: 2, expected: 'ABC' }, // 前方 +1 は no-op
    { move: 'B', index: 3, expected: 'ACB' },
    { move: 'C', index: 0, expected: 'CAB' },
    { move: 'C', index: 1, expected: 'ACB' },
    { move: 'B', index: 0, expected: 'BAC' },
  ])('同一親内: $move → index $index で $expected', async ({ move, index, expected }) => {
    await chrome.bookmarks.move(move, { parentId: 'f', index })
    expect(await order('f')).toBe(expected)
  })

  // 別親への移動(移動先 g = DE、index は最終位置そのまま)
  it.each([
    { index: 0, expected: 'ADE' },
    { index: 1, expected: 'DAE' },
    { index: 2, expected: 'DEA' },
  ])('別親: A → g index $index で $expected', async ({ index, expected }) => {
    await chrome.bookmarks.move('A', { parentId: 'g', index })
    expect(await order('g')).toBe(expected)
    expect(await order('f')).toBe('BC')
  })

  it('index 省略時は末尾に追加される', async () => {
    await chrome.bookmarks.move('A', { parentId: 'g' })
    expect(await order('g')).toBe('DEA')
  })

  it('bookmarks.get は該当ノードを返す(useDragReorderのドロップ経路が依存)', async () => {
    const [node] = await chrome.bookmarks.get('B')
    expect(node.id).toBe('B')
    expect(node.parentId).toBe('f')
  })
})
