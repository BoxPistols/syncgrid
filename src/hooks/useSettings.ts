import { useState, useEffect, useCallback, useRef } from 'react'
import { DEFAULT_SETTINGS, type SyncGridSettings } from '../types'
import { loadSettings, saveSettings } from '../utils/storage'

/**
 * SyncGrid設定の読み書きを行うhook
 * updateSettings は Partial<> またはコールバック関数を受け取る
 */
export function useSettings() {
  const [settings, setSettings] = useState<SyncGridSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    loadSettings().then((s) => {
      // dev環境: ?lang=en / ?lang=ja で言語オーバーライド
      const urlLang = new URLSearchParams(window.location.search).get('lang')
      if (urlLang === 'en' || urlLang === 'ja') {
        s = { ...s, locale: urlLang }
      }
      setSettings(s)
      setLoaded(true)
    })
  }, [])

  const updateSettings = useCallback(
    async (patchOrFn: Partial<SyncGridSettings> | ((prev: SyncGridSettings) => Partial<SyncGridSettings>)) => {
      const patch = typeof patchOrFn === 'function' ? patchOrFn(settingsRef.current) : patchOrFn
      const next = { ...settingsRef.current, ...patch }
      setSettings(next)
      await saveSettings(patch)
    },
    [],
  )

  return { settings, updateSettings, loaded }
}
