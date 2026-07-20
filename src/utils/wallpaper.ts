import type { WallpaperSettings } from '../types'

const IMAGE_KEY = 'syncgrid_wallpaper_image'

/** 圧縮後の許容上限（chrome.storage.local の 10MB クォータに対する安全域） */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/** 再圧縮パラメータ */
const MAX_EDGE = 1920
const JPEG_QUALITY = 0.85

export interface WallpaperPreset {
  id: string
  /** background-image に入るCSS値（グラデーション） */
  css: string
}

/** グラデーションプリセット（ダーク/ライト両テーマで破綻しない中間〜暗色系） */
export const WALLPAPER_PRESETS: readonly WallpaperPreset[] = [
  { id: 'midnight', css: 'linear-gradient(160deg, #0b1026 0%, #1c2a52 55%, #27417a 100%)' },
  { id: 'aurora', css: 'linear-gradient(150deg, #041f1e 0%, #0c3b3d 45%, #10645c 100%)' },
  { id: 'dusk', css: 'linear-gradient(165deg, #24123d 0%, #4a1e58 55%, #86315e 100%)' },
  { id: 'ember', css: 'linear-gradient(160deg, #2a0f0f 0%, #5c2318 55%, #93542a 100%)' },
  { id: 'slate', css: 'linear-gradient(170deg, #1a1d24 0%, #2c313c 60%, #454c5a 100%)' },
  { id: 'daybreak', css: 'linear-gradient(155deg, #dce7f5 0%, #c4d5ee 50%, #a8c0e8 100%)' },
] as const

/** 画像ファイルを最大長辺1920px / JPEG 0.85 に再圧縮して dataURL 化する */
export async function fileToCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context unavailable')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  // dataURL の base64 部は元バイナリの約4/3倍
  if (dataUrl.length * 0.75 > MAX_IMAGE_BYTES) {
    throw new Error('wallpaper image too large')
  }
  return dataUrl
}

export async function loadWallpaperImage(): Promise<string | null> {
  const res = await chrome.storage.local.get(IMAGE_KEY)
  const v = res[IMAGE_KEY]
  return typeof v === 'string' ? v : null
}

export async function saveWallpaperImage(dataUrl: string): Promise<void> {
  await chrome.storage.local.set({ [IMAGE_KEY]: dataUrl })
}

export async function clearWallpaperImage(): Promise<void> {
  await chrome.storage.local.remove(IMAGE_KEY)
}

/**
 * 壁紙設定から .sg-wallpaper に注入する CSS 変数を組み立てる。
 * type='default' は変数を注入せず、テーマ既定のアートワークに任せる。
 */
export function buildWallpaperVars(
  wallpaper: WallpaperSettings,
  imageUrl: string | null,
): Record<string, string> {
  const vars: Record<string, string> = {}
  if (wallpaper.type === 'preset') {
    const preset = WALLPAPER_PRESETS.find((p) => p.id === wallpaper.presetId)
    if (preset) vars['--sg-wallpaper-url'] = preset.css
  } else if (wallpaper.type === 'color') {
    vars['--sg-wallpaper-url'] = `linear-gradient(${wallpaper.color}, ${wallpaper.color})`
  } else if (wallpaper.type === 'image' && imageUrl) {
    vars['--sg-wallpaper-url'] = `url("${imageUrl}")`
  }
  if (wallpaper.type !== 'default') {
    vars['--sg-wallpaper-dim'] = String(wallpaper.dim)
  }
  return vars
}
