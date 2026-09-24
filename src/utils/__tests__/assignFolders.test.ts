import { describe, expect, it, vi, afterEach } from 'vitest'

import {
  ASSIGN_CONFIDENCE_MIN,
  UNASSIGNED,
  assignFolders,
  buildCriteria,
  toAssignments,
  type FolderChoice,
} from '../assignFolders'

// 割り当ての正しさ自体は docs/assign-folders.md の実測で測る（30件で30/30）。
// ここで止めるのは、静かに壊れる形。受け皿の選択肢が落ちて全件がどこかのフォルダに
// 入ってしまうことと、確信が低い割り当てをそのまま適用してしまうことの2つ。

const folders: FolderChoice[] = [
  { name: 'dev-docs', description: 'Official documentation' },
  { name: 'tools', description: 'Web utilities' },
]

describe('buildCriteria', () => {
  it('フォルダと受け皿を選択肢にする', () => {
    const criteria = buildCriteria(folders)
    expect(Object.keys(criteria)).toEqual(['dev-docs', 'tools', UNASSIGNED])
    expect(criteria['dev-docs']).toBe('Official documentation')
  })

  it('呼び出し側が受け皿を入れても二重にならない', () => {
    const criteria = buildCriteria([...folders, { name: UNASSIGNED, description: 'x' }])
    expect(Object.keys(criteria).filter((k) => k === UNASSIGNED)).toHaveLength(1)
  })
})

describe('toAssignments', () => {
  const answers = (choice: string, confidence: number) => ({
    b0: { choice, confidence },
  })

  it('選ばれたフォルダを返す', () => {
    expect(toAssignments(answers('tools', 0.95), 1, folders)).toEqual([{ index: 0, folder: 'tools', confidence: 0.95 }])
  })

  it('受け皿が選ばれたら割り当てない', () => {
    expect(toAssignments(answers(UNASSIGNED, 0.99), 1, folders)[0].folder).toBeNull()
  })

  it('confidenceがしきい値未満なら割り当てない', () => {
    expect(toAssignments(answers('tools', ASSIGN_CONFIDENCE_MIN - 0.01), 1, folders)[0].folder).toBeNull()
    expect(toAssignments(answers('tools', ASSIGN_CONFIDENCE_MIN), 1, folders)[0].folder).toBe('tools')
  })

  it('知らないフォルダ名は割り当てない', () => {
    expect(toAssignments(answers('unknown', 0.99), 1, folders)[0].folder).toBeNull()
  })

  it('答えが欠けている件は割り当てないが、件数は保つ', () => {
    const result = toAssignments({ b0: { choice: 'tools', confidence: 0.9 } }, 3, folders)
    expect(result).toHaveLength(3)
    expect(result[1].folder).toBeNull()
    expect(result[2].folder).toBeNull()
  })
})

describe('assignFolders', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('全件を1リクエストで送る（件数ぶん質問を並べる）', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        answers: {
          b0: { choice: 'dev-docs', confidence: 0.99 },
          b1: { choice: 'tools', confidence: 0.98 },
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const items = [
      { title: 'React docs', url: 'https://react.dev' },
      { title: 'Regex101', url: 'https://regex101.com' },
    ]
    const result = await assignFolders(items, folders, { apiKey: 'dummy' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(Object.keys(body.questions)).toEqual(['b0', 'b1'])
    expect(body.state.bookmarks).toHaveLength(2)
    expect(result.map((r) => r.folder)).toEqual(['dev-docs', 'tools'])
  })

  it('キーが無ければ投げる', async () => {
    await expect(assignFolders([{ title: 'a', url: 'b' }], folders, { apiKey: '' })).rejects.toThrow()
  })

  it('APIが失敗したら投げる（呼び出し側が既存の経路に落とせるように）', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    await expect(assignFolders([{ title: 'a', url: 'b' }], folders, { apiKey: 'dummy' })).rejects.toThrow(/429/)
  })

  it('ブックマークが0件なら呼ばない', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(assignFolders([], folders, { apiKey: 'dummy' })).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
