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
  const tests = bilanData.tests as Record<string, unknown> | undefined

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

  const role = roleTitle(ctx.therapistProfession)

  return `Tu es un ${role} expert en musculo-squelettique. Analyse ce bilan clinique et fournis une évaluation précise et personnalisée.

DONNÉES DU BILAN (données anonymisées) :
- Patient : ${ageLine}${sexeLine}
- Profession : ${profession}
- Activité sportive : ${sport}
- Antécédents : ${antecedents}
- Zone : ${zone} (type bilan : ${bilanType})

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

  return `<notes_seance_actuelle>
Zone traitée : ${zone}
Patient : ${age !== null ? `${age} ans` : 'Âge N/R'}${sexe ? ` — Sexe : ${sexe}` : ''}
EVN actuel : ${evn} / 10
Profession : ${profession}
Activité sportive : ${sport}
Antécédents : ${antecedents}
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

export interface EvolutionContext {
  patient: BilanContext['patient']
  bilans: EvolutionBilanEntry[]
  therapistProfession?: string
}

export function buildEvolutionPrompt(ctx: EvolutionContext): string {
  const { patient, bilans } = ctx
  const { age, sexe, scrub } = anonymizePatientData(patient)

  const ageLine = age !== null ? `${age} ans` : 'Âge non renseigné'
  const sexeLine = sexe ? ` — Sexe : ${sexe}` : ''
  const profession = scrub(patient.profession || 'Non renseignée')
  const sport = scrub(patient.sport || 'Non renseignée')
  const antecedents = scrub(patient.antecedents || 'Non renseignés')

  const flagsPositifs = (obj: Record<string, unknown> | undefined) =>
    obj ? Object.entries(obj).filter(([, v]) => v === 'oui' || v === true).map(([k]) => k).join(', ') || 'Aucun' : 'Aucun'

  const bilansStr = bilans.map(b => {
    const d = b.bilanData.douleur as Record<string, unknown> | undefined
    const rf = b.bilanData.redFlags as Record<string, unknown> | undefined
    const yf = b.bilanData.yellowFlags as Record<string, unknown> | undefined
    const sc = b.bilanData.scores as Record<string, unknown> | undefined
    const notes = scrub(JSON.stringify({ douleur: d, scores: sc }, null, 0))
    return `--- Bilan N°${b.num} (${b.date}) — Zone : ${b.zone} ---
EVN : ${b.evn ?? 'N/R'}
Type douleur : ${d?.douleurType ?? 'N/R'} | Évolution : ${d?.situation ?? 'N/R'} | Nocturne : ${d?.douleurNocturne ?? 'N/R'}
Red flags positifs : ${flagsPositifs(rf)}
Yellow flags positifs : ${flagsPositifs(yf)}
Scores : ${sc ? scrub(JSON.stringify(sc)) : 'N/R'}
Données brutes : ${notes}`
  }).join('\n\n')

  return `Tu es un ${roleTitle(ctx.therapistProfession)} expert chargé de rédiger un rapport d'évolution clinique complet pour un suivi de patient sur plusieurs bilans.

PATIENT (données anonymisées — aucun nom ni identifiant) :
- ${ageLine}${sexeLine}
- Profession : ${profession}
- Activité sportive : ${sport}
- Antécédents : ${antecedents}
- Nombre de bilans : ${bilans.length}

HISTORIQUE DES BILANS :
${bilansStr}

INSTRUCTIONS :
Rédige un rapport d'évolution complet en français médical professionnel.
Réponds UNIQUEMENT en JSON valide, sans markdown ni texte autour, selon ce schéma exact :
{
  "resume": "Résumé clinique global de l'évolution en 3-4 phrases",
  "tendance": "amelioration | stationnaire | regression | mixte",
  "progression": [
    { "bilanNum": 1, "date": "dd/mm/yyyy", "evn": 8, "commentaire": "Observation clinique courte" }
  ],
  "pointsForts": ["Point positif 1", "Point positif 2"],
  "pointsVigilance": ["Point de vigilance 1"],
  "recommandations": [
    { "titre": "Titre de la recommandation", "detail": "Description détaillée" }
  ],
  "conclusion": "Conclusion clinique et orientation thérapeutique pour la suite de la prise en charge"
}`
}

export function parseEvolutionIA(raw: string): EvolutionIA | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as EvolutionIA
    if (!parsed.resume || !parsed.tendance || !parsed.progression) return null
    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
      pointsForts: parsed.pointsForts ?? [],
      pointsVigilance: parsed.pointsVigilance ?? [],
      recommandations: parsed.recommandations ?? [],
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

  return `Tu es un ${roleTitle(therapistProfession)} expert en musculo-squelettique. Rédige une note diagnostique intermédiaire en tenant compte de l'historique COMPLET du patient pour cette zone : bilans, séances, analyses IA précédentes et exercices prescrits.

PATIENT (anonymisé) : ${ageLine}${sexeLine}
ZONE : ${zone} (type : ${bilanType})

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
  const tests = bilanData.tests as Record<string, unknown> | undefined
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

  const analyseSection = analyseIA ? `
ANALYSE CLINIQUE (données issues du bilan — à intégrer au diagnostic, SANS rien ajouter) :
- Diagnostic retenu : ${analyseIA.diagnostic.titre}
- Justification : ${scrub(analyseIA.diagnostic.description)}
- Hypothèses : ${analyseIA.hypotheses.map(h => `H${h.rang} (${h.probabilite}%) ${h.titre} — ${scrub(h.justification)}`).join(' | ')}
- Plan de traitement : ${analyseIA.priseEnCharge.map(p => `${p.phase} : ${p.titre} — ${scrub(p.detail)}`).join(' | ')}
${analyseIA.alertes.length > 0 ? `- Alertes cliniques : ${analyseIA.alertes.join(', ')}` : ''}` : ''

  const ageLine = age !== null ? `${age} ans` : null
  const profession = defined(patient.profession)
  const sport = defined(patient.sport)
  const antecedents = defined(patient.antecedents)

  return `RÈGLES ABSOLUES :
1. Tu ne peux utiliser QUE les informations présentes dans ce document. Zéro invention, zéro supposition.
2. Si une donnée est absente (champ vide, non fourni), tu NE la mentionnes PAS.
3. Un test "non" ou "négatif" N'EST PAS absent — c'est un résultat clinique à inclure obligatoirement.
4. Tu n'inventes aucun résultat qui n'est pas explicitement dans les données.
5. Tu n'utilises pas le nom ni le prénom du patient.
6. Le rapport doit être fluide et professionnel, rigoureusement fidèle aux données.

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
