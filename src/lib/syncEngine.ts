/**
 * Sync Engine — bridges local IndexedDB data ↔ Supabase relational schema.
 *
 * Architecture:
 *  - Local: flat arrays in IndexedDB, patients identified by "NOM PRENOM" key
 *  - Cloud: relational tables in Supabase, patients identified by UUID
 *  - PatientMap: maps patientKey ↔ Supabase patient UUID
 *
 * Sync flow:
 *  1. First login  → uploadAll (local → cloud), then downloadAll (to get IDs)
 *  2. Returning user → downloadAll (cloud → local)
 *  3. Ongoing       → debounced full-replace per changed store
 *
 * Documents (base64) stay local — only metadata is synced. Supabase Storage in v2.
 */

import { supabase } from './supabase'
import type {
  BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord,
  SmartObjectif, ExerciceBankEntry, PatientDocument,
  PatientPrescription, LetterRecord, LetterAuditEntry,
  AICallAuditEntry, ClosedTreatment, ProfileData, BilanType,
} from '../types'

// ── Types ──────────────────────────────────────────────────────

/** patientKey ("NOM PRENOM") → Supabase patient UUID */
export type PatientMap = Map<string, string>

export interface LocalData {
  db: BilanRecord[]
  dbIntermediaires: BilanIntermediaireRecord[]
  dbNotes: NoteSeanceRecord[]
  dbObjectifs: SmartObjectif[]
  dbExerciceBank: ExerciceBankEntry[]
  dbPatientDocs: PatientDocument[]
  dbLetters: LetterRecord[]
  dbLetterAudit: LetterAuditEntry[]
  dbAICallAudit: AICallAuditEntry[]
  dbPrescriptions: PatientPrescription[]
  dbClosedTreatments: ClosedTreatment[]
  profile: ProfileData
}

// ── Helpers ─────────────────────────────────────────────────────

/** Remove duplicate records by comparing content (ignoring id) */
export function deduplicateLocalData(data: LocalData): LocalData {
  function dedup<T extends Record<string, unknown>>(items: T[], keyFn: (item: T) => string): T[] {
    const seen = new Set<string>()
    return items.filter(item => {
      const key = keyFn(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  return {
    ...data,
    db: dedup(data.db, b => `${b.nom}|${b.prenom}|${b.dateBilan}|${b.bilanType}|${b.zone}`),
    dbIntermediaires: dedup(data.dbIntermediaires, b => `${b.nom}|${b.prenom}|${b.dateBilan}|${b.bilanType}|${b.zone}`),
    dbNotes: dedup(data.dbNotes, n => `${n.nom}|${n.prenom}|${n.dateSeance}|${n.numSeance}|${n.bilanType}`),
    dbObjectifs: dedup(data.dbObjectifs, o => `${o.patientKey}|${o.titre}|${o.cible}`),
    dbClosedTreatments: dedup(data.dbClosedTreatments, t => `${t.patientKey}|${t.bilanType}|${t.closedAt}`),
    dbLetters: dedup(data.dbLetters, l => `${l.patientKey}|${l.type}|${l.contenu?.slice(0, 50)}`),
    dbLetterAudit: dedup(data.dbLetterAudit, a => `${a.patientKey}|${a.type}|${a.timestamp}`),
    dbAICallAudit: dedup(data.dbAICallAudit, a => `${a.category}|${a.patientKey}|${a.timestamp}`),
    dbExerciceBank: dedup(data.dbExerciceBank, e => e.id),
    dbPatientDocs: dedup(data.dbPatientDocs, d => `${d.patientKey}|${d.name}|${d.addedAt}`),
    dbPrescriptions: data.dbPrescriptions, // already grouped by patient, no duplication risk
  }
}

export function pk(nom: string, prenom: string): string {
  return `${nom.trim().toUpperCase()} ${prenom.trim().replace(/\b\w/g, c => c.toUpperCase())}`
}

function extractPatients(data: LocalData) {
  const seen = new Map<string, { nom: string; prenom: string; dateNaissance: string; avatarBg?: string }>()
  for (const r of data.db) {
    const k = pk(r.nom, r.prenom)
    if (!seen.has(k)) seen.set(k, { nom: r.nom, prenom: r.prenom, dateNaissance: r.dateNaissance, avatarBg: r.avatarBg })
  }
  for (const r of data.dbIntermediaires) {
    const k = r.patientKey || pk(r.nom, r.prenom)
    if (!seen.has(k)) seen.set(k, { nom: r.nom, prenom: r.prenom, dateNaissance: r.dateNaissance, avatarBg: r.avatarBg })
  }
  for (const r of data.dbNotes) {
    const k = r.patientKey || pk(r.nom, r.prenom)
    if (!seen.has(k)) seen.set(k, { nom: r.nom, prenom: r.prenom, dateNaissance: r.dateNaissance, avatarBg: r.avatarBg })
  }
  const keyOnly = [
    ...data.dbObjectifs.map(o => o.patientKey),
    ...data.dbPatientDocs.map(d => d.patientKey),
    ...data.dbPrescriptions.map(p => p.patientKey),
    ...data.dbLetters.map(l => l.patientKey),
    ...data.dbClosedTreatments.map(t => t.patientKey),
  ]
  for (const pkey of keyOnly) {
    if (pkey && !seen.has(pkey)) {
      const parts = pkey.split(' ')
      seen.set(pkey, { nom: parts[0] || '', prenom: parts.slice(1).join(' '), dateNaissance: '' })
    }
  }
  return Array.from(seen.values())
}

/** Strip base64 from bilan documents (keep metadata only) */
function stripDocs(docs?: Array<Record<string, unknown>>): unknown[] {
  if (!docs) return []
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return docs.map(({ data, originalData, ...rest }) => rest)
}

/** Batch insert — Supabase allows ~1000 rows per request */
async function batchInsert(table: string, rows: Record<string, unknown>[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { error } = await supabase.from(table).insert(batch)
    if (error) throw new Error(`Insert ${table}: ${error.message}`)
  }
}

/** Fetch all rows with pagination */
async function fetchAll(table: string, userId: string): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = []
  let from = 0
  const size = 1000
  while (true) {
    const { data, error } = await supabase
      .from(table).select('*')
      .eq('practitioner_id', userId)
      .range(from, from + size - 1)
    if (error) throw new Error(`Fetch ${table}: ${error.message}`)
    results.push(...(data || []))
    if (!data || data.length < size) break
    from += size
  }
  return results
}

// ── Cloud state ─────────────────────────────────────────────────

export async function hasCloudData(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('patients')
    .select('id', { count: 'exact', head: true })
    .eq('practitioner_id', userId)
  return (count ?? 0) > 0
}

// ── Ensure patient ──────────────────────────────────────────────

export async function ensurePatient(
  userId: string, nom: string, prenom: string,
  dateNaissance: string, avatarBg: string | undefined,
  pm: PatientMap,
): Promise<string> {
  const key = pk(nom, prenom)
  if (pm.has(key)) return pm.get(key)!

  // Check DB first to avoid duplicates
  const { data: existing } = await supabase.from('patients')
    .select('id')
    .eq('practitioner_id', userId)
    .eq('nom', nom)
    .eq('prenom', prenom)
    .limit(1)
    .single()

  if (existing) {
    pm.set(key, existing.id)
    return existing.id
  }

  const nomNorm = nom.trim().toUpperCase()
  const prenomNorm = prenom.trim().replace(/\b\w/g, c => c.toUpperCase())
  const { data, error } = await supabase.from('patients')
    .insert({ practitioner_id: userId, nom: nomNorm, prenom: prenomNorm, date_naissance: dateNaissance || null, avatar_bg: avatarBg || null })
    .select('id').single()
  if (error) throw new Error(`Ensure patient: ${error.message}`)
  pm.set(key, data.id)
  return data.id
}

// ── Upload all (initial migration) ──────────────────────────────

export async function uploadAll(userId: string, data: LocalData): Promise<PatientMap> {
  // 1. Profile
  await supabase.from('practitioners').update({
    nom: data.profile.nom || '', prenom: data.profile.prenom || '',
    profession: data.profile.profession || 'Kinésithérapeute',
    photo: data.profile.photo || null,
    specialites: data.profile.specialites || [],
    techniques: data.profile.techniques || [],
    equipements: data.profile.equipements || [],
    autres_competences: data.profile.autresCompetences || null,
    rcc: data.profile.rcc || null, adresse: data.profile.adresse || null,
    adresse_complement: data.profile.adresseComplement || null,
    code_postal: data.profile.codePostal || null,
    ville: data.profile.ville || null, telephone: data.profile.telephone || null,
    email: data.profile.email || null,
    signature_image: data.profile.signatureImage || null,
    specialisations_libelle: data.profile.specialisationsLibelle || null,
  }).eq('id', userId)

  // 2. Patients — fetch existing first, insert only new ones
  const patients = extractPatients(data)
  const pm: PatientMap = new Map()

  // Load existing patients into map
  const existingPatients = await fetchAll('patients', userId)
  for (const p of existingPatients) {
    pm.set(pk(p.nom as string, p.prenom as string), p.id as string)
  }

  // Insert only patients not already in Supabase
  const newPatients = patients.filter(p => !pm.has(pk(p.nom, p.prenom)))
  if (newPatients.length > 0) {
    const { data: ins, error } = await supabase.from('patients')
      .insert(newPatients.map(p => ({
        practitioner_id: userId, nom: p.nom, prenom: p.prenom,
        date_naissance: p.dateNaissance || null, avatar_bg: p.avatarBg || null,
      }))).select('id, nom, prenom')
    if (error) throw new Error(`Create patients: ${error.message}`)
    for (const p of ins || []) pm.set(pk(p.nom, p.prenom), p.id)
  }

  // 3. Bilans
  try {
    const bilanRows = data.db
      .filter(b => pm.has(pk(b.nom, b.prenom)))
      .map(b => ({
        practitioner_id: userId, patient_id: pm.get(pk(b.nom, b.prenom))!,
        date_bilan: b.dateBilan || null, zone_count: b.zoneCount || 0,
        evn: b.evn ?? null, zone: b.zone || null, pathologie: b.pathologie || null,
        status: b.status || 'complet', custom_label: b.customLabel || null,
        bilan_type: b.bilanType || null, bilan_data: b.bilanData || {},
        notes: b.notes || null, silhouette_data: b.silhouetteData || null,
        documents: stripDocs(b.documents as Array<Record<string, unknown>> | undefined),
        analyse_ia: b.analyseIA || null, fiche_exercice: b.ficheExercice || null,
      }))
    if (bilanRows.length > 0) await batchInsert('bilans', bilanRows)
  } catch (e) { console.error('[Sync] upload bilans:', e) }

  // 4. Intermédiaires
  try {
    const intRows = data.dbIntermediaires
      .filter(b => pm.has(b.patientKey || pk(b.nom, b.prenom)))
      .map(b => ({
        practitioner_id: userId,
        patient_id: pm.get(b.patientKey || pk(b.nom, b.prenom))!,
        date_bilan: b.dateBilan || null, zone: b.zone || null,
        bilan_type: b.bilanType || null, data: b.data || {},
        status: b.status || 'complet', notes: b.notes || null,
        analyse_ia: b.analyseIA || null, fiche_exercice: b.ficheExercice || null,
      }))
    if (intRows.length > 0) await batchInsert('bilans_intermediaires', intRows)
  } catch (e) { console.error('[Sync] upload bilans_intermediaires:', e) }

  // 5. Notes de séance
  try {
    const noteRows = data.dbNotes
      .filter(n => pm.has(n.patientKey || pk(n.nom, n.prenom)))
      .map(n => ({
        practitioner_id: userId,
        patient_id: pm.get(n.patientKey || pk(n.nom, n.prenom))!,
        date_seance: n.dateSeance || null, num_seance: n.numSeance || null,
        zone: n.zone || null, bilan_type: n.bilanType || null,
        data: n.data || {}, analyse_ia: n.analyseIA || null,
        fiche_exercice: n.ficheExercice || null,
      }))
    if (noteRows.length > 0) await batchInsert('notes_seance', noteRows)
  } catch (e) { console.error('[Sync] upload notes_seance:', e) }

  // 6. Objectifs
  try {
    const objRows = data.dbObjectifs
      .filter(o => pm.has(o.patientKey))
      .map(o => ({
        practitioner_id: userId, patient_id: pm.get(o.patientKey)!,
        zone: o.zone || 'Général', titre: o.titre, cible: o.cible,
        date_cible: o.dateCible || null, status: o.status || 'en_cours',
      }))
    if (objRows.length > 0) await batchInsert('objectifs', objRows)
  } catch (e) { console.error('[Sync] upload objectifs:', e) }

  // 7. Prescriptions (flatten PatientPrescription → rows)
  try {
    const flatPresc: Record<string, unknown>[] = []
    for (const pp of data.dbPrescriptions) {
      if (!pm.has(pp.patientKey)) continue
      for (const pe of pp.prescriptions || []) {
        flatPresc.push({
          practitioner_id: userId, patient_id: pm.get(pp.patientKey)!,
          nb_seances: pe.nbSeances, date_prescription: pe.datePrescription || null,
          prescripteur: pe.prescripteur || null, bilan_type: pe.bilanType || null,
          custom_label: pe.customLabel || null,
          document: pe.document ? { mimeType: pe.document.mimeType, name: pe.document.name } : null,
          seances_anterieures: pp.seancesAnterieures || 0,
        })
      }
    }
    if (flatPresc.length > 0) await batchInsert('prescriptions', flatPresc)
  } catch (e) { console.error('[Sync] upload prescriptions:', e) }

  // 8. Traitements clôturés
  try {
    const closedRows = data.dbClosedTreatments
      .filter(t => pm.has(t.patientKey))
      .map(t => ({
        practitioner_id: userId, patient_id: pm.get(t.patientKey)!,
        bilan_type: t.bilanType, zone: t.zone || null,
        closed_at: t.closedAt || new Date().toISOString(), note: t.note || null,
      }))
    if (closedRows.length > 0) await batchInsert('closed_treatments', closedRows)
  } catch (e) { console.error('[Sync] upload closed_treatments:', e) }

  // 9. Courriers (un par un pour mapper les IDs → letter_audit)
  const letterIdMap = new Map<number, number>()
  try {
    for (const l of data.dbLetters) {
      const { data: ins, error } = await supabase.from('letters')
        .insert({
          practitioner_id: userId, patient_id: pm.get(l.patientKey) || null,
          type: l.type, form_data: l.formData || {}, contenu: l.contenu || '',
          titre_affichage: l.titreAffichage || null, status: l.status || 'brouillon',
        }).select('id').single()
      if (!error && ins) letterIdMap.set(l.id, ins.id)
    }
  } catch (e) { console.error('[Sync] upload letters:', e) }

  // 10. Audit courriers
  try {
    if (data.dbLetterAudit.length > 0) {
      await batchInsert('letter_audit', data.dbLetterAudit.map(a => ({
        practitioner_id: userId, letter_id: letterIdMap.get(a.letterId) || null,
        patient_key: a.patientKey || null, type: a.type,
        pseudonymized: a.pseudonymized ?? true,
        pii_warnings_count: a.piiWarningsCount || 0,
        model_used: a.modelUsed || null, result_length: a.resultLength || 0,
      })))
    }
  } catch (e) { console.error('[Sync] upload letter_audit:', e) }

  // 11. Audit IA
  try {
    if (data.dbAICallAudit.length > 0) {
      await batchInsert('ai_call_audit', data.dbAICallAudit.map(a => ({
        practitioner_id: userId, category: a.category,
        patient_key: a.patientKey || null, pseudonymized: a.pseudonymized ?? true,
        scrub_replacements: a.scrubReplacements || 0,
        has_documents: a.hasDocuments || false, documents_count: a.documentsCount || 0,
        documents_unmasked: a.documentsUnmasked || 0, model_used: a.modelUsed || null,
        prompt_length: a.promptLength || 0, result_length: a.resultLength || 0,
        success: a.success ?? true,
      })))
    }
  } catch (e) { console.error('[Sync] upload ai_call_audit:', e) }

  // 12. Banque d'exercices
  try {
    if (data.dbExerciceBank.length > 0) {
      await batchInsert('exercice_bank', data.dbExerciceBank.map(e => ({
        id: e.id, practitioner_id: userId, nom: e.nom,
        zone: e.zone || null, bilan_type: e.bilanType || null,
        objectif: e.objectif || null, position_depart: e.positionDepart || null,
        mouvement: e.mouvement || null, dosage: e.dosage || null,
        limite_securite: e.limiteSecurite || null,
        first_seen_at: e.firstSeenAt || new Date().toISOString(),
        last_seen_at: e.lastSeenAt || new Date().toISOString(),
        occurrences: e.occurrences || 1,
      })))
    }
  } catch (e) { console.error('[Sync] upload exercice_bank:', e) }

  // 13. Documents patient (métadonnées — ID auto-généré par Supabase)
  try {
    const docRows = data.dbPatientDocs
      .filter(d => pm.has(d.patientKey))
      .map(d => ({
        practitioner_id: userId,
        patient_id: pm.get(d.patientKey)!,
        name: d.name, mime_type: d.mimeType,
        storage_path: null, masked: d.masked || false,
        added_at: d.addedAt || new Date().toISOString(),
      }))
    if (docRows.length > 0) await batchInsert('patient_documents', docRows)
  } catch (e) { console.error('[Sync] upload patient_documents:', e) }

  return pm
}

// ── Download all ────────────────────────────────────────────────

export async function downloadAll(userId: string): Promise<{ data: LocalData; patientMap: PatientMap }> {
  const pm: PatientMap = new Map()
  const idToPatient = new Map<string, { nom: string; prenom: string; dateNaissance: string; avatarBg?: string }>()

  // 1. Profile
  const { data: prac } = await supabase.from('practitioners').select('*').eq('id', userId).single()
  const profile: ProfileData = {
    nom: prac?.nom || '', prenom: prac?.prenom || '',
    profession: prac?.profession || 'Kinésithérapeute',
    photo: prac?.photo || null,
    specialites: prac?.specialites || [], techniques: prac?.techniques || [],
    equipements: prac?.equipements || [],
    autresCompetences: prac?.autres_competences || undefined,
    rcc: prac?.rcc || undefined, adresse: prac?.adresse || undefined,
    adresseComplement: prac?.adresse_complement || undefined,
    codePostal: prac?.code_postal || undefined, ville: prac?.ville || undefined,
    telephone: prac?.telephone || undefined, email: prac?.email || undefined,
    signatureImage: prac?.signature_image || null,
    specialisationsLibelle: prac?.specialisations_libelle || undefined,
  }

  // 2. Patients
  const patientsRows = await fetchAll('patients', userId)
  for (const p of patientsRows) {
    const n = p.nom as string, pr = p.prenom as string
    pm.set(pk(n, pr), p.id as string)
    idToPatient.set(p.id as string, {
      nom: n, prenom: pr,
      dateNaissance: (p.date_naissance as string) || '',
      avatarBg: (p.avatar_bg as string) || undefined,
    })
  }

  const pi = (patientId: string) => idToPatient.get(patientId) || { nom: '', prenom: '', dateNaissance: '', avatarBg: undefined }
  const pkey = (patientId: string) => { const p = pi(patientId); return pk(p.nom, p.prenom) }

  // 3. Bilans
  const bilansRows = await fetchAll('bilans', userId)
  const db: BilanRecord[] = bilansRows.map(b => {
    const p = pi(b.patient_id as string)
    return {
      id: b.id as number, nom: p.nom, prenom: p.prenom, dateNaissance: p.dateNaissance,
      dateBilan: (b.date_bilan as string) || '', zoneCount: (b.zone_count as number) || 0,
      evn: b.evn as number | undefined, zone: b.zone as string | undefined,
      pathologie: b.pathologie as string | undefined, avatarBg: p.avatarBg,
      status: (b.status as 'incomplet' | 'complet') || 'complet',
      customLabel: b.custom_label as string | undefined,
      bilanType: b.bilan_type as BilanType | undefined,
      bilanData: (b.bilan_data as Record<string, unknown>) || undefined,
      notes: b.notes as string | undefined,
      silhouetteData: b.silhouette_data as Record<string, unknown> | undefined,
      documents: (b.documents as BilanRecord['documents']) || undefined,
      analyseIA: b.analyse_ia as BilanRecord['analyseIA'] | undefined,
      ficheExercice: b.fiche_exercice as BilanRecord['ficheExercice'] | undefined,
    }
  })

  // 4. Intermédiaires
  const intRows = await fetchAll('bilans_intermediaires', userId)
  const dbIntermediaires: BilanIntermediaireRecord[] = intRows.map(b => {
    const p = pi(b.patient_id as string)
    return {
      id: b.id as number, patientKey: pk(p.nom, p.prenom),
      nom: p.nom, prenom: p.prenom, dateNaissance: p.dateNaissance,
      dateBilan: (b.date_bilan as string) || '', zone: b.zone as string | undefined,
      bilanType: b.bilan_type as BilanType | undefined, avatarBg: p.avatarBg,
      data: (b.data as Record<string, unknown>) || undefined,
      status: b.status as 'incomplet' | 'complet' | undefined,
      notes: b.notes as string | undefined,
      analyseIA: b.analyse_ia as BilanIntermediaireRecord['analyseIA'] | undefined,
      ficheExercice: b.fiche_exercice as BilanIntermediaireRecord['ficheExercice'] | undefined,
    }
  })

  // 5. Notes
  const notesRows = await fetchAll('notes_seance', userId)
  const dbNotes: NoteSeanceRecord[] = notesRows.map(n => {
    const p = pi(n.patient_id as string)
    return {
      id: n.id as number, patientKey: pk(p.nom, p.prenom),
      nom: p.nom, prenom: p.prenom, dateNaissance: p.dateNaissance,
      dateSeance: (n.date_seance as string) || '', numSeance: (n.num_seance as string) || '',
      zone: n.zone as string | undefined, bilanType: n.bilan_type as BilanType | undefined,
      avatarBg: p.avatarBg,
      data: (n.data as NoteSeanceRecord['data']) || {
        eva: '', observance: '', evolution: '', noteSubjective: '',
        interventions: [], detailDosage: '', tolerance: '', toleranceDetail: '',
        prochaineEtape: [], notePlan: '',
      },
      analyseIA: n.analyse_ia as NoteSeanceRecord['analyseIA'] | undefined,
      ficheExercice: n.fiche_exercice as NoteSeanceRecord['ficheExercice'] | undefined,
    }
  })

  // 6. Objectifs
  const objRows = await fetchAll('objectifs', userId)
  const dbObjectifs: SmartObjectif[] = objRows.map(o => ({
    id: o.id as number, patientKey: pkey(o.patient_id as string),
    zone: (o.zone as string) || 'Général', titre: o.titre as string,
    cible: o.cible as string, dateCible: (o.date_cible as string) || '',
    status: o.status as SmartObjectif['status'],
    createdAt: (o.created_at as string) || new Date().toISOString(),
  }))

  // 7. Prescriptions (reconstruct grouped by patient)
  const prescRows = await fetchAll('prescriptions', userId)
  const prescByPatient = new Map<string, { entries: PatientPrescription['prescriptions']; sa: number }>()
  for (const p of prescRows) {
    const k = pkey(p.patient_id as string)
    if (!prescByPatient.has(k)) prescByPatient.set(k, { entries: [], sa: (p.seances_anterieures as number) || 0 })
    prescByPatient.get(k)!.entries.push({
      id: p.id as number, nbSeances: p.nb_seances as number,
      datePrescription: (p.date_prescription as string) || '',
      prescripteur: (p.prescripteur as string) || '',
      document: p.document as PatientPrescription['prescriptions'][0]['document'],
      bilanType: p.bilan_type as BilanType | undefined,
      customLabel: p.custom_label as string | undefined,
    })
  }
  const dbPrescriptions: PatientPrescription[] = Array.from(prescByPatient.entries()).map(([k, v]) => ({
    patientKey: k, prescriptions: v.entries, seancesAnterieures: v.sa,
  }))

  // 8. Traitements clôturés
  const closedRows = await fetchAll('closed_treatments', userId)
  const dbClosedTreatments: ClosedTreatment[] = closedRows.map(t => ({
    id: t.id as number, patientKey: pkey(t.patient_id as string),
    bilanType: t.bilan_type as BilanType,
    zone: t.zone as string | undefined,
    closedAt: (t.closed_at as string) || new Date().toISOString(),
    note: t.note as string | undefined,
  }))

  // 9. Courriers
  const letterRows = await fetchAll('letters', userId)
  const dbLetters: LetterRecord[] = letterRows.map(l => ({
    id: l.id as number, patientKey: pkey(l.patient_id as string),
    type: l.type as LetterRecord['type'],
    createdAt: (l.created_at as string) || new Date().toISOString(),
    updatedAt: (l.updated_at as string) || new Date().toISOString(),
    formData: (l.form_data as LetterRecord['formData']) || ({} as LetterRecord['formData']),
    contenu: (l.contenu as string) || '', titreAffichage: (l.titre_affichage as string) || '',
    status: (l.status as LetterRecord['status']) || 'brouillon',
  }))

  // 10. Audit courriers
  const laRows = await fetchAll('letter_audit', userId)
  const dbLetterAudit: LetterAuditEntry[] = laRows.map(a => ({
    id: a.id as number, timestamp: (a.created_at as string) || new Date().toISOString(),
    letterId: (a.letter_id as number) || 0, patientKey: (a.patient_key as string) || '',
    type: a.type as LetterAuditEntry['type'], pseudonymized: (a.pseudonymized as boolean) ?? true,
    piiWarningsCount: (a.pii_warnings_count as number) || 0,
    modelUsed: (a.model_used as string) || '', resultLength: (a.result_length as number) || 0,
  }))

  // 11. Audit IA
  const aiRows = await fetchAll('ai_call_audit', userId)
  const dbAICallAudit: AICallAuditEntry[] = aiRows.map(a => ({
    id: a.id as number, timestamp: (a.created_at as string) || new Date().toISOString(),
    category: a.category as AICallAuditEntry['category'],
    patientKey: (a.patient_key as string) || '',
    pseudonymized: (a.pseudonymized as boolean) ?? true,
    scrubReplacements: (a.scrub_replacements as number) || 0,
    hasDocuments: (a.has_documents as boolean) || false,
    documentsCount: (a.documents_count as number) || 0,
    documentsUnmasked: (a.documents_unmasked as number) || 0,
    modelUsed: (a.model_used as string) || '',
    promptLength: (a.prompt_length as number) || 0,
    resultLength: (a.result_length as number) || 0,
    success: (a.success as boolean) ?? true,
  }))

  // 12. Banque d'exercices
  const exRows = await fetchAll('exercice_bank', userId)
  const dbExerciceBank: ExerciceBankEntry[] = exRows.map(e => ({
    id: e.id as string, nom: e.nom as string,
    zone: (e.zone as string) || '', bilanType: (e.bilan_type as string) || '',
    objectif: (e.objectif as string) || '', positionDepart: (e.position_depart as string) || '',
    mouvement: (e.mouvement as string) || '', dosage: (e.dosage as string) || '',
    limiteSecurite: (e.limite_securite as string) || '',
    firstSeenAt: (e.first_seen_at as string) || '', lastSeenAt: (e.last_seen_at as string) || '',
    occurrences: (e.occurrences as number) || 1,
  }))

  // 13. Documents patient (metadata — no base64)
  const docRows = await fetchAll('patient_documents', userId)
  const dbPatientDocs: PatientDocument[] = docRows.map(d => ({
    id: d.id as string, patientKey: pkey(d.patient_id as string),
    name: d.name as string, mimeType: d.mime_type as string,
    data: '', addedAt: (d.added_at as string) || new Date().toISOString(),
    masked: (d.masked as boolean) || false,
  }))

  return {
    data: {
      db, dbIntermediaires, dbNotes, dbObjectifs, dbExerciceBank,
      dbPatientDocs, dbLetters, dbLetterAudit, dbAICallAudit,
      dbPrescriptions, dbClosedTreatments, profile,
    },
    patientMap: pm,
  }
}

// ── Merge downloaded data with local docs ───────────────────────

export function mergeWithLocalDocs(cloud: LocalData, local: LocalData): LocalData {
  // Bilans: keep local document base64
  const db = cloud.db.map(cb => {
    const match = local.db.find(lb =>
      lb.nom === cb.nom && lb.prenom === cb.prenom &&
      lb.dateBilan === cb.dateBilan && lb.bilanType === cb.bilanType &&
      lb.zone === cb.zone
    )
    if (match?.documents?.some(d => d.data)) return { ...cb, documents: match.documents }
    return cb
  })

  // Patient docs: keep local base64
  const dbPatientDocs = cloud.dbPatientDocs.map(cd => {
    const ld = local.dbPatientDocs.find(l =>
      l.patientKey === cd.patientKey && l.name === cd.name && l.addedAt === cd.addedAt
    )
    return ld?.data ? { ...cd, data: ld.data, originalData: ld.originalData } : cd
  })

  // Profile: keep local photo/signature if cloud doesn't have them
  const profile = {
    ...cloud.profile,
    photo: cloud.profile.photo || local.profile.photo,
    signatureImage: cloud.profile.signatureImage || local.profile.signatureImage,
  }

  // Prescriptions: keep local document data
  const dbPrescriptions = cloud.dbPrescriptions.map(cp => {
    const lp = local.dbPrescriptions.find(l => l.patientKey === cp.patientKey)
    if (!lp) return cp
    return {
      ...cp,
      prescriptions: cp.prescriptions.map((pe, i) => {
        const localPe = lp.prescriptions[i]
        return localPe?.document?.data ? { ...pe, document: localPe.document } : pe
      }),
    }
  })

  return { ...cloud, db, dbPatientDocs, profile, dbPrescriptions }
}

// ── Ongoing sync: full-replace per store ────────────────────────

export async function syncProfile(userId: string, p: ProfileData): Promise<void> {
  await supabase.from('practitioners').update({
    nom: p.nom || '', prenom: p.prenom || '',
    profession: p.profession || 'Kinésithérapeute',
    photo: p.photo || null,
    specialites: p.specialites || [], techniques: p.techniques || [],
    equipements: p.equipements || [],
    autres_competences: p.autresCompetences || null,
    rcc: p.rcc || null, adresse: p.adresse || null,
    adresse_complement: p.adresseComplement || null,
    code_postal: p.codePostal || null, ville: p.ville || null,
    telephone: p.telephone || null, email: p.email || null,
    signature_image: p.signatureImage || null,
    specialisations_libelle: p.specialisationsLibelle || null,
  }).eq('id', userId)
}

export async function replaceStore(
  userId: string, table: string, rows: Record<string, unknown>[],
): Promise<void> {
  await supabase.from(table).delete().eq('practitioner_id', userId)
  if (rows.length > 0) await batchInsert(table, rows)
}

// ── Converter helpers for ongoing sync ──────────────────────────

export function convertBilans(bilans: BilanRecord[], userId: string, pm: PatientMap) {
  return bilans
    .filter(b => pm.has(pk(b.nom, b.prenom)))
    .map(b => ({
      practitioner_id: userId, patient_id: pm.get(pk(b.nom, b.prenom))!,
      date_bilan: b.dateBilan || null, zone_count: b.zoneCount || 0,
      evn: b.evn ?? null, zone: b.zone || null, pathologie: b.pathologie || null,
      status: b.status || 'complet', custom_label: b.customLabel || null,
      bilan_type: b.bilanType || null, bilan_data: b.bilanData || {},
      notes: b.notes || null, silhouette_data: b.silhouetteData || null,
      documents: stripDocs(b.documents as Array<Record<string, unknown>> | undefined),
      analyse_ia: b.analyseIA || null, fiche_exercice: b.ficheExercice || null,
    }))
}

export function convertIntermediaires(items: BilanIntermediaireRecord[], userId: string, pm: PatientMap) {
  return items
    .filter(b => pm.has(b.patientKey || pk(b.nom, b.prenom)))
    .map(b => ({
      practitioner_id: userId,
      patient_id: pm.get(b.patientKey || pk(b.nom, b.prenom))!,
      date_bilan: b.dateBilan || null, zone: b.zone || null,
      bilan_type: b.bilanType || null, data: b.data || {},
      status: b.status || 'complet', notes: b.notes || null,
      analyse_ia: b.analyseIA || null, fiche_exercice: b.ficheExercice || null,
    }))
}

export function convertNotes(items: NoteSeanceRecord[], userId: string, pm: PatientMap) {
  return items
    .filter(n => pm.has(n.patientKey || pk(n.nom, n.prenom)))
    .map(n => ({
      practitioner_id: userId,
      patient_id: pm.get(n.patientKey || pk(n.nom, n.prenom))!,
      date_seance: n.dateSeance || null, num_seance: n.numSeance || null,
      zone: n.zone || null, bilan_type: n.bilanType || null,
      data: n.data || {}, analyse_ia: n.analyseIA || null,
      fiche_exercice: n.ficheExercice || null,
    }))
}

export function convertObjectifs(items: SmartObjectif[], userId: string, pm: PatientMap) {
  return items
    .filter(o => pm.has(o.patientKey))
    .map(o => ({
      practitioner_id: userId, patient_id: pm.get(o.patientKey)!,
      zone: o.zone || 'Général', titre: o.titre, cible: o.cible,
      date_cible: o.dateCible || null, status: o.status || 'en_cours',
    }))
}

export function convertClosedTreatments(items: ClosedTreatment[], userId: string, pm: PatientMap) {
  return items
    .filter(t => pm.has(t.patientKey))
    .map(t => ({
      practitioner_id: userId, patient_id: pm.get(t.patientKey)!,
      bilan_type: t.bilanType, zone: t.zone || null,
      closed_at: t.closedAt || new Date().toISOString(), note: t.note || null,
    }))
}

export function convertExerciceBank(items: ExerciceBankEntry[], userId: string) {
  return items.map(e => ({
    id: e.id, practitioner_id: userId, nom: e.nom,
    zone: e.zone || null, bilan_type: e.bilanType || null,
    objectif: e.objectif || null, position_depart: e.positionDepart || null,
    mouvement: e.mouvement || null, dosage: e.dosage || null,
    limite_securite: e.limiteSecurite || null,
    first_seen_at: e.firstSeenAt || new Date().toISOString(),
    last_seen_at: e.lastSeenAt || new Date().toISOString(),
    occurrences: e.occurrences || 1,
  }))
}
