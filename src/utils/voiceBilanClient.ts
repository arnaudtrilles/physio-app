import { callClaude } from './claudeClient'
import { CLAUDE_MODELS } from './claudeModels'
import { authHeaders } from './apiAuth'
import {
  PIEGES_PHONETIQUES,
  METHODES_NOMS_PROPRES,
  TESTS_PAR_ZONE,
} from './clinicalLexicon'
import {
  scrubTranscription,
  scrubTranscriptionReversible,
  stripPiiTokens,
  type ScrubPatientHint,
} from './transcriptionScrub'
import type { BilanType, NarrativeSection } from '../types'

/**
 * Nettoie récursivement les jetons PII résiduels d'une structure JSON renvoyée
 * par l'IA (cas extraction / narratif, stockée telle quelle). Immuable : renvoie
 * une nouvelle structure sans muter l'entrée. Ne réinjecte jamais le vrai nom.
 */
function deepStripPiiTokens<T>(value: T): T {
  if (typeof value === 'string') return stripPiiTokens(value) as unknown as T
  if (Array.isArray(value)) return value.map(v => deepStripPiiTokens(v)) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepStripPiiTokens(v)
    }
    return out as unknown as T
  }
  return value
}

// Détecte un placeholder réversible ayant survécu à la restauration (IA l'a trop
// altéré, ex. numéro d'index halluciné) → on retombe alors sur la dictée brute
// pour ne JAMAIS afficher de jeton. Large à dessein : tout `__…PATIENT…__`.
const LEFTOVER_REV_PLACEHOLDER = /__\s*PATIENT[\s_]*\w*\s*__/i

// Erreurs transitoires côté infra (Vercel down, OpenAI down, réseau jitter…).
// Le client peut les retenter en toute sécurité.
export class TranscriptionTransientError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'TranscriptionTransientError'
    this.status = status
  }
}

// Patterns d'erreur Vercel infra — page HTML/texte renvoyée AVANT que notre handler
// ne soit invoqué (cold start crash, OOM, routing). À traiter comme transient.
const VERCEL_INFRA_PATTERNS = [
  'FUNCTION_INVOCATION_FAILED',
  'FUNCTION_INVOCATION_TIMEOUT',
  'FUNCTION_PAYLOAD_TOO_LARGE',
  'BODY_NOT_A_STRING_FROM_FUNCTION',
  'EDGE_FUNCTION_INVOCATION_FAILED',
  'A server error has occurred',
  'An error occurred with your deployment',
  'NO_RESPONSE_FROM_FUNCTION',
  'GATEWAY_TIMEOUT',
]

/**
 * Transcrit un blob audio via le proxy serverless /api/transcribe.
 * Utilise gpt-4o-transcribe côté OpenAI, avec un prompt de vocabulaire médical FR.
 *
 * Erreurs transitoires (Vercel infra, 5xx, 429, network) → TranscriptionTransientError.
 * Erreurs définitives (400, 401, 413, 415) → Error simple, ne pas retenter.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  let res: Response
  try {
    const auth = await authHeaders()
    res = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': audioBlob.type || 'audio/webm', ...auth },
      body: audioBlob,
    })
  } catch (e) {
    // network failure (offline, DNS, TLS, abort) → transient
    const msg = e instanceof Error ? e.message : 'fetch failed'
    throw new TranscriptionTransientError(`Réseau : ${msg}`, 0)
  }

  const body = await res.text()
  if (!res.ok) {
    let message = body
    try {
      const parsed = JSON.parse(body)
      message = parsed?.error || body
    } catch { /* keep raw — souvent une page HTML Vercel */ }

    const isVercelInfra = VERCEL_INFRA_PATTERNS.some(p => body.includes(p))
    const isTransient = isVercelInfra
      || res.status === 0
      || res.status === 408
      || res.status === 429
      || (res.status >= 500 && res.status < 600)

    const truncated = message.slice(0, 300)
    const fullMessage = `Transcription ${res.status} : ${truncated}`
    if (isTransient) {
      throw new TranscriptionTransientError(fullMessage, res.status)
    }
    throw new Error(fullMessage)
  }

  let data: { text?: string }
  try {
    data = JSON.parse(body)
  } catch {
    // Le serveur a répondu 2xx mais avec un body non-JSON → infra bizarre, transient
    throw new TranscriptionTransientError('Réponse de transcription invalide', res.status)
  }

  if (!data.text) throw new Error('Transcription vide')

  const PROMPT_ECHOES = [
    'EVA, EVN, PSFS',
    'transcription kinésithérapie',
    'transcription d\'un bilan',
    'vocabulaire attendu',
    'bilan kinésithérapique initial',
    'le patient présente une douleur',
    'les tests cliniques suggèrent',
    'la prise en charge comprendra',
    'objectifs smart incluent',
  ]
  const lower = data.text.toLowerCase().trim()
  const isEcho = PROMPT_ECHOES.some(p => lower.includes(p.toLowerCase()))
  if (isEcho) throw new Error('Aucune parole détectée')

  return data.text
}

/**
 * Reformule une transcription brute pour qu'elle soit bien rédigée
 * en fonction du contexte du champ (son placeholder / label).
 *
 * Le `patient` optionnel permet d'anonymiser nom/prénom avant l'envoi
 * à Claude (minimisation des données — RGPD art. 5.1.c).
 */
export async function reformulateTranscription(
  rawText: string,
  fieldHint: string,
  patient?: ScrubPatientHint,
): Promise<string> {
  const { text: scrubbedText, restore } = scrubTranscriptionReversible(rawText, patient)
  const systemPrompt = `Tu es un assistant de rédaction pour un kinésithérapeute / physiothérapeute francophone.
Tu reçois une transcription orale brute et le contexte du champ à remplir.
Ta tâche : reformuler le texte pour qu'il soit clair, concis et professionnel.

RÈGLES GÉNÉRALES :
- Garde TOUTES les informations cliniques (valeurs chiffrées, mesures, latéralités D/G, noms de tests, observations)
- Corrige la grammaire, les répétitions, les hésitations (« euh », « donc », « voilà ») et les mots parasites
- Style clinique professionnel : phrases courtes, précises, à la 3ᵉ personne pour le patient
- Ne rajoute AUCUNE information qui n'était pas dans la dictée
- Si la dictée est déjà bien formulée, renvoie-la telle quelle
- Renvoie UNIQUEMENT le texte reformulé, rien d'autre (pas de guillemets, pas de préfixe)
- Si le texte contient des marqueurs de confidentialité de la forme \`__PATIENT_0__\`, \`__PATIENT_1__\`, etc. (un numéro encadré par des underscores), RECOPIE-les EXACTEMENT tels quels — sans changer le numéro, l'ordre ni la casse, sans les fusionner, sans les traduire et sans les supprimer ; ils seront remplacés automatiquement ensuite

STANDARDISATION DES VALEURS :
- Échelles de douleur : « EVA 6/10 », « EVN 4/10 » — pas « EVA 6 sur 10 » en toutes lettres
- Degrés : « 90° » et non « 90 degrés » sauf si dicté ainsi
- Force MRC : « MRC 4/5 » ou « 4/5 » selon contexte
- Répétitions/séries : « 3 séries de 10 répétitions », « 3×/semaine »
- Latéralité explicite obligatoire (droite/gauche, ipsi/contro-latéral) — ne jamais omettre
- Sigles en majuscules sans points : BDK, LCA, AVC, MRC, EVA, ROM, PEC, TENS

AUTOCORRECTIONS — règle critique : si le kiné se reprend (« non en fait », « pardon », « plutôt », « je rectifie », « je voulais dire »), ne garde QUE la version corrigée. Aucune mention de l'ancienne version.

CORRECTIONS PHONÉTIQUES (Whisper transcrit mal certains termes médicaux — corrige-les si tu reconnais le terme correct au contexte) :
${PIEGES_PHONETIQUES}

NOMS DE MÉTHODES (orthographe officielle imposée) : ${METHODES_NOMS_PROPRES}.

NOMS DE TESTS — conserver verbatim avec leur orthographe officielle. Catalogue de référence :
- Lombaire/SI : ${TESTS_PAR_ZONE.lombaireSI}
- Cervical : ${TESTS_PAR_ZONE.cervical}
- Hanche : ${TESTS_PAR_ZONE.hanche}
- Genou : ${TESTS_PAR_ZONE.genou}
- Cheville/pied : ${TESTS_PAR_ZONE.chevillePied}
- Épaule : ${TESTS_PAR_ZONE.epaule}
- Coude/poignet/main : ${TESTS_PAR_ZONE.coudePoignetMain}

PRÉCISION SÉMANTIQUE :
- Si le patient ne rapporte pas un symptôme : « pas de X retrouvé », « absence de X », « X non rapporté » — JAMAIS « le patient nie X » (le verbe nier présuppose un désaveu actif).
- Un test « négatif » est un résultat clinique à conserver en clair, pas une donnée manquante.

DOUTE — si un mot est inintelligible, marque \`[inaudible]\` plutôt que d'inventer. Si un terme reste ambigu entre deux options phonétiquement proches, marque \`[à préciser : X ou Y ?]\`.`

  const userPrompt = `Champ : "${fieldHint}"

Transcription brute :
"""
${scrubbedText}
"""`

  const result = await callClaude('', systemPrompt, userPrompt, 4096, false, CLAUDE_MODELS.VOICE_REFORMULATION)
  // Réinjecte le vrai nom/prénom (le placeholder ne doit JAMAIS être affiché).
  const restored = restore(result.trim())
  // Filet de sécurité : si un placeholder a survécu (IA l'a trop altéré), on
  // affiche la dictée brute (nom réel, aucun jeton) plutôt qu'un marqueur visible.
  if (LEFTOVER_REV_PLACEHOLDER.test(restored)) return rawText.trim()
  return restored
}

// ─── Schéma d'extraction par type de bilan ─────────────────────────────────
// Description compacte — Claude voit ce schéma dans le system prompt et
// retourne UNIQUEMENT les champs explicitement mentionnés dans la dictée.
// Les champs non évoqués doivent être OMIS (pas de null, pas de chaîne vide).

const EPAULE_SCHEMA = `{
  "douleur": {
    "debutSymptomes": "string — date ou circonstances du début",
    "facteurDeclenchant": "string — chute, effort, progressif, etc.",
    "mecanismeLesionnel": "string — si trauma : inversion, valgus, torsion…",
    "localisationActuelle": "string — zone douloureuse actuelle (ex: 'face antéro-latérale épaule droite')",
    "localisationInitiale": "string — zone douloureuse au départ",
    "evnPire": "string — OBLIGATOIRE si EVA/EVN mentionné : nombre 0-10, ex: '7'",
    "evnMieux": "string — OBLIGATOIRE si mentionné : nombre 0-10, ex: '2'",
    "evnMoy": "string — OBLIGATOIRE si mentionné : nombre 0-10, ex: '5'. Si le kiné dit 'EVA à 5' sans préciser pire/mieux/moyenne, mets dans evnMoy",
    "douleurType": "string — mécanique, inflammatoire, neuropathique, mixte",
    "situation": "string — contexte déclenchant (sport, travail, nuit…)",
    "douleurNocturne": "oui | non",
    "douleurNocturneType": "string — type de douleur nocturne si précisé",
    "insomniante": "oui | non",
    "derouillageMatinal": "oui | non",
    "derouillageTemps": "string — ex: '15 minutes'",
    "derouillageFrequence": "string — quotidien, occasionnel…",
    "mouvementsEmpirent": "string — mouvements/postures qui aggravent (abduction, élévation, port de charge…)",
    "mouvementsSoulagent": "string — mouvements/postures qui soulagent (repos, glaçage, position…)"
  },
  "redFlags": {
    "tttMedical": "string — traitements en cours",
    "antecedents": "string — chirurgies, pathologies antérieures",
    "comorbidites": "string — diabète, HTA, etc.",
    "sommeilQuantite": "string — nb heures, qualité",
    "sommeilQualite": "string — bon, perturbé, insomnie…",
    "imageries": "string — radios, IRM, écho, résultats",
    "cinqD3N": "string — dizziness, drop attacks, diplopie, dysarthrie, dysphagie, nystagmus, nausées",
    "tabagisme": "oui | non",
    "traumatismeRecent": "oui | non",
    "troublesMotricite": "oui | non",
    "troublesMarche": "oui | non",
    "perteAppetit": "oui | non",
    "pertePoids": "oui | non",
    "atcdCancer": "oui | non",
    "cephalees": "oui | non",
    "fievre": "oui | non",
    "csIs": "oui | non — corticoïdes / immunosuppresseurs prolongés",
    "douleurThoracique": "oui | non",
    "douleurDigestion": "oui | non",
    "fatigueRF": "oui | non"
  },
  "yellowFlags": {
    "croyancesOrigine": "string — ce que le patient pense de l'origine de sa douleur",
    "croyancesTtt": "string — ce qu'il pense qui peut le soigner",
    "attentes": "string — attentes vis-à-vis de la kiné",
    "autoEfficacite": "string — faible | moyen | fort",
    "flexibilitePsy": "string — faible | moyenne | forte",
    "strategieCoping": "string — repos, chaleur, médicaments…",
    "peurEvitementMouvements": "string — quels mouvements évités",
    "catastrophisme": "oui | non",
    "peurEvitement": "oui | non",
    "hypervigilance": "oui | non",
    "anxiete": "oui | non",
    "depression": "oui | non"
  },
  "blueBlackFlags": {
    "stressNiveau": "number 0-100 (niveau de stress au travail)",
    "antecedentsAtDetails": "string — détails accidents de travail",
    "enAt": "oui | non — en accident de travail",
    "antecedentsAt": "oui | non — antécédents d'AT",
    "travailExigeant": "oui | non",
    "sousEstime": "oui | non — se sent sous-estimé au travail",
    "manqueControle": "oui | non — manque de contrôle sur ses tâches",
    "travailAggrave": "oui | non",
    "politiqueFlexible": "oui | non — politique d'entreprise flexible",
    "difficultesAcces": "oui | non — difficulté d'accès aux soins",
    "conditionsSocioEco": "oui | non — conditions socio-économiques défavorables",
    "litige": "oui | non"
  },
  "examClinique": {
    "morphoRachisCervical": "string — observation posturale (antéprojection, rectitude…)",
    "morphoRachisThoracique": "string — cyphose, rectitude…",
    "morphoCeintureScap": "string — enroulement, sonnette, asymétrie…",
    "modificationPosture": "pire | pareil | mieux",
    "amyoDeltoide": "string — observation amyotrophie deltoïde",
    "amyoFosseSupraInfra": "string — fosse supra / infra-épineuse",
    "amyoPeriScapulaire": "string — péri-scapulaire",
    "mobiliteRachisCervical": "string — amplitudes / limitations",
    "mobiliteRachisThoracique": "string — amplitudes / limitations",
    "mobiliteAutresZones": "string — coude, poignet…",
    "mobilite": {
      "flexion":   { "ag": "degrés actif gauche", "ad": "degrés actif droit", "pg": "degrés passif gauche", "pd": "degrés passif droit" },
      "abduction": { "ag": "", "ad": "", "pg": "", "pd": "" },
      "adduction": { "ag": "", "ad": "", "pg": "", "pd": "" },
      "extension": { "ag": "", "ad": "", "pg": "", "pd": "" },
      "re1":       { "ag": "", "ad": "", "pg": "", "pd": "" },
      "re2":       { "ag": "", "ad": "", "pg": "", "pd": "" },
      "ri1":       { "ag": "", "ad": "", "pg": "", "pd": "" },
      "ri2":       { "ag": "", "ad": "", "pg": "", "pd": "" }
    }
  },
  "forceMusculaire": {
    "force": {
      "planScapula90":     { "gauche": "MRC 0-5", "droite": "MRC 0-5" },
      "re1Force":          { "gauche": "MRC 0-5", "droite": "MRC 0-5" },
      "re2StabEpaule":     { "gauche": "MRC 0-5", "droite": "MRC 0-5" },
      "re2StabCharge":     { "gauche": "MRC 0-5", "droite": "MRC 0-5" },
      "re2SansStab":       { "gauche": "MRC 0-5", "droite": "MRC 0-5" },
      "re2SansStabCharge": { "gauche": "MRC 0-5", "droite": "MRC 0-5" },
      "ri2StabEpaule":     { "gauche": "MRC 0-5", "droite": "MRC 0-5" },
      "ri2StabCharge":     { "gauche": "MRC 0-5", "droite": "MRC 0-5" },
      "ri2SansStab":       { "gauche": "MRC 0-5", "droite": "MRC 0-5" },
      "ri2SansStabCharge": { "gauche": "MRC 0-5", "droite": "MRC 0-5" }
    },
    "autresTestsForce": "string — autres tests non listés",
    "marqueursAvant": "string — marqueurs avant procédure (EVN, amplitude, douleur…)",
    "mvtAmelMouvement": "string — mouvement testé (ex: rétraction scapulaire, RE2, flexion…)",
    "mvtAmelNbRep": "string — nombre de répétitions (ex: '10')",
    "mvtAmelContraction": "concentrique | excentrique | isométrique",
    "resultatsMvtRep": "string — résultats après procédure (effet sur EVN / amplitude / douleur)"
  },
  "neurologique": {
    "reflexes": "string — bicipital, tricipital, stylo-radial… (normal / diminué / aboli / vif)",
    "force": "string — territoire concerné, cotation",
    "sensibilite": "string — dermatomes C5-T1, type de déficit (pinceau, monofilaments…)",
    "hoffmanTromner": "string — + ou - (test de Hoffman / Tromner)",
    "reversibilite": "string — oui / non, avec quoi (force, pinceau…)",
    "comportement": "string — utile / inutile, type…",
    "palpationNerfs": "string — douleur, quel nerf…",
    "nerfSousPression": "oui | non",
    "nerfMalade": "oui | non",
    "nerfPrecisions": "string — précisions nerf/racine",
    "troublesSensitifsNotes": "string — localisation, qualité (fourmillements, engourdissement…)",
    "nerfMedian": "string — ULNT1 / nerf médian : reproduction symptômes, différenciation structurelle…",
    "nerfRadial": "string — ULNT2b / nerf radial : reproduction symptômes…",
    "nerfUlnaire": "string — ULNT3 / nerf ulnaire : reproduction symptômes…"
  },
  "testsSpecifiques": {
    "bearHug": "positif | negatif — Bear Hug Test (subscapulaire)",
    "bellyPress": "positif | negatif — Belly Press Test (subscapulaire)",
    "externalRotLagSign": "positif | negatif — ERLS (sus/infra-épineux)",
    "internalRotLagSign": "positif | negatif — IRLS (subscapulaire)",
    "apprehensionRelocation": "positif | negatif — Apprehension / Relocation Test",
    "signeSulcus": "positif | negatif — Signe du Sulcus",
    "jerkTest": "positif | negatif — Jerk Test",
    "obrien": "positif | negatif — O'Brien (AC / labrum)",
    "palpationAC": "positif | negatif — Palpation AC",
    "crossArm": "positif | negatif — Cross-Arm",
    "abdHorizResist": "positif | negatif — Abduction horizontale contre résistance",
    "ckcuest": "string — score CKCUEST",
    "ulrt": "string — score ULRT",
    "uqYbt": "string — score UQ-YBT",
    "setPset": "string — SET / PSET",
    "smbtSasspt": "string — SMBT / SASSPT",
    "autresTestsFonctionnels": "string — autres tests non listés"
  },
  "scores": {
    "psfs1Label": "string — activité 1 limitée citée par le patient",
    "psfs1": "string — score PSFS 0-10 pour activité 1",
    "psfs1Notes": "string — détails / contexte activité 1",
    "psfs2Label": "string — activité 2",
    "psfs2": "string — score PSFS 0-10 pour activité 2",
    "psfs2Notes": "string — détails activité 2",
    "psfs3Label": "string — activité 3",
    "psfs3": "string — score PSFS 0-10 pour activité 3",
    "psfs3Notes": "string — détails activité 3",
    "scoreOSS": "string — Oxford Shoulder Score (si questionnaire passé)",
    "scoreConstant": "string — Constant-Murley",
    "scoreDASH": "string — DASH",
    "scoreRowe": "string — Rowe",
    "scoreHAD": "string — HAD",
    "scoreDN4": "string — DN4",
    "scoreSensibilisation": "string — CSI / sensibilisation centrale",
    "autresScores": "string — autres scores non listés"
  },
  "contratKine": {
    "objectifsSMARTItems": [
      { "id": "number — timestamp", "titre": "string — objectif", "cible": "string — critère mesurable (ex: 'Flexion > 160°')", "dateCible": "string — date cible dd/mm/yyyy" }
    ],
    "autoReeducation": "oui | non",
    "frequenceDuree": "string — ex: '2 séances/semaine pendant 6 semaines'"
  },
  "conseils": {
    "conseilsRecos": "string — conseils et recommandations donnés"
  }
}`

const SCHEMAS: Partial<Record<BilanType, string>> = {
  epaule: EPAULE_SCHEMA,
}

/**
 * Construit le system prompt pour Claude selon le type de bilan.
 */
function buildExtractionPrompt(bilanType: BilanType): string {
  const schema = SCHEMAS[bilanType]
  if (!schema) {
    throw new Error(`Auto-remplissage non disponible pour le type "${bilanType}" pour l'instant`)
  }

  return `Tu es un assistant qui aide un kinésithérapeute à remplir un bilan clinique à partir d'une dictée orale.

Ta tâche : extraire de la transcription ci-après les informations cliniques et les mapper au schéma JSON suivant.

RÈGLES STRICTES :
1. Ne retourne QUE du JSON valide, rien d'autre (pas de markdown, pas de commentaire).
2. N'invente AUCUNE information. Si un champ n'est pas explicitement mentionné dans la dictée, OMETS-LE entièrement (ne mets pas null, ne mets pas chaîne vide).
3. Les booléens sont représentés par les chaînes "oui" ou "non" exactement.
4. Les valeurs EVA/EVN doivent être des chaînes contenant un nombre de 0 à 10. TRÈS IMPORTANT : si le kiné dit "EVA à 5" ou "douleur à 5/10" sans préciser pire/mieux/moyenne, mets dans evnMoy. Si il dit "au pire" → evnPire. Si il dit "au mieux" → evnMieux.
5. Les amplitudes articulaires (mobilité) sont en degrés, sous forme de chaîne (ex: "120", "90"). CLÉS DE MOBILITÉ : flexion, abduction, adduction, extension, re1 (rotation externe coude au corps), re2 (rotation externe bras en abduction), ri1 (rotation interne coude au corps), ri2 (rotation interne bras en abduction). ag=actif gauche, ad=actif droit, pg=passif gauche, pd=passif droit. Si le kiné donne des chiffres, remplis les sous-clés correspondantes. Si le kiné donne une description qualitative SANS chiffres (ex: "amplitudes incomplètes", "limitation en flexion et abduction"), mets la description dans examClinique.mobiliteAutresZones (champ texte libre). Tu peux remplir MOBILITÉ ET mobiliteAutresZones en même temps si le kiné donne des chiffres pour certains mouvements et des descriptions pour d'autres.
6. La force musculaire suit l'échelle MRC (0 à 5), sous forme de chaîne. CLÉS DE FORCE : planScapula90 (plan de la scapula 90°), re1Force (RE1 isométrique), re2StabEpaule, re2StabCharge, re2SansStab, re2SansStabCharge, ri2StabEpaule (RI2 avec stabilisation), ri2StabCharge, ri2SansStab, ri2SansStabCharge. Si le kiné dit "force normale" ou "force à 5", remplis TOUTES les clés de force avec "5". Si le kiné dit "force à X/5" sans préciser quel mouvement, remplis toutes les clés avec cette valeur. Si force asymétrique, remplis gauche/droite séparément.
7. Les tests spécifiques utilisent EXACTEMENT les clés camelCase du schéma (bearHug, bellyPress, externalRotLagSign, etc.) — valeurs "positif" ou "negatif". Si le kiné dit "Hawkins positif", mappe vers la clé la plus proche existante dans le schéma. Attention : pas de clé "Hawkins" — les tests de conflit sont sous bearHug, bellyPress, etc.
   GROUPES DE TESTS — si le kiné dit "tous les tests de [groupe] sont négatifs/positifs", remplis CHAQUE clé du groupe :
   • Tests d'instabilité : apprehensionRelocation, signeSulcus, jerkTest
   • Tests de coiffe / rupture : bearHug, bellyPress, externalRotLagSign, internalRotLagSign
   • Tests AC : obrien, palpationAC, crossArm, abdHorizResist
   • Tests fonctionnels : ckcuest, ulrt, uqYbt, setPset, smbtSasspt
8. Si le patient parle d'une activité qu'il ne peut plus faire, mets-la dans scores.psfs1Label (puis psfs2Label, psfs3Label). IMPORTANT : mets aussi le score numérique (0-10) dans scores.psfs1, psfs2, psfs3 si le kiné le donne.
9. Sois fidèle aux mots du kiné — n'interprète pas, ne reformule pas les champs texte libre (localisation, antécédents, conseils, etc.).
10. Si un champ est ambigu, laisse-le vide (omets-le) plutôt que de deviner.
11. Objectifs SMART (contratKine.objectifsSMARTItems) : c'est un ARRAY d'objets. Chaque objectif dicté doit être un objet séparé avec un id (utilise un timestamp : Date.now()), un titre, une cible si mentionnée, et une dateCible si mentionnée.
12. Pour la neurologie (ULNT/mécanosensibilité) : nerfMedian = ULNT1, nerfRadial = ULNT2b, nerfUlnaire = ULNT3. Si le kiné dit "ULTT1 positif côté droit", mets "Positif côté droit — reproduction des symptômes" dans nerfMedian.
13. Les mouvements améliorant la symptomatologie (marqueursAvant, mvtAmelMouvement, mvtAmelNbRep, mvtAmelContraction, resultatsMvtRep) sont sous "forceMusculaire", pas sous "examClinique".
14. Contrat kiné — frequenceDuree : si le kiné mentionne un nombre de séances par semaine, une fréquence ou une durée de traitement (ex: "2 fois par semaine pendant 6 semaines", "3 séances/semaine sur 8 semaines", "rythme bihebdomadaire"), mets-le dans contratKine.frequenceDuree. Cherche aussi des formulations comme "je le vois X fois par semaine" ou "séances prévues sur X semaines".
15. Pour la neurologie ULNT/mécanosensibilité : si le kiné dit "positif" ou "négatif" pour un nerf (médian, radial, ulnaire), utilise exactement cette valeur avec les détails s'il y en a (ex: "Positif côté droit — reproduction des symptômes").
16. AUTOCORRECTIONS — règle critique : la transcription est chronologique. Si le kiné revient sur une information précédemment dite et la modifie ou la corrige (formulations typiques : "non en fait", "je me reprends", "plutôt", "finalement", "pardon", "je rectifie", "non c'est plutôt", "je voulais dire", "je me suis trompé"), c'est TOUJOURS la version la plus récente qui prime. N'extrais QUE la version corrigée. Cela s'applique à tous les champs : EVN, amplitudes, MRC, tests positifs/négatifs, localisation, antécédents, etc.
17. CORRECTIONS PHONÉTIQUES — Whisper transcrit parfois mal les termes médicaux. Avant de mapper aux champs, applique les corrections évidentes au contexte clinique : « cyatique » → sciatique ; « épidoyle » → épicondyle ; « scaroïde » → scaphoïde ; « koïffe » / « colite des rotateurs » → coiffe des rotateurs ; « lashmane » → Lachman ; « romber » → Romberg ; « hawkings » → Hawkins ; « bobas » → Bobath ; « kabbat » → Kabat ; « mézière » → Mézières ; « moulighan » → Mulligan ; « malaitlande » → Maitland ; « tibialiste postérieur » → tibial postérieur ; « gastronomiens » → gastrocnémiens ; « illio-psoas » → ilio-psoas ; « ischio » (jamais « hischio »).

SCHÉMA CIBLE (type de bilan : ${bilanType}) :
${schema}
`
}

/**
 * Appelle Claude pour extraire un objet BilanData partiel depuis une transcription.
 * Le JSON retourné est directement utilisable avec bilanRef.setData(...).
 *
 * Le `patient` optionnel anonymise nom/prénom dans la transcription avant
 * l'envoi (minimisation des données — RGPD art. 5.1.c).
 */
export async function extractBilanFromTranscription(
  transcription: string,
  bilanType: BilanType,
  patient?: ScrubPatientHint,
): Promise<Record<string, unknown>> {
  const systemPrompt = buildExtractionPrompt(bilanType)
  const { text: scrubbedTranscription } = scrubTranscription(transcription, patient)
  const userPrompt = `Transcription de la dictée du kiné (à analyser) :\n\n"""\n${scrubbedTranscription}\n"""`

  const raw = await callClaude(
    '',                // apiKey ignoré (auth côté serveur)
    systemPrompt,
    userPrompt,
    16384,             // maxOutputTokens — le JSON extrait peut être volumineux
    true,              // jsonMode
    CLAUDE_MODELS.DEFAULT  // modèle préféré — Sonnet pour extraction précise
  )

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new Error(`Réponse IA non-JSON : ${(e as Error).message.slice(0, 200)}`)
  }

  // Défense en profondeur : aucun jeton PII résiduel ne doit polluer les champs stockés.
  return deepStripPiiTokens(parsed)
}

/**
 * Génère un compte-rendu narratif structuré en 7 sections à partir d'une
 * transcription de consultation, en utilisant Claude.
 *
 * Le `patient` optionnel anonymise nom/prénom dans la transcription avant
 * l'envoi (minimisation des données — RGPD art. 5.1.c).
 */
export async function generateNarrativeReport(
  transcription: string,
  zone: string,
  context: 'dictee' | 'seance' = 'dictee',
  patient?: ScrubPatientHint,
): Promise<NarrativeSection[]> {
  const { text: scrubbedTranscription } = scrubTranscription(transcription, patient)
  const contextInstructions = context === 'seance'
    ? `Tu reçois la transcription d'une séance complète de physiothérapie avec le thérapeute et le patient.
La transcription capture les deux voix sans distinction de locuteur — identifie le contexte clinique à partir du contenu.
Extrais les informations cliniques pertinentes des deux côtés de la conversation (questions du thérapeute, réponses et plaintes du patient, observations cliniques).`
    : `Tu reçois la dictée du thérapeute après ou pendant la séance — une seule voix qui résume ce qu'il a observé et fait.`

  const systemPrompt = `Tu es un physiothérapeute expert qui rédige des comptes rendus cliniques professionnels en français.
${contextInstructions}
Tu dois produire un compte rendu structuré, clair et professionnel, en corrigeant les hésitations et répétitions orales.

OBJECTIF DE STRUCTURE (CRITIQUE) — Ce compte rendu sert de SOURCE UNIQUE pour la génération ultérieure d'un PDF clinique destiné au médecin prescripteur. Le PDF aura 9 sections imposées (Profil, Anamnèse, Symptomatologie douloureuse, Drapeaux, Examen clinique, Tests spécifiques, Synthèse diagnostique, Projet thérapeutique, Conclusion). Tes 8 sections de sortie sont **calquées 1:1 sur les sections 2 à 9 du PDF** afin que CHAQUE détail de la transcription atterrisse dans la bonne case du PDF final. Aucune information ne doit être perdue ou amalgamée — distribue chaque élément clinique dans la section où le PDF l'attendra.

RÈGLES :
1. Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.
2. Le JSON est un tableau de 8 objets avec les clés : "id", "titre", "contenu".
3. Les 8 sections sont dans cet ordre exact, et chaque section CAPTURE EXACTEMENT le contenu décrit ci-dessous (n'amalgame pas, ne déplace pas) :

   - id: "anamnese", titre: "Anamnèse"
     → motif de consultation, mécanisme et histoire de la plainte (depuis quand, comment c'est arrivé, évolution), antécédents médico-chirurgicaux, traitements en cours/antérieurs, imageries déjà réalisées, gestes invasifs (infiltrations, chirurgies), profession et activités sportives/loisirs si pertinents.
     ⚠ NE PAS inclure ici : valeurs EVN, type de douleur, localisation actuelle, facteurs aggravants/améliorants → ces éléments vont dans "symptomatologie".
     ⚠ NE PAS inclure ici : drapeaux (perte de poids, fièvre, nocturne sévère, troubles sphinctériens) → ces éléments vont dans "drapeaux".

   - id: "symptomatologie", titre: "Symptomatologie douloureuse"
     → description complète et détaillée de la douleur : EVN pire / EVN mieux / EVN moyenne (toutes les valeurs numériques mentionnées), type de douleur (mécanique, inflammatoire, neurogène, mixte), caractère (brûlure, décharge, crampe, lancinante…), localisation initiale et localisation actuelle, irradiation et trajet, douleur nocturne (réveille / insomniante / non), dérouillage matinal et durée, mouvements/gestes/positions aggravants, mouvements/positions soulageants, facteur déclenchant, évolution sur la journée.
     ⚠ Reporte CHAQUE valeur numérique citée (« 6/10 », « 3 sur 10 », « 8 », etc.) telle quelle.

   - id: "drapeaux", titre: "Drapeaux cliniques"
     → red flags (perte de poids inexpliquée, fièvre, sueurs nocturnes, antécédents néoplasiques, douleur nocturne sévère non posturale, troubles sphinctériens, déficit moteur progressif, syndrome de la queue de cheval, traumatisme à haute énergie, anesthésie en selle), yellow flags (croyances erronées sur la douleur, kinésiophobie, catastrophisme, dépression, anxiété), blue flags (insatisfaction au travail, pression, conflits), black flags (litiges, indemnisation, accident du travail). Pour chaque drapeau évoqué (positif OU explicitement négatif), note-le distinctement.
     ⚠ Si le thérapeute dit « pas de red flag », « rien d'inquiétant », « négatif » → écris-le en clair (« Red flags négatifs : pas de perte de poids, pas de douleur nocturne sévère, pas de trouble sphinctérien »). NE JAMAIS écrire « Non renseigné » si une exploration négative a été verbalisée.

   - id: "examen", titre: "Examen clinique"
     → examen morphostatique (statique, attitude, déformations), observation (œdème, rougeur, hématome, atrophie, cicatrices), palpation (points douloureux, contractures, températures locales), mobilité articulaire active/passive (amplitudes en degrés, ROM, comparaison contro-latérale), force musculaire (cotation MRC 0-5 par muscle, fatigabilité), examen neurologique (réflexes ostéotendineux, sensibilité, motricité segmentaire, signes pyramidaux), évaluation fonctionnelle non spécifique.
     ⚠ NE PAS inclure ici les TESTS CLINIQUES NOMMÉS (Lasègue, FABER, Lachman, Spurling, Thessaly, etc.) → ils vont dans "tests".

   - id: "tests", titre: "Tests spécifiques"
     → tous les tests cliniques nommés réalisés, avec leur résultat (positif / négatif / litigieux + détail) et le côté testé. Le PDF attend ce contenu en bloc dédié.
       Catalogue de référence (à reconnaître quels que soient leurs synonymes oraux) :
       • Lombaire / sacro-iliaque : ${TESTS_PAR_ZONE.lombaireSI}.
       • Cervical : ${TESTS_PAR_ZONE.cervical}.
       • Hanche : ${TESTS_PAR_ZONE.hanche}.
       • Genou : ${TESTS_PAR_ZONE.genou}.
       • Cheville/pied : ${TESTS_PAR_ZONE.chevillePied} ; ainsi que LFH, Molloy, Foot Lift, BESS, Y-Balance, ALTD, RALTD, HEER, ABD-HEER (tests fonctionnels chevilles instables).
       • Épaule : ${TESTS_PAR_ZONE.epaule}.
       • Coude / poignet / main : ${TESTS_PAR_ZONE.coudePoignetMain}.
       • Drainage lymphatique / vasculaire : ${TESTS_PAR_ZONE.drainageVasculaire}.
       • Vestibulaire : ${TESTS_PAR_ZONE.vestibulaire}.
       Tout autre test nommé → conserve le nom exact du test verbatim avec son orthographe officielle (Lasègue avec accent grave, Mézières avec accent, McKenzie, Maitland, Mulligan, Bobath, Kabat).
     ⚠ Format suggéré : « Lasègue droit positif à 60° avec irradiation S1. Lasègue gauche négatif. Slump test positif à droite. FABER bilatéral négatif. »

   - id: "diagnostic", titre: "Synthèse diagnostique"
     → hypothèse diagnostique principale formulée par le thérapeute, hypothèses différentielles évoquées et écartées, mécanismes lésionnels probables. Pas de pourcentages.

   - id: "projet", titre: "Projet thérapeutique"
     → objectifs du patient (formulés ou reformulés en SMART si possible), axes de prise en charge (antalgique, mobilité, renforcement, neurodynamique, éducation, reprise activités), techniques envisagées (TMP, MET, exercices, électrothérapie, etc.), fréquence et durée prévues du suivi.

   - id: "conseils", titre: "Conseils au patient"
     → auto-rééducation à domicile, ergonomie, hygiène posturale, gestion de l'effort, conseils éducatifs spécifiques mentionnés.

4. Chaque "contenu" est un texte narratif professionnel en prose (pas de JSON, pas de markdown, listes à puces uniquement si cliniquement pertinent comme dans "tests").
5. Si une section n'est PAS DU TOUT abordée dans la transcription, écris uniquement : "Non renseigné lors de cette consultation."
6. Si une section est abordée même brièvement (y compris en exploration explicitement négative), retranscris cette information — JAMAIS de « Non renseigné » s'il y a eu verbalisation.
7. Utilise les termes cliniques appropriés (EVN, PSFS, MRC, ROM, etc.) tels que mentionnés.
8. Ne rajoute AUCUNE information absente de la transcription.
9. Conserve TOUTES les valeurs numériques (EVN, amplitudes, scores, cotations MRC) telles quelles, dans la section appropriée.
10. Style : phrases complètes, présent de l'indicatif, 3e personne (ex: "Le patient présente...", "L'examen révèle...").
11. EXHAUSTIVITÉ — aucun élément clinique de la transcription ne doit être perdu. Si un élément ne rentre pas évidemment dans une section, place-le dans la plus proche sémantiquement (ex: une remarque sur la kinésiophobie → "drapeaux"). Ne le supprime jamais.
12. AUTOCORRECTIONS — règle critique : la transcription est chronologique. Si le thérapeute revient sur une information précédemment mentionnée et la modifie ou la corrige (formulations typiques : "non en fait", "je me reprends", "plutôt", "finalement", "pardon", "je rectifie", "non c'est plutôt", "je voulais dire", "je me suis trompé"), c'est TOUJOURS la version la plus récente qui prime dans le compte rendu. Ne mentionne jamais l'ancienne version, ne fais aucune référence au changement, écris uniquement la version corrigée comme si elle avait été dite directement. Cela s'applique à TOUS les champs : valeurs numériques (EVN, amplitudes, MRC), tests cliniques, observations, mouvements aggravants/améliorants, diagnostic, etc.`

  const userPrompt = `Zone anatomique : ${zone}
Mode : ${context === 'seance' ? 'Enregistrement séance complète (thérapeute + patient)' : 'Dictée thérapeute'}

Transcription :
"""
${scrubbedTranscription}
"""`

  const raw = await callClaude('', systemPrompt, userPrompt, 8192, false, CLAUDE_MODELS.DEFAULT)

  let parsed: NarrativeSection[]
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) throw new Error('Expected array')
  } catch (e) {
    throw new Error(`Réponse Claude invalide : ${(e as Error).message.slice(0, 200)}`)
  }

  // Défense en profondeur : aucun jeton PII résiduel dans les sections stockées.
  return deepStripPiiTokens(parsed)
}
