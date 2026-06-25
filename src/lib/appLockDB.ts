// IndexedDB dédiée au verrou applicatif (D6). Séparée de `physio_app` et
// `physio_vocal`, et VOLONTAIREMENT absente de purgeLocalPHI : l'enrôlement du
// verrou (vérificateur de mot de passe + passkey) n'est pas une donnée de santé
// et doit survivre à la déconnexion — sinon le verrou se désactiverait à chaque
// signOut (purge des PHI). Voir src/lib/localDataPurge.ts.

import type { LockConfig } from './appLock'

const DB_NAME = 'physio_lock'
const DB_VERSION = 1
const STORE = 'config'

let dbPromise: Promise<IDBDatabase> | null = null

function openLockDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'userId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB bloquée (fermez les autres onglets)'))
  })
  return dbPromise
}

export async function getLockConfig(userId: string): Promise<LockConfig | undefined> {
  const db = await openLockDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(userId)
    req.onsuccess = () => resolve(req.result as LockConfig | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function saveLockConfig(config: LockConfig): Promise<void> {
  const db = await openLockDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(config)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteLockConfig(userId: string): Promise<void> {
  const db = await openLockDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(userId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function closeLockDB(): Promise<void> {
  if (!dbPromise) return
  try {
    ;(await dbPromise).close()
  } catch {
    /* ignore */
  }
  dbPromise = null
}
