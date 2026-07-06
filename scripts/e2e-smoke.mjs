/**
 * E2E スモークテスト — 実ビルド拡張を headless Chrome for Testing にロードして検証する
 *
 * ユニットテスト(chromeMock)では検出できない実機依存の3点を確認する:
 *   1. bookmarks.move の index 意味論(mock と実機の乖離 = 「devで動くが実機で壊れる」の再発防止)
 *   2. background service worker の生存と FETCH_HTML の URL ガード
 *      (background.ts に import が増えると manifest の type:module なしで SW が黙って死ぬ)
 *   3. Kanban sync の write-through(リモート変更が local へ書き戻される)
 *
 * 使い方: npm run build && npm run e2e:smoke
 * 前提: Chrome for Testing(puppeteer / playwright のキャッシュ、または CFT_PATH 環境変数)
 */
import { existsSync, rmSync, readdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(REPO, 'dist')
const PROFILE = '/tmp/sg-e2e-profile'
const PORT = 9339

const CFT_SUFFIX = join(
  'chrome-mac-arm64',
  'Google Chrome for Testing.app',
  'Contents',
  'MacOS',
  'Google Chrome for Testing',
)

function findChrome() {
  if (process.env.CFT_PATH && existsSync(process.env.CFT_PATH)) return process.env.CFT_PATH
  for (const base of [
    join(homedir(), '.cache', 'puppeteer', 'chrome'),
    join(homedir(), 'Library', 'Caches', 'ms-playwright'),
  ]) {
    if (!existsSync(base)) continue
    // バージョンディレクトリを新しい順に走査
    for (const dir of readdirSync(base).sort().reverse()) {
      const candidate = join(base, dir, CFT_SUFFIX)
      if (existsSync(candidate)) return candidate
    }
  }
  return null
}

async function waitFor(fn, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const v = await fn()
      if (v) return v
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`timeout waiting for ${label}`)
}

function evaluate(wsUrl, expression) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error('Runtime.evaluate timeout (service worker が死んでいる可能性)'))
    }, 20000)
    ws.onerror = (e) => {
      clearTimeout(timer)
      reject(new Error(`ws error: ${e.message ?? e}`))
    }
    ws.onopen = () =>
      ws.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression, awaitPromise: true, returnByValue: true },
        }),
      )
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id !== 1) return
      clearTimeout(timer)
      ws.close()
      if (msg.result?.exceptionDetails) {
        reject(new Error(`evaluate exception: ${JSON.stringify(msg.result.exceptionDetails)}`))
      } else {
        resolve(msg.result?.result?.value)
      }
    }
  })
}

const CHECKS_EXPRESSION = `(async () => {
  const results = { pass: true, checks: {} }
  const record = (name, ok, detail) => {
    results.checks[name] = { ok, detail }
    if (!ok) results.pass = false
  }

  // --- 1. bookmarks.move 意味論(pre-removal: A(0)→idx2 で BAC) ---
  {
    const f = await chrome.bookmarks.create({ parentId: '1', title: 'SG_E2E_' + Math.random() })
    const A = await chrome.bookmarks.create({ parentId: f.id, title: 'A', url: 'https://a.example/' })
    const B = await chrome.bookmarks.create({ parentId: f.id, title: 'B', url: 'https://b.example/' })
    const C = await chrome.bookmarks.create({ parentId: f.id, title: 'C', url: 'https://c.example/' })
    const ids = { [A.id]: 'A', [B.id]: 'B', [C.id]: 'C' }
    const order = async () => (await chrome.bookmarks.getChildren(f.id)).map((n) => ids[n.id]).join('')
    await chrome.bookmarks.move(A.id, { parentId: f.id, index: 2 })
    const afterForward = await order()
    await chrome.bookmarks.removeTree(f.id)
    record('move-semantics(A0->idx2=BAC)', afterForward === 'BAC', afterForward)
  }

  // --- 2. FETCH_HTML の URL ガード(SW 生存確認も兼ねる) ---
  {
    const t0 = Date.now()
    const r1 = await chrome.runtime.sendMessage({ type: 'FETCH_HTML', url: 'file:///etc/hosts' })
    const r2 = await chrome.runtime.sendMessage({ type: 'FETCH_HTML', url: 'https://chromewebstore.google.com/detail/x' })
    const elapsed = Date.now() - t0
    record('fetch-html-guard(file://)', r1 && r1.html === null, JSON.stringify(r1))
    record('fetch-html-guard(webstore)', r2 && r2.html === null, JSON.stringify(r2))
    record('fetch-html-guard(fast=no-fetch)', elapsed < 3000, elapsed + 'ms')
  }

  // --- 3. Kanban sync write-through(リモート変更 → local 書き戻し) ---
  {
    const KEY = 'syncgrid_kanban'
    const backup = (await chrome.storage.local.get(KEY))[KEY]
    const syncBackup = (await chrome.storage.sync.get(KEY))[KEY]
    await chrome.storage.local.set({ [KEY]: { items: [], updatedAt: 1000 } })
    const remote = { items: [{ url: 'https://e2e.example/', column: 'doing', order: 0 }], updatedAt: Date.now() + 1000 }
    await chrome.storage.sync.set({ [KEY]: remote })
    await new Promise((r) => setTimeout(r, 800))
    const local = (await chrome.storage.local.get(KEY))[KEY]
    const ok = !!local && local.updatedAt === remote.updatedAt && local.items.length === 1
    record('kanban-sync-write-through', ok, JSON.stringify(local))
    // 原状復元
    if (backup) await chrome.storage.local.set({ [KEY]: backup }); else await chrome.storage.local.remove(KEY)
    if (syncBackup) await chrome.storage.sync.set({ [KEY]: syncBackup }); else await chrome.storage.sync.remove(KEY)
  }

  return JSON.stringify(results)
})()`

async function main() {
  // 組み込みWebSocketクライアントはNode 22.4+で安定（Node 20は --experimental-websocket が必要）
  if (typeof WebSocket === 'undefined') {
    console.error('このスクリプトは Node 22.4 以降が必要です（組み込み WebSocket を使用）')
    process.exit(1)
  }
  if (!existsSync(join(DIST, 'manifest.json'))) {
    console.error('dist/ がありません。先に npm run build を実行してください')
    process.exit(1)
  }
  const chromePath = findChrome()
  if (!chromePath) {
    console.error('Chrome for Testing が見つかりません(CFT_PATH で指定可能)')
    process.exit(1)
  }
  console.log(`chrome: ${chromePath}`)

  rmSync(PROFILE, { recursive: true, force: true })
  const chrome = spawn(
    chromePath,
    [
      `--user-data-dir=${PROFILE}`,
      `--load-extension=${DIST}`,
      `--remote-debugging-port=${PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--headless=new',
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  try {
    await waitFor(
      () => fetch(`http://localhost:${PORT}/json/version`).then((r) => r.ok),
      15000,
      'CDP port',
    )
    // 拡張IDは「distの絶対パス」由来で環境ごとに変わるため、service worker ターゲットから動的に発見する
    const extId = await waitFor(async () => {
      const list = await (await fetch(`http://localhost:${PORT}/json/list`)).json()
      const sw = list.find(
        (t) => t.type === 'service_worker' && t.url.endsWith('/background.js'),
      )
      return sw ? new URL(sw.url).hostname : null
    }, 15000, 'extension service worker (background.js)')
    console.log(`extension id: ${extId}`)
    await fetch(`http://localhost:${PORT}/json/new?chrome-extension://${extId}/index.html`, {
      method: 'PUT',
    })
    const target = await waitFor(async () => {
      const list = await (await fetch(`http://localhost:${PORT}/json/list`)).json()
      return list.find((t) => t.type === 'page' && t.url.includes(`${extId}/index.html`))
    }, 15000, 'extension page target')

    // 拡張ページのアプリ初期化(onChangedリスナ登録)を待つ
    await new Promise((r) => setTimeout(r, 1500))

    const raw = await evaluate(target.webSocketDebuggerUrl, CHECKS_EXPRESSION)
    const results = JSON.parse(raw)
    for (const [name, { ok, detail }] of Object.entries(results.checks)) {
      console.log(`${ok ? '✅' : '❌'} ${name}  ${detail}`)
    }
    if (!results.pass) {
      console.error('E2E smoke: FAIL')
      process.exitCode = 1
    } else {
      console.log('E2E smoke: PASS')
    }
  } finally {
    chrome.kill('SIGKILL')
    rmSync(PROFILE, { recursive: true, force: true })
  }
}

await main()
