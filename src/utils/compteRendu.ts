import type {
  BilanRecord,
  CompteRendu,
  CompteRenduData,
  DrapeauGroupe,
  DrapeauStatut,
  MobiliteStatut,
  TestResultat,
  AntecedentType,
  BilanDocument,
  AICallAuditEntry,
  Sexe,
} from '../types'
import { anonymizePatientData, computeAge, roleTitle } from './clinicalPrompt'
import { callClaudeSecure, UnmaskedDocumentsError } from './claudeSecure'

/**
 * Compte rendu clinique structuré (Knode) — pivot hors-DM (2026-05-10).
 *
 * V10 — refonte UX/UI : l'IA ne produit plus de prose libre par section mais
 * un OBJET JSON STRUCTURÉ (anamnese, symptomatologie, drapeaux par couleur,
 * examen, tests, projet, conseils — chacun avec ses sous-champs). L'UI
 * (BilanCompteRendu) consomme ce JSON et rend des composants visuels (chips,
 * badges, accordéons, drapeaux pictogrammes).
 *
 * Garde-fou hors-DM (Règle 11 MDR) :
 *  - L'IA structure/reformule ce que le thérapeute a saisi. Elle n'invente JAMAIS.
 *  - Hypothèses, axes, conseils : uniquement si le thérapeute les a dictés.
 *  - Test mental : « un assistant admin (non-clinicien) pourrait-il remplir ce
 *    JSON à partir des données saisies ? » → oui obligatoirement.
 *
 * Auto-généré au save du bilan (fire-and-forget). Stocké dans
 * `BilanRecord.compteRendu.data`. Le `sourceHash` détecte les modifs et
 * regénère au prochain save.
 */

// ── Source hash ───────────────────────────────────────────────────────

/**
 * Version du prompt système. À INCRÉMENTER à chaque modification de
 * `buildSystemPrompt` qui change la structure de sortie. Inclus dans le hash
 * → invalide automatiquement tous les `compteRendu` existants pour forcer
 * une regénération avec la nouvelle prompt au prochain affichage.
 *
 * v1 : 5 sections en prose (motif/anamnese/examen/fonctionnel/notes)
 * v2 : 7 sections télégraphiques
 * v3 : durcissement hors-DM + aération + abréviations standards
 * v4 : JSON structuré V10 (chips/badges/accordéons côté UI)
 */
const COMPTE_RENDU_PROMPT_VERSION = 'v4-2026-05-16'

/**
 * Hash stable du contenu source + version du prompt. Si le bilan OU le prompt
 * change, le hash change et la régénération est déclenchée au prochain save.
 */
export function computeCompteRenduSourceHash(record: BilanRecord): string {
  const source = JSON.stringify({
    _promptVersion: COMPTE_RENDU_PROMPT_VERSION,
    bilanType: record.bilanType ?? '',
    zone: record.zone ?? '',
    bilanData: record.bilanData ?? {},
    notes: record.notes ?? '',
    diagnosticPhysio: record.diagnosticPhysio ?? '',
  })
  // FNV-1a 32-bit hash — stable, déterministe, suffisant pour détection de change.
  let hash = 0x811c9dc5
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i)
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export function isCompteRenduStale(record: BilanRecord): boolean {
  if (!record.compteRendu) return true
  return record.compteRendu.sourceHash !== computeCompteRenduSourceHash(record)
}

// ── Source extraction ─────────────────────────────────────────────────

interface CompteRenduSource {
  ageLine: string
  sexeLine: string
  profession: string
  sport: string
  antecedents: string
  zone: string
  bilanType: string
  douleurResume: string
  redFlagsPositifs: string
  yellowFlagsPositifs: string
  testsStr: string
  scoresStr: string
  notesLibres: string | null
  narrativeBlock: string
  diagnosticPhysio: string | null
}

function extractSource(record: BilanRecord): CompteRenduSource {
  const patient = {
    nom: record.nom,
    prenom: record.prenom,
    dateNaissance: record.dateNaissance,
    sexe: record.sexe,
  }
  const { sexe, scrub } = anonymizePatientData(patient)
  const age = computeAge(record.dateNaissance)
  const ageLine = age !== null ? `${age} ans` : 'Âge non renseigné'
  const sexeLine = sexe ? ` — Sexe : ${sexe}` : ''

  const bilanData = (record.bilanData ?? {}) as Record<string, unknown>
  const douleur = bilanData.douleur as Record<string, unknown> | undefined
  const redFlags = bilanData.redFlags as Record<string, unknown> | undefined
  const yellowFlags = bilanData.yellowFlags as Record<string, unknown> | undefined
  const scores = bilanData.scores as Record<string, unknown> | undefined
  const tests = (bilanData.testsSpecifiques ?? bilanData.tests) as Record<string, unknown> | undefined

  const flagsPositifs = (obj: Record<string, unknown> | undefined) =>
    obj
      ? Object.entries(obj).filter(([, v]) => v === 'oui' || v === true).map(([k]) => k).join(', ') || 'Aucun'
      : 'Non renseigné'

  const douleurResume = douleur
    ? [
        `EVN pire : ${douleur.evnPire ?? 'N/R'}`,
        `EVN mieux : ${douleur.evnMieux ?? 'N/R'}`,
        `EVN moyen : ${douleur.evnMoy ?? 'N/R'}`,
        `Type : ${douleur.douleurType ?? 'N/R'}`,
        `Évolution : ${douleur.situation ?? 'N/R'}`,
        `Nocturne : ${douleur.douleurNocturne ?? 'N/R'}`,
        `Dérouillage matinal : ${douleur.derouillageMatinal ?? 'N/R'}`,
      ].join(' · ')
    : 'Non renseignée'

  const narrativeReport = bilanData.narrativeReport as
    | { sections?: Array<{ id: string; titre: string; contenu: string }>; transcription?: string }
    | undefined
  const narrativeBlock =
    (bilanData._mode === 'vocal' || !!narrativeReport) && narrativeReport
      ? (() => {
          const lines: string[] = ['', 'BILAN VOCAL — données saisies par dictée :']
          if (narrativeReport.sections && narrativeReport.sections.length > 0) {
            for (const s of narrativeReport.sections) {
              const c = scrub((s.contenu ?? '').trim())
              if (!c || /^non renseigné/i.test(c)) continue
              lines.push('', `[${s.titre}]`, c)
            }
          }
          if (narrativeReport.transcription) {
            lines.push('', 'TRANSCRIPTION BRUTE :', scrub(narrativeReport.transcription).trim())
          }
          return lines.join('\n')
        })()
      : ''

  return {
    ageLine,
    sexeLine,
    profession: scrub(((record as unknown) as { profession?: string }).profession || 'Non renseignée'),
    sport: scrub(((record as unknown) as { sport?: string }).sport || 'Non renseignée'),
    antecedents: scrub(((record as unknown) as { antecedents?: string }).antecedents || 'Non renseignés'),
    zone: record.zone ?? 'Non précisée',
    bilanType: record.bilanType ?? 'Non précisé',
    douleurResume,
    redFlagsPositifs: flagsPositifs(redFlags),
    yellowFlagsPositifs: flagsPositifs(yellowFlags),
    testsStr: tests ? scrub(JSON.stringify(tests, null, 2)) : 'Non renseignés',
    scoresStr: scores ? scrub(JSON.stringify(scores, null, 2)) : 'Non renseignés',
    notesLibres: record.notes ? scrub(record.notes) : null,
    narrativeBlock,
    diagnosticPhysio: record.diagnosticPhysio?.trim() ? scrub(record.diagnosticPhysio.trim()) : null,
  }
}

// ── Anti-hallucination ────────────────────────────────────────────────

/**
 * Termes qui marquent une initiative IA (raisonnement clinique autonome).
 * Acceptés UNIQUEMENT si verbatim thérapeute. La détection iter sur les
 * champs textuels du JSON.
 */
export const COMPTE_RENDU_FORBIDDEN_TERMS = [
  /\bprobabilité/i,
  /\bje\s+recommande/i,
  /\bje\s+suggère/i,
  /\b(il|elle)\s+s'agirait/i,
  /\borient(e|er|ation)\s+vers\s+(un|le|une)/i,
  /\bsuspicion\s+de/i,
] as const

export function detectForbiddenTerms(text: string): string[] {
  const hits: string[] = []
  for (const re of COMPTE_RENDU_FORBIDDEN_TERMS) {
    const m = text.match(re)
    if (m) hits.push(m[0])
  }
  return hits
}

// ── Prompts ───────────────────────────────────────────────────────────

function buildSystemPrompt(profession?: string): string {
  const role = roleTitle(profession)
  const otherRole = role === 'kinésithérapeute' ? 'physiothérapeute' : 'kinésithérapeute'
  return `Tu es un assistant de STRUCTURATION de notes cliniques en ${role === 'kinésithérapeute' ? 'kinésithérapie' : 'physiothérapie'}.

Tu produis un OBJET JSON STRUCTURÉ qui sera consommé par l'UI Knode pour
afficher un compte-rendu interactif (chips, badges, accordéons). Tu ne
produis JAMAIS de prose libre par section. Tu produis des catégories
cliniques distinctes avec des listes d'items courts, qui seront ensuite
stylés par l'UI.

═══════════════════════════════════════════════════════
RÈGLE RÉGLEMENTAIRE ABSOLUE (Règle 11 MDR — hors-DM)
═══════════════════════════════════════════════════════
Knode n'est pas un outil d'aide au diagnostic. Tu ne produis aucune
hypothèse, recommandation ou interprétation qui ne soit pas TEXTUELLEMENT
PRÉSENTE dans la dictée du praticien.

INTERDITS ABSOLUS :
- ❌ Formuler une hypothèse diagnostique de toi-même.
- ❌ Numéroter ou hiérarchiser des hypothèses ("Hyp. 1", "Hyp. 2 (diff.)") SAUF si le thérapeute l'a fait.
- ❌ Proposer des axes thérapeutiques ou des techniques que le thérapeute n'a pas explicitement nommés.
- ❌ Inventer un exercice, un conseil, une fréquence de suivi, un RDV non dictés.
- ❌ Inventer un test, une amplitude, un drapeau, un ATCD, un traitement non saisis.
- ❌ Formuler une conclusion clinique ("évoque…", "oriente vers…", "suspicion de…") SAUF reproduction verbatim.

AUTORISÉ :
- ✅ Reformuler, condenser, structurer, catégoriser ce que le thérapeute a saisi.
- ✅ Reproduire fidèlement (en condensant légèrement) les hypothèses et conseils que le thérapeute a explicitement dictés.
- ✅ Utiliser \`null\` pour les champs non renseignés (jamais "NR" dans le JSON — l'UI décidera comment afficher null).

Test mental obligatoire avant chaque champ : « Un assistant administratif non-clinicien pourrait-il remplir ce champ uniquement à partir des données saisies ? » Si non → tu inventes, mets \`null\`.

═══════════════════════════════════════════════════════
ABRÉVIATIONS — UNIQUEMENT STANDARDS UNIVERSELS
═══════════════════════════════════════════════════════
Un kiné qui ne connaît pas Knode + un médecin généraliste doivent lire le
document sans dictionnaire.

✅ AUTORISÉES : D / G, MS / MSD / MSG, MI / MID / MIG, Bilat., Ant. / Post.,
   Int. / Ext., Flex., Ext., Abd., Add., RI, RE, Rot., Incl., AA, AP, ROT,
   EVN, EVA, DN, TTT, ATCD, Rx, IRM, TDM, MRC, Ø.

❌ INTERDITES : CCx, Dx, Lx, Sx, RDS, RDS+, Mvt, Palp., Morpho., méca., dysfct,
   prédom., irrad.
   → écris en toutes lettres : "cervicale", "dorsale", "lombaire", "sacrée",
     "reproduction des symptômes", "mouvement", "palpation", "morphostatique",
     "mécanique", "dysfonction", "prédominance", "irradiation".

═══════════════════════════════════════════════════════
ACCORD GRAMMATICAL & VOCABULAIRE
═══════════════════════════════════════════════════════
- SEXE_PATIENT en tête du prompt utilisateur dicte l'accord.
- JAMAIS d'alternance "le patient" / "la patiente". JAMAIS de forme inclusive \`(e)\`, \`·e\`, \`/\`, \`né(e)\`.
- Inconnu → masculin singulier par défaut.
- Tu rédiges au nom d'un ${role}. INTERDIT : « ${otherRole} », « kiné », « physio ».

═══════════════════════════════════════════════════════
RÈGLES DE CONTENU
═══════════════════════════════════════════════════════

1. ITEMS COURTS : chaque chip / chaque élément de liste = 2 à 10 mots maximum.
   Les détails plus longs vont dans le champ \`detail\` de l'objet correspondant
   (affiché au clic dans l'UI).

2. CATÉGORISATION RIGOUREUSE des facteurs (NE JAMAIS MÉLANGER) :
   - \`facteursAggravants\` = ce qui DÉCLENCHE ou AGGRAVE la douleur
   - \`facteursSoulageants\` = ce qui DIMINUE la douleur
   - \`facteursToleres\` = ce qui ne provoque ni n'aggrave (mouvement neutre)

3. DRAPEAUX — règles strictes sur \`statut\` :
   - \`"tous_negatifs"\` si TOUS les éléments listés/checkés sont négatifs
   - \`"positifs"\` si AU MOINS UN élément est positif
   - \`"mixte"\` si positifs ET négatifs explicitement listés
   - \`"non_renseigne"\` si la catégorie n'a PAS été abordée
   - \`elementsVerifies\` = liste de ce qui a été checké (traçabilité, même si tous négatifs)
   - \`elementsPositifs\` = liste des éléments effectivement présents

4. TESTS SPÉCIFIQUES : un objet par test. Noms verbatim (Spurling, Lasègue,
   ULTT 1, Jobe, Neer, etc.). \`resultat\` ∈ {positif, negatif, non_realise}.
   \`cote\` ∈ {"D", "G", null}. \`detail\` = phrase courte de signification clinique.

5. MOBILITÉ — \`statut\` par mouvement :
   - \`"tolere"\` : mouvement libre, sans douleur ni limitation
   - \`"peu_algiques"\` : douleur légère, amplitude conservée
   - \`"algique"\` : douleur franche sans limitation marquée
   - \`"algique_limitant"\` : douleur ET limitation d'amplitude
   - \`"limite"\` : limitation sans douleur
   - \`"NR"\` : non renseigné

6. PROJET THÉRAPEUTIQUE :
   - \`hypothesesPraticien\` = reformulation FIDÈLE de ce que le thérapeute a dit.
     PAS de numérotation "Hyp. 1/2/3" imposée. PAS d'axes inférés.
     Si rien dicté → \`null\`.
   - \`techniquesRealisees\` = liste des techniques que le thérapeute dit avoir
     réalisées EN SÉANCE. Si rien dicté → \`[]\`.

7. CONSEILS PATIENT :
   - \`exercicesEnseignes\` = uniquement les exercices que le thérapeute dit
     avoir enseignés au patient. Champ \`detail\` = modalités précises (séries,
     répétitions, position, qualité d'exécution) telles que dictées.
   - \`educationTherapeutique\` = conseils non-exercices (posture, bruxisme,
     hygiène de vie) explicitement dictés.
   - \`suivi\` = fréquence + dates RDV explicitement dictés.
   - Si rien dicté : \`exercicesEnseignes: []\`, \`educationTherapeutique: []\`,
     \`suivi: { frequence: null, prochainsRDV: [] }\`.

8. CHAMPS NON RENSEIGNÉS : utilise \`null\` (jamais "NR", "N/R", "non renseigné"
   en valeur de champ). L'UI gère l'affichage.

═══════════════════════════════════════════════════════
SCHÉMA JSON DE SORTIE — STRICT
═══════════════════════════════════════════════════════
{
  "anamnese": {
    "plaintePrincipale": string | null,
    "facteurDeclenchantPousseeActuelle": string | null,
    "contextePro": { "actuel": string | null, "anterieur": string | null } | null,
    "contexteSportif": string | null,
    "antecedents": [
      {
        "type": "chirurgical" | "medical" | "physiotherapie" | "imagerie" | "medicamenteux" | "familial" | "autre",
        "libelle": string,
        "detail": string | null,
        "lienAvecPlainte": string | null
      }
    ],
    "traitementsEnCours": [ { "libelle": string, "detail": string | null } ]
  },
  "symptomatologie": {
    "evn": { "moyen": string | null, "actuel": string | null, "pire": string | null, "meilleur": string | null },
    "retentissement": string | null,
    "topographie": { "principale": string | null, "predominance": string | null, "irradiation": string | null },
    "caractere": "Mécanique" | "Inflammatoire" | "Mixte" | "Neuropathique" | string | null,
    "facteursAggravants": [ string ],
    "facteursSoulageants": [ string ],
    "facteursToleres": [ string ],
    "douleurNocturne": { "present": boolean, "detail": string | null } | null,
    "evolutionTemporelle": string | null
  },
  "drapeaux": {
    "rouges": { "statut": "tous_negatifs"|"positifs"|"mixte"|"non_renseigne", "elementsVerifies": [string], "elementsPositifs": [string] },
    "jaunes": { ... idem },
    "bleus":  { ... idem },
    "noirs":  { ... idem }
  },
  "examenClinique": {
    "morphostatique": string | null,
    "palpation": {
      "positifs": [ { "localisation": string, "detail": string | null } ],
      "negatifs": [ string ]
    },
    "mobilite": {
      "zone": string | null,
      "items": [ { "mouvement": string, "statut": "tolere"|"peu_algiques"|"algique"|"algique_limitant"|"limite"|"NR", "detail": string | null } ],
      "amplitudesEnDegres": string | null
    },
    "neurologique": { "realise": boolean, "detail": string | null },
    "force": { "realise": boolean, "detail": string | null }
  },
  "testsSpecifiques": [
    { "nom": string, "resultat": "positif"|"negatif"|"non_realise", "cote": "D"|"G"|null, "detail": string | null }
  ],
  "projetTherapeutique": {
    "hypothesesPraticien": string | null,
    "techniquesRealisees": [ string ]
  },
  "conseilsPatient": {
    "exercicesEnseignes": [ { "nom": string, "detail": string | null } ],
    "educationTherapeutique": [ string ],
    "suivi": { "frequence": string | null, "prochainsRDV": [ string ] }
  }
}

Les 7 clés (\`anamnese\`, \`symptomatologie\`, \`drapeaux\`, \`examenClinique\`,
\`testsSpecifiques\`, \`projetTherapeutique\`, \`conseilsPatient\`) sont
OBLIGATOIRES. Sous-champs : tous présents avec \`null\` / \`[]\` si non renseigné.

═══════════════════════════════════════════════════════
EXEMPLE FEW-SHOT (sortie attendue)
═══════════════════════════════════════════════════════

Entrée fictive : "Patient 37 ans, masculin. Cervicalgie + dorsalgie hautes
chroniques, poussée aiguë depuis 3 jours plus intense que les épisodes
antérieurs. Cause non identifiée, peut-être mauvaise nuit ou faux mouvement,
aggravation lors d'exercices PDSB en formation aux soins ce matin. Travaille
en formation auxiliaire de santé (physiquement exigeante), stage d'un an
précédemment. ATCD : canal carpien opéré (paresthésies résolues, douleurs
résiduelles, non lié à la plainte actuelle), plusieurs séries de
physiothérapie cervico-dorsale l'an passé (massages + étirements, amélioration
partielle), radiographies sans lésion structurelle (origine attribuée à une
cause musculaire). Pas de traitement en cours. Douleur 8-9/10. Incapacité
fonctionnelle importante rapportée. Topographie cervicale basse + dorsale
haute, prédominance bord interne scapula droite, pas d'irradiation MS hors
tests. Mécanique. Aggravée par : flexion cervicale (mouvement le plus
provocateur), décubitus latéral avec appui MS (fatigue rapide, changements
de position fréquents), exercices PDSB. Soulagée par : chaleur locale (eau
chaude), décubitus dorsal, rotations cervicales (léger soulagement). Tolère
extension cervicale, position assise au repos. Pas de douleur nocturne
perturbant le sommeil. Évolution progressive sur plusieurs années, poussée
actuelle plus intense. Rouges : perte de poids inexpliquée, fièvre, sueurs
nocturnes, ATCD néoplasique, douleur nocturne sévère non posturale, trouble
sphinctérien, déficit moteur progressif, traumatisme à haute énergie → tous
négatifs. Jaunes positifs : inquiétude face à l'aggravation, difficulté à
réaliser les activités de formation, bruxisme. Pas de catastrophisme ni
kinésiophobie francs. Bleus positifs : contraintes posturales liées à la
formation auxiliaire de santé, contraintes de manutention importantes. Noirs
non discutés. Morphostatique : posture enroulée vers l'avant, cyphose dorsale
potentiellement majorée. Palpation rhomboïdes droits bord interne scapula
droite reproduit la douleur. Bords verticaux scapula et apophyses épineuses
dorsales : rien à signaler. Mobilité cervicale active : flexion algique et
limitante (mouvement le plus provocateur), extension tolérée, rotations peu
algiques. Amplitudes en degrés non mesurées. Neurologique (ROT, testing
sensitif segmentaire) et force (MRC) non réalisés. Spurling positif à droite,
reproduit la douleur bord interne scapula droite, pas d'irradiation MSD.
Distraction cervicale positive, soulagement à la traction axiale en
décubitus dorsal. ULTT 1 médian positif à droite, reproduit la symptomatologie
habituelle, soulagé par décharge (flexion coude + inclinaison cervicale
homolatérale). ULTT 1 médian gauche négatif. Mes hypothèses : tableau
compatible avec une cervicalgie mécanique chronique avec poussée aiguë,
dysfonction cervico-dorsale haute et irritation neurodynamique du nerf
médian droit. Composante radiculaire ou tronculaire cervicale droite évoquée
(Spurling+), sans irradiation franche dans le MS. Contractures musculaires
cervico-scapulaires chroniques entretenues par contraintes posturales et
bruxisme mentionnées en différentielle. Techniques réalisées : thérapie
manuelle cervico-dorsale, mobilité cervicale active assistée à la serviette,
glissement neurodynamique médian droit (ULTT 1 slider 20 répétitions),
automassage par balle au point douloureux scapulaire droit. Exercices
enseignés au patient : (1) mobilité cervicale active assistée à la serviette
— serviette en arrière de la nuque, légère mise en tension, rotation de la
tête, aide manuelle en fin d'amplitude avec la main homolatérale, sans
compensation par le tronc. (2) ULTT 1 D en slider — MSD en abduction, poignet
en extension maintenu, extension coude + inclinaison cervicale controlatérale,
puis flexion coude + inclinaison cervicale homolatérale, 20 répétitions,
qualité d'exécution primordiale (poignet extension + inclinaison cervicale
dans le bon sens), contre-productif si mal exécuté. (3) Automassage balle :
balle de tennis ou balle de massage contre un mur au niveau du bord interne
scapula droite. Éducation : réduction progressive du bruxisme (facteur
entretenant les tensions cervicales), vigilance posturale dans le cadre de
la formation et des activités professionnelles. Suivi : 1 séance toutes les
2 semaines. RDV : mercredi prochain à 18h, puis mardi 26 à 16h30."

Sortie attendue (JSON valide, sans markdown, sans backticks) :
{
  "anamnese": {
    "plaintePrincipale": "Cervicalgie + dorsalgie hautes chroniques. Poussée aiguë J-3, plus intense que les épisodes antérieurs.",
    "facteurDeclenchantPousseeActuelle": "Cause non identifiée (possible mauvaise nuit ou faux mouvement). Aggravation lors d'exercices PDSB ce matin.",
    "contextePro": { "actuel": "Formation auxiliaire de santé (physiquement exigeante)", "anterieur": "Stage d'1 an dans le domaine" },
    "contexteSportif": null,
    "antecedents": [
      { "type": "chirurgical", "libelle": "Canal carpien opéré", "detail": "Paresthésies résolues, douleurs résiduelles persistantes", "lienAvecPlainte": "Considéré comme non directement lié à la symptomatologie actuelle" },
      { "type": "physiotherapie", "libelle": "Plusieurs séries de physiothérapie cervico-dorsale l'année précédente", "detail": "Massages + étirements, amélioration partielle sans résolution complète", "lienAvecPlainte": null },
      { "type": "imagerie", "libelle": "Radiographies", "detail": "Sans lésion structurelle objectivée, origine attribuée à une cause musculaire", "lienAvecPlainte": null }
    ],
    "traitementsEnCours": []
  },
  "symptomatologie": {
    "evn": { "moyen": null, "actuel": "8-9/10", "pire": null, "meilleur": null },
    "retentissement": "Incapacité fonctionnelle importante rapportée",
    "topographie": { "principale": "Région cervicale basse + dorsale haute", "predominance": "Bord interne scapula D", "irradiation": "Aucune irradiation MS en dehors des tests" },
    "caractere": "Mécanique",
    "facteursAggravants": [
      "Flexion cervicale (mouvement le plus provocateur)",
      "Décubitus latéral avec appui MS",
      "Exercices PDSB en formation"
    ],
    "facteursSoulageants": [
      "Chaleur locale (eau chaude)",
      "Décubitus dorsal",
      "Rotations cervicales (léger soulagement)"
    ],
    "facteursToleres": [
      "Extension cervicale",
      "Position assise au repos"
    ],
    "douleurNocturne": { "present": false, "detail": "Pas de douleur nocturne perturbant le sommeil" },
    "evolutionTemporelle": "Progressive sur plusieurs années, poussée actuelle plus intense"
  },
  "drapeaux": {
    "rouges": {
      "statut": "tous_negatifs",
      "elementsVerifies": ["Perte de poids inexpliquée", "Fièvre", "Sueurs nocturnes", "ATCD néoplasique", "Douleur nocturne sévère non posturale", "Trouble sphinctérien", "Déficit moteur progressif", "Traumatisme à haute énergie"],
      "elementsPositifs": []
    },
    "jaunes": {
      "statut": "positifs",
      "elementsVerifies": ["Pas de catastrophisme ni kinésiophobie francs"],
      "elementsPositifs": ["Inquiétude face à l'aggravation", "Difficulté à réaliser les activités de formation", "Bruxisme"]
    },
    "bleus": {
      "statut": "positifs",
      "elementsVerifies": [],
      "elementsPositifs": ["Contraintes posturales liées à la formation", "Contraintes de manutention importantes"]
    },
    "noirs": { "statut": "non_renseigne", "elementsVerifies": [], "elementsPositifs": [] }
  },
  "examenClinique": {
    "morphostatique": "Posture enroulée vers l'avant, cyphose dorsale potentiellement majorée",
    "palpation": {
      "positifs": [ { "localisation": "Rhomboïdes D, bord interne scapula D", "detail": "Reproduit la douleur" } ],
      "negatifs": ["Bords verticaux de la scapula", "Apophyses épineuses dorsales"]
    },
    "mobilite": {
      "zone": "cervicale active",
      "items": [
        { "mouvement": "Flexion", "statut": "algique_limitant", "detail": "Mouvement le plus provocateur" },
        { "mouvement": "Extension", "statut": "tolere", "detail": null },
        { "mouvement": "Rotations", "statut": "peu_algiques", "detail": null }
      ],
      "amplitudesEnDegres": "Non mesurées"
    },
    "neurologique": { "realise": false, "detail": "ROT, testing sensitif segmentaire : non réalisés" },
    "force": { "realise": false, "detail": "Cotation MRC non effectuée" }
  },
  "testsSpecifiques": [
    { "nom": "Spurling", "resultat": "positif", "cote": "D", "detail": "Reproduit la douleur au bord interne scapula D, sans irradiation MSD" },
    { "nom": "Distraction cervicale", "resultat": "positif", "cote": null, "detail": "Soulagement à la traction axiale en décubitus dorsal" },
    { "nom": "ULTT 1 (médian)", "resultat": "positif", "cote": "D", "detail": "Reproduit la symptomatologie habituelle, soulagé par décharge (flexion coude + inclinaison cervicale homolatérale)" },
    { "nom": "ULTT 1 (médian)", "resultat": "negatif", "cote": "G", "detail": "Aucune reproduction" }
  ],
  "projetTherapeutique": {
    "hypothesesPraticien": "Tableau compatible avec une cervicalgie mécanique chronique avec poussée aiguë, associée à une dysfonction cervico-dorsale haute et une irritation neurodynamique du nerf médian droit. Composante radiculaire ou tronculaire cervicale droite évoquée (Spurling+), sans irradiation franche dans le membre supérieur. Contractures musculaires cervico-scapulaires chroniques entretenues par les contraintes posturales et le bruxisme mentionnées comme hypothèse différentielle.",
    "techniquesRealisees": [
      "Thérapie manuelle cervico-dorsale",
      "Mobilité cervicale active assistée à la serviette",
      "Glissement neurodynamique du nerf médian D (ULTT 1 slider, 20 répétitions)",
      "Automassage par balle au niveau du point douloureux scapulaire D"
    ]
  },
  "conseilsPatient": {
    "exercicesEnseignes": [
      { "nom": "Mobilité cervicale active assistée à la serviette", "detail": "Serviette placée en arrière de la nuque, légère mise en tension, rotation de la tête, aide manuelle en fin d'amplitude avec la main homolatérale, sans compensation par le tronc" },
      { "nom": "ULTT 1 D en slider", "detail": "MSD en abduction, poignet en extension maintenu, extension du coude + inclinaison cervicale controlatérale, puis flexion du coude + inclinaison cervicale homolatérale. 20 répétitions. Qualité d'exécution primordiale (poignet en extension + inclinaison cervicale dans le bon sens) — exercice contre-productif si mal exécuté" },
      { "nom": "Automassage avec balle", "detail": "Balle de tennis ou balle de massage contre un mur, au niveau du bord interne de la scapula D" }
    ],
    "educationTherapeutique": [
      "Réduction progressive du bruxisme (facteur entretenant les tensions cervicales)",
      "Vigilance posturale dans le cadre de la formation et des activités professionnelles"
    ],
    "suivi": { "frequence": "1 séance toutes les 2 semaines", "prochainsRDV": ["Mercredi suivant à 18h", "Mardi 26 à 16h30"] }
  }
}

Observe :
- Tous les champs OBLIGATOIRES présents (même \`null\` ou \`[]\`).
- Items courts (chips) — détails dans les champs \`detail\`.
- Catégorisation rigoureuse aggravants / soulageants / tolérés.
- Drapeaux avec \`statut\` correct et \`elementsVerifies\` pour traçabilité.
- Hypothèses praticien en bloc de prose fidèle, SANS numérotation Hyp. 1/2/3.

═══════════════════════════════════════════════════════
FORMAT DE RÉPONSE
═══════════════════════════════════════════════════════
Tu réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après, sans
markdown, sans backticks. Le JSON doit être directement parsable.`
}

function buildUserPrompt(src: CompteRenduSource): string {
  const sexeNorm = src.sexeLine.includes('feminin')
    ? 'feminin'
    : src.sexeLine.includes('masculin')
      ? 'masculin'
      : null
  const sexeHeader = sexeNorm
    ? `SEXE_PATIENT : ${sexeNorm}`
    : `SEXE_PATIENT : inconnu — défaut masculin singulier, JAMAIS d'inclusif.`

  const lines = [
    sexeHeader,
    '',
    `Produis le JSON V10 structuré à partir des données ci-dessous.`,
    `Règle d'or : tout ce qui n'est pas explicitement saisi/dicté ici → \`null\` (ou \`[]\` pour une liste) dans le JSON. Aucune invention.`,
    '',
    `── DONNÉES PATIENT ──`,
    `- Âge : ${src.ageLine}${src.sexeLine}`,
    `- Profession : ${src.profession}`,
    `- Activité sportive : ${src.sport}`,
    `- Antécédents (champ libre) : ${src.antecedents}`,
    `- Zone bilan : ${src.zone} (type : ${src.bilanType})`,
    '',
    `── DOULEUR ──`,
    src.douleurResume,
    '',
    `── DRAPEAUX SAISIS ──`,
    `RED FLAGS positifs : ${src.redFlagsPositifs}`,
    `YELLOW FLAGS positifs : ${src.yellowFlagsPositifs}`,
    '',
    `── EXAMEN & TESTS ──`,
    `TESTS : ${src.testsStr}`,
    `SCORES : ${src.scoresStr}`,
  ]
  if (src.notesLibres) {
    lines.push(
      '',
      `── NOTES LIBRES DU THÉRAPEUTE ──`,
      `Source primaire pour les sections \`projetTherapeutique\` et \`conseilsPatient\`.`,
      `Reprends fidèlement (en condensant) hypothèses, axes, techniques réalisées, exercices enseignés, éducation et RDV qui y figurent. Si rien → \`null\` / \`[]\` dans les champs concernés.`,
      src.notesLibres,
    )
  }
  if (src.narrativeBlock) {
    lines.push(
      '',
      '── DICTÉE VOCALE ──',
      'Source primaire — même règle de reformulation fidèle que les notes libres.',
      src.narrativeBlock,
    )
  }
  if (src.diagnosticPhysio) {
    lines.push(
      '',
      `── DIAGNOSTIC SAISI PAR LE THÉRAPEUTE ──`,
      `À reprendre quasi textuellement dans \`projetTherapeutique.hypothesesPraticien\` : ${src.diagnosticPhysio}`,
    )
  }
  return lines.join('\n')
}

// ── Parser ────────────────────────────────────────────────────────────

const VALID_ANTECEDENT_TYPES: AntecedentType[] = [
  'chirurgical', 'medical', 'physiotherapie', 'imagerie', 'medicamenteux', 'familial', 'autre',
]
const VALID_DRAPEAU_STATUT: DrapeauStatut[] = ['tous_negatifs', 'positifs', 'mixte', 'non_renseigne']
const VALID_TEST_RESULTAT: TestResultat[] = ['positif', 'negatif', 'non_realise']
const VALID_MOBILITE_STATUT: MobiliteStatut[] = ['algique_limitant', 'algique', 'tolere', 'peu_algiques', 'limite', 'NR']

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const bool = (v: unknown, def = false): boolean => (typeof v === 'boolean' ? v : def)
const arrStr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(x => (typeof x === 'string' ? x.trim() : '')).filter(Boolean) : []

function parseDrapeau(v: unknown): DrapeauGroupe {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const statut = VALID_DRAPEAU_STATUT.includes(o.statut as DrapeauStatut)
    ? (o.statut as DrapeauStatut)
    : 'non_renseigne'
  return {
    statut,
    elementsVerifies: arrStr(o.elementsVerifies),
    elementsPositifs: arrStr(o.elementsPositifs),
  }
}

function parseAntecedent(v: unknown): CompteRenduData['anamnese']['antecedents'][0] | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const libelle = str(o.libelle)
  if (!libelle) return null
  const type = VALID_ANTECEDENT_TYPES.includes(o.type as AntecedentType)
    ? (o.type as AntecedentType)
    : 'autre'
  return {
    type,
    libelle,
    detail: str(o.detail),
    lienAvecPlainte: str(o.lienAvecPlainte),
  }
}

function parseTraitement(v: unknown): { libelle: string; detail?: string | null } | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const libelle = str(o.libelle)
  if (!libelle) return null
  return { libelle, detail: str(o.detail) }
}

function parsePalpationPositif(v: unknown): { localisation: string; detail?: string | null } | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const localisation = str(o.localisation)
  if (!localisation) return null
  return { localisation, detail: str(o.detail) }
}

function parseMobiliteItem(v: unknown): { mouvement: string; statut: MobiliteStatut; detail?: string | null } | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const mouvement = str(o.mouvement)
  if (!mouvement) return null
  const statut = VALID_MOBILITE_STATUT.includes(o.statut as MobiliteStatut)
    ? (o.statut as MobiliteStatut)
    : 'NR'
  return { mouvement, statut, detail: str(o.detail) }
}

function parseTest(v: unknown): CompteRenduData['testsSpecifiques'][0] | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const nom = str(o.nom)
  if (!nom) return null
  const resultat = VALID_TEST_RESULTAT.includes(o.resultat as TestResultat)
    ? (o.resultat as TestResultat)
    : 'non_realise'
  const cote = o.cote === 'D' || o.cote === 'G' ? o.cote : null
  return { nom, resultat, cote, detail: str(o.detail) }
}

function parseExercice(v: unknown): { nom: string; detail?: string | null } | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const nom = str(o.nom)
  if (!nom) return null
  return { nom, detail: str(o.detail) }
}

interface ParseCompteRenduOptions {
  enTete: CompteRenduData['enTete']
  sourceHash: string
}

export function parseCompteRendu(raw: string, opts: ParseCompteRenduOptions): CompteRendu | null {
  let json: unknown
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    json = JSON.parse(cleaned)
  } catch {
    return null
  }
  if (!json || typeof json !== 'object') return null
  const j = json as Record<string, unknown>

  const anamneseRaw = (j.anamnese && typeof j.anamnese === 'object' ? j.anamnese : {}) as Record<string, unknown>
  const ctxProRaw = anamneseRaw.contextePro && typeof anamneseRaw.contextePro === 'object'
    ? (anamneseRaw.contextePro as Record<string, unknown>)
    : null

  const sympRaw = (j.symptomatologie && typeof j.symptomatologie === 'object' ? j.symptomatologie : {}) as Record<string, unknown>
  const evnRaw = (sympRaw.evn && typeof sympRaw.evn === 'object' ? sympRaw.evn : {}) as Record<string, unknown>
  const topoRaw = (sympRaw.topographie && typeof sympRaw.topographie === 'object' ? sympRaw.topographie : {}) as Record<string, unknown>
  const dnRaw = sympRaw.douleurNocturne && typeof sympRaw.douleurNocturne === 'object'
    ? (sympRaw.douleurNocturne as Record<string, unknown>)
    : null

  const drapeauxRaw = (j.drapeaux && typeof j.drapeaux === 'object' ? j.drapeaux : {}) as Record<string, unknown>

  const examenRaw = (j.examenClinique && typeof j.examenClinique === 'object' ? j.examenClinique : {}) as Record<string, unknown>
  const palpRaw = (examenRaw.palpation && typeof examenRaw.palpation === 'object' ? examenRaw.palpation : {}) as Record<string, unknown>
  const mobRaw = (examenRaw.mobilite && typeof examenRaw.mobilite === 'object' ? examenRaw.mobilite : {}) as Record<string, unknown>
  const neuroRaw = (examenRaw.neurologique && typeof examenRaw.neurologique === 'object' ? examenRaw.neurologique : {}) as Record<string, unknown>
  const forceRaw = (examenRaw.force && typeof examenRaw.force === 'object' ? examenRaw.force : {}) as Record<string, unknown>

  const projetRaw = (j.projetTherapeutique && typeof j.projetTherapeutique === 'object' ? j.projetTherapeutique : {}) as Record<string, unknown>
  const conseilsRaw = (j.conseilsPatient && typeof j.conseilsPatient === 'object' ? j.conseilsPatient : {}) as Record<string, unknown>
  const suiviRaw = (conseilsRaw.suivi && typeof conseilsRaw.suivi === 'object' ? conseilsRaw.suivi : {}) as Record<string, unknown>

  const data: CompteRenduData = {
    enTete: opts.enTete,
    anamnese: {
      plaintePrincipale: str(anamneseRaw.plaintePrincipale),
      facteurDeclenchantPousseeActuelle: str(anamneseRaw.facteurDeclenchantPousseeActuelle),
      contextePro: ctxProRaw
        ? { actuel: str(ctxProRaw.actuel), anterieur: str(ctxProRaw.anterieur) }
        : null,
      contexteSportif: str(anamneseRaw.contexteSportif),
      antecedents: Array.isArray(anamneseRaw.antecedents)
        ? anamneseRaw.antecedents.map(parseAntecedent).filter((x): x is CompteRenduData['anamnese']['antecedents'][0] => !!x)
        : [],
      traitementsEnCours: Array.isArray(anamneseRaw.traitementsEnCours)
        ? anamneseRaw.traitementsEnCours.map(parseTraitement).filter((x): x is { libelle: string; detail?: string | null } => !!x)
        : [],
    },
    symptomatologie: {
      evn: {
        moyen: str(evnRaw.moyen),
        actuel: str(evnRaw.actuel),
        pire: str(evnRaw.pire),
        meilleur: str(evnRaw.meilleur),
      },
      retentissement: str(sympRaw.retentissement),
      topographie: {
        principale: str(topoRaw.principale),
        predominance: str(topoRaw.predominance),
        irradiation: str(topoRaw.irradiation),
      },
      caractere: str(sympRaw.caractere),
      facteursAggravants: arrStr(sympRaw.facteursAggravants),
      facteursSoulageants: arrStr(sympRaw.facteursSoulageants),
      // Tolérance à la clé "facteursTolerés" avec accent (le prompt l'a accepté un moment).
      facteursToleres: arrStr(sympRaw.facteursToleres ?? (sympRaw as Record<string, unknown>)['facteursTolerés']),
      douleurNocturne: dnRaw ? { present: bool(dnRaw.present, false), detail: str(dnRaw.detail) } : null,
      evolutionTemporelle: str(sympRaw.evolutionTemporelle),
    },
    drapeaux: {
      rouges: parseDrapeau(drapeauxRaw.rouges),
      jaunes: parseDrapeau(drapeauxRaw.jaunes),
      bleus: parseDrapeau(drapeauxRaw.bleus),
      noirs: parseDrapeau(drapeauxRaw.noirs),
    },
    examenClinique: {
      morphostatique: str(examenRaw.morphostatique),
      palpation: {
        positifs: Array.isArray(palpRaw.positifs)
          ? palpRaw.positifs.map(parsePalpationPositif).filter((x): x is { localisation: string; detail?: string | null } => !!x)
          : [],
        negatifs: arrStr(palpRaw.negatifs),
      },
      mobilite: {
        zone: str(mobRaw.zone),
        items: Array.isArray(mobRaw.items)
          ? mobRaw.items.map(parseMobiliteItem).filter((x): x is { mouvement: string; statut: MobiliteStatut; detail?: string | null } => !!x)
          : [],
        amplitudesEnDegres: str(mobRaw.amplitudesEnDegres),
      },
      neurologique: { realise: bool(neuroRaw.realise, false), detail: str(neuroRaw.detail) },
      force: { realise: bool(forceRaw.realise, false), detail: str(forceRaw.detail) },
    },
    testsSpecifiques: Array.isArray(j.testsSpecifiques)
      ? j.testsSpecifiques.map(parseTest).filter((x): x is CompteRenduData['testsSpecifiques'][0] => !!x)
      : [],
    projetTherapeutique: {
      hypothesesPraticien: str(projetRaw.hypothesesPraticien),
      techniquesRealisees: arrStr(projetRaw.techniquesRealisees),
    },
    conseilsPatient: {
      exercicesEnseignes: Array.isArray(conseilsRaw.exercicesEnseignes)
        ? conseilsRaw.exercicesEnseignes.map(parseExercice).filter((x): x is { nom: string; detail?: string | null } => !!x)
        : [],
      educationTherapeutique: arrStr(conseilsRaw.educationTherapeutique),
      suivi: {
        frequence: str(suiviRaw.frequence),
        prochainsRDV: arrStr(suiviRaw.prochainsRDV),
      },
    },
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceHash: opts.sourceHash,
    data,
  }
}

// ── Generator ─────────────────────────────────────────────────────────

export interface GenerateCompteRenduOptions {
  apiKey: string
  record: BilanRecord
  patientKey: string
  profession?: string
  documents?: BilanDocument[]
  onAudit?: (entry: AICallAuditEntry) => void
  onUnmaskedDocsConfirm?: (docs: BilanDocument[]) => Promise<boolean>
}

function buildEnTete(record: BilanRecord): CompteRenduData['enTete'] {
  const fullName = [record.prenom?.trim(), record.nom?.trim()].filter(Boolean).join(' ')
  return {
    nomPatient: fullName || '',
    age: computeAge(record.dateNaissance),
    sexe: (record.sexe ?? null) as Sexe | null,
    zone: record.zone ?? record.bilanType ?? null,
    date: record.dateBilan ?? null,
  }
}

export async function generateCompteRendu(opts: GenerateCompteRenduOptions): Promise<CompteRendu> {
  const { apiKey, record, patientKey, profession, documents, onAudit, onUnmaskedDocsConfirm } = opts
  const sourceHash = computeCompteRenduSourceHash(record)
  const src = extractSource(record)

  const callOpts = {
    apiKey,
    systemPrompt: buildSystemPrompt(profession),
    userPrompt: buildUserPrompt(src),
    // V10 JSON structuré ~ 1500-3000 tokens en sortie selon richesse. 4500 = marge
    // confortable pour ne jamais tronquer avant fermeture du JSON.
    maxOutputTokens: 4500,
    // Faible température : on veut un JSON conforme au schéma, pas de créativité.
    temperature: 0.2,
    jsonMode: true as const,
    documents,
    patient: { nom: record.nom, prenom: record.prenom, patientKey },
    category: 'compte_rendu' as const,
    onAudit,
  }

  let raw: string
  try {
    raw = await callClaudeSecure(callOpts)
  } catch (err) {
    if (err instanceof UnmaskedDocumentsError && onUnmaskedDocsConfirm) {
      const ok = await onUnmaskedDocsConfirm(err.unmaskedDocs)
      if (!ok) throw new Error('UNMASKED_DOCS_CANCELLED')
      raw = await callClaudeSecure({ ...callOpts, userAcknowledgedUnmasked: true })
    } else {
      throw err
    }
  }

  const parsed = parseCompteRendu(raw, { sourceHash, enTete: buildEnTete(record) })
  if (!parsed) throw new Error('Réponse invalide — JSON inattendu')

  // Garde-fou : détection des termes interdits dans les champs textuels libres.
  // Scan ciblé pour éviter de polluer les logs avec les abréviations standard.
  const textsToScan: string[] = [
    parsed.data.anamnese.plaintePrincipale ?? '',
    parsed.data.anamnese.facteurDeclenchantPousseeActuelle ?? '',
    parsed.data.symptomatologie.retentissement ?? '',
    parsed.data.projetTherapeutique.hypothesesPraticien ?? '',
    ...parsed.data.anamnese.antecedents.map(a => `${a.libelle} ${a.detail ?? ''} ${a.lienAvecPlainte ?? ''}`),
  ]
  for (const t of textsToScan) {
    const hits = detectForbiddenTerms(t)
    if (hits.length > 0) {
      console.warn('[compteRendu] termes interdits détectés', hits, 'dans', t.slice(0, 80))
    }
  }

  return parsed
}
