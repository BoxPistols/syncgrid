/**
 * 開発用オートリロード受信部（dev 専用）。
 *
 * scripts/dev-watch.mjs の SSE から変更通知を受け取り、新規タブを再読み込みする。
 * - type:'page'（CSS/JS/HTML 変更） → location.reload()
 * - type:'full'（manifest/background 変更） → chrome.runtime.reload() 後にページ再読み込み
 *
 * このファイルは main.tsx から import.meta.env.MODE === 'development' のときだけ
 * 動的 import される。本番ビルド（mode production）では参照ごと除去される。
 */

const SSE_URL = 'http://127.0.0.1:8473/__sg_dev'
const RECONNECT_MS = 1500

export function startDevReload(): void {
  const connect = (): void => {
    const es = new EventSource(SSE_URL)

    es.onmessage = (e: MessageEvent<string>) => {
      let type: 'full' | 'page' = 'page'
      try {
        const parsed = JSON.parse(e.data) as { type?: 'full' | 'page' }
        if (parsed.type === 'full') type = 'full'
      } catch {
        // 解析不能な通知は安全側（page reload）で扱う
      }
      if (type === 'full') {
        try {
          chrome.runtime?.reload?.()
        } catch {
          // 拡張コンテキスト外なら無視
        }
        // 拡張再起動を待ってからページを引き直す
        window.setTimeout(() => window.location.reload(), 400)
      } else {
        window.location.reload()
      }
    }

    es.onerror = () => {
      // サーバ未起動 / 再起動中 → 閉じて再接続
      es.close()
      window.setTimeout(connect, RECONNECT_MS)
    }
  }

  connect()
  console.info('[SyncGrid] dev auto-reload 有効（npm run watch:auto 実行中に保存で自動反映）')
}
