import type { AnalyseIA, EvolutionIA } from '../types'

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
}

// ── Anonymization ─────────────────────────────────────────────────────────────

function computeAge(dateNaissance: string): number | null {
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

  return `Tu es un physiothérapeute expert en musculo-squelettique. Analyse ce bilan clinique et fournis une évaluation précise et personnalisée.

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

INSTRUCTIONS STRICTES :
1. Les 3 hypothèses doivent avoir des probabilités RÉELLES calculées à partir des données cliniques (EVN, tests, scores, flags). Les probabilités ne doivent PAS être fixes (pas de 75/45/20 par défaut). Elles doivent refléter la réalité clinique du cas. La somme des 3 probabilités DOIT être exactement égale à 100 (ex: 65+25+10=100, ou 50+30+20=100).
2. La prise en charge doit être SPÉCIFIQUE à ce patient : cite les techniques précises (ex: mobilisations passives tibio-fémorales, renforcement quadriceps en chaîne fermée, dry needling, TENS…), les exercices adaptés au niveau et à la profession du patient, la durée et fréquence réalistes.
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
    { "phase": "Phase aiguë (J1–J7)", "titre": "Titre spécifique", "detail": "Techniques précises, exercices nommés, fréquence, conseils posturaux adaptés au profil" },
    { "phase": "Phase subaiguë (J8–J21)", "titre": "Titre spécifique", "detail": "Techniques précises, progression des exercices, travail fonctionnel ciblé" },
    { "phase": "Phase fonctionnelle (J22–J42)", "titre": "Titre spécifique", "detail": "Réathlétisation, retour activité, prévention rechute adaptée à la profession et sport du patient" }
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
  const { patient, zone, bilanData } = ctx
  const { age, sexe, scrub } = anonymizePatientData(patient)

  const douleur = bilanData.douleur as Record<string, unknown> | undefined
  const evn = douleur?.evnMoy ?? douleur?.evnPire ?? 'N/R'
  const profession = scrub(patient.profession || 'Non renseignée')
  const sport = scrub(patient.sport || 'Non renseignée')
  const antecedents = scrub(patient.antecedents || 'Non renseignés')
  const scrubbedNotes = scrub(notesSeance)

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
</notes_seance_actuelle>`
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

  return `Tu es un physiothérapeute expert chargé de rédiger un rapport d'évolution clinique complet pour un suivi de patient sur plusieurs bilans.

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

  const douleur = bilanData.douleur as Record<string, unknown> | undefined
  const redFlags = bilanData.redFlags as Record<string, unknown> | undefined
  const yellowFlags = bilanData.yellowFlags as Record<string, unknown> | undefined
  const scores = bilanData.scores as Record<string, unknown> | undefined
  const tests = bilanData.tests as Record<string, unknown> | undefined

  // Only include fields that have a real value — never send undefined/null/empty to the AI
  const defined = (v: unknown): string | null => {
    if (v === null || v === undefined) return null
    const s = String(v).trim()
    return s !== '' && s !== 'N/R' && s !== 'undefined' ? s : null
  }
  const line = (label: string, v: unknown) => { const s = defined(v); return s ? `- ${label} : ${s}` : null }
  const flagsPositifs = (obj: Record<string, unknown> | undefined) =>
    obj ? Object.entries(obj).filter(([, v]) => v === 'oui' || v === true).map(([k]) => k).join(', ') || null : null

  const douleurLines = [
    line('EVN pire', douleur?.evnPire), line('EVN mieux', douleur?.evnMieux), line('EVN moyen', douleur?.evnMoy),
    line('Type de douleur', douleur?.douleurType), line('Évolution', douleur?.situation),
    line('Douleur nocturne', douleur?.douleurNocturne), line('Dérouillage matinal', douleur?.derouillageMatinal),
    line('Début des symptômes', douleur?.debutSymptomes), line('Facteur déclenchant', douleur?.facteurDeclenchant),
    line('Mouvements qui empirent', douleur?.mouvementsEmpirent), line('Mouvements qui soulagent', douleur?.mouvementsSoulagent),
  ].filter(Boolean).join('\n')

  const rfStr = flagsPositifs(redFlags)
  const yfStr = flagsPositifs(yellowFlags)
  const testsStr = tests && Object.keys(tests).length > 0 ? scrub(JSON.stringify(tests, null, 0)) : null
  const scoresStr = scores && Object.keys(scores).length > 0 ? scrub(JSON.stringify(scores, null, 0)) : null

  const analyseSection = analyseIA ? `
ANALYSE CLINIQUE (données issues du bilan — à intégrer au diagnostic, SANS rien ajouter) :
- Diagnostic retenu : ${analyseIA.diagnostic.titre}
- Justification : ${scrub(analyseIA.diagnostic.description)}
- Hypothèses : ${analyseIA.hypotheses.map(h => `H${h.rang} (${h.probabilite}%) ${h.titre} — ${scrub(h.justification)}`).join(' | ')}
- Plan de traitement : ${analyseIA.priseEnCharge.map(p => `${p.phase} : ${p.titre} — ${scrub(p.detail)}`).join(' | ')}
${analyseIA.alertes.length > 0 ? `- Alertes cliniques : ${analyseIA.alertes.join(', ')}` : ''}` : ''

  const ageLine = age !== null ? `${age} ans` : null
  const sexeLine = sexe ?? null
  const profession = defined(patient.profession)
  const sport = defined(patient.sport)
  const antecedents = defined(patient.antecedents)

  return `RÈGLES ABSOLUES :
1. Tu ne peux utiliser QUE les informations présentes dans ce document. Zéro invention, zéro supposition.
2. Si une donnée est absente (non renseignée), tu NE la mentionnes PAS dans le rapport. Tu n'écris pas "non évalué" ni "à évaluer" — tu omets simplement la ligne.
3. Tu n'inventes aucun résultat d'inspection, de palpation, de bilan neurologique ou de test qui n'est pas explicitement dans les données.
4. Tu n'utilises pas le nom ni le prénom du patient (données confidentielles non transmises).
5. Le rapport doit être fluide et professionnel, mais rigoureusement fidèle aux données.

DONNÉES DU BILAN (source unique — ne rien ajouter) :

PATIENT : ${[ageLine, sexeLine ? `Sexe : ${sexeLine}` : null, profession ? `Profession : ${profession}` : null, sport ? `Sport : ${sport}` : null, antecedents ? `Antécédents : ${antecedents}` : null].filter(Boolean).join(' | ')}
Zone traitée : ${zone} — Type bilan : ${bilanType}
${douleurLines ? `\nDOULEUR :\n${douleurLines}` : ''}
${rfStr ? `\nRED FLAGS positifs : ${rfStr}` : ''}
${yfStr ? `\nYELLOW FLAGS positifs : ${yfStr}` : ''}
${testsStr ? `\nTESTS CLINIQUES : ${testsStr}` : ''}
${scoresStr ? `\nSCORES : ${scoresStr}` : ''}
${notesLibres ? `\nNOTES DU THÉRAPEUTE (texte libre, source primaire) :\n${scrub(notesLibres)}` : ''}
${analyseSection}`
}
