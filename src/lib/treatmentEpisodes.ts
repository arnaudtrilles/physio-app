/**
 * Logique d'épisodes de prise en charge — fonctions PURES, extraites de App.tsx
 * pour être testables (bug-2).
 *
 * Un « épisode » = une vie d'une PEC pour un couple (patient, bilanType) :
 * il démarre à la création du premier record et finit à une clôture
 * (ClosedTreatment). Un nouveau record arrivant APRÈS la dernière clôture
 * rouvre un épisode (le traitement redevient actif).
 *
 * ⚠️ Bug historique corrigé ici : l'appartenance d'un record à un épisode était
 * testée par `record.id > closureTimestampMs`. Or les `id` ne sont PAS des
 * timestamps comparables :
 *   - les bilans reçoivent un petit entier (`Math.max(...ids)+1`) → toujours
 *     < 1.7e12 → la comparaison était TOUJOURS fausse (un traitement clôturé
 *     ne se rouvrait jamais à l'ajout d'un bilan) ;
 *   - interms/notes/prescriptions utilisent `Date.now()` en local (ms, OK
 *     hors-ligne) MAIS après synchro l'id devient un BIGSERIAL Supabase (petit
 *     entier) → la comparaison cassait aussi post-sync.
 *
 * Correctif : on compare des **timestamps de création**. Deux sources, par
 * ordre de fiabilité :
 *   1. `createdAt` (ISO) — indice de précision LOCAL (sub-jour), posé à la
 *      création du record. Volontairement NON synchronisé : la synchro cloud
 *      est un full-replace ; renvoyer `created_at` réinitialiserait la colonne
 *      à `now()` pour toute ligne héritée → de vieux traitements clôturés se
 *      « rouvriraient » à tort (régression). On laisse donc `createdAt` mourir
 *      au round-trip et on s'appuie sur :
 *   2. la **date clinique** (`dateBilan` / `dateSeance` / `datePrescription`) —
 *      déjà synchronisée, posée une seule fois, toujours présente, au format
 *      "dd/mm/yyyy". C'est la source de vérité DURABLE (précision au jour).
 *
 * `recordCreatedMs(record, dateClinique)` combine les deux : `createdAt` s'il
 * est là (session locale, précision fine), sinon la date clinique parsée,
 * sinon l'`id` s'il est déjà à l'échelle ms, sinon 0 (conservateur).
 */

import type {
  BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord,
  PatientPrescription, PrescriptionEntry, ClosedTreatment, BilanType,
} from '../types'
import { pk } from './syncEngine'
import { getBilanType } from '../utils/bilanRouter'

export interface EpisodeData {
  db: BilanRecord[]
  dbIntermediaires: BilanIntermediaireRecord[]
  dbNotes: NoteSeanceRecord[]
  dbPrescriptions: PatientPrescription[]
  dbClosedTreatments: ClosedTreatment[]
}

export interface TreatmentEpisode {
  idx: number
  startExclusive: number
  endInclusive: number
  isActive: boolean
  closure?: ClosedTreatment
}

/**
 * Parse une date clinique en ms. Gère le format métier "dd/mm/yyyy" (fr-FR,
 * cf. `parseFrDate` dans App.tsx) ET l'ISO ("yyyy-mm-dd" / ISO complet) par
 * sécurité. Renvoie 0 si vide ou non parsable (le record sera traité comme
 * antérieur à toute clôture — conservateur).
 */
export function parseClinicalDate(raw?: string): number {
  if (!raw) return 0
  if (raw.includes('/')) {
    const [d, m, y] = raw.split('/').map(Number)
    if (d && m && y) {
      const t = new Date(y, m - 1, d).getTime()
      if (!Number.isNaN(t)) return t
    }
    return 0
  }
  const t = Date.parse(raw)
  return Number.isNaN(t) ? 0 : t
}

/**
 * Timestamp (ms) de création d'un record, robuste au round-trip cloud.
 * Ordre : `createdAt` (ISO, indice LOCAL sub-jour) → date clinique parsée
 * (durable, synchronisée, précision au jour) → `id` s'il est déjà à l'échelle
 * ms (record hors-ligne hérité) → 0 (conservateur : antérieur à toute clôture).
 * `createdAt` n'est PAS synchronisé (cf. en-tête) ; la date clinique est le
 * filet durable après tout round-trip cloud.
 */
export function recordCreatedMs(
  r: { createdAt?: string; id: number }, clinicalDate?: string,
): number {
  if (r.createdAt) {
    const t = Date.parse(r.createdAt)
    if (!Number.isNaN(t)) return t
  }
  const clin = parseClinicalDate(clinicalDate)
  if (clin > 0) return clin
  return r.id > 1e12 ? r.id : 0
}

/** Timestamps (ms) des clôtures pour un (patient, bilanType), triés ASC. */
export function getClosureTimes(
  closed: ClosedTreatment[], patientKey: string, bilanType: BilanType,
): number[] {
  return closed
    .filter(c => c.patientKey === patientKey && c.bilanType === bilanType)
    .map(c => new Date(c.closedAt).getTime())
    .sort((a, b) => a - b)
}

const matchesZone = (bt: BilanType | undefined, zone: string | undefined, bilanType: BilanType) =>
  (bt ?? getBilanType(zone ?? '')) === bilanType

/** Existe-t-il un record (bilan/interm/note/presc) créé après `cutoff` (ms) ? */
function hasRecordAfter(
  data: EpisodeData, patientKey: string, bilanType: BilanType, cutoff: number,
): boolean {
  const hitBilan = data.db.some(r =>
    pk(r.nom || 'Anonyme', r.prenom || '') === patientKey
    && matchesZone(r.bilanType, r.zone, bilanType)
    && recordCreatedMs(r, r.dateBilan) > cutoff,
  )
  if (hitBilan) return true
  const hitInter = data.dbIntermediaires.some(r =>
    r.patientKey === patientKey
    && matchesZone(r.bilanType, r.zone, bilanType)
    && recordCreatedMs(r, r.dateBilan) > cutoff,
  )
  if (hitInter) return true
  const hitNote = data.dbNotes.some(n =>
    n.patientKey === patientKey
    && matchesZone(n.bilanType, n.zone, bilanType)
    && recordCreatedMs(n, n.dateSeance) > cutoff,
  )
  if (hitNote) return true
  const rx = data.dbPrescriptions.find(p => p.patientKey === patientKey)
  return (rx?.prescriptions ?? []).some(pr =>
    pr.bilanType === bilanType && recordCreatedMs(pr, pr.datePrescription) > cutoff,
  )
}

/**
 * Un traitement est « clôturé » (épisode courant) SEULEMENT si la dernière
 * clôture n'a été suivie d'aucun nouveau record. Dès qu'un record arrive
 * après la clôture, un nouvel épisode est ouvert → le traitement redevient actif.
 */
export function isTreatmentClosed(
  data: EpisodeData, patientKey: string, bilanType: BilanType,
): boolean {
  const closureTimes = getClosureTimes(data.dbClosedTreatments, patientKey, bilanType)
  if (closureTimes.length === 0) return false
  const latest = closureTimes[closureTimes.length - 1]
  return !hasRecordAfter(data, patientKey, bilanType, latest)
}

/**
 * Une prescription appartient à l'épisode courant si aucune clôture n'a été
 * enregistrée depuis sa création. Sert à séparer prescriptions actives
 * (épisode courant) et archivées (anciens épisodes).
 */
export function isPrescriptionCurrent(
  closed: ClosedTreatment[], patientKey: string, pr: PrescriptionEntry,
): boolean {
  if (!pr.bilanType) return true
  const closureTimes = getClosureTimes(closed, patientKey, pr.bilanType)
  if (closureTimes.length === 0) return true
  return recordCreatedMs(pr, pr.datePrescription) > closureTimes[closureTimes.length - 1]
}

/**
 * Épisodes de PEC pour un (patient, bilanType). Les bornes de fenêtre sont des
 * timestamps de clôture (ms) ; l'appartenance d'un record se teste via
 * `recordCreatedMs(record)` dans `]startExclusive, endInclusive]`.
 * Le dernier épisode actif n'est ajouté que s'il existe au moins un record
 * après la dernière clôture (sinon pas de carte « active » vide).
 */
export function getTreatmentEpisodes(
  data: EpisodeData, patientKey: string, bilanType: BilanType,
): TreatmentEpisode[] {
  const closures = data.dbClosedTreatments
    .filter(c => c.patientKey === patientKey && c.bilanType === bilanType)
    .slice()
    .sort((a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime())
  const eps: TreatmentEpisode[] = []
  let prev = Number.NEGATIVE_INFINITY
  closures.forEach((c, i) => {
    const end = new Date(c.closedAt).getTime()
    eps.push({ idx: i, startExclusive: prev, endInclusive: end, isActive: false, closure: c })
    prev = end
  })
  const cutoff = closures.length > 0
    ? new Date(closures[closures.length - 1].closedAt).getTime()
    : Number.NEGATIVE_INFINITY
  if (closures.length === 0 || hasRecordAfter(data, patientKey, bilanType, cutoff)) {
    eps.push({ idx: eps.length, startExclusive: cutoff, endInclusive: Number.POSITIVE_INFINITY, isActive: true })
  }
  return eps
}
