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

import { supabase as _supabase } from './supabase'
// syncEngine is only called when supabase is configured
const supabase = _supabase!
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

/**
 * Normalise nom/prenom dans les fingerprints — sinon un round-trip cloud
 * (qui uppercase nom + titlecase prenom via `ensurePatient`) crée des doublons
 * non détectés (« Mamo molalign » local vs « MAMO Molalign » cloud).
 */
const npFp = (nom?: string, prenom?: string) =>
  `${(nom || '').trim().toUpperCase()}|${(prenom || '').trim().toUpperCase()}`

/** Remove duplicate records by comparing content (ignoring id) */
export function deduplicateLocalData(data: LocalData): LocalData {
  function dedup<T>(items: T[], keyFn: (item: T) => string): T[] {
    const seen = new Set<string>()
    return items.filter(item => {
      const key = keyFn(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  // Patient-key fingerprints normalisés (case-insensitive) — collapse les
  // doublons hérités d'avant la normalisation à l'écriture.
  const pkFp = (key?: string) => (key || '').trim().toUpperCase()

  return {
    ...data,
    db: dedup(data.db, b => `${npFp(b.nom, b.prenom)}|${b.dateBilan}|${b.bilanType}|${b.zone}`),
    dbIntermediaires: dedup(data.dbIntermediaires, b => `${npFp(b.nom, b.prenom)}|${b.dateBilan}|${b.bilanType}|${b.zone}`),
    dbNotes: dedup(data.dbNotes, n => `${npFp(n.nom, n.prenom)}|${n.dateSeance}|${n.numSeance}|${n.bilanType}`),
    dbObjectifs: dedup(data.dbObjectifs, o => `${pkFp(o.patientKey)}|${o.titre}|${o.cible}`),
    dbClosedTreatments: dedup(data.dbClosedTreatments, t => `${pkFp(t.patientKey)}|${t.bilanType}|${t.closedAt}`),
    dbLetters: dedup(data.dbLetters, l => `${pkFp(l.patientKey)}|${l.type}|${l.contenu?.slice(0, 50)}`),
    dbLetterAudit: dedup(data.dbLetterAudit, a => `${pkFp(a.patientKey)}|${a.type}|${a.timestamp}`),
    dbAICallAudit: dedup(data.dbAICallAudit, a => `${a.category}|${pkFp(a.patientKey)}|${a.timestamp}`),
    dbExerciceBank: dedup(data.dbExerciceBank, e => e.id),
    dbPatientDocs: dedup(data.dbPatientDocs, d => `${pkFp(d.patientKey)}|${d.name}|${d.addedAt}`),
    dbPrescriptions: data.dbPrescriptions, // already grouped by patient, no duplication risk
  }
}

/**
 * Clé patient locale (utilisée comme FK dans objectifs/docs/lettres/etc).
 *
 * Avec `dateNaissance` : `"NOM Prenom|YYYY-MM-DD"` — désambigue les
 * homonymes (deux Pierre Martin nés à des dates différentes ne fusionnent
 * plus leurs objectifs/docs/lettres entre eux).
 *
 * Sans `dateNaissance` : `"NOM Prenom"` (rétro-compat : 361 call sites
 * existants à travers l'app n'ont pas de DOB sous la main et continuent
 * à fonctionner). Les records avec clé courte coexistent avec les nouveaux.
 *
 * Pour lookup cloud (`ensurePatient`) et keying du PatientMap dans les
 * upload converters, TOUJOURS passer dateNaissance — sinon `single()`
 * Supabase peut renvoyer le mauvais UUID pour deux homonymes.
 */
export function pk(nom: string, prenom: string, dateNaissance?: string): string {
  const base = `${nom.trim().toUpperCase()} ${prenom.trim().replace(/\b\w/g, c => c.toUpperCase())}`
  const dob = dateNaissance?.trim()
  return dob ? `${base}|${dob}` : base
}

/**
 * Peuple le PatientMap avec deux formats de clé pour le même UUID :
 *   - LONG  ("NOM Prenom|YYYY-MM-DD") — clé canonique post-fix homonymes
 *   - SHORT ("NOM Prenom") — alias pour rétro-compat avec les patientKey
 *     stockés dans les records existants (objectifs/docs/lettres créés
 *     avant la migration).
 *
 * Pour les homonymes : la clé SHORT pointe vers le PREMIER UUID rencontré
 * (les suivants sont ignorés sur le slot SHORT). C'est le comportement
 * dégradé pré-existant — pas de régression. La clé LONG, elle, garantit
 * un mapping correct par homonym.
 */
function setPatientMap(pm: PatientMap, nom: string, prenom: string, dateNaissance: string, uuid: string): void {
  pm.set(pk(nom, prenom, dateNaissance), uuid)
  const shortKey = pk(nom, prenom)
  if (!pm.has(shortKey)) pm.set(shortKey, uuid)
}

function extractPatients(data: LocalData) {
  const seen = new Map<string, { nom: string; prenom: string; dateNaissance: string; avatarBg?: string }>()
  // Clé désambigée par dateNaissance — sans ça, deux homonymes (Pierre Martin
  // 1980 / 1995) fusionneraient leurs records dans la Map et seraient uploadés
  // comme un seul patient en cloud (cross-patient leak).
  for (const r of data.db) {
    const k = pk(r.nom, r.prenom, r.dateNaissance)
    if (!seen.has(k)) seen.set(k, { nom: r.nom, prenom: r.prenom, dateNaissance: r.dateNaissance, avatarBg: r.avatarBg })
  }
  for (const r of data.dbIntermediaires) {
    const k = pk(r.nom, r.prenom, r.dateNaissance)
    if (!seen.has(k)) seen.set(k, { nom: r.nom, prenom: r.prenom, dateNaissance: r.dateNaissance, avatarBg: r.avatarBg })
  }
  for (const r of data.dbNotes) {
    const k = pk(r.nom, r.prenom, r.dateNaissance)
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

/** Strip base64 from bilan documents (keep metadata + storagePath only) */
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
  const key = pk(nom, prenom, dateNaissance)
  if (pm.has(key)) return pm.get(key)!

  // Check DB first to avoid duplicates — désambigue par date_naissance pour
  // ne pas confondre deux homonymes (Pierre Martin 1980 / 1995). Sans cette
  // condition, `.single()` peut renvoyer le mauvais UUID quand deux lignes
  // matchent (nom, prenom) seuls → tout patient B finit attaché aux records
  // du patient A (cross-patient data leak).
  let query = supabase.from('patients')
    .select('id')
    .eq('practitioner_id', userId)
    .eq('nom', nom)
    .eq('prenom', prenom)
  query = dateNaissance
    ? query.eq('date_naissance', dateNaissance)
    : query.is('date_naissance', null)
  const { data: existing } = await query.limit(1).single()

  if (existing) {
    setPatientMap(pm, nom, prenom, dateNaissance, existing.id)
    return existing.id
  }

  const nomNorm = nom.trim().toUpperCase()
  const prenomNorm = prenom.trim().replace(/\b\w/g, c => c.toUpperCase())
  const { data, error } = await supabase.from('patients')
    .insert({ practitioner_id: userId, nom: nomNorm, prenom: prenomNorm, date_naissance: dateNaissance || null, avatar_bg: avatarBg || null })
    .select('id').single()
  if (error) throw new Error(`Ensure patient: ${error.message}`)
  setPatientMap(pm, nomNorm, prenomNorm, dateNaissance, data.id)
  return data.id
}

/**
 * Rename a patient in Supabase. Met à jour la ligne `patients` ayant
 * (nom=oldNom, prenom=oldPrenom) avec les nouvelles valeurs. Le patient_id
 * (UUID) ne change pas → toutes les FK (bilans/notes/etc) restent valides.
 *
 * Met aussi à jour le PatientMap : supprime l'ancienne clé, ajoute la
 * nouvelle clé pointant vers le même UUID. Sans ça, le prochain
 * `ensurePatient` croirait à un nouveau patient et créerait un doublon.
 */
export async function renamePatientInCloud(
  userId: string,
  oldNom: string, oldPrenom: string, oldDateNaissance: string,
  newNom: string, newPrenom: string,
  newDateNaissance: string, newSexe: string | undefined,
  pm: PatientMap,
): Promise<void> {
  const newNomNorm = newNom.trim().toUpperCase()
  const newPrenomNorm = newPrenom.trim().replace(/\b\w/g, c => c.toUpperCase())

  // Désambigue par date_naissance : sans ça, deux Pierre Martin (1980/1995)
  // font matcher la mauvaise ligne et le rename écrase le mauvais patient.
  let lookup = supabase.from('patients')
    .select('id')
    .eq('practitioner_id', userId)
    .eq('nom', oldNom)
    .eq('prenom', oldPrenom)
  lookup = oldDateNaissance
    ? lookup.eq('date_naissance', oldDateNaissance)
    : lookup.is('date_naissance', null)
  const { data: existing } = await lookup.limit(1).single()

  if (!existing) {
    // Pas trouvé en cloud (cas : création locale jamais syncée).
    // Pas grave : la prochaine sync upload créera la ligne avec le bon nom.
    const oldLongKey = pk(oldNom, oldPrenom, oldDateNaissance)
    const oldShortKey = pk(oldNom, oldPrenom)
    if (pm.has(oldLongKey)) {
      const uuid = pm.get(oldLongKey)!
      pm.delete(oldLongKey)
      // Supprime l'alias SHORT seulement s'il pointait vers ce même UUID
      // (sinon il appartient à un homonyme et doit rester).
      if (pm.get(oldShortKey) === uuid) pm.delete(oldShortKey)
      setPatientMap(pm, newNomNorm, newPrenomNorm, newDateNaissance, uuid)
    }
    return
  }

  const { error } = await supabase.from('patients')
    .update({
      nom: newNomNorm, prenom: newPrenomNorm,
      date_naissance: newDateNaissance || null,
    })
    .eq('id', existing.id)
  if (error) throw new Error(`Rename patient: ${error.message}`)

  // Met à jour le PatientMap pour refléter le nouveau key
  const oldLongKey = pk(oldNom, oldPrenom, oldDateNaissance)
  const oldShortKey = pk(oldNom, oldPrenom)
  pm.delete(oldLongKey)
  if (pm.get(oldShortKey) === existing.id) pm.delete(oldShortKey)
  setPatientMap(pm, newNomNorm, newPrenomNorm, newDateNaissance, existing.id)

  // newSexe : pas de colonne `sexe` dans la table patients (registre local
  // dbPatientSexe seulement). Rien à faire côté cloud pour ce champ.
  void newSexe
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

  // Load existing patients into map (clé LONG + alias SHORT pour rétro-compat)
  const existingPatients = await fetchAll('patients', userId)
  for (const p of existingPatients) {
    setPatientMap(pm, p.nom as string, p.prenom as string, (p.date_naissance as string) || '', p.id as string)
  }

  // Insert only patients not already in Supabase
  const newPatients = patients.filter(p => !pm.has(pk(p.nom, p.prenom, p.dateNaissance)))
  if (newPatients.length > 0) {
    const { data: ins, error } = await supabase.from('patients')
      .insert(newPatients.map(p => ({
        practitioner_id: userId, nom: p.nom, prenom: p.prenom,
        date_naissance: p.dateNaissance || null, avatar_bg: p.avatarBg || null,
      }))).select('id, nom, prenom, date_naissance')
    if (error) throw new Error(`Create patients: ${error.message}`)
    for (const p of ins || []) setPatientMap(pm, p.nom, p.prenom, p.date_naissance || '', p.id)
  }

  // 3. Bilans (clé désambigée par dateNaissance)
  try {
    const bilanRows = data.db
      .filter(b => pm.has(pk(b.nom, b.prenom, b.dateNaissance)))
      .map(b => ({
        practitioner_id: userId, patient_id: pm.get(pk(b.nom, b.prenom, b.dateNaissance))!,
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
      .filter(b => pm.has(pk(b.nom, b.prenom, b.dateNaissance)))
      .map(b => ({
        practitioner_id: userId,
        patient_id: pm.get(pk(b.nom, b.prenom, b.dateNaissance))!,
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
      .filter(n => pm.has(pk(n.nom, n.prenom, n.dateNaissance)))
      .map(n => ({
        practitioner_id: userId,
        patient_id: pm.get(pk(n.nom, n.prenom, n.dateNaissance))!,
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
        storage_path: d.storagePath || null,
        masked: d.masked || false,
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

  // 2. Patients (PatientMap : clé LONG canonique + alias SHORT pour rétro-compat
  // avec les patientKey stockés dans les records existants pré-migration)
  const patientsRows = await fetchAll('patients', userId)
  for (const p of patientsRows) {
    const n = p.nom as string, pr = p.prenom as string
    const dob = (p.date_naissance as string) || ''
    setPatientMap(pm, n, pr, dob, p.id as string)
    idToPatient.set(p.id as string, {
      nom: n, prenom: pr,
      dateNaissance: dob,
      avatarBg: (p.avatar_bg as string) || undefined,
    })
  }

  const pi = (patientId: string) => idToPatient.get(patientId) || { nom: '', prenom: '', dateNaissance: '', avatarBg: undefined }
  // pkey() conserve le format SHORT (sans dateNaissance) pour rester compatible
  // avec les patientKey existants stockés localement (objectifs/docs/lettres
  // créés avant ce fix). Une migration séparée pourra réécrire en bulk plus tard.
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

  // 13. Documents patient (metadata — no base64, mais storage_path pour
  // permettre la récupération lazy du blob via Supabase Storage)
  const docRows = await fetchAll('patient_documents', userId)
  const dbPatientDocs: PatientDocument[] = docRows.map(d => ({
    id: d.id as string, patientKey: pkey(d.patient_id as string),
    name: d.name as string, mimeType: d.mime_type as string,
    data: '', addedAt: (d.added_at as string) || new Date().toISOString(),
    masked: (d.masked as boolean) || false,
    storagePath: (d.storage_path as string) || undefined,
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

/**
 * Merge cloud download with local state.
 *
 * Two responsibilities:
 *  1. Préserver les blobs base64 locaux (documents, photos, signatures) qui
 *     ne sont jamais uploadés au cloud.
 *  2. **UNION : préserver les enregistrements local-only** créés avant que
 *     le sync upload n'ait eu le temps de tourner (debounce 3s). Sans ça,
 *     un refresh dans la fenêtre de debounce détruit définitivement le
 *     bilan/séance/objectif qu'on vient de créer.
 *
 * Fingerprint match (cloud-assigned ids ne sont pas préservés côté local
 * donc on matche par contenu, identique à `deduplicateLocalData`).
 */
export function mergeWithLocalDocs(cloud: LocalData, local: LocalData): LocalData {
  // Fingerprints normalisés (case-insensitive sur nom/prenom/patientKey) — sinon
  // le round-trip cloud (qui uppercase nom + titlecase prenom) fait diverger les
  // fingerprints local vs cloud et l'UNION conserve les deux comme distincts.
  const pkFp = (key?: string) => (key || '').trim().toUpperCase()

  // ── Bilans ───────────────────────────────────────────────────
  const bilanFp = (b: BilanRecord) =>
    `${npFp(b.nom, b.prenom)}|${b.dateBilan}|${b.bilanType}|${b.zone}`
  const cloudBilanFps = new Set(cloud.db.map(bilanFp))
  const dbCloudWithDocs = cloud.db.map(cb => {
    const match = local.db.find(lb => bilanFp(lb) === bilanFp(cb))
    // Champs client-only non persistés en cloud — toujours réattacher depuis local
    // pour éviter qu'un sync ne vide le cache (compteRendu) ou le diagnostic.
    const clientOnly = match
      ? {
          compteRendu: match.compteRendu,
          compteRenduError: match.compteRenduError,
          diagnosticPhysio: match.diagnosticPhysio ?? cb.diagnosticPhysio,
        }
      : {}
    if (!match?.documents?.length && !cb.documents?.length) return { ...cb, ...clientOnly }
    // Per-doc merge par nom : on garde le binaire local (data + originalData)
    // ET le storagePath cloud (autorité). Si cloud n'a pas encore le path mais
    // local oui (upload local pas encore re-down depuis cloud), garder local.
    const cloudDocs = cb.documents ?? []
    const localDocs = match?.documents ?? []
    const byName = new Map<string, typeof localDocs[number]>()
    for (const ld of localDocs) byName.set(ld.name, ld)
    const mergedDocs = cloudDocs.map(cd => {
      const ld = byName.get(cd.name)
      const storagePath = cd.storagePath || ld?.storagePath
      if (ld?.data) return { ...cd, data: ld.data, originalData: ld.originalData, storagePath }
      return { ...cd, storagePath }
    })
    // Ajouter les docs purement locaux (pas encore syncés cloud)
    const cloudNames = new Set(cloudDocs.map(d => d.name))
    const localOnlyDocs = localDocs.filter(d => !cloudNames.has(d.name))
    return { ...cb, ...clientOnly, documents: [...mergedDocs, ...localOnlyDocs] }
  })
  const localOnlyBilans = local.db.filter(lb => !cloudBilanFps.has(bilanFp(lb)))
  const db = [...dbCloudWithDocs, ...localOnlyBilans]

  // ── Bilans intermédiaires ────────────────────────────────────
  const intFp = (b: BilanIntermediaireRecord) =>
    `${npFp(b.nom, b.prenom)}|${b.dateBilan}|${b.bilanType}|${b.zone}`
  const cloudIntFps = new Set(cloud.dbIntermediaires.map(intFp))
  const localOnlyInt = local.dbIntermediaires.filter(li => !cloudIntFps.has(intFp(li)))
  const dbIntermediaires = [...cloud.dbIntermediaires, ...localOnlyInt]

  // ── Notes de séance ─────────────────────────────────────────
  const noteFp = (n: NoteSeanceRecord) =>
    `${npFp(n.nom, n.prenom)}|${n.dateSeance}|${n.numSeance}|${n.bilanType}`
  const cloudNoteFps = new Set(cloud.dbNotes.map(noteFp))
  const localOnlyNotes = local.dbNotes.filter(ln => !cloudNoteFps.has(noteFp(ln)))
  const dbNotes = [...cloud.dbNotes, ...localOnlyNotes]

  // ── Objectifs SMART ─────────────────────────────────────────
  const objFp = (o: SmartObjectif) => `${pkFp(o.patientKey)}|${o.titre}|${o.cible}`
  const cloudObjFps = new Set(cloud.dbObjectifs.map(objFp))
  const localOnlyObj = local.dbObjectifs.filter(lo => !cloudObjFps.has(objFp(lo)))
  const dbObjectifs = [...cloud.dbObjectifs, ...localOnlyObj]

  // ── Closed treatments ───────────────────────────────────────
  const ctFp = (t: ClosedTreatment) => `${pkFp(t.patientKey)}|${t.bilanType}|${t.closedAt}`
  const cloudCtFps = new Set(cloud.dbClosedTreatments.map(ctFp))
  const localOnlyCt = local.dbClosedTreatments.filter(lt => !cloudCtFps.has(ctFp(lt)))
  const dbClosedTreatments = [...cloud.dbClosedTreatments, ...localOnlyCt]

  // ── Banque d'exercices (id-based, slug stable) ──────────────
  const cloudExIds = new Set(cloud.dbExerciceBank.map(e => e.id))
  const localOnlyEx = local.dbExerciceBank.filter(e => !cloudExIds.has(e.id))
  const dbExerciceBank = [...cloud.dbExerciceBank, ...localOnlyEx]

  // ── Courriers ───────────────────────────────────────────────
  const letterFp = (l: LetterRecord) =>
    `${pkFp(l.patientKey)}|${l.type}|${(l.contenu || '').slice(0, 50)}`
  const cloudLetterFps = new Set(cloud.dbLetters.map(letterFp))
  const localOnlyLetters = local.dbLetters.filter(ll => !cloudLetterFps.has(letterFp(ll)))
  const dbLetters = [...cloud.dbLetters, ...localOnlyLetters]

  // ── Documents patients (préserve base64 + dédupe par patientKey+name) ─
  // Fingerprint sans addedAt : Supabase reformate les timestamps au round-trip
  // (drift de précision micro/milli, format Z vs +00:00), ce qui faisait que
  // chaque cycle de sync ajoutait un duplicata orphelin (data vide). Avec
  // patientKey+name comme clé, un même document n'est gardé qu'une fois et
  // le binaire local est réattaché quel que soit le format de date côté cloud.
  const docFp = (d: PatientDocument) => `${pkFp(d.patientKey)}|${d.name}`

  // Index des docs locaux par fp, en privilégiant ceux qui ont un binaire.
  const localByFp = new Map<string, PatientDocument>()
  for (const ld of local.dbPatientDocs) {
    const key = docFp(ld)
    const prev = localByFp.get(key)
    if (!prev || (ld.data && !prev.data)) localByFp.set(key, ld)
  }

  // Pour chaque doc cloud : réattacher le binaire local + les flags qui ne
  // sont pas persistés en cloud (`generated`, `source`, `originalData`).
  // Si plusieurs cloud-entries partagent la même clé, on garde celle avec data
  // (réattachée) ; à égalité, la plus récente.
  const cloudByFp = new Map<string, PatientDocument>()
  for (const cd of cloud.dbPatientDocs) {
    const key = docFp(cd)
    const ld = localByFp.get(key)
    // storagePath : on garde celui du cloud en priorité (autorité), mais on
    // tombe sur le local si le cloud n'a pas encore récupéré la valeur (cas :
    // upload local fait, sync metadata pas encore round-tripé).
    const storagePath = cd.storagePath || ld?.storagePath
    const merged: PatientDocument = ld?.data
      ? { ...cd, data: ld.data, originalData: ld.originalData, generated: ld.generated, source: ld.source, storagePath }
      : (ld ? { ...cd, generated: ld.generated, source: ld.source, storagePath } : { ...cd, storagePath })
    const prev = cloudByFp.get(key)
    if (!prev) {
      cloudByFp.set(key, merged)
    } else {
      const prevHasData = !!prev.data
      const currHasData = !!merged.data
      if (currHasData && !prevHasData) cloudByFp.set(key, merged)
      else if (currHasData === prevHasData) {
        const prevTime = Date.parse(prev.addedAt) || 0
        const currTime = Date.parse(merged.addedAt) || 0
        if (currTime > prevTime) cloudByFp.set(key, merged)
      }
    }
  }

  // Local-only : docs dont la clé n'existe pas du tout côté cloud (créés
  // avant qu'un sync n'ait pu les uploader).
  const localOnlyByFp = new Map<string, PatientDocument>()
  for (const ld of local.dbPatientDocs) {
    const key = docFp(ld)
    if (cloudByFp.has(key)) continue
    const prev = localOnlyByFp.get(key)
    if (!prev || (ld.data && !prev.data)) localOnlyByFp.set(key, ld)
  }

  const dbPatientDocs = [...cloudByFp.values(), ...localOnlyByFp.values()]

  // ── Prescriptions (1 par patient, préserve doc local) ───────
  const cloudPrescKeys = new Set(cloud.dbPrescriptions.map(p => pkFp(p.patientKey)))
  const cloudPrescriptionsWithDocs = cloud.dbPrescriptions.map(cp => {
    const lp = local.dbPrescriptions.find(l => pkFp(l.patientKey) === pkFp(cp.patientKey))
    if (!lp) return cp
    return {
      ...cp,
      prescriptions: cp.prescriptions.map((pe, i) => {
        const localPe = lp.prescriptions[i]
        return localPe?.document?.data ? { ...pe, document: localPe.document } : pe
      }),
    }
  })
  const localOnlyPresc = local.dbPrescriptions.filter(lp => !cloudPrescKeys.has(pkFp(lp.patientKey)))
  const dbPrescriptions = [...cloudPrescriptionsWithDocs, ...localOnlyPresc]

  // ── Audit logs ──────────────────────────────────────────────
  const laFp = (a: LetterAuditEntry) => `${pkFp(a.patientKey)}|${a.type}|${a.timestamp}`
  const cloudLaFps = new Set(cloud.dbLetterAudit.map(laFp))
  const localOnlyLa = local.dbLetterAudit.filter(la => !cloudLaFps.has(laFp(la)))
  const dbLetterAudit = [...cloud.dbLetterAudit, ...localOnlyLa]

  const aiFp = (a: AICallAuditEntry) => `${a.category}|${pkFp(a.patientKey)}|${a.timestamp}`
  const cloudAiFps = new Set(cloud.dbAICallAudit.map(aiFp))
  const localOnlyAi = local.dbAICallAudit.filter(a => !cloudAiFps.has(aiFp(a)))
  const dbAICallAudit = [...cloud.dbAICallAudit, ...localOnlyAi]

  // ── Profile (keep local photo/signature) ────────────────────
  const profile = {
    ...cloud.profile,
    photo: cloud.profile.photo || local.profile.photo,
    signatureImage: cloud.profile.signatureImage || local.profile.signatureImage,
  }

  return {
    db, dbIntermediaires, dbNotes, dbObjectifs,
    dbExerciceBank, dbPatientDocs, dbLetters,
    dbLetterAudit, dbAICallAudit,
    dbPrescriptions, dbClosedTreatments, profile,
  }
}

/**
 * Compare merged data vs cloud download to detect stores où des
 * enregistrements local-only ont été préservés. Ces stores doivent être
 * uploadés au cloud explicitement après le merge — sinon, le prochain
 * cycle de sync les considérerait "in-sync" et le cloud resterait en retard.
 */
export function detectUnionedStores(merged: LocalData, cloud: LocalData): {
  db: boolean; dbIntermediaires: boolean; dbNotes: boolean; dbObjectifs: boolean
  dbClosedTreatments: boolean; dbExerciceBank: boolean; dbLetters: boolean
  dbPatientDocs: boolean; dbPrescriptions: boolean
  dbLetterAudit: boolean; dbAICallAudit: boolean
} {
  return {
    db: merged.db.length > cloud.db.length,
    dbIntermediaires: merged.dbIntermediaires.length > cloud.dbIntermediaires.length,
    dbNotes: merged.dbNotes.length > cloud.dbNotes.length,
    dbObjectifs: merged.dbObjectifs.length > cloud.dbObjectifs.length,
    dbClosedTreatments: merged.dbClosedTreatments.length > cloud.dbClosedTreatments.length,
    dbExerciceBank: merged.dbExerciceBank.length > cloud.dbExerciceBank.length,
    dbLetters: merged.dbLetters.length > cloud.dbLetters.length,
    // Patient docs : reconcile aussi quand le merge a *réduit* le nombre
    // d'entrées (dédupe des orphelins cloud créés par les anciens round-trips).
    dbPatientDocs: merged.dbPatientDocs.length !== cloud.dbPatientDocs.length,
    dbPrescriptions: merged.dbPrescriptions.length > cloud.dbPrescriptions.length,
    dbLetterAudit: merged.dbLetterAudit.length > cloud.dbLetterAudit.length,
    dbAICallAudit: merged.dbAICallAudit.length > cloud.dbAICallAudit.length,
  }
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
    .filter(b => pm.has(pk(b.nom, b.prenom, b.dateNaissance)))
    .map(b => ({
      practitioner_id: userId, patient_id: pm.get(pk(b.nom, b.prenom, b.dateNaissance))!,
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
    .filter(b => pm.has(pk(b.nom, b.prenom, b.dateNaissance)))
    .map(b => ({
      practitioner_id: userId,
      patient_id: pm.get(pk(b.nom, b.prenom, b.dateNaissance))!,
      date_bilan: b.dateBilan || null, zone: b.zone || null,
      bilan_type: b.bilanType || null, data: b.data || {},
      status: b.status || 'complet', notes: b.notes || null,
      analyse_ia: b.analyseIA || null, fiche_exercice: b.ficheExercice || null,
    }))
}

export function convertNotes(items: NoteSeanceRecord[], userId: string, pm: PatientMap) {
  return items
    .filter(n => pm.has(pk(n.nom, n.prenom, n.dateNaissance)))
    .map(n => ({
      practitioner_id: userId,
      patient_id: pm.get(pk(n.nom, n.prenom, n.dateNaissance))!,
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
