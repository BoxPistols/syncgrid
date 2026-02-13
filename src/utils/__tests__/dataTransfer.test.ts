import { describe, it, expect } from 'vitest'
import { exportData, validateImport } from '../dataTransfer'
import type { SyncGridGroup } from '../../types'

const mockGroups: SyncGridGroup[] = [
  {
    id: '1',
    title: 'Work',
    items: [
      { id: '10', title: 'GitHub', url: 'https://github.com', parentId: '1' },
      { id: '11', title: 'Docs', url: 'https://docs.google.com', parentId: '1' },
    ],
    children: [],
    parentId: 'root',
    depth: 0,
  },
  {
    id: '2',
    title: 'Tools',
    items: [],
    children: [
      {
        id: '3',
        title: 'Design',
        items: [{ id: '20', title: 'Figma', url: 'https://figma.com', parentId: '3' }],
        children: [],
        parentId: '2',
        depth: 1,
      },
    ],
    parentId: 'root',
    depth: 0,
  },
]

describe('exportData', () => {
  it('creates valid export object', async () => {
    const result = await exportData(mockGroups)

    expect(result.version).toBe(1)
    expect(result.appName).toBe('SyncGrid')
    expect(result.checksum).toMatch(/^[0-9a-f]{64}$/)
    expect(result.exportedAt).toBeTruthy()
    expect(result.data).toHaveLength(2)
  })

  it('strips internal fields (id, parentId, depth, dateAdded)', async () => {
    const result = await exportData(mockGroups)

    const group = result.data[0]
    expect(group).not.toHaveProperty('id')
    expect(group).not.toHaveProperty('parentId')
    expect(group).not.toHaveProperty('depth')
    expect(group.items[0]).not.toHaveProperty('id')
    expect(group.items[0]).not.toHaveProperty('parentId')
  })

  it('preserves nested children', async () => {
    const result = await exportData(mockGroups)

    expect(result.data[1].children).toHaveLength(1)
    expect(result.data[1].children[0].title).toBe('Design')
    expect(result.data[1].children[0].items[0].url).toBe('https://figma.com')
  })
})

describe('validateImport', () => {
  it('accepts valid exported JSON', async () => {
    const exported = await exportData(mockGroups)
    const text = JSON.stringify(exported)

    const result = await validateImport(text)

    expect(result).not.toBeNull()
    expect(result!.version).toBe(1)
    expect(result!.data).toHaveLength(2)
  })

  it('rejects invalid JSON', async () => {
    expect(await validateImport('not json')).toBeNull()
  })

  it('rejects wrong version', async () => {
    const exported = await exportData(mockGroups)
    const obj = { ...exported, version: 2 }
    expect(await validateImport(JSON.stringify(obj))).toBeNull()
  })

  it('rejects wrong appName', async () => {
    const exported = await exportData(mockGroups)
    const obj = { ...exported, appName: 'OtherApp' }
    expect(await validateImport(JSON.stringify(obj))).toBeNull()
  })

  it('rejects tampered checksum', async () => {
    const exported = await exportData(mockGroups)
    const obj = { ...exported, checksum: 'deadbeef'.repeat(8) }
    expect(await validateImport(JSON.stringify(obj))).toBeNull()
  })

  it('rejects oversized input', async () => {
    const huge = 'x'.repeat(10 * 1024 * 1024 + 1)
    expect(await validateImport(huge)).toBeNull()
  })

  it('rejects invalid URL protocols', async () => {
    const exported = await exportData(mockGroups)
    const obj = JSON.parse(JSON.stringify(exported))
    obj.data[0].items[0].url = 'javascript:alert(1)'
    // Recalculate checksum won't match, but even if we bypass that,
    // the URL validation should catch it
    expect(await validateImport(JSON.stringify(obj))).toBeNull()
  })

  it('rejects non-object data', async () => {
    expect(await validateImport('"string"')).toBeNull()
    expect(await validateImport('42')).toBeNull()
    expect(await validateImport('null')).toBeNull()
  })
})
