import type {
  BilanRecord,
  BilanIntermediaireRecord,
  NoteSeanceRecord,
  LetterFormData,
} from '../types'
import { computeAge } from './clinicalPrompt'

// ─────────────────────────────────────────────────────────────────────────────
//  Confection IA d'UNE zone d'un courrier (≠ courrier complet).
//
//  Modèle : Haiku 4.5 — appel léger (~800 tokens entrée / 200 tokens sortie),
//  rendu en 1-2 secondes. Le prompt est scoped à UN paragraphe / UN champ et
//  hérite des règles cliniques (pas d'invention, pas de placeholder visible,
//  accord grammatical strict, terminologie verbatim, ton confraternel).
//
//  Pseudonymisation gérée en amont par l'appelant (LetterGenerator) :
//  les champs identifiants sont remplacés par __PATIENT_PRENOM__, etc.
// ─────────────────────────────────────────────────────────────────────────────

export type ConfectableField =
  | 'resumeBilanInitial'
  | 'traitement'
  | 'traitementsEssayes'
  | 'resultats'
  | 'recommandations'
  | 'raisonArret'
  | 'etatActuel'
  | 'resumePec'
  | 'raisonOrientation'
  | 'justification'
  | 'antecedents'
  | 'evolution'
  | 'pointsPositifs'
  | 'difficultes'
  | 'suite'
  | 'constat'
  | 'scoresFonctionnels'
  | 'orientation'
  | 'avisPersonnel'

const isFilled = (v: string | undefined | null): v is string =>
  typeof v === 'string' && v.trim() !== '' && !/^\(.+\)$/.test(v.trim())

const fmt = (label: string, v: string | undefined | null): string =>
  isFilled(v) ? `- ${label} : ${v.trim()}` : ''

const join = (parts: string[]): string => parts.filter(p => p && p.trim() !== '').join('\n')

const parseFrDate = (s: string | undefined): number => {
  if (!s) return 0
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : 0
}

// ─────────────────────────────────────────────────────────────────────────────
//  Dossier patient compact — sert de source factuelle pour toute confection.
//  Hiérarchisé : identité → bilans initiaux → intermédiaires → notes séance.
//  Trie chronologique. Garde les chiffres clés (EVN, scores) tels quels.
// ─────────────────────────────────────────────────────────────────────────────

export function buildPatientDossier(
  bilans: BilanRecord[],
  intermediaires: BilanIntermediaireRecord[],
  notes: NoteSeanceRecord[],
): string {
  const sortedBilans = [...bilans].sort((a, b) => parseFrDate(a.dateBilan) - parseFrDate(b.dateBilan))
  const sortedInterm = [...intermediaires].sort((a, b) => parseFrDate(a.dateBilan) - parseFrDate(b.dateBilan))
  const sortedNotes = [...notes].sort((a, b) => parseFrDate(a.dateSeance) - parseFrDate(b.dateSeance))

  const first = sortedBilans[0]
  const lines: string[] = []

  // ── Identité (anonymisée — sans nom/prénom) ──
  if (first) {
    const age = first.dateNaissance ? computeAge(first.dateNaissance) : null
    lines.push('IDENTITÉ :')
    if (age) lines.push(`- Âge : ${age} ans`)
    if (first.zone) lines.push(`- Zone : ${first.zone}`)
    if (first.pathologie) lines.push(`- Pathologie : ${first.pathologie}`)
    lines.push('')
  }

  // ── Bilans initiaux ──
  if (sortedBilans.length > 0) {
    lines.push(`BILANS INITIAUX (${sortedBilans.length}) :`)
    for (const b of sortedBilans) {
      const evn = typeof b.evn === 'number' ? `EVN ${b.evn}/10` : ''
      const head = [`- ${b.dateBilan ?? '?'}`, b.zone, b.pathologie, evn].filter(Boolean).join(' • ')
      lines.push(head)
      if (b.notes && b.notes.trim()) lines.push(`  notes : ${b.notes.trim().slice(0, 400)}`)
    }
    lines.push('')
  }

  // ── Bilans intermédiaires (résume l'évolution issue de l'analyse IA) ──
  if (sortedInterm.length > 0) {
    lines.push(`BILANS INTERMÉDIAIRES (${sortedInterm.length}) :`)
    for (const i of sortedInterm) {
      lines.push(`- ${i.dateBilan ?? '?'}`)
      const evol = i.analyseIA?.noteDiagnostique?.evolution
      if (evol) lines.push(`  évolution : ${evol.slice(0, 400)}`)
    }
    lines.push('')
  }

  // ── Notes de séance — synthèse condensée ──
  if (sortedNotes.length > 0) {
    const interventions = new Set<string>()
    let firstEva: string | null = null
    let lastEva: string | null = null
    let lastEvolution = ''
    let lastTolerance = ''
    let lastDosage = ''
    for (const n of sortedNotes) {
      for (const it of (n.data?.interventions ?? [])) {
        if (it && it.trim()) interventions.add(it.trim())
      }
      const eva = n.data?.eva
      if (eva && firstEva === null) firstEva = eva
      if (eva) lastEva = eva
      if (n.data?.evolution && n.data.evolution.trim()) lastEvolution = n.data.evolution.trim()
      if (n.data?.tolerance && n.data.tolerance.trim()) lastTolerance = n.data.tolerance.trim()
      if (n.data?.detailDosage && n.data.detailDosage.trim()) lastDosage = n.data.detailDosage.trim()
    }
    lines.push(`NOTES DE SÉANCE (${sortedNotes.length} séances) :`)
    if (interventions.size > 0) {
      const list = Array.from(interventions).slice(0, 20).join(', ')
      lines.push(`- Interventions cumulées : ${list}`)
    }
    if (firstEva && lastEva) lines.push(`- EVN : ${firstEva}/10 (1ère séance) → ${lastEva}/10 (dernière)`)
    else if (lastEva) lines.push(`- EVN dernière séance : ${lastEva}/10`)
    if (lastDosage) lines.push(`- Dosage récent : ${lastDosage.slice(0, 200)}`)
    if (lastTolerance) lines.push(`- Tolérance : ${lastTolerance.slice(0, 200)}`)
    if (lastEvolution) lines.push(`- Évolution récente (texte praticien) : ${lastEvolution.slice(0, 600)}`)
    lines.push('')
  }

  if (lines.length === 0) {
    lines.push('(Aucun bilan ni note de séance enregistrés à ce jour.)')
  }

  return lines.join('\n').trim()
}

// ─────────────────────────────────────────────────────────────────────────────
//  System prompt compact — règles dures héritées de letterPrompts mais scoped
//  au rendu d'UN paragraphe. Volontairement bref pour économiser des tokens
//  sur chaque appel Haiku.
// ─────────────────────────────────────────────────────────────────────────────

function zoneSystemPrompt(profession: string): string {
  const isPhysio = /physio/i.test(profession)
  const titre = isPhysio ? 'physiothérapeute' : 'kinésithérapeute'
  const region = isPhysio ? 'Suisse / Belgique' : 'France'
  return `Tu es un ${titre} francophone expérimenté (${region}). Tu rédiges UNIQUEMENT le paragraphe demandé pour un courrier professionnel — pas le courrier entier, pas de salutation, pas de formule de politesse, pas de signature.

RÈGLES ABSOLUES :
1. ANCRAGE FACTUEL — N'utilise QUE les données fournies (DOSSIER PATIENT + AUTRES CHAMPS). Aucune invention, aucune extrapolation, aucun chiffre fabriqué.
2. JAMAIS de phrase d'absence — pas de « (à préciser) », « non renseigné », « non documenté », « absence de scores », etc. Si une donnée manque, la phrase qui la portait est SUPPRIMÉE.
3. AUCUNE STIGMATISATION DU CLINICIEN — pas de « scores non réalisés », pas de recommandations méthodologiques au destinataire (« objectiver », « documenter »).
4. ACCORD GRAMMATICAL selon SEXE_PATIENT (transmis dans le prompt utilisateur). Féminin : « la patiente », « adressée », « Elle ». Masculin : « le patient », « adressé », « Il ». Inconnu = masculin singulier. INTERDIT : « (e) », « ·e », « né(e) », « il/elle ».
5. DATES JJ/MM/AAAA. Terminologie verbatim (Lasègue, FADDIR, EVN, EVA…). Pas de pourcentage diagnostique.
6. PROSE NARRATIVE — phrases articulées, pas de listes à puces, pas de markdown, pas de gras, pas de titres, pas de séparateur.
7. TON CONFRATERNEL — concis, factuel, sans pathos, sans phrase de comblement (« comme convenu »).
8. PLACEHOLDERS DE PSEUDONYMISATION — \`__PATIENT_PRENOM__\`, \`__PATIENT_NOM__\`, \`__DESTINATAIRE_NOM__\`, \`__PRO_RECOMMANDE_NOM__\` se reproduisent EXACTEMENT, sans modification.
9. SORTIE PROPRE — uniquement le paragraphe brut demandé, sans préambule (« Voici… »), sans guillemets enveloppants, sans note hors-texte.`
}

// ─────────────────────────────────────────────────────────────────────────────
//  Header utilisateur — sexe + identité contextuelle (sans répéter les autres
//  zones du formulaire pour rester léger).
// ─────────────────────────────────────────────────────────────────────────────

const sexeFromCivilite = (civ: string | undefined): 'feminin' | 'masculin' | null => {
  if (!civ) return null
  const c = civ.trim().toLowerCase()
  if (c === 'mme' || c === 'mme.' || c === 'madame') return 'feminin'
  if (c === 'm.' || c === 'm' || c === 'monsieur') return 'masculin'
  return null
}

function userHeader(form: LetterFormData): string {
  const sexe = sexeFromCivilite(form.civilitePatient)
  const sexeLine = sexe
    ? `SEXE_PATIENT : ${sexe} (accord obligatoire)`
    : `SEXE_PATIENT : inconnu (masculin singulier par défaut)`

  return join([
    sexeLine,
    fmt('Indication / motif de PEC', form.indication),
    fmt('Date de début de PEC', form.dateDebutPec),
    fmt('Fréquence', form.frequence),
    fmt('Nombre de séances', form.nbSeances),
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
//  Spécifications par zone — instruction + budget + champs de form pertinents
//  pour le contexte. Garde les instructions PUNCHY (1-3 phrases) — les règles
//  dures sont déjà dans le system prompt.
// ─────────────────────────────────────────────────────────────────────────────

interface ZoneSpec {
  label: string
  range: string
  instruction: string
  // Champs du form à inclure en contexte (en plus du dossier patient)
  contextFields?: Array<keyof LetterFormData>
}

const ZONE_SPECS: Record<ConfectableField, ZoneSpec> = {
  resumeBilanInitial: {
    label: 'Résumé du bilan initial',
    range: '3 à 5 phrases (~70 mots)',
    instruction: `Synthèse condensée du tableau d'entrée : motif d'adressage, principales observations cliniques (mobilité, douleur EVN initiale si renseignée, déficits fonctionnels), tests positifs notables. Pas de liste, prose articulée.`,
  },
  traitement: {
    label: 'Traitement effectué',
    range: '3 à 5 phrases (~70 mots)',
    instruction: `Décris les axes thérapeutiques mis en place — techniques, exercices, modalités — en citant verbatim ce qui figure dans les notes de séance. Mentionne le nombre de séances si disponible. Pas d'énumération exhaustive : regrouper par axe (manuel / actif / éducation).`,
  },
  traitementsEssayes: {
    label: 'Modalités de traitement essayées',
    range: '3 à 4 phrases (~60 mots)',
    instruction: `Liste articulée des techniques et modalités essayées sans succès suffisant — formulation neutre, factuelle. Regroupe par catégorie (manuel, actif, éducatif). Pas de jugement sur l'inefficacité, simple constat.`,
  },
  resultats: {
    label: 'Résultats / état actuel',
    range: '2 à 4 phrases (~60 mots)',
    instruction: `Restitue les résultats objectifs et fonctionnels — gain articulaire, EVN initiale → EVN finale (uniquement si LES DEUX valeurs sont disponibles), retour à l'autonomie ou aux activités. Ton factuel, sans emphase.`,
  },
  recommandations: {
    label: 'Recommandations au patient',
    range: '1 à 3 phrases (~50 mots)',
    instruction: `Conseils concrets transmis au patient (auto-rééducation, hygiène de vie, surveillance, signaux d'alerte de récidive). UNIQUEMENT cliniques, jamais méthodologiques au destinataire.`,
  },
  raisonArret: {
    label: "Raison de l'arrêt anticipé",
    range: '1 à 3 phrases (~50 mots)',
    instruction: `Explique factuellement la raison de l'arrêt avant terme : objectifs atteints, autonomie acquise, contrainte logistique, plateau d'évolution, etc. Sans pathos, sans défaitisme.`,
  },
  etatActuel: {
    label: 'État actuel du patient',
    range: '2 à 3 phrases (~50 mots)',
    instruction: `Tableau clinique au moment présent — évolution depuis le bilan initial, niveau fonctionnel, symptômes résiduels. Ancré aux dernières notes de séance et bilans intermédiaires.`,
  },
  resumePec: {
    label: 'Résumé de la PEC kiné',
    range: '3 à 5 phrases (~80 mots)',
    instruction: `Synthèse condensée du parcours : indication, ce qui a été fait, résultats obtenus, limites rencontrées. C'est ce paragraphe qui justifie la demande qui suit (orientation, imagerie, prescription) — il doit être autosuffisant.`,
    contextFields: ['typePro', 'natureDemande', 'typeImagerie'],
  },
  raisonOrientation: {
    label: "Raison de l'orientation",
    range: '2 à 4 phrases (~60 mots)',
    instruction: `Justification clinique du recours à un autre professionnel — composante (psychologique, douleur chronique, problème non musculo-squelettique pur, etc.) qui dépasse le champ kinésithérapique. Pas de jugement.`,
    contextFields: ['typePro'],
  },
  justification: {
    label: 'Justification clinique (imagerie / prescription)',
    range: '2 à 4 phrases (~60 mots)',
    instruction: `Pourquoi cette demande est cliniquement nécessaire : récidives, absence d'imagerie préalable, drapeau rouge non levé, plateau malgré PEC adaptée, etc. Argumentation factuelle ancrée au dossier.`,
    contextFields: ['typeImagerie', 'zoneAnatomique', 'natureDemande'],
  },
  antecedents: {
    label: 'Antécédents pertinents',
    range: '1 à 3 phrases (~50 mots)',
    instruction: `Antécédents médicaux et chirurgicaux pertinents au regard de la demande (imagerie / orientation). Si aucun antécédent dans le dossier, produit un paragraphe court mentionnant l'absence d'antécédent notable contributif (sans dire « non renseigné »).`,
  },
  evolution: {
    label: 'Évolution constatée',
    range: '2 à 4 phrases (~60 mots)',
    instruction: `Trajectoire entre l'entrée et le moment du courrier : EVN, fonction, autonomie. Cite les chiffres uniquement si présents. Souligne le sens (amélioration, plateau, dégradation).`,
  },
  pointsPositifs: {
    label: 'Points positifs',
    range: '1 à 3 phrases (~40 mots)',
    instruction: `Les acquis concrets de la PEC — ce qui marche bien, ce qui a été stabilisé. Ton factuel.`,
  },
  difficultes: {
    label: 'Difficultés / points en cours',
    range: '1 à 3 phrases (~40 mots)',
    instruction: `Ce qui reste à travailler ou les obstacles rencontrés (compliance, douleur résiduelle, peur du mouvement, etc.). Sans jugement sur le patient.`,
  },
  suite: {
    label: 'Suite proposée',
    range: '1 à 2 phrases (~30 mots)',
    instruction: `Plan court : poursuite, espacement, autonomie complète, reprise contact si rechute. Ne propose JAMAIS de protocole nouveau.`,
  },
  constat: {
    label: 'Constat actuel (échec PEC)',
    range: '2 à 3 phrases (~50 mots)',
    instruction: `Constat factuel : pas d'amélioration / dégradation / stagnation, en s'appuyant sur EVN initiale → EVN actuelle si disponible et sur les éléments fonctionnels. Sans dramatiser.`,
  },
  scoresFonctionnels: {
    label: 'Scores fonctionnels',
    range: '1 à 3 phrases (~40 mots)',
    instruction: `Restitue les scores réellement présents dans le dossier (EIFEL, DN4, HOOS, etc.) avec leur date. Si aucun score, retourne une chaîne vide — ne pas inventer ni écrire « non renseigné ».`,
  },
  orientation: {
    label: 'Orientation proposée',
    range: '1 à 2 phrases (~40 mots)',
    instruction: `Vers quel professionnel ou structure proposer la réorientation, sans nommer un confrère sauf si présent dans les autres champs.`,
  },
  avisPersonnel: {
    label: 'Avis personnel',
    range: '1 à 3 phrases (~50 mots)',
    instruction: `Lecture clinique du praticien : pourquoi à son sens cette PEC ne suffit plus dans le cadre kinésithérapique seul. Ton confraternel, sobre.`,
  },
}

export function getZoneLabel(field: ConfectableField): string {
  return ZONE_SPECS[field].label
}

// ─────────────────────────────────────────────────────────────────────────────
//  buildZonePrompt — produit { system, user } pour Haiku.
//
//  - currentValue (optionnel) : si non vide, l'IA traite cela comme brouillon
//    du praticien à AMÉLIORER (préserve les idées et précisions).
//  - Sinon : confection pure depuis le dossier + form.
// ─────────────────────────────────────────────────────────────────────────────

export function buildZonePrompt(
  field: ConfectableField,
  form: LetterFormData,
  dossier: string,
  currentValue: string,
  profession: string,
): { system: string; user: string } {
  const spec = ZONE_SPECS[field]
  const hasDraft = isFilled(currentValue)

  // Champs de contexte additionnels selon la zone (pour cohérence avec
  // ce que le praticien a déjà saisi ailleurs)
  const ctxFields = spec.contextFields ?? []
  const ctxLines = ctxFields
    .map(k => fmt(String(k), form[k] as string | undefined))
    .filter(Boolean)
  const ctxBlock = ctxLines.length > 0
    ? `\n\nAUTRES CHAMPS DU FORMULAIRE (cohérence) :\n${ctxLines.join('\n')}`
    : ''

  const draftBlock = hasDraft
    ? `\n\nBROUILLON DU PRATICIEN (à améliorer en préservant ses idées, ne pas l'écraser, simplement le polir et l'ancrer aux données du dossier) :\n"""\n${currentValue.trim()}\n"""`
    : ''

  const mode = hasDraft
    ? 'AMÉLIORATION du brouillon ci-dessous'
    : 'CONFECTION depuis le dossier patient'

  const user = `${userHeader(form)}

DOSSIER PATIENT (source factuelle unique) :
${dossier}${ctxBlock}${draftBlock}

══════════════════════════════════════════════════════════
ZONE À PRODUIRE : ${spec.label.toUpperCase()}
MODE : ${mode}
LONGUEUR ATTENDUE : ${spec.range}
══════════════════════════════════════════════════════════

INSTRUCTION : ${spec.instruction}

Produis UNIQUEMENT le paragraphe demandé en texte brut. Aucun préambule, aucune balise, aucun guillemet, aucun titre. Si le dossier ne contient aucune donnée exploitable pour cette zone, retourne une chaîne vide.`

  return { system: zoneSystemPrompt(profession), user }
}
