import { callClaude } from './claudeClient'
import { CLAUDE_MODELS } from './claudeModels'
import type { BilanType, NarrativeSection } from '../types'

/**
 * Transcrit un blob audio via le proxy serverless /api/transcribe.
 * Utilise gpt-4o-transcribe côté OpenAI, avec un prompt de vocabulaire médical FR.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': audioBlob.type || 'audio/webm' },
    body: audioBlob,
  })

  const body = await res.text()
  if (!res.ok) {
    let message = body
    try {
      const parsed = JSON.parse(body)
      message = parsed?.error || body
    } catch { /* keep raw */ }
    throw new Error(`Transcription ${res.status} : ${message.slice(0, 300)}`)
  }

  let data: { text?: string }
  try {
    data = JSON.parse(body)
  } catch {
    throw new Error('Réponse de transcription invalide')
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
 */
export async function reformulateTranscription(
  rawText: string,
  fieldHint: string,
): Promise<string> {
  const systemPrompt = `Tu es un assistant de rédaction pour un kinésithérapeute.
Tu reçois une transcription orale brute et le contexte du champ à remplir.
Ta tâche : reformuler le texte pour qu'il soit clair, concis et professionnel.

RÈGLES :
- Garde TOUTES les informations cliniques (valeurs, mesures, noms de tests, observations)
- Corrige la grammaire, les répétitions, les hésitations et les mots parasites
- Utilise un style clinique professionnel (phrases courtes, précises)
- Ne rajoute AUCUNE information qui n'était pas dans la dictée
- Si la dictée est déjà bien formulée, renvoie-la telle quelle
- Renvoie UNIQUEMENT le texte reformulé, rien d'autre (pas de guillemets, pas de préfixe)`

  const userPrompt = `Champ : "${fieldHint}"

Transcription brute :
"""
${rawText}
"""`

  const result = await callClaude('', systemPrompt, userPrompt, 4096, false, CLAUDE_MODELS.VOICE_REFORMULATION)
  return result.trim()
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

SCHÉMA CIBLE (type de bilan : ${bilanType}) :
${schema}
`
}

/**
 * Appelle Claude pour extraire un objet BilanData partiel depuis une transcription.
 * Le JSON retourné est directement utilisable avec bilanRef.setData(...).
 */
export async function extractBilanFromTranscription(
  transcription: string,
  bilanType: BilanType
): Promise<Record<string, unknown>> {
  const systemPrompt = buildExtractionPrompt(bilanType)
  const userPrompt = `Transcription de la dictée du kiné (à analyser) :\n\n"""\n${transcription}\n"""`

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

  return parsed
}

/**
 * Génère un compte-rendu narratif structuré en 7 sections à partir d'une
 * transcription de consultation, en utilisant Claude.
 */
export async function generateNarrativeReport(
  transcription: string,
  zone: string,
  context: 'dictee' | 'seance' = 'dictee',
): Promise<NarrativeSection[]> {
  const contextInstructions = context === 'seance'
    ? `Tu reçois la transcription d'une séance complète de physiothérapie avec le thérapeute et le patient.
La transcription capture les deux voix sans distinction de locuteur — identifie le contexte clinique à partir du contenu.
Extrais les informations cliniques pertinentes des deux côtés de la conversation (questions du thérapeute, réponses et plaintes du patient, observations cliniques).`
    : `Tu reçois la dictée du thérapeute après ou pendant la séance — une seule voix qui résume ce qu'il a observé et fait.`

  const systemPrompt = `Tu es un physiothérapeute expert qui rédige des comptes rendus cliniques professionnels en français.
${contextInstructions}
Tu dois produire un compte rendu structuré, clair et professionnel, en corrigeant les hésitations et répétitions orales.

RÈGLES :
1. Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.
2. Le JSON est un tableau de 7 objets avec les clés : "id", "titre", "contenu".
3. Les 7 sections sont dans cet ordre exact :
   - id: "anamnese",        titre: "Anamnèse"
   - id: "biopsychosocial", titre: "Facteurs biopsychosociaux"
   - id: "examen",          titre: "Examen clinique"
   - id: "diagnostic",      titre: "Diagnostic physiothérapeutique"
   - id: "objectifs",       titre: "Objectifs"
   - id: "plan",            titre: "Plan de traitement"
   - id: "conseils",        titre: "Conseils au patient"
4. Chaque "contenu" est un texte narratif professionnel (pas de JSON, pas de listes à puces sauf si cliniquement pertinent).
5. Si une section n'est pas abordée, écris "Non renseigné lors de cette consultation."
6. Utilise les termes cliniques appropriés (EVN, PSFS, MRC, ROM, etc.) tels que mentionnés.
7. Ne rajoute AUCUNE information absente de la transcription.
8. Conserve toutes les valeurs numériques (EVN, amplitudes, scores) telles quelles.
9. Style : phrases complètes, présent de l'indicatif, 3e personne (ex: "Le patient présente...", "L'examen révèle...").`

  const userPrompt = `Zone anatomique : ${zone}
Mode : ${context === 'seance' ? 'Enregistrement séance complète (thérapeute + patient)' : 'Dictée thérapeute'}

Transcription :
"""
${transcription}
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

  return parsed
}
