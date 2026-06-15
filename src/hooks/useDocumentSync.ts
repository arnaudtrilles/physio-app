/**
 * Synchronisation & réconciliation des documents patients (extrait de App.tsx).
 *
 * Regroupe la logique de persistance des binaires (PDF, images) côté Storage :
 *  - backfill au démarrage (upload des blobs locaux sans `storagePath`) ;
 *  - demande de stockage persistant au navigateur (anti-éviction iOS/ITP) ;
 *  - indicateur de documents pas encore confirmés dans le cloud ;
 *  - réparation manuelle (réconciliation tri-état) ;
 *  - suppression des documents définitivement perdus ;
 *  - attache d'un PDF auto-généré au dossier patient.
 *
 * Comportement strictement identique à l'implémentation inline d'origine :
 * ce hook ne fait que déplacer le code et threader les mêmes valeurs/setters.
 */
import { useEffect, useMemo, useCallback, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import type { BilanRecord, PatientDocument, PatientDocumentSource } from '../types'
import { buildStoragePath, uploadDocBlobWithRetry, docBlobStatus } from '../lib/documentStorage'
import type { DocReconcileResult, LostDocRef } from '../lib/documentStorage'
import { buildGeneratedPatientDoc } from '../utils/pdfPersistence'

/** Setter renvoyé par `useIndexedDB` : accepte une valeur ou un updater fonctionnel. */
type Setter<T> = (value: T | ((prev: T) => T)) => void

export interface UseDocumentSyncParams {
  user: User | null
  allDataLoaded: boolean
  db: BilanRecord[]
  setDb: Setter<BilanRecord[]>
  dbPatientDocs: PatientDocument[]
  setDbPatientDocs: Setter<PatientDocument[]>
}

export interface UseDocumentSyncResult {
  cloudDocsPending: number
  repairDocuments: () => Promise<DocReconcileResult>
  deleteLostDocuments: (refs: LostDocRef[]) => void
  attachPdfToPatient: (
    blob: Blob,
    fileName: string,
    patientKey: string,
    source: Exclude<PatientDocumentSource, 'upload'>,
  ) => Promise<void>
}

export function useDocumentSync({
  user, allDataLoaded, db, setDb, dbPatientDocs, setDbPatientDocs,
}: UseDocumentSyncParams): UseDocumentSyncResult {
  // Documents en cours d'upload Storage — évite les uploads concurrents du même blob.
  // Clé : `bilan:${bilanId}:${docIndex}` ou `patient:${docId}`.
  const uploadInFlightRef = useRef<Set<string>>(new Set())

  // ── Backfill Storage : upload des blobs locaux sans storagePath ───────────
  // Au démarrage et à chaque ajout de doc, on scanne dbPatientDocs et db[].documents
  // pour repérer les binaires (`data` présent) jamais uploadés (`storagePath` absent).
  //
  // Robustesse : path DÉTERMINISTE (reconstructible depuis l'identité du doc) +
  // upload AVEC retry. `storagePath` n'est patché dans le state QUE si l'upload est
  // confirmé — donc la sync ne remonte jamais une métadonnée qui pointe vers un blob
  // inexistant. Si l'upload échoue (hors-ligne, etc.), le doc reste local et sera
  // re-tenté au prochain passage (l'effet re-fire tant que storagePath est absent).
  useEffect(() => {
    if (!user?.id || !allDataLoaded) return
    const inFlight = uploadInFlightRef.current
    const uid = user.id

    // 1. Patient docs (standalone)
    for (const d of dbPatientDocs) {
      if (!d.data || d.storagePath) continue
      const key = `patient:${d.id}`
      if (inFlight.has(key)) continue
      inFlight.add(key)
      const path = buildStoragePath(uid, 'patient-doc', d.id, d.name, d.mimeType)
      void uploadDocBlobWithRetry(path, d.data, d.mimeType)
        .then(uploadedPath => {
          setDbPatientDocs(prev => prev.map(x => x.id === d.id ? { ...x, storagePath: uploadedPath } : x))
        })
        .catch(err => { console.warn('[Storage] backfill patient-doc failed (retry au prochain passage):', err) })
        .finally(() => { inFlight.delete(key) })
    }

    // 2. Bilan documents
    for (const b of db) {
      const docs = b.documents
      if (!docs?.length) continue
      docs.forEach((d, idx) => {
        if (!d.data || d.storagePath) return
        const key = `bilan:${b.id}:${idx}:${d.name}`
        if (inFlight.has(key)) return
        inFlight.add(key)
        const stableId = `${b.id}|${d.name}|${d.addedAt}`
        const path = buildStoragePath(uid, `bilan-${b.id}`, stableId, d.name, d.mimeType)
        void uploadDocBlobWithRetry(path, d.data, d.mimeType)
          .then(uploadedPath => {
            setDb(prev => prev.map(r => {
              if (r.id !== b.id) return r
              const next = r.documents?.map((doc, i) =>
                i === idx && doc.name === d.name && !doc.storagePath
                  ? { ...doc, storagePath: uploadedPath }
                  : doc
              )
              return { ...r, documents: next }
            }))
          })
          .catch(err => { console.warn('[Storage] backfill bilan-doc failed (retry au prochain passage):', err) })
          .finally(() => { inFlight.delete(key) })
      })
    }
  }, [user?.id, allDataLoaded, dbPatientDocs, db, setDbPatientDocs, setDb])

  // ── Stockage persistant : demande au navigateur de NE PAS évincer IndexedDB ──
  // Sans ça, Safari/iOS purge le stockage scriptable après 7 jours d'inactivité
  // (ITP) ou sous pression disque → perte de la copie locale des documents.
  // Best-effort : si le navigateur refuse, on ne casse rien.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return
    void navigator.storage.persisted()
      .then(already => { if (!already) return navigator.storage.persist() })
      .then(granted => { if (granted === false) console.info('[Storage] persistance refusée par le navigateur') })
      .catch(() => { /* non supporté — best-effort */ })
  }, [])

  // Nombre de documents présents en local mais PAS encore confirmés dans le cloud
  // (data sans storagePath). Surface l'indicateur "X docs pas encore sauvegardés".
  const cloudDocsPending = useMemo(() => {
    let n = 0
    for (const d of dbPatientDocs) if (d.data && !d.storagePath) n++
    for (const b of db) for (const doc of (b.documents ?? [])) if (doc.data && !doc.storagePath) n++
    return n
  }, [dbPatientDocs, db])

  // ── Réconciliation manuelle : "Réparer les documents" ─────────────────────
  // Pour chaque doc on vérifie le blob cloud en TRI-ÉTAT :
  //  - present  → rien à faire.
  //  - absent/unknown + copie locale → (ré-)upload sur le path déterministe.
  //  - absent (confirmé) + AUCUNE copie locale → "perdu" (listé pour suppression).
  //  - unknown + aucune copie locale → "unverified" : on NE TOUCHE PAS (prudence réseau).
  // Cette passe est ADDITIVE : elle ne supprime jamais rien (cf. deleteLostDocuments).
  const repairDocuments = useCallback(async (): Promise<DocReconcileResult> => {
    const uid = user?.id
    if (!uid) return { checked: 0, uploaded: 0, failed: 0, unverified: 0, lost: [] }
    let checked = 0, uploaded = 0, failed = 0, unverified = 0
    const lost: LostDocRef[] = []

    // 1. Patient docs
    const patientPatches = new Map<string, string>()
    for (const d of dbPatientDocs) {
      checked++
      const status = d.storagePath ? await docBlobStatus(d.storagePath) : 'absent'
      if (status === 'present') continue
      if (d.data) {
        const path = buildStoragePath(uid, 'patient-doc', d.id, d.name, d.mimeType)
        try { await uploadDocBlobWithRetry(path, d.data, d.mimeType); patientPatches.set(d.id, path); uploaded++ }
        catch { failed++ }
      } else if (status === 'absent') {
        lost.push({ kind: 'patient', name: d.name, docId: d.id })
      } else {
        unverified++ // unknown + pas de copie locale → on conserve
      }
    }
    if (patientPatches.size > 0) {
      setDbPatientDocs(prev => prev.map(x => patientPatches.has(x.id) ? { ...x, storagePath: patientPatches.get(x.id)! } : x))
    }

    // 2. Bilan docs — clé stable = `${bilanId}|${name}|${addedAt}`
    const bilanPatches = new Map<string, string>()
    for (const b of db) {
      for (const d of (b.documents ?? [])) {
        checked++
        const status = d.storagePath ? await docBlobStatus(d.storagePath) : 'absent'
        if (status === 'present') continue
        const stableId = `${b.id}|${d.name}|${d.addedAt}`
        if (d.data) {
          const path = buildStoragePath(uid, `bilan-${b.id}`, stableId, d.name, d.mimeType)
          try { await uploadDocBlobWithRetry(path, d.data, d.mimeType); bilanPatches.set(stableId, path); uploaded++ }
          catch { failed++ }
        } else if (status === 'absent') {
          lost.push({ kind: 'bilan', name: d.name, bilanId: b.id, addedAt: d.addedAt })
        } else {
          unverified++
        }
      }
    }
    if (bilanPatches.size > 0) {
      setDb(prev => prev.map(r => {
        const docs = r.documents
        if (!docs?.length) return r
        let changed = false
        const next = docs.map(doc => {
          const k = `${r.id}|${doc.name}|${doc.addedAt}`
          if (bilanPatches.has(k)) { changed = true; return { ...doc, storagePath: bilanPatches.get(k)! } }
          return doc
        })
        return changed ? { ...r, documents: next } : r
      }))
    }

    return { checked, uploaded, failed, unverified, lost }
  }, [user?.id, dbPatientDocs, db, setDbPatientDocs, setDb])

  // Supprime les documents définitivement perdus du state local. La sync
  // (full-replace local→cloud) nettoiera ensuite les lignes cloud correspondantes.
  // Ne perd rien de récupérable : ces docs n'ont ni copie locale ni blob cloud.
  const deleteLostDocuments = useCallback((refs: LostDocRef[]) => {
    const patientIds = new Set(refs.filter(r => r.kind === 'patient' && r.docId).map(r => r.docId!))
    const bilanKeys = new Set(refs.filter(r => r.kind === 'bilan').map(r => `${r.bilanId}|${r.name}|${r.addedAt}`))
    if (patientIds.size > 0) {
      setDbPatientDocs(prev => prev.filter(d => !patientIds.has(d.id)))
    }
    if (bilanKeys.size > 0) {
      setDb(prev => prev.map(b => {
        const docs = b.documents
        if (!docs?.length) return b
        const next = docs.filter(d => !bilanKeys.has(`${b.id}|${d.name}|${d.addedAt}`))
        return next.length === docs.length ? b : { ...b, documents: next }
      }))
    }
  }, [setDbPatientDocs, setDb])

  /**
   * Attache un PDF auto-généré (bilan, analyse IA, évolution) au dossier patient.
   * Stocke le blob en base64 dans IndexedDB via setDbPatientDocs.
   * Échec silencieux pour ne pas casser l'export — l'utilisateur a déjà son
   * téléchargement local, l'auto-save est un bonus.
   */
  const attachPdfToPatient = useCallback(async (
    blob: Blob,
    fileName: string,
    patientKey: string,
    source: Exclude<PatientDocumentSource, 'upload'>,
  ) => {
    if (!patientKey) return
    try {
      const doc = await buildGeneratedPatientDoc(blob, patientKey, fileName, source)
      setDbPatientDocs(prev => [...prev, doc])
    } catch (err) {
      console.warn('[attachPdfToPatient] failed to persist generated PDF', err)
    }
  }, [setDbPatientDocs])

  return { cloudDocsPending, repairDocuments, deleteLostDocuments, attachPdfToPatient }
}
