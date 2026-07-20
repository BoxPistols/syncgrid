import { describe, it, expect } from 'vitest'
import { buildWallpaperVars, WALLPAPER_PRESETS } from '../wallpaper'
import { DEFAULT_WALLPAPER, type WallpaperSettings } from '../../types'

const base: WallpaperSettings = { ...DEFAULT_WALLPAPER }

describe('buildWallpaperVars', () => {
  it('default タイプでは変数を注入しない', () => {
    expect(buildWallpaperVars(base, null)).toEqual({})
  })

  it('preset タイプではプリセットのグラデーションを注入する', () => {
    const preset = WALLPAPER_PRESETS[0]
    const vars = buildWallpaperVars({ ...base, type: 'preset', presetId: preset.id }, null)
    expect(vars['--sg-wallpaper-url']).toBe(preset.css)
    expect(vars['--sg-wallpaper-dim']).toBe(String(base.dim))
  })

  it('未知の presetId では壁紙URLを注入しない', () => {
    const vars = buildWallpaperVars({ ...base, type: 'preset', presetId: 'nope' }, null)
    expect(vars['--sg-wallpaper-url']).toBeUndefined()
  })

  it('color タイプでは単色グラデーションを注入する', () => {
    const vars = buildWallpaperVars({ ...base, type: 'color', color: '#112233' }, null)
    expect(vars['--sg-wallpaper-url']).toBe('linear-gradient(#112233, #112233)')
  })

  it('image タイプでは dataURL を注入する（未ロード時は注入しない）', () => {
    const url = 'data:image/jpeg;base64,xxxx'
    expect(buildWallpaperVars({ ...base, type: 'image' }, url)['--sg-wallpaper-url']).toBe(`url("${url}")`)
    expect(buildWallpaperVars({ ...base, type: 'image' }, null)['--sg-wallpaper-url']).toBeUndefined()
  })

  it('dim 値が変数として渡る', () => {
    const vars = buildWallpaperVars({ ...base, type: 'color', dim: 0.4 }, null)
    expect(vars['--sg-wallpaper-dim']).toBe('0.4')
  })

  it('プリセットは id が一意', () => {
    const ids = WALLPAPER_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
