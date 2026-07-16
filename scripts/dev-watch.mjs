/**
 * 開発用オートリロード — vite watch ビルド + 変更通知サーバ（依存ゼロ / Node 標準のみ）
 *
 * unpacked な MV3 拡張は dist が更新されても Chrome が自動リロードしない。
 * このスクリプトは:
 *   1. `vite build --watch --mode development` を起動し、保存のたびに dist を再ビルド
 *   2. dist/ を監視し、変更を SSE で新規タブ（src/devReload.ts）へ通知
 *      - manifest.json / background.js の変更 → type:'full'（chrome.runtime.reload）
 *      - それ以外（CSS/JS/HTML）        → type:'page'（location.reload）
 *
 * 本番ビルド（`npm run build` = mode production）には受信側コードが含まれない
 * （src/devReload.ts は import.meta.env.MODE ガードで除去される）。
 *
 * 使い方: npm run watch:auto （拡張は事前に一度 unpacked ロードしておく）
 */
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(REPO, 'dist')
const HOST = '127.0.0.1'
const PORT = 8473
const DEBOUNCE_MS = 200

/** @type {Set<import('node:http').ServerResponse>} */
const clients = new Set()

// --- vite watch ビルドを子プロセスで起動 ---
const vite = spawn(
  'npx',
  ['vite', 'build', '--watch', '--mode', 'development'],
  { cwd: REPO, stdio: 'inherit' },
)
vite.on('exit', (code) => {
  console.log(`[dev-watch] vite exited (${code})`)
  process.exit(code ?? 0)
})

// --- SSE 通知サーバ ---
const server = createServer((req, res) => {
  // CORS: 拡張オリジン(chrome-extension://) からの購読を許可（host_permissions 不要）
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.url !== '/__sg_dev') {
    res.writeHead(404)
    res.end()
    return
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.write(': connected\n\n')
  clients.add(res)
  req.on('close', () => clients.delete(res))
})
server.listen(PORT, HOST, () => {
  console.log(`[dev-watch] reload signal server on http://${HOST}:${PORT}/__sg_dev`)
})

// SSE 生存維持のハートビート
setInterval(() => {
  for (const res of clients) res.write(': ping\n\n')
}, 20000)

/** @param {'full' | 'page'} type */
function notify(type) {
  const payload = `data: ${JSON.stringify({ type })}\n\n`
  for (const res of clients) res.write(payload)
  console.log(`[dev-watch] reload → ${type} (${clients.size} client${clients.size === 1 ? '' : 's'})`)
}

// --- dist 監視（デバウンスして変更種別を判定）---
let timer = null
let changed = new Set()
try {
  watch(DIST, { recursive: true }, (_event, filename) => {
    if (filename) changed.add(String(filename))
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const files = [...changed]
      changed = new Set()
      timer = null
      if (files.length === 0) return
      const full = files.some(
        (f) => f.endsWith('manifest.json') || f.endsWith('background.js'),
      )
      notify(full ? 'full' : 'page')
    }, DEBOUNCE_MS)
  })
} catch (err) {
  console.error('[dev-watch] dist 監視に失敗（先に一度ビルドが必要かもしれません）:', err)
}

process.on('SIGINT', () => {
  vite.kill()
  server.close()
  process.exit(0)
})
