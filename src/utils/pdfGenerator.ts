import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { computeAge } from './clinicalPrompt';
import { composeBodyChart, BODY_CHART_W, BODY_CHART_H } from '../components/BodyDrawing';

// ── Nettoyage texte pour jsPDF (Helvetica ne supporte pas certains caractères) ─
// Robuste face au texte généré par IA : guillemets typographiques, tirets,
// bullets, exposants, flèches… tout ce qui n'est pas WinAnsi est filtré pour
// éviter les crashs jsPDF.
const sanitize = (text: string): string => {
  if (text == null) return ''
  return String(text)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2015\u2212]/g, '-')   // en/em-dash, minus
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')                        // non-breaking space
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')     // zero-width chars
    .replace(/[\u2022\u2023\u25E6\u2043\u204C\u204D]/g, '-') // bullets
    .replace(/\u00B2/g, '2')                        // superscript 2
    .replace(/\u00B3/g, '3')                        // superscript 3
    .replace(/\u00B9/g, '1')                        // superscript 1
    .replace(/\u2070/g, '0').replace(/\u2074/g, '4').replace(/\u2075/g, '5')
    .replace(/\u2076/g, '6').replace(/\u2077/g, '7').replace(/\u2078/g, '8').replace(/\u2079/g, '9')
    .replace(/\u2265/g, '>=')                       // ≥
    .replace(/\u2264/g, '<=')                       // ≤
    .replace(/\u2260/g, '!=')                       // ≠
    .replace(/\u00B1/g, '+/-')                      // ±
    .replace(/\u00D7/g, 'x')                        // ×
    .replace(/\u00F7/g, '/')                        // ÷
    .replace(/[\u2192\u27A1]/g, '->')               // → arrows
    .replace(/[\u2190]/g, '<-')                     // ←
    .replace(/[\u2194]/g, '<->')                    // ↔
    // Strip emoji + autres symboles non-WinAnsi qui crashent jsPDF
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{2500}-\u{27BF}]/gu, '') // box drawing, geometric shapes, arrows, dingbats
}

// ── Couleurs ──────────────────────────────────────────────────────────────────
const C = {
  primary: [30, 58, 138] as [number, number, number],     // #1e3a8a
  primaryLight: [239, 246, 255] as [number, number, number], // #eff6ff
  accent: [5, 150, 105] as [number, number, number],      // #059669
  text: [31, 41, 55] as [number, number, number],          // #1f2937
  muted: [107, 114, 128] as [number, number, number],      // #6b7280
  light: [229, 231, 235] as [number, number, number],      // #e5e7eb
  white: [255, 255, 255] as [number, number, number],
  red: [185, 28, 28] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
}

// ── Label maps universels ─────────────────────────────────────────────────────

const DOULEUR_LABELS: Record<string, string> = {
  evnPire: 'EVN — Pire', evnMieux: 'EVN — Mieux', evnMoy: 'EVN — Moyenne',
  douleurType: 'Type', nocturne: 'Nocturne', derouillage: 'Dérouillage matinal',
  debutSymptomes: 'Début des symptômes', facteurDeclenchant: 'Facteur déclenchant',
  mecanismeLesionnel: 'Mécanisme lésionnel',
  localisationInitiale: 'Localisation initiale', localisationActuelle: 'Localisation actuelle',
  situation: 'Évolution', douleurNocturne: 'Douleur nocturne',
  douleurNocturneType: 'Type nocturne', insomniante: 'Insomniante',
  derouillageMatinal: 'Dérouillage matinal', derouillageTemps: 'Durée dérouillage',
  derouillageFrequence: 'Fréquence dérouillage',
  mouvementsEmpirent: 'Mouvements aggravants', mouvementsSoulagent: 'Mouvements soulageants',
}

const FLAG_LABELS: Record<string, string> = {
  tttMedical: 'TTT médical', antecedents: 'Antécédents', comorbidites: 'Comorbidités',
  imageries: 'Imagerie(s)', traumatisme: 'Traumatisme récent', traumatismeRecent: 'Traumatisme récent',
  fievre: 'Fièvre', pertePoids: 'Perte de poids', atcdCancer: 'ATCD cancer',
  sommeilQuantite: 'Sommeil quantité', sommeilQualite: 'Sommeil qualité',
  tabagisme: 'Tabagisme', perteAppetit: "Perte d'appétit",
  fatigueRF: 'Fatigue inexpliquée', fatigueInexpliquee: 'Fatigue inexpliquée',
  fonctionVesicale: 'Fonction vésicale', fonctionAnale: 'Fonction anale',
  fonctionVesicaleAnale: 'Fonction vésicale / anale',
  fonctionVesicaleStatus: 'Fonction vésicale (statut)',
  fonctionVesicaleSymptomes: 'Symptômes vésicaux',
  selleAnesthesie: 'Anesthésie en selle',
  troublesMotricite: 'Troubles motricité MS', troublesMarche: 'Troubles de la marche',
  cephalees: 'Céphalées', cephaleesIntenses: 'Céphalées plus intenses',
  csIs: 'Utilisation prolongée CS / IS',
  douleurThoracique: 'Douleur thoracique', douleurDigestion: 'Douleur aggravée digestion',
  douleurTouxEternuement: 'Douleur toux / éternuement',
  // 5D 3N
  dizziness: 'Dizziness (vertiges)', dropAttacks: 'Drop attacks', diplopie: 'Diplopie',
  dysarthrie: 'Dysarthrie', dysphagie: 'Dysphagie', nystagmus: 'Nystagmus',
  nausees: 'Nausée / vomissements', numbness: 'Numbness',
  // Yellow
  croyances: 'Croyances', croyancesOrigine: 'Croyances — origine', croyancesTtt: 'Croyances — TTT',
  catastrophisme: 'Catastrophisme', fearAvoidance: 'Peur-évitement',
  peurEvitement: 'Peur-évitement', peurEvitementMouvements: 'Mouvements évités',
  attentes: 'Attentes', autoEfficacite: 'Auto-efficacité',
  flexibilitePsy: 'Flexibilité psychologique', strategieCoping: 'Stratégies de coping',
  hypervigilance: 'Hypervigilance', anxiete: 'Anxiété', depression: 'Dépression',
  coping: 'Coping', had: 'HAD',
  // Blue/Black
  at: 'Arrêt de travail', enAt: 'En AT', antecedentsAt: 'ATCD AT',
  antecedentsAtDetails: 'ATCD AT — détails',
  stressTravail: 'Stress travail', stressNiveau: 'Stress (/100)',
  conditionsSocio: 'Conditions socio-éco', conditionsSocioEco: 'Conditions socio-éco',
  travailExigeant: 'Travail exigeant', sousEstime: 'Sentiment sous-estimé',
  sousEstimeCollegues: 'Sous-estimé — collègues', sousEstimeDirection: 'Sous-estimé — direction',
  manqueControle: 'Manque de contrôle', travailAggrave: 'Travail aggrave',
  politiqueFlexible: "Politique d'entreprise flexible",
  difficultesAcces: "Difficulté d'accès aux soins", litige: 'Litige / indemnisation',
}

const SCORE_LABELS: Record<string, string> = {
  ffaam: 'F-FAAM', faam: 'F-FAAM', cait: 'CAIT',
  psfs: 'PSFS', psfs1: 'PSFS 1 — score', psfs2: 'PSFS 2 — score', psfs3: 'PSFS 3 — score',
  psfs1Label: 'PSFS 1 — activité', psfs2Label: 'PSFS 2 — activité', psfs3Label: 'PSFS 3 — activité',
  psfs1Notes: 'PSFS 1 — notes', psfs2Notes: 'PSFS 2 — notes', psfs3Notes: 'PSFS 3 — notes',
  koos: 'KOOS', fakps: 'F-AKPS', ikdc: 'IKDC', aclRsi: 'ACL-RSI', sf36: 'SF-36',
  hoos: 'HOOS', oxfordHip: 'Oxford Hip', hagos: 'HAGOS', efmi: 'EFMI', isc: 'ISC',
  ndi: 'NDI', painDetect: 'Pain DETECT', sensibilisation: 'Sensibilisation centrale',
  startBack: 'Start Back', orebro: 'Örebro', fabq: 'FABQ', eifel: 'EIFEL',
  scoreOSS: 'OSS', scoreConstant: 'Constant-Murley', scoreDASH: 'DASH', scoreRowe: 'Rowe',
  scoreHAD: 'HAD', scoreDN4: 'DN4', scoreSensibilisation: 'Sensibilisation Centrale',
  had: 'HAD', dn4: 'DN4', autres: 'Autres', autresScores: 'Autres', notes: 'Notes',
}

const EXAM_LABELS: Record<string, string> = {
  morfho: 'Morphostatique', morpho: 'Morphostatique', oedeme: 'Œdème',
  // morpho sub-keys
  rachis: 'Attitude rachis', mi: 'Attitude MI', corrigeable: 'Corrigeable',
  modifPosture: 'Modification posture', deformation: 'Déformation', shift: 'Shift latéral',
  attitude: 'Attitude', teteEnAvant: 'Tête en avant', torticolis: 'Torticolis',
  torticolisCorrigeable: 'Torticolis corrigeable',
  morphoRachisCervical: 'Rachis cervical', morphoRachisThoracique: 'Rachis thoracique',
  morphoCeintureScap: 'Ceinture scapulaire',
  // observation
  amyotrophie: 'Amyotrophie', amyotrophieLoc: 'Amyotrophie — localisation',
  boiterie: 'Boiterie marche', autre: 'Autre observation',
  amyoDeltoide: 'Amyo. deltoïde', amyoFosseSupraInfra: 'Amyo. fosse supra/infra-épineuse',
  amyoPeriScapulaire: 'Amyo. péri-scapulaire',
  // Mobilité add'l
  mobiliteRachisCervical: 'Mobilité rachis cervical', mobiliteRachisThoracique: 'Mobilité rachis thoracique',
  mobiliteAutresZones: 'Autres zones', autresZones: 'Autres zones',
  genoux: 'Mobilité genoux', chevilles: 'Mobilité chevilles',
  // Modif sympt
  testAssistanceScap: 'Test assistance scapulaire', stabilisationScapula: 'Stabilisation scapula',
  testRetractionScap: 'Test rétraction scapulaire', testTrapezeSup: 'Test trapèze supérieur',
  serrerPoings: 'Serrer les poings', ajoutResistance: 'Ajout de résistance',
  activationCoiffe: 'Activation coiffe', pasAvantPrealable: 'Pas en avant préalable',
  diminutionLevier: 'Diminution bras de levier',
  modifPositionThoracique: 'Modif. position thoracique', modifPositionCervicale: 'Modif. position cervicale',
  positionLomboPelvienne: 'Modif. position lombo-pelvienne', positionMI: 'Modif. position MI',
  activationAbducteurs: 'Activation abducteurs', activationTransverse: 'Activation transverse',
  repartitionPoids: 'Modif. répartition poids', diminutionRom: 'Diminution ROM',
  chaineOuverteFermee: 'Chaîne ouverte vs fermée', taping: 'Application taping',
  chaussage: 'Modif. chaussage',
}

const FORCE_LABELS: Record<string, string> = {
  // épaule
  planScapula90: 'Plan scapula 90°', re1: 'RE 1', re2StabEpaule: 'RE2 stab épaule',
  re2StabCharge: 'RE2 stab + charge', re2SansStab: 'RE2 sans stab',
  re2SansStabCharge: 'RE2 sans stab + charge', ri2StabEpaule: 'RI2 stab épaule',
  ri2StabCharge: 'RI2 stab + charge', ri2SansStab: 'RI2 sans stab',
  ri2SansStabCharge: 'RI2 sans stab + charge',
  // MI
  ilioPsoas: 'Ilio-psoas', quadriceps: 'Quadriceps', ischios: 'Ischio-jambiers',
  abducteurs: 'Abducteurs', adducteurs: 'Adducteurs',
  rotateursExt: 'Rotateurs externes', rotateursInt: 'Rotateurs internes',
  tricepsSural: 'Triceps sural', tibialAnt: 'Tibial antérieur',
  tibialPost: 'Tibial postérieur', longFibulaire: 'Long fibulaire', courtFibulaire: 'Court fibulaire',
  // Abdo
  transverse: 'Transverse', droitsAbdomen: 'Droits abdomen', obliques: 'Obliques',
}

const NEURO_LABELS: Record<string, string> = {
  reflexes: 'Réflexes', reflexesAutres: 'Réflexes — autres',
  reflexeBicipital: 'Réflexe bicipital (C5-C6)', reflexeBrachioRadial: 'Réflexe brachio-radial (C6)',
  reflexeTricipital: 'Réflexe tricipital (C7)', reflexeQuadriciptal: 'Réflexe quadricipital',
  reflexeQuadricipital: 'Réflexe quadricipital', reflexeAchilleen: 'Réflexe achilléen', reflexeAchileen: 'Réflexe achilléen',
  babinski: 'Babinski', hoffman: 'Hoffman', deficitMoteur: 'Déficit moteur',
  sensibilite: 'Sensibilité', sensibiliteNociceptive: 'Sensibilité nociceptive',
  sensibiliteThermique: 'Sensibilité thermique', sensibiliteEpicritique: 'Sensibilité épicritique',
  troublesSensitifsNotes: 'Troubles sensitifs (schéma)',
  // Niveaux lombaires
  deficitL2: 'Déficit L2', deficitL3: 'Déficit L3', deficitL4: 'Déficit L4',
  deficitL5: 'Déficit L5', deficitS1: 'Déficit S1', deficitS2: 'Déficit S2',
  deficitS3S4: 'Déficit S3-S4',
  // Niveaux cervicaux
  deficitC4: 'Déficit C4', deficitC5: 'Déficit C5', deficitC6: 'Déficit C6',
  deficitC7: 'Déficit C7', deficitC8: 'Déficit C8', deficitT1: 'Déficit T1',
  // ULTT
  ultt1: 'ULTT 1 — Médian', ultt2: 'ULTT 2 — Médian',
  ultt3: 'ULTT 3 — Radial', ultt4: 'ULTT 4 — Ulnaire',
  // Mécano
  lasegue: 'Lasègue', pkb: 'PKB', slump: 'Slump',
}

const TESTS_LABELS: Record<string, string> = {
  // Épaule
  bearHug: 'Bear Hug', bellyPress: 'Belly Press', externalRotLagSign: 'External Rotation Lag Sign',
  obrien: "O'Brien", palpationAC: 'Palpation AC', crossArm: 'Cross-Arm',
  abdHorizResist: 'Abduction horiz. résistance',
  apprehensionRelocation: 'Apprehension / Relocation', signeSulcus: 'Signe du Sulcus', jerkTest: 'Jerk Test',
  ckcuest: 'CKCUEST', ulrt: 'ULRT', uqYbt: 'UQ-YBT', setPset: 'SET / PSET', smbtSasspt: 'SMBT / SASSPT',
  autresTestsFonctionnels: 'Autres tests fonctionnels',
  // Genou
  lachman: 'Lachman', tiroirAnt: 'Tiroir antérieur', tiroirPost: 'Tiroir postérieur',
  lcl: 'Lig. collat. latéral (LCL)', lcm: 'Lig. collat. médial (LCM)',
  thessaly: 'Thessaly', renne: 'Renne', noble: 'Noble', vague: 'Vague rotulien', hoffa: 'Hoffa',
  // Hanche
  faddir: 'FADDIR', faber: 'FABER', thomas: 'Thomas', ober: 'Ober',
  clusterLaslett: 'Cluster Laslett', clusterSultive: 'Cluster Sultive',
  heer: 'HEER', abdHeer: 'ABD-HEER',
  // Cervical
  spurling: 'Spurling', distraction: 'Distraction', adson: 'Adson', roos: 'Roos', ta: 'TA',
  // Lombaire
  extensionRotation: 'Extension-Rotation', proneInstability: 'Prone Instability',
  // Cheville (talo-crurale, syndesmose, etc.)
  altd: 'ALTD', raltd: 'RALTD', talarTiltVarus: 'Talar Tilt varus', talarTiltValgus: 'Talar Tilt valgus',
  kleiger: 'Kleiger', fibularTranslation: 'Fibular Translation',
  tiroirTalienTransversal: 'Tiroir talien transversal', squeeze: 'Squeeze',
  grinding: 'Grinding', impaction: 'Impaction', longFlechisseurHallux: 'Long fléchisseur hallux',
  molloy: 'Molloy', varusFd: 'Varus FD', valgusFd: 'Valgus FD', cisaillementFd: 'Cisaillement FD',
  neutralHeel: 'Neutral Heel — Spring Lig.', adductionSupination: 'Adduction-Supination',
  abductionPronation: 'Abduction-Pronation',
  autres: 'Autres tests',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Les tests cliniques sont souvent stockés comme { status: '+'/'-', details: '' }
// (parfois sérialisés en JSON). On convertit ça en chaîne lisible et on élimine
// les tests négatifs (status '-') qui n'apportent pas d'info diagnostique.
const formatStatusDetails = (obj: { status?: unknown; details?: unknown }): string | null => {
  const status = typeof obj.status === 'string' ? obj.status.trim() : ''
  const details = typeof obj.details === 'string' ? obj.details.trim() : ''
  if (!status && !details) return null
  if (status === '-' || status === 'Négatif' || status === 'negatif') return null
  const label = status === '+' || status === 'Positif' || status === 'positif' ? 'Positif' : status
  return details ? `${label} — ${details}` : (label || null)
}

const fmt = (val: unknown): string | null => {
  if (val === null || val === undefined) return null
  if (typeof val === 'boolean') return val ? 'Oui' : 'Non'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed) return null
    // Certains tests sont sérialisés en JSON dans le store
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed && typeof parsed === 'object' && ('status' in parsed || 'details' in parsed)) {
          return formatStatusDetails(parsed as { status?: unknown; details?: unknown })
        }
      } catch { /* pas du JSON valide, on garde la string brute */ }
    }
    return trimmed
  }
  if (typeof val === 'object') {
    const o = val as { status?: unknown; details?: unknown }
    if ('status' in o || 'details' in o) return formatStatusDetails(o)
    return null
  }
  return null
}

// Clés à ne jamais imprimer en texte : body chart (dataURL base64, rendu en
// image en section 2), notes libres, et champs "_detail" dérivés.
const SKIP_KEYS = new Set(['bodyChart', 'notes', 'silhouette', 'silhouetteData'])

const renderObj = (obj: Record<string, unknown>, labels: Record<string, string>): { label: string; value: string }[] => {
  const out: { label: string; value: string }[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (k.endsWith('_detail') || SKIP_KEYS.has(k)) continue
    const display = fmt(v)
    if (!display) continue
    const label = labels[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
    out.push({ label, value: display })
    // If there's a _detail field
    const detail = fmt(obj[k + '_detail'])
    if (detail) out.push({ label: `  → Précision`, value: detail })
  }
  return out
}

// Filtre le bruit clinique : on garde uniquement les valeurs qui apportent
// une information positive. "Non", "Aucun", "Normal", "RAS"… disparaissent
// pour compresser radicalement la longueur du PDF.
const NON_INFORMATIVE = new Set(['non', 'aucun', 'aucune', 'ras', 'normal', 'normale', 'n/a', 'na', '—', '-'])
const isRelevant = (val: string): boolean => {
  const v = val.trim().toLowerCase()
  if (!v) return false
  return !NON_INFORMATIVE.has(v)
}

const renderObjCompact = (obj: Record<string, unknown>, labels: Record<string, string>): { label: string; value: string }[] =>
  renderObj(obj, labels).filter(e => isRelevant(e.value))

// ── Export types ──────────────────────────────────────────────────────────────

export type ImprovementEntry = { num: number; date: string; evn: number | null; delta: number | null };

// ── MAIN PDF GENERATOR ───────────────────────────────────────────────────────

interface PatientInfo {
  nom: string
  prenom: string
  dateNaissance: string
  sexe?: 'masculin' | 'feminin'
  profession?: string
  sport?: string
  famille?: string
  chirurgie?: string
  notes?: string
}

export const generatePDF = async (
  patientId: PatientInfo,
  generalInfo: PatientInfo,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zoneData: Record<string, any>,
  bilanZoneData?: { sectionTitle: string; data: Record<string, unknown> } | null,
  improvementData?: { generalScore: number | null; bilans: ImprovementEntry[] } | null,
  analyseIA?: { diagnostic: { titre: string; description: string }; hypotheses: Array<{ rang: number; titre: string; probabilite: number; justification: string }>; priseEnCharge: Array<{ phase: string; titre: string; detail: string }>; alertes: string[] } | null,
  notesLibres?: string,
  pdfTitle?: string,
): Promise<{ blob: Blob; fileName: string }> => {
  const doc = new jsPDF()
  const W = 210
  const ML = 18
  const MR = 18
  const MW = W - ML - MR
  let y = 0

  const today = new Date()
  const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const dateFile = today.toISOString().split('T')[0]

  const check = (need = 12) => { if (y + need > 278) { doc.addPage(); y = 18 } }
  const split = (text: string, maxW: number) => doc.splitTextToSize(sanitize(text), maxW)

  const drawLine = (y1: number, color = C.light) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(0.3)
    doc.line(ML, y1, W - MR, y1)
  }

  // ── En-tête professionnel ──────────────────────────────────────────────────
  doc.setFillColor(...C.primary)
  doc.rect(0, 0, W, 32, 'F')

  // Bande accent
  doc.setFillColor(...C.accent)
  doc.rect(0, 32, W, 1.5, 'F')

  doc.setTextColor(...C.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(sanitize(pdfTitle ?? 'BILAN EN PHYSIOTHÉRAPIE'), ML, 14)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${patientId.prenom ?? ''} ${patientId.nom ?? ''}  ·  ${bilanZoneData?.sectionTitle ?? ''}`, ML, 22)
  doc.text(dateStr, W - MR - doc.getTextWidth(dateStr), 22)

  doc.setFontSize(7.5)
  doc.text('Document confidentiel — usage médical uniquement', ML, 29)

  doc.setTextColor(...C.text)
  y = 40

  // ── Fonctions de dessin ────────────────────────────────────────────────────

  const sectionTitle = (title: string, num?: number) => {
    check(18)
    y += 4
    doc.setFillColor(...C.primaryLight)
    doc.roundedRect(ML - 1, y - 5.5, MW + 2, 9, 1, 1, 'F')
    doc.setFillColor(...C.primary)
    doc.rect(ML - 1, y - 5.5, 2.5, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...C.primary)
    doc.text(num ? `${num}. ${title}` : title, ML + 4, y)
    doc.setTextColor(...C.text)
    y += 8
  }

  const subTitle = (title: string) => {
    check(10)
    y += 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...C.primary)
    doc.text(`> ${title}`, ML + 2, y)
    doc.setTextColor(...C.text)
    y += 5
  }

  const field = (label: string, value: string, indent = 0) => {
    check(8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    const lbl = sanitize(`${label} : `)
    const lblW = doc.getTextWidth(lbl)
    doc.text(lbl, ML + 4 + indent, y)
    doc.setFont('helvetica', 'normal')
    const lines = split(value, MW - 8 - indent - lblW)
    doc.text(lines[0] ?? '', ML + 4 + indent + lblW, y)
    y += 4.5
    for (let i = 1; i < lines.length; i++) {
      check(5)
      doc.text(lines[i], ML + 4 + indent + lblW, y)
      y += 4.5
    }
  }

  const fieldLine = (label: string, value: string) => {
    const display = value?.trim()
    if (display) field(label, display)
  }

  const bulletPoint = (text: string, indent = 4) => {
    check(7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const lines = split(text, MW - 8 - indent)
    doc.text('\u2022', ML + indent, y)
    for (let i = 0; i < lines.length; i++) {
      check(5)
      doc.text(lines[i], ML + indent + 4, y)
      y += 4.5
    }
  }

  // ── 1. Identité du patient ──────────────────────────────────────────────────
  let secNum = 1
  sectionTitle('Identité du patient', secNum++)

  // Bloc identité en cadre
  doc.setFillColor(250, 250, 252)
  doc.roundedRect(ML, y - 2, MW, 22, 2, 2, 'F')
  doc.setDrawColor(...C.light)
  doc.roundedRect(ML, y - 2, MW, 22, 2, 2, 'S')

  const age = patientId.dateNaissance ? computeAge(patientId.dateNaissance) : null
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  const headline = `${(patientId.nom ?? '').toUpperCase()} ${patientId.prenom ?? ''}${age !== null ? ` - ${age} ans` : ''}`
  doc.text(headline, ML + 6, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  if (patientId.dateNaissance) {
    const neLbl = patientId.sexe === 'feminin' ? 'Née' : 'Né'
    doc.text(`${neLbl} le ${patientId.dateNaissance}`, ML + 6, y + 12)
  }
  if (generalInfo.profession) doc.text(`Profession : ${generalInfo.profession}`, ML + MW / 2, y + 12)
  doc.setTextColor(...C.text)
  y += 26

  // Infos complémentaires
  if (generalInfo.sport || generalInfo.famille || generalInfo.chirurgie) {
    fieldLine('Activité physique', generalInfo.sport ?? '')
    fieldLine('Antécédents', generalInfo.famille ?? '')
    fieldLine('Chirurgie', generalInfo.chirurgie ?? '')
  }

  // ── 2. Schéma corporel (body chart) ───────────────────────────────────────
  // Priorité au nouveau body chart (dessin libre sur silhouette image).
  // Fallback : ancienne cartographie par zones (silhouetteData) pour les
  // bilans créés avant la refonte.
  const bodyChartDrawing = (
    ((bilanZoneData?.data?.douleur as Record<string, unknown> | undefined)?.bodyChart as string | undefined) ?? ''
  )
  if (bodyChartDrawing) {
    sectionTitle('Schéma corporel', secNum++)
    const composite = await composeBodyChart(bodyChartDrawing)
    if (composite) {
      const aspect = BODY_CHART_H / BODY_CHART_W
      const imgW = Math.min(MW, 120)
      const imgH = imgW * aspect
      check(imgH + 6)
      const imgX = ML + (MW - imgW) / 2
      doc.addImage(composite, 'PNG', imgX, y, imgW, imgH)
      y += imgH + 4
    }
  } else {
    // Legacy : ancienne cartographie par zones
    const savedZones = Object.keys(zoneData).filter(z => zoneData[z]?.saved)
    if (savedZones.length > 0) {
      sectionTitle('Cartographie corporelle', secNum++)

      const renderView = async (divId: string, keys: string[], label: string) => {
        const el = document.getElementById(divId)
        if (!el) return
        const active = savedZones.filter(z => keys.some(k => z.includes(k)))
        if (active.length === 0) return
        check(85)
        const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 })
        const img = canvas.toDataURL('image/png')
        doc.addImage(img, 'PNG', ML, y, 38, 72)

        let ty = y + 4
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(label, ML + 42, ty)
        ty += 5
        drawLine(ty - 2, C.light)

        active.forEach(zone => {
          const d = zoneData[zone]
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8.5)
          doc.text(zone, ML + 42, ty + 2)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          let info = `EVN ${d.intensite}/10`
          if (d.type) info += ` · ${d.type}`
          if (d.fondDouloureux) info += ' · Fond douloureux'
          if (d.douleurNocturne) info += ' · Nocturne'
          doc.text(info, ML + 42, ty + 6.5)
          if (d.notes) {
            doc.setFontSize(7.5)
            doc.setTextColor(...C.muted)
            const noteLines = split(d.notes, MW - 46)
            doc.text(noteLines[0] ?? '', ML + 42, ty + 10.5)
            doc.setTextColor(...C.text)
            ty += 15
          } else {
            ty += 11
          }
        })
        y = Math.max(y + 76, ty + 4)
      }

      const faceKeys = ['Face', 'Poitrine', 'Abdomen', 'Genou Droit', 'Tibia Droit', 'Pied Droit', 'Genou Gauche', 'Tibia Gauche', 'Pied Gauche']
      const dosKeys = ['Dos', 'Lombaires', 'Fessiers', 'Ischio', 'Creux Poplité', 'Mollet', 'Talon']
      await renderView('pdf-face-svg', faceKeys, 'Vue antérieure')
      await renderView('pdf-dos-svg', dosKeys, 'Vue postérieure')
    }
  }

  // ── 3. Bilan spécifique par zone ──────────────────────────────────────────
  if (bilanZoneData?.data) {
    sectionTitle(`Bilan spécifique — ${bilanZoneData.sectionTitle}`, secNum++)
    const d = bilanZoneData.data

    // Douleur — on ne conserve que les champs informatifs
    if (d.douleur) {
      const entries = renderObjCompact(d.douleur as Record<string, unknown>, DOULEUR_LABELS)
      if (entries.length > 0) {
        subTitle('Douleur')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Drapeaux cliniques — Red / Yellow / Blue-Black fusionnés, positifs uniquement.
    // Masqué quand l'analyse IA est jointe : les alertes IA couvrent déjà ce contenu
    // avec interprétation, pas la peine d'imprimer les données brutes deux fois.
    const showFlagsBlock = !analyseIA || analyseIA.alertes.length === 0
    if (showFlagsBlock) {
      const flagPositives: Array<{ cat: string; label: string; value: string }> = []
      const collectFlags = (cat: string, obj: unknown) => {
        if (!obj || typeof obj !== 'object') return
        for (const e of renderObjCompact(obj as Record<string, unknown>, FLAG_LABELS)) {
          flagPositives.push({ cat, label: e.label, value: e.value })
        }
      }
      collectFlags('Red', d.redFlags)
      collectFlags('Yellow', d.yellowFlags)
      collectFlags('Blue/Black', d.blueBlackFlags)
      if (flagPositives.length > 0) {
        subTitle('Drapeaux cliniques (positifs)')
        for (const p of flagPositives) {
          const txt = p.value === 'Oui' ? `${p.cat} · ${p.label}` : `${p.cat} · ${p.label} — ${p.value}`
          bulletPoint(txt, 6)
        }
        y += 2
      }
    }

    // 5D 3N (cervical — signes de VBI) — positifs uniquement
    if (d.cinqD3N) {
      const entries = renderObjCompact(d.cinqD3N as Record<string, unknown>, {
        dizziness: 'Vertiges', dropAttacks: 'Drop attacks', diplopie: 'Diplopie',
        dysarthrie: 'Dysarthrie', dysphagie: 'Dysphagie', nystagmus: 'Nystagmus',
        nausees: 'Nausées', numbness: 'Engourdissements',
      })
      if (entries.length > 0) {
        subTitle('5D 3N')
        bulletPoint(entries.map(e => e.value === 'Oui' ? e.label : `${e.label} — ${e.value}`).join(' · '), 6)
        y += 2
      }
    }

    // Ottawa (cheville) — critères positifs uniquement
    if (d.ottawa) {
      const entries = renderObjCompact(d.ottawa as Record<string, unknown>, {
        malleoleExternePalpation: 'Malléole externe', malleoleInternePalpation: 'Malléole interne',
        naviculairePalpation: 'Naviculaire', base5ePalpation: 'Base 5e métatarsien',
        appuiImpossible: 'Appui impossible',
        malleoleMediale: 'Malléole médiale', malleoleLaterale: 'Malléole latérale',
        cinquiemeMetatarsien: 'Base 5e métatarsien', naviculaire: 'Naviculaire',
        appuiUnipodal: 'Appui unipodal impossible',
      })
      if (entries.length > 0) {
        subTitle("Critères d'Ottawa")
        bulletPoint(entries.map(e => e.value === 'Oui' ? e.label : `${e.label} — ${e.value}`).join(' · '), 6)
        y += 2
      }
    }

    // Antécédents d'entorse (cheville)
    if (d.antecedentsEntorse) {
      const entries = renderObjCompact(d.antecedentsEntorse as Record<string, unknown>, {
        precedentes: 'Précédentes entorses', precedentesMemeCheville: 'Même cheville',
        precedentesCombien: 'Combien', precedentesType: 'Type',
        autreCheville: 'Autre cheville', autreChevilleCombien: 'Combien (autre)', autreChevilleType: 'Type (autre)',
      })
      if (entries.length > 0) {
        subTitle("Antécédents d'entorse")
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Examen clinique — chaque sous-groupe est compacté sur une seule ligne
    // wrappée (label + valeurs séparées par " · "). L'ancienne version
    // imprimait un tableau par sous-groupe, ce qui produisait 2-3 pages de
    // bruit pour un bilan complet.
    if (d.examClinique) {
      const ec = d.examClinique as Record<string, unknown>
      const compactSubGroup = (label: string, obj: unknown, labels: Record<string, string> = {}): { label: string; value: string } | null => {
        if (!obj || typeof obj !== 'object') return null
        const parts: string[] = []
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (k.endsWith('_detail') || SKIP_KEYS.has(k)) continue
          const key = labels[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
          if (v && typeof v === 'object') {
            // APGD { ag, ad, pg, pd } | { gauche, droite } | { perte, symptomes }
            const r = v as Record<string, string>
            if (r.ag || r.ad || r.pg || r.pd) {
              const bits: string[] = []
              if (r.ag || r.ad) bits.push(`A G${r.ag || '—'}/D${r.ad || '—'}`)
              if (r.pg || r.pd) bits.push(`P G${r.pg || '—'}/D${r.pd || '—'}`)
              if (bits.length > 0) parts.push(`${key} ${bits.join(' ')}`)
            } else if (r.gauche || r.droite) {
              parts.push(`${key} G${r.gauche || '—'}/D${r.droite || '—'}`)
            } else if (r.perte || r.symptomes) {
              const bits: string[] = []
              if (r.perte) bits.push(`perte ${r.perte}`)
              if (r.symptomes) bits.push(r.symptomes)
              if (bits.length > 0) parts.push(`${key} ${bits.join(', ')}`)
            }
          } else {
            const display = fmt(v)
            if (!display || !isRelevant(display)) continue
            parts.push(display === 'Oui' ? key : `${key} ${display}`)
          }
        }
        return parts.length > 0 ? { label, value: parts.join(' · ') } : null
      }

      // Champs simples de premier niveau (ancien 'morfho'/'oedeme' en string)
      const ecSimple: { label: string; value: string }[] = []
      for (const [k, v] of Object.entries(ec)) {
        if (typeof v === 'object') continue
        const display = fmt(v)
        if (display && isRelevant(display)) ecSimple.push({ label: EXAM_LABELS[k] ?? k, value: display })
      }
      const ecGroups = [
        compactSubGroup('Morphostatique', ec.morpho, EXAM_LABELS),
        compactSubGroup('Observation', ec.observation, EXAM_LABELS),
        compactSubGroup('Œdème', ec.oedeme, EXAM_LABELS),
        compactSubGroup('Mobilité', ec.mobilite, EXAM_LABELS),
        compactSubGroup('Mobilité épaule', ec.mobiliteEpaule, EXAM_LABELS),
        compactSubGroup('Mobilité hanche', ec.mobiliteHanche, EXAM_LABELS),
        compactSubGroup('Mobilité genou', ec.mobiliteGenou, EXAM_LABELS),
        compactSubGroup('Mobilité cheville', ec.mobiliteCheville, EXAM_LABELS),
        compactSubGroup('Mobilité lombaire', ec.mobiliteLombaire, EXAM_LABELS),
        compactSubGroup('Mobilité cervicale', ec.mobiliteCervical, EXAM_LABELS),
        compactSubGroup('Mobilité autres', ec.mobAutres, EXAM_LABELS),
        compactSubGroup('Zones adjacentes', ec.zones, EXAM_LABELS),
        compactSubGroup('Fonctionnel', ec.fonctionnel, EXAM_LABELS),
        compactSubGroup('WBLT', ec.wblt, EXAM_LABELS),
        compactSubGroup('Modifs symptômes', ec.modifSymp, EXAM_LABELS),
        compactSubGroup('Force (legacy)', ec.force, FORCE_LABELS),
      ].filter((e): e is { label: string; value: string } => e !== null)
      if (ecSimple.length + ecGroups.length > 0) {
        subTitle('Examen clinique')
        ecSimple.forEach(e => field(e.label, e.value))
        ecGroups.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Force musculaire — compacté : une ligne "Force" + une ligne "Abdo"
    if (d.forceMusculaire) {
      const fm = d.forceMusculaire as Record<string, unknown>
      const fmEntries: { label: string; value: string }[] = []
      if (fm.force && typeof fm.force === 'object') {
        const parts: string[] = []
        for (const [k, v] of Object.entries(fm.force as Record<string, unknown>)) {
          const r = v as { gauche?: string; droite?: string }
          if (r.gauche || r.droite) parts.push(`${FORCE_LABELS[k] ?? k} G${r.gauche || '—'}/D${r.droite || '—'}`)
        }
        if (parts.length > 0) fmEntries.push({ label: 'Force', value: parts.join(' · ') })
      }
      if (fm.abdo && typeof fm.abdo === 'object') {
        const parts: string[] = []
        for (const [k, v] of Object.entries(fm.abdo as Record<string, unknown>)) {
          const display = fmt(v)
          if (!display || !isRelevant(display)) continue
          parts.push(display === 'Oui' ? (FORCE_LABELS[k] ?? k) : `${FORCE_LABELS[k] ?? k} ${display}`)
        }
        if (parts.length > 0) fmEntries.push({ label: 'Abdo', value: parts.join(' · ') })
      }
      const otherEntries = renderObjCompact(
        Object.fromEntries(Object.entries(fm).filter(([k]) => !['force', 'abdo'].includes(k))),
        { autresForce: 'Autres tests force', marqueursAvant: 'Mvts répétés — marqueurs', resultats: 'Mvts répétés — résultats' }
      )
      if (fmEntries.length + otherEntries.length > 0) {
        subTitle('Force musculaire')
        fmEntries.forEach(e => field(e.label, e.value))
        otherEntries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Neurologique — positifs uniquement
    if (d.neurologique) {
      const entries = renderObjCompact(d.neurologique as Record<string, unknown>, NEURO_LABELS)
      if (entries.length > 0) {
        subTitle('Examen neurologique')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Mécanosensibilité — positifs uniquement
    if (d.mecanosensibilite) {
      const entries = renderObjCompact(d.mecanosensibilite as Record<string, unknown>, NEURO_LABELS)
      if (entries.length > 0) {
        subTitle('Mécanosensibilité')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Mouvements répétés (tableau dynamique : array)
    if (Array.isArray(d.mouvementsRepetes) && d.mouvementsRepetes.length > 0) {
      const rows = d.mouvementsRepetes as Array<{ mouvement?: string; avant?: string; apres?: string }>
      const filled = rows.filter(r => r.mouvement || r.avant || r.apres)
      if (filled.length > 0) {
        subTitle('Mouvements répétés')
        filled.forEach((r, i) => {
          field(`Mvt ${i + 1}`, `${r.mouvement || '—'} | avant: ${r.avant || '—'} | après: ${r.apres || '—'}`)
        })
        y += 2
      }
    }

    // Tests ligamentaires — positifs uniquement
    if (d.testsLigamentaires) {
      const entries = renderObjCompact(d.testsLigamentaires as Record<string, unknown>, TESTS_LABELS)
      if (entries.length > 0) {
        subTitle('Tests ligamentaires')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Tests spécifiques — positifs uniquement
    if (d.tests || d.testsSpecifiques) {
      const src = (d.testsSpecifiques ?? d.tests) as Record<string, unknown>
      const entries = renderObjCompact(src, TESTS_LABELS)
      if (entries.length > 0) {
        subTitle('Tests spécifiques')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Équilibre (cheville) — scores chiffrés, on les conserve tous
    if (d.equilibre) {
      const entries = renderObjCompact(d.equilibre as Record<string, unknown>, {
        footLiftGauche: 'Foot Lift G', footLiftDroite: 'Foot Lift D',
        bessGauche: 'BESS G /60', bessDroite: 'BESS D /60',
        yBalanceGauche: 'Y Balance G', yBalanceDroite: 'Y Balance D',
      })
      if (entries.length > 0) {
        subTitle('Équilibre postural')
        bulletPoint(entries.map(e => `${e.label} ${e.value}`).join(' · '), 6)
        y += 2
      }
    }

    // PSFS (nouvelle structure : array)
    if (Array.isArray(d.psfs) && d.psfs.length > 0) {
      const items = d.psfs as Array<{ label?: string; score?: string; notes?: string }>
      const filled = items.filter(i => i.label || i.score || i.notes)
      if (filled.length > 0) {
        subTitle('Patient Specific Functional Scale (PSFS)')
        filled.forEach((it, i) => {
          field(`Activité ${i + 1}`, `${it.label || '—'} — ${it.score || '—'}/10${it.notes ? ` (${it.notes})` : ''}`)
        })
        y += 2
      }
    }

    // Scores fonctionnels — compactés sur une ligne wrappée
    if (d.scores) {
      const entries = renderObjCompact(d.scores as Record<string, unknown>, SCORE_LABELS)
      if (entries.length > 0) {
        subTitle('Scores fonctionnels')
        bulletPoint(entries.map(e => `${e.label} ${e.value}`).join(' · '), 6)
        y += 2
      }
    }

    // Contrat kiné
    const contrat = d.contrat ?? d.contratKine
    if (contrat && typeof contrat === 'object') {
      const c = contrat as Record<string, unknown>
      // New structure: objectifs is an array of {titre, cible, dateCible}
      const objSrc = Array.isArray(c.objectifs) ? c.objectifs : Array.isArray(c.objectifsItems) ? c.objectifsItems : null
      const entries: { label: string; value: string }[] = []
      if (Array.isArray(objSrc) && objSrc.length > 0) {
        const items = objSrc as Array<{ titre?: string; cible?: string; dateCible?: string }>
        items.forEach((o, i) => {
          if (o.titre) entries.push({ label: `Objectif ${i + 1}`, value: o.titre + (o.cible ? ` — ${o.cible}` : '') + (o.dateCible ? ` (${o.dateCible})` : '') })
        })
      } else if (typeof c.objectifs === 'string') {
        entries.push({ label: 'Objectifs', value: c.objectifs })
      } else if (typeof c.objectifsSMART === 'string') {
        entries.push({ label: 'Objectifs SMART', value: c.objectifsSMART })
      }
      const auto = fmt(c.autoReeducation ?? c.autoReedo)
      if (auto) entries.push({ label: 'Auto-rééducation', value: auto })
      const freq = fmt(c.frequenceDuree)
      if (freq) entries.push({ label: 'Fréquence / Durée', value: freq })
      const cnsLegacy = fmt(c.conseils)
      if (cnsLegacy) entries.push({ label: 'Conseils', value: cnsLegacy })
      if (entries.length > 0) {
        subTitle('Contrat thérapeutique')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Conseils & recommandations (nouvelle section dédiée)
    if (d.conseils && typeof d.conseils === 'object') {
      const recos = fmt((d.conseils as Record<string, unknown>).recos)
      if (recos) {
        subTitle('Conseils & recommandations')
        field('Recommandations', recos)
        y += 2
      }
    }

    // ── DLM-spécifique : œdèmes, mesures Kuhnke, stades, plan CDT ─────────
    // Le bilan DLM a une structure dédiée (cf. drainageLymphatique/dlmTypes).
    // On détecte sa présence via oedemeTypes et on rend une vue compacte.
    const isDLM = Array.isArray(d.oedemeTypes)
    if (isDLM) {
      const OEDEME_LABELS: Record<string, string> = {
        lymphoedeme: 'Lymphœdème', lipoedeme: 'Lipœdème', phleboedeme: 'Phlébœdème',
      }
      const COTE_LABELS: Record<string, string> = { D: 'Droit', G: 'Gauche', bilateral: 'Bilatéral' }

      // Synthèse type / côté / régions
      const types = (d.oedemeTypes as string[]).map(t => OEDEME_LABELS[t] ?? t).filter(Boolean)
      if (types.length > 0 || d.cote || (Array.isArray(d.regions) && d.regions.length > 0)) {
        subTitle('Drainage Lymphatique — synthèse')
        if (types.length > 0) field('Type(s) d\'œdème', types.join(' + '))
        if (d.cote) field('Côté', COTE_LABELS[d.cote as string] ?? String(d.cote))
        if (Array.isArray(d.regions) && d.regions.length > 0) {
          field('Régions atteintes', (d.regions as string[]).join(', '))
        }
        if (typeof d.bodyChartAnnotations === 'string' && d.bodyChartAnnotations.trim()) {
          field('Annotations topographiques', d.bodyChartAnnotations.trim())
        }
        y += 2
      }

      // Contre-indications
      if (d.contreIndications && typeof d.contreIndications === 'object') {
        const ci = d.contreIndications as Record<string, unknown>
        const positives: string[] = []
        const CI_LABELS: Record<string, string> = {
          thromboseAigue: 'TVP aiguë', insuffisanceCardiaqueDecompensee: 'IC décompensée',
          infectionAigue: 'Infection aiguë', cancerActifNonTraite: 'Cancer évolutif non traité',
          hypotensionSevere: 'Hypotension sévère', arythmie: 'Arythmie',
          insuffisanceRenaleSevere: 'IR sévère', trombopeniePlaquettes: 'Thrombopénie',
          asthmesevere: 'Asthme sévère', hypothyroidieSevere: 'Hypothyroïdie sévère',
          grossesseT1: 'Grossesse T1', plaiesCutaneesOuvertes: 'Plaies ouvertes',
          mycoseActive: 'Mycose active', douleurInexpliquee: 'Douleur inexpliquée',
        }
        for (const [k, lbl] of Object.entries(CI_LABELS)) {
          if (ci[k] === 'oui') positives.push(lbl)
        }
        const decisionLabels: Record<string, string> = {
          priseEnCharge: 'Prise en charge', reportee: 'Reportée', refusee: 'Refusée — réorientation',
        }
        if (positives.length > 0 || ci.prescriptionMedicale === 'oui' || ci.decision) {
          subTitle('Contre-indications & encadrement')
          if (positives.length > 0) field('CI positives', positives.join(' · '))
          if (ci.prescriptionMedicale === 'oui') {
            field('Prescription médicale', `Présente${ci.prescriptionDate ? ` (${ci.prescriptionDate})` : ''}`)
          }
          if (ci.decision) field('Décision kiné', decisionLabels[ci.decision as string] ?? String(ci.decision))
          if (ci.motifDecision) field('Motif', String(ci.motifDecision))
          y += 2
        }
      }

      // Anamnèse — synthèse compacte
      if (d.anamnese && typeof d.anamnese === 'object') {
        const a = d.anamnese as Record<string, unknown>
        const ANAM_LABELS: Record<string, string> = {
          ageApparition: 'Âge apparition', delaiDepuisApparition: 'Délai',
          evolutionDecrite: 'Évolution', facteursAggravants: 'Aggravants',
          facteursAmeliorants: 'Améliorants', douleurEvn: 'Douleur EVA /10',
          lourdeur: 'Lourdeur', tension: 'Tension', paresthesies: 'Paresthésies',
          pruritus: 'Prurit', cellulites: 'ATCD érysipèle', cellulitesEpisodes: 'Épisodes',
          ulceres: 'Ulcères', ulceresLocalisation: 'Loc. ulcères',
          atcdChirurgicaux: 'ATCD chirurgicaux', curageGanglionnaire: 'Curage',
          curageDetail: 'Détail curage', radiotherapie: 'Radiothérapie',
          radiotherapieZones: 'Zones RT', cancer: 'Cancer', cancerType: 'Type cancer',
          cancerStatut: 'Statut', chimioActuelle: 'Chimio en cours',
          insuffisanceVeineuse: 'IV chronique', insuffisanceCardiaque: 'IC',
          insuffisanceRenale: 'IR', diabete: 'Diabète', obesite: 'Obésité', imc: 'IMC',
          thromboseATCD: 'ATCD thrombose', filariose: 'Filariose', voyageEndemique: 'Voyage endémique',
          atcdFamiliauxLymphoedeme: 'ATCD fam. lymphœdème',
          atcdFamiliauxLipoedeme: 'ATCD fam. lipœdème',
          traitementsActuels: 'Traitements', traitementsHormones: 'Hormones',
          diuretiques: 'Diurétiques', professionDebout: 'Profession debout',
          activitePhysique: 'Activité physique', alimentationContexte: 'Alimentation',
          vetementsContention: 'Contention portée', vetementsContentionDetail: 'Détail',
          plaintePatient: 'Plainte', retentissementQdV: 'Retentissement QdV', attentes: 'Attentes',
        }
        const entries = renderObjCompact(a, ANAM_LABELS)
        if (entries.length > 0) {
          subTitle('Anamnèse')
          entries.forEach(e => field(e.label, e.value))
          y += 2
        }
      }

      // Examen clinique
      if (d.examenClinique && typeof d.examenClinique === 'object') {
        const ec = d.examenClinique as Record<string, unknown>
        const EX_LABELS: Record<string, string> = {
          asymetrie: 'Asymétrie', asymetrieDetail: 'Détail asymétrie',
          posture: 'Posture', troublesTrophiques: 'Troubles trophiques',
          couleurPeau: 'Couleur peau', temperatureLocale: 'Température',
          varices: 'Varices', varicesDetail: 'Détail varices', cicatrices: 'Cicatrices',
          godetGrade: 'Godet (0-4)', godetLocalisation: 'Loc. godet',
          fibrose: 'Fibrose', fibroseLocalisation: 'Loc. fibrose',
          consistance: 'Consistance', douleurPalpation: 'Douleur palpation',
          douleurPalpationLocalisation: 'Loc. douleur',
          stemmer: 'Stemmer', stemmerLocalisation: 'Loc. Stemmer',
          poulsPedieux: 'Pouls pédieux', signeHomans: 'Homans',
          amplitudesArticulaires: 'Amplitudes', notesExamen: 'Notes',
        }
        const entries = renderObjCompact(ec, EX_LABELS)
        if (entries.length > 0) {
          subTitle('Examen clinique DLM')
          entries.forEach(e => field(e.label, e.value))
          y += 2
        }
      }

      // Mesures
      if (d.mesures && typeof d.mesures === 'object') {
        const m = d.mesures as Record<string, unknown>
        const general: { label: string; value: string }[] = []
        const M_LABELS: Record<string, string> = {
          poids: 'Poids (kg)', taille: 'Taille (cm)', imc: 'IMC',
          perimetreOmbilical: 'Périm. ombilical', perimetreHanche: 'Périm. hanche', rapportTH: 'Rapport T/H',
          volumeMSDcm3: 'Vol MS D (cm³)', volumeMSGcm3: 'Vol MS G (cm³)',
          volumeMIDcm3: 'Vol MI D (cm³)', volumeMIGcm3: 'Vol MI G (cm³)',
          ecartVolumiqueMS: 'Écart MS (%)', ecartVolumiqueMI: 'Écart MI (%)',
          notesMesures: 'Notes mesures',
        }
        for (const [k, lbl] of Object.entries(M_LABELS)) {
          const v = fmt(m[k])
          if (v && isRelevant(v)) general.push({ label: lbl, value: v })
        }
        const renderCirco = (label: string, raw: unknown) => {
          if (!raw || typeof raw !== 'object') return
          const cs = raw as { repere?: string; niveaux?: Array<{ niveau?: string; perimetreD?: string; perimetreG?: string; note?: string }> }
          const niv = Array.isArray(cs.niveaux) ? cs.niveaux : []
          const filled = niv.filter(n => (n.perimetreD ?? '').trim() || (n.perimetreG ?? '').trim())
          if (filled.length === 0 && !cs.repere) return
          subTitle(label)
          if (cs.repere) field('Repère', cs.repere)
          filled.forEach(n => {
            const niveau = n.niveau ?? '—'
            field(`Niv ${niveau} cm`, `D ${n.perimetreD || '—'} cm · G ${n.perimetreG || '—'} cm${n.note ? ` (${n.note})` : ''}`)
          })
          y += 2
        }
        if (general.length > 0) {
          subTitle('Mesures')
          general.forEach(e => field(e.label, e.value))
          y += 2
        }
        renderCirco('Circométrie membre supérieur (Kuhnke)', m.circoMS)
        renderCirco('Circométrie membre inférieur (Kuhnke)', m.circoMI)
        if (m.bioImpedance && typeof m.bioImpedance === 'object') {
          const bi = m.bioImpedance as Record<string, unknown>
          const biEntries = renderObjCompact(bi, {
            appareil: 'Appareil', lDexScore: 'L-Dex', date: 'Date', note: 'Note',
          })
          if (biEntries.length > 0) {
            subTitle('Bio-impédance')
            biEntries.forEach(e => field(e.label, e.value))
            y += 2
          }
        }
      }

      // Stade & classification
      const stadeBlock: { label: string; value: string }[] = []
      if (d.stadeISL) stadeBlock.push({ label: 'Stade ISL (lymphœdème)', value: `Stade ${d.stadeISL}` })
      if (d.stadeLipo) stadeBlock.push({ label: 'Stade lipœdème', value: `Stade ${d.stadeLipo}` })
      if (d.typeLipoDistribution) stadeBlock.push({ label: 'Distribution lipo', value: String(d.typeLipoDistribution) })
      if (d.ceap) stadeBlock.push({ label: 'CEAP (phlébœdème)', value: String(d.ceap) })
      if (stadeBlock.length > 0) {
        subTitle('Stade & classification')
        stadeBlock.forEach(e => field(e.label, e.value))
        y += 2
      }

      // ICF
      if (d.icf && typeof d.icf === 'object') {
        const entries = renderObjCompact(d.icf as Record<string, unknown>, {
          fonctionsCorps: 'Fonctions (b)', structuresCorps: 'Structures (s)',
          activitesLimitees: 'Activités (d)', participationRestreinte: 'Participation',
          facteursEnvironnementaux: 'F. environnementaux', facteursPersonnels: 'F. personnels',
          echelleEffortFonctionnel: 'Effort fonctionnel /10',
        })
        if (entries.length > 0) {
          subTitle('Cadre ICF (CIF)')
          entries.forEach(e => field(e.label, e.value))
          y += 2
        }
      }

      // Diagnostic différentiel
      if (d.dxDifferentiel && typeof d.dxDifferentiel === 'object') {
        const dx = d.dxDifferentiel as Record<string, unknown>
        const RETENU: Record<string, string> = { oui: 'Retenu', non: 'Écarté', a_explorer: 'À explorer' }
        const renderHyp = (key: string, title: string) => {
          const h = dx[key] as Record<string, unknown> | undefined
          if (!h) return
          const r = h.retenu ? RETENU[h.retenu as string] ?? String(h.retenu) : ''
          const pour = fmt(h.argumentsPour)
          const contre = fmt(h.argumentsContre)
          if (!r && !pour && !contre) return
          field(title, [r, pour ? `Pour: ${pour}` : '', contre ? `Contre: ${contre}` : ''].filter(Boolean).join(' | '))
        }
        let titled = false
        const ensureTitle = () => { if (!titled) { subTitle('Diagnostic différentiel'); titled = true } }
        if (dx.lymphoedeme || dx.lipoedeme || dx.phleboedeme) {
          ensureTitle()
          renderHyp('lymphoedeme', 'Lymphœdème')
          renderHyp('lipoedeme', 'Lipœdème')
          renderHyp('phleboedeme', 'Phlébœdème')
        }
        if (Array.isArray(dx.autres)) {
          (dx.autres as Array<Record<string, unknown>>).forEach((h, i) => {
            const r = h.retenu ? RETENU[h.retenu as string] ?? String(h.retenu) : ''
            const pour = fmt(h.argumentsPour)
            const contre = fmt(h.argumentsContre)
            const hyp = fmt(h.hypothese)
            if (!hyp && !r && !pour && !contre) return
            ensureTitle()
            field(`Autre ${i + 1}`, [hyp, r, pour ? `Pour: ${pour}` : '', contre ? `Contre: ${contre}` : ''].filter(Boolean).join(' | '))
          })
        }
        const concl = fmt(dx.conclusionDx)
        if (concl) { ensureTitle(); field('Conclusion', concl) }
        if (titled) y += 2
      }

      // Plan de traitement
      if (d.plan && typeof d.plan === 'object') {
        const p = d.plan as Record<string, unknown>
        const PHASE1_LABELS: Record<string, string> = {
          dlm: 'DLM', bandesPeu: 'Bandages peu élastiques', soinsPeau: 'Soins peau',
          exercicesDecongestifs: 'Exercices décongestifs', education: 'Éducation',
          pressotherapie: 'Pressothérapie', bandagesNuit: 'Bandages nuit',
        }
        const PHASE2_LABELS: Record<string, string> = {
          contention: 'Contention', autoDLM: 'Auto-DLM', exercices: 'Exercices',
          suivi: 'Suivi planifié', autobandage: 'Auto-bandage',
        }
        const collectChecked = (obj: unknown, labels: Record<string, string>): string => {
          if (!obj || typeof obj !== 'object') return ''
          const r = obj as Record<string, unknown>
          return Object.entries(labels)
            .filter(([k]) => r[k] === true)
            .map(([, lbl]) => lbl)
            .join(' · ')
        }
        let titled = false
        const ensure = () => { if (!titled) { subTitle('Plan de traitement (CDT)'); titled = true } }
        if (p.phase1Active === 'oui') {
          ensure()
          field('Phase 1 — Décongestion intensive', `${fmt(p.phase1FrequenceHebdo) || ''}${p.phase1Duree ? ` · ${p.phase1Duree}` : ''}`.trim() || 'Active')
          const c1 = collectChecked(p.phase1Composantes, PHASE1_LABELS)
          if (c1) field('Composantes P1', c1)
          const o1 = fmt(p.phase1Objectifs)
          if (o1) field('Objectifs SMART P1', o1)
        }
        if (p.phase2Active === 'oui') {
          ensure()
          field('Phase 2 — Entretien', fmt(p.phase2FrequenceSuivi) || 'Active')
          const c2 = collectChecked(p.phase2Composantes, PHASE2_LABELS)
          if (c2) field('Composantes P2', c2)
          const o2 = fmt(p.phase2Objectifs)
          if (o2) field('Objectifs SMART P2', o2)
        }
        const lipo = p.lipoSpecifique as Record<string, unknown> | undefined
        if (lipo) {
          const lipoBits: string[] = []
          if (lipo.nutritionConseil === true) lipoBits.push('Nutrition')
          if (lipo.activitePhysique === true) lipoBits.push('AP adaptée')
          if (lipo.psyAccompagnement === true) lipoBits.push('Accomp. psy')
          if (lipo.chirurgieLiposuccionEnvisagee) {
            const chirLabels: Record<string, string> = { oui: 'Liposuccion indiquée', non: 'Liposuccion non indiquée', a_discuter: 'Liposuccion à discuter' }
            lipoBits.push(chirLabels[lipo.chirurgieLiposuccionEnvisagee as string] ?? '')
          }
          if (lipoBits.filter(Boolean).length > 0) {
            ensure()
            field('Lipœdème — spécifique', lipoBits.filter(Boolean).join(' · '))
          }
        }
        const phlebo = p.phleboSpecifique as Record<string, unknown> | undefined
        if (phlebo) {
          const phleboBits: string[] = []
          if (phlebo.contentionMedicaleDegre) phleboBits.push(`Contention classe ${phlebo.contentionMedicaleDegre}`)
          if (phlebo.avisAngiologique === 'oui') phleboBits.push('Avis angiologique demandé')
          if (phlebo.elevation === true) phleboBits.push('Élévation')
          if (phlebo.activeMobilisation === true) phleboBits.push('Mobilisation active')
          if (phleboBits.length > 0) {
            ensure()
            field('Phlébœdème — spécifique', phleboBits.join(' · '))
          }
        }
        const edu = fmt(p.educationAutosoinsItems)
        const sa = fmt(p.signesAlerte)
        const next = fmt(p.prochaineConsultation)
        const np = fmt(p.notesPlan)
        if (edu) { ensure(); field('Éducation / autosoins', edu) }
        if (sa) { ensure(); field('Signes d\'alerte', sa) }
        if (next) { ensure(); field('Prochaine consultation', next) }
        if (np) { ensure(); field('Notes plan', np) }
        if (titled) y += 2
      }
    }
  }

  // ── 4. Suivi & amélioration ───────────────────────────────────────────────
  if (improvementData && (improvementData.generalScore !== null || improvementData.bilans.length > 0)) {
    sectionTitle("Suivi & scores d'amélioration", secNum++)

    if (improvementData.generalScore !== null) {
      const gs = improvementData.generalScore
      check(14)
      doc.setFillColor(gs > 0 ? 240 : gs < 0 ? 254 : 249, gs > 0 ? 253 : gs < 0 ? 242 : 250, gs > 0 ? 244 : gs < 0 ? 242 : 251)
      doc.roundedRect(ML, y - 4, MW, 12, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...(gs > 0 ? C.green : gs < 0 ? C.red : C.muted))
      doc.text(`Score global : ${gs > 0 ? '+' : ''}${gs}%  —  ${gs > 0 ? 'Amélioration' : gs < 0 ? 'Régression' : 'Stationnaire'}`, ML + 6, y + 3)
      doc.setTextColor(...C.text)
      y += 14
    }

    if (improvementData.bilans.length > 0) {
      check(8)
      // Table header
      doc.setFillColor(...C.primaryLight)
      doc.rect(ML, y - 3, MW, 7, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...C.primary)
      doc.text('Bilan', ML + 4, y + 1)
      doc.text('Date', ML + 30, y + 1)
      doc.text('EVN', ML + 75, y + 1)
      doc.text('Évolution', ML + 100, y + 1)
      doc.setTextColor(...C.text)
      y += 7

      improvementData.bilans.forEach(b => {
        check(6)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text(`N°${b.num}`, ML + 4, y)
        doc.text(b.date, ML + 30, y)
        doc.text(b.evn !== null ? `${b.evn}/10` : '—', ML + 75, y)
        if (b.delta !== null) {
          doc.setTextColor(...(b.delta > 0 ? C.green : b.delta < 0 ? C.red : C.muted))
          doc.text(b.delta > 0 ? `+${b.delta}%` : b.delta < 0 ? `${b.delta}%` : '=', ML + 100, y)
          doc.setTextColor(...C.text)
        } else {
          doc.text('Réf.', ML + 100, y)
        }
        y += 5
        drawLine(y - 1.5)
      })
      y += 3
    }
  }

  // ── 5. Notes cliniques ────────────────────────────────────────────────────
  if (notesLibres?.trim()) {
    sectionTitle('Notes cliniques complémentaires', secNum++)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const lines = split(notesLibres.trim(), MW - 8)
    for (const line of lines) {
      check(5)
      doc.text(line, ML + 4, y)
      y += 4.5
    }
    y += 3
  }

  // ── 6. Analyse IA ─────────────────────────────────────────────────────────
  if (analyseIA) {
    doc.addPage()
    y = 18

    sectionTitle('Analyse clinique assistée par IA', secNum++)

    check(8)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text('À titre indicatif uniquement — ne remplace pas le jugement clinique du professionnel de santé.', ML + 4, y)
    doc.setTextColor(...C.text)
    y += 6

    subTitle('Diagnostic principal')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const diagLines = split(analyseIA.diagnostic.titre, MW - 12)
    for (const dl of diagLines) { check(6); doc.text(dl, ML + 6, y); y += 5 }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    const descLines = split(analyseIA.diagnostic.description, MW - 12)
    for (const dl of descLines) { check(5); doc.text(dl, ML + 6, y); y += 4.5 }
    y += 4

    if (analyseIA.hypotheses.length > 0) {
      subTitle('Hypothèses cliniques')
      for (const h of analyseIA.hypotheses) {
        check(10)
        // H1 : Titre en bold
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        const hLabel = sanitize(`H${h.rang} : ${h.titre}`)
        doc.text(hLabel, ML + 6, y)
        y += 4.5
        // Justification en normal (pas italic, pas grisé)
        if (h.justification) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          const jLines = split(h.justification, MW - 14)
          for (const jl of jLines) { check(5); doc.text(jl, ML + 8, y); y += 4 }
        }
        y += 2
      }
    }

    if (analyseIA.priseEnCharge.length > 0) {
      subTitle('Prise en charge suggérée')
      analyseIA.priseEnCharge.forEach((p, i) => {
        check(10)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(`${i + 1}. ${p.phase} — ${p.titre}`, ML + 6, y)
        y += 4.5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        const pLines = split(p.detail, MW - 16)
        for (const pl of pLines) { check(5); doc.text(pl, ML + 10, y); y += 4 }
        y += 2
      })
    }

    if (analyseIA.alertes.length > 0) {
      subTitle('Alertes cliniques')
      analyseIA.alertes.forEach(a => bulletPoint(a, 6))
    }
  }

  // ── Footer sur chaque page ────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    // Ligne de séparation footer
    doc.setDrawColor(...C.light)
    doc.setLineWidth(0.3)
    doc.line(ML, 286, W - MR, 286)
    // Texte footer
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...C.muted)
    doc.text('Document confidentiel — à usage exclusivement médical et paramédical', ML, 291)
    doc.text(`Page ${p}/${totalPages}`, W - MR - 18, 291)
    doc.setTextColor(...C.text)
  }

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const safeName = (patientId.nom || 'Anonyme').replace(/\s+/g, '_')
  const safeFirst = (patientId.prenom || '').replace(/\s+/g, '_')
  const fileName = `Bilan_${safeName}_${safeFirst}_${dateFile}.pdf`
  doc.save(fileName)
  return { blob: doc.output('blob') as Blob, fileName }
}

// ── AI-generated PDF report ──────────────────────────────────────────────────

export interface AIReportPraticien {
  nom?: string
  prenom?: string
  profession?: string
  specialisationsLibelle?: string
  rcc?: string
  adresse?: string
  adresseComplement?: string
  codePostal?: string
  ville?: string
  telephone?: string
  email?: string
  signatureImage?: string | null
}

export interface AIReportOptions {
  /**
   * Titre du bloc signature auto-appendu sous le corps du rapport.
   * Défaut : '10. Signature' (cohérent avec les bilans 1→9). Passer `null` pour
   * supprimer le titre — utile quand le markdown contient déjà un titre final
   * englobant la signature (ex : rapport d'évolution, section 7).
   */
  signatureTitle?: string | null
  /**
   * Préfixe du nom de fichier PDF téléchargé. Défaut : 'Bilan_Physiotherapie'.
   * Ex : 'Rapport_Evolution' pour l'export du rapport d'évolution.
   */
  filenamePrefix?: string
}

export const generateAIPDF = (
  patientId: { nom?: string; prenom?: string; dateNaissance?: string; sexe?: 'masculin' | 'feminin' },
  markdownReport: string,
  pdfTitle?: string,
  praticien?: AIReportPraticien,
  options?: AIReportOptions,
): { blob: Blob; fileName: string } => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const ML = 20
  const MR = 20
  const MW = W - ML - MR
  let y = 18

  const today = new Date()
  const dateFile = today.toISOString().split('T')[0]
  const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const check = (need = 10) => { if (y + need > H - 22) { doc.addPage(); y = 20 } }
  const split = (text: string, maxW: number) => doc.splitTextToSize(sanitize(text), maxW)

  const p = praticien ?? {}
  const hasPraticien = Boolean(p.nom || p.prenom || p.profession || p.adresse || p.ville || p.telephone || p.email)
  const fullPraticienName = `${p.prenom ?? ''} ${p.nom ?? ''}`.trim()

  // ── En-tête : bloc coordonnées thérapeute (haut-gauche) + bloc patient (haut-droite) ──
  const headerTop = y
  let yLeft = y
  let yRight = y

  // Bloc gauche : coordonnées thérapeute
  if (hasPraticien) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...C.primary)
    doc.text(sanitize(fullPraticienName.toUpperCase() || '—'), ML, yLeft)
    yLeft += 4.5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...C.text)
    if (p.profession) { doc.text(sanitize(p.profession), ML, yLeft); yLeft += 4 }
    if (p.specialisationsLibelle) {
      doc.setTextColor(...C.muted)
      doc.setFontSize(8.5)
      const sl = split(p.specialisationsLibelle, MW / 2 - 4)
      for (const s of sl) { doc.text(s, ML, yLeft); yLeft += 3.8 }
      doc.setFontSize(9)
      doc.setTextColor(...C.text)
    }
    if (p.rcc) { doc.text(`RCC / ADELI : ${sanitize(p.rcc)}`, ML, yLeft); yLeft += 4 }
    if (p.adresse) { doc.text(sanitize(p.adresse), ML, yLeft); yLeft += 4 }
    if (p.adresseComplement) { doc.text(sanitize(p.adresseComplement), ML, yLeft); yLeft += 4 }
    if (p.codePostal || p.ville) {
      doc.text(sanitize(`${p.codePostal ?? ''} ${p.ville ?? ''}`.trim()), ML, yLeft); yLeft += 4
    }
    if (p.telephone) { doc.text(`Tél : ${sanitize(p.telephone)}`, ML, yLeft); yLeft += 4 }
    if (p.email) { doc.text(sanitize(p.email), ML, yLeft); yLeft += 4 }
  }

  // Bloc droite : date + identité patient
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  const cityDate = `${(p.ville ?? '').toUpperCase() || ''}${p.ville ? ', le ' : 'Le '}${dateStr}`
  doc.text(sanitize(cityDate), W - MR, yRight, { align: 'right' })
  yRight += 6

  doc.setTextColor(...C.text)
  const patientFull = `${patientId.prenom ?? ''} ${patientId.nom ?? ''}`.trim()
  const patientLabel = patientId.sexe === 'feminin' ? 'Patiente' : 'Patient'
  const neLabel = patientId.sexe === 'feminin' ? 'Née' : 'Né'
  if (patientFull) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text(sanitize(`${patientLabel} : ${patientFull}`), W - MR, yRight, { align: 'right' })
    yRight += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    if (patientId.dateNaissance) {
      const age = computeAge(patientId.dateNaissance)
      const dobStr = new Date(patientId.dateNaissance).toLocaleDateString('fr-FR')
      const dobLine = age !== null ? `${neLabel} le ${dobStr} (${age} ans)` : `${neLabel} le ${dobStr}`
      doc.text(sanitize(dobLine), W - MR, yRight, { align: 'right' })
      yRight += 4
    }
  }

  y = Math.max(yLeft, yRight, headerTop + 8)

  // Ligne de séparation
  y += 3
  doc.setDrawColor(...C.light)
  doc.setLineWidth(0.3)
  doc.line(ML, y, W - MR, y)
  y += 8

  // ── Titre centré ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...C.primary)
  const title = sanitize(pdfTitle ?? 'Bilan de Physiothérapie')
  doc.text(title, W / 2, y, { align: 'center' })
  y += 4
  doc.setDrawColor(...C.primary)
  doc.setLineWidth(0.6)
  const titleWidth = doc.getTextWidth(title)
  doc.line(W / 2 - titleWidth / 2, y, W / 2 + titleWidth / 2, y)
  doc.setTextColor(...C.text)
  y += 8

  // ── Helpers : parse et rendu des tables GFM ──
  // Syntaxe reconnue :
  //   | H1 | H2 | H3 |
  //   | --- | --- | --- |
  //   | r1c1 | r1c2 | r1c3 |
  // Les largeurs sont proportionnelles au contenu max (header + rows), bornées.
  const isTableRow = (l: string) => /^\s*\|(.+)\|\s*$/.test(l)
  const isTableSep = (l: string) => /^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/.test(l)
  const splitRow = (l: string): string[] =>
    l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())

  const drawTable = (headers: string[], rows: string[][]) => {
    const nCols = headers.length
    const MWtab = MW
    // Répartition par défaut équiprobable ; cas spécial 4 cols = preset chronologie.
    const defaultWeights = Array(nCols).fill(1 / nCols) as number[]
    const chronoWeights = nCols === 4 ? [0.12, 0.22, 0.08, 0.58] : defaultWeights
    const colW = chronoWeights.map(w => w * MWtab)
    // Colonnes centrées : Date (0) et EVN (2) en preset 4-cols.
    const centeredIdx = new Set<number>(nCols === 4 ? [0, 2] : [])
    const padX = 2
    const headerH = 7
    const lineH = 3.8
    const rowPadY = 1.8

    const drawHeader = () => {
      check(headerH + 2)
      doc.setFillColor(...C.primaryLight)
      doc.rect(ML, y, MWtab, headerH, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...C.primary)
      let xc = ML
      headers.forEach((h, i) => {
        const w = colW[i]
        const centered = centeredIdx.has(i)
        const tx = centered ? xc + w / 2 : xc + padX
        doc.text(sanitize(h), tx, y + 4.8, { align: centered ? 'center' : 'left' })
        xc += w
      })
      doc.setTextColor(...C.text)
      y += headerH
    }

    drawHeader()

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    rows.forEach((row, rIdx) => {
      // Wrapping par cellule
      const wrapped = row.map((cell, i) =>
        doc.splitTextToSize(sanitize(cell || ''), colW[i] - padX * 2)
      )
      const maxLines = Math.max(1, ...wrapped.map(w => w.length))
      const h = maxLines * lineH + rowPadY * 2
      // Si la ligne ne rentre pas dans la page : addPage + redraw header.
      if (y + h > H - 22) {
        doc.addPage()
        y = 20
        drawHeader()
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
      }
      // Alternance fond très clair
      if (rIdx % 2 === 0) {
        doc.setFillColor(250, 250, 250)
        doc.rect(ML, y, MWtab, h, 'F')
      }
      // Texte cellules
      let xc = ML
      wrapped.forEach((cellLines, i) => {
        const w = colW[i]
        const centered = centeredIdx.has(i)
        const tx = centered ? xc + w / 2 : xc + padX
        cellLines.forEach((line: string, li: number) => {
          doc.text(line, tx, y + rowPadY + 2.8 + li * lineH, { align: centered ? 'center' : 'left' })
        })
        xc += w
      })
      // Bordure bas discrète
      doc.setDrawColor(...C.light)
      doc.setLineWidth(0.2)
      doc.line(ML, y + h, ML + MWtab, y + h)
      y += h
    })
    y += 3
  }

  // ── Parse markdown ──
  const lines = markdownReport.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Détection table GFM : ligne de header |…| suivie d'un séparateur |---|…|
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headers = splitRow(line)
      const rows: string[][] = []
      let j = i + 2
      while (j < lines.length && isTableRow(lines[j])) {
        rows.push(splitRow(lines[j]))
        j++
      }
      drawTable(headers, rows)
      i = j
      continue
    }

    // Guard — ignorer un éventuel surtitre markdown `#` ou `##` généré à tort par l'IA
    // (le document n'a qu'un seul titre, rendu par l'en-tête ci-dessus).
    if (/^\s*#{1,2}(\s|$)/.test(line) && !line.startsWith('### ')) {
      i++
      continue
    }

    // Guard V7 — les séparateurs horizontaux (---, ***, ___) sont interdits par le prompt,
    // mais on ignore au cas où l'IA en glisserait un : la séparation visuelle est portée par les titres.
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      i++
      continue
    }

    if (line.startsWith('### ')) {
      y += 3
      check(12)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...C.primary)
      const titleText = line.replace(/^### /, '')
      doc.text(sanitize(titleText), ML, y)
      // Soulignement discret
      y += 1.5
      doc.setDrawColor(...C.primary)
      doc.setLineWidth(0.4)
      const tw = doc.getTextWidth(sanitize(titleText))
      doc.line(ML, y, ML + tw, y)
      doc.setTextColor(...C.text)
      y += 5
    } else if (line.startsWith('## ')) {
      y += 3
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(line.replace(/^## /, ''), ML, y)
      y += 6
    } else if (line.match(/^- \*\*H\d/)) {
      const full = line.replace(/^- \*\*/, '').replace(/\*\*/, '')
      const cleaned = full.replace(/\s*\(\d+%?\)\s*/g, ' ').trim()
      const dashIdx = cleaned.indexOf(' — ')
      const tTitle = dashIdx !== -1 ? cleaned.slice(0, dashIdx).trim() : cleaned.trim()
      const justification = dashIdx !== -1 ? cleaned.slice(dashIdx + 3).trim() : ''
      check(14)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      const tl = split(tTitle, MW - 4)
      for (const t of tl) { check(6); doc.text(t, ML + 4, y); y += 5 }
      if (justification) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const jl = split(justification, MW - 8)
        for (const j of jl) { check(5); doc.text(j, ML + 8, y); y += 4.5 }
      }
      y += 2
    } else if (line.match(/^- \*\*(.+?)\*\*(.*)$/)) {
      // Pattern "- **Titre** détail" : titre en gras sur sa propre ligne,
      // détail en paragraphe normal dessous, aligné sur la marge gauche du contenu.
      // Évite l'effet "escalier" sur les wraps de lignes longues (recommandations,
      // axes thérapeutiques). Voir PDF guide §puces hanging indent.
      const m = line.match(/^- \*\*(.+?)\*\*(.*)$/)!
      const title = m[1].trim()
      const detail = m[2].replace(/^\s*[—:–-]\s*/, '').trim()
      check(8)
      // Titre : en gras, indenté légèrement, marge gauche cohérente avec les paragraphes
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      const tl = split(title, MW - 4)
      for (const t of tl) { check(5.5); doc.text(t, ML + 2, y); y += 5 }
      // Détail : en normal, même marge gauche (pas de hanging indent qui décroche),
      // ligne hauteur compactée, espacement sous le bloc pour aérer.
      if (detail) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9.5)
        const dl = split(detail, MW - 4)
        for (const d of dl) { check(5); doc.text(d, ML + 2, y); y += 4.6 }
      }
      y += 2
    } else if (line.startsWith('- ')) {
      // Puce simple : hanging indent propre — la puce sort à gauche, les lignes
      // suivantes s'alignent juste après la puce (pas un retour à la marge brute).
      const text = line.replace(/^- /, '').replace(/\*\*(.+?)\*\*/g, '$1')
      check(7)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      const bulletGlyph = '• '
      const bw = doc.getTextWidth(bulletGlyph)
      const bl = split(text, MW - 4 - bw)
      for (let r = 0; r < bl.length; r++) {
        check(5)
        if (r === 0) doc.text(sanitize(bulletGlyph), ML + 2, y)
        doc.text(bl[r], ML + 2 + bw, y)
        y += 4.5
      }
      y += 1
    } else if (line.trim() === '') {
      y += 3
    } else if (line.startsWith('**') && line.endsWith('**')) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...C.primary)
      const txt = line.replace(/\*\*/g, '')
      const tl = split(txt, MW)
      for (const t of tl) { check(6); doc.text(t, ML, y); y += 5 }
      doc.setTextColor(...C.text)
      y += 1
    } else {
      const text = line.replace(/\*\*(.+?)\*\*/g, '$1')
      if (text.trim()) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        const tl = split(text, MW)
        for (const t of tl) { check(5.5); doc.text(t, ML, y); y += 5 }
        y += 1.5
      }
    }
    i++
  }

  // ── Signature : titre optionnel (défaut '10. Signature') + bloc aligné à droite ──
  const sigTitleOpt = options?.signatureTitle === undefined ? '10. Signature' : options.signatureTitle
  if (hasPraticien) {
    y += 8
    check(45)

    if (sigTitleOpt) {
      // Titre de section numérotée, même style que les sections précédentes
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(...C.primary)
      const sigTitle = sanitize(sigTitleOpt)
      doc.text(sigTitle, ML, y)
      y += 1.5
      doc.setDrawColor(...C.primary)
      doc.setLineWidth(0.4)
      const sigTw = doc.getTextWidth(sigTitle)
      doc.line(ML, y, ML + sigTw, y)
      doc.setTextColor(...C.text)
      y += 6
    }

    // Contenu de la signature aligné à droite
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...C.muted)
    doc.text(sanitize(`${(p.ville ?? '').toUpperCase() || ''}${p.ville ? ', le ' : 'Le '}${dateStr}`), W - MR, y, { align: 'right' })
    y += 6

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...C.primary)
    doc.text(sanitize(fullPraticienName || '—'), W - MR, y, { align: 'right' })
    y += 4.5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...C.text)
    if (p.profession) {
      doc.text(sanitize(p.profession), W - MR, y, { align: 'right' })
      y += 4
    }
    if (p.codePostal || p.ville) {
      doc.setTextColor(...C.muted)
      doc.text(sanitize(`${p.codePostal ?? ''} ${p.ville ?? ''}`.trim()), W - MR, y, { align: 'right' })
      y += 4
      doc.setTextColor(...C.text)
    }
    if (p.telephone) {
      doc.setTextColor(...C.muted)
      doc.text(sanitize(`Tél : ${p.telephone}`), W - MR, y, { align: 'right' })
      y += 4
      doc.setTextColor(...C.text)
    }

    // Image signature manuscrite si disponible
    if (p.signatureImage) {
      try {
        const imgW = 45
        const imgH = 22
        const imgX = W - MR - imgW
        const imgY = y + 2
        check(imgH + 5)
        doc.addImage(p.signatureImage, 'PNG', imgX, imgY, imgW, imgH)
        y += imgH + 4
      } catch (e) {
        console.warn('[PDF] Échec ajout signature image :', e instanceof Error ? e.message : e)
      }
    }
  }

  // ── Footer ──
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg)
    doc.setDrawColor(...C.light)
    doc.setLineWidth(0.3)
    doc.line(ML, H - 14, W - MR, H - 14)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...C.muted)
    doc.text('Document confidentiel — couvert par le secret professionnel', ML, H - 9)
    doc.text(`Page ${pg}/${totalPages}`, W - MR - 18, H - 9)
    doc.setTextColor(...C.text)
  }

  const safeName = (patientId.nom || 'Anonyme').replace(/\s+/g, '_')
  const safeFirst = (patientId.prenom || '').replace(/\s+/g, '_')
  const prefix = options?.filenamePrefix ?? 'Bilan_Physiotherapie'
  const fileName = `${prefix}_${safeName}_${safeFirst}_${dateFile}.pdf`
  doc.save(fileName)
  return { blob: doc.output('blob') as Blob, fileName }
}

// ─────────────────────────────────────────────────────────────────────────────
//  COURRIER PROFESSIONNEL — Génération PDF
// ─────────────────────────────────────────────────────────────────────────────

export interface LetterPDFPraticien {
  nom?: string
  prenom?: string
  profession?: string
  specialisationsLibelle?: string
  rcc?: string
  adresse?: string
  adresseComplement?: string
  codePostal?: string
  ville?: string
  telephone?: string
  email?: string
  signatureImage?: string | null
}

export interface LetterPDFOptions {
  praticien: LetterPDFPraticien
  patientNom: string
  patientPrenom: string
  titreCourrier: string           // ex: "Fin de prise en charge"
  corps: string                    // Texte généré (sans en-tête ni signature)
  download?: boolean               // true = download direct, false = retourne Blob URL
}

/**
 * Génère un PDF de courrier professionnel avec :
 * - En-tête praticien (haut-gauche)
 * - Ville + date (aligné à droite sous l'en-tête)
 * - Corps du texte (narratif, justifié)
 * - Signature (praticien + image signature si disponible)
 */
export const generateLetterPDF = (options: LetterPDFOptions): Blob | void => {
  const { praticien: p, patientNom, patientPrenom, titreCourrier, corps, download = true } = options
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const ML = 22
  const MR = 22
  const MW = W - ML - MR
  let y = 22

  const today = new Date()
  const dateFile = today.toISOString().split('T')[0]
  const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const check = (need = 10) => {
    if (y + need > H - 30) { doc.addPage(); y = 22 }
  }
  const split = (text: string, maxW: number) => doc.splitTextToSize(sanitize(text), maxW)

  // ── En-tête praticien (haut-gauche) ──────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...C.primary)
  const fullName = `${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || '—'
  doc.text(fullName.toUpperCase(), ML, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.text)
  if (p.profession) { doc.text(sanitize(p.profession), ML, y); y += 4 }
  if (p.specialisationsLibelle) {
    doc.setTextColor(...C.muted)
    doc.setFontSize(8.5)
    const sl = split(p.specialisationsLibelle, MW / 2)
    for (const s of sl) { doc.text(s, ML, y); y += 3.8 }
    doc.setFontSize(9)
    doc.setTextColor(...C.text)
  }
  if (p.rcc) { doc.text(`RCC / ADELI : ${sanitize(p.rcc)}`, ML, y); y += 4 }
  if (p.adresse) { doc.text(sanitize(p.adresse), ML, y); y += 4 }
  if (p.adresseComplement) { doc.text(sanitize(p.adresseComplement), ML, y); y += 4 }
  if (p.codePostal || p.ville) {
    doc.text(sanitize(`${p.codePostal ?? ''} ${p.ville ?? ''}`.trim()), ML, y); y += 4
  }
  if (p.telephone) { doc.text(`Tél : ${sanitize(p.telephone)}`, ML, y); y += 4 }
  if (p.email) { doc.text(sanitize(p.email), ML, y); y += 4 }

  // Ligne de séparation douce
  y += 3
  doc.setDrawColor(...C.light)
  doc.setLineWidth(0.3)
  doc.line(ML, y, W - MR, y)
  y += 8

  // ── Ville + date (aligné à droite) ──────────────────────────────────────
  const dateLine = `${(p.ville ?? '').toUpperCase() || '—'}, le ${dateStr}`
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...C.text)
  const dateLineWidth = doc.getTextWidth(sanitize(dateLine))
  doc.text(sanitize(dateLine), W - MR - dateLineWidth, y)
  y += 12

  // ── Objet ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...C.primary)
  const objet = `Objet : ${titreCourrier} — ${patientPrenom} ${patientNom}`.trim()
  const objetLines = split(objet, MW)
  for (const ol of objetLines) { doc.text(ol, ML, y); y += 5 }
  y += 6
  doc.setTextColor(...C.text)

  // ── Corps du courrier ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  const corpsLines = corps.split('\n')
  for (const rawLine of corpsLines) {
    const line = rawLine.trimEnd()
    if (line === '') {
      y += 4
      continue
    }
    const wrapped = split(line, MW)
    for (const w of wrapped) {
      check(7)
      doc.text(w, ML, y)
      y += 5.2
    }
  }

  // ── Signature ──────────────────────────────────────────────────────────
  y += 10
  check(35)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...C.primary)
  doc.text(sanitize(fullName), W - MR, y, { align: 'right' })
  y += 5
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  if (p.profession) {
    doc.text(sanitize(p.profession), W - MR, y, { align: 'right' })
    y += 5
  }

  // Image signature si disponible
  if (p.signatureImage) {
    try {
      const imgW = 45
      const imgH = 22
      const imgX = W - MR - imgW
      const imgY = y
      check(imgH + 5)
      doc.addImage(p.signatureImage, 'PNG', imgX, imgY, imgW, imgH)
      y += imgH + 4
    } catch (e) {
      // Log mais ne crash pas le PDF — la signature est optionnelle
      console.warn('[PDF] Échec ajout signature image :', e instanceof Error ? e.message : e)
    }
  }

  // ── Footer ─────────────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg)
    doc.setDrawColor(...C.light)
    doc.setLineWidth(0.3)
    doc.line(ML, H - 14, W - MR, H - 14)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...C.muted)
    doc.text('Document confidentiel - couvert par le secret professionnel', ML, H - 9)
    doc.text(`Page ${pg}/${totalPages}`, W - MR - 18, H - 9)
    doc.setTextColor(...C.text)
  }

  if (download) {
    const safeName = (patientNom || 'Anonyme').replace(/\s+/g, '_')
    const safeFirst = (patientPrenom || '').replace(/\s+/g, '_')
    const safeType = titreCourrier.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 30)
    doc.save(`Courrier_${safeType}_${safeName}_${safeFirst}_${dateFile}.pdf`)
    return
  }
  return doc.output('blob')
}

// ─────────────────────────────────────────────────────────────────────────────
//  REGISTRE D'AUDIT RGPD — Export PDF
// ─────────────────────────────────────────────────────────────────────────────

interface AuditPDFOptions {
  praticien: {
    nom?: string
    prenom?: string
    profession?: string
    rcc?: string
    adresse?: string
    codePostal?: string
    ville?: string
  }
  entries: Array<{
    id: number
    timestamp: string
    letterId: number
    patientKey: string
    type: string
    pseudonymized: boolean
    piiWarningsCount: number
    modelUsed: string
    resultLength: number
  }>
  aiCallEntries?: Array<{
    id: number
    timestamp: string
    category: string
    patientKey: string
    pseudonymized: boolean
    scrubReplacements: number
    hasDocuments: boolean
    modelUsed: string
    promptLength: number
    resultLength: number
    success: boolean
  }>
}

const AI_CALL_CATEGORY_LABELS: Record<string, string> = {
  letter: 'Courrier',
  bilan_analyse: 'Analyse bilan',
  bilan_analyse_refine: 'Analyse (correction)',
  bilan_evolution: 'Évolution patient',
  bilan_intermediaire: 'Note intermédiaire',
  fiche_exercice: "Fiche d'exercices",
  pdf_bilan: 'PDF bilan',
  pdf_analyse: 'PDF analyse',
  note_seance_mini: 'Analyse mini séance',
  api_key_test: 'Test clé API',
}

const LETTER_TYPE_LABELS: Record<string, string> = {
  fin_pec: 'Fin de PEC',
  fin_pec_anticipee: 'Fin de PEC anticipée',
  demande_avis: "Demande d'avis",
  demande_imagerie: "Demande d'imagerie",
  demande_prescription: 'Demande prescription',
  suivi: 'Courrier de suivi',
  echec_pec: 'Échec de PEC',
}

export const generateAuditPDF = (options: AuditPDFOptions) => {
  const { praticien: p, entries, aiCallEntries = [] } = options
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const H = 297
  const ML = 16
  const MR = 16
  const MW = W - ML - MR
  let y = 18

  const today = new Date()
  const dateFile = today.toISOString().split('T')[0]
  const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const check = (need = 10) => { if (y + need > H - 22) { doc.addPage(); y = 18; drawHeaderBand() } }

  const drawHeaderBand = () => {
    doc.setFillColor(...C.primary)
    doc.rect(0, 0, W, 13, 'F')
    doc.setFillColor(...C.accent)
    doc.rect(0, 13, W, 1, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...C.white)
    doc.text('REGISTRE DES TRAITEMENTS IA - COURRIERS', ML, 9)
    doc.setTextColor(...C.text)
  }
  drawHeaderBand()
  y = 20

  // ── Bloc informations praticien ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.primary)
  doc.text('Responsable du traitement', ML, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.text)
  doc.text(sanitize(`${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || '—'), ML, y); y += 4
  if (p.profession) { doc.text(sanitize(p.profession), ML, y); y += 4 }
  if (p.rcc) { doc.text(`RCC / ADELI : ${sanitize(p.rcc)}`, ML, y); y += 4 }
  if (p.adresse) { doc.text(sanitize(`${p.adresse}${p.codePostal ? ', ' + p.codePostal : ''}${p.ville ? ' ' + p.ville : ''}`), ML, y); y += 4 }
  doc.text(`Date d'édition : ${dateStr}`, ML, y); y += 7

  // ── Cartouche d'explication RGPD ──
  doc.setFillColor(...C.primaryLight)
  doc.roundedRect(ML, y, MW, 28, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.primary)
  doc.text('Base legale & finalite', ML + 4, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.text)
  const info = [
    "Base legale (RGPD art. 6-1-f & 9-2-h) : interet legitime et necessaire au diagnostic et a la prise en charge.",
    "Finalite : assistance a la redaction de courriers professionnels destines aux medecins correspondants.",
    "Mesures de protection : pseudonymisation systematique avant tout envoi a l'IA ; aucune donnee identifiante",
    "ne quitte l'appareil du praticien. Texte final relu et valide par le praticien avant envoi.",
  ]
  for (let i = 0; i < info.length; i++) {
    doc.text(info[i], ML + 4, y + 9 + i * 4)
  }
  y += 32

  // ── Titre du tableau ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.primary)
  doc.text(`Traitements enregistres : ${entries.length}`, ML, y)
  y += 5
  doc.setDrawColor(...C.light)
  doc.setLineWidth(0.3)
  doc.line(ML, y, W - MR, y)
  y += 4

  // ── Colonnes du tableau ──
  const COLS = {
    date: ML,
    type: ML + 34,
    patient: ML + 78,
    pseudo: ML + 128,
    warns: ML + 148,
    size: ML + 166,
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  doc.text('Date/Heure', COLS.date, y)
  doc.text('Type de courrier', COLS.type, y)
  doc.text('Patient (cle)', COLS.patient, y)
  doc.text('Pseudo.', COLS.pseudo, y)
  doc.text('Alertes', COLS.warns, y)
  doc.text('Taille', COLS.size, y)
  y += 4
  doc.setDrawColor(...C.light)
  doc.line(ML, y, W - MR, y)
  y += 3.5

  // ── Lignes ──
  const sorted = [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.text)

  if (sorted.length === 0) {
    doc.setTextColor(...C.muted)
    doc.text('Aucun traitement enregistre a ce jour.', ML, y + 3)
    y += 8
  } else {
    for (const e of sorted) {
      check(6)
      const d = new Date(e.timestamp)
      const dateLine = `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      const typeLine = sanitize(LETTER_TYPE_LABELS[e.type] ?? e.type).slice(0, 26)
      const patientLine = sanitize(e.patientKey).slice(0, 30)
      const pseudoLine = e.pseudonymized ? 'Oui' : 'NON'
      const warnsLine = String(e.piiWarningsCount)
      const sizeLine = `${e.resultLength} c.`

      doc.text(dateLine, COLS.date, y)
      doc.text(typeLine, COLS.type, y)
      doc.text(patientLine, COLS.patient, y)
      if (!e.pseudonymized) doc.setTextColor(...C.red)
      doc.text(pseudoLine, COLS.pseudo, y)
      doc.setTextColor(...C.text)
      if (e.piiWarningsCount > 0) doc.setTextColor(...C.red)
      doc.text(warnsLine, COLS.warns, y)
      doc.setTextColor(...C.text)
      doc.text(sizeLine, COLS.size, y)
      y += 4.5
    }
  }

  y += 6
  check(18)

  // ── Section TRAITEMENTS IA GLOBAUX (bilans, évolutions, fiches, etc.) ──
  if (aiCallEntries.length > 0) {
    check(18)
    doc.setDrawColor(...C.light)
    doc.setLineWidth(0.3)
    doc.line(ML, y, W - MR, y)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...C.primary)
    doc.text(`Autres traitements IA enregistres : ${aiCallEntries.length}`, ML, y)
    y += 5
    doc.setDrawColor(...C.light)
    doc.line(ML, y, W - MR, y)
    y += 4

    // Colonnes
    const C2 = {
      date: ML,
      category: ML + 34,
      patient: ML + 80,
      pseudo: ML + 124,
      scrub: ML + 142,
      docs: ML + 158,
      ok: ML + 172,
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text('Date/Heure', C2.date, y)
    doc.text('Categorie', C2.category, y)
    doc.text('Patient', C2.patient, y)
    doc.text('Pseudo.', C2.pseudo, y)
    doc.text('Scrub', C2.scrub, y)
    doc.text('Docs', C2.docs, y)
    doc.text('OK', C2.ok, y)
    y += 4
    doc.setDrawColor(...C.light)
    doc.line(ML, y, W - MR, y)
    y += 3.5

    const sortedAi = [...aiCallEntries].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.text)

    for (const e of sortedAi) {
      check(5)
      const d = new Date(e.timestamp)
      const dateLine = `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      const categoryLine = sanitize(AI_CALL_CATEGORY_LABELS[e.category] ?? e.category).slice(0, 22)
      const patientLine = sanitize(e.patientKey).slice(0, 24)
      doc.text(dateLine, C2.date, y)
      doc.text(categoryLine, C2.category, y)
      doc.text(patientLine, C2.patient, y)
      if (!e.pseudonymized) doc.setTextColor(...C.red)
      doc.text(e.pseudonymized ? 'Oui' : 'NON', C2.pseudo, y)
      doc.setTextColor(...C.text)
      if (e.scrubReplacements > 0) doc.setTextColor(...C.red)
      doc.text(String(e.scrubReplacements), C2.scrub, y)
      doc.setTextColor(...C.text)
      if (e.hasDocuments) doc.setTextColor(...C.accent)
      doc.text(e.hasDocuments ? 'Oui' : '-', C2.docs, y)
      doc.setTextColor(...C.text)
      if (!e.success) doc.setTextColor(...C.red)
      doc.text(e.success ? 'Oui' : 'Err', C2.ok, y)
      doc.setTextColor(...C.text)
      y += 4.2
    }
    y += 4
  }

  check(18)
  doc.setDrawColor(...C.light)
  doc.line(ML, y, W - MR, y)
  y += 4
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...C.muted)
  const footerInfo = [
    "Pseudo. = Pseudonymisation active au moment de l'appel (Oui = donnees identifiantes remplacees avant envoi a l'IA).",
    "Scrub = Nombre de remplacements effectues par la couche de securite wrapper (defense en profondeur). Un nombre > 0 indique qu'un builder en amont a laisse passer un nom et qu'il a ete intercepte in-extremis.",
    "Docs = Des pieces jointes (radios, PDF medicaux) ont ete envoyees. Attention : ces documents ne sont PAS automatiquement pseudonymises.",
    "Alertes = Nombre de champs texte libre detectes comme potentiellement identifiants et vus par le praticien avant generation du courrier.",
    "Le contenu integral du texte genere n'est PAS inclus dans ce registre.",
  ]
  for (const line of footerInfo) {
    const wrapped = doc.splitTextToSize(line, MW)
    for (const w of wrapped) {
      check(4)
      doc.text(w, ML, y)
      y += 3.4
    }
    y += 1
  }

  // ── Footer standard toutes pages ──
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg)
    doc.setDrawColor(...C.light)
    doc.setLineWidth(0.3)
    doc.line(ML, H - 14, W - MR, H - 14)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...C.muted)
    doc.text('Registre interne - Document de conformite RGPD - Usage praticien', ML, H - 9)
    doc.text(`Page ${pg}/${totalPages}`, W - MR - 18, H - 9)
    doc.setTextColor(...C.text)
  }

  doc.save(`Registre_IA_courriers_${dateFile}.pdf`)
}
