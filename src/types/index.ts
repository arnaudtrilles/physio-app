export type BilanType = 'epaule' | 'cheville' | 'genou' | 'hanche' | 'cervical' | 'lombaire' | 'generique'

export interface FicheExercice {
  generatedAt: string
  markdown: string
  notesSeance: string
}

export interface BilanDocument {
  name: string
  mimeType: string   // 'image/jpeg' | 'image/png' | 'application/pdf' | etc.
  data: string       // base64 encoded
  addedAt: string    // ISO date
}

export interface BilanRecord {
  id: number
  nom: string
  prenom: string
  dateBilan: string
  dateNaissance: string
  zoneCount: number
  evn?: number
  zone?: string
  pathologie?: string
  avatarBg?: string
  status?: 'incomplet' | 'complet'
  bilanType?: BilanType
  bilanData?: Record<string, unknown>
  notes?: string
  silhouetteData?: Record<string, unknown>
  documents?: BilanDocument[]
  analyseIA?: AnalyseIA
  ficheExercice?: FicheExercice
}

export interface AnalyseIA {
  generatedAt: string
  diagnostic: { titre: string; description: string }
  hypotheses: Array<{ rang: number; titre: string; probabilite: number; justification: string }>
  priseEnCharge: Array<{ phase: string; titre: string; detail: string }>
  alertes: string[]
}

export interface AnalyseIAIntermediaire {
  generatedAt: string
  noteDiagnostique: { titre: string; evolution: string; description: string }
  priseEnChargeAjustee: Array<{ point: string }>
  alertes: string[]
}

export interface BilanIntermediaireRecord {
  id: number
  patientKey: string
  nom: string
  prenom: string
  dateNaissance: string
  dateBilan: string
  zone?: string
  bilanType?: BilanType
  avatarBg?: string
  data?: Record<string, unknown>
  status?: 'incomplet' | 'complet'
  notes?: string
  analyseIA?: AnalyseIAIntermediaire
}

export interface AnalyseSeanceMini {
  generatedAt: string
  resume: string
  evolution: string
  vigilance: string[]
  focus: string
  conseil: string
}

export interface NoteSeanceRecord {
  id: number
  patientKey: string
  nom: string
  prenom: string
  dateNaissance: string
  dateSeance: string
  numSeance: string
  zone?: string
  bilanType?: BilanType
  avatarBg?: string
  data: {
    eva: string
    observance: string
    evolution: string
    noteSubjective: string
    interventions: string[]
    detailDosage: string
    tolerance: string
    toleranceDetail: string
    prochaineEtape: string[]
    notePlan: string
  }
  analyseIA?: AnalyseSeanceMini
}

export interface SmartObjectif {
  id: number
  patientKey: string
  zone: string
  titre: string
  cible: string        // ex: "Flexion genou > 120°"
  dateCible: string    // dd/mm/yyyy
  status: 'en_cours' | 'atteint' | 'non_atteint'
  createdAt: string
}

export interface ProfileData {
  nom: string
  prenom: string
  profession: string
  photo: string | null
  specialites?: string[]
  techniques?: string[]
  equipements?: string[]
  autresCompetences?: string
}

export interface EvolutionIA {
  generatedAt: string
  resume: string
  tendance: 'amelioration' | 'stationnaire' | 'regression' | 'mixte'
  progression: Array<{ bilanNum: number; date: string; evn: number | null; commentaire: string }>
  pointsForts: string[]
  pointsVigilance: string[]
  recommandations: Array<{ titre: string; detail: string }>
  conclusion: string
}
