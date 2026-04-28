import type { AnalyseIA, AnalyseIAIntermediaire, EvolutionIA } from '../types'

export interface TherapistProfile {
  specialites?: string[]
  techniques?: string[]
  equipements?: string[]
  autresCompetences?: string
}

export interface PatientHistoryEntry {
  type: 'bilan' | 'intermediaire' | 'note_seance'
  date: string
  zone: string
  evn?: number | null
  data?: Record<string, unknown>
  noteData?: {
    eva: string
    observance: string
    evolution: string
    noteSubjective: string
    interventions: string[]
    tolerance: string
    prochaineEtape: string[]
  }
  ficheExercice?: { markdown: string } | null
  analyseIA?: { resume?: string; evolution?: string; focus?: string } | null
}

export interface BilanContext {
  patient: {
    nom: string
    prenom: string
    dateNaissance: string
    sexe?: string
    profession?: string
    sport?: string
    antecedents?: string
  }
  zone: string
  bilanType: string
  bilanData: Record<string, unknown>
  notesLibres?: string
  therapist?: TherapistProfile
  patientHistory?: PatientHistoryEntry[]
  /** Résumé 1 ligne par PEC clôturée sur une autre zone — contexte d'arrière-plan uniquement. */
  closedAntecedents?: string[]
  therapistProfession?: string
}

/** Retourne le titre professionnel adapté pour les prompts IA */
export function roleTitle(profession?: string): string {
  return /physio/i.test(profession ?? '') ? 'physiothérapeute' : 'kinésithérapeute'
}

// ── Anonymization ─────────────────────────────────────────────────────────────

export function computeAge(dateNaissance: string): number | null {
  // Accepts dd/mm/yyyy or yyyy-mm-dd
  let date: Date | null = null
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateNaissance)) {
    const [d, m, y] = dateNaissance.split('/')
    date = new Date(`${y}-${m}-${d}`)
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateNaissance)) {
    date = new Date(dateNaissance)
  }
  if (!date || isNaN(date.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age--
  return age
}

/**
 * Returns a scrubber function that replaces any occurrence of nom/prenom
 * (case-insensitive, whole-word boundary) with the token '[PATIENT]'.
 */
function buildScrubber(nom: string, prenom: string): (text: string) => string {
  const tokens = [nom, prenom].filter(t => t.trim().length > 1)
  if (tokens.length === 0) return (text) => text
  const pattern = new RegExp(tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi')
  return (text: string) => text.replace(pattern, '[PATIENT]')
}

/**
 * Anonymizes a patient object:
 * - keeps only age (computed from dateNaissance) and optional sexe
 * - returns a scrubber to clean any free-text field of identifying names
 */
export function anonymizePatientData(patient: BilanContext['patient']): {
  age: number | null
  sexe: string | undefined
  scrub: (text: string) => string
} {
  return {
    age: computeAge(patient.dateNaissance),
    sexe: patient.sexe,
    scrub: buildScrubber(patient.nom, patient.prenom),
  }
}

// ── Prompt builder ────────────────────────────────────────────────────────────

export function buildClinicalPrompt(ctx: BilanContext): string {
  const { patient, zone, bilanType, bilanData } = ctx
  const { age, sexe, scrub } = anonymizePatientData(patient)

  const douleur = bilanData.douleur as Record<string, unknown> | undefined
  const redFlags = bilanData.redFlags as Record<string, unknown> | undefined
  const yellowFlags = bilanData.yellowFlags as Record<string, unknown> | undefined
  const scores = bilanData.scores as Record<string, unknown> | undefined
  // Les composants de bilan (Lombaire, Hanche, Cheville…) sérialisent les tests sous `testsSpecifiques`.
  // On garde la compat avec l'ancienne clé `tests` par sécurité.
  const tests = (bilanData.testsSpecifiques ?? bilanData.tests) as Record<string, unknown> | undefined

  const flagsPositifs = (obj: Record<string, unknown> | undefined) =>
    obj ? Object.entries(obj).filter(([, v]) => v === 'oui' || v === true).map(([k]) => k).join(', ') || 'Aucun' : 'Non renseigné'

  // Scrub free-text fields that might contain the patient name
  const profession = scrub(patient.profession || 'Non renseignée')
  const sport = scrub(patient.sport || 'Non renseignée')
  const antecedents = scrub(patient.antecedents || 'Non renseignés')
  const testsStr = tests ? scrub(JSON.stringify(tests, null, 2)) : 'Non renseignés'
  const scoresStr = scores ? scrub(JSON.stringify(scores, null, 2)) : 'Non renseignés'

  const ageLine = age !== null ? `${age} ans` : 'Âge non renseigné'
  const sexeLine = sexe ? ` — Sexe : ${sexe}` : ''
  const notesLibresStr = ctx.notesLibres ? scrub(ctx.notesLibres) : null

  // Profil thérapeute
  const tp = ctx.therapist
  const therapistLines: string[] = []
  if (tp?.specialites?.length) therapistLines.push(`Spécialités : ${tp.specialites.join(', ')}`)
  if (tp?.techniques?.length) therapistLines.push(`Techniques maîtrisées : ${tp.techniques.join(', ')}`)
  if (tp?.equipements?.length) therapistLines.push(`Équipements au cabinet : ${tp.equipements.join(', ')}`)
  if (tp?.autresCompetences?.trim()) therapistLines.push(`Autres : ${tp.autresCompetences.trim()}`)
  const therapistSection = therapistLines.length > 0
    ? `\nPROFIL DU THÉRAPEUTE (adapter la prise en charge aux compétences et équipements disponibles) :\n${therapistLines.map(l => `- ${l}`).join('\n')}`
    : ''

  const antecedentsPEC = (ctx.closedAntecedents && ctx.closedAntecedents.length > 0)
    ? `\nANTÉCÉDENTS DE PRISE EN CHARGE (autres zones, déjà clôturées — contexte général uniquement, NE PAS mélanger avec l'analyse de la zone courante) :\n${ctx.closedAntecedents.map(a => `- ${a}`).join('\n')}`
    : ''

  const role = roleTitle(ctx.therapistProfession)

  return `Tu es un ${role} expert en musculo-squelettique. Analyse ce bilan clinique et fournis une évaluation précise et personnalisée.

DONNÉES DU BILAN (données anonymisées) :
- Patient : ${ageLine}${sexeLine}
- Profession : ${profession}
- Activité sportive : ${sport}
- Antécédents : ${antecedents}
- Zone : ${zone} (type bilan : ${bilanType})${antecedentsPEC}

DOULEUR :
- EVN pire : ${douleur?.evnPire ?? 'N/R'} / EVN mieux : ${douleur?.evnMieux ?? 'N/R'} / EVN moyen : ${douleur?.evnMoy ?? 'N/R'}
- Type : ${douleur?.douleurType ?? 'N/R'} — Évolution : ${douleur?.situation ?? 'N/R'}
- Nocturne : ${douleur?.douleurNocturne ?? 'N/R'} — Dérouillage matinal : ${douleur?.derouillageMatinal ?? 'N/R'}

RED FLAGS positifs : ${flagsPositifs(redFlags)}
YELLOW FLAGS positifs : ${flagsPositifs(yellowFlags)}

TESTS CLINIQUES : ${testsStr}
SCORES : ${scoresStr}
${notesLibresStr ? `\nNOTES CLINIQUES COMPLÉMENTAIRES : ${notesLibresStr}` : ''}
${therapistSection}

INSTRUCTIONS STRICTES :
1. Les 3 hypothèses doivent avoir des probabilités RÉELLES calculées à partir des données cliniques (EVN, tests, scores, flags). Les probabilités ne doivent PAS être fixes (pas de 75/45/20 par défaut). Elles doivent refléter la réalité clinique du cas. La somme des 3 probabilités DOIT être exactement égale à 100 (ex: 65+25+10=100, ou 50+30+20=100).
2. La prise en charge doit être SPÉCIFIQUE à ce patient : cite les techniques précises que le thérapeute maîtrise et les équipements dont il dispose. Ne propose PAS de techniques ou appareils que le thérapeute n'a pas listés. Si aucun profil thérapeute n'est fourni, reste générique. Chaque phase doit contenir 3 à 5 "points" COURTS et ACTIONNABLES (12-18 mots max par point, style télégraphique clinique, pas de phrases longues). Chaque point = une action, une technique ou un exercice concret avec sa dose/fréquence quand pertinent.
3. Réponds UNIQUEMENT en JSON valide, sans markdown ni texte autour.

{
  "diagnostic": {
    "titre": "Titre court et précis du diagnostic physiothérapeutique principal",
    "description": "Description clinique détaillée et personnalisée en 2-3 phrases basée sur les données fournies"
  },
  "hypotheses": [
    { "rang": 1, "titre": "Hypothèse H1 spécifique", "probabilite": <calculé>, "justification": "Justification basée sur les données cliniques concrètes" },
    { "rang": 2, "titre": "Hypothèse H2 spécifique", "probabilite": <calculé>, "justification": "Justification basée sur les données cliniques concrètes" },
    { "rang": 3, "titre": "Hypothèse H3 spécifique", "probabilite": <calculé>, "justification": "Justification basée sur les données cliniques concrètes" }
  ],
  "priseEnCharge": [
    { "phase": "Phase aiguë (J1–J7)", "titre": "Titre spécifique", "points": ["Action concise 1 (technique + fréquence)", "Action concise 2", "Action concise 3", "Action concise 4"] },
    { "phase": "Phase subaiguë (J8–J21)", "titre": "Titre spécifique", "points": ["Action concise 1", "Action concise 2", "Action concise 3", "Action concise 4"] },
    { "phase": "Phase fonctionnelle (J22–J42)", "titre": "Titre spécifique", "points": ["Action concise 1", "Action concise 2", "Action concise 3", "Action concise 4"] }
  ],
  "alertes": ["Alerte uniquement si red flag critique nécessitant orientation urgente, sinon tableau vide"]
}`
}

// ── Fiche d'exercices prompt ──────────────────────────────────────────────────

export function buildFicheExercicePrompt(
  ctx: BilanContext,
  notesSeance: string,
  analyseIA?: { diagnostic: { titre: string }; priseEnCharge: Array<{ titre: string }> } | null
): string {
  const { patient, zone, bilanData, patientHistory } = ctx
  const { age, sexe, scrub } = anonymizePatientData(patient)

  const douleur = bilanData.douleur as Record<string, unknown> | undefined
  const evn = douleur?.evnMoy ?? douleur?.evnPire ?? 'N/R'
  const profession = scrub(patient.profession || 'Non renseignée')
  const sport = scrub(patient.sport || 'Non renseignée')
  const antecedents = scrub(patient.antecedents || 'Non renseignés')
  const scrubbedNotes = scrub(notesSeance)

  // Build patient history section
  let historyBlock = ''
  if (patientHistory && patientHistory.length > 0) {
    const sorted = [...patientHistory].sort((a, b) => a.date.localeCompare(b.date))

    const bilans = sorted.filter(h => h.type === 'bilan')
    const intermediaires = sorted.filter(h => h.type === 'intermediaire')
    const notes = sorted.filter(h => h.type === 'note_seance')

    const parts: string[] = []

    if (bilans.length > 0) {
      parts.push(`--- BILANS INITIAUX (${bilans.length}) ---`)
      for (const b of bilans) {
        const d = b.data?.douleur as Record<string, unknown> | undefined
        const scores = b.data?.scores as Record<string, unknown> | undefined
        parts.push(`Bilan du ${b.date} — Zone : ${b.zone} — EVN : ${b.evn ?? 'N/R'}/10`)
        if (d) parts.push(`  Douleur : type=${d.douleurType ?? 'N/R'}, évolution=${d.situation ?? 'N/R'}, nocturne=${d.douleurNocturne ?? 'N/R'}`)
        if (scores) parts.push(`  Scores : ${scrub(JSON.stringify(scores))}`)
      }
    }

    if (intermediaires.length > 0) {
      parts.push(`\n--- BILANS INTERMÉDIAIRES (${intermediaires.length}) ---`)
      for (const b of intermediaires) {
        parts.push(`Bilan intermédiaire du ${b.date} — Zone : ${b.zone} — EVN : ${b.evn ?? 'N/R'}/10`)
        if (b.analyseIA?.resume) parts.push(`  Résumé IA : ${scrub(b.analyseIA.resume)}`)
        if (b.analyseIA?.evolution) parts.push(`  Évolution : ${scrub(b.analyseIA.evolution)}`)
      }
    }

    if (notes.length > 0) {
      parts.push(`\n--- NOTES DE SÉANCE (${notes.length}) ---`)
      for (const n of notes) {
        const nd = n.noteData
        parts.push(`Séance du ${n.date} — Zone : ${n.zone} — EVA : ${nd?.eva ?? 'N/R'}/10`)
        if (nd?.observance) parts.push(`  Observance exercices : ${nd.observance}`)
        if (nd?.evolution) parts.push(`  Évolution : ${scrub(nd.evolution)}`)
        if (nd?.interventions?.length) parts.push(`  Interventions : ${nd.interventions.join(', ')}`)
        if (nd?.tolerance) parts.push(`  Tolérance : ${nd.tolerance}`)
        if (nd?.prochaineEtape?.length) parts.push(`  Prochaines étapes : ${nd.prochaineEtape.join(', ')}`)
        if (n.analyseIA?.focus) parts.push(`  Focus IA : ${scrub(n.analyseIA.focus)}`)
      }
    }

    // Previous exercise sheets
    const withFiches = sorted.filter(h => h.ficheExercice?.markdown)
    if (withFiches.length > 0) {
      parts.push(`\n--- FICHES D'EXERCICES PRÉCÉDENTES (${withFiches.length}) ---`)
      for (const f of withFiches) {
        parts.push(`Fiche du ${f.date} — Zone : ${f.zone}`)
        // Include a summary (first 500 chars) to avoid token explosion
        const md = f.ficheExercice!.markdown
        parts.push(md.length > 500 ? md.slice(0, 500) + '... [tronqué]' : md)
      }
    }

    historyBlock = `\n<historique_patient>
${parts.join('\n')}
</historique_patient>

IMPORTANT : Utilise cet historique pour adapter les exercices au niveau actuel du patient. Tiens compte de :
- L'évolution de la douleur dans le temps
- L'observance et la tolérance aux exercices précédents
- Les interventions déjà réalisées en séance
- La progression globale pour ajuster l'intensité
- Ne pas répéter des exercices qui n'ont pas fonctionné
`
  }

  const antecedentsPEC = (ctx.closedAntecedents && ctx.closedAntecedents.length > 0)
    ? `\nAntécédents d'autres PEC clôturées (contexte général, ne pas y puiser d'exercices) :\n${ctx.closedAntecedents.map(a => `- ${a}`).join('\n')}`
    : ''

  return `<notes_seance_actuelle>
Zone traitée : ${zone}
Patient : ${age !== null ? `${age} ans` : 'Âge N/R'}${sexe ? ` — Sexe : ${sexe}` : ''}
EVN actuel : ${evn} / 10
Profession : ${profession}
Activité sportive : ${sport}
Antécédents : ${antecedents}${antecedentsPEC}
${analyseIA ? `\nDiagnostic retenu : ${analyseIA.diagnostic.titre}\nObjectifs thérapeutiques : ${analyseIA.priseEnCharge.map(p => p.titre).join(' | ')}` : ''}
Notes du thérapeute pour cette séance :
${scrubbedNotes || '(Non renseignées — générer un programme adapté au diagnostic et à la zone traitée)'}
</notes_seance_actuelle>${historyBlock}`
}

// ── Evolution prompt ──────────────────────────────────────────────────────────

export interface EvolutionBilanEntry {
  num: number
  date: string
  zone: string
  evn: number | null
  bilanData: Record<string, unknown>
}

export interface EvolutionIntermediaireEntry {
  num: number
  date: string
  zone: string
  data: Record<string, unknown>
}

export interface EvolutionSeanceEntry {
  num: string
  date: string
  zone: string
  data: {
    eva?: string
    observance?: string
    evolution?: string
    noteSubjective?: string
    interventions?: string[]
    detailDosage?: string
    tolerance?: string
    toleranceDetail?: string
    prochaineEtape?: string[]
    notePlan?: string
  }
}

export interface EvolutionContext {
  patient: BilanContext['patient']
  bilans: EvolutionBilanEntry[]
  intermediaires?: EvolutionIntermediaireEntry[]
  seances?: EvolutionSeanceEntry[]
  /** Zone/bilanType courant du rapport (pour filtrer strictement l'évolution à cette PEC). */
  currentZoneLabel?: string
  /** Résumés 1-ligne des PEC clôturées dans d'autres zones — contexte d'arrière-plan uniquement. */
  closedAntecedents?: string[]
  therapistProfession?: string
}

// Parse dd/mm/yyyy → timestamp (stable sort key)
const parseFrDateStr = (raw: string | undefined): number => {
  if (!raw) return 0
  if (raw.includes('/')) {
    const [d, m, y] = raw.split('/').map(Number)
    return new Date(y, (m ?? 1) - 1, d ?? 1).getTime()
  }
  const t = Date.parse(raw)
  return Number.isNaN(t) ? 0 : t
}

export function buildEvolutionPrompt(ctx: EvolutionContext): string {
  const { patient, bilans, intermediaires = [], seances = [] } = ctx
  const { age, sexe, scrub } = anonymizePatientData(patient)

  const ageLine = age !== null ? `${age} ans` : 'Âge non renseigné'
  const profession = scrub(patient.profession || 'Non renseignée')
  const sport = scrub(patient.sport || 'Non renseignée')
  const antecedents = scrub(patient.antecedents || 'Non renseignés')

  const sexeNorm = sexe === 'feminin' ? 'feminin' : sexe === 'masculin' ? 'masculin' : null
  const sexeLine = sexeNorm
    ? `SEXE_PATIENT : ${sexeNorm}  ← accord grammatical OBLIGATOIRE selon cette valeur (voir règle 3).`
    : `SEXE_PATIENT : inconnu  ← défaut masculin singulier, JAMAIS de formulation inclusive.`

  const flagsPositifs = (obj: Record<string, unknown> | undefined) =>
    obj ? Object.entries(obj).filter(([, v]) => v === 'oui' || v === true).map(([k]) => k).join(', ') || 'Aucun' : 'Aucun'

  type TimelineItem =
    | { kind: 'bilan'; date: string; ts: number; entry: EvolutionBilanEntry }
    | { kind: 'intermediaire'; date: string; ts: number; entry: EvolutionIntermediaireEntry }
    | { kind: 'seance'; date: string; ts: number; entry: EvolutionSeanceEntry }

  const timeline: TimelineItem[] = [
    ...bilans.map<TimelineItem>(b => ({ kind: 'bilan', date: b.date, ts: parseFrDateStr(b.date), entry: b })),
    ...intermediaires.map<TimelineItem>(i => ({ kind: 'intermediaire', date: i.date, ts: parseFrDateStr(i.date), entry: i })),
    ...seances.map<TimelineItem>(s => ({ kind: 'seance', date: s.date, ts: parseFrDateStr(s.date), entry: s })),
  ].sort((a, b) => a.ts - b.ts)

  // Durée totale PEC (jours entre 1ère et dernière étape)
  const dateDebut = timeline.length > 0 ? timeline[0].date : '—'
  const dateFin = timeline.length > 0 ? timeline[timeline.length - 1].date : '—'
  const dureeJours = timeline.length > 1
    ? Math.max(0, Math.round((timeline[timeline.length - 1].ts - timeline[0].ts) / 86400000))
    : 0
  const dureeLine = dureeJours > 0 ? `${dureeJours} jours (${dateDebut} → ${dateFin})` : 'Étape unique'

  // Motif initial = zone du premier bilan
  const motifInitial = bilans[0]?.zone ?? ctx.currentZoneLabel ?? 'Non renseigné'

  const timelineStr = timeline.map((item, idx) => {
    const stepNum = idx + 1
    if (item.kind === 'bilan') {
      const b = item.entry
      const d = b.bilanData.douleur as Record<string, unknown> | undefined
      const rf = b.bilanData.redFlags as Record<string, unknown> | undefined
      const yf = b.bilanData.yellowFlags as Record<string, unknown> | undefined
      const sc = b.bilanData.scores as Record<string, unknown> | undefined
      const notes = scrub(JSON.stringify({ douleur: d, scores: sc }, null, 0))
      return `--- Étape ${stepNum} · BILAN INITIAL N°${b.num} (${b.date}) — Zone : ${b.zone} ---
EVN : ${b.evn ?? 'N/R'}
Type douleur : ${d?.douleurType ?? 'N/R'} | Évolution : ${d?.situation ?? 'N/R'} | Nocturne : ${d?.douleurNocturne ?? 'N/R'}
Red flags positifs : ${flagsPositifs(rf)}
Yellow flags positifs : ${flagsPositifs(yf)}
Scores : ${sc ? scrub(JSON.stringify(sc)) : 'N/R'}
Données brutes : ${notes}`
    }
    if (item.kind === 'intermediaire') {
      const i = item.entry
      const d = i.data.douleur as Record<string, unknown> | undefined
      const sc = i.data.scores as Record<string, unknown> | undefined
      const evn = (i.data.evn as number | undefined) ?? (d?.evn as number | undefined) ?? null
      const notes = scrub(JSON.stringify(i.data, null, 0))
      return `--- Étape ${stepNum} · BILAN INTERMÉDIAIRE N°${i.num} (${i.date}) — Zone : ${i.zone} ---
EVN : ${evn ?? 'N/R'}
Scores : ${sc ? scrub(JSON.stringify(sc)) : 'N/R'}
Données : ${notes}`
    }
    // séance
    const s = item.entry
    const d = s.data
    const interventions = Array.isArray(d.interventions) ? d.interventions.join(', ') : 'N/R'
    const prochaines = Array.isArray(d.prochaineEtape) ? d.prochaineEtape.join(', ') : 'N/R'
    return `--- Étape ${stepNum} · SÉANCE N°${s.num} (${s.date}) — Zone : ${s.zone} ---
EVA : ${d.eva ?? 'N/R'} | Observance : ${d.observance ?? 'N/R'} | Tolérance : ${d.tolerance ?? 'N/R'}
Évolution perçue : ${scrub(d.evolution ?? 'N/R')}
Note subjective : ${scrub(d.noteSubjective ?? 'N/R')}
Interventions : ${scrub(interventions)}
Dosage : ${scrub(d.detailDosage ?? 'N/R')}
Prochaine étape : ${scrub(prochaines)}
Plan : ${scrub(d.notePlan ?? 'N/R')}`
  }).join('\n\n')

  const zoneScope = ctx.currentZoneLabel ?? motifInitial
  const antecedentsPEC = (ctx.closedAntecedents && ctx.closedAntecedents.length > 0)
    ? `\n\nANTÉCÉDENTS D'AUTRES PEC CLÔTURÉES (contexte patient uniquement, NE PAS mélanger à l'analyse de la zone courante) :\n${ctx.closedAntecedents.map(a => `- ${a}`).join('\n')}`
    : ''

  return `${sexeLine}

========================================
SECTION 1 — DONNÉES PATIENT
========================================
- Âge : ${ageLine}
- Sexe : ${sexeNorm ?? 'inconnu'}
- Profession : ${profession}
- Activité sportive : ${sport}
- Antécédents médicaux : ${antecedents}
- Motif initial de consultation : ${motifInitial}
- Date de début de PEC : ${dateDebut}
- Durée totale de PEC analysée : ${dureeLine}${antecedentsPEC}

========================================
SECTION 2 — PRISE EN CHARGE ANALYSÉE
========================================
- Zone ciblée : ${zoneScope} (RAPPORT CENTRÉ UNIQUEMENT SUR CETTE ZONE)
- Nombre de bilans initiaux : ${bilans.length}
- Nombre de bilans intermédiaires : ${intermediaires.length}
- Nombre de séances documentées : ${seances.length}
- Total d'étapes analysées : ${timeline.length}

========================================
SECTION 3 — CHRONOLOGIE COMPLÈTE
========================================
Ordre chronologique strict (1 = début de PEC, ${timeline.length} = étape la plus récente). Les EVN sont les valeurs déclarées par le patient ; les EVA proviennent des notes de séance. Les champs "N/R" signifient Non Renseigné.

${timelineStr || '(Aucune étape exploitable — rapport non génératif.)'}

========================================
SECTION 4 — INSTRUCTIONS DE RÉDACTION (10 règles absolues)
========================================
1. ANCRAGE FACTUEL STRICT — N'utilise QUE les données de la section 3. Aucune invention, aucune extrapolation, aucune pathologie ou mécanisme lésionnel non explicité dans les données. Si une information manque, écris "Non documenté dans le suivi" ou laisse le champ vide ([]).
2. PROSE MÉDICALE — Rédige en français médical professionnel, phrases articulées (sujet + verbe + complément), pas de style télégraphique, pas de listes à puces dans les blocs narratifs (tableauInitial, evolutionClinique.*, interventionsRealisees.*, etatActuel.*, resume, conclusion). Les tableaux (pointsForts, pointsVigilance, recommandations, progression) sont en revanche listes structurées.
3. ACCORD GRAMMATICAL SELON SEXE_PATIENT — Valeur en tête de prompt fait foi. Si \`feminin\` : "La patiente", "âgée", "née", "Elle", "active", "sportive". Si \`masculin\` : "Le patient", "âgé", "né", "Il", "actif", "sportif". Si \`inconnu\` : masculin singulier par défaut. INTERDICTIONS ABSOLUES : \`(e)\`, \`·e\`, \`·es\`, \`·ée\`, \`/\` inclusive (\`Le/la\`, \`il/elle\`, \`né(e)\`), parenthèses d'ajout féminin, circonlocutions (\`cette personne\`, \`l'intéressé·e\`, \`le/la patient·e\`). JAMAIS inférer le sexe depuis le prénom — seule SEXE_PATIENT fait foi.
4. TERMINOLOGIE VERBATIM — Noms de tests, articulations, échelles, acronymes : reproduis-les exactement comme dans les données. "Lasègue" reste "Lasègue", jamais "signe de Lasègue inversé" sauf si écrit tel quel.
5. PAS DE POURCENTAGES — aucune hypothèse diagnostique chiffrée (ni %, ni probabilité numérique). Langage qualitatif uniquement : "évolution favorable", "amélioration marquée", "progression lente", "stagnation relative".
6. CALIBRAGE LONGUEUR — tableauInitial : 3-5 phrases. evolutionClinique.syntheseGlobale : 3-4 phrases. evolutionClinique.evolutionSymptomatique/fonctionnelle/objective : 2-4 phrases chacun. interventionsRealisees.* : 2-3 phrases chacun. etatActuel.* : 2-3 phrases chacun. resume : 3-4 phrases. conclusion : 3-5 phrases. Respecte ces fourchettes.
7. TIMELINE — le champ "progression" liste CHAQUE étape de la section 3 dans l'ordre chronologique. "bilanNum" = numéro d'étape séquentiel (1, 2, 3…). "etape" = libellé type ("Bilan initial", "Bilan intermédiaire N°2", "Séance N°3"). "evn" = valeur EVN ou EVA quand disponible, sinon null. "commentaire" = 1 phrase courte (15-25 mots) résumant cliniquement l'étape.
8. TENDANCE — valeur unique parmi : "amelioration", "stationnaire", "regression", "mixte". Évalue sur l'ensemble de la chronologie (EVN/EVA, capacité fonctionnelle déclarée, tolérance). "mixte" = trajectoires divergentes (ex. douleur qui baisse mais fonction qui régresse).
9. TON CLINIQUE — concis, factuel, sans pathos, sans jargon gratuit, sans qualificatifs subjectifs ("malheureusement", "heureusement", "impressionnant"). Le rapport s'adresse à un médecin prescripteur : il doit pouvoir être lu en 2 minutes et donner une image fidèle de la PEC.
10. UNE INFO = UNE PLACE — ne répète pas une donnée dans plusieurs champs. Le resume est une synthèse narrative globale ; evolutionClinique détaille par dimension ; etatActuel est une photographie à la dernière étape ; conclusion est une orientation thérapeutique prospective.

RÉFÉRENTIEL KNODE (acronymes autorisés — n'invente AUCUNE expansion) :
- EVN = Échelle Visuelle Numérique
- EVA = Échelle Visuelle Analogique
- HAD = Hospital Anxiety and Depression scale
- SLR = Straight Leg Raise (Lasègue)
- PKB = Prone Knee Bend (test de Léri)
- Test TA = Test d'Adam
- RAS = Rien À Signaler
- PEC = Prise En Charge
Tout autre acronyme non listé : conservé verbatim sans expansion.

========================================
SECTION 5 — FORMAT DE SORTIE (JSON STRICT)
========================================
Réponds UNIQUEMENT en JSON valide, sans markdown ni texte autour. Schéma exact (les champs obligatoires doivent tous être présents ; laisse "" ou [] si "Non documenté dans le suivi") :

{
  "resume": "Synthèse narrative globale de la PEC en 3-4 phrases (motif, durée, trajectoire globale).",
  "tendance": "amelioration | stationnaire | regression | mixte",
  "tableauInitial": "Description clinique de l'état du patient à l'entrée en PEC, 3-5 phrases en prose médicale (symptômes, retentissement fonctionnel, contexte).",
  "evolutionClinique": {
    "syntheseGlobale": "Trajectoire générale sur toute la PEC en 3-4 phrases (tendance + moments clés).",
    "evolutionSymptomatique": "Évolution de la douleur et des symptômes perçus en 2-4 phrases (EVN/EVA, type, rythme, déclencheurs).",
    "evolutionFonctionnelle": "Évolution des capacités fonctionnelles en 2-4 phrases (AVQ, activités sportives/professionnelles, autonomie).",
    "evolutionObjective": "Évolution des données objectives en 2-4 phrases (mobilités, force, tests, scores fonctionnels)."
  },
  "progression": [
    { "bilanNum": 1, "etape": "Bilan initial", "date": "dd/mm/yyyy", "evn": 8, "commentaire": "Observation clinique courte (15-25 mots)." }
  ],
  "interventionsRealisees": {
    "techniquesManuelles": "Techniques manuelles appliquées en 2-3 phrases (mobilisations, thérapie manuelle, massage, etc.).",
    "exercicesProgrammes": "Exercices prescrits et programme actif en 2-3 phrases (renforcement, mobilité, proprioception, auto-rééducation).",
    "educationConseils": "Éducation thérapeutique et conseils délivrés en 2-3 phrases (ergonomie, gestion de la charge, facteurs contributifs)."
  },
  "etatActuel": {
    "symptomes": "État symptomatique à la dernière étape en 2-3 phrases (EVN/EVA actuelle, caractère, rythme).",
    "fonctionnel": "Capacités fonctionnelles actuelles en 2-3 phrases (AVQ, retour activités).",
    "objectif": "Données objectives à la dernière étape en 2-3 phrases (mobilités, force, tests de contrôle)."
  },
  "pointsForts": ["Élément positif factuel 1", "Élément positif factuel 2"],
  "pointsVigilance": ["Point de vigilance factuel 1"],
  "recommandations": [
    { "titre": "Titre court de la recommandation", "detail": "Description précise de la recommandation (2-3 phrases)." }
  ],
  "conclusion": "Conclusion clinique et orientation thérapeutique pour la suite de la PEC en 3-5 phrases (poursuite, fin de PEC, réorientation éventuelle)."
}`
}

export function parseEvolutionIA(raw: string): EvolutionIA | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as Partial<EvolutionIA>
    if (!parsed.resume || !parsed.tendance || !parsed.progression) return null

    // Normalisation des sous-blocs narratifs — si l'IA a omis, on laisse undefined (UI masque).
    // Si elle a fourni un objet partiel, on complète avec chaînes vides pour éviter les crashs.
    const evClinique = parsed.evolutionClinique
      ? {
          syntheseGlobale: parsed.evolutionClinique.syntheseGlobale ?? '',
          evolutionSymptomatique: parsed.evolutionClinique.evolutionSymptomatique ?? '',
          evolutionFonctionnelle: parsed.evolutionClinique.evolutionFonctionnelle ?? '',
          evolutionObjective: parsed.evolutionClinique.evolutionObjective ?? '',
        }
      : undefined

    const interventions = parsed.interventionsRealisees
      ? {
          techniquesManuelles: parsed.interventionsRealisees.techniquesManuelles ?? '',
          exercicesProgrammes: parsed.interventionsRealisees.exercicesProgrammes ?? '',
          educationConseils: parsed.interventionsRealisees.educationConseils ?? '',
        }
      : undefined

    const etatActuel = parsed.etatActuel
      ? {
          symptomes: parsed.etatActuel.symptomes ?? '',
          fonctionnel: parsed.etatActuel.fonctionnel ?? '',
          objectif: parsed.etatActuel.objectif ?? '',
        }
      : undefined

    return {
      generatedAt: new Date().toISOString(),
      resume: parsed.resume,
      tendance: parsed.tendance,
      tableauInitial: parsed.tableauInitial ?? undefined,
      evolutionClinique: evClinique,
      progression: parsed.progression,
      interventionsRealisees: interventions,
      etatActuel,
      pointsForts: parsed.pointsForts ?? [],
      pointsVigilance: parsed.pointsVigilance ?? [],
      recommandations: parsed.recommandations ?? [],
      conclusion: parsed.conclusion ?? '',
    }
  } catch {
    return null
  }
}

export function parseAnalyseIA(raw: string): AnalyseIA | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as AnalyseIA
    if (!parsed.diagnostic || !parsed.hypotheses || !parsed.priseEnCharge) return null

    // Normaliser les probabilités pour que la somme = 100
    if (parsed.hypotheses.length > 0) {
      const total = parsed.hypotheses.reduce((s, h) => s + (h.probabilite ?? 0), 0)
      if (total > 0 && total !== 100) {
        let remaining = 100
        parsed.hypotheses.forEach((h, i) => {
          if (i < parsed.hypotheses.length - 1) {
            h.probabilite = Math.round((h.probabilite / total) * 100)
            remaining -= h.probabilite
          } else {
            h.probabilite = remaining
          }
        })
      }
    }

    // Normaliser la prise en charge : garantir que chaque phase a `points` ET `detail`
    // (points = liste condensée pour l'affichage ; detail = texte concaténé pour PDF/export)
    if (Array.isArray(parsed.priseEnCharge)) {
      parsed.priseEnCharge = parsed.priseEnCharge.map(p => {
        const raw = p as { phase?: string; titre?: string; detail?: string; points?: unknown }
        let points: string[] = []
        if (Array.isArray(raw.points)) {
          points = raw.points.map(x => String(x).trim()).filter(Boolean)
        } else if (typeof raw.detail === 'string' && raw.detail.trim()) {
          // Legacy : découper le paragraphe en bullets
          points = raw.detail
            .split(/(?:\s*[•·]\s*|\.\s+(?=[A-ZÀ-Ÿ])|;\s+|\n+-?\s*)/)
            .map(s => s.trim().replace(/^[-–•·]\s*/, '').replace(/\.$/, ''))
            .filter(s => s.length > 2)
        }
        const detail = points.length > 0 ? points.join(' • ') : (raw.detail ?? '')
        return { phase: raw.phase ?? '', titre: raw.titre ?? '', detail, points }
      })
    }
    return { ...parsed, generatedAt: new Date().toISOString(), alertes: parsed.alertes ?? [] }
  } catch {
    return null
  }
}

// ── Bilan intermédiaire prompt ────────────────────────────────────────────────

export interface BilanIntermediaireEntry {
  type: 'initial' | 'intermediaire'
  num: number
  date: string
  evn: number | null
  bilanData: Record<string, unknown>
  analyseIA?: { titre?: string; description?: string; evolution?: string } | null
  ficheExercice?: { markdown: string } | null
}

export interface SeanceHistoryEntry {
  date: string
  numSeance: string
  eva: string
  observance: string
  evolution: string
  interventions: string[]
  tolerance: string
  toleranceDetail?: string
  prochaineEtape: string[]
  noteSubjective?: string
  analyseIA?: { resume?: string; evolution?: string; focus?: string; conseil?: string } | null
  ficheExercice?: { markdown: string } | null
}

export function buildIntermediairePrompt(
  patient: BilanContext['patient'],
  zone: string,
  bilanType: string,
  intermData: Record<string, unknown>,
  historique: BilanIntermediaireEntry[],
  seances?: SeanceHistoryEntry[],
  therapistProfession?: string,
  closedAntecedents?: string[],
): string {
  const { age, sexe, scrub } = anonymizePatientData(patient)
  const ageLine = age !== null ? `${age} ans` : 'Âge non renseigné'
  const sexeLine = sexe ? ` — Sexe : ${sexe}` : ''

  const tc  = (intermData.troncCommun      as Record<string, unknown>) ?? {}
  const evn = (tc.evn                      as Record<string, unknown>) ?? {}
  const sv  = (tc.suivi                    as Record<string, unknown>) ?? {}
  const fl  = (tc.flags                    as Record<string, unknown>) ?? {}
  const syn = (intermData.synthese         as Record<string, unknown>) ?? {}
  const mod = (intermData.moduleSpecifique as Record<string, unknown>) ?? {}
  const sc  = (mod.scores                  as Record<string, unknown>) ?? {}

  const histStr = historique.map(b => {
    const d    = b.bilanData.douleur     as Record<string, unknown> | undefined
    const tc2  = b.bilanData.troncCommun as Record<string, unknown> | undefined
    const evn2 = tc2?.evn                as Record<string, unknown> | undefined
    const scores2 = b.bilanData.scores as Record<string, unknown> | undefined
    const evnPire  = d?.evnPire  ?? evn2?.pireActuel  ?? b.evn ?? 'N/R'
    const evnMieux = d?.evnMieux ?? evn2?.mieuxActuel ?? 'N/R'
    const evnMoy   = d?.evnMoy   ?? evn2?.moyActuel   ?? 'N/R'
    const lines = [`--- ${b.type === 'initial' ? 'Bilan initial' : 'Bilan intermédiaire'} N°${b.num} (${b.date}) ---`,
      `EVN pire : ${evnPire} | EVN mieux : ${evnMieux} | EVN moyen : ${evnMoy}`]
    if (d?.douleurType) lines.push(`Type douleur : ${d.douleurType} | Évolution : ${d.situation ?? 'N/R'} | Nocturne : ${d.douleurNocturne ?? 'N/R'}`)
    if (scores2 && Object.keys(scores2).length > 0) lines.push(`Scores : ${scrub(JSON.stringify(scores2))}`)
    if (b.analyseIA?.titre) lines.push(`Analyse IA : ${b.analyseIA.titre}${b.analyseIA.evolution ? ` — ${b.analyseIA.evolution}` : ''}`)
    if (b.analyseIA?.description) lines.push(`Description : ${scrub(b.analyseIA.description)}`)
    return lines.join('\n')
  }).join('\n\n')

  // Notes de séance
  let seancesStr = ''
  if (seances && seances.length > 0) {
    const seanceParts = seances.map(s => {
      const lines = [`--- Séance n°${s.numSeance} (${s.date}) ---`,
        `EVA : ${s.eva}/10 | Observance : ${s.observance} | Tolérance : ${s.tolerance}${s.toleranceDetail ? ` (${s.toleranceDetail})` : ''}`]
      if (s.evolution) lines.push(`Évolution : ${scrub(s.evolution)}`)
      if (s.interventions?.length) lines.push(`Interventions : ${s.interventions.join(', ')}`)
      if (s.prochaineEtape?.length) lines.push(`Prochaines étapes : ${s.prochaineEtape.join(', ')}`)
      if (s.noteSubjective) lines.push(`Ressenti patient : ${scrub(s.noteSubjective)}`)
      if (s.analyseIA?.resume) lines.push(`Analyse IA séance : ${scrub(s.analyseIA.resume)}`)
      if (s.analyseIA?.focus) lines.push(`Focus IA : ${scrub(s.analyseIA.focus)}`)
      if (s.analyseIA?.conseil) lines.push(`Conseil IA : ${scrub(s.analyseIA.conseil)}`)
      return lines.join('\n')
    })
    seancesStr = `\n\nNOTES DE SÉANCE ENTRE LES BILANS (${seances.length}) :\n${seanceParts.join('\n\n')}`
  }

  // Fiches d'exercices prescrites
  const allFiches = [
    ...historique.filter(h => h.ficheExercice?.markdown).map(h => ({ date: h.date, md: h.ficheExercice!.markdown })),
    ...(seances ?? []).filter(s => s.ficheExercice?.markdown).map(s => ({ date: s.date, md: s.ficheExercice!.markdown })),
  ]
  let fichesStr = ''
  if (allFiches.length > 0) {
    fichesStr = `\n\nFICHES D'EXERCICES PRESCRITES (${allFiches.length}) :\n` + allFiches.map(f => {
      const md = f.md.length > 400 ? f.md.slice(0, 400) + '... [tronqué]' : f.md
      return `--- Fiche du ${f.date} ---\n${md}`
    }).join('\n\n')
  }

  const scoresStr = Object.keys(sc).length > 0 ? JSON.stringify(sc) : 'Non renseignés'

  const antecedentsPEC = (closedAntecedents && closedAntecedents.length > 0)
    ? `\nANTÉCÉDENTS DE PEC (autres zones, clôturées — contexte uniquement, NE PAS y puiser d'éléments cliniques pour cette zone) :\n${closedAntecedents.map(a => `- ${a}`).join('\n')}\n`
    : ''

  return `Tu es un ${roleTitle(therapistProfession)} expert en musculo-squelettique. Rédige une note diagnostique intermédiaire en tenant compte de l'historique COMPLET du patient pour cette zone : bilans, séances, analyses IA précédentes et exercices prescrits.

PATIENT (anonymisé) : ${ageLine}${sexeLine}
ZONE : ${zone} (type : ${bilanType})${antecedentsPEC}

HISTORIQUE DES BILANS POUR CETTE ZONE :
${histStr}${seancesStr}${fichesStr}

BILAN INTERMÉDIAIRE ACTUEL :
- EVN actuelle — Pire : ${evn.pireActuel ?? 'N/R'} (Initial : ${evn.pireInitial ?? 'N/R'})
- EVN actuelle — Mieux : ${evn.mieuxActuel ?? 'N/R'} (Initial : ${evn.mieuxInitial ?? 'N/R'})
- EVN actuelle — Moy : ${evn.moyActuel ?? 'N/R'} (Initial : ${evn.moyInitial ?? 'N/R'})
- Évolution globale déclarée : ${tc.evolutionGlobale ?? 'N/R'}
- Localisation : ${tc.localisation ?? 'N/R'}
- Tolérance traitement : ${sv.tolerance ?? 'N/R'} | Observance : ${sv.observance ?? 'N/R'}
- Catastrophisme/peur-évitement : ${fl.catastrophisme ?? 'N/R'}
- Synthèse thérapeute : ${scrub(String(syn.bilanEvolution ?? ''))}
- Scores fonctionnels : ${scrub(scoresStr)}

INSTRUCTIONS STRICTES :
1. noteDiagnostique.titre : diagnostic physiothérapeutique court et précis, mis à jour selon l'évolution.
2. noteDiagnostique.evolution : 1 phrase courte décrivant la tendance observée (amélioration / stagnation / régression) avec les données chiffrées EVN.
3. noteDiagnostique.description : 2-3 phrases d'analyse clinique contextualisant l'évolution par rapport aux bilans antérieurs.
4. priseEnChargeAjustee : 4 à 6 points SYNTHÉTIQUES et directement applicables, sans blabla. Chaque point = une action ou un ajustement concret.
5. alertes : uniquement si red flag critique ou évolution défavorable nécessitant réorientation. Sinon tableau vide.
6. Réponds UNIQUEMENT en JSON valide, sans markdown ni texte autour.

{
  "noteDiagnostique": {
    "titre": "Diagnostic mis à jour court et précis",
    "evolution": "Tendance observée en 1 phrase avec données EVN chiffrées",
    "description": "Analyse clinique de l'évolution par rapport aux bilans antérieurs (2-3 phrases)"
  },
  "priseEnChargeAjustee": [
    { "point": "Action ou ajustement concret N°1" },
    { "point": "Action ou ajustement concret N°2" },
    { "point": "Action ou ajustement concret N°3" },
    { "point": "Action ou ajustement concret N°4" }
  ],
  "alertes": []
}`
}

export function parseAnalyseIAIntermediaire(raw: string): AnalyseIAIntermediaire | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as AnalyseIAIntermediaire
    if (!parsed.noteDiagnostique || !parsed.priseEnChargeAjustee) return null
    return { ...parsed, generatedAt: new Date().toISOString(), alertes: parsed.alertes ?? [] }
  } catch {
    return null
  }
}

// ── PDF Report prompt ─────────────────────────────────────────────────────────

export interface PDFReportContext {
  patient: BilanContext['patient']
  zone: string
  bilanType: string
  bilanData: Record<string, unknown>
  notesLibres?: string
  analyseIA?: {
    diagnostic: { titre: string; description: string }
    hypotheses: Array<{ rang: number; titre: string; probabilite: number; justification: string }>
    priseEnCharge: Array<{ phase: string; titre: string; detail: string }>
    alertes: string[]
  } | null
}

export function buildPDFReportPrompt(ctx: PDFReportContext): string {
  const { patient, zone, bilanType, bilanData, notesLibres, analyseIA } = ctx
  const { age, sexe, scrub } = anonymizePatientData(patient)

  const defined = (v: unknown): string | null => {
    if (v === null || v === undefined) return null
    if (typeof v === 'object') return null
    const s = String(v).trim()
    return s !== '' && s !== 'N/R' && s !== 'undefined' ? s : null
  }


  // Render any object's filled fields as lines, with optional label map
  const renderSection = (obj: Record<string, unknown> | undefined, labels?: Record<string, string>): string => {
    if (!obj) return ''
    const lines: string[] = []
    for (const [k, v] of Object.entries(obj)) {
      if (k.endsWith('_detail')) continue
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        // Sub-object (e.g. mobilite, force)
        const subLabel = labels?.[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
        const subLines = renderSection(v as Record<string, unknown>)
        if (subLines) lines.push(`\n  ${subLabel} :`, ...subLines.split('\n').map(l => `  ${l}`))
      } else {
        const display = defined(v)
        if (!display) continue
        const label = labels?.[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
        lines.push(`- ${label} : ${display}`)
        const detail = defined(obj[k + '_detail'])
        if (detail) lines.push(`  → ${detail}`)
      }
    }
    return lines.join('\n')
  }

  const flagsStr = (obj: Record<string, unknown> | undefined): string => {
    if (!obj) return ''
    const lines: string[] = []
    for (const [k, v] of Object.entries(obj)) {
      if (k.endsWith('_detail')) continue
      const display = defined(v)
      if (!display) continue
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
      lines.push(`- ${label} : ${display}`)
      const detail = defined(obj[k + '_detail'])
      if (detail) lines.push(`  → ${detail}`)
    }
    return lines.join('\n')
  }

  // Extract all sections
  const douleur = bilanData.douleur as Record<string, unknown> | undefined
  const redFlags = bilanData.redFlags as Record<string, unknown> | undefined
  const yellowFlags = bilanData.yellowFlags as Record<string, unknown> | undefined
  const blueBlackFlags = bilanData.blueBlackFlags as Record<string, unknown> | undefined
  const examClinique = bilanData.examClinique as Record<string, unknown> | undefined
  const neurologique = bilanData.neurologique as Record<string, unknown> | undefined
  const mecanosensibilite = bilanData.mecanosensibilite as Record<string, unknown> | undefined
  // Les composants de bilan (Lombaire, Hanche, Cheville…) sérialisent les tests sous `testsSpecifiques`.
  // On garde la compat avec l'ancienne clé `tests` par sécurité.
  const tests = (bilanData.testsSpecifiques ?? bilanData.tests) as Record<string, unknown> | undefined
  const scores = bilanData.scores as Record<string, unknown> | undefined
  const contrat = (bilanData.contrat ?? bilanData.contratKine) as Record<string, unknown> | undefined
  const ottawa = bilanData.ottawa as Record<string, unknown> | undefined
  const cinqD3N = bilanData.cinqD3N as Record<string, unknown> | undefined

  const douleurStr = renderSection(douleur, {
    evnPire: 'EVN pire', evnMieux: 'EVN mieux', evnMoy: 'EVN moyen',
    douleurType: 'Type de douleur', nocturne: 'Nocturne', derouillage: 'Dérouillage',
    debutSymptomes: 'Début des symptômes', facteurDeclenchant: 'Facteur déclenchant',
    localisationInitiale: 'Localisation initiale', localisationActuelle: 'Localisation actuelle',
    situation: 'Évolution', douleurNocturne: 'Douleur nocturne', insomniante: 'Insomniante',
    derouillageMatinal: 'Dérouillage matinal', derouillageTemps: 'Durée dérouillage',
    mouvementsEmpirent: 'Mouvements aggravants', mouvementsSoulagent: 'Mouvements soulageants',
  })
  const rfStr = flagsStr(redFlags)
  const yfStr = flagsStr(yellowFlags)
  const bbStr = flagsStr(blueBlackFlags)
  const ecStr = renderSection(examClinique, {
    morfho: 'Morphostatique', oedeme: 'Œdème', mobilite: 'Mobilité articulaire',
    force: 'Force musculaire', notes: 'Notes',
  })
  const neuroStr = renderSection(neurologique)
  const mecanoStr = renderSection(mecanosensibilite, {
    lasegue: 'Lasègue (SLR)', pkb: 'Prone Knee Bend (test de Léri)', slump: 'Slump test',
    ultt1: 'ULTT 1 (nerf médian)', ultt2: 'ULTT 2 (nerf radial)', ultt3: 'ULTT 3 (nerf ulnaire)', ultt4: 'ULTT 4',
  })
  const testsStr = renderSection(tests, {
    lachman: 'Lachman', tiroir: 'Tiroir antérieur/postérieur', lcl: 'Test LCL', lcm: 'Test LCM',
    thessaly: 'Thessaly', renne: 'Renne', noble: 'Noble', vague: 'Vague rotulien', hoffa: 'Hoffa',
    lasegue: 'Lasègue (SLR)', pkb: 'Prone Knee Bend (test de Léri)', slump: 'Slump test',
    faddir: 'FADDIR', faber: 'FABER', thomas: 'Thomas', ober: 'Ober',
    clusterLaslett: 'Cluster de Laslett', clusterSultive: 'Cluster de Sultive',
    extensionRotation: 'Extension-Rotation', proneInstability: 'Prone Instability Test',
    spurling: 'Spurling', distraction: 'Test de distraction', adson: 'Adson', roos: 'Roos (EAST)',
    altd: 'ALTD', raltd: 'RALTD', squeeze: 'Squeeze test', grinding: 'Grinding test',
    ta: 'Test TA', notes: 'Notes',
    heer: 'HEER', abdHeer: 'ABD-HEER',
    talerTiltVarus: 'Talar Tilt Varus', talerTiltValgus: 'Talar Tilt Valgus',
    kleiger: 'Kleiger', fibularTranslation: 'Translation fibulaire',
    impaction: 'Impaction', lfh: 'LFH', molloy: 'Molloy', footLift: 'Foot Lift',
    bessStatique: 'BESS statique', yBalance: 'Y Balance Test',
  })
  const scoresStr = renderSection(scores)
  const contratStr = renderSection(contrat, {
    objectifs: 'Objectifs', objectifsSMART: 'Objectifs SMART',
    autoReedo: 'Auto-rééducation', autoReeducation: 'Auto-rééducation',
    frequenceDuree: 'Fréquence / Durée', conseils: 'Conseils',
  })
  const ottawaStr = renderSection(ottawa)
  const cinqD3NStr = renderSection(cinqD3N)

  // Hypothèses : on passe un classement qualitatif (rang) SANS pourcentages — la section 7
  // de sortie doit être rédigée en langage médical argumenté, pas en statistiques chiffrées.
  const rangLabel = (r: number) => r === 1 ? 'Principale' : r === 2 ? 'Second plan' : r === 3 ? 'Troisième plan' : `Rang ${r}`
  const analyseSection = analyseIA ? `
ANALYSE CLINIQUE (données issues du bilan — à intégrer au diagnostic, SANS rien ajouter, SANS reproduire de pourcentages) :
- Diagnostic retenu : ${analyseIA.diagnostic.titre}
- Justification : ${scrub(analyseIA.diagnostic.description)}
- Hypothèses (classement qualitatif, NE PAS reporter le rang sous forme de %) : ${analyseIA.hypotheses.map(h => `[${rangLabel(h.rang)}] ${h.titre} — ${scrub(h.justification)}`).join(' | ')}
- Plan de traitement : ${analyseIA.priseEnCharge.map(p => `${p.phase} : ${p.titre} — ${scrub(p.detail)}`).join(' | ')}
${analyseIA.alertes.length > 0 ? `- Alertes cliniques : ${analyseIA.alertes.join(', ')}` : ''}` : ''

  const ageLine = age !== null ? `${age} ans` : null
  const profession = defined(patient.profession)
  const sport = defined(patient.sport)
  const antecedents = defined(patient.antecedents)

  const sexeNorm = sexe === 'feminin' ? 'feminin' : sexe === 'masculin' ? 'masculin' : null
  const sexeLine = sexeNorm
    ? `SEXE_PATIENT : ${sexeNorm}  ← accord grammatical OBLIGATOIRE selon cette valeur (voir règle 18).`
    : `SEXE_PATIENT : inconnu  ← défaut masculin singulier, JAMAIS de formulation inclusive.`

  return `CONTEXTE : Bilan de Physiothérapie destiné au médecin prescripteur. Rédige en respectant strictement la structure figée (9 sections numérotées 1→9 dans cet ordre, sans saut — titres VERBATIM ; section 10 Signature rendue par le template) et toutes les règles du system prompt, en particulier : AUCUNE puce dans les sections 3 (Symptomatologie), 5 (Examen clinique) et 6 (Tests spécifiques), déduplication sémantique des synonymes, placement rigoureux des données (palpation → section 5, localisation / facteurs douleur → section 3), terminologie reproduite verbatim.

${sexeLine}

RÈGLES ABSOLUES (rappel) :
1. SÉCURITÉ CLINIQUE — Un réflexe ostéotendineux (achilléen, rotulien, quadricipital, Babinski, etc.) renseigné « négatif » / « non » / « normal » signifie NORMAL ET SYMÉTRIQUE. INTERDICTION d'écrire « aboli », « aréflexie », « hyporéflexie » sauf si l'entrée le dit explicitement.
2. SÉMANTIQUE GLOBALE — « négatif » = RASSURANT pour TOUS les items cliniques (drapeaux rouges/jaunes/bleus/noirs, tests neurodynamiques, tests spécifiques, réflexes). Formulations autorisées : « négatif », « absent », « normal », « rassurant », « non retrouvé ». INTERDITES : « non renseigné », « non documenté », « aboli ».
3. Utilise UNIQUEMENT les informations présentes ci-dessous. Zéro invention, zéro supposition.
4. Les rubriques d'entrée (« Scores Fonctionnels », « Notes Complémentaires », « Mécanosensibilité »…) sont des véhicules de données — IGNORE leurs intitulés et redistribue chaque donnée dans la section 1→9 appropriée selon son contenu clinique.
5. TITRES VERBATIM — Les 9 titres sont imposés mot pour mot : « 1. Profil du patient et contexte », « 2. Anamnèse », « 3. Symptomatologie douloureuse », « 4. Drapeaux cliniques », « 5. Examen clinique », « 6. Tests spécifiques », « 7. Synthèse diagnostique », « 8. Projet thérapeutique », « 9. Conclusion ». Aucune variation, aucun enrichissement, aucune reformulation.
6. Sections 1 à 6 : si aucune donnée, écris le titre puis « Non renseigné lors de ce bilan. ». Sections 7, 8 et 9 : JAMAIS « Non renseigné » — elles sont GÉNÉRÉES par raisonnement clinique à partir des sections 1–6.
7. Un test « non » / « négatif » (hors réflexes, cf. règle 1) N'EST PAS une donnée absente — c'est un résultat clinique à inclure, rédigé en prose (règle B), jamais en puces.
8. Terminologie REPRODUITE VERBATIM : noms de tests, articulations, échelles, acronymes — jamais de variation inventée (« temporo-auriculaire » reste « temporo-auriculaire », jamais « temporo-acromiale »).
9. Section 1 = CADRAGE PUR (âge, zone, motif) — ATCD/traitements/histoire de la plainte appartiennent à la section 2. Section 9 = CONCLUSION COURTE (2-3 phrases) — pas de liste de vigilance ni de red flags.
10. UNE INFO = UNE PLACE DÉTAILLÉE. La section 7 reprend les éléments en synthèse articulée au raisonnement, sans redétailler ce qui est déjà exposé en sections 2–6.
11. Pas de surtitre markdown (\`#\` ou \`##\`). Ta sortie commence directement par « ### 1. Profil du patient et contexte ».
12. N'utilise JAMAIS le nom ni le prénom du patient.
13. PAS DE POURCENTAGES — aucune hypothèse diagnostique n'est chiffrée en % ni en probabilité numérique. Langage qualitatif uniquement : « hypothèse principale », « différentiel évoqué et écarté », « compatible avec », « évocateur de ».
14. ACRONYMES — n'invente JAMAIS l'expansion d'un acronyme. Référentiel Knode autorisé : Test TA = Test d'Adam ; SLR = Straight Leg Raise (Lasègue) ; PKB = Prone Knee Bend (test de Léri) ; HAD = Hospital Anxiety and Depression scale ; EVN = Échelle Visuelle Numérique ; EVA = Échelle Visuelle Analogique ; RAS = Rien À Signaler. Tout autre acronyme → conservé verbatim sans expansion.
15. ANCRAGE FACTUEL STRICT — pas de contexte socio-professionnel, pas de segment vertébral chiffré (L4-L5, T12-L2, C5-C6…), pas de facteur contributif inventé qui ne figure pas explicitement dans les données.
16. PROJET THÉRAPEUTIQUE (section 8) — structure par 3 à 5 axes (contrôle antalgique, mobilité, renforcement, éducation, reprise activités), techniques introduites par formulations conditionnelles (« pourront être mobilisés », « selon l'évolution », « en fonction de la réponse clinique »). Pas de jalons datés.
17. PAS DE SÉPARATEURS HORIZONTAUX (\`---\`, \`***\`, \`___\`) — ni entre sections, ni à l'intérieur.
18. ACCORD GRAMMATICAL SELON LE SEXE — Utilise la valeur SEXE_PATIENT en tête de prompt. Si \`feminin\` : « La patiente », « âgée », « née », « Elle », « active », « sportive », « kiné­sithérapeute traitante ». Si \`masculin\` : « Le patient », « âgé », « né », « Il », « actif », « sportif », « kinésithérapeute traitant ». INTERDICTIONS ABSOLUES — aucune formulation inclusive ni neutre tolérée : \`(e)\`, \`·e\`, \`·es\`, \`·ée\`, \`/\` inclusive (\`Le/la\`, \`il/elle\`, \`né(e)\`), parenthèses d'ajout féminin, circonlocutions (\`cette personne\`, \`l'intéressé·e\`, \`le/la patient·e\`). JAMAIS inférer le sexe depuis le prénom — seule la valeur SEXE_PATIENT fait foi. Si \`inconnu\` (cas de repli uniquement) : rédige au masculin singulier par défaut, toujours sans inclusif.

DONNÉES DU BILAN (source unique — ne rien ajouter) :

PATIENT : ${[ageLine, sexe ? `Sexe : ${sexe}` : null, profession ? `Profession : ${profession}` : null, sport ? `Sport : ${sport}` : null, antecedents ? `Antécédents : ${antecedents}` : null].filter(Boolean).join(' | ')}
Zone traitée : ${zone} — Type bilan : ${bilanType}
${douleurStr ? `\nDOULEUR :\n${douleurStr}` : ''}
${rfStr ? `\nRED FLAGS :\n${rfStr}` : ''}
${cinqD3NStr ? `\n5D 3N :\n${cinqD3NStr}` : ''}
${ottawaStr ? `\nCRITÈRES D'OTTAWA :\n${ottawaStr}` : ''}
${yfStr ? `\nYELLOW FLAGS :\n${yfStr}` : ''}
${bbStr ? `\nBLUE / BLACK FLAGS :\n${bbStr}` : ''}
${ecStr ? `\nEXAMEN CLINIQUE :\n${ecStr}` : ''}
${neuroStr ? `\nEXAMEN NEUROLOGIQUE :\n${neuroStr}` : ''}
${mecanoStr ? `\nMÉCANOSENSIBILITÉ :\n${mecanoStr}` : ''}
${testsStr ? `\nTESTS SPÉCIFIQUES :\n${testsStr}` : ''}
${scoresStr ? `\nSCORES FONCTIONNELS :\n${scoresStr}` : ''}
${contratStr ? `\nCONTRAT THÉRAPEUTIQUE :\n${contratStr}` : ''}
${notesLibres ? `\nNOTES DU THÉRAPEUTE :\n${scrub(notesLibres)}` : ''}
${analyseSection}`
}
