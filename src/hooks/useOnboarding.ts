import { useState, useEffect, useCallback } from 'react'

/**
 * 初回起動時のウェルカム画面とツアーの表示制御。
 * onboarded フラグは chrome.storage.local に永続化。
 */
export function useOnboarding() {
  const [showWelcome, setShowWelcome] = useState(false)
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    chrome.storage.local.get('syncgrid_onboarded').then((r) => {
      if (!r.syncgrid_onboarded) setShowWelcome(true)
    })
  }, [])

  const completeTour = useCallback(() => {
    setShowTour(false)
    chrome.storage.local.set({ syncgrid_onboarded: true })
  }, [])

  const startTour = useCallback(() => {
    setShowWelcome(false)
    chrome.storage.local.set({ syncgrid_onboarded: true })
    setShowTour(true)
  }, [])

  const skipWelcome = useCallback(() => {
    setShowWelcome(false)
    chrome.storage.local.set({ syncgrid_onboarded: true })
  }, [])

  return { showWelcome, showTour, startTour, completeTour, skipWelcome }
}
