// Chrome API mock for test environment
const storage: Record<string, unknown> = {}

Object.defineProperty(globalThis, 'chrome', {
  value: {
    runtime: { id: 'test-extension-id' },
    bookmarks: {
      search: vi.fn(() => Promise.resolve([])),
      getSubTree: vi.fn(() => Promise.resolve([{ children: [] }])),
      create: vi.fn((props: Record<string, unknown>) => Promise.resolve({ id: String(Date.now()), ...props })),
      update: vi.fn((_id: string, changes: Record<string, unknown>) => Promise.resolve(changes)),
      remove: vi.fn(() => Promise.resolve()),
      removeTree: vi.fn(() => Promise.resolve()),
      move: vi.fn((_id: string, dest: Record<string, unknown>) => Promise.resolve(dest)),
      onCreated: { addListener: vi.fn() },
      onRemoved: { addListener: vi.fn() },
      onChanged: { addListener: vi.fn() },
      onMoved: { addListener: vi.fn() },
    },
    storage: {
      local: {
        get: vi.fn((keys: string[]) => {
          const result: Record<string, unknown> = {}
          for (const k of keys) {
            if (k in storage) result[k] = storage[k]
          }
          return Promise.resolve(result)
        }),
        set: vi.fn((items: Record<string, unknown>) => {
          Object.assign(storage, items)
          return Promise.resolve()
        }),
      },
    },
  },
  writable: true,
})

// crypto.subtle polyfill for jsdom (SHA-256)
if (!globalThis.crypto?.subtle) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { webcrypto } = require('node:crypto')
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    writable: true,
  })
}
