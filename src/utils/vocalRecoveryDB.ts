// IndexedDB dédié aux enregistrements vocaux — séparé de la base "physio_app"
// pour ne jamais perdre l'audio même si la transcription/Claude échoue.
//
// Le flow d'écriture est progressif :
//   1. recording-stopped → on persiste le blob audio (status='recorded')
//   2. transcription OK   → on ajoute la transcription   (status='transcribed')
//   3. claude OK          → on ajoute le report          (status='completed')
//   4. au mount, le composant cherche les status != 'completed' pour proposer une reprise.

import type { NarrativeReport } from '../types'

const DB_NAME = 'physio_vocal'
const DB_VERSION = 2
const STORE = 'recoveries'

// patientKey assigné aux recoveries pré-v2 qui n'avaient pas de propriétaire.
// Ces recordings restent dans l'IDB (au cas où l'user voudrait les exporter
// manuellement) mais ne ressortent jamais via listIncompleteRecoveries — sinon
// ils polluent les bilans des patients suivants (bug cross-patient v1).
const LEGACY_PATIENT_KEY = '__legacy__'

export type VocalRecoveryStatus = 'recorded' | 'transcribed' | 'completed' | 'error'
export type VocalContext = 'dictee' | 'seance'

export interface VocalChunk {
  index: number
  // Audio brut. Optionnel : on le drop dès que la transcription complète est
  // consolidée pour libérer l'espace IDB (un bilan de 45 min = ~10 Mo d'audio).
  blob?: Blob
  transcription?: string
  durationSec?: number
  sizeBytes: number
}

export interface VocalRecovery {
  id: string
  // Patient propriétaire — empêche qu'un recovery orphelin du patient A ressorte
  // sur le bilan du patient B. Ajouté en v2.
  patientKey: string
  zone: string
  context: VocalContext
  createdAt: string
  updatedAt: string
  status: VocalRecoveryStatus
  chunks: VocalChunk[]
  fullTranscription?: string
  report?: NarrativeReport
  errorMsg?: string
  totalDurationSec: number
  totalSizeBytes: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openVocalDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (event) => {
      const db = req.result
      const tx = req.transaction
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
        store.createIndex('patientKey', 'patientKey', { unique: false })
      } else if (tx) {
        const store = tx.objectStore(STORE)
        // v1 → v2 : ajout de l'index patientKey + migration des anciens records
        // qui n'ont pas de patientKey (les marquer LEGACY pour qu'ils ne ressortent
        // sur aucun patient).
        const oldVersion = event.oldVersion
        if (oldVersion < 2) {
          if (!store.indexNames.contains('patientKey')) {
            store.createIndex('patientKey', 'patientKey', { unique: false })
          }
          const cursorReq = store.openCursor()
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result
            if (!cursor) return
            const rec = cursor.value as VocalRecovery
            if (!rec.patientKey) {
              rec.patientKey = LEGACY_PATIENT_KEY
              cursor.update(rec)
            }
            cursor.continue()
          }
        }
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB blocked — close other tabs'))
  })
  return dbPromise
}

/**
 * Ferme la connexion ouverte et réinitialise le singleton — préalable à une
 * suppression de base (deleteDatabase reste bloqué tant qu'une connexion est
 * ouverte). Utilisé par la purge des données de santé à la déconnexion.
 */
export async function closeVocalDB(): Promise<void> {
  if (!dbPromise) return
  try { (await dbPromise).close() } catch { /* ignore */ }
  dbPromise = null
}

/** Supprime entièrement la base `physio_vocal` (audio + transcriptions). */
export function deleteVocalDB(): Promise<void> {
  dbPromise = null
  return new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

export async function saveRecovery(rec: VocalRecovery): Promise<void> {
  const db = await openVocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(rec)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getRecovery(id: string): Promise<VocalRecovery | undefined> {
  const db = await openVocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as VocalRecovery | undefined)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Récupère les recoveries incomplets pour UN patient donné.
 * Filtre côté DB par patientKey, exclut les status='completed' et les records
 * legacy (pré-v2) qui n'ont pas de propriétaire identifiable.
 */
export async function listIncompleteRecoveries(patientKey: string): Promise<VocalRecovery[]> {
  if (!patientKey || patientKey === LEGACY_PATIENT_KEY) return []
  const db = await openVocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const idx = store.index('patientKey')
    const req = idx.getAll(IDBKeyRange.only(patientKey))
    req.onsuccess = () => {
      const all = (req.result as VocalRecovery[]) || []
      resolve(all.filter(r => r.status !== 'completed').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
    }
    req.onerror = () => reject(req.error)
  })
}

export async function deleteRecovery(id: string): Promise<void> {
  const db = await openVocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteCompletedRecoveries(): Promise<number> {
  const db = await openVocalDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    let count = 0
    req.onsuccess = () => {
      const all = (req.result as VocalRecovery[]) || []
      for (const r of all) {
        if (r.status === 'completed') {
          store.delete(r.id)
          count++
        }
      }
    }
    tx.oncomplete = () => resolve(count)
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Construit un nouvel id unique pour un recovery.
 */
export function newRecoveryId(): string {
  return `vrec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Concatène toutes les transcriptions des chunks dans l'ordre.
 */
export function concatChunkTranscriptions(rec: VocalRecovery): string {
  return rec.chunks
    .slice()
    .sort((a, b) => a.index - b.index)
    .map(c => c.transcription || '')
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Reconstruit un blob audio unique en concaténant tous les chunks dans l'ordre.
 * NB : chaque chunk WebM est un fichier autonome — le blob agrégé n'est pas lisible
 * par tous les players, mais reste valide pour téléchargement.
 * Renvoie un Blob vide si tous les chunks ont été nettoyés post-transcription.
 */
export function concatChunkBlobs(rec: VocalRecovery): Blob {
  const parts = rec.chunks
    .slice()
    .sort((a, b) => a.index - b.index)
    .map(c => c.blob)
    .filter((b): b is Blob => !!b)
  const mimeType = parts[0]?.type || 'audio/webm'
  return new Blob(parts, { type: mimeType })
}

/**
 * Indique s'il reste de l'audio brut dans le recovery (avant nettoyage post-transcription).
 */
export function recoveryHasAudio(rec: VocalRecovery): boolean {
  return rec.chunks.some(c => !!c.blob)
}
