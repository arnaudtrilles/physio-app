// Types métier du Bilan Drainage Lymphatique (DLM).
//
// Le bilan supporte 3 pathologies œdémateuses qui peuvent coexister chez un même
// patient (ex: lipœdème + lymphœdème = "phlébo-lympho-lipœdème"). On les modélise
// donc comme un Set de types sélectionnés (multi-select), pas un union exclusif.
//
// Toutes les valeurs sont stockées en chaîne pour rester compatibles avec la
// pipeline de sérialisation existante (Record<string, unknown> → JSON → IDB).
// Les conversions numériques (cm, kg, mois) se font au moment du calcul/render.

// ─── Pathologie ─────────────────────────────────────────────────────────────
export type OedemeType = 'lymphoedeme' | 'lipoedeme' | 'phleboedeme'

export const OEDEME_LABELS: Record<OedemeType, string> = {
  lymphoedeme: 'Lymphœdème',
  lipoedeme: 'Lipœdème',
  phleboedeme: 'Phlébœdème',
}

export const OEDEME_COLORS: Record<OedemeType, { fg: string; bg: string; border: string }> = {
  lymphoedeme: { fg: '#7c3aed', bg: '#f3e8ff', border: '#ddd6fe' },
  lipoedeme:   { fg: '#db2777', bg: '#fce7f3', border: '#fbcfe8' },
  phleboedeme: { fg: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
}

// ─── Localisation ────────────────────────────────────────────────────────────
// On adopte une cartographie macro (~13 zones cliniquement pertinentes pour le
// DLM) plutôt qu'une granularité segmentaire. La granularité fine est capturée
// dans les annotations texte et la circométrie. Cette approche limite les
// micro-tap sur tablette et les superpositions visuelles dans la silhouette.
export type BodyRegion =
  | 'tete' | 'cou'
  | 'MSD' | 'MSG'
  | 'seinD' | 'seinG'
  | 'thorax' | 'abdomen' | 'pelvis'
  | 'MID' | 'MIG'
  | 'dosHaut' | 'lombaire' | 'fesses'

export const REGION_LABELS: Record<BodyRegion, string> = {
  tete: 'Tête / face', cou: 'Cou',
  MSD: 'Membre supérieur D', MSG: 'Membre supérieur G',
  seinD: 'Sein D', seinG: 'Sein G',
  thorax: 'Thorax', abdomen: 'Abdomen', pelvis: 'Pelvis / génital',
  MID: 'Membre inférieur D', MIG: 'Membre inférieur G',
  dosHaut: 'Dos haut', lombaire: 'Lombaire', fesses: 'Fesses',
}

export type Cote = 'D' | 'G' | 'bilateral'

// ─── Stade ISL (lymphœdème) ─────────────────────────────────────────────────
// Référentiel International Society of Lymphology 2023.
export type StadeISL = '0' | 'I' | 'IIa' | 'IIb' | 'III' | ''

export const STADE_ISL_LABELS: Record<Exclude<StadeISL, ''>, string> = {
  '0':   'Stade 0 — Latent / infra-clinique',
  'I':   'Stade I — Spontanément réversible (élévation)',
  'IIa': 'Stade IIa — Non réversible, godet+',
  'IIb': 'Stade IIb — Fibrose, godet diminué',
  'III': 'Stade III — Éléphantiasique, troubles trophiques',
}

// ─── Stade lipœdème (Schmeller / Meier-Vollrath) ────────────────────────────
export type StadeLipo = '1' | '2' | '3' | '4' | ''

export const STADE_LIPO_LABELS: Record<Exclude<StadeLipo, ''>, string> = {
  '1': 'Stade 1 — Peau lisse, hypoderme épaissi',
  '2': 'Stade 2 — Surface en peau d\'orange, nodules',
  '3': 'Stade 3 — Lobes adipeux, déformation',
  '4': 'Stade 4 — Lipo-lymphœdème associé',
}

export const TYPE_LIPO_DISTRIBUTION = [
  'Type I — Hanches/fesses',
  'Type II — Hanches → genoux',
  'Type III — Hanches → chevilles',
  'Type IV — Bras (membre supérieur)',
  'Type V — Mollets isolés',
] as const

// ─── CEAP (phlébœdème — insuffisance veineuse chronique) ────────────────────
export type ClasseCEAP = 'C0' | 'C1' | 'C2' | 'C3' | 'C4a' | 'C4b' | 'C5' | 'C6' | ''

export const CEAP_LABELS: Record<Exclude<ClasseCEAP, ''>, string> = {
  C0:  'C0 — Aucun signe visible',
  C1:  'C1 — Télangiectasies / varicosités',
  C2:  'C2 — Varices',
  C3:  'C3 — Œdème',
  C4a: 'C4a — Pigmentation / eczéma',
  C4b: 'C4b — Lipodermatosclérose / atrophie blanche',
  C5:  'C5 — Ulcère cicatrisé',
  C6:  'C6 — Ulcère ouvert',
}

// ─── Godet (pitting) ────────────────────────────────────────────────────────
// Échelle clinique 0-4 (NICE / Pitt scale adapté lymphologie).
export type GodetGrade = '0' | '1' | '2' | '3' | '4' | ''

export const GODET_LABELS: Record<Exclude<GodetGrade, ''>, string> = {
  '0': 'Absent — pas d\'empreinte',
  '1': 'Léger — < 2 mm, retour < 15 s',
  '2': 'Modéré — 2-4 mm, retour 15-30 s',
  '3': 'Profond — 4-6 mm, retour > 1 min',
  '4': 'Très profond — > 6 mm, retour très lent (fibrose)',
}

// ─── Kaposi-Stemmer ─────────────────────────────────────────────────────────
// Pathognomonique du lymphœdème.
export type Stemmer = 'positif' | 'negatif' | 'douteux' | ''

// ─── Mesures circométriques ─────────────────────────────────────────────────
// Niveaux standardisés (Kuhnke) — étirement progressif tous les 4 cm depuis un
// repère osseux (malléole médiale au MI, processus styloïde radial au MS).
export interface CircoLevel {
  /** Niveau en cm depuis le repère osseux distal (ex: '4', '8', '12'…). */
  niveau: string
  /** Périmètre côté D, en cm. */
  perimetreD: string
  /** Périmètre côté G, en cm. */
  perimetreG: string
  /** Note libre (induration locale, peau, etc.). */
  note: string
}

export const KUHNKE_DEFAULT_NIVEAUX_MI = ['0', '4', '8', '12', '16', '20', '24', '28', '32', '36', '40']
export const KUHNKE_DEFAULT_NIVEAUX_MS = ['0', '4', '8', '12', '16', '20', '24', '28', '32', '36']

// Volume Kuhnke (tronc-de-cône) entre 2 niveaux successifs (cm³) :
//   V = h * (C1² + C1*C2 + C2²) / (12π)
// où h = 4 cm (pas standard). Renvoie 0 si périmètres invalides.
export function kuhnkeSegmentVolume(c1: number, c2: number, h = 4): number {
  if (!Number.isFinite(c1) || !Number.isFinite(c2) || c1 <= 0 || c2 <= 0) return 0
  return (h * (c1 * c1 + c1 * c2 + c2 * c2)) / (12 * Math.PI)
}

export interface CircoSet {
  /** Repère osseux choisi (ex: 'Malléole médiale', 'Processus styloïde radial'). */
  repere: string
  /** Liste ordonnée de niveaux. */
  niveaux: CircoLevel[]
}

export const emptyCircoSet = (): CircoSet => ({ repere: '', niveaux: [] })

// ─── Bio-impédance / L-Dex ─────────────────────────────────────────────────
// SOZO ImpediMed → L-Dex score. Seuil pathologique > 6.5 (MS) / > 10 (MI).
export interface BioImpedance {
  appareil: string          // ex: 'SOZO ImpediMed'
  lDexScore: string         // numérique en chaîne
  date: string              // ISO
  note: string
}
export const emptyBioImpedance = (): BioImpedance => ({ appareil: '', lDexScore: '', date: '', note: '' })

// ─── Photo / image ──────────────────────────────────────────────────────────
export interface BilanPhoto {
  /** dataURL (base64). On limite à 5-6 photos pour ne pas exploser IDB. */
  dataUrl: string
  legende: string
  region: BodyRegion | ''
  capturedAt: string  // ISO
}

// ─── Anamnèse étendue ───────────────────────────────────────────────────────
export interface DlmAnamnese {
  // Apparition / évolution
  ageApparition: string
  delaiDepuisApparition: string         // ex: '6 mois'
  evolutionDecrite: 'progressive' | 'rapide' | 'fluctuante' | 'stable' | ''
  facteursAggravants: string
  facteursAmeliorants: string

  // Symptômes
  douleurEvn: string                    // 0-10
  lourdeur: 'oui' | 'non' | ''
  tension: 'oui' | 'non' | ''
  paresthesies: 'oui' | 'non' | ''
  pruritus: 'oui' | 'non' | ''
  cellulites: 'oui' | 'non' | ''        // ATCD érysipèle / cellulite infectieuse
  cellulitesEpisodes: string            // nombre / contexte
  ulceres: 'oui' | 'non' | ''
  ulceresLocalisation: string

  // Antécédents médicaux et chirurgicaux
  atcdChirurgicaux: string              // chirurgies, dont curages
  curageGanglionnaire: 'oui' | 'non' | ''
  curageDetail: string                  // axillaire / inguinal / iliaque / cervical, nb ganglions
  radiotherapie: 'oui' | 'non' | ''
  radiotherapieZones: string
  cancer: 'oui' | 'non' | ''
  cancerType: string
  cancerStatut: string                  // rémission, traitement actuel
  chimioActuelle: 'oui' | 'non' | ''
  insuffisanceVeineuse: 'oui' | 'non' | ''
  insuffisanceCardiaque: 'oui' | 'non' | ''
  insuffisanceRenale: 'oui' | 'non' | ''
  diabete: 'oui' | 'non' | ''
  obesite: 'oui' | 'non' | ''
  imc: string
  thromboseATCD: 'oui' | 'non' | ''
  filariose: 'oui' | 'non' | ''         // pertinent migration / voyage
  voyageEndemique: string

  // Familiaux (lipœdème +++)
  atcdFamiliauxLymphoedeme: 'oui' | 'non' | ''
  atcdFamiliauxLipoedeme: 'oui' | 'non' | ''

  // Médicaments
  traitementsActuels: string
  traitementsHormones: 'oui' | 'non' | ''  // contraception, THS — pertinent lipœdème
  diuretiques: 'oui' | 'non' | ''           // souvent contre-indiqués pour lymphœdème pur

  // Mode de vie
  professionDebout: 'oui' | 'non' | ''
  activitePhysique: string
  alimentationContexte: string
  vetementsContention: 'oui' | 'non' | ''
  vetementsContentionDetail: string         // classe, marque, ancienneté

  // Plaintes du patient (verbatim)
  plaintePatient: string
  retentissementQdV: string                 // qualité de vie ressentie
  attentes: string                          // ce qu'il attend du traitement
}

export const emptyDlmAnamnese = (): DlmAnamnese => ({
  ageApparition: '', delaiDepuisApparition: '', evolutionDecrite: '',
  facteursAggravants: '', facteursAmeliorants: '',
  douleurEvn: '', lourdeur: '', tension: '', paresthesies: '', pruritus: '',
  cellulites: '', cellulitesEpisodes: '', ulceres: '', ulceresLocalisation: '',
  atcdChirurgicaux: '', curageGanglionnaire: '', curageDetail: '',
  radiotherapie: '', radiotherapieZones: '',
  cancer: '', cancerType: '', cancerStatut: '', chimioActuelle: '',
  insuffisanceVeineuse: '', insuffisanceCardiaque: '', insuffisanceRenale: '',
  diabete: '', obesite: '', imc: '',
  thromboseATCD: '', filariose: '', voyageEndemique: '',
  atcdFamiliauxLymphoedeme: '', atcdFamiliauxLipoedeme: '',
  traitementsActuels: '', traitementsHormones: '', diuretiques: '',
  professionDebout: '', activitePhysique: '', alimentationContexte: '',
  vetementsContention: '', vetementsContentionDetail: '',
  plaintePatient: '', retentissementQdV: '', attentes: '',
})

// ─── Contre-indications ─────────────────────────────────────────────────────
// Checklist obligatoire AVANT toute prise en charge DLM (haute sécurité).
// Toute case "oui" sur une CI absolue ⇒ contre-indique l'acte et déclenche un warning bloquant.
export interface DlmContreIndications {
  // CI ABSOLUES
  thromboseAigue: 'oui' | 'non' | ''                 // TVP active
  insuffisanceCardiaqueDecompensee: 'oui' | 'non' | ''
  infectionAigue: 'oui' | 'non' | ''                 // érysipèle, cellulite active
  cancerActifNonTraite: 'oui' | 'non' | ''           // contre-indication relative selon avis médical
  // CI RELATIVES
  hypotensionSevere: 'oui' | 'non' | ''
  arythmie: 'oui' | 'non' | ''
  insuffisanceRenaleSevere: 'oui' | 'non' | ''
  trombopeniePlaquettes: 'oui' | 'non' | ''
  asthmesevere: 'oui' | 'non' | ''
  hypothyroidieSevere: 'oui' | 'non' | ''
  grossesseT1: 'oui' | 'non' | ''                    // 1er trimestre — éviter abdomen
  // Local
  plaiesCutaneesOuvertes: 'oui' | 'non' | ''
  mycoseActive: 'oui' | 'non' | ''
  douleurInexpliquee: 'oui' | 'non' | ''
  // Autorisation
  prescriptionMedicale: 'oui' | 'non' | ''
  prescriptionDate: string
  notesMedecin: string
  /** Décision finale du kiné après revue. */
  decision: 'priseEnCharge' | 'reportee' | 'refusee' | ''
  motifDecision: string
}

export const emptyDlmContreIndications = (): DlmContreIndications => ({
  thromboseAigue: '', insuffisanceCardiaqueDecompensee: '', infectionAigue: '', cancerActifNonTraite: '',
  hypotensionSevere: '', arythmie: '', insuffisanceRenaleSevere: '', trombopeniePlaquettes: '',
  asthmesevere: '', hypothyroidieSevere: '', grossesseT1: '',
  plaiesCutaneesOuvertes: '', mycoseActive: '', douleurInexpliquee: '',
  prescriptionMedicale: '', prescriptionDate: '', notesMedecin: '',
  decision: '', motifDecision: '',
})

export const CI_ABSOLUES_KEYS: (keyof DlmContreIndications)[] = [
  'thromboseAigue', 'insuffisanceCardiaqueDecompensee', 'infectionAigue',
]

export const CI_RELATIVES_KEYS: (keyof DlmContreIndications)[] = [
  'cancerActifNonTraite',
  'hypotensionSevere', 'arythmie', 'insuffisanceRenaleSevere', 'trombopeniePlaquettes',
  'asthmesevere', 'hypothyroidieSevere', 'grossesseT1',
  'plaiesCutaneesOuvertes', 'mycoseActive', 'douleurInexpliquee',
]

export function hasBlockingCI(ci: DlmContreIndications): boolean {
  return CI_ABSOLUES_KEYS.some(k => ci[k] === 'oui')
}

// ─── Examen clinique ────────────────────────────────────────────────────────
export interface DlmExamenClinique {
  // Inspection / morphostatique
  asymetrie: 'oui' | 'non' | ''
  asymetrieDetail: string
  posture: string
  troublesTrophiques: string                          // peau d'orange, fibrose, papillomatose, hyperkératose
  couleurPeau: string                                 // érythème, cyanose, brunissure
  temperatureLocale: 'normale' | 'chaude' | 'froide' | ''
  varices: 'oui' | 'non' | ''
  varicesDetail: string
  cicatrices: string

  // Palpation
  godetGrade: GodetGrade
  godetLocalisation: string
  fibrose: 'oui' | 'non' | ''
  fibroseLocalisation: string
  consistance: 'molle' | 'fermes' | 'fibreuse' | 'mixte' | ''
  douleurPalpation: 'oui' | 'non' | ''
  douleurPalpationLocalisation: string

  // Tests pathognomoniques
  stemmer: Stemmer
  stemmerLocalisation: string

  // Pouls et signes veineux
  poulsPedieux: 'present' | 'diminue' | 'aboli' | 'normal' | ''
  signeHomans: 'positif' | 'negatif' | 'non_realise' | ''

  // Mobilité articulaire (synthèse globale, pas par segment)
  amplitudesArticulaires: string                      // "Limitation flexion cheville D 15°"

  // Cercle d'auto-évaluation
  notesExamen: string                                 // catch-all
}

export const emptyDlmExamenClinique = (): DlmExamenClinique => ({
  asymetrie: '', asymetrieDetail: '', posture: '', troublesTrophiques: '',
  couleurPeau: '', temperatureLocale: '', varices: '', varicesDetail: '', cicatrices: '',
  godetGrade: '', godetLocalisation: '', fibrose: '', fibroseLocalisation: '',
  consistance: '', douleurPalpation: '', douleurPalpationLocalisation: '',
  stemmer: '', stemmerLocalisation: '',
  poulsPedieux: '', signeHomans: '',
  amplitudesArticulaires: '',
  notesExamen: '',
})

// ─── Mesures (cœur du bilan, suivi quantitatif) ─────────────────────────────
export interface DlmMesures {
  poids: string                  // kg
  taille: string                 // cm
  imc: string                    // calculé ou saisi
  perimetreOmbilical: string     // pour lipo
  perimetreHanche: string
  rapportTH: string              // calculable
  // Circométries détaillées par membre
  circoMS: CircoSet              // membre supérieur
  circoMI: CircoSet              // membre inférieur
  // Bio-impédance
  bioImpedance: BioImpedance
  // Volumes (calculés ou saisis)
  volumeMSDcm3: string
  volumeMSGcm3: string
  volumeMIDcm3: string
  volumeMIGcm3: string
  ecartVolumiqueMS: string       // % entre les 2 côtés
  ecartVolumiqueMI: string
  notesMesures: string
}

export const emptyDlmMesures = (): DlmMesures => ({
  poids: '', taille: '', imc: '',
  perimetreOmbilical: '', perimetreHanche: '', rapportTH: '',
  circoMS: emptyCircoSet(), circoMI: emptyCircoSet(),
  bioImpedance: emptyBioImpedance(),
  volumeMSDcm3: '', volumeMSGcm3: '', volumeMIDcm3: '', volumeMIGcm3: '',
  ecartVolumiqueMS: '', ecartVolumiqueMI: '',
  notesMesures: '',
})

/**
 * Calcule l'IMC (kg/m²) à partir de poids (kg) et taille (cm).
 * Retourne '' si les entrées sont invalides.
 */
export function computeIMC(poidsKg: string, tailleCm: string): string {
  const p = Number(poidsKg)
  const t = Number(tailleCm)
  if (!Number.isFinite(p) || !Number.isFinite(t) || p <= 0 || t <= 0) return ''
  const m = t / 100
  return (p / (m * m)).toFixed(1)
}

/**
 * Calcule le volume total Kuhnke d'un membre à partir d'un CircoSet.
 * Renvoie un nombre en cm³ (somme des troncs de cône). Renvoie 0 si
 * < 2 niveaux mesurés sur ce côté.
 */
export function computeKuhnkeVolume(set: CircoSet, cote: 'D' | 'G'): number {
  const niveaux = set.niveaux
    .slice()
    .map(n => ({
      niveau: Number(n.niveau),
      perimetre: Number(cote === 'D' ? n.perimetreD : n.perimetreG),
    }))
    .filter(n => Number.isFinite(n.niveau) && Number.isFinite(n.perimetre) && n.perimetre > 0)
    .sort((a, b) => a.niveau - b.niveau)
  if (niveaux.length < 2) return 0
  let total = 0
  for (let i = 1; i < niveaux.length; i++) {
    const h = niveaux[i].niveau - niveaux[i - 1].niveau
    total += kuhnkeSegmentVolume(niveaux[i - 1].perimetre, niveaux[i].perimetre, h)
  }
  return total
}

// ─── ICF — fonctionnalité ───────────────────────────────────────────────────
// Catégorisation OMS — fonction, activité, participation.
export interface DlmICF {
  fonctionsCorps: string                              // b (déficiences)
  structuresCorps: string                             // s (lésions)
  activitesLimitees: string                           // d (limitations d'activité)
  participationRestreinte: string                     // p (restrictions de participation)
  facteursEnvironnementaux: string                    // e
  facteursPersonnels: string                          // pf
  echelleEffortFonctionnel: string                    // 0-10 self-perception
}

export const emptyDlmICF = (): DlmICF => ({
  fonctionsCorps: '', structuresCorps: '', activitesLimitees: '',
  participationRestreinte: '', facteursEnvironnementaux: '', facteursPersonnels: '',
  echelleEffortFonctionnel: '',
})

// ─── Diagnostic différentiel ────────────────────────────────────────────────
// Granulaire — chaque entrée est une hypothèse explorée avec arguments pour/contre.
export interface DxDifferentiel {
  hypothese: string
  argumentsPour: string
  argumentsContre: string
  retenu: 'oui' | 'non' | 'a_explorer' | ''
}

export interface DlmDxDifferentiel {
  // Champs structurés pour les 3 hypothèses majeures
  lymphoedeme: DxDifferentiel
  lipoedeme: DxDifferentiel
  phleboedeme: DxDifferentiel
  // Hypothèses additionnelles libres (myxoedème, lipohypertrophie, œdème médicamenteux…)
  autres: DxDifferentiel[]
  conclusionDx: string                                // synthèse
}

export const emptyDxDifferentiel = (): DxDifferentiel => ({
  hypothese: '', argumentsPour: '', argumentsContre: '', retenu: '',
})

export const emptyDlmDxDifferentiel = (): DlmDxDifferentiel => ({
  lymphoedeme: { hypothese: 'Lymphœdème', argumentsPour: '', argumentsContre: '', retenu: '' },
  lipoedeme: { hypothese: 'Lipœdème', argumentsPour: '', argumentsContre: '', retenu: '' },
  phleboedeme: { hypothese: 'Phlébœdème (IVC)', argumentsPour: '', argumentsContre: '', retenu: '' },
  autres: [],
  conclusionDx: '',
})

// ─── Plan de traitement ─────────────────────────────────────────────────────
// CDT (Complex Decongestive Therapy) — phase 1 intensive, phase 2 entretien.
export interface DlmPlanTraitement {
  // Phase 1 — intensive
  phase1Active: 'oui' | 'non' | ''
  phase1FrequenceHebdo: string                        // ex: '5 séances/sem'
  phase1Duree: string                                 // ex: '4 semaines'
  phase1Composantes: {
    dlm: boolean                                      // drainage lymphatique manuel
    bandesPeu: boolean                                // bandes peu élastiques (pose-jour)
    soinsPeau: boolean
    exercicesDecongestifs: boolean
    education: boolean
    pressotherapie: boolean
    bandagesNuit: boolean
  }
  phase1Objectifs: string                             // SMART

  // Phase 2 — entretien
  phase2Active: 'oui' | 'non' | ''
  phase2Composantes: {
    contention: boolean
    autoDLM: boolean
    exercices: boolean
    suivi: boolean
    autobandage: boolean
  }
  phase2FrequenceSuivi: string                        // ex: '1x/mois pendant 6 mois'
  phase2Objectifs: string

  // Spécifique lipœdème
  lipoSpecifique: {
    nutritionConseil: boolean
    activitePhysique: boolean
    psyAccompagnement: boolean
    chirurgieLiposuccionEnvisagee: 'oui' | 'non' | 'a_discuter' | ''
  }

  // Spécifique phlébœdème
  phleboSpecifique: {
    contentionMedicaleDegre: '1' | '2' | '3' | '4' | ''
    avisAngiologique: 'oui' | 'non' | ''
    elevation: boolean
    activeMobilisation: boolean
  }

  // Education / autosoins
  educationAutosoinsItems: string                     // checklist en ligne
  signesAlerte: string                                // motifs CS médecin urgent
  prochaineConsultation: string                       // date
  notesPlan: string
}

export const emptyDlmPlanTraitement = (): DlmPlanTraitement => ({
  phase1Active: '', phase1FrequenceHebdo: '', phase1Duree: '',
  phase1Composantes: {
    dlm: false, bandesPeu: false, soinsPeau: false,
    exercicesDecongestifs: false, education: false,
    pressotherapie: false, bandagesNuit: false,
  },
  phase1Objectifs: '',
  phase2Active: '', phase2Composantes: {
    contention: false, autoDLM: false, exercices: false, suivi: false, autobandage: false,
  },
  phase2FrequenceSuivi: '', phase2Objectifs: '',
  lipoSpecifique: {
    nutritionConseil: false, activitePhysique: false, psyAccompagnement: false,
    chirurgieLiposuccionEnvisagee: '',
  },
  phleboSpecifique: {
    contentionMedicaleDegre: '',
    avisAngiologique: '',
    elevation: false,
    activeMobilisation: false,
  },
  educationAutosoinsItems: '',
  signesAlerte: '',
  prochaineConsultation: '',
  notesPlan: '',
})

// ─── Auto-suggestion du stade ISL ────────────────────────────────────────────
// À partir des signes cliniques (Stemmer + godet + fibrose + troubles
// trophiques), propose un stade probable selon le référentiel ISL 2023.
// Le clinicien valide ou modifie. Aucune décision n'est prise sans son aval.
export interface StadeISLSuggestion {
  stade: Exclude<StadeISL, ''>
  rationale: string
}

export function suggestStadeISL(ex: DlmExamenClinique): StadeISLSuggestion | null {
  const stemmerPos = ex.stemmer === 'positif'
  const godet = ex.godetGrade
  const godetPresent = godet === '1' || godet === '2' || godet === '3' || godet === '4'
  const godetProfond = godet === '3' || godet === '4'
  const fibrose = ex.fibrose === 'oui'
  const trophicLower = (ex.troublesTrophiques || '').toLowerCase()
  const signesEvolues = /papillom|peau\s*d.?orange|hyperker|élephant|elephant|verrue/.test(trophicLower)

  // Aucun signe → pas de suggestion
  if (!stemmerPos && !godetPresent && !fibrose && !signesEvolues) return null

  // Stade III — éléphantiasique
  if (stemmerPos && (signesEvolues || (fibrose && godetProfond))) {
    return {
      stade: 'III',
      rationale: 'Stemmer+, signes éléphantiasiques (papillomatose / hyperkératose) ou fibrose extensive avec godet profond.',
    }
  }
  // Stade IIb — fibrose qui réduit le godet
  if (stemmerPos && fibrose) {
    return {
      stade: 'IIb',
      rationale: 'Stemmer+ et fibrose palpable — godet typiquement diminué par induration tissulaire.',
    }
  }
  // Stade IIa — godet positif sans fibrose
  if (stemmerPos && godetPresent && !fibrose) {
    return {
      stade: 'IIa',
      rationale: 'Stemmer+ et godet+ sans fibrose — œdème non spontanément réversible.',
    }
  }
  // Stade I — godet+ mais Stemmer non franchement positif (réversible à l'élévation)
  if (godetPresent && !stemmerPos && !fibrose) {
    return {
      stade: 'I',
      rationale: 'Godet+ avec Stemmer non franchement positif et sans fibrose — œdème probablement spontanément réversible.',
    }
  }
  // Stade 0 — Stemmer positif isolé, sans signes patents
  if (stemmerPos && !godetPresent && !fibrose) {
    return {
      stade: '0',
      rationale: 'Stemmer+ isolé sans godet ni fibrose — stade infra-clinique probable, surveillance recommandée.',
    }
  }
  return null
}

// ─── Presets cliniques ───────────────────────────────────────────────────────
// Templates pour les scénarios les plus fréquents. Chacun pré-remplit un
// sous-ensemble cohérent (type d'œdème, anamnèse-cadre, régions probables,
// composantes du plan CDT par défaut). Le clinicien complète et valide.
export interface DlmPreset {
  id: string
  label: string
  description: string
  apply: () => Partial<BilanDLMData>
}

export const DLM_PRESETS: DlmPreset[] = [
  {
    id: 'lymph_ms_postmastectomie',
    label: 'Lymphœdème MS post-mastectomie',
    description: 'Curage axillaire + radiothérapie, MS atteint, CDT 2 phases.',
    apply: () => ({
      oedemeTypes: ['lymphoedeme'],
      cote: 'D',
      regions: ['MSD'],
      anamnese: {
        ...emptyDlmAnamnese(),
        curageGanglionnaire: 'oui',
        curageDetail: 'Axillaire',
        radiotherapie: 'oui',
        cancer: 'oui',
        cancerType: 'Sein',
        evolutionDecrite: 'progressive',
      },
      plan: {
        ...emptyDlmPlanTraitement(),
        phase1Active: 'oui',
        phase1FrequenceHebdo: '5 séances/sem',
        phase1Duree: '3-4 semaines',
        phase1Composantes: {
          dlm: true, bandesPeu: true, soinsPeau: true,
          exercicesDecongestifs: true, education: true,
          pressotherapie: false, bandagesNuit: false,
        },
        phase2Active: 'oui',
        phase2Composantes: { contention: true, autoDLM: true, exercices: true, suivi: true, autobandage: false },
        phase2FrequenceSuivi: '1×/mois pendant 6 mois',
      },
    }),
  },
  {
    id: 'lipo_mi_bilateral',
    label: 'Lipœdème stade II MI bilatéral',
    description: 'Hanches → chevilles, Stemmer−, ATCD familiaux, prise en charge multidisciplinaire.',
    apply: () => ({
      oedemeTypes: ['lipoedeme'],
      cote: 'bilateral',
      regions: ['MID', 'MIG'],
      stadeLipo: '2',
      typeLipoDistribution: 'Type III — Hanches → chevilles',
      anamnese: {
        ...emptyDlmAnamnese(),
        atcdFamiliauxLipoedeme: 'oui',
        evolutionDecrite: 'progressive',
        traitementsHormones: 'oui',
        douleurEvn: '4',
        lourdeur: 'oui',
      },
      plan: {
        ...emptyDlmPlanTraitement(),
        phase1Active: 'oui',
        phase1Composantes: {
          dlm: true, bandesPeu: false, soinsPeau: true,
          exercicesDecongestifs: true, education: true,
          pressotherapie: true, bandagesNuit: false,
        },
        phase2Active: 'oui',
        phase2Composantes: { contention: true, autoDLM: false, exercices: true, suivi: true, autobandage: false },
        lipoSpecifique: {
          nutritionConseil: true, activitePhysique: true, psyAccompagnement: true,
          chirurgieLiposuccionEnvisagee: 'a_discuter',
        },
      },
    }),
  },
  {
    id: 'phlebo_mi_unilateral',
    label: 'Phlébœdème CEAP C3 unilatéral',
    description: 'Insuffisance veineuse chronique, contention classe 2, élévation déclive.',
    apply: () => ({
      oedemeTypes: ['phleboedeme'],
      cote: 'D',
      regions: ['MID'],
      ceap: 'C3',
      anamnese: {
        ...emptyDlmAnamnese(),
        insuffisanceVeineuse: 'oui',
        evolutionDecrite: 'progressive',
        professionDebout: 'oui',
        lourdeur: 'oui',
      },
      plan: {
        ...emptyDlmPlanTraitement(),
        phase1Active: 'oui',
        phase1Composantes: {
          dlm: true, bandesPeu: true, soinsPeau: true,
          exercicesDecongestifs: true, education: true,
          pressotherapie: true, bandagesNuit: false,
        },
        phase2Active: 'oui',
        phase2Composantes: { contention: true, autoDLM: false, exercices: true, suivi: true, autobandage: false },
        phleboSpecifique: {
          contentionMedicaleDegre: '2',
          avisAngiologique: 'oui',
          elevation: true,
          activeMobilisation: true,
        },
      },
    }),
  },
  {
    id: 'mixte_lipo_lymph',
    label: 'Mixte lipo-lymphœdème',
    description: 'Lipœdème évolué stade IV avec décompensation lymphatique secondaire.',
    apply: () => ({
      oedemeTypes: ['lipoedeme', 'lymphoedeme'],
      cote: 'bilateral',
      regions: ['MID', 'MIG'],
      stadeLipo: '4',
      stadeISL: 'IIa',
      typeLipoDistribution: 'Type III — Hanches → chevilles',
      anamnese: {
        ...emptyDlmAnamnese(),
        atcdFamiliauxLipoedeme: 'oui',
        evolutionDecrite: 'progressive',
        cellulites: 'oui',
        lourdeur: 'oui',
        tension: 'oui',
      },
      plan: {
        ...emptyDlmPlanTraitement(),
        phase1Active: 'oui',
        phase1FrequenceHebdo: '5 séances/sem',
        phase1Duree: '4 semaines',
        phase1Composantes: {
          dlm: true, bandesPeu: true, soinsPeau: true,
          exercicesDecongestifs: true, education: true,
          pressotherapie: true, bandagesNuit: true,
        },
        phase2Active: 'oui',
        phase2Composantes: { contention: true, autoDLM: true, exercices: true, suivi: true, autobandage: true },
        lipoSpecifique: {
          nutritionConseil: true, activitePhysique: true, psyAccompagnement: true,
          chirurgieLiposuccionEnvisagee: 'a_discuter',
        },
      },
    }),
  },
]

// ─── State principal ────────────────────────────────────────────────────────
// Stockage final dans bilanData (parent owned via App.tsx).
export interface BilanDLMData {
  // Multi-select des œdèmes
  oedemeTypes: OedemeType[]
  cote: Cote | ''
  regions: BodyRegion[]                               // tap-regions sélectionnées
  bodyChartDrawing: string                            // dataURL — surcouche dessin libre
  bodyChartAnnotations: string                        // notes texte sur la silhouette

  // Sections
  contreIndications: DlmContreIndications
  anamnese: DlmAnamnese
  examenClinique: DlmExamenClinique
  mesures: DlmMesures
  stadeISL: StadeISL
  stadeLipo: StadeLipo
  typeLipoDistribution: string                        // sélection unique parmi TYPE_LIPO_DISTRIBUTION
  ceap: ClasseCEAP
  icf: DlmICF
  dxDifferentiel: DlmDxDifferentiel
  plan: DlmPlanTraitement

  // Photos
  photos: BilanPhoto[]

  // Conseils libres
  conseils: string

  // Métadonnées
  versionSchema: number                               // pour migrations futures
  modeBilan: 'noyau' | 'complet'
}

export const SCHEMA_VERSION = 1

export const emptyBilanDLM = (): BilanDLMData => ({
  oedemeTypes: [],
  cote: '',
  regions: [],
  bodyChartDrawing: '',
  bodyChartAnnotations: '',
  contreIndications: emptyDlmContreIndications(),
  anamnese: emptyDlmAnamnese(),
  examenClinique: emptyDlmExamenClinique(),
  mesures: emptyDlmMesures(),
  stadeISL: '',
  stadeLipo: '',
  typeLipoDistribution: '',
  ceap: '',
  icf: emptyDlmICF(),
  dxDifferentiel: emptyDlmDxDifferentiel(),
  plan: emptyDlmPlanTraitement(),
  photos: [],
  conseils: '',
  versionSchema: SCHEMA_VERSION,
  modeBilan: 'complet',
})

// ─── Merge — tolérant aux données legacy / partielles ───────────────────────
// Pattern utilisé partout dans bilanSections.tsx : on prend le default, on
// surcharge avec les clés présentes (string-coercion sauf objets imbriqués).
type AnyRec = Record<string, unknown>

function mergeStringFields<T extends object>(empty: T, raw: AnyRec | undefined): T {
  if (!raw) return empty
  const emptyRec = empty as unknown as AnyRec
  const out: AnyRec = { ...emptyRec }
  for (const k of Object.keys(emptyRec)) {
    const v = raw[k]
    if (v === undefined || v === null) continue
    const def = emptyRec[k]
    if (typeof def === 'string') {
      out[k] = typeof v === 'boolean' ? (v ? 'oui' : 'non') : String(v)
    } else if (typeof def === 'object') {
      out[k] = v // les sous-objets sont mergés explicitement par leur propre helper
    }
  }
  return out as unknown as T
}

export function mergeBilanDLM(raw: AnyRec | undefined): BilanDLMData {
  const base = emptyBilanDLM()
  if (!raw) return base
  const ci   = mergeStringFields(emptyDlmContreIndications(), raw.contreIndications as AnyRec | undefined)
  const an   = mergeStringFields(emptyDlmAnamnese(),         raw.anamnese as AnyRec | undefined)
  const ex   = mergeStringFields(emptyDlmExamenClinique(),   raw.examenClinique as AnyRec | undefined)
  const mes  = mergeMesures(raw.mesures as AnyRec | undefined)
  const icf  = mergeStringFields(emptyDlmICF(),              raw.icf as AnyRec | undefined)
  const dx   = mergeDxDifferentiel(raw.dxDifferentiel as AnyRec | undefined)
  const plan = mergePlan(raw.plan as AnyRec | undefined)

  return {
    ...base,
    oedemeTypes: Array.isArray(raw.oedemeTypes) ? (raw.oedemeTypes as OedemeType[]) : [],
    cote: (raw.cote as BilanDLMData['cote']) ?? '',
    regions: Array.isArray(raw.regions) ? (raw.regions as BodyRegion[]) : [],
    bodyChartDrawing: typeof raw.bodyChartDrawing === 'string' ? raw.bodyChartDrawing : '',
    bodyChartAnnotations: typeof raw.bodyChartAnnotations === 'string' ? raw.bodyChartAnnotations : '',
    contreIndications: ci,
    anamnese: an,
    examenClinique: ex,
    mesures: mes,
    stadeISL: (raw.stadeISL as StadeISL) ?? '',
    stadeLipo: (raw.stadeLipo as StadeLipo) ?? '',
    typeLipoDistribution: typeof raw.typeLipoDistribution === 'string' ? raw.typeLipoDistribution : '',
    ceap: (raw.ceap as ClasseCEAP) ?? '',
    icf: icf,
    dxDifferentiel: dx,
    plan: plan,
    photos: Array.isArray(raw.photos) ? (raw.photos as BilanPhoto[]).filter(p => p && typeof p.dataUrl === 'string') : [],
    conseils: typeof raw.conseils === 'string' ? raw.conseils : '',
    versionSchema: typeof raw.versionSchema === 'number' ? raw.versionSchema : SCHEMA_VERSION,
    modeBilan: raw.modeBilan === 'noyau' ? 'noyau' : 'complet',
  }
}

function mergeMesures(raw: AnyRec | undefined): DlmMesures {
  const base = emptyDlmMesures()
  if (!raw) return base
  const flat = mergeStringFields(base, raw)
  // sous-objets
  const circoMSraw = raw.circoMS as AnyRec | undefined
  const circoMIraw = raw.circoMI as AnyRec | undefined
  const bioRaw = raw.bioImpedance as AnyRec | undefined
  return {
    ...flat,
    circoMS: mergeCircoSet(circoMSraw),
    circoMI: mergeCircoSet(circoMIraw),
    bioImpedance: mergeStringFields(emptyBioImpedance(), bioRaw),
  }
}

function mergeCircoSet(raw: AnyRec | undefined): CircoSet {
  if (!raw) return emptyCircoSet()
  const niveauxRaw = raw.niveaux as unknown
  const niveaux: CircoLevel[] = Array.isArray(niveauxRaw)
    ? (niveauxRaw as AnyRec[]).map(n => ({
        niveau: typeof n.niveau === 'string' ? n.niveau : String(n.niveau ?? ''),
        perimetreD: typeof n.perimetreD === 'string' ? n.perimetreD : String(n.perimetreD ?? ''),
        perimetreG: typeof n.perimetreG === 'string' ? n.perimetreG : String(n.perimetreG ?? ''),
        note: typeof n.note === 'string' ? n.note : String(n.note ?? ''),
      }))
    : []
  return {
    repere: typeof raw.repere === 'string' ? raw.repere : '',
    niveaux,
  }
}

function mergeDxDifferentiel(raw: AnyRec | undefined): DlmDxDifferentiel {
  const base = emptyDlmDxDifferentiel()
  if (!raw) return base
  const merge = (key: 'lymphoedeme' | 'lipoedeme' | 'phleboedeme'): DxDifferentiel => {
    const r = raw[key] as AnyRec | undefined
    return mergeStringFields(base[key], r)
  }
  const autresRaw = raw.autres
  const autres: DxDifferentiel[] = Array.isArray(autresRaw)
    ? (autresRaw as AnyRec[]).map(a => mergeStringFields(emptyDxDifferentiel(), a))
    : []
  return {
    lymphoedeme: merge('lymphoedeme'),
    lipoedeme: merge('lipoedeme'),
    phleboedeme: merge('phleboedeme'),
    autres,
    conclusionDx: typeof raw.conclusionDx === 'string' ? raw.conclusionDx : '',
  }
}

function mergePlan(raw: AnyRec | undefined): DlmPlanTraitement {
  const base = emptyDlmPlanTraitement()
  if (!raw) return base
  const flat = mergeStringFields(base, raw)
  // sous-objets booléens
  const phase1C = raw.phase1Composantes as AnyRec | undefined
  const phase2C = raw.phase2Composantes as AnyRec | undefined
  const lipoS = raw.lipoSpecifique as AnyRec | undefined
  const phleboS = raw.phleboSpecifique as AnyRec | undefined
  const mergeBoolRecord = <T extends Record<string, boolean>>(empty: T, r: AnyRec | undefined): T => {
    if (!r) return empty
    const out: Record<string, boolean> = { ...empty }
    for (const k of Object.keys(empty)) {
      if (typeof r[k] === 'boolean') out[k] = r[k] as boolean
    }
    return out as T
  }
  return {
    ...flat,
    phase1Composantes: mergeBoolRecord(base.phase1Composantes, phase1C),
    phase2Composantes: mergeBoolRecord(base.phase2Composantes, phase2C),
    lipoSpecifique: {
      ...mergeBoolRecord({
        nutritionConseil: false, activitePhysique: false, psyAccompagnement: false,
      }, lipoS),
      chirurgieLiposuccionEnvisagee: (lipoS?.chirurgieLiposuccionEnvisagee as DlmPlanTraitement['lipoSpecifique']['chirurgieLiposuccionEnvisagee']) ?? '',
    },
    phleboSpecifique: {
      contentionMedicaleDegre: (phleboS?.contentionMedicaleDegre as DlmPlanTraitement['phleboSpecifique']['contentionMedicaleDegre']) ?? '',
      avisAngiologique: (phleboS?.avisAngiologique as DlmPlanTraitement['phleboSpecifique']['avisAngiologique']) ?? '',
      elevation: phleboS?.elevation === true,
      activeMobilisation: phleboS?.activeMobilisation === true,
    },
  }
}
