import { useState, useEffect, useMemo } from 'react'
import { buildWallpaperVars, loadWallpaperImage } from '../utils/wallpaper'
import type { WallpaperSettings } from '../types'

/**
 * 壁紙設定から .sg-wallpaper へ注入する CSS 変数を返す。
 * 設定ロード完了（loaded）まで空を返し、デフォルト→ユーザー壁紙のフラッシュを防ぐ。
 */
export function useWallpaper(wallpaper: WallpaperSettings, loaded: boolean): React.CSSProperties {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    // type!=='image' 時は buildWallpaperVars が imageUrl を無視するため、クリア不要
    if (!loaded || wallpaper.type !== 'image') return
    let cancelled = false
    loadWallpaperImage().then((url) => {
      if (!cancelled) setImageUrl(url)
    })
    return () => {
      cancelled = true
    }
    // wallpaper オブジェクト全体に依存: 画像の再アップロード（settings更新）で再読込させる
  }, [loaded, wallpaper])

  return useMemo(() => {
    if (!loaded) return {}
    return buildWallpaperVars(wallpaper, imageUrl) as React.CSSProperties
  }, [loaded, wallpaper, imageUrl])
}
