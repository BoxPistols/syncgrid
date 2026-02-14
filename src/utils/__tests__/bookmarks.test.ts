import { describe, it, expect } from 'vitest'
import { findGroupById, findGroupForItem, flattenGroups } from '../bookmarks'
import type { SyncGridGroup } from '../../types'

const nested: SyncGridGroup[] = [
  {
    id: 'g1',
    title: 'Work',
    items: [
      { id: 'i1', title: 'GitHub', url: 'https://github.com', parentId: 'g1' },
      { id: 'i2', title: 'Jira', url: 'https://jira.com', parentId: 'g1' },
    ],
    children: [
      {
        id: 'g2',
        title: 'Docs',
        items: [
          { id: 'i3', title: 'Wiki', url: 'https://wiki.com', parentId: 'g2' },
        ],
        children: [
          {
            id: 'g3',
            title: 'Archive',
            items: [],
            children: [],
            parentId: 'g2',
            depth: 2,
          },
        ],
        parentId: 'g1',
        depth: 1,
      },
    ],
    parentId: 'root',
    depth: 0,
  },
  {
    id: 'g4',
    title: 'Personal',
    items: [
      { id: 'i4', title: 'Blog', url: 'https://blog.com', parentId: 'g4' },
    ],
    children: [],
    parentId: 'root',
    depth: 0,
  },
]

describe('findGroupById', () => {
  it('finds top-level group', () => {
    expect(findGroupById(nested, 'g1')?.title).toBe('Work')
    expect(findGroupById(nested, 'g4')?.title).toBe('Personal')
  })

  it('finds nested group', () => {
    expect(findGroupById(nested, 'g2')?.title).toBe('Docs')
    expect(findGroupById(nested, 'g3')?.title).toBe('Archive')
  })

  it('returns undefined for non-existent id', () => {
    expect(findGroupById(nested, 'nonexistent')).toBeUndefined()
  })

  it('returns undefined for empty array', () => {
    expect(findGroupById([], 'g1')).toBeUndefined()
  })
})

describe('findGroupForItem', () => {
  it('finds group for top-level item', () => {
    expect(findGroupForItem(nested, 'i1')).toBe('g1')
    expect(findGroupForItem(nested, 'i4')).toBe('g4')
  })

  it('finds group for nested item', () => {
    expect(findGroupForItem(nested, 'i3')).toBe('g2')
  })

  it('returns undefined for non-existent item', () => {
    expect(findGroupForItem(nested, 'nonexistent')).toBeUndefined()
  })
})

describe('flattenGroups', () => {
  it('flattens nested tree', () => {
    const flat = flattenGroups(nested)
    const ids = flat.map(g => g.id)

    expect(ids).toEqual(['g1', 'g2', 'g3', 'g4'])
  })

  it('returns empty array for empty input', () => {
    expect(flattenGroups([])).toEqual([])
  })

  it('preserves all groups', () => {
    const flat = flattenGroups(nested)
    expect(flat).toHaveLength(4)
  })
})
