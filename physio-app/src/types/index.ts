export type BilanType = 'epaule' | 'cheville' | 'genou' | 'hanche' | 'cervical' | 'lombaire' | 'generique'

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
  analyseIA?: AnalyseIA
}

export interface AnalyseIA {
  generatedAt: string
  diagnostic: { titre: string; description: string }
  hypotheses: Array<{ rang: number; titre: string; probabilite: number; justification: string }>
  priseEnCharge: Array<{ phase: string; titre: string; detail: string }>
  alertes: string[]
}

export interface ProfileData {
  nom: string
  prenom: string
  profession: string
  photo: string | null
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
