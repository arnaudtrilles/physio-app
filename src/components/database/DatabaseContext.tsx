import { createContext, useContext } from 'react'
import type { CSSProperties, Dispatch, MutableRefObject, ReactNode, SetStateAction, TouchEvent } from 'react'
import type {
  AICallAuditEntry,
  AnalyseIA,
  BilanDocument,
  BilanIntermediaireRecord,
  BilanRecord,
  BilanType,
  ClosedTreatment,
  NoteSeanceRecord,
  PatientDocument,
  PatientPrescription,
  PrescriptionEntry,
  SmartObjectif,
} from '../../types'
import type { NoteSeanceData } from '../NoteSeance'

export type Step =
  | 'dashboard'
  | 'database'
  | 'profile'
  | 'settings'
  | 'pricing'
  | 'identity'
  | 'bilan_zone'
  | 'bilan_intermediaire'
  | 'note_intermediaire'
  | 'note_seance'
  | 'pdf_preview'
  | 'analyse_ia'
  | 'evolution_ia'
  | 'fiche_exercice'
  | 'letter'
  | 'bilan_sortie'

export type TreatmentEpisode = {
  idx: number
  startExclusive: number
  endInclusive: number
  isActive: boolean
  closure?: ClosedTreatment
}

export type RxDoc = { data: string; mimeType: string; name: string }
export type MaskingItem = { dataUrl: string; name: string; mimeType: string }
export type RxEditPopupState = { mode: 'add' | 'edit'; entry?: PrescriptionEntry } | null
export type RxEditFormState = {
  nbSeances: string
  prescripteur: string
  datePrescription: string
  seancesAnterieures: string
  bilanType: BilanType | ''
  customLabel: string
}
export type FicheExerciceContext = {
  notesLibres: string
  bilanData: Record<string, unknown>
  zone: string
}
export type FicheExerciceSource = { type: 'note' | 'intermediaire'; id: number }
export type FormDataValue = {
  nom: string
  prenom: string
  dateNaissance: string
  sexe: '' | 'masculin' | 'feminin'
  profession: string
  sport: string
  famille: string
  chirurgie: string
  notes: string
}
export type LetterZonePickerAction = {
  action: 'letter' | 'bilan_sortie' | 'seance' | 'intermediaire'
} | null
export type ResumeBilanState = { record: BilanRecord; bilanNum: number } | null

export interface DatabaseContextValue {
  // ── State (read-only values) ──────────────────────────────────────────────
  apiKey: string
  consultationChooserOpen: boolean
  db: BilanRecord[]
  dbIntermediaires: BilanIntermediaireRecord[]
  dbNotes: NoteSeanceRecord[]
  expandedClosedEpisodes: Set<string>
  exportingRecordId: number | null
  editingLabelBilanId: number | null
  labelDraft: string
  openAnalyseNoteIds: Set<number>
  openNoteDetailIds: Set<number>
  openTimelineKey: string | null
  orphanPopupOpen: boolean
  rxDocViewer: RxDoc | null
  rxEditDoc: RxDoc | null
  rxEditForm: RxEditFormState
  rxEditPopup: RxEditPopupState
  rxGroupPicker: (PrescriptionEntry & { done: number })[] | null
  searchQuery: string
  selectedPatient: string | null
  slideEntry: 'from-left' | 'from-right' | null
  slideEntryStyle: CSSProperties
  swipeDragStyle: CSSProperties
  swipedNav: MutableRefObject<boolean>
  dbObjectifs: SmartObjectif[]
  dbPatientDocs: PatientDocument[]
  dbPrescriptions: PatientPrescription[]

  // ── Setters ──────────────────────────────────────────────────────────────
  setBilanDocuments: Dispatch<SetStateAction<BilanDocument[]>>
  setBilanIntermediaireZone: Dispatch<SetStateAction<string | null>>
  setBilanNotes: Dispatch<SetStateAction<string>>
  setBilanZoneBackStep: Dispatch<SetStateAction<'identity' | 'database'>>
  setConsultationChooserOpen: Dispatch<SetStateAction<boolean>>
  setCurrentAnalyseIA: Dispatch<SetStateAction<AnalyseIA | null>>
  setCurrentBilanDataOverride: Dispatch<SetStateAction<Record<string, unknown> | null>>
  setCurrentBilanId: Dispatch<SetStateAction<number | null>>
  setCurrentBilanIntermediaireData: Dispatch<SetStateAction<Record<string, unknown> | null>>
  setCurrentBilanIntermediaireId: Dispatch<SetStateAction<number | null>>
  setCurrentNoteSeanceData: Dispatch<SetStateAction<NoteSeanceData | null>>
  setCurrentNoteSeanceId: Dispatch<SetStateAction<number | null>>
  setDb: Dispatch<SetStateAction<BilanRecord[]>>
  setDbNotes: Dispatch<SetStateAction<NoteSeanceRecord[]>>
  setDbObjectifs: Dispatch<SetStateAction<SmartObjectif[]>>
  setDbPatientDocs: Dispatch<SetStateAction<PatientDocument[]>>
  setDbPrescriptions: Dispatch<SetStateAction<PatientPrescription[]>>
  setDeletingBilanId: Dispatch<SetStateAction<number | null>>
  setDeletingIntermediaireId: Dispatch<SetStateAction<number | null>>
  setDeletingNoteSeanceId: Dispatch<SetStateAction<number | null>>
  setDeletingPatientKey: Dispatch<SetStateAction<string | null>>
  setEditingLabelBilanId: Dispatch<SetStateAction<number | null>>
  setEvolutionZoneType: Dispatch<SetStateAction<BilanType | null>>
  setExpandedClosedEpisodes: Dispatch<SetStateAction<Set<string>>>
  setFicheBackStep: Dispatch<SetStateAction<'analyse_ia' | 'database'>>
  setFicheExerciceContextOverride: Dispatch<SetStateAction<FicheExerciceContext | null>>
  setFicheExerciceSource: Dispatch<SetStateAction<FicheExerciceSource | null>>
  setFormData: Dispatch<SetStateAction<FormDataValue>>
  setLabelDraft: Dispatch<SetStateAction<string>>
  setLetterZonePicker: Dispatch<SetStateAction<LetterZonePickerAction>>
  setNoteSeanceZone: Dispatch<SetStateAction<string | null>>
  setOpenAnalyseNoteIds: Dispatch<SetStateAction<Set<number>>>
  setOpenNoteDetailIds: Dispatch<SetStateAction<Set<number>>>
  setOrphanPopupOpen: Dispatch<SetStateAction<boolean>>
  setPatientDocMaskingQueue: Dispatch<SetStateAction<MaskingItem[]>>
  setPatientMode: Dispatch<SetStateAction<'new' | 'existing'>>
  setResumeBilan: Dispatch<SetStateAction<ResumeBilanState>>
  setRxDocViewer: Dispatch<SetStateAction<RxDoc | null>>
  setRxEditDoc: Dispatch<SetStateAction<RxDoc | null>>
  setRxEditForm: Dispatch<SetStateAction<RxEditFormState>>
  setRxEditPopup: Dispatch<SetStateAction<RxEditPopupState>>
  setRxGroupPicker: Dispatch<SetStateAction<(PrescriptionEntry & { done: number })[] | null>>
  setRxMaskingItem: Dispatch<SetStateAction<MaskingItem | null>>
  setSearchQuery: Dispatch<SetStateAction<string>>
  setSelectedBodyZone: Dispatch<SetStateAction<string | null>>
  setSelectedPatient: Dispatch<SetStateAction<string | null>>
  setShowAddPatientChoice: Dispatch<SetStateAction<boolean>>
  setSilhouetteData: Dispatch<SetStateAction<Record<string, unknown>>>
  setStep: Dispatch<SetStateAction<Step>>

  // ── Helpers ──────────────────────────────────────────────────────────────
  closeTreatment: (patientKey: string, bilanType: BilanType, zone?: string) => void
  deleteClosedEpisode: (patientKey: string, bilanType: BilanType, ep: TreatmentEpisode) => void
  exportBilanFromRecord: (record: BilanRecord, isIntermediaire?: boolean) => Promise<void>
  getClosureTimes: (patientKey: string, bilanType: BilanType) => number[]
  getIntermediairePreFill: (patKey: string, zone: string) => Record<string, unknown>
  getPatientBilans: (key: string) => BilanRecord[]
  getPatientBilanTypes: (patientKey: string) => BilanType[]
  getPatientIntermediaires: (key: string) => BilanIntermediaireRecord[]
  getPatientNotes: (key: string) => NoteSeanceRecord[]
  getTreatmentEpisodes: (patientKey: string, bilanType: BilanType) => TreatmentEpisode[]
  improvDelta: (prev: number, curr: number) => number
  isBirthday: (dateNaissance?: string) => boolean
  isPrescriptionCurrent: (patientKey: string, pr: PrescriptionEntry) => boolean
  isTreatmentClosed: (patientKey: string, bilanType: BilanType) => boolean
  isZoneCollapsed: (patientKey: string, bilanType: BilanType) => boolean
  openNoteIntermediaire: (rec: BilanIntermediaireRecord) => void
  parseFrDate: (raw: string | undefined) => number
  patientGeneralScore: (key: string) => number | null
  recordAIAudit: (entry: AICallAuditEntry) => void
  reopenTreatment: (_patientKey: string, _bilanType: BilanType, ep: TreatmentEpisode) => void
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  stripMd: (s: string) => string
  toggleTimeline: (key: string) => void
  toggleZoneCollapsed: (patientKey: string, bilanType: BilanType) => void

  // ── Touch handlers ───────────────────────────────────────────────────────
  onTouchEnd: (e: TouchEvent) => void
  onTouchMove: (e: TouchEvent) => void
  onTouchStart: (e: TouchEvent) => void
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null)

export function DatabaseProvider({ value, children }: { value: DatabaseContextValue; children: ReactNode }) {
  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>
}

export function useDatabaseContext(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext)
  if (!ctx) throw new Error('useDatabaseContext must be used within a DatabaseProvider')
  return ctx
}
