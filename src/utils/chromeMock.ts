/**
 * Chrome API Mock — for vite dev server (localhost)
 *
 * Chrome拡張APIはlocalhost環境では使えないため、
 * 開発モード用のモックデータを提供する。
 * ビルド後の拡張環境では本物のAPIが使われる。
 */

const IS_EXTENSION = typeof chrome !== 'undefined' && !!chrome.runtime?.id

if (!IS_EXTENSION) {
  // --- Mock Data ---
  let nextId = 100
  const genId = () => String(nextId++)

  interface MockNode {
    id: string
    parentId?: string
    title: string
    url?: string
    dateAdded?: number
    children?: MockNode[]
  }

  const root: MockNode = {
    id: '0', title: '', children: [
      { id: '1', parentId: '0', title: 'Bookmarks Bar', children: [] },
      {
        id: '2', parentId: '0', title: 'Other Bookmarks', children: [
          {
            id: '10', parentId: '2', title: '__SyncGrid__', children: [
              {
                id: '20', parentId: '10', title: '仕事', children: [
                  { id: '30', parentId: '20', title: 'GitHub', url: 'https://github.com', dateAdded: Date.now() },
                  { id: '31', parentId: '20', title: 'Slack', url: 'https://slack.com', dateAdded: Date.now() },
                  { id: '32', parentId: '20', title: 'Jira', url: 'https://jira.atlassian.com', dateAdded: Date.now() },
                  {
                    id: '40', parentId: '20', title: 'フロントエンド', children: [
                      { id: '50', parentId: '40', title: 'React Docs', url: 'https://react.dev', dateAdded: Date.now() },
                      { id: '51', parentId: '40', title: 'Vite', url: 'https://vite.dev', dateAdded: Date.now() },
                      { id: '52', parentId: '40', title: 'TypeScript', url: 'https://typescriptlang.org', dateAdded: Date.now() },
                    ],
                  },
                ],
              },
              {
                id: '21', parentId: '10', title: 'デザイン', children: [
                  { id: '33', parentId: '21', title: 'Figma', url: 'https://figma.com', dateAdded: Date.now() },
                  { id: '34', parentId: '21', title: 'Dribbble', url: 'https://dribbble.com', dateAdded: Date.now() },
                ],
              },
              {
                id: '22', parentId: '10', title: 'ツール', children: [
                  { id: '35', parentId: '22', title: 'Notion', url: 'https://notion.so', dateAdded: Date.now() },
                  { id: '36', parentId: '22', title: 'Claude', url: 'https://claude.ai', dateAdded: Date.now() },
                  { id: '37', parentId: '22', title: 'Vercel', url: 'https://vercel.com', dateAdded: Date.now() },
                ],
              },
            ],
          },
        ],
      },
    ],
  }

  // --- Helpers ---
  function findNode(node: MockNode, id: string): MockNode | null {
    if (node.id === id) return node
    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child, id)
        if (found) return found
      }
    }
    return null
  }

  function findParent(node: MockNode, id: string): MockNode | null {
    if (node.children) {
      for (const child of node.children) {
        if (child.id === id) return node
        const found = findParent(child, id)
        if (found) return found
      }
    }
    return null
  }

  function flattenAll(node: MockNode): MockNode[] {
    const result: MockNode[] = [node]
    if (node.children) {
      for (const child of node.children) {
        result.push(...flattenAll(child))
      }
    }
    return result
  }

  function toTreeNode(node: MockNode): chrome.bookmarks.BookmarkTreeNode {
    return {
      id: node.id,
      parentId: node.parentId,
      title: node.title,
      url: node.url,
      dateAdded: node.dateAdded,
      children: node.children?.map(toTreeNode),
    } as chrome.bookmarks.BookmarkTreeNode
  }

  type Listener = (...args: unknown[]) => void
  function mockEvent() {
    const listeners: Listener[] = []
    return {
      addListener: (fn: Listener) => { listeners.push(fn) },
      removeListener: (fn: Listener) => {
        const idx = listeners.indexOf(fn)
        if (idx >= 0) listeners.splice(idx, 1)
      },
      fire: (...args: unknown[]) => { listeners.forEach(fn => fn(...args)) },
    }
  }

  const onCreated = mockEvent()
  const onRemoved = mockEvent()
  const onChanged = mockEvent()
  const onMoved = mockEvent()

  // --- Storage mock ---
  const storageData: Record<string, unknown> = {}

  // --- Mount mocks ---
  const g = globalThis as unknown as { chrome: typeof chrome }

  g.chrome = {
    runtime: { id: '' },
    bookmarks: {
      search: (query: { title?: string }) => {
        const all = flattenAll(root)
        const results = all.filter(n => {
          if (query.title && n.title === query.title) return true
          return false
        })
        return Promise.resolve(results.map(toTreeNode))
      },
      getSubTree: (id: string) => {
        const node = findNode(root, id)
        return Promise.resolve(node ? [toTreeNode(node)] : [])
      },
      create: (details: { parentId?: string; title: string; url?: string }) => {
        const newNode: MockNode = {
          id: genId(),
          parentId: details.parentId || '2',
          title: details.title,
          url: details.url,
          dateAdded: Date.now(),
          children: details.url ? undefined : [],
        }
        const parent = findNode(root, details.parentId || '2')
        if (parent?.children) parent.children.push(newNode)
        onCreated.fire(newNode.id, toTreeNode(newNode))
        return Promise.resolve(toTreeNode(newNode))
      },
      update: (id: string, changes: { title?: string; url?: string }) => {
        const node = findNode(root, id)
        if (node) {
          if (changes.title !== undefined) node.title = changes.title
          if (changes.url !== undefined) node.url = changes.url
          onChanged.fire(id, { title: node.title, url: node.url })
        }
        return Promise.resolve(node ? toTreeNode(node) : null)
      },
      remove: (id: string) => {
        const parent = findParent(root, id)
        if (parent?.children) {
          const idx = parent.children.findIndex(c => c.id === id)
          if (idx >= 0) parent.children.splice(idx, 1)
        }
        onRemoved.fire(id, {})
        return Promise.resolve()
      },
      removeTree: (id: string) => {
        const parent = findParent(root, id)
        if (parent?.children) {
          const idx = parent.children.findIndex(c => c.id === id)
          if (idx >= 0) parent.children.splice(idx, 1)
        }
        onRemoved.fire(id, {})
        return Promise.resolve()
      },
      move: (id: string, dest: { parentId: string; index?: number }) => {
        const parent = findParent(root, id)
        const node = findNode(root, id)
        if (parent?.children && node) {
          const idx = parent.children.findIndex(c => c.id === id)
          if (idx >= 0) parent.children.splice(idx, 1)
          const newParent = findNode(root, dest.parentId)
          if (newParent?.children) {
            node.parentId = dest.parentId
            if (dest.index !== undefined) {
              newParent.children.splice(dest.index, 0, node)
            } else {
              newParent.children.push(node)
            }
          }
          onMoved.fire(id, {})
        }
        return Promise.resolve(node ? toTreeNode(node) : null)
      },
      onCreated,
      onRemoved,
      onChanged,
      onMoved,
    },
    storage: {
      local: {
        get: (keys: string | string[] | null) => {
          if (keys === null) return Promise.resolve({ ...storageData })
          const keyList = typeof keys === 'string' ? [keys] : keys
          const result: Record<string, unknown> = {}
          for (const k of keyList) {
            if (k in storageData) result[k] = storageData[k]
          }
          return Promise.resolve(result)
        },
        set: (items: Record<string, unknown>) => {
          Object.assign(storageData, items)
          return Promise.resolve()
        },
      },
    },
  } as unknown as typeof chrome

  console.info('[SyncGrid] Dev mode: using mock Chrome APIs')
}
