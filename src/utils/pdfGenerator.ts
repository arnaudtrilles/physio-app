import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { computeAge } from './clinicalPrompt';

// ── Nettoyage texte pour jsPDF (Helvetica ne supporte pas certains caractères) ─
const sanitize = (text: string): string =>
  text
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, '\u002D')  // en-dash → hyphen
    .replace(/\u2014/g, '\u002D')  // em-dash → hyphen
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')       // non-breaking space
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/\u00B2/g, '2')       // superscript 2
    .replace(/\u00B3/g, '3')       // superscript 3
    .replace(/\u2265/g, '>=')      // ≥
    .replace(/\u2264/g, '<=')      // ≤

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

const fmt = (val: unknown): string | null => {
  if (val === null || val === undefined) return null
  if (typeof val === 'boolean') return val ? 'Oui' : 'Non'
  if (typeof val === 'string') return val.trim() || null
  if (typeof val === 'number') return String(val)
  return null
}

const renderObj = (obj: Record<string, unknown>, labels: Record<string, string>): { label: string; value: string }[] => {
  const out: { label: string; value: string }[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (k.endsWith('_detail') || k === 'notes') continue
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

// ── Export types ──────────────────────────────────────────────────────────────

export type ImprovementEntry = { num: number; date: string; evn: number | null; delta: number | null };

// ── MAIN PDF GENERATOR ───────────────────────────────────────────────────────

interface PatientInfo {
  nom: string
  prenom: string
  dateNaissance: string
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
) => {
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
    doc.text(`▸ ${title}`, ML + 2, y)
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
  if (patientId.dateNaissance) doc.text(`Né(e) le ${patientId.dateNaissance}`, ML + 6, y + 12)
  if (generalInfo.profession) doc.text(`Profession : ${generalInfo.profession}`, ML + MW / 2, y + 12)
  doc.setTextColor(...C.text)
  y += 26

  // Infos complémentaires
  if (generalInfo.sport || generalInfo.famille || generalInfo.chirurgie) {
    fieldLine('Activité physique', generalInfo.sport ?? '')
    fieldLine('Antécédents', generalInfo.famille ?? '')
    fieldLine('Chirurgie', generalInfo.chirurgie ?? '')
  }

  // ── 2. Cartographie corporelle ────────────────────────────────────────────
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

  // ── 3. Bilan spécifique par zone ──────────────────────────────────────────
  if (bilanZoneData?.data) {
    sectionTitle(`Bilan spécifique — ${bilanZoneData.sectionTitle}`, secNum++)
    const d = bilanZoneData.data

    // Douleur
    if (d.douleur) {
      subTitle('Douleur')
      const entries = renderObj(d.douleur as Record<string, unknown>, DOULEUR_LABELS)
      entries.forEach(e => field(e.label, e.value))
      y += 2
    }

    // Red Flags
    if (d.redFlags) {
      const entries = renderObj(d.redFlags as Record<string, unknown>, FLAG_LABELS)
      if (entries.length > 0) {
        subTitle('Red Flags')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // 5D3N (cervical)
    if (d.cinqD3N) {
      const entries = renderObj(d.cinqD3N as Record<string, unknown>, {
        dizziness: 'Vertiges', dropAttacks: 'Drop attacks', diplopie: 'Diplopie',
        dysarthrie: 'Dysarthrie', dysphagie: 'Dysphagie', nystagmus: 'Nystagmus',
        nausees: 'Nausées', numbness: 'Engourdissements',
      })
      if (entries.length > 0) {
        subTitle('5D 3N')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Ottawa (cheville)
    if (d.ottawa) {
      const entries = renderObj(d.ottawa as Record<string, unknown>, {
        // Legacy keys
        malleoleExternePalpation: 'Malléole externe', malleoleInternePalpation: 'Malléole interne',
        naviculairePalpation: 'Naviculaire', base5ePalpation: 'Base 5e métatarsien',
        appuiImpossible: 'Appui impossible',
        // New keys
        malleoleMediale: 'Malléole médiale', malleoleLaterale: 'Malléole latérale',
        cinquiemeMetatarsien: 'Base 5e métatarsien', naviculaire: 'Naviculaire',
        appuiUnipodal: 'Appui unipodal impossible',
      })
      if (entries.length > 0) {
        subTitle("Critères d'Ottawa")
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Antécédents d'entorse (cheville)
    if (d.antecedentsEntorse) {
      const entries = renderObj(d.antecedentsEntorse as Record<string, unknown>, {
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

    // Yellow Flags
    if (d.yellowFlags) {
      const entries = renderObj(d.yellowFlags as Record<string, unknown>, FLAG_LABELS)
      if (entries.length > 0) {
        subTitle('Yellow Flags')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Blue / Black Flags
    if (d.blueBlackFlags) {
      const entries = renderObj(d.blueBlackFlags as Record<string, unknown>, FLAG_LABELS)
      if (entries.length > 0) {
        subTitle('Blue / Black Flags')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Examen clinique
    if (d.examClinique) {
      const ec = d.examClinique as Record<string, unknown>
      // Helper: render a sub-section table from an APGD or simple Record
      const renderSubGroup = (title: string, obj: unknown, labels: Record<string, string> = {}) => {
        if (!obj || typeof obj !== 'object') return
        const entries: { label: string; value: string }[] = []
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (v && typeof v === 'object') {
            // APGD row { ag, ad, pg, pd } or { gauche, droite } or { initial, actuel } or { perte, symptomes }
            const r = v as Record<string, string>
            const parts: string[] = []
            if (r.ag || r.ad || r.pg || r.pd) {
              if (r.ag || r.ad) parts.push(`A: G ${r.ag || '—'} / D ${r.ad || '—'}`)
              if (r.pg || r.pd) parts.push(`P: G ${r.pg || '—'} / D ${r.pd || '—'}`)
            } else if (r.gauche || r.droite) {
              parts.push(`G ${r.gauche || '—'} / D ${r.droite || '—'}`)
            } else if (r.perte || r.symptomes) {
              if (r.perte) parts.push(`Perte: ${r.perte}`)
              if (r.symptomes) parts.push(r.symptomes)
            }
            if (parts.length > 0) {
              entries.push({ label: labels[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), value: parts.join(' · ') })
            }
          } else {
            const display = fmt(v)
            if (display) entries.push({ label: labels[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), value: display })
          }
        }
        if (entries.length === 0) return
        check(8)
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(...C.muted)
        doc.text(title, ML + 6, y)
        doc.setTextColor(...C.text)
        y += 4
        entries.forEach(e => field(e.label, e.value, 4))
      }

      subTitle('Examen clinique')
      // Top-level simple fields (legacy morfho string, oedeme string)
      const simpleEntries: { label: string; value: string }[] = []
      for (const [k, v] of Object.entries(ec)) {
        if (typeof v === 'object') continue
        const display = fmt(v)
        if (display) simpleEntries.push({ label: EXAM_LABELS[k] ?? k, value: display })
      }
      simpleEntries.forEach(e => field(e.label, e.value))
      // Structured sub-groups
      renderSubGroup('Morphostatique', ec.morpho, EXAM_LABELS)
      renderSubGroup('Observation', ec.observation, EXAM_LABELS)
      renderSubGroup('Œdème', ec.oedeme, EXAM_LABELS)
      renderSubGroup('Mobilité (legacy)', ec.mobilite, EXAM_LABELS)
      renderSubGroup('Mobilité — Épaule', ec.mobiliteEpaule, EXAM_LABELS)
      renderSubGroup('Mobilité — Hanche', ec.mobiliteHanche, EXAM_LABELS)
      renderSubGroup('Mobilité — Genou', ec.mobiliteGenou, EXAM_LABELS)
      renderSubGroup('Mobilité — Cheville', ec.mobiliteCheville, EXAM_LABELS)
      renderSubGroup('Mobilité — Rachis lombaire', ec.mobiliteLombaire, EXAM_LABELS)
      renderSubGroup('Mobilité — Rachis cervical', ec.mobiliteCervical, EXAM_LABELS)
      renderSubGroup('Mobilité — Autres', ec.mobAutres, EXAM_LABELS)
      renderSubGroup('Zones adjacentes', ec.zones, EXAM_LABELS)
      renderSubGroup('Fonctionnel', ec.fonctionnel, EXAM_LABELS)
      renderSubGroup('WBLT', ec.wblt, EXAM_LABELS)
      renderSubGroup('Modifications des symptômes', ec.modifSymp, EXAM_LABELS)
      renderSubGroup('Force (legacy)', ec.force, FORCE_LABELS)
      y += 2
    }

    // Force musculaire (nouvelle structure)
    if (d.forceMusculaire) {
      const fm = d.forceMusculaire as Record<string, unknown>
      const forceEntries: { label: string; value: string }[] = []
      if (fm.force && typeof fm.force === 'object') {
        for (const [k, v] of Object.entries(fm.force as Record<string, unknown>)) {
          const r = v as { gauche?: string; droite?: string }
          if (r.gauche || r.droite) {
            forceEntries.push({ label: FORCE_LABELS[k] ?? k, value: `G ${r.gauche || '—'} / D ${r.droite || '—'}` })
          }
        }
      }
      const abdoEntries: { label: string; value: string }[] = []
      if (fm.abdo && typeof fm.abdo === 'object') {
        for (const [k, v] of Object.entries(fm.abdo as Record<string, unknown>)) {
          const display = fmt(v)
          if (display) abdoEntries.push({ label: FORCE_LABELS[k] ?? k, value: display })
        }
      }
      const otherEntries = renderObj(
        Object.fromEntries(Object.entries(fm).filter(([k]) => !['force', 'abdo'].includes(k))),
        { autresForce: 'Autres tests force', marqueursAvant: 'Mvts répétés — marqueurs', resultats: 'Mvts répétés — résultats' }
      )
      if (forceEntries.length + abdoEntries.length + otherEntries.length > 0) {
        subTitle('Force musculaire')
        forceEntries.forEach(e => field(e.label, e.value))
        if (abdoEntries.length > 0) {
          check(8)
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(8)
          doc.setTextColor(...C.muted)
          doc.text('Muscles abdominaux', ML + 6, y)
          doc.setTextColor(...C.text)
          y += 4
          abdoEntries.forEach(e => field(e.label, e.value, 4))
        }
        otherEntries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Neurologique
    if (d.neurologique) {
      const entries = renderObj(d.neurologique as Record<string, unknown>, NEURO_LABELS)
      if (entries.length > 0) {
        subTitle('Examen neurologique')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Mécanosensibilité
    if (d.mecanosensibilite) {
      const entries = renderObj(d.mecanosensibilite as Record<string, unknown>, NEURO_LABELS)
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

    // Tests ligamentaires (genou)
    if (d.testsLigamentaires) {
      const entries = renderObj(d.testsLigamentaires as Record<string, unknown>, TESTS_LABELS)
      if (entries.length > 0) {
        subTitle('Tests ligamentaires')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Tests spécifiques (legacy `tests` ou nouvelle clé `testsSpecifiques`)
    if (d.tests || d.testsSpecifiques) {
      const src = (d.testsSpecifiques ?? d.tests) as Record<string, unknown>
      const entries = renderObj(src, TESTS_LABELS)
      if (entries.length > 0) {
        subTitle('Tests spécifiques')
        entries.forEach(e => field(e.label, e.value))
        y += 2
      }
    }

    // Équilibre (cheville)
    if (d.equilibre) {
      const entries = renderObj(d.equilibre as Record<string, unknown>, {
        footLiftGauche: 'Foot Lift G', footLiftDroite: 'Foot Lift D',
        bessGauche: 'BESS G /60', bessDroite: 'BESS D /60',
        yBalanceGauche: 'Y Balance G', yBalanceDroite: 'Y Balance D',
      })
      if (entries.length > 0) {
        subTitle('Équilibre postural')
        entries.forEach(e => field(e.label, e.value))
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

    // Scores fonctionnels
    if (d.scores) {
      const entries = renderObj(d.scores as Record<string, unknown>, SCORE_LABELS)
      if (entries.length > 0) {
        subTitle('Scores fonctionnels')
        entries.forEach(e => field(e.label, e.value))
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
  doc.save(`Bilan_${safeName}_${safeFirst}_${dateFile}.pdf`)
}

// ── AI-generated PDF report ──────────────────────────────────────────────────

export const generateAIPDF = (
  patientId: { nom?: string; prenom?: string; dateNaissance?: string },
  markdownReport: string,
  pdfTitle?: string,
) => {
  const doc = new jsPDF()
  const W = 210
  const ML = 18
  const MR = 18
  const MW = W - ML - MR
  let y = 20

  const today = new Date()
  const dateFile = today.toISOString().split('T')[0]
  const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const check = (need = 10) => { if (y + need > 282) { doc.addPage(); y = 20 } }
  const split = (text: string, maxW: number) => doc.splitTextToSize(sanitize(text), maxW)

  // ── En-tête ──
  doc.setFillColor(...C.primary)
  doc.rect(0, 0, W, 30, 'F')
  doc.setFillColor(...C.accent)
  doc.rect(0, 30, W, 1.5, 'F')

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.white)
  doc.text(sanitize(pdfTitle ?? 'BILAN EN PHYSIOTHÉRAPIE'), ML, 13)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${patientId.prenom ?? ''} ${patientId.nom ?? ''}  ·  ${dateStr}`, ML, 22)
  doc.setFontSize(7.5)
  doc.text('Document confidentiel — usage médical uniquement', ML, 27)
  doc.setTextColor(...C.text)
  y = 38

  // ── Parse markdown ──
  const lines = markdownReport.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('### ')) {
      y += 4
      check(14)
      doc.setFillColor(...C.primaryLight)
      doc.roundedRect(ML - 1, y - 6, MW + 2, 9, 1, 1, 'F')
      doc.setFillColor(...C.primary)
      doc.rect(ML - 1, y - 6, 2.5, 9, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...C.primary)
      doc.text(line.replace(/^### /, ''), ML + 4, y)
      doc.setTextColor(...C.text)
      y += 8
    } else if (line.startsWith('## ')) {
      y += 3
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text(line.replace(/^## /, ''), ML, y)
      y += 7
    } else if (line.match(/^- \*\*H\d/)) {
      const full = line.replace(/^- \*\*/, '').replace(/\*\*/, '')
      // Remove percentages like (70%), (20%), etc.
      const cleaned = full.replace(/\s*\(\d+%?\)\s*/g, ' ').trim()
      const dashIdx = cleaned.indexOf(' — ')
      const title = dashIdx !== -1 ? cleaned.slice(0, dashIdx).trim() : cleaned.trim()
      const justification = dashIdx !== -1 ? cleaned.slice(dashIdx + 3).trim() : ''
      check(14)
      // Title in bold
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'bold')
      const tl = split(title, MW - 4)
      for (const t of tl) { check(6); doc.text(t, ML + 4, y); y += 5 }
      // Justification in normal
      if (justification) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        const jl = split(justification, MW - 8)
        for (const j of jl) { check(5); doc.text(j, ML + 8, y); y += 4.5 }
      }
      y += 2
    } else if (line.match(/^- \*\*(.+?)\*\*(.*)$/)) {
      const m = line.match(/^- \*\*(.+?)\*\*(.*)$/)!
      check(8)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const bullet = `• ${m[1]}`
      const bw = doc.getTextWidth(bullet)
      doc.text(bullet, ML + 4, y)
      if (m[2].trim()) {
        doc.setFont('helvetica', 'normal')
        const rest = split(m[2].trimStart(), MW - 4 - bw - 2)
        doc.text(rest[0] ?? '', ML + 4 + bw + 1, y)
        y += 5
        for (let r = 1; r < rest.length; r++) { check(5); doc.text(rest[r], ML + 4 + bw + 1, y); y += 4.5 }
      } else {
        y += 5
      }
    } else if (line.startsWith('- ')) {
      const text = line.replace(/^- /, '').replace(/\*\*(.+?)\*\*/g, '$1')
      check(7)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const bl = split(`• ${text}`, MW - 6)
      for (const b of bl) { check(5); doc.text(b, ML + 4, y); y += 4.5 }
      y += 1
    } else if (line.trim() === '') {
      y += 3
    } else if (line.startsWith('**') && line.endsWith('**')) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      const txt = line.replace(/\*\*/g, '')
      const tl = split(txt, MW)
      for (const t of tl) { check(6); doc.text(t, ML, y); y += 5 }
      y += 1
    } else {
      const text = line.replace(/\*\*(.+?)\*\*/g, '$1')
      if (text.trim()) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const tl = split(text, MW)
        for (const t of tl) { check(5); doc.text(t, ML, y); y += 4.5 }
        y += 1
      }
    }
  }

  // ── Footer ──
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor(...C.light)
    doc.setLineWidth(0.3)
    doc.line(ML, 286, W - MR, 286)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...C.muted)
    doc.text('Document confidentiel — à usage exclusivement médical et paramédical', ML, 291)
    doc.text(`Page ${p}/${totalPages}`, W - MR - 18, 291)
    doc.setTextColor(...C.text)
  }

  const safeName = (patientId.nom || 'Anonyme').replace(/\s+/g, '_')
  const safeFirst = (patientId.prenom || '').replace(/\s+/g, '_')
  doc.save(`Rapport_${safeName}_${safeFirst}_${dateFile}.pdf`)
}
