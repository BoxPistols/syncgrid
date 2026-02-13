import { useState, useEffect, useRef, useCallback } from 'react'
import type { SyncGridSettings, SyncGridGroup, AIProvider } from '../types'
import { OPENAI_MODELS, GEMINI_MODELS } from '../types'
import type { Messages } from '../i18n'
import type { Locale } from '../i18n'
import {
  exportData, downloadExport,
  readFileAsText, validateImport, importToBookmarks,
} from '../utils/dataTransfer'
import {
  isSyncSupported, pickSyncFolder, getSyncHandle,
  syncToFolder, disconnectSync, getSyncFolderName,
} from '../utils/localSync'

interface Props {
  settings: SyncGridSettings
  groups: SyncGridGroup[]
  t: Messages
  onUpdateSettings: (patch: Partial<SyncGridSettings>) => void
  onClose: () => void
  onRefresh: () => void
}

export function SettingsPanel({ settings, groups, t, onUpdateSettings, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [syncFolderName, setSyncFolderName] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle')
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    getSyncFolderName().then(setSyncFolderName)
  }, [])

  // --- Export ---
  const handleExport = useCallback(async () => {
    const data = await exportData(groups)
    downloadExport(data)
  }, [groups])

  // --- Import ---
  const handleImportClick = () => fileRef.current?.click()

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!confirm(t.importConfirm)) return

    try {
      const text = await readFileAsText(file)
      const validated = await validateImport(text)
      if (!validated) {
        setImportStatus('error')
        return
      }
      await importToBookmarks(validated.data)
      setImportStatus('success')
      setTimeout(() => location.reload(), 1500)
    } catch {
      setImportStatus('error')
    }
  }, [t])

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

  const formatDate = (iso: string) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString(settings.locale === 'ja' ? 'ja-JP' : 'en-US')
    } catch { return iso }
  }

  return (
    <div className="sg-modal-overlay" onClick={onClose}>
      <div className="sg-modal sg-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="sg-modal__header">
          <span className="sg-modal__title">{t.settingsTitle}</span>
          <button className="sg-modal__close" onClick={onClose}>✕</button>
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

          <hr className="sg-settings__divider" />

          {/* Data export / import */}
          <div className="sg-settings__section">
            <h3 className="sg-settings__label">{t.dataManagement}</h3>
            <div className="sg-settings__row sg-settings__row--btns">
              <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={handleExport}>
                📤 {t.exportData}
              </button>
              <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={handleImportClick}>
                📥 {t.importData}
              </button>
            </div>
            <p className="sg-settings__desc">{t.exportDesc}</p>
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
            {importStatus === 'success' && <p className="sg-settings__status sg-settings__status--ok">✅ {t.importSuccess}</p>}
            {importStatus === 'error' && <p className="sg-settings__status sg-settings__status--err">❌ {t.importError}</p>}
          </div>

          <hr className="sg-settings__divider" />

          {/* Local folder sync */}
          <div className="sg-settings__section">
            <h3 className="sg-settings__label">{t.localSync}</h3>
            <p className="sg-settings__desc">{t.syncDesc}</p>

            {isSyncSupported() ? (
              syncFolderName ? (
                <div className="sg-settings__sync-info">
                  <div className="sg-settings__sync-row">
                    <span className="sg-settings__sync-badge">✅ {t.syncActive}</span>
                    <span className="sg-settings__sync-folder">📁 {syncFolderName}</span>
                  </div>
                  <p className="sg-settings__desc">
                    {t.lastSynced(formatDate(settings.lastSyncedAt))}
                  </p>
                  <div className="sg-settings__row sg-settings__row--btns">
                    <button
                      className="sg-btn sg-btn--sm sg-btn--primary"
                      onClick={handleSyncNow}
                      disabled={syncStatus === 'syncing'}
                    >
                      {syncStatus === 'syncing' ? '⏳' : '🔄'} {t.syncNow}
                    </button>
                    <button className="sg-btn sg-btn--sm sg-btn--ghost" onClick={handleDisconnect}>
                      {t.disconnectSync}
                    </button>
                  </div>
                  {syncStatus === 'done' && <p className="sg-settings__status sg-settings__status--ok">✅ Synced!</p>}
                  {syncStatus === 'error' && <p className="sg-settings__status sg-settings__status--err">❌ Sync failed</p>}
                </div>
              ) : (
                <button className="sg-btn sg-btn--sm sg-btn--primary" onClick={handlePickFolder}>
                  📁 {t.selectFolder}
                </button>
              )
            ) : (
              <p className="sg-settings__desc" style={{ opacity: 0.6 }}>
                ⚠️ File System Access API is not supported in this browser.
              </p>
            )}
          </div>

          <hr className="sg-settings__divider" />

          {/* AI Settings */}
          <div className="sg-settings__section">
            <h3 className="sg-settings__label">🤖 {t.aiSettings}</h3>
            <p className="sg-settings__desc">{t.aiDesc}</p>

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
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
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
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          <hr className="sg-settings__divider" />

          {/* Security */}
          <div className="sg-settings__section">
            <h3 className="sg-settings__label">🔒 {t.security}</h3>
            <p className="sg-settings__desc sg-settings__desc--pre">{t.securityDesc}</p>
          </div>
        </div>

        <div className="sg-modal__footer">
          <div style={{ flex: 1 }} />
          <button className="sg-btn sg-btn--ghost" onClick={onClose}>{t.close}</button>
        </div>
      </div>
    </div>
  )
}
