/**
 * Local Folder Sync — File System Access API
 *
 * Writes SyncGrid backup JSON to a user-selected local folder.
 * The folder is typically synced via cloud drives (Google Drive, OneDrive, iCloud, Dropbox).
 *
 * Security:
 * - Uses File System Access API — requires explicit user permission per session
 * - Directory handle is stored in IndexedDB (persisted across sessions)
 * - Only writes to the user-chosen directory; never reads other files
 * - File name is fixed: syncgrid-sync.json
 */

import type { SyncGridGroup, SyncGridExport, KanbanState } from '../types'
import { exportData } from './dataTransfer'
import { saveKanban } from './kanban'

const SYNC_FILENAME = 'syncgrid-sync.json'
const IDB_NAME = 'syncgrid-fs'
const IDB_STORE = 'handles'
const IDB_KEY = 'syncDir'

// ===== IndexedDB for persisting directory handle =====

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveDirHandle(handle: FileSystemDirectoryHandle | null): Promise<void> {
  const db = await openIDB()
  const tx = db.transaction(IDB_STORE, 'readwrite')
  const store = tx.objectStore(IDB_STORE)
  if (handle) {
    store.put(handle, IDB_KEY)
  } else {
    store.delete(IDB_KEY)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
    tx.onabort = () => {
      db.close()
      reject(tx.error ?? new Error('IDB transaction aborted'))
    }
  })
}

async function loadDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB()
    const tx = db.transaction(IDB_STORE, 'readonly')
    const store = tx.objectStore(IDB_STORE)
    const req = store.get(IDB_KEY)
    return new Promise((resolve) => {
      req.onsuccess = () => {
        db.close()
        resolve(req.result ?? null)
      }
      req.onerror = () => {
        db.close()
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

// ===== Public API =====

/** Check if File System Access API is supported */
export function isSyncSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/** Prompt user to pick a directory */
export async function pickSyncFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    })
    await saveDirHandle(handle)
    return handle
  } catch {
    // User cancelled or denied
    return null
  }
}

/** Get saved directory handle (may require re-permission) */
export async function getSyncHandle(requestIfNeeded = true): Promise<FileSystemDirectoryHandle | null> {
  const handle = await loadDirHandle()
  if (!handle) return null

  // Verify permission is still granted
  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' })
    if (perm === 'granted') return handle

    if (!requestIfNeeded) return null

    // Request permission again (requires user gesture)
    const req = await handle.requestPermission({ mode: 'readwrite' })
    return req === 'granted' ? handle : null
  } catch {
    return null
  }
}

/** Write sync file to the directory */
export async function syncToFolder(
  groups: SyncGridGroup[],
  handle?: FileSystemDirectoryHandle | null,
): Promise<{ success: boolean; syncedAt: string }> {
  // If no handle provided, attempt to get saved handle (but don't request permission if background sync)
  const dir = handle ?? (await getSyncHandle(!!handle))
  if (!dir) return { success: false, syncedAt: '' }

  try {
    const exportObj: SyncGridExport = await exportData(groups)
    const json = JSON.stringify(exportObj, null, 2)

    // Atomic write: write to temp file then move (rename)
    const tmpName = `${SYNC_FILENAME}.tmp`
    const tmpFile = await dir.getFileHandle(tmpName, { create: true })
    const writable = await tmpFile.createWritable()
    await writable.write(json)
    await writable.close()

    // Rename (move) tmp to final
    await tmpFile.move(SYNC_FILENAME)

    const syncedAt = new Date().toISOString()
    return { success: true, syncedAt }
  } catch (err) {
    console.error('[SyncGrid] Sync failed:', err)
    return { success: false, syncedAt: '' }
  }
}

/** Read kanban data from sync file (other device wrote it) */
export async function readKanbanFromSyncFolder(
  handle?: FileSystemDirectoryHandle | null,
): Promise<KanbanState | null> {
  const dir = handle ?? (await getSyncHandle(false))
  if (!dir) return null

  try {
    const fileHandle = await dir.getFileHandle(SYNC_FILENAME)
    const file = await fileHandle.getFile()
    const text = await file.text()
    const parsed = JSON.parse(text) as Partial<SyncGridExport>
    if (parsed.kanban?.items && Array.isArray(parsed.kanban.items)) {
      return parsed.kanban
    }
    return null
  } catch {
    return null
  }
}

/** Pull kanban from sync file and save locally */
export async function pullKanbanFromSync(): Promise<boolean> {
  const kanban = await readKanbanFromSyncFolder()
  if (!kanban || kanban.items.length === 0) return false
  await saveKanban(kanban)
  return true
}

/** Disconnect: clear saved handle */
export async function disconnectSync(): Promise<void> {
  await saveDirHandle(null)
}

/** Test sync folder connection: verify handle exists and is writable */
export async function testSyncConnection(): Promise<{ ok: boolean; folderName?: string; error?: string }> {
  try {
    const handle = await loadDirHandle()
    if (!handle) return { ok: false, error: 'No folder selected' }

    const perm = await handle.queryPermission({ mode: 'readwrite' })
    if (perm !== 'granted') {
      const req = await handle.requestPermission({ mode: 'readwrite' })
      if (req !== 'granted') return { ok: false, error: 'Permission denied' }
    }

    // Write and remove a test file to verify actual write access
    const testName = '.syncgrid-test'
    const testFile = await handle.getFileHandle(testName, { create: true })
    const writable = await testFile.createWritable()
    await writable.write('ok')
    await writable.close()
    try {
      await handle.removeEntry(testName)
    } catch {
      // Cleanup failed but write access was confirmed
    }

    return { ok: true, folderName: handle.name }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/** Get the folder name (for display) */
export async function getSyncFolderName(): Promise<string | null> {
  const handle = await loadDirHandle()
  return handle?.name ?? null
}
