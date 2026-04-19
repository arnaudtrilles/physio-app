import { useState, useEffect, useRef, useCallback } from 'react'

const DB_NAME = 'physio_app'
const STORE_NAME = 'kv'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Like useLocalStorage but backed by IndexedDB (no size limit).
 * On first load, migrates existing localStorage data to IndexedDB and cleans up localStorage.
 * Returns [value, setValue, isLoaded].
 */
export function useIndexedDB<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  // Sync init: try localStorage first (for migration / instant first paint)
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) return JSON.parse(item) as T
    } catch { /* ignore */ }
    return initialValue
  })

  const [loaded, setLoaded] = useState(false)

  // Monotonic counter: incremented on every setValue call.
  // The IDB load captures this BEFORE awaiting; if it changed, the load is stale.
  const writeVersion = useRef(0)

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    writeVersion.current += 1
    setStoredValue(prev => {
      const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
      // Write to IDB immediately — don't rely on a separate effect
      idbSet(key, next).catch(e =>
        console.error(`[IDB] write error for ${key}:`, e)
      )
      return next
    })
  }, [key])

  // Async init: load from IndexedDB
  useEffect(() => {
    let cancelled = false
    const vBefore = writeVersion.current
    ;(async () => {
      try {
        const idbValue = await idbGet<T>(key)

        // If setValue was called while we were loading, our data is stale — bail out
        if (cancelled || writeVersion.current !== vBefore) {
          if (!cancelled) setLoaded(true)
          return
        }

        if (idbValue !== undefined) {
          setStoredValue(idbValue)
        } else {
          // No IndexedDB data — migrate from localStorage
          let migrationValue: T = initialValue
          try {
            const item = window.localStorage.getItem(key)
            if (item) migrationValue = JSON.parse(item) as T
          } catch { /* ignore */ }
          // Only write migration if no setValue happened in the meantime
          if (writeVersion.current === vBefore) {
            await idbSet(key, migrationValue)
            if (!cancelled && writeVersion.current === vBefore) {
              setStoredValue(migrationValue)
            }
          }
        }
        // Clean up localStorage to free space
        try { window.localStorage.removeItem(key) } catch { /* ignore */ }
      } catch (e) {
        console.error(`[IDB] load error for ${key}:`, e)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [key])

  return [storedValue, setValue, loaded]
}
