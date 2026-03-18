/**
 * SyncGrid アイコン生成スクリプト
 * 2x2グリッドをモチーフにした拡張機能アイコン + favicon を生成
 *
 * Usage: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'

// --- 共通SVGテンプレート（4白四角グリッド） ---
function gridSvg(size, rx, padding, squareRx) {
  const gap = Math.round(size * 0.078)
  const sq = Math.round((size - padding * 2 - gap) / 2)
  const x2 = padding + sq + gap
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" fill="url(#bg)"/>
  <rect x="${padding}" y="${padding}" width="${sq}" height="${sq}" rx="${squareRx}" fill="white"/>
  <rect x="${x2}" y="${padding}" width="${sq}" height="${sq}" rx="${squareRx}" fill="white"/>
  <rect x="${padding}" y="${x2}" width="${sq}" height="${sq}" rx="${squareRx}" fill="white"/>
  <rect x="${x2}" y="${x2}" width="${sq}" height="${sq}" rx="${squareRx}" fill="white"/>
</svg>`
}

// 拡張機能アイコン
const svg128 = gridSvg(128, 28, 24, 9)
const svg48  = gridSvg(48, 10, 9, 3.5)
const svg16  = gridSvg(16, 3.5, 3, 1)

// favicon用 32px
const svg32  = gridSvg(32, 7, 6, 2)

async function generate() {
  // 拡張機能アイコン
  await sharp(Buffer.from(svg128)).png().toFile('public/icons/icon128.png')
  await sharp(Buffer.from(svg48)).png().toFile('public/icons/icon48.png')
  await sharp(Buffer.from(svg16)).png().toFile('public/icons/icon16.png')

  // favicon
  await sharp(Buffer.from(svg32)).png().toFile('public/favicon-32x32.png')
  await sharp(Buffer.from(svg16)).png().toFile('public/favicon-16x16.png')

  console.log('✅ All icons generated')
}

generate().catch(console.error)
