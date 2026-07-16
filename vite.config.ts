/// <reference types="vitest/config" />
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * ビルドのたびに manifest.json のバージョンを「時刻ベースのビルド ID」にする。
 * `${major}.${minor}.${基準日からのUTC日数}.${UTC日内秒/2}`（例 0.1.2389.41230）。
 *
 * 複数 PC からランダムにデプロイしても、UTC 時計順で常に単調増加する（共有状態・
 * カウンタファイル不要。オフラインビルドでも成立）。major.minor は package.json 由来で、
 * セマンティックは package.json = 0.1.0 のまま。実リリースは minor を上げる（0.2.0 など）。
 *
 * Chrome のバージョンは 4 セグメント・各 0〜65535。日数は約179年、日内秒/2 は最大 43199 で収まる。
 */
const VERSION_EPOCH_MS = Date.UTC(2020, 0, 1) // 2020-01-01 UTC

function autoBuildNumber(): Plugin {
  return {
    name: 'sg-auto-build-number',
    apply: 'build',
    closeBundle() {
      const manifestFile = resolve(process.cwd(), 'dist/manifest.json')
      if (!existsSync(manifestFile)) return

      const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')) as {
        version: string
      }
      const [major = '0', minor = '0'] = pkg.version.split('.')

      const now = Date.now()
      const days = Math.floor((now - VERSION_EPOCH_MS) / 86_400_000)
      const halfSecondOfDay = Math.floor(((now - VERSION_EPOCH_MS) % 86_400_000) / 2000)

      const manifest = JSON.parse(readFileSync(manifestFile, 'utf-8')) as Record<string, unknown>
      manifest.version = `${major}.${minor}.${days}.${halfSecondOfDay}`
      writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n')
      console.log(`[build-no] manifest version → ${manifest.version as string}`)
    },
  }
}

export default defineConfig({
  plugins: [react(), autoBuildNumber()],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        newtab: 'index.html',
        background: 'src/background.ts',
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
