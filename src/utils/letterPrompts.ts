import type { LetterType, LetterFormData, BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord } from '../types'
import { computeAge } from './clinicalPrompt'

export const LETTER_TYPES: Array<{
  id: LetterType
  label: string
  description: string
  color: string
}> = [
  {
    id: 'fin_pec',
    label: 'Fin de prise en charge',
    description: 'Traitement terminé, objectifs atteints',
    color: '#16a34a',
  },
  {
    id: 'fin_pec_anticipee',
    label: 'Fin de PEC anticipée',
    description: 'Arrêt avant la fin pour raison clinique',
    color: '#0891b2',
  },
  {
    id: 'demande_avis',
    label: "Demande d'avis / orientation",
    description: 'Orienter vers un autre professionnel',
    color: '#7c3aed',
  },
  {
    id: 'demande_imagerie',
    label: "Demande d'imagerie",
    description: 'Échographie, IRM, radio, scanner',
    color: '#2563eb',
  },
  {
    id: 'demande_prescription',
    label: 'Renouvellement / prescription',
    description: 'Nouvelle ordonnance ou double prescription',
    color: '#db2777',
  },
  {
    id: 'suivi',
    label: 'Courrier de suivi',
    description: "Point intermédiaire sur l'évolution",
    color: '#f59e0b',
  },
  {
    id: 'echec_pec',
    label: 'Échec de PEC / dégradation',
    description: 'Réorientation nécessaire',
    color: '#dc2626',
  },
]

export function getLetterTypeMeta(type: LetterType) {
  return LETTER_TYPES.find(t => t.id === type)!
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers de rendu — n'imprime QUE les champs réellement renseignés.
//  La règle d'or : si une donnée manque, elle DISPARAÎT du prompt — l'IA ne
//  doit jamais voir un placeholder type "(à préciser)" qu'elle pourrait
//  reproduire dans le courrier final.
// ─────────────────────────────────────────────────────────────────────────────

const isFilled = (v: string | undefined | null): v is string =>
  typeof v === 'string' && v.trim() !== '' && !/^\(.+\)$/.test(v.trim())

const fmt = (label: string, v: string | undefined | null): string =>
  isFilled(v) ? `- ${label} : ${v.trim()}` : ''

const joinLines = (parts: Array<string>): string =>
  parts.filter(s => s && s.trim() !== '').join('\n')

const sexeFromCivilite = (civ: string | undefined | null): 'feminin' | 'masculin' | null => {
  if (!civ) return null
  const c = civ.trim().toLowerCase()
  if (c === 'mme' || c === 'mme.' || c === 'madame' || c === 'mlle' || c === 'mademoiselle') return 'feminin'
  if (c === 'm.' || c === 'm' || c === 'monsieur') return 'masculin'
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
//  SYSTEM PROMPT — règles absolues partagées par tous les types de courrier.
//  Mêmes principes que les prompts du bilan initial / rapport d'évolution :
//  ancrage factuel, accord grammatical strict, terminologie verbatim, anti-
//  stigmatisation, anti-invention, format imposé.
// ─────────────────────────────────────────────────────────────────────────────

function systemPrompt(profession: string): string {
  const isPhysio = /physio/i.test(profession)
  const metier = isPhysio ? 'physiothérapie' : 'kinésithérapie'
  const titre = isPhysio ? 'physiothérapeute' : 'kinésithérapeute'
  const region = isPhysio ? 'Suisse / Belgique' : 'France'

  return `Tu es un ${titre} francophone expérimenté (${region}), chargé de rédiger un courrier professionnel adressé à un médecin prescripteur ou à un confrère. Le courrier doit pouvoir être lu en moins d'une minute par son destinataire, tenir sur UNE page A4, et présenter une image clinique fidèle, factuelle, confraternelle et exempte d'erreurs.

══════════════════════════════════════════════════════════
RÈGLES ABSOLUES — applicables à tous les types de courrier
══════════════════════════════════════════════════════════

1. ANCRAGE FACTUEL STRICT — Tu n'utilises QUE les données transmises dans le prompt utilisateur. Aucune invention, aucune extrapolation, aucun mécanisme lésionnel non explicité, aucun chiffre fabriqué (ni EVN, ni amplitude, ni pourcentage). Si une donnée n'est pas fournie, tu n'écris PAS la phrase qui en dépend — tu n'inventes ni ne mentionnes son absence.

2. INTERDICTION DES PHRASES D'ABSENCE DE DONNÉE — JAMAIS de "(à préciser)", "non précisé", "(non renseigné)", "(à compléter)", "données manquantes", "non documenté", "absence de scores objectifs", "(date non précisée)" ni aucune variante. Si la donnée manque, la phrase qui la portait est SUPPRIMÉE du courrier — pas de placeholder visible. Le médecin destinataire ne doit jamais lire qu'une information manque.

3. AUCUNE STIGMATISATION DU CLINICIEN — Tu n'écris JAMAIS de phrase qui souligne une lacune méthodologique : pas de "absence de scores fonctionnels", "tests objectifs non réalisés", "documentation insuffisante", "données quantitatives manquantes". Tu ne recommandes JAMAIS au destinataire (ni au patient) de "faire des scores HOOS/Oxford/WOMAC/KOOS/DASH", "objectiver l'amplitude", "documenter systématiquement". Les recommandations transmises sont CLINIQUES (autonomie, exercices à poursuivre, surveillance, réorientation, imagerie quand pertinent), jamais MÉTHODOLOGIQUES.

4. ACCORD GRAMMATICAL SELON SEXE_PATIENT — La valeur SEXE_PATIENT est transmise en tête du prompt utilisateur et fait foi. Si \`feminin\` : « la patiente », « âgée », « née », « adressée », « Elle », « active », « sportive ». Si \`masculin\` : « le patient », « âgé », « né », « adressé », « Il », « actif », « sportif ». Si \`inconnu\` : masculin singulier par défaut. INTERDICTIONS ABSOLUES — \`(e)\`, \`·e\`, \`·es\`, \`·ée\`, \`/\` inclusive (\`Le/la\`, \`il/elle\`, \`né(e)\`, \`adressé(e)\`), parenthèses d'ajout féminin, circonlocutions (\`cette personne\`, \`l'intéressé·e\`, \`le/la patient·e\`). Tu n'infères JAMAIS le sexe à partir d'un prénom — seule SEXE_PATIENT fait foi. Vérifie chaque occurrence avant de produire la réponse.

5. TERMINOLOGIE & ÉCHELLES — Reproduis verbatim les noms de tests, articulations, scores et acronymes transmis (Lasègue, FADDIR, HOOS, EVN, EVA…). « EVN » désigne l'Échelle Visuelle Numérique (déclarée en bilan), « EVA » l'Échelle Visuelle Analogique (notée en séance) — étiquette EXACTE selon la source, jamais de mélange « EVN/EVA » dans une même phrase, jamais de conversion entre les deux. Pas de pourcentage diagnostique, pas de probabilité chiffrée. Vocabulaire EXCLUSIVEMENT de la ${metier} — jamais l'autre terme (et l'abréviation "kiné/physio" est proscrite).

6. DATES AU FORMAT JJ/MM/AAAA — Toutes les dates citées dans le corps du courrier sont au format français court (ex. « 15/03/2026 »). Aucune date au format ISO (yyyy-mm-dd) ni en toutes lettres (« 15 mars 2026 »).

7. STRUCTURE & FORMAT — Pas d'en-tête (expéditeur / destinataire / adresse) : elle est ajoutée automatiquement par le PDF. Pas de signature : ajoutée automatiquement. Le courrier COMMENCE directement par la salutation (« Bonjour Docteur X, » ou « Cher confrère, » selon le type) et SE TERMINE par une formule de disponibilité courte (« Je reste à votre disposition pour tout complément d'information. ») suivie sur la ligne suivante de « Bien cordialement, » ou « Confraternellement, ». Aucun bloc post-signature, aucun « PJ : », aucune mention de date en tête.

8. PROSE NARRATIVE — Le corps du courrier est rédigé en prose médicale articulée (sujet + verbe + complément, phrases liées par des connecteurs cliniques). Pas de listes à puces, pas de titres, pas de gras, pas d'italique, pas de markdown. Pas de séparateurs horizontaux (\`---\`, \`***\`).

9. UNE PAGE MAXIMUM — Cible : entre 220 et 360 mots dans le CORPS (entre la salutation et la formule de politesse). Phrases concises, pas de redondance. Une information n'apparaît qu'UNE fois — aucun détail ne doit être répété d'un paragraphe à l'autre.

10. TON CONFRATERNEL — Concis, factuel, respectueux. Jamais de pathos (pas de « malheureusement », « heureusement », « impressionnant »), jamais de jugement subjectif sur le patient (« patient(e) compliant(e) » plutôt que « patient(e) très motivé(e) »). Pas de phrases de comblement creuses (« comme convenu », « comme évoqué »). Le destinataire est traité d'égal à égal.

11. PLACEHOLDERS DE PSEUDONYMISATION — Les chaînes de la forme \`__PATIENT_PRENOM__\`, \`__PATIENT_NOM__\`, \`__DESTINATAIRE_NOM__\`, \`__PRO_RECOMMANDE_NOM__\` sont des marqueurs de pseudonymisation. Tu les reproduis EXACTEMENT, sans les modifier, sans les traduire, sans les remplacer par autre chose. Ils seront réinjectés côté client.

12. SORTIE PROPRE — Tu produis UNIQUEMENT le texte du courrier, sans aucune balise, aucun préambule (« Voici le courrier : »), aucune note hors-courrier, aucune option en bas (« Souhaitez-vous… »). Réponds en texte brut directement.`
}

// ─────────────────────────────────────────────────────────────────────────────
//  HEADER PARTAGÉ — sexe + identité destinataire + identité patient + contexte
//  clinique commun. Inclut UNIQUEMENT les champs réellement renseignés.
// ─────────────────────────────────────────────────────────────────────────────

function commonHeader(d: LetterFormData): string {
  const sexe = sexeFromCivilite(d.civilitePatient)
  const sexeLine = sexe
    ? `SEXE_PATIENT : ${sexe}  ← accord grammatical OBLIGATOIRE selon cette valeur (cf. règle 4 du system prompt).`
    : `SEXE_PATIENT : inconnu  ← masculin singulier par défaut, JAMAIS de formulation inclusive.`

  // Le pseudonymizer convertit dateNaissancePatient en label "65 ans" (computeAge).
  // S'il n'a pas pu calculer (date manquante), le champ est vide et on l'ignore.
  const ageLabel = isFilled(d.dateNaissancePatient) ? d.dateNaissancePatient.trim() : null

  // Identité patient — si prenom/nom sont des placeholders pseudonymisés,
  // ils restent verbatim et seront réhydratés côté client.
  const patientId: string[] = []
  if (isFilled(d.civilitePatient)) patientId.push(d.civilitePatient.trim())
  if (isFilled(d.prenomPatient)) patientId.push(d.prenomPatient.trim())
  if (isFilled(d.nomPatient)) patientId.push(d.nomPatient.trim())
  const patientLabel = patientId.join(' ')

  // Salutation imposée selon le destinataire
  const titreDest = isFilled(d.titreDestinataire) ? d.titreDestinataire.trim() : 'Docteur'
  const nomDest = isFilled(d.nomDestinataire) ? d.nomDestinataire.trim() : null
  const salutation = nomDest
    ? `« Bonjour ${titreDest} ${nomDest}, »`
    : `« Bonjour ${titreDest}, »`

  return joinLines([
    sexeLine,
    '',
    'IDENTITÉ DU DESTINATAIRE :',
    fmt('Titre', d.titreDestinataire),
    fmt('Nom', d.nomDestinataire),
    fmt('Type', d.typeDest),
    `- Salutation imposée en ouverture du courrier : ${salutation}`,
    '',
    'IDENTITÉ DU PATIENT :',
    patientLabel ? `- Désignation à utiliser dans le courrier : ${patientLabel}` : '',
    ageLabel ? `- Âge : ${ageLabel}` : '',
    fmt('Indication / motif de PEC', d.indication),
    fmt('Date de début de PEC', d.dateDebutPec),
    fmt('Fréquence des séances', d.frequence),
    fmt('Nombre total de séances', d.nbSeances),
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
//  Per-type prompt builders. Chaque builder produit la SECTION DONNÉES + la
//  SECTION INSTRUCTIONS (structure narrative attendue + budget mots).
// ─────────────────────────────────────────────────────────────────────────────

type Builder = (d: LetterFormData, isPhysio: boolean) => string

const fin_pec: Builder = (d) => {
  const data = joinLines([
    'DONNÉES SPÉCIFIQUES — FIN DE PRISE EN CHARGE :',
    fmt('Date de fin de PEC', d.dateFinPec),
    fmt('Synthèse du bilan initial', d.resumeBilanInitial),
    fmt('Traitement effectué', d.traitement),
    fmt('Résultats / état actuel', d.resultats),
    fmt('Recommandations au patient', d.recommandations),
    fmt('Suite proposée', d.suite),
  ])
  return `${data}

STRUCTURE NARRATIVE ATTENDUE (4 paragraphes courts, ~250 mots dans le corps) :

§1 — ANNONCE & CADRAGE (1 à 2 phrases). Annonce la fin de prise en charge, rappelle qui est le patient (désignation imposée), l'indication initiale et la période de PEC (de la date de début à la date de fin, format JJ/MM/AAAA, en toutes phrases articulées).

§2 — SYNTHÈSE CLINIQUE & DÉROULÉ (3 à 4 phrases). Décris brièvement le tableau initial (motif, retentissement principal). Enchaîne sur les axes thérapeutiques mis en place pendant la PEC, en citant verbatim les techniques et le nombre de séances quand l'information est disponible.

§3 — RÉSULTATS & ÉTAT FINAL (2 à 3 phrases). Restitue les résultats objectifs et fonctionnels obtenus en utilisant les données chiffrées telles que transmises (EVN initiale → EVN finale uniquement si les deux valeurs sont fournies, gain fonctionnel, autonomie). Ton factuel, sans emphase.

§4 — RECOMMANDATIONS & SUITE (1 à 2 phrases). Énonce les conseils transmis au patient (auto-rééducation, hygiène de vie, surveillance) et la suite proposée (autonomie, reprise contact si rechute). Aucune recommandation méthodologique vers le médecin.

Termine par : « Je reste à votre disposition pour tout complément d'information. » à la ligne suivante : « Bien cordialement, ».`
}

const fin_pec_anticipee: Builder = (d, isPhysio) => {
  const metier = isPhysio ? 'physiothérapie' : 'kinésithérapie'
  const data = joinLines([
    'DONNÉES SPÉCIFIQUES — FIN DE PEC ANTICIPÉE :',
    fmt('Date de fin de PEC', d.dateFinPec),
    fmt('Nombre de séances effectuées', d.nbSeances),
    fmt('Synthèse du bilan initial', d.resumeBilanInitial),
    fmt('Traitement effectué', d.traitement),
    fmt("Raison de l'arrêt anticipé", d.raisonArret),
    fmt('État actuel du patient', d.etatActuel),
    fmt('Recommandations', d.recommandations),
  ])
  return `${data}

STRUCTURE NARRATIVE ATTENDUE (4 paragraphes courts, ~260 mots dans le corps) :

§1 — ANNONCE FACTUELLE (1 à 2 phrases). Indique la décision d'arrêter la PEC de ${metier} avant le terme prévu, à la date transmise. Pose le contexte sans emphase.

§2 — SYNTHÈSE BRÈVE DU PARCOURS (3 à 4 phrases). Rappelle l'indication initiale et le tableau d'entrée de manière condensée, puis le traitement effectué avec le nombre de séances réalisées. Pas de répétition d'informations entre §1 et §2.

§3 — RAISON DE L'ARRÊT & ÉTAT ACTUEL (2 à 3 phrases). Explique clairement la raison de l'arrêt anticipé en utilisant strictement les éléments transmis (autonomie acquise plus tôt, contrainte logistique du patient, plateau d'évolution, indication chirurgicale, etc.). Décris l'état clinique au moment de l'arrêt.

§4 — RECOMMANDATIONS & OUVERTURE (1 à 2 phrases). Énonce les conseils transmis au patient pour la suite. Mentionne explicitement la possibilité de reprise de PEC si nécessaire.

Le ton est positif si les objectifs sont atteints plus tôt que prévu, factuel sinon — jamais défaitiste. Termine par : « Je reste à votre disposition pour tout complément d'information. » à la ligne suivante : « Bien cordialement, ».`
}

const demande_avis: Builder = (d, isPhysio) => {
  const metier = isPhysio ? 'physiothérapie' : 'kinésithérapie'
  const data = joinLines([
    "DONNÉES SPÉCIFIQUES — DEMANDE D'AVIS / ORIENTATION :",
    fmt(`Synthèse de la PEC de ${metier}`, d.resumePec),
    fmt('Type de professionnel suggéré', d.typePro),
    fmt("Motif clinique de l'orientation", d.raisonOrientation),
    fmt('Le patient a donné son accord', d.accordPatient),
    fmt('Professionnel recommandé (si nominatif)', d.nomProRecommande),
  ])
  return `${data}

STRUCTURE NARRATIVE ATTENDUE (4 paragraphes courts, ~270 mots dans le corps) :

§1 — PRÉSENTATION & MOTIF DE PEC (2 phrases). Désigne le patient (désignation imposée), rappelle l'indication initiale et la date de début de PEC.

§2 — CE QUI A ÉTÉ FAIT (3 à 4 phrases). Synthèse condensée du parcours en cours : axes thérapeutiques principaux, nombre de séances effectuées, résultats actuels en restant strictement factuel. Cite verbatim les chiffres transmis (EVN, gain fonctionnel) — jamais d'invention.

§3 — RAISON DE L'ORIENTATION (2 à 3 phrases). Décris précisément le constat clinique qui motive la demande d'avis : limite d'efficacité de la PEC actuelle, signe nécessitant un avis spécialisé, comorbidité interférant avec la rééducation. Indique le type de professionnel suggéré et, si renseigné, le nom du professionnel recommandé en utilisant le placeholder fourni verbatim.

§4 — DEMANDE RESPECTUEUSE (1 à 2 phrases). Mentionne explicitement que le patient a été informé et a donné son accord (si l'indication est positive). Formule la demande en laissant la décision finale au médecin (« Je vous laisse le soin d'évaluer la pertinence d'une orientation… »).

Termine par : « Je reste à votre disposition pour tout complément d'information. » à la ligne suivante : « Confraternellement, ».`
}

const demande_imagerie: Builder = (d) => {
  const data = joinLines([
    "DONNÉES SPÉCIFIQUES — DEMANDE D'IMAGERIE :",
    fmt("Type d'imagerie demandée", d.typeImagerie),
    fmt('Zone anatomique', d.zoneAnatomique),
    fmt('Justification clinique', d.justification),
    fmt('Antécédents pertinents', d.antecedents),
  ])
  return `${data}

STRUCTURE NARRATIVE ATTENDUE (4 paragraphes courts, ~250 mots dans le corps) :

§1 — PRÉSENTATION & INDICATION DE PEC (2 phrases). Désigne le patient (désignation imposée), rappelle l'indication initiale et la date de début de PEC.

§2 — TABLEAU CLINIQUE & ÉLÉMENTS DE VIGILANCE (3 à 4 phrases). Décris en prose les éléments cliniques observés qui justifient l'imagerie : symptomatologie, tests cliniques pertinents (verbatim), évolution sous PEC. Mentionne les antécédents pertinents en une phrase si renseignés.

§3 — DEMANDE & ZONE EXACTE (1 à 2 phrases). Formule la demande d'imagerie en précisant le type exact (transmis verbatim, ex. « IRM », « échographie dynamique », « radiographie standard ») et la zone anatomique.

§4 — IMPACT THÉRAPEUTIQUE ATTENDU (1 à 2 phrases). Explique brièvement en quoi le résultat de l'imagerie permettra d'orienter la suite de la prise en charge (adaptation thérapeutique, indication chirurgicale, exclusion d'un diagnostic différentiel). Reste factuel et concis.

Formule de demande : « Seriez-vous d'accord pour prescrire cet examen ? » ou équivalent respectueux. Termine par : « Je reste à votre disposition pour tout complément d'information. » à la ligne suivante : « Bien cordialement, ».`
}

const demande_prescription: Builder = (d) => {
  const hasDouble = isFilled(d.indication1) || isFilled(d.indication2)
  const data = joinLines([
    'DONNÉES SPÉCIFIQUES — RENOUVELLEMENT / PRESCRIPTION :',
    fmt('Nature de la demande', d.natureDemande),
    fmt('Synthèse du bilan / motif clinique', d.resumeBilanInitial),
    fmt('Justification du renouvellement', d.justification),
    hasDouble ? '- Double prescription souhaitée :' : '',
    hasDouble ? fmt('  · Indication 1', d.indication1) : '',
    hasDouble ? fmt('  · Indication 2', d.indication2) : '',
  ])
  const doubleParag = hasDouble
    ? `

§4bis — DOUBLE PRESCRIPTION (uniquement si deux indications sont renseignées). Une phrase par indication, expliquant pourquoi chacune mérite une ordonnance distincte (zones différentes, modalités de PEC distinctes). Pas de redondance avec le §3.`
    : ''

  return `${data}

STRUCTURE NARRATIVE ATTENDUE (3 ou 4 paragraphes courts, ~270 mots dans le corps) :

§1 — PRÉSENTATION & CONTEXTE (2 phrases). Désigne le patient (désignation imposée), rappelle l'indication initiale et la période de PEC en cours.

§2 — DÉROULÉ & RÉSULTATS ACTUELS (3 à 4 phrases). Synthèse du parcours en cours : techniques utilisées, nombre de séances déjà effectuées, état clinique actuel chiffré quand les données sont fournies (EVN, scores, gain fonctionnel). Aucune valeur inventée.

§3 — JUSTIFICATION DU RENOUVELLEMENT (2 à 3 phrases). Explique pourquoi une nouvelle ordonnance est nécessaire : objectifs encore à atteindre, plan thérapeutique restant, jalons cliniques attendus. Reste précis et étayé par les données transmises.${doubleParag}

§${hasDouble ? '5' : '4'} — DEMANDE FORMELLE (1 phrase). Formule respectueusement la demande (« Seriez-vous d'accord pour prescrire… ? »).

Termine par : « Je reste à votre disposition pour tout complément d'information. » à la ligne suivante : « Bien cordialement, ».`
}

const suivi: Builder = (d) => {
  const isConfrere = (d.typeDest ?? '').trim().toLowerCase().includes('confrère') || (d.typeDest ?? '').trim().toLowerCase().includes('confrere')
  const data = joinLines([
    'DONNÉES SPÉCIFIQUES — COURRIER DE SUIVI INTERMÉDIAIRE :',
    fmt('Type de destinataire', d.typeDest),
    fmt('Date du bilan intermédiaire', d.dateBilanInterm),
    fmt('Synthèse du bilan initial', d.resumeBilanInitial),
    fmt('Traitement mis en place', d.traitement),
    fmt('Évolution constatée', d.evolution),
    fmt('Points positifs', d.pointsPositifs),
    fmt('Difficultés / points en cours', d.difficultes),
    fmt('Suite prévue', d.suite),
  ])
  const ouverture = isConfrere
    ? `« Cher confrère, » ou « Chère consœur, » selon le sexe du destinataire si déductible — sinon « Cher confrère, » par défaut`
    : `« Bonjour Docteur ${d.nomDestinataire ? d.nomDestinataire : '[nom]'}, » (réutilise la salutation imposée du header)`

  return `${data}

STRUCTURE NARRATIVE ATTENDUE (5 paragraphes courts, ~310 mots dans le corps) :

§1 — INTRODUCTION (1 à 2 phrases). Ouverture : ${ouverture}. Annonce qu'il s'agit d'un point d'étape, à la date du bilan intermédiaire si renseignée.

§2 — RAPPEL DU TABLEAU INITIAL (2 à 3 phrases). Désigne le patient et rappelle l'indication, la période de PEC et le tableau d'entrée — version condensée du bilan initial.

§3 — DÉROULÉ & ÉVOLUTION (3 à 4 phrases). Décris les axes thérapeutiques mis en place puis l'évolution constatée en utilisant verbatim les éléments transmis (chiffres EVN/EVA si présents, gains fonctionnels, tolérance).

§4 — ÉTAT ACTUEL & DIFFICULTÉS (2 à 3 phrases). Articule les points positifs et les difficultés rencontrées. Si une seule des deux catégories est renseignée, ne mentionne que celle-là — n'invente pas l'autre.

§5 — SUITE PRÉVUE (1 à 2 phrases). Annonce le plan de la suite de la PEC : poursuite, axes prioritaires, jalons cliniques attendus.

Termine par : « Je reste à votre disposition pour tout complément d'information. » à la ligne suivante : « ${isConfrere ? 'Confraternellement,' : 'Bien cordialement,'} ».`
}

const echec_pec: Builder = (d, isPhysio) => {
  const metier = isPhysio ? 'physiothérapie' : 'kinésithérapie'
  const data = joinLines([
    'DONNÉES SPÉCIFIQUES — ÉCHEC DE PEC / DÉGRADATION :',
    fmt('Date de fin de PEC', d.dateFinPec),
    fmt('Nombre de séances effectuées', d.nbSeances),
    fmt('Synthèse du bilan initial', d.resumeBilanInitial),
    fmt('Modalités de traitement essayées', d.traitementsEssayes),
    fmt('Constat actuel', d.constat),
    fmt('Scores fonctionnels (transmis verbatim)', d.scoresFonctionnels),
    fmt('Orientation proposée', d.orientation),
    fmt('Avis personnel / recommandations', d.avisPersonnel),
  ])
  return `${data}

STRUCTURE NARRATIVE ATTENDUE (4 paragraphes courts, ~310 mots dans le corps) :

§1 — ANNONCE FACTUELLE (2 phrases). Désigne le patient et indique l'arrêt de la PEC de ${metier} à la date transmise après le nombre de séances effectuées. Pose le contexte sans dramatisation.

§2 — RAPPEL DU TABLEAU & APPROCHES ESSAYÉES (3 à 4 phrases). Synthétise le bilan initial, puis détaille en prose les modalités thérapeutiques essayées (techniques, exercices, dosage). Pas de jugement de valeur.

§3 — CONSTAT CLINIQUE ACTUEL (2 à 3 phrases). Restitue le constat factuel : évolution stationnaire ou défavorable étayée par les chiffres transmis verbatim (EVN/EVA, scores fonctionnels, gain fonctionnel limité). Aucune valeur inventée.

§4 — ORIENTATION PROPOSÉE (2 à 3 phrases). Explique l'orientation proposée et son raisonnement clinique (réorientation médicale, imagerie complémentaire, avis spécialisé, indication chirurgicale potentielle). Le ton est constructif, jamais défaitiste.

Termine par : « Je reste à votre disposition pour tout complément d'information. » à la ligne suivante : « Confraternellement, ».`
}

const builders: Record<LetterType, Builder> = {
  fin_pec,
  fin_pec_anticipee,
  demande_avis,
  demande_imagerie,
  demande_prescription,
  suivi,
  echec_pec,
}

export function buildLetterPrompt(
  type: LetterType,
  d: LetterFormData,
  profession: string = 'Kinésithérapeute',
): { system: string; user: string } {
  const isPhysio = /physio/i.test(profession)
  const header = commonHeader(d)
  const body = builders[type](d, isPhysio)
  const meta = getLetterTypeMeta(type)

  const user = `${header}

══════════════════════════════════════════════════════════
TYPE DE COURRIER : ${meta.label.toUpperCase()}
══════════════════════════════════════════════════════════

${body}

══════════════════════════════════════════════════════════
RAPPEL FINAL — vérifie chaque point AVANT de produire le courrier :
- Le courrier commence par la salutation imposée (cf. header), JAMAIS par « Voici le courrier » ou autre préambule.
- Aucune phrase ne mentionne l'absence d'une donnée. Si une donnée n'est pas dans le header ou les données spécifiques, la phrase qui en dépendait est SUPPRIMÉE.
- Aucun placeholder de saisie (« (à préciser) », « (non renseigné) ») n'apparaît dans le courrier final.
- Accord grammatical conforme à SEXE_PATIENT — relire chaque mention du patient.
- Dates au format JJ/MM/AAAA, EVN/EVA selon source, terminologie verbatim.
- 220 à 360 mots dans le corps (entre la salutation et la formule de politesse).
- Ton confraternel, factuel, sans pathos, sans répétition.
══════════════════════════════════════════════════════════`

  return { system: systemPrompt(profession), user }
}

export function letterTitleFor(type: LetterType, d: LetterFormData): string {
  const meta = getLetterTypeMeta(type)
  const dest = d.nomDestinataire ? ` — ${d.nomDestinataire}` : ''
  const today = new Date().toLocaleDateString('fr-FR')
  return `${meta.label}${dest} — ${today}`
}

// ─────────────────────────────────────────────────────────────────────────────
//  Pré-remplissage riche d'un courrier depuis les données patient
// ─────────────────────────────────────────────────────────────────────────────

// Convertit une date française "jj/mm/aaaa" en timestamp pour tri
function parseFrDate(s: string | undefined): number {
  if (!s) return 0
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return 0
  return new Date(+m[3], +m[2] - 1, +m[1]).getTime()
}

export function buildPatientPrefill(
  patientKey: string,
  bilans: BilanRecord[],
  intermediaires: BilanIntermediaireRecord[],
  notes: NoteSeanceRecord[],
): LetterFormData {
  // ── Tri chronologique ────────────────────────────────────────────────────
  const sortedBilans = [...bilans].sort((a, b) => parseFrDate(a.dateBilan) - parseFrDate(b.dateBilan))
  const firstBilan = sortedBilans[0]
  const latestBilan = sortedBilans[sortedBilans.length - 1]
  const sortedInterm = [...intermediaires].sort((a, b) => parseFrDate(a.dateBilan) - parseFrDate(b.dateBilan))
  const latestInterm = sortedInterm[sortedInterm.length - 1]
  const sortedNotes = [...notes].sort((a, b) => parseFrDate(a.dateSeance) - parseFrDate(b.dateSeance))
  const latestNote = sortedNotes[sortedNotes.length - 1]

  // ── Identité ─────────────────────────────────────────────────────────────
  const nom = firstBilan?.nom ?? (patientKey.split(' ')[0] ?? '')
  const prenom = firstBilan?.prenom ?? (patientKey.split(' ').slice(1).join(' ') ?? '')
  const dateNaissance = firstBilan?.dateNaissance ?? ''
  const age = dateNaissance ? computeAge(dateNaissance) : null

  // ── Indication principale ───────────────────────────────────────────────
  const indication = latestBilan?.pathologie ?? latestBilan?.zone ?? ''
  const zone = latestBilan?.zone ?? ''

  // ── Dates PEC ───────────────────────────────────────────────────────────
  const dateDebut = firstBilan?.dateBilan ?? ''
  const nbSeancesTotal = bilans.length + intermediaires.length + notes.length

  // ── Résumé du bilan initial (auto-rédigé) ───────────────────────────────
  const resumeParts: string[] = []
  if (firstBilan) {
    const identite = age ? `Patient(e) de ${age} ans` : `Patient(e)`
    const patho = firstBilan.pathologie ? ` pour ${firstBilan.pathologie.toLowerCase()}` : ''
    const zoneStr = firstBilan.zone ? ` (${firstBilan.zone})` : ''
    resumeParts.push(`${identite} adressé(e)${patho}${zoneStr}.`)
    if (typeof firstBilan.evn === 'number') {
      resumeParts.push(`EVN initiale : ${firstBilan.evn}/10.`)
    }
    if (firstBilan.notes && firstBilan.notes.trim()) {
      resumeParts.push(firstBilan.notes.trim())
    }
  }
  const resumeBilanInitial = resumeParts.join(' ').trim()

  // ── Traitement effectué (synthèse depuis les notes de séance) ───────────
  const interventionsSet = new Set<string>()
  const dosagesRecents: string[] = []
  const tolerances: string[] = []
  for (const n of sortedNotes) {
    for (const i of (n.data?.interventions ?? [])) {
      if (i && i.trim()) interventionsSet.add(i.trim())
    }
    if (n.data?.detailDosage && n.data.detailDosage.trim()) {
      dosagesRecents.push(n.data.detailDosage.trim())
    }
    if (n.data?.tolerance && n.data.tolerance.trim()) {
      tolerances.push(n.data.tolerance.trim())
    }
  }
  const traitementParts: string[] = []
  if (sortedNotes.length > 0) {
    traitementParts.push(`Prise en charge sur ${sortedNotes.length} séance(s).`)
  }
  if (interventionsSet.size > 0) {
    const list = Array.from(interventionsSet).slice(0, 12).join(', ')
    traitementParts.push(`Interventions principales : ${list}.`)
  }
  if (dosagesRecents.length > 0) {
    traitementParts.push(`Dosage récent : ${dosagesRecents[dosagesRecents.length - 1]}.`)
  }
  if (tolerances.length > 0) {
    const lastTol = tolerances[tolerances.length - 1]
    if (lastTol && lastTol.length < 120) {
      traitementParts.push(`Tolérance : ${lastTol}.`)
    }
  }
  const traitement = traitementParts.join(' ').trim()

  // ── Résultats / état actuel (depuis la dernière note / intermédiaire) ──
  const resultatsParts: string[] = []
  if (latestNote?.data?.eva) {
    resultatsParts.push(`EVN actuelle : ${latestNote.data.eva}/10.`)
  } else if (typeof latestBilan?.evn === 'number' && typeof firstBilan?.evn === 'number' && latestBilan.id !== firstBilan.id) {
    resultatsParts.push(`EVN : ${firstBilan.evn}/10 → ${latestBilan.evn}/10.`)
  }
  if (latestNote?.data?.evolution && latestNote.data.evolution.trim()) {
    resultatsParts.push(latestNote.data.evolution.trim())
  }
  if (latestInterm?.analyseIA?.noteDiagnostique?.evolution) {
    resultatsParts.push(latestInterm.analyseIA.noteDiagnostique.evolution)
  }
  const resultats = resultatsParts.join(' ').trim()

  // ── Évolution narrative pour les courriers de suivi ─────────────────────
  const evolution = resultats
  const etatActuel = resultats

  // ── Constat (pour échec de PEC) ─────────────────────────────────────────
  const constat = (() => {
    if (sortedNotes.length >= 2) {
      const firstEva = parseFloat(sortedNotes[0].data?.eva ?? '')
      const lastEva = parseFloat(latestNote?.data?.eva ?? '')
      if (!isNaN(firstEva) && !isNaN(lastEva)) {
        if (lastEva > firstEva + 0.5) return `Dégradation symptomatique constatée : EVN ${firstEva}/10 → ${lastEva}/10.`
        if (Math.abs(lastEva - firstEva) <= 0.5) return `Absence d'amélioration significative : EVN ${firstEva}/10 → ${lastEva}/10.`
      }
    }
    return ''
  })()

  return {
    titreDestinataire: 'Docteur',
    nomDestinataire: '',
    civilitePatient: '',
    nomPatient: nom,
    prenomPatient: prenom,
    dateNaissancePatient: dateNaissance,
    indication,
    dateDebutPec: dateDebut,
    dateFinPec: new Date().toLocaleDateString('fr-FR'),
    frequence: '2x/semaine',
    nbSeances: String(nbSeancesTotal),
    resumeBilanInitial,
    traitement,
    resultats,
    recommandations: '',
    suite: '',
    raisonArret: '',
    etatActuel,
    typePro: '',
    resumePec: traitement,
    raisonOrientation: '',
    accordPatient: 'oui',
    nomProRecommande: '',
    typeImagerie: '',
    zoneAnatomique: zone,
    justification: '',
    antecedents: '',
    natureDemande: "Renouvellement d'ordonnance",
    indication1: '',
    indication2: '',
    typeDest: 'médecin',
    dateBilanInterm: latestInterm?.dateBilan ?? '',
    evolution,
    pointsPositifs: '',
    difficultes: '',
    traitementsEssayes: traitement,
    constat,
    scoresFonctionnels: '',
    orientation: '',
    avisPersonnel: '',
  }
}
