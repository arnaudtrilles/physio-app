/**
 * useSync — React hook orchestrating IndexedDB ↔ Supabase sync.
 *
 * - On first login: uploads local data to Supabase, then downloads to get proper IDs.
 * - On returning login: downloads from Supabase, merges with local doc data.
 * - Ongoing: debounced full-replace per changed store (3s debounce).
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  hasCloudData, uploadAll, downloadAll, mergeWithLocalDocs,
  syncProfile, replaceStore, ensurePatient,
  convertBilans, convertIntermediaires, convertNotes,
  convertObjectifs, convertClosedTreatments, convertExerciceBank,
  deduplicateLocalData,
  type PatientMap, type LocalData,
} from '../lib/syncEngine'
import type {
  BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord,
  SmartObjectif, ExerciceBankEntry, PatientDocument,
  PatientPrescription, LetterRecord, LetterAuditEntry,
  AICallAuditEntry, ClosedTreatment, ProfileData,
} from '../types'

type Setter<T> = (value: T | ((prev: T) => T)) => void

interface UseSyncParams {
  user: User | null
  allDataLoaded: boolean
  db: BilanRecord[]; setDb: Setter<BilanRecord[]>
  dbIntermediaires: BilanIntermediaireRecord[]; setDbIntermediaires: Setter<BilanIntermediaireRecord[]>
  dbNotes: NoteSeanceRecord[]; setDbNotes: Setter<NoteSeanceRecord[]>
  dbObjectifs: SmartObjectif[]; setDbObjectifs: Setter<SmartObjectif[]>
  dbExerciceBank: ExerciceBankEntry[]; setDbExerciceBank: Setter<ExerciceBankEntry[]>
  dbPatientDocs: PatientDocument[]; setDbPatientDocs: Setter<PatientDocument[]>
  dbLetters: LetterRecord[]; setDbLetters: Setter<LetterRecord[]>
  dbLetterAudit: LetterAuditEntry[]; setDbLetterAudit: Setter<LetterAuditEntry[]>
  dbAICallAudit: AICallAuditEntry[]; setDbAICallAudit: Setter<AICallAuditEntry[]>
  dbPrescriptions: PatientPrescription[]; setDbPrescriptions: Setter<PatientPrescription[]>
  dbClosedTreatments: ClosedTreatment[]; setDbClosedTreatments: Setter<ClosedTreatment[]>
  profile: ProfileData; setProfile: Setter<ProfileData>
}

export type SyncStatus = 'idle' | 'syncing' | 'done' | 'error'

const DEBOUNCE_MS = 3000

export function useSync(params: UseSyncParams) {
  const {
    user, allDataLoaded,
    db, setDb, dbIntermediaires, setDbIntermediaires,
    dbNotes, setDbNotes, dbObjectifs, setDbObjectifs,
    dbExerciceBank, setDbExerciceBank, dbPatientDocs, setDbPatientDocs,
    dbLetters, setDbLetters, dbLetterAudit, setDbLetterAudit,
    dbAICallAudit, setDbAICallAudit, dbPrescriptions, setDbPrescriptions,
    dbClosedTreatments, setDbClosedTreatments, profile, setProfile,
  } = params

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const pmRef = useRef<PatientMap>(new Map())
  const initDone = useRef(false)
  const fromSync = useRef(new Set<string>())

  // Track previous values for change detection
  const prev = useRef({
    db, dbIntermediaires, dbNotes, dbObjectifs, dbExerciceBank,
    dbPatientDocs, dbLetters, dbLetterAudit, dbAICallAudit,
    dbPrescriptions, dbClosedTreatments, profile,
  })

  // ── helpers ─────────────────────────────────────────────────

  const setAllFromCloud = useCallback((cloud: LocalData) => {
    const keys = ['db', 'int', 'notes', 'obj', 'ex', 'docs', 'letters', 'la', 'ai', 'presc', 'closed', 'profile']
    keys.forEach(k => fromSync.current.add(k))
    setDb(cloud.db)
    setDbIntermediaires(cloud.dbIntermediaires)
    setDbNotes(cloud.dbNotes)
    setDbObjectifs(cloud.dbObjectifs)
    setDbExerciceBank(cloud.dbExerciceBank)
    setDbPatientDocs(cloud.dbPatientDocs)
    setDbLetters(cloud.dbLetters)
    setDbLetterAudit(cloud.dbLetterAudit)
    setDbAICallAudit(cloud.dbAICallAudit)
    setDbPrescriptions(cloud.dbPrescriptions)
    setDbClosedTreatments(cloud.dbClosedTreatments)
    setProfile(cloud.profile)
  }, [setDb, setDbIntermediaires, setDbNotes, setDbObjectifs, setDbExerciceBank,
      setDbPatientDocs, setDbLetters, setDbLetterAudit, setDbAICallAudit,
      setDbPrescriptions, setDbClosedTreatments, setProfile])

  // ── Initial sync ────────────────────────────────────────────

  useEffect(() => {
    if (!user || !allDataLoaded || initDone.current) return
    let cancelled = false

    ;(async () => {
      setSyncStatus('syncing')
      const userId = user.id
      try {
        const rawLocal: LocalData = {
          db, dbIntermediaires, dbNotes, dbObjectifs, dbExerciceBank,
          dbPatientDocs, dbLetters, dbLetterAudit, dbAICallAudit,
          dbPrescriptions, dbClosedTreatments, profile,
        }

        // Deduplicate local data (fixes doubled data from previous sync bugs)
        const localData = deduplicateLocalData(rawLocal)
        const wasDeduped = localData.db.length !== rawLocal.db.length
          || localData.dbNotes.length !== rawLocal.dbNotes.length
        if (wasDeduped) {
          console.log('[Sync] deduplication:', {
            bilans: `${rawLocal.db.length} → ${localData.db.length}`,
            notes: `${rawLocal.dbNotes.length} → ${localData.dbNotes.length}`,
          })
          // Persist deduplicated data locally
          setAllFromCloud(localData)
        }

        const localHasData = localData.db.length > 0 || localData.dbNotes.length > 0
          || localData.dbIntermediaires.length > 0 || localData.dbObjectifs.length > 0

        const cloudExists = await hasCloudData(userId)

        if (!cloudExists) {
          // First login only: upload local data
          try {
            await uploadAll(userId, localData)
          } catch (e) {
            console.error('[Sync] uploadAll failed (continuing to download):', e)
          }
        }

        // Always download to get canonical IDs and populate patient map
        const { data: cloud, patientMap } = await downloadAll(userId)
        pmRef.current = patientMap

        const cloudHasData = cloud.db.length > 0 || cloud.dbNotes.length > 0
          || cloud.dbIntermediaires.length > 0 || cloud.dbObjectifs.length > 0

        if (!cancelled) {
          if (cloudHasData || !localHasData) {
            // Normal: merge cloud data with local docs
            const merged = mergeWithLocalDocs(cloud, localData)
            setAllFromCloud(merged)
          } else {
            // Safety: cloud empty but local has data — keep local, don't overwrite
            console.warn('[Sync] cloud empty but local has data — keeping local state')
          }
        }

        initDone.current = true
        if (!cancelled) setSyncStatus('done')
      } catch (e) {
        console.error('[Sync] initial sync failed:', e)
        initDone.current = true // proceed even on error
        if (!cancelled) setSyncStatus('error')
      }
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, allDataLoaded])

  // ── Ongoing sync ────────────────────────────────────────────

  useEffect(() => {
    if (!initDone.current || !user) return

    // Check which stores changed
    const p = prev.current
    const changed: Array<() => Promise<void>> = []
    const userId = user.id
    const pm = pmRef.current

    // Helper to ensure patients exist before pushing a store
    const ensurePatients = async (records: Array<{ nom?: string; prenom?: string; dateNaissance?: string; avatarBg?: string; patientKey?: string }>) => {
      for (const r of records) {
        if (r.nom && r.prenom) {
          await ensurePatient(userId, r.nom, r.prenom, r.dateNaissance || '', r.avatarBg, pm)
        } else if (r.patientKey && !pm.has(r.patientKey)) {
          const parts = r.patientKey.split(' ')
          await ensurePatient(userId, parts[0] || '', parts.slice(1).join(' '), '', undefined, pm)
        }
      }
    }

    if (db !== p.db && !fromSync.current.has('db')) {
      changed.push(async () => {
        await ensurePatients(db)
        await replaceStore(userId, 'bilans', convertBilans(db, userId, pm))
      })
    } else fromSync.current.delete('db')

    if (dbIntermediaires !== p.dbIntermediaires && !fromSync.current.has('int')) {
      changed.push(async () => {
        await ensurePatients(dbIntermediaires)
        await replaceStore(userId, 'bilans_intermediaires', convertIntermediaires(dbIntermediaires, userId, pm))
      })
    } else fromSync.current.delete('int')

    if (dbNotes !== p.dbNotes && !fromSync.current.has('notes')) {
      changed.push(async () => {
        await ensurePatients(dbNotes)
        await replaceStore(userId, 'notes_seance', convertNotes(dbNotes, userId, pm))
      })
    } else fromSync.current.delete('notes')

    if (dbObjectifs !== p.dbObjectifs && !fromSync.current.has('obj')) {
      changed.push(async () => {
        await ensurePatients(dbObjectifs as Array<{ patientKey?: string }>)
        await replaceStore(userId, 'objectifs', convertObjectifs(dbObjectifs, userId, pm))
      })
    } else fromSync.current.delete('obj')

    if (dbExerciceBank !== p.dbExerciceBank && !fromSync.current.has('ex')) {
      changed.push(async () => {
        await replaceStore(userId, 'exercice_bank', convertExerciceBank(dbExerciceBank, userId))
      })
    } else fromSync.current.delete('ex')

    if (dbClosedTreatments !== p.dbClosedTreatments && !fromSync.current.has('closed')) {
      changed.push(async () => {
        await ensurePatients(dbClosedTreatments as Array<{ patientKey?: string }>)
        await replaceStore(userId, 'closed_treatments', convertClosedTreatments(dbClosedTreatments, userId, pm))
      })
    } else fromSync.current.delete('closed')

    if (dbLetters !== p.dbLetters && !fromSync.current.has('letters')) {
      changed.push(async () => {
        // Delete audit first (FK), then letters, then re-insert both
        await replaceStore(userId, 'letter_audit', dbLetterAudit.map(a => ({
          practitioner_id: userId, letter_id: null,
          patient_key: a.patientKey || null, type: a.type,
          pseudonymized: a.pseudonymized ?? true,
          pii_warnings_count: a.piiWarningsCount || 0,
          model_used: a.modelUsed || null, result_length: a.resultLength || 0,
        })))
        await replaceStore(userId, 'letters', dbLetters.map(l => ({
          practitioner_id: userId, patient_id: pm.get(l.patientKey) || null,
          type: l.type, form_data: l.formData || {},
          contenu: l.contenu || '', titre_affichage: l.titreAffichage || null,
          status: l.status || 'brouillon',
        })))
      })
    } else fromSync.current.delete('letters')

    if (dbLetterAudit !== p.dbLetterAudit && !fromSync.current.has('la')) {
      // Only sync if letters didn't also change (letters sync handles both)
      if (dbLetters === p.dbLetters) {
        changed.push(async () => {
          await replaceStore(userId, 'letter_audit', dbLetterAudit.map(a => ({
            practitioner_id: userId, letter_id: null,
            patient_key: a.patientKey || null, type: a.type,
            pseudonymized: a.pseudonymized ?? true,
            pii_warnings_count: a.piiWarningsCount || 0,
            model_used: a.modelUsed || null, result_length: a.resultLength || 0,
          })))
        })
      }
    } else fromSync.current.delete('la')

    if (dbAICallAudit !== p.dbAICallAudit && !fromSync.current.has('ai')) {
      changed.push(async () => {
        await replaceStore(userId, 'ai_call_audit', dbAICallAudit.map(a => ({
          practitioner_id: userId, category: a.category,
          patient_key: a.patientKey || null, pseudonymized: a.pseudonymized ?? true,
          scrub_replacements: a.scrubReplacements || 0,
          has_documents: a.hasDocuments || false, documents_count: a.documentsCount || 0,
          documents_unmasked: a.documentsUnmasked || 0,
          model_used: a.modelUsed || null, prompt_length: a.promptLength || 0,
          result_length: a.resultLength || 0, success: a.success ?? true,
        })))
      })
    } else fromSync.current.delete('ai')

    if (dbPrescriptions !== p.dbPrescriptions && !fromSync.current.has('presc')) {
      changed.push(async () => {
        const flat: Record<string, unknown>[] = []
        for (const pp of dbPrescriptions) {
          if (!pm.has(pp.patientKey) && pp.patientKey) {
            const parts = pp.patientKey.split(' ')
            await ensurePatient(userId, parts[0] || '', parts.slice(1).join(' '), '', undefined, pm)
          }
          if (!pm.has(pp.patientKey)) continue
          for (const pe of pp.prescriptions || []) {
            flat.push({
              practitioner_id: userId, patient_id: pm.get(pp.patientKey)!,
              nb_seances: pe.nbSeances, date_prescription: pe.datePrescription || null,
              prescripteur: pe.prescripteur || null, bilan_type: pe.bilanType || null,
              custom_label: pe.customLabel || null,
              document: pe.document ? { mimeType: pe.document.mimeType, name: pe.document.name } : null,
              seances_anterieures: pp.seancesAnterieures || 0,
            })
          }
        }
        await replaceStore(userId, 'prescriptions', flat)
      })
    } else fromSync.current.delete('presc')

    if (dbPatientDocs !== p.dbPatientDocs && !fromSync.current.has('docs')) {
      changed.push(async () => {
        await replaceStore(userId, 'patient_documents', dbPatientDocs
          .filter(d => pm.has(d.patientKey))
          .map(d => ({
            practitioner_id: userId,
            patient_id: pm.get(d.patientKey)!,
            name: d.name, mime_type: d.mimeType,
            storage_path: null, masked: d.masked || false,
            added_at: d.addedAt || new Date().toISOString(),
          })))
      })
    } else fromSync.current.delete('docs')

    if (profile !== p.profile && !fromSync.current.has('profile')) {
      changed.push(() => syncProfile(userId, profile))
    } else fromSync.current.delete('profile')

    // Update prev ref
    prev.current = {
      db, dbIntermediaires, dbNotes, dbObjectifs, dbExerciceBank,
      dbPatientDocs, dbLetters, dbLetterAudit, dbAICallAudit,
      dbPrescriptions, dbClosedTreatments, profile,
    }

    if (changed.length === 0) return

    const timer = setTimeout(async () => {
      for (const fn of changed) {
        try { await fn() } catch (e) { console.error('[Sync] push error:', e) }
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, dbIntermediaires, dbNotes, dbObjectifs, dbExerciceBank,
      dbPatientDocs, dbLetters, dbLetterAudit, dbAICallAudit,
      dbPrescriptions, dbClosedTreatments, profile, user])

  return { syncStatus }
}
