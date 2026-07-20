import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon } from './Icon'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { ConfirmDialog } from './ConfirmDialog'
import { BookmarkImport } from './BookmarkImport'
import type { SyncGridSettings, SyncGridGroup, AIProvider } from '../types'
import { OPENAI_MODELS, GEMINI_MODELS } from '../types'
import type { Messages } from '../i18n'
import type { Locale } from '../i18n'
import { exportData, downloadExport, readFileAsText, validateImport, importToBookmarks, importKanban } from '../utils/dataTransfer'
import {
  isSyncSupported,
  pickSyncFolder,
  getSyncHandle,
  syncToFolder,
  disconnectSync,
  getSyncFolderName,
  testSyncConnection,
} from '../utils/localSync'
import { testAiConnection } from '../utils/ai'
import { hasTitleFetchPermission, requestTitleFetchPermission, hasAiPermission, requestAiPermission } from '../utils/permissions'
import { WALLPAPER_PRESETS, fileToCompressedDataUrl, saveWallpaperImage, clearWallpaperImage } from '../utils/wallpaper'
import { ensureGitHubPermission } from '../utils/permissions'
import { testGitHubConnection, clearGitHubCache, saveGitHubCache, loadGitHubCache } from '../utils/github'

interface Props {
  settings: SyncGridSettings
  groups: SyncGridGroup[]
  t: Messages
  onUpdateSettings: (patch: Partial<SyncGridSettings>) => void
  onClose: () => void
  onRefresh: () => void
  onStartTour: () => void
}

export function SettingsPanel({ settings, groups, t, onUpdateSettings, onClose, onRefresh, onStartTour }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const aiTestTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const syncTestTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const trapRef = useFocusTrap<HTMLDivElement>()
  const [syncFolderName, setSyncFolderName] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const wallpaperFileRef = useRef<HTMLInputElement>(null)
  const [wallpaperError, setWallpaperError] = useState(false)
  const [ghTestStatus, setGhTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [ghLogin, setGhLogin] = useState('')
  const [ghError, setGhError] = useState('')
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [aiTestError, setAiTestError] = useState('')
  const [syncTestStatus, setSyncTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [confirmState, setConfirmState] = useState<{
    message: string
    onConfirm: () => void
  } | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [ogpPermGranted, setOgpPermGranted] = useState(false)

  useEffect(() => {
    getSyncFolderName().then(setSyncFolderName)
    hasTitleFetchPermission().then(setOgpPermGranted)
    return () => {
      clearTimeout(aiTestTimerRef.current)
      clearTimeout(syncTestTimerRef.current)
    }
  }, [])

  // --- Export ---
  const handleGitHubTest = useCallback(async () => {
    setGhTestStatus('testing')
    setGhError('')
    const granted = await ensureGitHubPermission()
    if (!granted) {
      setGhTestStatus('error')
      setGhError('permission denied')
      return
    }
    const result = await testGitHubConnection(settings.github.token)
    if (result.ok) {
      setGhTestStatus('ok')
      setGhLogin(result.login ?? '')
      // login をキャッシュに反映（ビューのヘッダ表示用）
      const cache = await loadGitHubCache()
      await saveGitHubCache({ login: result.login ?? '', items: cache?.items ?? [], fetchedAt: cache?.fetchedAt ?? 0, etag: cache?.etag })
    } else {
      setGhTestStatus('error')
      setGhError(result.error ?? '')
    }
  }, [settings.github.token])

  const handleGitHubDisconnect = useCallback(async () => {
    await clearGitHubCache()
    setGhTestStatus('idle')
    setGhLogin('')
    onUpdateSettings({ github: { token: '' } })
  }, [onUpdateSettings])

  const handleWallpaperFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      setWallpaperError(false)
      try {
        const dataUrl = await fileToCompressedDataUrl(file)
        await saveWallpaperImage(dataUrl)
        onUpdateSettings({ wallpaper: { ...settings.wallpaper, type: 'image' } })
      } catch {
        setWallpaperError(true)
      }
    },
    [onUpdateSettings, settings.wallpaper],
  )

  const handleWallpaperReset = useCallback(async () => {
    await clearWallpaperImage()
    setWallpaperError(false)
    onUpdateSettings({ wallpaper: { ...settings.wallpaper, type: 'default' } })
  }, [onUpdateSettings, settings.wallpaper])

  const handleExport = useCallback(async () => {
    const data = await exportData(groups)
    downloadExport(data)
  }, [groups])

  // --- Import ---
  const handleImportClick = () => fileRef.current?.click()

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      e.target.value = ''

      setConfirmState({
        message: t.importConfirm,
        onConfirm: async () => {
          setConfirmState(null)
          try {
            const text = await readFileAsText(file)
            const validated = await validateImport(text)
            if (!validated) {
              setImportStatus('error')
              return
            }
            await importToBookmarks(validated.data)
            await importKanban(validated.kanban)
            setImportStatus('success')
            setTimeout(() => location.reload(), 1500)
          } catch {
            setImportStatus('error')
          }
        },
      })
    },
    [t],
  )

  // --- Sync ---
  const handlePickFolder = useCallback(async () => {
    const handle = await pickSyncFolder()
    if (handle) {
      setSyncFolderName(handle.name)
      setSyncStatus('syncing')
      const result = await syncToFolder(groups, handle)
      if (result.success) {
        onUpdateSettings({ lastSyncedAt: result.syncedAt })
        setSyncStatus('done')
      } else {
        setSyncStatus('error')
      }
      setTimeout(() => setSyncStatus('idle'), 2000)
    }
  }, [groups, onUpdateSettings])

  const handleSyncNow = useCallback(async () => {
    setSyncStatus('syncing')
    const handle = await getSyncHandle()
    if (!handle) {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 2000)
      return
    }
    const result = await syncToFolder(groups, handle)
    if (result.success) {
      onUpdateSettings({ lastSyncedAt: result.syncedAt })
      setSyncStatus('done')
    } else {
      setSyncStatus('error')
    }
    setTimeout(() => setSyncStatus('idle'), 2000)
  }, [groups, onUpdateSettings])

  const handleDisconnect = useCallback(async () => {
    await disconnectSync()
    setSyncFolderName(null)
    onUpdateSettings({ lastSyncedAt: '' })
  }, [onUpdateSettings])

  // --- AI Connection Test ---
  const handleAiTest = useCallback(async () => {
    setAiTestStatus('testing')
    setAiTestError('')
    // AIホスト権限を確保（未付与ならこのユーザージェスチャー中にリクエスト）
    if (!(await hasAiPermission(settings.ai.provider))) {
      const granted = await requestAiPermission(settings.ai.provider)
      if (!granted) {
        setAiTestStatus('error')
        setAiTestError(t.aiPermissionDenied)
        clearTimeout(aiTestTimerRef.current)
        aiTestTimerRef.current = setTimeout(() => setAiTestStatus('idle'), 4000)
        return
      }
    }
    const result = await testAiConnection(settings.ai)
    if (result.ok) {
      setAiTestStatus('ok')
    } else {
      setAiTestStatus('error')
      setAiTestError(result.error ?? '')
    }
    clearTimeout(aiTestTimerRef.current)
    aiTestTimerRef.current = setTimeout(() => setAiTestStatus('idle'), 4000)
  }, [settings.ai, t])

  // --- Sync Connection Test ---
  const handleSyncTest = useCallback(async () => {
    setSyncTestStatus('testing')
    const result = await testSyncConnection()
    setSyncTestStatus(result.ok ? 'ok' : 'error')
    clearTimeout(syncTestTimerRef.current)
    syncTestTimerRef.current = setTimeout(() => setSyncTestStatus('idle'), 4000)
  }, [])

  const formatDate = (iso: string) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString(settings.locale === 'ja' ? 'ja-JP' : 'en-US')
    } catch {
      return iso
    }
  }

  return (
    <>
      <div className="sg-modal-overlay" onClick={onClose}>
        <div
          ref={trapRef}
          className="sg-modal sg-modal--wide"
          role="dialog"
          aria-modal="true"
          aria-label={t.settingsTitle}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose()
          }}
        >
          <div className="sg-modal__header">
            <span className="sg-modal__title">{t.settingsTitle}</span>
            <button className="sg-modal__close" onClick={onClose} aria-label={t.close}>
              <Icon name="close" size={12} />
            </button>
          </div>

          <div className="sg-modal__body sg-settings">
            {/* Language */}
            <div className="sg-settings__section">
              <h3 className="sg-settings__label">{t.language}</h3>
              <div className="sg-settings__row">
                <select
                  className="sg-input sg-input--sm"
                  value={settings.locale}
                  onChange={(e) => onUpdateSettings({ locale: e.target.value as Locale })}
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>

            {/* Theme */}
            <div className="sg-settings__section">
              <h3 className="sg-settings__label">{t.theme}</h3>
              <div className="sg-settings__row sg-settings__row--btns">
                {(['light', 'dark', 'system'] as const).map((th) => (
                  <button
                    key={th}
                    className={`sg-btn sg-btn--sm ${settings.theme === th ? 'sg-btn--primary' : 'sg-btn--ghost'}`}
                    onClick={() => onUpdateSettings({ theme: th })}
                  >
                    {th === 'light' ? t.themeLight : th === 'dark' ? t.themeDark : t.themeSystem}
                  </button>
                ))}
              </div>
            </div>

            {/* Wallpaper */}
            <div className="sg-settings__section">
              <h3 className="sg-settings__label">{t.wallpaper}</h3>
              <div className="sg-settings__row sg-settings__row--btns">
                <button
                  className={`sg-btn sg-btn--sm ${settings.wallpaper.type === 'default' ? 'sg-btn--primary' : 'sg-btn--ghost'}`}
                  onClick={handleWallpaperReset}
                >
                  {t.wallpaperDefault}
                </button>
                <button
                  className={`sg-btn sg-btn--sm ${settings.wallpaper.type === 'image' ? 'sg-btn--primary' : 'sg-btn--ghost'}`}
                  onClick={() => wallpaperFileRef.current?.click()}
                >
                  <Icon name="upload" size={12} /> {t.wallpaperUpload}
                </button>
              </div>
              <div className="sg-wallpaper-swatches" role="radiogroup" aria-label={t.wallpaperPreset}>
                {WALLPAPER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className={`sg-wallpaper-swatch${settings.wallpaper.type === 'preset' && settings.wallpaper.presetId === p.id ? ' sg-wallpaper-swatch--active' : ''}`}
                    style={{ '--swatch-bg': p.css } as React.CSSProperties}
                    onClick={() => onUpdateSettings({ wallpaper: { ...settings.wallpaper, type: 'preset', presetId: p.id } })}
                    role="radio"
                    aria-checked={settings.wallpaper.type === 'preset' && settings.wallpaper.presetId === p.id}
                    aria-label={p.id}
                    title={p.id}
                  />
                ))}
                <label className="sg-wallpaper-swatch sg-wallpaper-swatch--color" title={t.wallpaperColor}>
                  <input
                    type="color"
                    value={settings.wallpaper.color}
                    onChange={(e) => onUpdateSettings({ wallpaper: { ...settings.wallpaper, type: 'color', color: e.target.value } })}
                    aria-label={t.wallpaperColor}
                  />
                </label>
              </div>
              {settings.wallpaper.type !== 'default' && (
                <div className="sg-settings__row">
                  <label className="sg-settings__desc" htmlFor="sg-wallpaper-dim">{t.wallpaperDim}</label>
                  <input
                    id="sg-wallpaper-dim"
                    type="range"
                    min="0"
                    max="0.6"
                    step="0.05"
                    value={settings.wallpaper.dim}
                    onChange={(e) => onUpdateSettings({ wallpaper: { ...settings.wallpaper, dim: Number(e.target.value) } })}
                  />
                </div>
              )}
              {wallpaperError && (
                <p className="sg-settings__status sg-settings__status--err"><Icon name="x-circle" size={14} /> {t.wallpaperTooLarge}</p>
              )}
              <input
                ref={wallpaperFileRef}
                type="file"
                accept="image/*"
                className="sg-sr-only"
                onChange={handleWallpaperFile}
                tabIndex={-1}
              />
            </div>

            <hr className="sg-settings__divider" />

            {/* Data export / import */}
            <div className="sg-settings__section">
              <h3 className="sg-settings__label">{t.dataManagement}</h3>
              <div className="sg-settings__row sg-settings__row--btns">
                <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={handleExport}>
                  <Icon name="upload" size={14} /> {t.exportData}
                </button>
                <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={handleImportClick}>
                  <Icon name="download" size={14} /> {t.importData}
                </button>
              </div>
              <button
                className="sg-btn sg-btn--sm sg-btn--ghost"
                onClick={() => setShowImport(true)}
              >
                <Icon name="folder-open" size={14} /> {t.importChrome}
              </button>
              <p className="sg-settings__desc">{t.exportDesc}</p>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="sg-sr-only"
                onChange={handleFileChange}
                tabIndex={-1}
              />
              {importStatus === 'success' && (
                <p className="sg-settings__status sg-settings__status--ok"><Icon name="check-circle" size={14} /> {t.importSuccess}</p>
              )}
              {importStatus === 'error' && (
                <p className="sg-settings__status sg-settings__status--err"><Icon name="x-circle" size={14} /> {t.importError}</p>
              )}
            </div>

            <hr className="sg-settings__divider" />

            {/* Kanban sync */}
            <div className="sg-settings__section">
              <h3 className="sg-settings__label">{t.localSync}</h3>
              <p className="sg-settings__desc sg-preline">{t.syncDesc}</p>

              {isSyncSupported() ? (
                syncFolderName ? (
                  <div className="sg-settings__sync-info">
                    <div className="sg-settings__sync-row">
                      <span className="sg-settings__sync-badge"><Icon name="check-circle" size={14} /> {t.syncActive}</span>
                      <span className="sg-settings__sync-folder"><Icon name="folder" size={14} /> {syncFolderName}</span>
                    </div>
                    <p className="sg-settings__desc">{t.lastSynced(formatDate(settings.lastSyncedAt))}</p>
                    <div className="sg-settings__row sg-settings__row--btns">
                      <button
                        className="sg-btn sg-btn--sm sg-btn--primary"
                        onClick={handleSyncNow}
                        disabled={syncStatus === 'syncing'}
                      >
                        {syncStatus === 'syncing' ? <Icon name="spinner" size={14} /> : <Icon name="refresh" size={14} />} {t.syncNow}
                      </button>
                      <button
                        className="sg-btn sg-btn--sm sg-btn--ghost"
                        onClick={handleSyncTest}
                        disabled={syncTestStatus === 'testing'}
                      >
                        {syncTestStatus === 'testing' ? <Icon name="spinner" size={14} /> : <Icon name="link" size={14} />} {t.connectionTest}
                      </button>
                      <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={handleDisconnect}>
                        {t.disconnectSync}
                      </button>
                    </div>
                    {syncStatus === 'done' && <p className="sg-settings__status sg-settings__status--ok"><Icon name="check-circle" size={14} /> Synced!</p>}
                    {syncStatus === 'error' && (
                      <p className="sg-settings__status sg-settings__status--err"><Icon name="x-circle" size={14} /> Sync failed</p>
                    )}
                    {syncTestStatus === 'ok' && (
                      <p className="sg-settings__status sg-settings__status--ok"><Icon name="check-circle" size={14} /> {t.syncTestOk}</p>
                    )}
                    {syncTestStatus === 'error' && (
                      <p className="sg-settings__status sg-settings__status--err"><Icon name="x-circle" size={14} /> {t.syncTestFailed}</p>
                    )}
                  </div>
                ) : (
                  <button className="sg-btn sg-btn--sm sg-btn--primary" onClick={handlePickFolder}>
                    <Icon name="folder" size={14} /> {t.selectFolder}
                  </button>
                )
              ) : (
                <p className="sg-settings__desc sg-settings__desc--dim">
                  <Icon name="warning" size={14} /> File System Access API is not supported in this browser.
                </p>
              )}
            </div>

            <hr className="sg-settings__divider" />

            {/* AI Settings */}
            <div className="sg-settings__section">
              <h3 className="sg-settings__label"><Icon name="bot" size={14} /> {t.aiSettings}</h3>
              <p className="sg-settings__desc">{t.aiDesc}</p>
              <p className="sg-settings__desc">{t.aiFeatureList}</p>

              {/* Provider */}
              <label className="sg-label">{t.aiProvider}</label>
              <div className="sg-settings__row sg-settings__row--btns">
                {(['none', 'openai', 'gemini'] as const).map((p) => (
                  <button
                    key={p}
                    className={`sg-btn sg-btn--sm ${settings.ai.provider === p ? 'sg-btn--primary' : 'sg-btn--ghost'}`}
                    onClick={() => onUpdateSettings({ ai: { ...settings.ai, provider: p as AIProvider } })}
                  >
                    {p === 'none' ? t.aiProviderNone : p === 'openai' ? t.aiProviderOpenai : t.aiProviderGemini}
                  </button>
                ))}
              </div>

              {/* OpenAI Settings */}
              {settings.ai.provider === 'openai' && (
                <>
                  <label className="sg-label">{t.aiApiKey}</label>
                  <input
                    type="password"
                    className="sg-input"
                    placeholder={t.aiApiKeyPlaceholder}
                    value={settings.ai.openaiApiKey}
                    onChange={(e) => onUpdateSettings({ ai: { ...settings.ai, openaiApiKey: e.target.value } })}
                    autoComplete="off"
                  />
                  <label className="sg-label">{t.aiModel}</label>
                  <select
                    className="sg-input sg-input--sm"
                    value={settings.ai.openaiModel}
                    onChange={(e) => onUpdateSettings({ ai: { ...settings.ai, openaiModel: e.target.value } })}
                  >
                    {OPENAI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <div className="sg-settings__row sg-settings__row--mt">
                    <button
                      className="sg-btn sg-btn--sm sg-btn--ghost"
                      onClick={handleAiTest}
                      disabled={aiTestStatus === 'testing' || !settings.ai.openaiApiKey}
                    >
                      {aiTestStatus === 'testing' ? <Icon name="spinner" size={14} /> : <Icon name="link" size={14} />}{' '}
                      {aiTestStatus === 'testing' ? t.testing : t.connectionTest}
                    </button>
                  </div>
                  {aiTestStatus === 'ok' && (
                    <p className="sg-settings__status sg-settings__status--ok"><Icon name="check-circle" size={14} /> {t.connectionOk}</p>
                  )}
                  {aiTestStatus === 'error' && (
                    <p className="sg-settings__status sg-settings__status--err">
                      <Icon name="x-circle" size={14} /> {t.connectionFailed}
                      {aiTestError ? `: ${aiTestError}` : ''}
                    </p>
                  )}
                </>
              )}

              {/* Gemini Settings */}
              {settings.ai.provider === 'gemini' && (
                <>
                  <label className="sg-label">{t.aiApiKey}</label>
                  <input
                    type="password"
                    className="sg-input"
                    placeholder="AIza..."
                    value={settings.ai.geminiApiKey}
                    onChange={(e) => onUpdateSettings({ ai: { ...settings.ai, geminiApiKey: e.target.value } })}
                    autoComplete="off"
                  />
                  <label className="sg-label">{t.aiModel}</label>
                  <select
                    className="sg-input sg-input--sm"
                    value={settings.ai.geminiModel}
                    onChange={(e) => onUpdateSettings({ ai: { ...settings.ai, geminiModel: e.target.value } })}
                  >
                    {GEMINI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <div className="sg-settings__row sg-settings__row--mt">
                    <button
                      className="sg-btn sg-btn--sm sg-btn--ghost"
                      onClick={handleAiTest}
                      disabled={aiTestStatus === 'testing' || !settings.ai.geminiApiKey}
                    >
                      {aiTestStatus === 'testing' ? <Icon name="spinner" size={14} /> : <Icon name="link" size={14} />}{' '}
                      {aiTestStatus === 'testing' ? t.testing : t.connectionTest}
                    </button>
                  </div>
                  {aiTestStatus === 'ok' && (
                    <p className="sg-settings__status sg-settings__status--ok"><Icon name="check-circle" size={14} /> {t.connectionOk}</p>
                  )}
                  {aiTestStatus === 'error' && (
                    <p className="sg-settings__status sg-settings__status--err">
                      <Icon name="x-circle" size={14} /> {t.connectionFailed}
                      {aiTestError ? `: ${aiTestError}` : ''}
                    </p>
                  )}
                </>
              )}
            </div>

            <hr className="sg-settings__divider" />

            {/* GitHub Integration */}
            <div className="sg-settings__section">
              <h3 className="sg-settings__label"><Icon name="github" size={14} /> {t.githubSettings}</h3>
              <p className="sg-settings__desc">{t.githubDesc}</p>
              <div className="sg-settings__row">
                <input
                  type="password"
                  className="sg-input sg-input--sm"
                  placeholder={t.githubTokenPlaceholder}
                  value={settings.github.token}
                  onChange={(e) => { setGhTestStatus('idle'); onUpdateSettings({ github: { token: e.target.value.trim() } }) }}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={t.githubToken}
                />
              </div>
              <div className="sg-settings__row sg-settings__row--btns">
                <button
                  className="sg-btn sg-btn--sm sg-btn--ghost"
                  onClick={handleGitHubTest}
                  disabled={!settings.github.token || ghTestStatus === 'testing'}
                >
                  {ghTestStatus === 'testing' ? <Icon name="spinner" size={12} className="sg-icon--spin" /> : <Icon name="check-circle" size={12} />} {t.githubConnectTest}
                </button>
                {settings.github.token && (
                  <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={handleGitHubDisconnect}>
                    <Icon name="close" size={12} /> {t.githubDisconnect}
                  </button>
                )}
              </div>
              {ghTestStatus === 'ok' && (
                <p className="sg-settings__status sg-settings__status--ok"><Icon name="check-circle" size={14} /> {t.githubConnected(ghLogin)}</p>
              )}
              {ghTestStatus === 'error' && (
                <p className="sg-settings__status sg-settings__status--err"><Icon name="x-circle" size={14} /> {t.connectionFailed}{ghError ? `: ${ghError}` : ''}</p>
              )}
            </div>

            <hr className="sg-settings__divider" />

            {/* OGP Permission */}
            <div className="sg-settings__section">
              <h3 className="sg-settings__label"><Icon name="link" size={14} /> {t.ogpPermission}</h3>
              <p className="sg-settings__desc">{t.ogpPermissionDesc}</p>
              <div className="sg-settings__row sg-settings__row--btns">
                {ogpPermGranted ? (
                  <span className="sg-settings__status sg-settings__status--ok">
                    <Icon name="check-circle" size={14} /> {t.ogpPermissionGranted}
                  </span>
                ) : (
                  <button
                    className="sg-btn sg-btn--sm sg-btn--primary"
                    onClick={async () => {
                      const granted = await requestTitleFetchPermission()
                      setOgpPermGranted(granted)
                    }}
                  >
                    <Icon name="lock" size={14} /> {t.ogpPermissionGrant}
                  </button>
                )}
                <button
                  className="sg-btn sg-btn--sm sg-btn--ghost"
                  onClick={async () => {
                    // OGPキャッシュをクリアして再取得を促す
                    const { loadAllMeta, saveMeta } = await import('../utils/storage')
                    const meta = await loadAllMeta()
                    for (const [id, m] of Object.entries(meta)) {
                      if (m.ogp) {
                        await saveMeta(id, { ...m, ogp: undefined })
                      }
                    }
                    onRefresh()
                  }}
                >
                  <Icon name="refresh" size={14} /> {t.ogpPermissionRefresh}
                </button>
              </div>
            </div>

            <hr className="sg-settings__divider" />

            {/* Onboarding Tour */}
            <div className="sg-settings__section">
              <h3 className="sg-settings__label">{t.startTour}</h3>
              <p className="sg-settings__desc">{t.welcomeDesc}</p>
              <button
                className="sg-btn sg-btn--sm sg-btn--ghost"
                onClick={() => {
                  chrome.storage.local.remove('syncgrid_onboarded').then(() => {
                    onStartTour()
                    onClose()
                  })
                }}
              >
                <Icon name="help-circle" size={14} /> {t.restartTour}
              </button>
            </div>

          </div>

          <div className="sg-modal__footer">
            <div className="sg-spacer" />
            <button className="sg-btn sg-btn--ghost" onClick={onClose}>
              {t.close}
            </button>
          </div>
        </div>
      </div>

      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
          confirmLabel={t.confirmOk}
          t={t}
        />
      )}
      {showImport && (
        <BookmarkImport
          onDone={onRefresh}
          onClose={() => setShowImport(false)}
          t={t}
        />
      )}
    </>
  )
}
