/**
 * Chrome API Mock — for vite dev server (localhost)
 *
 * Chrome拡張APIはlocalhost環境では使えないため、
 * 開発モード用のモックデータを提供する。
 * ビルド後の拡張環境では本物のAPIが使われる。
 */

const IS_EXTENSION = typeof chrome !== 'undefined' && !!chrome.runtime?.id

/** manifest.json からバージョンを取得（dev環境はフォールバック） */
export function getAppVersion(): string {
  try {
    return chrome.runtime.getManifest().version
  } catch {
    return '2.0.0'
  }
}

export interface MockNode {
  id: string
  parentId?: string
  title: string
  url?: string
  dateAdded?: number
  children?: MockNode[]
}

// テストからも同一実装を使えるようファクトリとしてエクスポート(dev環境では末尾で自動マウント)
export function createMockChrome(seedRoot?: MockNode): typeof chrome {
  // --- Mock Data ---
  let nextId = 100
  const genId = () => String(nextId++)

  const root: MockNode = seedRoot ?? {
    id: '0',
    title: '',
    children: [
      {
        id: '1',
        parentId: '0',
        title: 'Bookmarks Bar',
        children: [
          {
            id: '60',
            parentId: '1',
            title: 'Tech',
            children: [
              { id: '61', parentId: '60', title: 'Hacker News', url: 'https://news.ycombinator.com', dateAdded: Date.now() },
              { id: '62', parentId: '60', title: 'Reddit', url: 'https://reddit.com', dateAdded: Date.now() },
              { id: '63', parentId: '60', title: 'Zenn', url: 'https://zenn.dev', dateAdded: Date.now() },
            ],
          },
          {
            id: '64',
            parentId: '1',
            title: 'News',
            children: [
              { id: '65', parentId: '64', title: 'NHK', url: 'https://www3.nhk.or.jp', dateAdded: Date.now() },
              { id: '66', parentId: '64', title: 'BBC', url: 'https://bbc.com', dateAdded: Date.now() },
            ],
          },
        ],
      },
      {
        id: '2',
        parentId: '0',
        title: 'Other Bookmarks',
        children: [
          {
            id: '10',
            parentId: '2',
            title: '__SyncGrid__',
            children: [
              {
                id: '20',
                parentId: '10',
                title: '仕事',
                children: [
                  { id: '30', parentId: '20', title: 'GitHub', url: 'https://github.com', dateAdded: Date.now() },
                  { id: '31', parentId: '20', title: 'Slack', url: 'https://slack.com', dateAdded: Date.now() },
                  { id: '32', parentId: '20', title: 'Jira', url: 'https://jira.atlassian.com', dateAdded: Date.now() },
                  {
                    id: '40',
                    parentId: '20',
                    title: 'フロントエンド',
                    children: [
                      {
                        id: '50',
                        parentId: '40',
                        title: 'React Docs',
                        url: 'https://react.dev',
                        dateAdded: Date.now(),
                      },
                      { id: '51', parentId: '40', title: 'Vite', url: 'https://vite.dev', dateAdded: Date.now() },
                      {
                        id: '52',
                        parentId: '40',
                        title: 'TypeScript',
                        url: 'https://typescriptlang.org',
                        dateAdded: Date.now(),
                      },
                    ],
                  },
                ],
              },
              {
                id: '21',
                parentId: '10',
                title: 'デザイン',
                children: [
                  { id: '33', parentId: '21', title: 'Figma', url: 'https://figma.com', dateAdded: Date.now() },
                  { id: '34', parentId: '21', title: 'Dribbble', url: 'https://dribbble.com', dateAdded: Date.now() },
                ],
              },
              {
                id: '22',
                parentId: '10',
                title: 'ツール',
                children: [
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
      addListener: (fn: Listener) => {
        listeners.push(fn)
      },
      removeListener: (fn: Listener) => {
        const idx = listeners.indexOf(fn)
        if (idx >= 0) listeners.splice(idx, 1)
      },
      fire: (...args: unknown[]) => {
        listeners.forEach((fn) => fn(...args))
      },
    }
  }

  const onCreated = mockEvent()
  const onRemoved = mockEvent()
  const onChanged = mockEvent()
  const onMoved = mockEvent()

  // --- Storage mock ---
  const storageOnChanged = mockEvent()
  const storageLocal: Record<string, unknown> = {}
  const storageSync: Record<string, unknown> = {}

  function makeStorageArea(data: Record<string, unknown>, areaName: string) {
    // 実Chromeのstorageはstructured cloneで必ずコピーを返す。
    // 参照を共有すると呼び出し側のミューテーションがstorage内まで書き換わり、実機と挙動が乖離する
    const clone = <T>(v: T): T => (v === undefined ? v : structuredClone(v))
    return {
      get: (keys: string | string[] | null) => {
        if (keys === null) return Promise.resolve(clone({ ...data }))
        const keyList = typeof keys === 'string' ? [keys] : keys
        const result: Record<string, unknown> = {}
        for (const k of keyList) {
          if (k in data) result[k] = clone(data[k])
        }
        return Promise.resolve(result)
      },
      set: (items: Record<string, unknown>) => {
        const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {}
        for (const [k, v] of Object.entries(items)) {
          const stored = clone(v)
          changes[k] = { oldValue: data[k], newValue: clone(stored) }
          data[k] = stored
        }
        storageOnChanged.fire(changes, areaName)
        return Promise.resolve()
      },
      remove: (keys: string | string[]) => {
        const keyList = typeof keys === 'string' ? [keys] : keys
        const changes: Record<string, { oldValue?: unknown }> = {}
        for (const k of keyList) {
          if (k in data) {
            changes[k] = { oldValue: data[k] }
            delete data[k]
          }
        }
        storageOnChanged.fire(changes, areaName)
        return Promise.resolve()
      },
      getBytesInUse: () => Promise.resolve(0),
    }
  }

  return {
    runtime: { id: '' },
    bookmarks: {
      get: (idOrList: string | string[]) => {
        const ids = typeof idOrList === 'string' ? [idOrList] : idOrList
        const nodes = ids.map((i) => findNode(root, i))
        // 実Chromeは1件でも未検出なら全体をrejectする（部分結果は返さない）
        if (nodes.some((n) => n === null)) {
          return Promise.reject(new Error("Can't find bookmark for id."))
        }
        return Promise.resolve(nodes.map((n) => toTreeNode(n as MockNode)))
      },
      getTree: () => {
        return Promise.resolve([toTreeNode(root)])
      },
      search: (query: { title?: string }) => {
        const all = flattenAll(root)
        const results = all.filter((n) => {
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
          const idx = parent.children.findIndex((c) => c.id === id)
          if (idx >= 0) parent.children.splice(idx, 1)
        }
        onRemoved.fire(id, {})
        return Promise.resolve()
      },
      removeTree: (id: string) => {
        const parent = findParent(root, id)
        if (parent?.children) {
          const idx = parent.children.findIndex((c) => c.id === id)
          if (idx >= 0) parent.children.splice(idx, 1)
        }
        onRemoved.fire(id, {})
        return Promise.resolve()
      },
      move: (id: string, dest: { parentId: string; index?: number }) => {
        const parent = findParent(root, id)
        const node = findNode(root, id)
        if (parent?.children && node) {
          const sameParent = node.parentId === dest.parentId
          const idx = parent.children.findIndex((c) => c.id === id)
          if (idx >= 0) parent.children.splice(idx, 1)
          const newParent = findNode(root, dest.parentId)
          if (newParent?.children) {
            node.parentId = dest.parentId
            if (dest.index !== undefined) {
              // 実Chromeのindexは「移動前リスト上の挿入位置」解釈。
              // 同一親内の前方移動はChrome内部で-1補正される(2026-07実測)ため、mockも揃える
              const insertIdx =
                sameParent && idx >= 0 && idx < dest.index ? dest.index - 1 : dest.index
              newParent.children.splice(insertIdx, 0, node)
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
      local: makeStorageArea(storageLocal, 'local'),
      sync: makeStorageArea(storageSync, 'sync'),
      onChanged: {
        addListener: storageOnChanged.addListener,
        removeListener: storageOnChanged.removeListener,
      },
    },
    permissions: {
      contains: () => Promise.resolve(true),
      request: () => Promise.resolve(true),
    },
  } as unknown as typeof chrome
}

if (!IS_EXTENSION) {
  const g = globalThis as unknown as { chrome: typeof chrome }
  g.chrome = createMockChrome()
  console.info('[SyncGrid] Dev mode: using mock Chrome APIs')
}
