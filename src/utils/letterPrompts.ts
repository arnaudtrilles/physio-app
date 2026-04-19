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

function sharedFooter(profession: string): string {
  const isPhysio = /physio/i.test(profession)
  const jargon = isPhysio ? 'physiothérapeute (Suisse / Belgique)' : 'kinésithérapeute (France)'
  const metier = isPhysio ? 'physiothérapie' : 'kinésithérapie'
  return `
RÈGLES IMPORTANTES DE RÉDACTION :
- Ne commence PAS par une en-tête (expéditeur/destinataire/adresse). Elle est ajoutée automatiquement par le PDF.
- Ne termine PAS par une signature (nom, fonction). Elle est ajoutée automatiquement.
- Commence directement par "Bonjour {titre_destinataire} {nom_destinataire},".
- Termine par une formule de disponibilité ("Je reste à votre disposition pour de plus amples informations.") puis "Bien cordialement," ou "Confraternellement," sur une dernière ligne.
- Ton confraternelle, respectueux, professionnel.
- Style narratif fluide, pas de bullet points sauf si strictement nécessaire.
- 1 page maximum. Concis mais complet.
- N'invente AUCUNE donnée clinique non fournie.
- N'ajoute AUCUN commentaire ou texte hors courrier (pas de "Voici le courrier :" ni de balises).
- IMPORTANT : utilise EXCLUSIVEMENT le vocabulaire d'un ${jargon}. Parle de "${metier}" (et non de l'autre terme). Utilise "séance de ${metier}" et non "séance de kiné/physio" abrégé.
`
}

function commonBlock(d: LetterFormData) {
  return `
DONNÉES COMMUNES :
- Destinataire : ${d.titreDestinataire || 'Docteur'} ${d.nomDestinataire || '(non précisé)'}
- Patient : ${d.civilitePatient || ''} ${d.prenomPatient || ''} ${d.nomPatient || ''}${d.dateNaissancePatient ? ` (né(e) le ${d.dateNaissancePatient})` : ''}
- Indication de PEC : ${d.indication || '(non précisée)'}
- Date de début de PEC : ${d.dateDebutPec || '(non précisée)'}
- Fréquence : ${d.frequence || '(non précisée)'}
`
}

export function buildLetterPrompt(type: LetterType, d: LetterFormData, profession: string = 'Kinésithérapeute'): { system: string; user: string } {
  const isPhysio = /physio/i.test(profession)
  const title = isPhysio ? 'physiothérapeute' : 'kinésithérapeute'
  const system = `Tu es un ${title} francophone expérimenté. Tu rédiges des courriers professionnels destinés à des médecins prescripteurs ou à des confrères. Ta rédaction est concise, structurée, confraternelle et exempte d'erreurs orthographiques. Tu respectes scrupuleusement les règles de mise en forme imposées dans les instructions. Utilise exclusivement le vocabulaire de ${title === 'physiothérapeute' ? 'la physiothérapie' : 'la kinésithérapie'} — jamais l'autre terme.`

  let body = ''
  switch (type) {
    case 'fin_pec':
      body = `Rédige un courrier de FIN DE PRISE EN CHARGE — traitement terminé et objectifs atteints.
${commonBlock(d)}
- Date de fin de PEC : ${d.dateFinPec || '(à préciser)'}
- Nombre total de séances : ${d.nbSeances || '(à préciser)'}
- Résumé du bilan initial : ${d.resumeBilanInitial || '(à préciser)'}
- Traitement effectué : ${d.traitement || '(à préciser)'}
- Résultats / état actuel : ${d.resultats || '(à préciser)'}
- Recommandations au patient : ${d.recommandations || '(à préciser)'}
- Suite proposée : ${d.suite || '(à préciser)'}

Structure attendue : introduction rappelant la PEC → synthèse du bilan initial → traitement effectué → résultats obtenus → recommandations → suite proposée → formule de disponibilité + "Bien cordialement,".
`
      break
    case 'fin_pec_anticipee':
      body = `Rédige un courrier de FIN DE PEC ANTICIPÉE — arrêt avant la fin prévue pour raison clinique ou autonomie du patient.
${commonBlock(d)}
- Date de fin de PEC : ${d.dateFinPec || '(à préciser)'}
- Nombre de séances effectuées : ${d.nbSeances || '(à préciser)'}
- Résumé du bilan initial : ${d.resumeBilanInitial || '(à préciser)'}
- Traitement effectué : ${d.traitement || '(à préciser)'}
- Raison de l'arrêt anticipé : ${d.raisonArret || '(à préciser)'}
- État actuel du patient : ${d.etatActuel || '(à préciser)'}
- Recommandations : ${d.recommandations || '(à préciser)'}

Le ton doit être positif si les objectifs sont atteints plus tôt que prévu, factuel sinon. Explique clairement la décision d'arrêt anticipé.
`
      break
    case 'demande_avis':
      body = `Rédige un courrier de DEMANDE D'AVIS / ORIENTATION — le patient devrait être vu par un autre professionnel.
${commonBlock(d)}
- Résumé de la prise en charge ${isPhysio ? 'de physiothérapie' : 'de kinésithérapie'} : ${d.resumePec || '(à préciser)'}
- Type de professionnel suggéré : ${d.typePro || '(à préciser)'}
- Raison de l'orientation : ${d.raisonOrientation || '(à préciser)'}
- Le patient est d'accord : ${d.accordPatient || 'oui'}
- Professionnel recommandé (si applicable) : ${d.nomProRecommande || '—'}

Explique pourquoi l'orientation serait bénéfique. Mentionne que tu en as discuté avec le patient et son accord. Termine par "Je vous laisse le soin d'évaluer la situation" ou équivalent respectueux.
`
      break
    case 'demande_imagerie':
      body = `Rédige un courrier de DEMANDE D'IMAGERIE complémentaire.
${commonBlock(d)}
- Type d'imagerie demandée : ${d.typeImagerie || '(à préciser)'}
- Zone anatomique : ${d.zoneAnatomique || '(à préciser)'}
- Justification clinique : ${d.justification || '(à préciser)'}
- Antécédents pertinents : ${d.antecedents || '(à préciser)'}

Sois concis et précis dans la justification clinique. Explique en quoi cette imagerie guiderait la rééducation. Formule la demande de manière respectueuse ("seriez-vous d'accord pour prescrire...").
`
      break
    case 'demande_prescription':
      body = `Rédige un courrier de DEMANDE DE RENOUVELLEMENT / PRESCRIPTION.
${commonBlock(d)}
- Nature de la demande : ${d.natureDemande || '(à préciser)'}
- Résumé du bilan : ${d.resumeBilanInitial || '(à préciser)'}
- Justification : ${d.justification || '(à préciser)'}
${d.indication1 || d.indication2 ? `- Si double prescription :\n  · Indication 1 : ${d.indication1 || '—'}\n  · Indication 2 : ${d.indication2 || '—'}` : ''}

Présente le bilan du patient et argumente la nécessité d'une nouvelle prescription. Si c'est une double prescription, explique clairement pourquoi deux ordonnances distinctes sont nécessaires. Formule respectueuse ("seriez-vous d'accord pour...").
`
      break
    case 'suivi':
      body = `Rédige un COURRIER DE SUIVI intermédiaire faisant le point sur l'évolution du patient.
${commonBlock(d)}
- Type de destinataire : ${d.typeDest || 'médecin'}
- Date du bilan intermédiaire : ${d.dateBilanInterm || '(à préciser)'}
- Résumé du bilan initial : ${d.resumeBilanInitial || '(à préciser)'}
- Traitement mis en place : ${d.traitement || '(à préciser)'}
- Évolution constatée : ${d.evolution || '(à préciser)'}
- Points positifs : ${d.pointsPositifs || '(à préciser)'}
- Difficultés / points en cours : ${d.difficultes || '(à préciser)'}
- Suite prévue : ${d.suite || '(à préciser)'}

Structure narrative avec sections implicites (Bilan initial / Rééducation / État actuel / Suite prévue). Si le destinataire est un confrère ${isPhysio ? 'physiothérapeute' : 'kinésithérapeute'}, adapte l'introduction ("Cher confrère," au lieu de "Docteur").
`
      break
    case 'echec_pec':
      body = `Rédige un courrier d'ÉCHEC DE PEC / DÉGRADATION — la rééducation ${isPhysio ? 'de physiothérapie' : 'de kinésithérapie'} n'est pas efficace ou le patient se dégrade.
${commonBlock(d)}
- Date de fin de PEC : ${d.dateFinPec || '(à préciser)'}
- Nombre de séances : ${d.nbSeances || '(à préciser)'}
- Résumé du bilan initial : ${d.resumeBilanInitial || '(à préciser)'}
- Modalités de traitement essayées : ${d.traitementsEssayes || '(à préciser)'}
- Constat actuel : ${d.constat || '(à préciser)'}
- Scores fonctionnels : ${d.scoresFonctionnels || '(aucun renseigné)'}
- Orientation proposée : ${d.orientation || '(à préciser)'}
- Avis / recommandations : ${d.avisPersonnel || '(à préciser)'}

Ton factuel et professionnel, sans être défaitiste. Détaille les approches essayées et explique pourquoi ${isPhysio ? 'la physiothérapie' : 'la kinésithérapie'} n'apporte pas d'amélioration. Propose des pistes de réorientation de manière constructive. Termine par "Confraternellement,".
`
      break
  }

  return { system, user: body + '\n' + sharedFooter(profession) }
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
    const identite = age
      ? `Patient(e) de ${age} ans`
      : `Patient(e)`
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
