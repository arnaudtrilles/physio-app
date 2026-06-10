import { describe, it, expect } from 'vitest'
import {
  recordCreatedMs, parseClinicalDate, getClosureTimes, isTreatmentClosed,
  isPrescriptionCurrent, getTreatmentEpisodes,
} from './treatmentEpisodes'
import type { EpisodeData } from './treatmentEpisodes'
import { pk } from './syncEngine'
import type {
  BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord,
  ClosedTreatment, PrescriptionEntry, PatientPrescription,
} from '../types'

// Logique d'épisodes de PEC. Le bug historique : l'appartenance d'un record à
// un épisode se testait via `record.id > closureMs`. Les bilans ont un PETIT
// entier comme id (jamais > 1.7e12) → un traitement clôturé ne se rouvrait
// jamais à l'ajout d'un bilan ; et après synchro TOUS les ids deviennent des
// BIGSERIAL (petits entiers) → la comparaison cassait pour interms/notes aussi.
//
// Correctif (cf. treatmentEpisodes.ts) : on compare des timestamps de création.
// `createdAt` (indice LOCAL sub-jour) sert quand il est là, MAIS il n'est PAS
// synchronisé. Le signal DURABLE qui survit au round-trip cloud est la DATE
// CLINIQUE (dateBilan/dateSeance/datePrescription, format "dd/mm/yyyy" en prod).
// Ces tests encodent ce comportement ; ils échoueraient contre l'ancienne
// logique id-based (= régression verrouillée), et le bloc « durable » prouve que
// le fix tient même quand `createdAt` a disparu (après synchro).

const PATIENT = 'DUPONT Jean'
const ZONE = 'epaule' as const

const emptyData = (): EpisodeData => ({
  db: [], dbIntermediaires: [], dbNotes: [], dbPrescriptions: [], dbClosedTreatments: [],
})

// Dates cliniques par défaut en "dd/mm/yyyy" (= format prod, toLocaleDateString
// fr-FR), toutes ANTÉRIEURES à TCLOSE. Le 3e param permet de surcharger la date
// clinique pour tester le chemin durable (sans createdAt).
const bilan = (id: number, createdAt?: string, dateBilan = '01/01/2024'): BilanRecord => ({
  id, nom: 'Dupont', prenom: 'Jean', dateBilan, dateNaissance: '1990-01-01',
  zoneCount: 1, bilanType: 'epaule', ...(createdAt ? { createdAt } : {}),
} as BilanRecord)

const interm = (id: number, createdAt?: string, dateBilan = '01/02/2024'): BilanIntermediaireRecord => ({
  id, patientKey: PATIENT, nom: 'Dupont', prenom: 'Jean', dateNaissance: '1990-01-01',
  dateBilan, bilanType: 'epaule', ...(createdAt ? { createdAt } : {}),
} as BilanIntermediaireRecord)

const note = (id: number, createdAt?: string, dateSeance = '01/02/2024'): NoteSeanceRecord => ({
  id, patientKey: PATIENT, nom: 'Dupont', prenom: 'Jean', dateNaissance: '1990-01-01',
  dateSeance, numSeance: '1', bilanType: 'epaule',
  ...(createdAt ? { createdAt } : {}),
} as NoteSeanceRecord)

const closure = (id: number, closedAt: string): ClosedTreatment => ({
  id, patientKey: PATIENT, bilanType: 'epaule', closedAt,
})

const presc = (id: number, createdAt?: string, datePrescription = '01/01/2024'): PrescriptionEntry => ({
  id, nbSeances: 10, datePrescription, prescripteur: 'Dr X', bilanType: 'epaule',
  ...(createdAt ? { createdAt } : {}),
})

const prescBundle = (entries: PrescriptionEntry[]): PatientPrescription => ({
  patientKey: PATIENT, nom: 'Dupont', prenom: 'Jean', prescriptions: entries,
} as PatientPrescription)

const T0 = '2024-01-01T08:00:00.000Z'   // avant clôture
const TCLOSE = '2024-03-01T10:00:00.000Z'
const TAFTER = '2024-04-01T09:00:00.000Z' // après clôture
const DATE_AFTER = '01/04/2024'           // date clinique après clôture (dd/mm/yyyy)

describe('parseClinicalDate', () => {
  it('format métier dd/mm/yyyy → ms (minuit local)', () => {
    expect(parseClinicalDate('15/03/2024')).toBe(new Date(2024, 2, 15).getTime())
  })
  it('format ISO yyyy-mm-dd → ms', () => {
    expect(parseClinicalDate('2024-03-15')).toBe(Date.parse('2024-03-15'))
  })
  it('vide ou undefined → 0', () => {
    expect(parseClinicalDate('')).toBe(0)
    expect(parseClinicalDate(undefined)).toBe(0)
  })
  it('non parsable → 0', () => {
    expect(parseClinicalDate('garbage')).toBe(0)
    expect(parseClinicalDate('pas/une/date')).toBe(0)
  })
})

describe('recordCreatedMs', () => {
  it('utilise createdAt (ISO) quand présent', () => {
    expect(recordCreatedMs({ id: 5, createdAt: TAFTER })).toBe(Date.parse(TAFTER))
  })
  it('fallback : date clinique dd/mm/yyyy quand pas de createdAt', () => {
    expect(recordCreatedMs({ id: 5 }, '15/03/2024')).toBe(new Date(2024, 2, 15).getTime())
  })
  it('fallback : date clinique ISO quand pas de createdAt', () => {
    expect(recordCreatedMs({ id: 5 }, '2024-03-15')).toBe(Date.parse('2024-03-15'))
  })
  it('createdAt prioritaire sur la date clinique', () => {
    expect(recordCreatedMs({ id: 5, createdAt: TAFTER }, '01/01/2020')).toBe(Date.parse(TAFTER))
  })
  it('date clinique prioritaire sur l\'id-ms (record durable post-sync)', () => {
    const ms = 1_700_000_000_000
    expect(recordCreatedMs({ id: ms }, '15/03/2024')).toBe(new Date(2024, 2, 15).getTime())
  })
  it('fallback : id seulement s\'il est déjà à l\'échelle ms (hors-ligne, aucune date clinique)', () => {
    const ms = 1_700_000_000_000
    expect(recordCreatedMs({ id: ms })).toBe(ms)
  })
  it('fallback : petit id (bilan / BIGSERIAL) sans date clinique → 0 (conservateur)', () => {
    expect(recordCreatedMs({ id: 5 })).toBe(0)
    expect(recordCreatedMs({ id: 42 })).toBe(0)
  })
  it('createdAt invalide + aucune date clinique → fallback id', () => {
    expect(recordCreatedMs({ id: 7, createdAt: 'pas une date' })).toBe(0)
  })
  it('aucun signal exploitable → 0', () => {
    expect(recordCreatedMs({ id: 5 }, '')).toBe(0)
  })
})

describe('getClosureTimes', () => {
  it('renvoie les ms triés pour le bon (patient, bilanType)', () => {
    const closed = [closure(2, TCLOSE), closure(1, T0)]
    expect(getClosureTimes(closed, PATIENT, ZONE)).toEqual([Date.parse(T0), Date.parse(TCLOSE)])
  })
  it('ignore un autre bilanType', () => {
    const other: ClosedTreatment = { id: 9, patientKey: PATIENT, bilanType: 'genou', closedAt: TCLOSE }
    expect(getClosureTimes([other], PATIENT, ZONE)).toEqual([])
  })
})

describe('isTreatmentClosed', () => {
  it('aucune clôture → non clôturé', () => {
    const data = emptyData()
    data.db = [bilan(1, T0)]
    expect(isTreatmentClosed(data, PATIENT, ZONE)).toBe(false)
  })

  it('clôture sans record postérieur → clôturé', () => {
    const data = emptyData()
    data.db = [bilan(1, T0)]
    data.dbClosedTreatments = [closure(100, TCLOSE)]
    expect(isTreatmentClosed(data, PATIENT, ZONE)).toBe(true)
  })

  // ⚠️ RÉGRESSION bug-2 : un BILAN avec petit id créé APRÈS la clôture doit
  // rouvrir le traitement. L'ancienne logique (bilan.id > closureMs) renvoyait
  // toujours `true` ici (5 > 1.7e12 = false) → traitement jamais rouvert.
  it('clôture PUIS nouveau bilan (petit id) postérieur → rouvert', () => {
    const data = emptyData()
    data.db = [bilan(1, T0), bilan(2, TAFTER)]
    data.dbClosedTreatments = [closure(100, TCLOSE)]
    expect(isTreatmentClosed(data, PATIENT, ZONE)).toBe(false)
  })

  it('clôture PUIS nouvelle note postérieure → rouvert', () => {
    const data = emptyData()
    data.db = [bilan(1, T0)]
    data.dbNotes = [note(2, TAFTER)]
    data.dbClosedTreatments = [closure(100, TCLOSE)]
    expect(isTreatmentClosed(data, PATIENT, ZONE)).toBe(false)
  })

  it('clôture PUIS nouvelle prescription postérieure → rouvert', () => {
    const data = emptyData()
    data.db = [bilan(1, T0)]
    data.dbPrescriptions = [prescBundle([presc(2, TAFTER)])]
    data.dbClosedTreatments = [closure(100, TCLOSE)]
    expect(isTreatmentClosed(data, PATIENT, ZONE)).toBe(false)
  })

  // === Chemin DURABLE : createdAt absent (= état après synchro cloud, où le
  // champ n'est pas renvoyé), seule la date clinique fait foi. C'est le cœur
  // du correctif : il doit tenir une fois le record passé par le cloud. ===
  it('record SANS createdAt, date clinique APRÈS clôture → rouvert (durable post-sync)', () => {
    const data = emptyData()
    data.db = [bilan(1, T0), bilan(2, undefined, DATE_AFTER)]
    data.dbClosedTreatments = [closure(100, TCLOSE)]
    expect(isTreatmentClosed(data, PATIENT, ZONE)).toBe(false)
  })

  it('note SANS createdAt, date de séance APRÈS clôture → rouvert (durable post-sync)', () => {
    const data = emptyData()
    data.db = [bilan(1, T0)]
    data.dbNotes = [note(2, undefined, DATE_AFTER)]
    data.dbClosedTreatments = [closure(100, TCLOSE)]
    expect(isTreatmentClosed(data, PATIENT, ZONE)).toBe(false)
  })

  // Record sans createdAt dont la date clinique est ANTÉRIEURE à la clôture →
  // reste clôturé (l'ancien record n'a pas à rouvrir une PEC). Zéro régression.
  it('record sans createdAt, date clinique antérieure → reste clôturé', () => {
    const data = emptyData()
    data.db = [bilan(1, T0), bilan(2)] // bilan(2): dateBilan 01/01/2024 < clôture
    data.dbClosedTreatments = [closure(100, TCLOSE)]
    expect(isTreatmentClosed(data, PATIENT, ZONE)).toBe(true)
  })

  // Dernier recours : ni createdAt ni date clinique exploitable, mais un id déjà
  // à l'échelle ms (record hors-ligne hérité) → on l'utilise → rouvert.
  it('record hors-ligne (id ms, aucune date clinique) après clôture → rouvert', () => {
    const data = emptyData()
    data.db = [bilan(1, T0)]
    const orphan = {
      id: Date.parse(TAFTER), patientKey: PATIENT, nom: 'Dupont', prenom: 'Jean',
      dateNaissance: '1990-01-01', dateSeance: '', numSeance: '1', bilanType: 'epaule',
    } as NoteSeanceRecord
    data.dbNotes = [orphan]
    data.dbClosedTreatments = [closure(100, TCLOSE)]
    expect(isTreatmentClosed(data, PATIENT, ZONE)).toBe(false)
  })
})

describe('isPrescriptionCurrent', () => {
  it('prescription sans bilanType → toujours courante', () => {
    const pr: PrescriptionEntry = { id: 1, nbSeances: 5, datePrescription: '01/01/2024', prescripteur: 'Dr X' }
    expect(isPrescriptionCurrent([], PATIENT, pr)).toBe(true)
  })
  it('aucune clôture → courante', () => {
    expect(isPrescriptionCurrent([], PATIENT, presc(1, T0))).toBe(true)
  })
  it('prescription postérieure à la clôture → courante', () => {
    expect(isPrescriptionCurrent([closure(100, TCLOSE)], PATIENT, presc(1, TAFTER))).toBe(true)
  })
  it('prescription antérieure à la clôture → archivée', () => {
    expect(isPrescriptionCurrent([closure(100, TCLOSE)], PATIENT, presc(1, T0))).toBe(false)
  })
  it('prescription sans createdAt, date après clôture → courante (durable post-sync)', () => {
    expect(isPrescriptionCurrent([closure(100, TCLOSE)], PATIENT, presc(1, undefined, DATE_AFTER))).toBe(true)
  })
})

describe('getTreatmentEpisodes', () => {
  it('aucune clôture → un seul épisode actif', () => {
    const data = emptyData()
    data.db = [bilan(1, T0)]
    const eps = getTreatmentEpisodes(data, PATIENT, ZONE)
    expect(eps).toHaveLength(1)
    expect(eps[0].isActive).toBe(true)
  })

  it('une clôture + record postérieur → 1 clôturé + 1 actif', () => {
    const data = emptyData()
    data.db = [bilan(1, T0), bilan(2, TAFTER)]
    data.dbClosedTreatments = [closure(100, TCLOSE)]
    const eps = getTreatmentEpisodes(data, PATIENT, ZONE)
    expect(eps).toHaveLength(2)
    expect(eps[0].isActive).toBe(false)
    expect(eps[0].closure?.id).toBe(100)
    expect(eps[1].isActive).toBe(true)
  })

  it('une clôture + record postérieur SANS createdAt (date clinique) → 1 clôturé + 1 actif', () => {
    const data = emptyData()
    data.db = [bilan(1, T0), bilan(2, undefined, DATE_AFTER)]
    data.dbClosedTreatments = [closure(100, TCLOSE)]
    const eps = getTreatmentEpisodes(data, PATIENT, ZONE)
    expect(eps).toHaveLength(2)
    expect(eps[1].isActive).toBe(true)
  })

  it('une clôture SANS record postérieur → un seul épisode (pas d\'actif vide)', () => {
    const data = emptyData()
    data.db = [bilan(1, T0)]
    data.dbClosedTreatments = [closure(100, TCLOSE)]
    const eps = getTreatmentEpisodes(data, PATIENT, ZONE)
    expect(eps).toHaveLength(1)
    expect(eps[0].isActive).toBe(false)
  })

  it('le record postérieur tombe dans la fenêtre de l\'épisode actif', () => {
    const data = emptyData()
    data.db = [bilan(1, T0), bilan(2, TAFTER)]
    data.dbClosedTreatments = [closure(100, TCLOSE)]
    const eps = getTreatmentEpisodes(data, PATIENT, ZONE)
    const active = eps.find(e => e.isActive)!
    const created = recordCreatedMs(bilan(2, TAFTER))
    expect(created > active.startExclusive && created <= active.endInclusive).toBe(true)
  })
})

describe('cohérence pk (clé patient des bilans)', () => {
  it('un bilan est rattaché via pk(nom, prenom)', () => {
    expect(pk('Dupont', 'Jean')).toBe(PATIENT)
  })
})
