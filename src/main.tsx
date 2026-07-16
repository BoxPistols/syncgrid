import './utils/chromeMock'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 開発用オートリロード（本番ビルドでは MODE ガードで丸ごと除去される）
if (import.meta.env.MODE === 'development') {
  import('./devReload').then((m) => m.startDevReload()).catch(() => {})
}
