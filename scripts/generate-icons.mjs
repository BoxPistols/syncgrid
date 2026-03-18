/**
 * SyncGrid アイコン生成スクリプト
 * 2x2グリッドをモチーフにした拡張機能アイコンを生成
 *
 * Usage: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'

// 128px: グラデーション背景 + 2x2グリッド (3白四角 + 1 sync arrow)
const svg128 = `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#bg)"/>
  <rect x="24" y="24" width="35" height="35" rx="9" fill="white"/>
  <rect x="69" y="24" width="35" height="35" rx="9" fill="white"/>
  <rect x="24" y="69" width="35" height="35" rx="9" fill="white"/>
  <!-- BR: sync circular arrow -->
  <path d="M97 82 A11 11 0 1 1 82 97" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M94 85 L97 82 L100 79" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

// 48px: 4白四角シンプル版
const svg48 = `<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="48" height="48" rx="10" fill="url(#bg)"/>
  <rect x="9" y="9" width="13" height="13" rx="3.5" fill="white"/>
  <rect x="26" y="9" width="13" height="13" rx="3.5" fill="white"/>
  <rect x="9" y="26" width="13" height="13" rx="3.5" fill="white"/>
  <rect x="26" y="26" width="13" height="13" rx="3.5" fill="white"/>
</svg>`

// 16px: 最小サイズ、フラット色 + 4ドット
const svg16 = `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
  <rect width="16" height="16" rx="3.5" fill="#5b21b6"/>
  <rect x="3" y="3" width="4" height="4" rx="1" fill="white"/>
  <rect x="9" y="3" width="4" height="4" rx="1" fill="white"/>
  <rect x="3" y="9" width="4" height="4" rx="1" fill="white"/>
  <rect x="9" y="9" width="4" height="4" rx="1" fill="white"/>
</svg>`

async function generate() {
  await sharp(Buffer.from(svg128)).png().toFile('public/icons/icon128.png')
  await sharp(Buffer.from(svg48)).png().toFile('public/icons/icon48.png')
  await sharp(Buffer.from(svg16)).png().toFile('public/icons/icon16.png')
  console.log('✅ Icons generated: icon16.png, icon48.png, icon128.png')
}

generate().catch(console.error)
