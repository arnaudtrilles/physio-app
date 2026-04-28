export type BilanType = 'epaule' | 'cheville' | 'genou' | 'hanche' | 'cervical' | 'lombaire' | 'generique' | 'geriatrique'

/**
 * Interface impérative exposée par tous les composants Bilan via forwardRef.
 * Utilisée par App.tsx pour sauvegarder / restaurer l'état d'un bilan.
 */
export interface BilanHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

/**
 * Marque la clôture d'une prise en charge pour un patient sur une zone (bilanType).
 * Tant qu'une PEC n'est pas clôturée, elle est considérée active. Les analyses IA
 * (séance, intermédiaire, initial, évolution, courrier) ne doivent utiliser que
 * l'historique de la zone en cours ; les zones clôturées n'apparaissent aux
 * analyses d'autres zones que sous forme d'antécédent résumé (1 ligne).
 */
export interface ClosedTreatment {
  id: number
  patientKey: string
  bilanType: BilanType
  zone?: string
  closedAt: string        // ISO
  note?: string           // note de clôture optionnelle
}

export interface FicheExercice {
  generatedAt: string
  markdown: string
  notesSeance: string
}

export interface BilanDocument {
  name: string
  mimeType: string   // 'image/jpeg' | 'image/png' | 'application/pdf' | etc.
  data: string       // base64 encoded (version caviardée si masked=true)
  originalData?: string // base64 de l'original non caviardé (pour affichage/impression)
  addedAt: string    // ISO date
  /**
   * true si le document a été passé par DocumentMasker (identifiants patient
   * masqués manuellement). false / absent = document brut, dangereux à envoyer
   * à l'IA tel quel. Le wrapper callClaudeSecure vérifie ce flag.
   */
  masked?: boolean
}

export interface PatientDocument {
  id: string
  patientKey: string
  name: string
  mimeType: string
  data: string       // base64 encoded (version caviardée si masked=true)
  originalData?: string // base64 de l'original non caviardé
  addedAt: string
  masked?: boolean
}

export type Sexe = 'masculin' | 'feminin'

export interface BilanRecord {
  id: number
  nom: string
  prenom: string
  dateBilan: string
  dateNaissance: string
  sexe?: Sexe
  zoneCount: number
  evn?: number
  zone?: string
  pathologie?: string
  avatarBg?: string
  status?: 'incomplet' | 'complet'
  customLabel?: string
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
  priseEnCharge: Array<{ phase: string; titre: string; detail: string; points?: string[] }>
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
  ficheExercice?: FicheExercice
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
    exercicesDomicile?: {
      nom: string
      fait: boolean
      categorie?: string
      protocole?: { series?: string; tempsOuReps?: string; recuperation?: string; frequence?: string }
      description?: string
      source?: 'manuel' | 'ia'
    }[]
  }
  analyseIA?: AnalyseSeanceMini
  ficheExercice?: FicheExercice
}

export interface BanqueExerciceEntry {
  id: string
  name: string
  zone: string
  markdown: string
  source: 'ia' | 'manuel'
  usageCount: number
  createdAt: string
}

export interface ExerciceBankEntry {
  id: string               // hash/slug du nom
  nom: string
  zone: string             // ex: "Épaule", "Genou"
  bilanType: string        // ex: "epaule"
  objectif: string
  positionDepart: string
  mouvement: string        // concaténation des étapes
  dosage: string
  limiteSecurite: string
  firstSeenAt: string      // ISO date
  lastSeenAt: string       // ISO date
  occurrences: number
}

export interface PrescriptionEntry {
  id: number
  nbSeances: number
  datePrescription: string   // dd/mm/yyyy
  prescripteur: string
  /** Photo ou scan de l'ordonnance (base64) */
  document?: { data: string; mimeType: string; name: string }
  /** Type de bilan/zone couvert par cette prescription. Si absent → globale (compat). */
  bilanType?: BilanType
  /** Libellé personnalisé (utile pour renommer "Autres bilans" en ex: "ATM"). */
  customLabel?: string
}

export interface PatientPrescription {
  patientKey: string
  prescriptions: PrescriptionEntry[]
  /** Séances effectuées avant l'application */
  seancesAnterieures?: number
  /** @deprecated — compat ancien format mono-prescription */
  nbSeancesPrescrites?: number
  datePrescription?: string
  prescripteur?: string
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
  // ── Infos praticien pour en-tête des courriers ─────────────────────────────
  rcc?: string               // Numéro RCC / ADELI
  adresse?: string           // Rue + n°
  adresseComplement?: string // Bâtiment / étage (optionnel)
  codePostal?: string
  ville?: string
  telephone?: string
  email?: string
  signatureImage?: string | null // base64 PNG de la signature manuscrite
  specialisationsLibelle?: string // ex: "Thérapie manuelle, Rééducation du sportif"
}

export type LetterType =
  | 'fin_pec'
  | 'fin_pec_anticipee'
  | 'demande_avis'
  | 'demande_imagerie'
  | 'demande_prescription'
  | 'suivi'
  | 'echec_pec'

export interface LetterFormData {
  // Champs communs
  titreDestinataire: string     // Docteur / Cher confrère / Chère consœur
  nomDestinataire: string        // ex: Dr DUPONT
  civilitePatient: string        // M. / Mme
  nomPatient: string
  prenomPatient: string
  dateNaissancePatient?: string
  indication: string
  dateDebutPec?: string
  dateFinPec?: string
  frequence?: string
  nbSeances?: string
  // Champs variables selon le type (stockés librement)
  resumeBilanInitial?: string
  traitement?: string
  resultats?: string
  recommandations?: string
  suite?: string
  raisonArret?: string
  etatActuel?: string
  typePro?: string
  resumePec?: string
  raisonOrientation?: string
  accordPatient?: string
  nomProRecommande?: string
  typeImagerie?: string
  zoneAnatomique?: string
  justification?: string
  antecedents?: string
  natureDemande?: string
  indication1?: string
  indication2?: string
  typeDest?: string              // médecin / confrère
  dateBilanInterm?: string
  evolution?: string
  pointsPositifs?: string
  difficultes?: string
  traitementsEssayes?: string
  constat?: string
  scoresFonctionnels?: string
  orientation?: string
  avisPersonnel?: string
}

export interface LetterRecord {
  id: number
  patientKey: string
  type: LetterType
  createdAt: string            // ISO
  updatedAt: string            // ISO
  formData: LetterFormData
  contenu: string              // Texte généré (éditable). Vide si brouillon non généré.
  titreAffichage: string       // ex: "Fin de PEC — Dr DUPONT — 11/04/2026"
  status: 'brouillon' | 'final'
}

/**
 * Journal d'audit des traitements IA pour traçabilité RGPD.
 * Une entrée est créée à chaque appel effectif à Claude pour générer un courrier.
 * Contient uniquement des métadonnées non-identifiantes ; jamais le contenu du courrier.
 */
export interface LetterAuditEntry {
  id: number
  timestamp: string                    // ISO
  letterId: number                     // id du LetterRecord associé
  patientKey: string                   // pour rattacher l'entrée au patient (usage interne)
  type: LetterType
  pseudonymized: boolean               // toujours true en l'état, documenté pour le futur
  piiWarningsCount: number             // combien d'alertes PII le praticien a vues avant validation
  modelUsed: string                    // ex: "claude-sonnet-4-6"
  resultLength: number                 // taille du texte généré (caractères)
}

/**
 * Journal d'audit générique pour tous les appels IA (bilan, évolution, intermédiaire,
 * fiche exercice, PDF, mini analyse, courrier). Complémentaire à LetterAuditEntry.
 */
export type AICallCategory =
  | 'letter'                  // LetterGenerator
  | 'bilan_analyse'           // BilanAnalyseIA
  | 'bilan_analyse_refine'    // BilanAnalyseIA — correction thérapeute
  | 'bilan_evolution'         // BilanEvolutionIA
  | 'bilan_intermediaire'     // BilanNoteIntermediaire
  | 'fiche_exercice'          // FicheExerciceIA
  | 'pdf_bilan'               // Export PDF avec mise au propre IA
  | 'pdf_analyse'             // Export PDF depuis la page Analyse
  | 'note_seance_mini'        // Mini-analyse de note de séance
  | 'api_key_test'            // Ping de test de clé API

export interface AICallAuditEntry {
  id: number
  timestamp: string              // ISO
  category: AICallCategory
  patientKey: string              // clé interne (non envoyée à l'IA)
  pseudonymized: boolean          // true si le prompt a été scrubbed avant envoi
  scrubReplacements: number       // nombre de tokens remplacés par le scrub final (alerte si > 0)
  hasDocuments: boolean           // true si des pièces jointes ont été envoyées
  documentsCount: number          // nombre total de documents envoyés
  documentsUnmasked: number       // nombre de documents non masqués (risque d'identification)
  modelUsed: string
  promptLength: number            // taille du prompt envoyé (caractères)
  resultLength: number            // taille de la réponse (caractères)
  success: boolean
}

export interface EvolutionIA {
  generatedAt: string
  /** Résumé clinique global 3-4 phrases (synthèse narrative). */
  resume: string
  tendance: 'amelioration' | 'stationnaire' | 'regression' | 'mixte'
  /** Tableau clinique initial (prose médicale, 3-5 phrases). */
  tableauInitial?: string
  /** Évolution clinique structurée (4 sous-blocs narratifs). */
  evolutionClinique?: {
    syntheseGlobale: string
    evolutionSymptomatique: string
    evolutionFonctionnelle: string
    evolutionObjective: string
  }
  progression: Array<{ bilanNum: number; date: string; evn: number | null; commentaire: string; etape?: string }>
  /** Interventions réalisées au fil de la PEC (3 sous-blocs). */
  interventionsRealisees?: {
    techniquesManuelles: string
    exercicesProgrammes: string
    educationConseils: string
  }
  /** État clinique actuel (symptômes, fonctionnel, objectif). */
  etatActuel?: {
    symptomes: string
    fonctionnel: string
    objectif: string
  }
  pointsForts: string[]
  pointsVigilance: string[]
  recommandations: Array<{ titre: string; detail: string }>
  conclusion: string
}
