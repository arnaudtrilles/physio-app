export type BilanType = 'epaule' | 'cheville' | 'genou' | 'hanche' | 'cervical' | 'lombaire' | 'generique' | 'geriatrique' | 'drainage-lymphatique'

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
  /**
   * Chemin Supabase Storage du blob binaire (bucket `patient-docs`).
   * Présent dès que le binaire a été uploadé. Permet de re-télécharger
   * la version cross-device si `data` est absent localement.
   */
  storagePath?: string
}

/**
 * Origine d'un PatientDocument. Sert à différencier les uploads manuels
 * (photos, ordonnances) des PDF auto-générés par l'app (bilan, analyse IA,
 * évolution) — affichage d'un badge dédié dans DossierDocuments.
 */
export type PatientDocumentSource = 'upload' | 'bilan' | 'analyse-ia' | 'evolution' | 'consentement'

export interface PatientDocument {
  id: string
  patientKey: string
  name: string
  mimeType: string
  data: string       // base64 encoded (version caviardée si masked=true)
  originalData?: string // base64 de l'original non caviardé
  addedAt: string
  masked?: boolean
  /** Origine du document. Si absent, traité comme 'upload' (compat). */
  source?: PatientDocumentSource
  /** true = PDF généré par l'app (pas un upload manuel). */
  generated?: boolean
  /**
   * Chemin Supabase Storage du blob binaire (bucket `patient-docs`).
   * Présent dès que le binaire a été uploadé. Permet de re-télécharger
   * la version cross-device si `data` est absent localement.
   */
  storagePath?: string
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
  ficheExercice?: FicheExercice
  /** Diagnostic en physiothérapie/kinésithérapie saisi par le thérapeute (champ libre, optionnel). */
  diagnosticPhysio?: string
  /** Compte rendu rédactionnel auto-généré au save du bilan — reformulation des données saisies, sans inférence clinique. */
  compteRendu?: CompteRendu
  /** Erreur dernière tentative de génération du compte rendu (pour retry à la demande). */
  compteRenduError?: string | null
  /** Indice de précision LOCAL (ISO, sub-jour) posé à la création — NON synchronisé
   *  (la synchro est un full-replace ; cf. treatmentEpisodes). Pour dater l'épisode
   *  de PEC, le signal DURABLE est la date clinique (dateBilan), pas ce champ. */
  createdAt?: string
}

export type CompteRenduSectionId =
  | 'anamnese'
  | 'symptomatologie'
  | 'drapeaux'
  | 'examen'
  | 'tests'
  | 'projet'
  | 'conseils'

/** Statut d'un groupe de drapeaux. */
export type DrapeauStatut = 'tous_negatifs' | 'positifs' | 'mixte' | 'non_renseigne'

export interface DrapeauGroupe {
  statut: DrapeauStatut
  elementsVerifies?: string[]
  elementsPositifs?: string[]
}

/** Cotation d'un test spécifique. */
export type TestResultat = 'positif' | 'negatif' | 'non_realise'

/** Statut d'un mouvement de mobilité. */
export type MobiliteStatut =
  | 'algique_limitant'
  | 'algique'
  | 'tolere'
  | 'peu_algiques'
  | 'limite'
  | 'NR'

/** Antécédent typé. */
export type AntecedentType =
  | 'chirurgical'
  | 'medical'
  | 'physiotherapie'
  | 'imagerie'
  | 'medicamenteux'
  | 'familial'
  | 'autre'

export interface CompteRenduData {
  enTete: {
    nomPatient: string
    age: number | null
    sexe: Sexe | null
    zone: string | null
    date: string | null
  }
  anamnese: {
    plaintePrincipale: string | null
    facteurDeclenchantPousseeActuelle: string | null
    contextePro: { actuel?: string | null; anterieur?: string | null } | null
    contexteSportif: string | null
    antecedents: Array<{
      type: AntecedentType
      libelle: string
      detail?: string | null
      lienAvecPlainte?: string | null
    }>
    traitementsEnCours: Array<{ libelle: string; detail?: string | null }>
  }
  symptomatologie: {
    evn: { moyen: string | null; actuel: string | null; pire: string | null; meilleur: string | null }
    retentissement: string | null
    topographie: { principale: string | null; predominance: string | null; irradiation: string | null }
    caractere: string | null
    facteursAggravants: string[]
    facteursSoulageants: string[]
    facteursToleres: string[]
    douleurNocturne: { present: boolean; detail?: string | null } | null
    evolutionTemporelle: string | null
  }
  drapeaux: {
    rouges: DrapeauGroupe
    jaunes: DrapeauGroupe
    bleus: DrapeauGroupe
    noirs: DrapeauGroupe
  }
  examenClinique: {
    morphostatique: string | null
    palpation: {
      positifs: Array<{ localisation: string; detail?: string | null }>
      negatifs: string[]
    }
    mobilite: {
      zone: string | null
      items: Array<{ mouvement: string; statut: MobiliteStatut; detail?: string | null }>
      amplitudesEnDegres: string | null
    }
    neurologique: { realise: boolean; detail?: string | null }
    force: { realise: boolean; detail?: string | null }
  }
  testsSpecifiques: Array<{
    nom: string
    resultat: TestResultat
    cote: 'D' | 'G' | null
    detail: string | null
  }>
  projetTherapeutique: {
    hypothesesPraticien: string | null
    techniquesRealisees: string[]
  }
  conseilsPatient: {
    exercicesEnseignes: Array<{ nom: string; detail?: string | null }>
    educationTherapeutique: string[]
    suivi: { frequence: string | null; prochainsRDV: string[] }
  }
}

export interface CompteRendu {
  generatedAt: string
  /** Hash du contenu source au moment de la génération — sert à détecter si le bilan a été modifié depuis. */
  sourceHash: string
  /** Schéma V10 : objet structuré consommé par BilanCompteRendu (chips/badges/accordéons). */
  data: CompteRenduData
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
  /** 'sortie' = bilan de fin de PEC, sinon bilan intermédiaire classique */
  type?: 'intermediaire' | 'sortie'
  /** Indice de précision LOCAL (ISO, sub-jour) posé à la création — NON synchronisé
   *  (la synchro est un full-replace ; cf. treatmentEpisodes). La date clinique
   *  (dateBilan/dateSeance/datePrescription) reste le signal DURABLE d'épisode. */
  createdAt?: string
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
  /** Indice de précision LOCAL (ISO, sub-jour) posé à la création — NON synchronisé
   *  (la synchro est un full-replace ; cf. treatmentEpisodes). La date clinique
   *  (dateBilan/dateSeance/datePrescription) reste le signal DURABLE d'épisode. */
  createdAt?: string
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
  /** Indice de précision LOCAL (ISO, sub-jour) posé à la création — NON synchronisé
   *  (la synchro est un full-replace ; cf. treatmentEpisodes). La date clinique
   *  (dateBilan/dateSeance/datePrescription) reste le signal DURABLE d'épisode. */
  createdAt?: string
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
  plan?: 'basique' | 'pro' | 'cabinet'
  stripe_customer_id?: string
  stripe_subscription_id?: string
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
  | 'bilan_analyse'           // synthèse d'un champ du compte rendu (App.onGenerateSyntheseField)
  | 'bilan_analyse_refine'    // legacy — ancien moteur d'analyse DM retiré, conservé pour l'historique d'audit
  | 'bilan_evolution'         // BilanEvolutionIA
  | 'bilan_intermediaire'     // BilanNoteIntermediaire
  | 'fiche_exercice'          // FicheExerciceIA
  | 'pdf_bilan'               // Export PDF avec mise au propre IA
  | 'pdf_analyse'             // Export PDF depuis la page Analyse
  | 'note_seance_mini'        // Mini-analyse de note de séance
  | 'api_key_test'            // Ping de test de clé API
  | 'compte_rendu'            // BilanCompteRendu — auto-généré au save (scribe rédactionnel)
  | 'bilan_chat'              // BilanChatBubble — Q&A thérapeute ↔ IA avec contexte bilan

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
}

export type BilanMode = 'noyau' | 'complet' | 'vocal'

export interface NarrativeSection {
  id: string
  titre: string
  contenu: string
}

export interface NarrativeReport {
  sections: NarrativeSection[]
  transcription: string
  generatedAt: string
}
