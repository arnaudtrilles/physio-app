import type { Question, Questionnaire, QuestionOption } from './types'
import { opts5, optsOxford, optsFreq, optsSeverity, optsQoL, optsFreqMonth, optsYesNo, optsDashDiff, sumAnswers, countAnswered, interpret, q, slider, yesNo } from './helpers'

// ─── 1. OSS — Oxford Shoulder Score ────────────────────────────────────────
const OSS_OPTS_DOULEUR = optsOxford(['Aucune', 'Légère', 'Modérée', 'Forte', 'Insupportable'])
const OSS_OPTS_DIFF = optsOxford(['Aucune difficulté', 'Quelques', 'Modérées', 'Énormément', 'Impossible'])
const OSS_OPTS_FACILEMENT = optsOxford(['Oui facilement', 'Quelques difficultés', 'Modérées', 'Énormément', 'Impossible'])

export const OSS: Questionnaire = {
  id: 'oss', title: "Oxford Shoulder Score (OSS)", short: 'OSS', period: '4 dernières semaines',
  questions: [
    q('q1', 'Pire douleur à l\'épaule', OSS_OPTS_DOULEUR),
    q('q2', "Difficultés pour s'habiller seul(e)", OSS_OPTS_DIFF),
    q('q3', 'Difficultés voiture / transports', OSS_OPTS_DIFF),
    q('q4', 'Utiliser couteau et fourchette', OSS_OPTS_FACILEMENT),
    q('q5', 'Faire les courses seul(e)', OSS_OPTS_FACILEMENT),
    q('q6', 'Porter un plateau repas', OSS_OPTS_FACILEMENT),
    q('q7', 'Se coiffer avec le bras atteint', OSS_OPTS_FACILEMENT),
    q('q8', 'Douleur la plus fréquente', optsOxford(['Aucune', 'Très légère', 'Légère', 'Modérée', 'Sévère'])),
    q('q9', 'Accrocher vêtements en hauteur', OSS_OPTS_FACILEMENT),
    q('q10', 'Se laver / sécher sous les deux bras', OSS_OPTS_FACILEMENT),
    q('q11', 'Gêne travail / activités quotidiennes', optsOxford(['Pas du tout', 'Un peu', 'Modérément', 'Beaucoup', 'Énormément'])),
    q('q12', 'Gêne la nuit au lit', optsOxford(['Jamais', '1-2 nuits', 'Quelques nuits', 'La plupart', 'Toutes les nuits'])),
  ],
  compute: (a) => {
    const total = sumAnswers(a, Array.from({ length: 12 }, (_, i) => `q${i + 1}`))
    return { value: total, display: `${total} / 48`, interpretation: total >= 40 ? 'Fonction excellente' : total >= 30 ? 'Bonne' : total >= 20 ? 'Moyenne' : 'Mauvaise' }
  },
}

// ─── 2. Constant-Murley ────────────────────────────────────────────────────
export const CONSTANT: Questionnaire = {
  id: 'constant', title: 'Score de Constant-Murley', short: 'Constant',
  questions: [
    q('a1', 'Douleur — évaluation verbale', opts5(['Intolérable', 'Moyenne', 'Modérée', 'Aucune'], [0, 5, 10, 15]), { section: 'A', sectionLabel: 'A. Douleur (/15)' }),
    { id: 'a2', label: 'Douleur — EVA (0 = aucune, 15 = sévère)', type: 'slider', min: 0, max: 15, step: 1, section: 'A' },
    q('b1', 'Activités professionnelles', opts5(['Impossible / non repris', 'Gêne importante', 'Gêne moyenne', 'Gêne modérée', 'Aucune gêne'], [0, 1, 2, 3, 4]), { section: 'B', sectionLabel: 'B. Activités quotidiennes (/20)' }),
    q('b2', 'Activités de loisirs', opts5(['Impossible', 'Gêne importante', 'Gêne moyenne', 'Gêne modérée', 'Aucune gêne'], [0, 1, 2, 3, 4]), { section: 'B' }),
    q('b3', 'Gêne dans le sommeil', opts5(['Douleurs insomniantes', 'Gêne modérée', 'Aucune gêne'], [0, 1, 2]), { section: 'B' }),
    q('b4', 'Niveau de travail avec la main', opts5(['Taille', 'Xiphoïde', 'Cou', 'Tête', 'Au-dessus de la tête'], [2, 4, 6, 8, 10]), { section: 'B' }),
    q('c1', 'Antépulsion', opts5(['0-30°', '31-60°', '61-90°', '91-120°', '121-150°', '>150°'].slice(0, 6), [0, 2, 4, 6, 8, 10]), { section: 'C', sectionLabel: 'C. Mobilité (/40)' }),
    q('c2', 'Abduction', opts5(['0-30°', '31-60°', '61-90°', '91-120°', '121-150°', '>150°'].slice(0, 6), [0, 2, 4, 6, 8, 10]), { section: 'C' }),
    q('c3', 'Rotation latérale', opts5(['Main derrière tête, coude en avant', 'Main derrière tête, coude en arrière', 'Main sur la tête, coude en avant', 'Main sur la tête, coude en arrière', 'Élévation complète depuis le sommet'], [2, 4, 6, 8, 10]), { section: 'C' }),
    q('c4', 'Rotation médiale', opts5(['Dos main fesse', 'Sacrum', 'L3', 'T12', 'T7-T8'], [2, 4, 6, 8, 10]), { section: 'C' }),
    { id: 'd1', label: 'Force — kg maintenus 5s (1 pt / 500 g, max 25)', type: 'number', min: 0, max: 12.5, step: 0.5, section: 'D', sectionLabel: 'D. Force musculaire (/25)', help: 'Si < 90° actif → 0 pt' },
  ],
  compute: (a) => {
    const a1 = (a.a1 as number) ?? 0
    const a2raw = (a.a2 as number) ?? 0
    const douleur = (a1 + (15 - a2raw)) / 2
    const activ = ((a.b1 as number) ?? 0) + ((a.b2 as number) ?? 0) + ((a.b3 as number) ?? 0) + ((a.b4 as number) ?? 0)
    const mob = ((a.c1 as number) ?? 0) + ((a.c2 as number) ?? 0) + ((a.c3 as number) ?? 0) + ((a.c4 as number) ?? 0)
    const force = Math.min(25, Math.round(((a.d1 as number) ?? 0) * 2))
    const total = Math.round(douleur + activ + mob + force)
    return {
      value: total,
      display: `${total} / 100`,
      subscores: { Douleur: Math.round(douleur), Activités: activ, Mobilité: mob, Force: force },
      interpretation: total >= 85 ? 'Excellent' : total >= 70 ? 'Bon' : total >= 55 ? 'Moyen' : 'Mauvais',
    }
  },
}

// ─── 3. DASH ───────────────────────────────────────────────────────────────
const DASH_Q1_21 = [
  'Dévisser un couvercle serré ou neuf', 'Écrire', 'Tourner une clé dans une serrure',
  'Préparer un repas', 'Ouvrir un portail / porte lourde en poussant',
  'Placer un objet sur étagère au-dessus de la tête',
  'Tâches ménagères lourdes (sols, murs)', 'Jardiner, s\'occuper des plantes',
  'Faire un lit', 'Porter sacs de provisions / mallette', 'Porter un objet lourd (>5 kg)',
  'Changer une ampoule en hauteur', 'Se laver ou sécher les cheveux', 'Se laver le dos',
  'Enfiler un pull-over', 'Couper la nourriture avec un couteau',
  'Activités loisirs sans gros effort (cartes, tricoter)',
  'Activités loisirs avec force/chocs (bricolage, tennis, golf)',
  'Activités loisirs avec liberté de mouvement (badminton, frisbee)',
  'Déplacements (transports)', 'Vie sexuelle',
]
export const DASH: Questionnaire = {
  id: 'dash', title: 'DASH — Membre supérieur', short: 'DASH', period: '7 derniers jours',
  questions: [
    ...DASH_Q1_21.map((lbl, i) => q(`q${i + 1}`, `${i + 1}. ${lbl}`, optsDashDiff)),
    q('q22', '22. Gêne dans les relations famille / amis', opts5(['Pas du tout', 'Légèrement', 'Moyennement', 'Beaucoup', 'Extrêmement'], [1, 2, 3, 4, 5])),
    q('q23', '23. Limitation travail / activités quotidiennes', opts5(['Pas du tout limité', 'Légèrement', 'Moyennement', 'Très limité', 'Incapable'], [1, 2, 3, 4, 5])),
    q('q24', '24. Douleur épaule / bras / main', opts5(['Aucune', 'Légère', 'Modérée', 'Sévère', 'Extrême'], [1, 2, 3, 4, 5])),
    q('q25', '25. Douleur en activité particulière', opts5(['Aucune', 'Légère', 'Modérée', 'Sévère', 'Extrême'], [1, 2, 3, 4, 5])),
    q('q26', '26. Picotements / fourmillements', opts5(['Aucun', 'Léger', 'Modéré', 'Sévère', 'Extrême'], [1, 2, 3, 4, 5])),
    q('q27', '27. Faiblesse', opts5(['Aucune', 'Légère', 'Modérée', 'Sévère', 'Extrême'], [1, 2, 3, 4, 5])),
    q('q28', '28. Raideur', opts5(['Aucune', 'Légère', 'Modérée', 'Sévère', 'Extrême'], [1, 2, 3, 4, 5])),
    q('q29', '29. Sommeil perturbé', opts5(['Pas du tout', 'Un peu', 'Moyennement', 'Très perturbé', 'Insomnie complète'], [1, 2, 3, 4, 5])),
    q('q30', "30. Perte de confiance / d'utilité", opts5(['Pas du tout d\'accord', 'Pas d\'accord', 'Neutre', 'D\'accord', 'Tout à fait d\'accord'], [1, 2, 3, 4, 5])),
  ],
  compute: (a) => {
    const ids = Array.from({ length: 30 }, (_, i) => `q${i + 1}`)
    const answered = countAnswered(a, ids)
    if (answered < 27) return { value: '', display: `${answered}/30 répondues — minimum 27 requis`, color: 'gray' }
    const sum = sumAnswers(a, ids)
    const score = Math.round((sum / answered - 1) * 25 * 10) / 10
    return {
      value: score, display: `${score} / 100`,
      interpretation: score <= 15 ? 'Peu d\'incapacité' : score <= 40 ? 'Incapacité modérée' : score <= 60 ? 'Incapacité sévère' : 'Incapacité majeure',
    }
  },
}

// ─── 4. Rowe Score ─────────────────────────────────────────────────────────
export const ROWE: Questionnaire = {
  id: 'rowe', title: 'Rowe Score', short: 'Rowe',
  questions: [
    q('function', 'Fonction (/50)', [
      { label: 'Aucune limitation (travail + sport)', value: 50 },
      { label: 'Aucune au travail, légère en sport', value: 35 },
      { label: 'Limitation travail bras en l\'air + sport', value: 20 },
      { label: 'Limitation marquée + douleur', value: 0 },
    ]),
    q('pain', 'Douleur (/10)', [
      { label: 'Aucune', value: 10 },
      { label: 'Légère', value: 5 },
      { label: 'Sévère', value: 0 },
    ]),
    q('stability', 'Stabilité (/30)', [
      { label: 'Aucune récidive / subluxation / appréhension', value: 30 },
      { label: 'Appréhension dans certaines positions', value: 15 },
      { label: 'Subluxation sans réduction / Apprehension test +', value: 10 },
      { label: 'Luxation récidivante', value: 0 },
    ]),
    q('mobility', 'Mobilité (/10)', [
      { label: 'Normale', value: 10 },
      { label: '<25% perte (RE, RI, élévation)', value: 5 },
      { label: '>25% perte (RE, RI, élévation)', value: 0 },
    ]),
  ],
  compute: (a) => {
    const total = ((a.function as number) ?? 0) + ((a.pain as number) ?? 0) + ((a.stability as number) ?? 0) + ((a.mobility as number) ?? 0)
    return {
      value: total, display: `${total} / 100`,
      interpretation: total >= 90 ? 'Excellent' : total >= 75 ? 'Bon' : total >= 51 ? 'Moyen' : 'Mauvais',
    }
  },
}

// ─── 5. HOOS ───────────────────────────────────────────────────────────────
const hoosItems = (prefix: string, count: number, labels: string[], opts: QuestionOption[]): Question[] =>
  labels.slice(0, count).map((lbl, i) => q(`${prefix}${i + 1}`, `${prefix.toUpperCase()}${i + 1}. ${lbl}`, opts))

export const HOOS: Questionnaire = {
  id: 'hoos', title: 'HOOS — Hanche', short: 'HOOS', period: '8 derniers jours',
  questions: [
    q('s1', 'S1. Gonflement', optsFreq(), { section: 'S', sectionLabel: 'Symptômes' }),
    q('s2', 'S2. Craquements', optsFreq(), { section: 'S' }),
    q('s3', 'S3. Difficulté à écarter les jambes', optsSeverity(), { section: 'S' }),
    q('s4', 'S4. Raideur matinale', optsSeverity(), { section: 'S' }),
    q('s5', 'S5. Raideur après repos', optsSeverity(), { section: 'S' }),
    q('p1', 'P1. Fréquence de la douleur', optsFreqMonth(), { section: 'P', sectionLabel: 'Douleur' }),
    ...hoosItems('p', 9, ['', 'En étendant complètement', 'En pliant complètement', 'Marche terrain plat', 'Escaliers', 'Au lit la nuit', 'Assis / couché', 'Debout', 'Surface dure', 'Surface irrégulière'].slice(1), optsSeverity()).map(qu => ({ ...qu, section: 'P' })),
    ...hoosItems('a', 17, ['Descendre escaliers', 'Monter escaliers', 'Se relever assis', 'Rester debout', 'Se pencher ramasser', 'Marche terrain plat', 'Monter/descendre voiture', 'Faire courses', 'Mettre chaussettes/collants', 'Sortir du lit', 'Enlever chaussettes', 'Se retourner en étant couché', 'Entrer/sortir baignoire', 'Rester assis', "S'asseoir/relever toilettes", 'Gros travaux ménagers', 'Petits travaux ménagers'], optsSeverity()).map(qu => ({ ...qu, section: 'A', sectionLabel: 'Fonction vie quotidienne' })),
    ...hoosItems('sp', 4, ['Rester accroupi', 'Courir', 'Tourner / pivoter', 'Surface irrégulière'], optsSeverity()).map(qu => ({ ...qu, section: 'SP', sectionLabel: 'Sport et loisirs' })),
    q('q1', 'Q1. Pensez-vous souvent à votre problème de hanche ?', optsFreqMonth(), { section: 'Q', sectionLabel: 'Qualité de vie' }),
    q('q2', 'Q2. Modifié votre façon de vivre ?', optsQoL(), { section: 'Q' }),
    q('q3', 'Q3. Manque de confiance dû à la hanche ?', optsQoL(), { section: 'Q' }),
    q('q4', 'Q4. Êtes-vous gêné par votre hanche ?', opts5(['Pas du tout', 'Un peu', 'Modérément', 'Beaucoup', 'Extrêmement'], [0, 1, 2, 3, 4]), { section: 'Q' }),
  ],
  compute: (a) => {
    const sub = (ids: string[]) => {
      const sum = sumAnswers(a, ids)
      return Math.round(100 - (sum * 100) / (4 * ids.length))
    }
    const S = sub(['s1', 's2', 's3', 's4', 's5'])
    const P = sub(Array.from({ length: 10 }, (_, i) => `p${i + 1}`))
    const A = sub(Array.from({ length: 17 }, (_, i) => `a${i + 1}`))
    const SP = sub(Array.from({ length: 4 }, (_, i) => `sp${i + 1}`))
    const Q = sub(['q1', 'q2', 'q3', 'q4'])
    const global = Math.round((S + P + A + SP + Q) / 5)
    return { value: global, display: `${global} / 100 (global)`, subscores: { Symptômes: S, Douleur: P, 'Vie quot.': A, Sport: SP, QoL: Q } }
  },
}

// ─── 6. Oxford Hip Score ───────────────────────────────────────────────────
export const OXFORD_HIP: Questionnaire = {
  id: 'oxfordHip', title: 'Oxford Hip Score', short: 'Oxford Hip', period: '4 dernières semaines',
  questions: [
    q('q1', 'Douleur habituelle à la hanche', optsOxford(['Aucune', 'Minime', 'Légère', 'Modérée', 'Sévère'])),
    q('q2', 'Difficultés se laver / sécher le corps', optsOxford(['Aucune', 'Minimes', 'Modérées', 'Majeures', 'Impossible'])),
    q('q3', 'Entrer / sortir voiture ou transports', optsOxford(['Aucune', 'Minimes', 'Modérées', 'Majeures', 'Impossible'])),
    q('q4', 'Mettre bas, collants ou chaussettes', optsOxford(['Oui facilement', 'Très peu de difficultés', 'Quelques', 'Beaucoup', 'Impossible'])),
    q('q5', 'Faire les courses seul(e)', optsOxford(['Oui facilement', 'Très peu', 'Quelques', 'Beaucoup', 'Impossible'])),
    q('q6', 'Durée de marche avant douleur importante', optsOxford(['Pas de douleur / >30 min', '16-30 min', '5-15 min', 'Autour de la maison', 'Douleur sévère à la maison'])),
    q('q7', 'Monter un étage d\'escaliers', optsOxford(['Oui facilement', 'Très peu', 'Quelques', 'Beaucoup', 'Impossible'])),
    q('q8', "Douleur en se levant d'une chaise", optsOxford(['Pas du tout', 'Légèrement', 'Modérément', 'Très douloureux', 'Insupportable'])),
    q('q9', 'Boiterie en marchant', optsOxford(['Rarement / jamais', 'Quelquefois / début', 'Souvent', 'La plupart du temps', 'Tout le temps'])),
    q('q10', 'Douleur soudaine vive et intense', optsOxford(['Jamais', '1-2 jours', 'Quelques jours', 'La plupart des jours', 'Chaque jour'])),
    q('q11', 'Gêne dans travail / activités habituelles', optsOxford(['Pas du tout', 'Un peu', 'Modérément', 'Fortement', 'Tout le temps'])),
    q('q12', 'Douleur au lit la nuit', optsOxford(['Jamais', '1-2 nuits', 'Quelques nuits', 'La plupart des nuits', 'Toutes les nuits'])),
  ],
  compute: (a) => {
    const total = sumAnswers(a, Array.from({ length: 12 }, (_, i) => `q${i + 1}`))
    return { value: total, display: `${total} / 48`, interpretation: total >= 40 ? 'Excellent' : total >= 30 ? 'Bon' : total >= 20 ? 'Moyen' : 'Mauvais' }
  },
}

// ─── 7. KOOS ───────────────────────────────────────────────────────────────
export const KOOS: Questionnaire = {
  id: 'koos', title: 'KOOS — Genou', short: 'KOOS', period: '8 derniers jours',
  questions: [
    q('s1', 'S1. Gonflement', optsFreq(), { section: 'S', sectionLabel: 'Symptômes' }),
    q('s2', 'S2. Craquements', optsFreq(), { section: 'S' }),
    q('s3', 'S3. Accrochage / blocage', optsFreq(), { section: 'S' }),
    q('s4', 'S4. Extension complète possible', opts5(['Toujours', 'Souvent', 'Parfois', 'Rarement', 'Jamais'], [0, 1, 2, 3, 4]), { section: 'S' }),
    q('s5', 'S5. Flexion complète possible', opts5(['Toujours', 'Souvent', 'Parfois', 'Rarement', 'Jamais'], [0, 1, 2, 3, 4]), { section: 'S' }),
    q('s6', 'S6. Raideur matinale', optsSeverity(), { section: 'S' }),
    q('s7', 'S7. Raideur après repos', optsSeverity(), { section: 'S' }),
    q('p1', 'P1. Fréquence de la douleur', optsFreqMonth(), { section: 'P', sectionLabel: 'Douleur' }),
    ...['En pivotant', 'En étendant', 'En pliant', 'Marche plat', 'Escaliers', 'Au lit la nuit', 'Assis/couché', 'Debout'].map((lbl, i) => q(`p${i + 2}`, `P${i + 2}. ${lbl}`, optsSeverity(), { section: 'P' })),
    ...['Descendre escaliers', 'Monter escaliers', 'Se relever assis', 'Rester debout', 'Se pencher ramasser', 'Marche plat', 'Voiture', 'Courses', 'Chaussettes/collants', 'Sortir du lit', 'Enlever chaussettes', 'Se retourner couché', 'Baignoire', 'Rester assis', 'Toilettes', 'Gros travaux', 'Petits travaux'].map((lbl, i) => q(`a${i + 1}`, `A${i + 1}. ${lbl}`, optsSeverity(), { section: 'A', sectionLabel: 'Vie quotidienne' })),
    ...['Rester accroupi', 'Courir', 'Sauter', 'Tourner/pivoter', 'Rester à genoux'].map((lbl, i) => q(`sp${i + 1}`, `SP${i + 1}. ${lbl}`, optsSeverity(), { section: 'SP', sectionLabel: 'Sport et loisirs' })),
    q('q1', 'Q1. Pensez-vous souvent à votre problème de genou ?', optsFreqMonth(), { section: 'Q', sectionLabel: 'Qualité de vie' }),
    q('q2', 'Q2. Modifié votre façon de vivre ?', optsQoL(), { section: 'Q' }),
    q('q3', 'Q3. Manque de confiance dû au genou ?', optsQoL(), { section: 'Q' }),
    q('q4', 'Q4. Êtes-vous gêné par votre genou ?', opts5(['Pas du tout', 'Un peu', 'Modérément', 'Beaucoup', 'Extrêmement'], [0, 1, 2, 3, 4]), { section: 'Q' }),
  ],
  compute: (a) => {
    const sub = (ids: string[]) => {
      const sum = sumAnswers(a, ids)
      return Math.round(100 - (sum * 100) / (4 * ids.length))
    }
    const S = sub(['s1', 's2', 's3', 's4', 's5', 's6', 's7'])
    const P = sub(Array.from({ length: 9 }, (_, i) => `p${i + 1}`))
    const A = sub(Array.from({ length: 17 }, (_, i) => `a${i + 1}`))
    const SP = sub(Array.from({ length: 5 }, (_, i) => `sp${i + 1}`))
    const Q = sub(['q1', 'q2', 'q3', 'q4'])
    const global = Math.round((S + P + A + SP + Q) / 5)
    return { value: global, display: `${global} / 100 (global)`, subscores: { Symptômes: S, Douleur: P, 'Vie quot.': A, Sport: SP, QoL: Q } }
  },
}

// ─── 8. F-AKPS ─────────────────────────────────────────────────────────────
export const FAKPS: Questionnaire = {
  id: 'fakps', title: 'F-AKPS / Kujala', short: 'F-AKPS',
  questions: [
    q('q1', 'Boiterie', opts5(['Aucune', 'Légère intermittente', 'Constante'], [5, 3, 0])),
    q('q2', 'Station debout', opts5(['Complète sans douleur', 'Douloureuse', 'Impossible'], [5, 3, 0])),
    q('q3', 'Marcher', opts5(['Illimité', '>2 km', '1-2 km', 'Incapable'], [5, 3, 2, 0])),
    q('q4', 'Escaliers', opts5(['Aucune difficulté', 'Légère douleur descente', 'Douleur montée+descente', 'Incapable'], [10, 8, 5, 0])),
    q('q5', "S'accroupir", opts5(['Aucune difficulté', 'Douloureux si répété', 'Douloureux chaque fois', 'Possible avec décharge', 'Incapable'], [5, 4, 3, 2, 0])),
    q('q6', 'Courir', opts5(['Aucune difficulté', 'Douleur après >2 km', 'Légère douleur début', 'Douleur sévère', 'Incapable'], [10, 8, 6, 3, 0])),
    q('q7', 'Sauter', opts5(['Aucune difficulté', 'Légère difficulté', 'Douleur constante', 'Incapable'], [10, 7, 2, 0])),
    q('q8', 'Position assise prolongée genoux fléchis', opts5(['Aucune', 'Douleur après exercice', 'Douleur constante', "Obligation d'étendre", 'Incapable'], [10, 8, 6, 4, 0])),
    q('q9', 'Douleur', opts5(['Aucune', 'Légère occasionnelle', 'Perturbe sommeil', 'Occas. sévère', 'Constante sévère'], [10, 8, 6, 3, 0])),
    q('q10', 'Gonflement', opts5(['Aucun', 'Après effort intense', 'Après AVQ', 'Tous les soirs', 'Constant'], [10, 8, 6, 4, 0])),
    q('q11', 'Subluxations rotule', opts5(['Aucune', 'Occas. sport', 'Occas. quotidien', '≥1 luxation', '>2 luxations'], [10, 6, 4, 2, 0])),
    q('q12', 'Fonte musculaire cuisse', opts5(['Aucune', 'Légère', 'Sévère'], [5, 3, 0])),
    q('q13', 'Perte de flexion', opts5(['Aucune', 'Légère', 'Sévère'], [5, 3, 0])),
  ],
  compute: (a) => {
    const total = sumAnswers(a, Array.from({ length: 13 }, (_, i) => `q${i + 1}`))
    return { value: total, display: `${total} / 100`, interpretation: total >= 85 ? 'Peu symptomatique' : total >= 70 ? 'Incapacité modérée' : 'Incapacité marquée' }
  },
}

// ─── 9. IKDC (simplifié : transformation linéaire) ─────────────────────────
export const IKDC: Questionnaire = {
  id: 'ikdc', title: 'IKDC Subjective', short: 'IKDC', period: '4 dernières semaines',
  questions: [
    q('q1', 'Plus haut niveau d\'activité sans douleur', opts5(['Très intense (saut/rotation)', 'Intense (ski/tennis)', 'Modéré (jogging)', 'Doux (marche)', 'Aucune possible'], [4, 3, 2, 1, 0])),
    { id: 'q2', label: 'Fréquence douleur', type: 'slider', min: 0, max: 10, step: 1, labelMin: 'Jamais', labelMax: 'Constamment' },
    { id: 'q3', label: 'Intensité douleur', type: 'slider', min: 0, max: 10, step: 1, labelMin: 'Aucune', labelMax: 'Pire imaginable' },
    q('q4', 'Raideur / gonflement', opts5(['Pas du tout', 'Un peu', 'Moyennement', 'Beaucoup', 'Énormément'], [4, 3, 2, 1, 0])),
    q('q5', 'Plus haut niveau sans gonflement', opts5(['Très intense', 'Intense', 'Modéré', 'Doux', 'Aucun'], [4, 3, 2, 1, 0])),
    q('q6', 'Blocage / accrochage', opts5(['Non', 'Oui'], [1, 0])),
    q('q7', 'Plus haut niveau sans dérobement', opts5(['Très intense', 'Intense', 'Modéré', 'Doux', 'Aucun'], [4, 3, 2, 1, 0])),
    q('q8', "Plus haut niveau d'activité régulière", opts5(['Très intense', 'Intense', 'Modéré', 'Doux', 'Aucun'], [4, 3, 2, 1, 0])),
    ...['Monter escaliers', 'Descendre escaliers', "S'agenouiller (appui devant)", "S'accroupir", "S'asseoir", 'Se lever d\'une chaise', 'Courir ligne droite', 'Sauter réception jambe faible', "S'arrêter et repartir"].map((lbl, i) =>
      q(`q9_${i + 1}`, `9.${i + 1}. ${lbl}`, opts5(['Pas difficile', 'Légèrement difficile', 'Très difficile', 'Impossible'], [3, 2, 1, 0]))
    ),
    { id: 'q10a', label: 'Fonction genou AVANT accident', type: 'slider', min: 0, max: 10, step: 1 },
    { id: 'q10b', label: 'Fonction genou ACTUELLE', type: 'slider', min: 0, max: 10, step: 1 },
  ],
  compute: (a) => {
    // Simplified linear transformation: sum / max * 100
    const ids = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9_1', 'q9_2', 'q9_3', 'q9_4', 'q9_5', 'q9_6', 'q9_7', 'q9_8', 'q9_9', 'q10b']
    // Q2/Q3 are inverted (higher raw = worse) so we convert to 10-v
    let sum = 0
    let max = 0
    for (const id of ids) {
      const v = a[id]
      if (typeof v !== 'number') continue
      if (id === 'q2' || id === 'q3') { sum += (10 - v); max += 10 }
      else if (id === 'q10b') { sum += v; max += 10 }
      else if (id.startsWith('q9_')) { sum += v; max += 3 }
      else if (id === 'q6') { sum += v; max += 1 }
      else { sum += v; max += 4 }
    }
    const pct = max > 0 ? Math.round((sum / max) * 100) : 0
    return { value: pct, display: `${pct} / 100`, interpretation: pct >= 80 ? 'Peu de limitation' : pct >= 60 ? 'Limitation modérée' : 'Limitation importante' }
  },
}

// ─── 10. ACL-RSI ───────────────────────────────────────────────────────────
const ACL_RSI_QS: [string, string, string][] = [
  ['q1', 'Pratiquer le sport au même niveau qu\'avant', '0 = pas du tout sûr ... 10 = totalement sûr'],
  ['q2', 'Risque de se blesser à nouveau', '0 = extrêmement probable ... 10 = pas du tout'],
  ['q3', "Inquiet à l'idée de reprendre", '0 = extrêmement inquiet ... 10 = pas du tout'],
  ['q4', 'Genou stable pendant le sport', '0 = pas du tout sûr ... 10 = totalement sûr'],
  ['q5', 'Pratiquer sans se soucier du genou', '0 = pas du tout sûr ... 10 = totalement sûr'],
  ['q6', 'Frustré de devoir tenir compte du genou', '0 = extrêmement frustré ... 10 = pas du tout'],
  ['q7', 'Crainte de se blesser à nouveau', '0 = crainte extrême ... 10 = aucune crainte'],
  ['q8', 'Genou peut résister aux contraintes', '0 = pas du tout sûr ... 10 = totalement sûr'],
  ['q9', 'Peur de se reblesser accidentellement', '0 = très peur ... 10 = pas du tout peur'],
  ['q10', "Idée de réopération empêche de pratiquer", '0 = tout le temps ... 10 = à aucun moment'],
  ['q11', 'Confiant dans sa capacité à bien pratiquer', '0 = pas du tout ... 10 = totalement'],
  ['q12', "Détendu à l'idée de pratiquer", '0 = pas du tout ... 10 = totalement'],
]
export const ACL_RSI: Questionnaire = {
  id: 'aclRsi', title: 'ACL-RSI', short: 'ACL-RSI',
  questions: ACL_RSI_QS.map(([id, lbl, help]) => ({ id, label: lbl, type: 'slider', min: 0, max: 10, step: 1, help })),
  compute: (a) => {
    const sum = sumAnswers(a, ACL_RSI_QS.map(([id]) => id))
    const pct = Math.round((sum * 100) / 120)
    return { value: pct, display: `${pct} / 100`, interpretation: pct >= 60 ? 'Bon pronostic (≥60 à 6 mois)' : 'Réponse psychologique limitée' }
  },
}

// ─── 11. F-FAAM ────────────────────────────────────────────────────────────
const FAAM_OPTS: QuestionOption[] = [
  { label: 'Aucune difficulté', value: 4 },
  { label: 'Légère', value: 3 },
  { label: 'Modérée', value: 2 },
  { label: 'Sévère', value: 1 },
  { label: 'Incapable', value: 0 },
  { label: 'N/A', value: -1 },
]
const FAAM_AVQ = [
  'Se tenir debout', 'Marcher terrain régulier', 'Pieds nus terrain régulier', 'Monter une pente', 'Descendre une pente',
  'Monter escaliers', 'Descendre escaliers', 'Marcher terrain irrégulier', 'Monter/descendre trottoir', "S'accroupir",
  'Pointe des pieds', 'Premiers pas (matin)', 'Marcher ≤5 min', 'Marcher ~10 min', 'Marcher ≥15 min',
  'Tâches ménagères', 'AVQ', 'Soins personnels', 'Travail léger à modéré', 'Travail lourd', 'Loisirs',
]
const FAAM_SPORT = [
  'Courir', 'Sauter', 'Réception saut', 'Démarrer/arrêter rapidement', 'Pas chassés', 'Sports faible impact',
  'Technique habituelle', 'Durée souhaitée du sport',
]
export const FFAAM: Questionnaire = {
  id: 'ffaam', title: 'F-FAAM', short: 'F-FAAM',
  questions: [
    ...FAAM_AVQ.map((lbl, i) => q(`avq${i + 1}`, `${i + 1}. ${lbl}`, FAAM_OPTS, { section: 'AVQ', sectionLabel: 'Sous-échelle AVQ (21 items)' })),
    ...FAAM_SPORT.map((lbl, i) => q(`sport${i + 1}`, `${i + 1}. ${lbl}`, FAAM_OPTS, { section: 'SPORT', sectionLabel: 'Sous-échelle Sport (8 items)' })),
  ],
  compute: (a) => {
    const sub = (prefix: string, n: number) => {
      let sum = 0; let answered = 0
      for (let i = 1; i <= n; i++) {
        const v = a[`${prefix}${i}`]
        if (typeof v === 'number' && v >= 0) { sum += v; answered++ }
      }
      return answered > 0 ? Math.round((sum / (4 * answered)) * 100) : 0
    }
    const avq = sub('avq', 21)
    const sport = sub('sport', 8)
    const global = Math.round((avq + sport) / 2)
    return {
      value: global, display: `AVQ ${avq}% · Sport ${sport}%`,
      subscores: { AVQ: avq, Sport: sport },
      interpretation: avq < 80 || sport < 90 ? 'Instabilité chronique probable' : 'Fonction préservée',
    }
  },
}

// ─── 12. CAIT ──────────────────────────────────────────────────────────────
export const CAIT: Questionnaire = {
  id: 'cait', title: 'Cumberland Ankle Instability Tool', short: 'CAIT',
  questions: [
    q('q1', 'Douleurs à la cheville', [
      { label: 'Jamais', value: 5 }, { label: 'Pendant le sport', value: 4 },
      { label: 'Course sur surfaces irrégulières', value: 3 }, { label: 'Course sur surfaces planes', value: 2 },
      { label: 'Marche sur surfaces irrégulières', value: 1 }, { label: 'Marche sur surfaces planes', value: 0 },
    ]),
    q('q2', 'Cheville instable quand…', [
      { label: 'Jamais', value: 4 }, { label: 'Parfois pendant le sport', value: 3 },
      { label: 'Chaque fois pendant le sport', value: 2 }, { label: 'Parfois AVQ', value: 1 }, { label: 'Fréquemment AVQ', value: 0 },
    ]),
    q('q3', 'Pivot brusque et instabilité', [
      { label: 'Jamais', value: 3 }, { label: 'Parfois (course)', value: 2 },
      { label: 'Souvent (course)', value: 1 }, { label: 'Marche', value: 0 },
    ]),
    q('q4', 'Descente escaliers et instabilité', [
      { label: 'Jamais', value: 3 }, { label: 'Si vite', value: 2 },
      { label: 'Occasionnellement', value: 1 }, { label: 'Toujours', value: 0 },
    ]),
    q('q5', 'Sur une jambe et instabilité', [
      { label: 'Jamais', value: 2 }, { label: 'Pointe du pied', value: 1 }, { label: 'Pied à plat', value: 0 },
    ]),
    q('q6', 'Instabilité quand…', [
      { label: 'Jamais', value: 3 }, { label: 'Saut latéral', value: 2 }, { label: 'Saut sur place', value: 1 }, { label: 'Saut', value: 0 },
    ]),
    q('q7', 'Instabilité quand…', [
      { label: 'Jamais', value: 4 }, { label: 'Course irrégulier', value: 3 },
      { label: 'Trot irrégulier', value: 2 }, { label: 'Marche irrégulier', value: 1 }, { label: 'Marche plan', value: 0 },
    ]),
    q('q8', 'Arrêter une torsion de cheville', [
      { label: 'Immédiatement', value: 3 }, { label: 'Souvent', value: 2 },
      { label: 'Parfois', value: 1 }, { label: 'Jamais', value: 0 }, { label: 'Jamais tordu', value: 3 },
    ]),
    q('q9', 'Retour à la normale après torsion', [
      { label: 'Presque immédiatement', value: 3 }, { label: '<1 jour', value: 2 },
      { label: '1-2 jours', value: 1 }, { label: '>2 jours', value: 0 }, { label: 'Jamais tordu', value: 3 },
    ]),
  ],
  compute: (a) => {
    const total = sumAnswers(a, Array.from({ length: 9 }, (_, i) => `q${i + 1}`))
    return {
      value: total, display: `${total} / 30`,
      interpretation: total <= 25 ? 'Instabilité chronique probable (≤25)' : 'Pas d\'instabilité chronique',
      color: total <= 25 ? 'red' : 'green',
    }
  },
}

// ─── 13. NDI ───────────────────────────────────────────────────────────────
const NDI_SECTIONS: [string, string[]][] = [
  ['Intensité des douleurs cervicales', ['Pas de douleur', 'Très légère', 'Modérée', 'Assez forte', 'Très forte', 'Pire imaginable']],
  ['Soins personnels', ['Sans augmenter douleur', 'Augmente douleur', 'Lentement et précaution', "Besoin d'un peu d'aide", "Besoin d'aide tous les jours", 'Reste au lit']],
  ['Soulever des charges', ['Objets lourds sans douleur', 'Lourds mais augmente douleur', 'Pas depuis sol mais si bien placés', 'Légers si bien placés', 'Très légers seulement', 'Ne peut rien soulever']],
  ['Lecture', ['Autant que voulu sans douleur', 'Légères douleurs', 'Douleurs modérées', 'Pas autant que voulu', 'Peut à peine lire', 'Ne peut pas lire']],
  ['Maux de tête', ['Aucun', 'Légers peu fréquents', 'Modérés peu fréquents', 'Modérés fréquents', 'Intenses fréquents', 'Presque tout le temps']],
  ['Concentration', ['Sans difficulté', 'Légères difficultés', 'Relativement difficile', 'Beaucoup de difficultés', 'Énormes difficultés', 'Ne peut pas se concentrer']],
  ['Travail', ['Autant que voulu', 'Travail courant seulement', 'Plus grande partie', 'Ne peut pas faire courant', 'Peut à peine travailler', 'Ne peut pas travailler']],
  ['Conduite', ['Sans douleur', 'Légères douleurs', 'Douleurs modérées', 'Pas autant que voulu', 'Peut à peine conduire', 'Ne conduit pas']],
  ['Sommeil', ['Pas perturbé', 'À peine perturbé (<1h)', 'Un peu perturbé (1-2h)', 'Modérément (2-3h)', 'Très perturbé (3-5h)', 'Complètement perturbé (5-7h)']],
  ['Loisirs', ['Toutes activités sans douleur', 'Quelques douleurs', 'La plupart mais pas toutes', 'Quelques unes seulement', 'Peut à peine participer', 'Aucune activité']],
]
export const NDI: Questionnaire = {
  id: 'ndi', title: 'NDI — Neck Disability Index', short: 'NDI',
  questions: NDI_SECTIONS.map(([title, labels], i) => q(`s${i + 1}`, `${i + 1}. ${title}`, opts5(labels, [0, 1, 2, 3, 4, 5]))),
  compute: (a) => {
    const sum = sumAnswers(a, Array.from({ length: 10 }, (_, i) => `s${i + 1}`))
    const pct = Math.round((sum / 50) * 100)
    const { text, color } = interpret(pct, [[8, 'Pas d\'incapacité', 'green'], [28, 'Incapacité légère', 'green'], [48, 'Incapacité modérée', 'orange'], [64, 'Incapacité sévère', 'red'], [100, 'Incapacité complète', 'red']])
    return { value: `${pct}% (${sum}/50)`, display: `${sum}/50 — ${pct}%`, interpretation: text, color }
  },
}

// ─── 14. CSI ───────────────────────────────────────────────────────────────
const CSI_ITEMS = [
  'Sommeil non récupérateur au réveil', 'Raideurs et douleurs musculaires',
  "Crises d'angoisse", 'Grincement / serrement des dents',
  'Diarrhée et/ou constipation', "Besoin d'aide pour AVQ",
  'Sensible aux fortes lumières', 'Fatigue facile à l\'effort',
  'Douleurs partout dans le corps', 'Maux de tête',
  'Gêne vessie / brûlures à la miction', 'Ne dort pas bien',
  'Difficultés de concentration', 'Problèmes de peau',
  'Stress aggrave les symptômes physiques', 'Triste ou déprimé',
  "Peu d'énergie", 'Tensions nuque et épaules',
  'Douleur à la mâchoire', 'Odeurs donnent nausées / étourdissements',
  'Uriner fréquemment', 'Jambes sans repos le soir',
  'Difficultés à se souvenir', 'Traumatismes durant l\'enfance',
  'Douleurs dans la région du bassin',
]
export const CSI: Questionnaire = {
  id: 'csi', title: 'Inventaire de Sensibilisation Centrale (CSI) — Partie A', short: 'CSI',
  questions: CSI_ITEMS.map((lbl, i) => q(`q${i + 1}`, `${i + 1}. ${lbl}`, opts5(['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Toujours'], [0, 1, 2, 3, 4]))),
  compute: (a) => {
    const total = sumAnswers(a, Array.from({ length: 25 }, (_, i) => `q${i + 1}`))
    const { text, color } = interpret(total, [[29, 'Sous-clinique', 'green'], [39, 'Léger', 'green'], [49, 'Modéré', 'orange'], [59, 'Sévère', 'red'], [100, 'Extrême', 'red']])
    return { value: total, display: `${total} / 100`, interpretation: text, color }
  },
}

// ─── 15. StarT Back ────────────────────────────────────────────────────────
const STARTBACK_ITEMS = [
  'Mal de dos propagé dans membre(s) inférieur(s)',
  'Douleur à l\'épaule ou au cou',
  "N'a parcouru que de courtes distances à pied",
  "S'est habillé plus lentement que d'habitude",
  "Il n'est pas prudent d'être actif physiquement",
  'Souvent préoccupé par le mal de dos',
  "Mal de dos épouvantable, ne s'améliorera jamais",
  "N'a pas apprécié les choses comme d'habitude",
]
export const STARTBACK: Questionnaire = {
  id: 'startBack', title: 'STarT Back Screening Tool', short: 'StarT Back', period: '2 dernières semaines',
  questions: [
    ...STARTBACK_ITEMS.map((lbl, i) => q(`q${i + 1}`, `${i + 1}. ${lbl}`, [{ label: 'Pas d\'accord', value: 0 }, { label: 'D\'accord', value: 1 }])),
    q('q9', '9. Gêne globale', opts5(['Pas du tout', 'Un peu', 'Modérément', 'Beaucoup', 'Extrêmement'], [0, 0, 0, 1, 1])),
  ],
  compute: (a) => {
    const total = sumAnswers(a, Array.from({ length: 9 }, (_, i) => `q${i + 1}`))
    const sub = sumAnswers(a, ['q5', 'q6', 'q7', 'q8', 'q9'])
    let risk: string; let color: 'green' | 'orange' | 'red'
    if (total <= 3) { risk = 'Risque FAIBLE'; color = 'green' }
    else if (sub <= 3) { risk = 'Risque MOYEN'; color = 'orange' }
    else { risk = 'Risque ÉLEVÉ'; color = 'red' }
    return { value: `${total}/9 (${risk})`, display: `Total ${total}/9 · Sous-score ${sub}/5`, interpretation: risk, color }
  },
}

// ─── 16. ODI ───────────────────────────────────────────────────────────────
const ODI_SECTIONS: [string, string[]][] = [
  ['Intensité de la douleur', ['Pas mal actuellement', 'Très légère', 'Modérée', 'Plutôt intense', 'Très intense', 'Pire imaginable']],
  ['Soins personnels', ['Normalement sans augmenter douleur', 'Normalement mais très douloureux', 'Lentement attention', 'Besoin d\'aide', 'Besoin aide tous les jours', 'Reste au lit']],
  ['Manutention de charges', ['Lourdes sans augmenter', 'Lourdes mais augmente', 'Pas depuis sol', 'Légères si placées', 'Très légers seulement', 'Ne peut rien soulever']],
  ['Marche à pied', ['Pas de limitation', '≤2 km', '≤1 km', '≤500 m', 'Canne / béquilles', 'Au lit / WC seulement']],
  ['Position assise', ['Aussi longtemps que voulu', 'Sur siège favori', '≤1h', '≤30 min', '≤10 min', 'Ne peut pas']],
  ['Position debout', ['Aussi longtemps sans douleur', 'Mais augmente douleur', '≤1h', '≤30 min', '≤10 min', 'Ne peut pas']],
  ['Sommeil', ['Jamais perturbé', 'Parfois', '<6 h', '<4 h', '<2 h', 'Ne peut pas dormir']],
  ['Vie sexuelle', ['Pas modifiée, pas de douleur', 'Augmente douleur', 'Pratiquement normale mais douloureuse', 'Fortement limitée', 'Presque inexistante', 'Interdite par douleur']],
  ['Vie sociale', ['Normale sans effet', 'Augmente douleur', 'Pas d\'effet sauf intense', 'Réduite', 'Limitée à la maison', 'Plus de vie sociale']],
  ['Déplacements', ['N\'importe où sans effet', 'Augmente douleur', '>2h supportables', '<1h', '<30 min', 'Sauf docteur / hôpital']],
]
export const ODI: Questionnaire = {
  id: 'odi', title: 'Oswestry Disability Index (ODI)', short: 'ODI',
  questions: ODI_SECTIONS.map(([title, labels], i) => q(`s${i + 1}`, `${i + 1}. ${title}`, opts5(labels, [0, 1, 2, 3, 4, 5]))),
  compute: (a) => {
    const sum = sumAnswers(a, Array.from({ length: 10 }, (_, i) => `s${i + 1}`))
    const pct = Math.round((sum / 50) * 100)
    const { text, color } = interpret(pct, [[20, 'Incapacité minimale', 'green'], [40, 'Incapacité modérée', 'orange'], [60, 'Incapacité sévère', 'red'], [80, 'Invalide', 'red'], [100, 'Alité / exagération', 'red']])
    return { value: `${pct}% (${sum}/50)`, display: `${sum}/50 — ${pct}%`, interpretation: text, color }
  },
}

// ─── 17. Örebro ────────────────────────────────────────────────────────────
export const OREBRO: Questionnaire = {
  id: 'orebro', title: 'Örebro Musculoskeletal Pain Screening', short: 'Örebro',
  questions: [
    q('q1', 'Durée des douleurs actuelles', opts5(['0-1 sem', '2-3 sem', '4-5 sem', '6-7 sem', '8-9 sem', '10-11 sem', '12-23 sem', '24-35 sem', '36-52 sem', '>52 sem'], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])),
    { id: 'q2', label: 'Intensité douleur 7 derniers jours', type: 'slider', min: 0, max: 10, step: 1 },
    { id: 'q3', label: 'Tension / anxiété dernière semaine', type: 'slider', min: 0, max: 10, step: 1 },
    { id: 'q4', label: 'Sentiment de dépression dernière semaine', type: 'slider', min: 0, max: 10, step: 1 },
    { id: 'q5', label: 'Risque que la douleur devienne persistante', type: 'slider', min: 0, max: 10, step: 1 },
    { id: 'q6', label: 'Chances de travailler dans 6 mois (inversé)', type: 'slider', min: 0, max: 10, step: 1, help: '0 = aucune chance, 10 = très grande' },
    { id: 'q7', label: 'Augmentation douleur = devrais arrêter', type: 'slider', min: 0, max: 10, step: 1 },
    { id: 'q8', label: 'Ne devrais pas faire activités normales avec douleur', type: 'slider', min: 0, max: 10, step: 1 },
    { id: 'q9', label: 'Peut faire travail léger 1h (inversé)', type: 'slider', min: 0, max: 10, step: 1 },
    { id: 'q10', label: 'Peut dormir la nuit (inversé)', type: 'slider', min: 0, max: 10, step: 1 },
  ],
  compute: (a) => {
    const get = (k: string) => typeof a[k] === 'number' ? (a[k] as number) : 0
    const total = get('q1') + get('q2') + get('q3') + get('q4') + get('q5')
      + (10 - get('q6')) + get('q7') + get('q8') + (10 - get('q9')) + (10 - get('q10'))
    return {
      value: total, display: `${total} / 100`,
      interpretation: total > 49 ? 'Risque ÉLEVÉ de chronicité (>49)' : 'Risque faible à modéré',
      color: total > 49 ? 'red' : 'green',
    }
  },
}

// ─── 18. EIFEL / Roland Morris ─────────────────────────────────────────────
const EIFEL_ITEMS = [
  "Reste pratiquement tout le temps à la maison",
  'Change souvent de position pour soulager le dos',
  "Marche plus lentement que d'habitude",
  "N'effectue aucune tâche habituelle à la maison",
  "S'aide à la rampe pour monter les escaliers",
  "S'allonge plus souvent pour se reposer",
  "Obligé de prendre un appui pour sortir d'un fauteuil",
  "Demande à d'autres de faire des choses à sa place",
  "S'habille plus lentement que d'habitude",
  "Ne reste debout que de courts moments",
  "Essaie de ne pas se baisser ni s'agenouiller",
  "A du mal à se lever d'une chaise",
  'A mal au dos la plupart du temps',
  'Difficulté à se retourner dans le lit',
  "Moins d'appétit à cause du mal de dos",
  'Du mal à mettre chaussettes',
  'Ne peut marcher que sur courtes distances',
  'Dort moins à cause du mal de dos',
  "Quelqu'un l'aide pour s'habiller",
  'Reste assis la plus grande partie de la journée',
  'Évite les gros travaux à la maison',
  "Plus irritable et de mauvaise humeur",
  "Monte les escaliers plus lentement que d'habitude",
  'Reste au lit la plupart du temps',
]
export const EIFEL: Questionnaire = {
  id: 'eifel', title: 'EIFEL — Roland Morris', short: 'EIFEL',
  questions: EIFEL_ITEMS.map((lbl, i) => yesNo(`q${i + 1}`, `${i + 1}. ${lbl}`)),
  compute: (a) => {
    const total = sumAnswers(a, Array.from({ length: 24 }, (_, i) => `q${i + 1}`))
    return {
      value: total, display: `${total} / 24`,
      interpretation: total >= 14 ? 'Incapacité fonctionnelle significative' : total >= 7 ? 'Incapacité modérée' : 'Incapacité faible',
      color: total >= 14 ? 'red' : total >= 7 ? 'orange' : 'green',
    }
  },
}

// ─── 19. DN4 ───────────────────────────────────────────────────────────────
const DN4_ITEMS: [string, string][] = [
  ['q1', 'Brûlure'], ['q2', 'Sensation de froid douloureux'], ['q3', 'Décharges électriques'],
  ['q4', 'Fourmillements'], ['q5', 'Picotements'], ['q6', 'Engourdissements'], ['q7', 'Démangeaisons'],
  ['q8', 'Hypoesthésie au tact'], ['q9', 'Hypoesthésie à la piqûre'], ['q10', 'Frottement (augmente la douleur)'],
]
export const DN4: Questionnaire = {
  id: 'dn4', title: 'DN4 — Douleur neuropathique en 4 questions', short: 'DN4',
  instructions: 'Q1-Q2 : interrogatoire · Q3-Q4 : examen clinique',
  questions: DN4_ITEMS.map(([id, lbl]) => yesNo(id, lbl)),
  compute: (a) => {
    const total = sumAnswers(a, DN4_ITEMS.map(([id]) => id))
    return {
      value: total, display: `${total} / 10`,
      interpretation: total >= 4 ? 'Test POSITIF — douleur neuropathique probable' : 'Test négatif',
      color: total >= 4 ? 'red' : 'green',
    }
  },
}

// ─── 20. Pain Detect ───────────────────────────────────────────────────────
const PD_SENSORIAL = [
  'Brûlure (comme piqûres d\'orties)',
  'Picotements / fourmillements / petites décharges',
  'Léger contact douloureux (vêtements, couverture)',
  'Pics de douleur type chocs électriques',
  'Chaud / froid provoque douleur',
  'Sensibilité cutanée diminuée',
  'Légère pression douloureuse',
]
export const PAIN_DETECT: Questionnaire = {
  id: 'painDetect', title: 'Pain Detect', short: 'Pain Detect',
  questions: [
    { id: 'eva1', label: 'EVA — Douleur à cet instant', type: 'slider', min: 0, max: 10, step: 1, section: 'EVA', sectionLabel: 'Échelles douleur (non comptées)' },
    { id: 'eva2', label: 'EVA — Plus forte sur 4 semaines', type: 'slider', min: 0, max: 10, step: 1, section: 'EVA' },
    { id: 'eva3', label: 'EVA — Moyenne sur 4 semaines', type: 'slider', min: 0, max: 10, step: 1, section: 'EVA' },
    q('pattern', 'Pattern de douleur', [
      { label: 'Constante avec fluctuations', value: 0 },
      { label: 'Constante + pics', value: 1 },
      { label: 'Pics sans fond', value: -1 },
      { label: 'Fréquents pics + fond', value: 1 },
    ]),
    q('irradiation', 'Douleur se propage dans d\'autres parties ?', [{ label: 'Non', value: 0 }, { label: 'Oui', value: 2 }]),
    ...PD_SENSORIAL.map((lbl, i) => q(`s${i + 1}`, `${i + 1}. ${lbl}`, opts5(['Pas du tout', 'Très peu', 'Légèrement', 'Modérément', 'Fortement', 'Très fortement'], [0, 1, 2, 3, 4, 5]))),
  ],
  compute: (a) => {
    const sens = sumAnswers(a, Array.from({ length: 7 }, (_, i) => `s${i + 1}`))
    const pattern = (a.pattern as number) ?? 0
    const irrad = (a.irradiation as number) ?? 0
    const total = sens + pattern + irrad
    const { text, color } = interpret(total, [[12, 'Composante neuropathique peu probable', 'green'], [18, 'Résultat ambigu', 'orange'], [38, 'Composante neuropathique probable', 'red']])
    return { value: total, display: `${total} / 38`, interpretation: text, color }
  },
}

// ─── 21. FABQ ──────────────────────────────────────────────────────────────
const FABQ_ITEMS = [
  "Ma douleur a été provoquée par l'activité physique",
  "L'activité physique aggrave ma douleur",
  'L\'activité physique pourrait abîmer mon dos',
  'Je ne voudrais pas faire d\'activités physiques qui aggravent ma douleur',
  'Je ne devrais pas avoir d\'activités physiques qui aggravent ma douleur',
  'Ma douleur a été causée par mon travail ou un AT',
  'Mon travail a aggravé ma douleur',
  'Je mérite la reconnaissance de mon mal de dos en AT',
  'Mon travail est trop lourd pour moi',
  'Mon travail aggrave ou pourrait aggraver ma douleur',
  'Mon travail pourrait endommager mon dos',
  'Je ne devrais pas effectuer mon travail avec ma douleur',
  'Je ne peux pas faire mon travail habituel avec ma douleur',
  'Je ne peux pas faire mon travail tant que ma douleur n\'est pas traitée',
  'Je ne pense pas pouvoir refaire mon travail dans 3 mois',
  'Je ne pense pas pouvoir jamais refaire mon travail',
]
export const FABQ: Questionnaire = {
  id: 'fabq', title: 'FABQ — Fear Avoidance Beliefs', short: 'FABQ',
  instructions: '0 = Absolument pas d\'accord, 6 = Complètement d\'accord',
  questions: FABQ_ITEMS.map((lbl, i) => ({ id: `q${i + 1}`, label: `${i + 1}. ${lbl}`, type: 'slider', min: 0, max: 6, step: 1, section: i < 5 ? 'PHYS' : 'WORK', sectionLabel: i < 5 ? 'FABQ Physique' : 'FABQ Travail' } as Question)),
  compute: (a) => {
    const phys = sumAnswers(a, ['q2', 'q3', 'q4', 'q5'])
    const work = sumAnswers(a, ['q6', 'q7', 'q9', 'q10', 'q11', 'q12', 'q15'])
    return {
      value: `Phys ${phys}/24 · Trav ${work}/42`,
      display: `Physique ${phys}/24 — Travail ${work}/42`,
      subscores: { Physique: phys, Travail: work },
      interpretation: `${phys >= 15 ? 'Phys ÉLEVÉ' : 'Phys OK'} · ${work >= 34 ? 'Trav ÉLEVÉ' : 'Trav OK'}`,
      color: phys >= 15 || work >= 34 ? 'red' : 'green',
    }
  },
}

// ─── 22. HAD ───────────────────────────────────────────────────────────────
type HadItem = { id: string; label: string; kind: 'A' | 'D'; options: QuestionOption[] }
const HAD_ITEMS: HadItem[] = [
  { id: 'q1', kind: 'A', label: '1. Je me sens tendu(e) ou énervé(e)', options: opts5(['La plupart du temps', 'Souvent', 'De temps en temps', 'Jamais'], [3, 2, 1, 0]) },
  { id: 'q2', kind: 'D', label: "2. Je prends plaisir aux mêmes choses qu'autrefois", options: opts5(['Oui tout autant', 'Pas autant', 'Un peu seulement', 'Presque plus'], [0, 1, 2, 3]) },
  { id: 'q3', kind: 'A', label: "3. J'ai une sensation de peur (quelque chose d'horrible)", options: opts5(['Oui très nettement', 'Oui mais pas grave', 'Un peu', 'Pas du tout'], [3, 2, 1, 0]) },
  { id: 'q4', kind: 'D', label: '4. Je ris facilement et vois le bon côté', options: opts5(['Autant que par le passé', 'Plus autant', 'Vraiment moins', 'Plus du tout'], [0, 1, 2, 3]) },
  { id: 'q5', kind: 'A', label: '5. Je me fais du souci', options: opts5(['Très souvent', 'Assez souvent', 'Occasionnellement', 'Très occasionnellement'], [3, 2, 1, 0]) },
  { id: 'q6', kind: 'D', label: '6. Je suis de bonne humeur', options: opts5(['Jamais', 'Rarement', 'Assez souvent', 'La plupart du temps'], [3, 2, 1, 0]) },
  { id: 'q7', kind: 'A', label: '7. Je peux rester tranquillement assis(e) et me sentir décontracté(e)', options: opts5(['Oui quoi qu\'il arrive', 'Oui en général', 'Rarement', 'Jamais'], [0, 1, 2, 3]) },
  { id: 'q8', kind: 'D', label: '8. J\'ai l\'impression de fonctionner au ralenti', options: opts5(['Presque toujours', 'Très souvent', 'Parfois', 'Jamais'], [3, 2, 1, 0]) },
  { id: 'q9', kind: 'A', label: '9. J\'éprouve des sensations de peur et l\'estomac noué', options: opts5(['Jamais', 'Parfois', 'Assez souvent', 'Très souvent'], [0, 1, 2, 3]) },
  { id: 'q10', kind: 'D', label: '10. Je ne m\'intéresse plus à mon apparence', options: opts5(['Plus du tout', 'Moins que je devrais', 'Il se peut que je n\'y fasse plus attention', 'Autant que par le passé'], [3, 2, 1, 0]) },
  { id: 'q11', kind: 'A', label: '11. J\'ai la bougeotte et ne tiens pas en place', options: opts5(['Tout à fait le cas', 'Un peu', 'Pas tellement', 'Pas du tout'], [3, 2, 1, 0]) },
  { id: 'q12', kind: 'D', label: '12. Je me réjouis d\'avance à l\'idée de faire certaines choses', options: opts5(['Autant qu\'avant', 'Un peu moins', 'Bien moins', 'Presque jamais'], [0, 1, 2, 3]) },
  { id: 'q13', kind: 'A', label: '13. J\'éprouve des sensations soudaines de panique', options: opts5(['Vraiment très souvent', 'Assez souvent', 'Pas très souvent', 'Jamais'], [3, 2, 1, 0]) },
  { id: 'q14', kind: 'D', label: '14. Je peux prendre plaisir à un bon livre / une bonne émission', options: opts5(['Souvent', 'Parfois', 'Rarement', 'Très rarement'], [0, 1, 2, 3]) },
]
export const HAD: Questionnaire = {
  id: 'had', title: 'Échelle HAD — Hospital Anxiety and Depression', short: 'HAD',
  questions: HAD_ITEMS.map(it => q(it.id, it.label, it.options, { section: it.kind, sectionLabel: it.kind === 'A' ? 'Sous-échelle Anxiété' : 'Sous-échelle Dépression' })),
  compute: (a) => {
    const A = sumAnswers(a, HAD_ITEMS.filter(i => i.kind === 'A').map(i => i.id))
    const D = sumAnswers(a, HAD_ITEMS.filter(i => i.kind === 'D').map(i => i.id))
    const interp = (n: number) => n <= 7 ? 'absence' : n <= 10 ? 'douteuse' : 'certaine'
    return {
      value: `A:${A} / D:${D}`,
      display: `Anxiété ${A}/21 — Dépression ${D}/21`,
      subscores: { Anxiété: A, Dépression: D },
      interpretation: `Anx: ${interp(A)} · Dép: ${interp(D)}`,
      color: (A >= 11 || D >= 11) ? 'red' : (A >= 8 || D >= 8) ? 'orange' : 'green',
    }
  },
}

// ─── 23. SF-36 (simplifié : 8 dimensions + score global 0-100) ─────────────
export const SF36: Questionnaire = {
  id: 'sf36', title: 'SF-36 — Qualité de vie', short: 'SF-36', period: '4 dernières semaines',
  instructions: 'Le SF-36 produit 8 dimensions. Score global affiché en fin.',
  questions: [
    q('q1', '1. Santé générale', opts5(['Excellente', 'Très bonne', 'Bonne', 'Médiocre', 'Mauvaise'], [100, 75, 50, 25, 0])),
    q('q2', '2. Évolution / an dernier', opts5(['Bien meilleur', 'Plutôt meilleur', 'À peu près pareil', 'Plutôt moins bon', 'Beaucoup moins bon'], [100, 75, 50, 25, 0])),
    // Q3 — Fonctionnement physique (10 items, 3 options)
    ...['Efforts physiques importants', 'Efforts physiques modérés', 'Soulever / porter les courses', 'Monter plusieurs étages', 'Monter un étage', 'Se pencher / s\'agenouiller', 'Marcher >1 km', 'Marcher plusieurs centaines de m', 'Marcher une centaine de m', 'Prendre bain / douche / s\'habiller'].map((lbl, i) =>
      q(`q3_${i + 1}`, `3.${String.fromCharCode(97 + i)}. ${lbl}`, opts5(['Oui beaucoup limité', 'Oui un peu limité', 'Non pas du tout limité'], [0, 50, 100]), { section: 'PF', sectionLabel: 'Fonctionnement physique (PF)' })
    ),
    // Q4 — Limitations physiques (RP)
    ...['Réduit temps au travail', 'Accompli moins', 'Dû arrêter certaines choses', 'Difficultés à faire travail'].map((lbl, i) =>
      q(`q4_${i + 1}`, `4.${String.fromCharCode(97 + i)}. ${lbl}`, [{ label: 'Oui', value: 0 }, { label: 'Non', value: 100 }], { section: 'RP', sectionLabel: 'Limitations physiques (RP)' })
    ),
    // Q5 — Limitations émotionnelles (RE)
    ...['Réduit temps au travail', 'Accompli moins', 'Manque de soin / attention'].map((lbl, i) =>
      q(`q5_${i + 1}`, `5.${String.fromCharCode(97 + i)}. ${lbl}`, [{ label: 'Oui', value: 0 }, { label: 'Non', value: 100 }], { section: 'RE', sectionLabel: 'Limitations émotionnelles (RE)' })
    ),
    q('q6', '6. Gêne dans la vie sociale', opts5(['Pas du tout', 'Un petit peu', 'Moyennement', 'Beaucoup', 'Énormément'], [100, 75, 50, 25, 0]), { section: 'SF', sectionLabel: 'Vie sociale (SF)' }),
    q('q7', '7. Intensité des douleurs physiques', opts5(['Nulle', 'Très faible', 'Faible', 'Moyenne', 'Grande', 'Très grande'], [100, 80, 60, 40, 20, 0]), { section: 'BP', sectionLabel: 'Douleur physique (BP)' }),
    q('q8', '8. Limitation par douleur', opts5(['Pas du tout', 'Un petit peu', 'Moyennement', 'Beaucoup', 'Énormément'], [100, 75, 50, 25, 0]), { section: 'BP' }),
    // Q9 — Bien-être émotionnel (MH) + Vitalité (VT) — 9 items
    ...[['Dynamique', 'VT'], ['Très nerveux', 'MH'], ['Si découragé rien ne remonte', 'MH'], ['Calme et détendu', 'MH'], ['Débordant d\'énergie', 'VT'], ['Triste et abattu', 'MH'], ['Épuisé', 'VT'], ['Bien dans votre peau', 'MH'], ['Fatigué', 'VT']].map(([lbl, sec], i) => {
      const positive = ['Dynamique', 'Calme et détendu', 'Débordant d\'énergie', 'Bien dans votre peau'].includes(lbl)
      const scores = positive ? [100, 80, 60, 40, 20, 0] : [0, 20, 40, 60, 80, 100]
      return q(`q9_${i + 1}`, `9.${String.fromCharCode(97 + i)}. ${lbl}`, opts5(['En permanence', 'Très souvent', 'Souvent', 'Quelquefois', 'Rarement', 'Jamais'], scores), { section: sec, sectionLabel: sec === 'VT' ? 'Vitalité (VT)' : 'Santé mentale (MH)' })
    }),
    q('q10', '10. Fréquence gêne sociale', opts5(['En permanence', 'Très souvent', 'Souvent', 'Quelquefois', 'Rarement', 'Jamais'], [0, 20, 40, 60, 80, 100]), { section: 'SF' }),
    ...[['Je tombe malade plus facilement', false], ['Je me porte aussi bien que n\'importe qui', true], ['Je m\'attends à ce que ma santé se dégrade', false], ['Je suis en parfaite santé', true]].map(([lbl, pos], i) =>
      q(`q11_${i + 1}`, `11.${String.fromCharCode(97 + i)}. ${lbl}`, opts5(['Totalement vrai', 'Plutôt vrai', 'Je ne sais pas', 'Plutôt faux', 'Totalement faux'], pos ? [100, 75, 50, 25, 0] : [0, 25, 50, 75, 100]), { section: 'GH', sectionLabel: 'Santé générale (GH)' })
    ),
  ],
  compute: (a) => {
    const avgSec = (prefix: string) => {
      const vals = Object.entries(a).filter(([k]) => k.startsWith(prefix)).map(([, v]) => v).filter(v => typeof v === 'number') as number[]
      return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0
    }
    const PF = avgSec('q3_')
    const RP = avgSec('q4_')
    const RE = avgSec('q5_')
    const SF = Math.round((((a.q6 as number) ?? 0) + ((a.q10 as number) ?? 0)) / 2)
    const BP = Math.round((((a.q7 as number) ?? 0) + ((a.q8 as number) ?? 0)) / 2)
    // Q9: split MH (items 2,3,4,6,8) and VT (items 1,5,7,9)
    const q9 = (i: number) => (a[`q9_${i}`] as number) ?? 0
    const MH = Math.round((q9(2) + q9(3) + q9(4) + q9(6) + q9(8)) / 5)
    const VT = Math.round((q9(1) + q9(5) + q9(7) + q9(9)) / 4)
    const GH = Math.round((((a.q1 as number) ?? 0) + avgSec('q11_')) / 2)
    const global = Math.round((PF + RP + RE + SF + BP + MH + VT + GH) / 8)
    return {
      value: global, display: `Global ${global}/100`,
      subscores: { PF, RP, RE, SF, BP, MH, VT, GH },
      interpretation: global >= 75 ? 'Bonne qualité de vie' : global >= 50 ? 'Moyenne' : 'Altérée',
    }
  },
}

// ─── Export master map ─────────────────────────────────────────────────────
export const QUESTIONNAIRES: Record<string, Questionnaire> = {
  oss: OSS, constant: CONSTANT, dash: DASH, rowe: ROWE,
  hoos: HOOS, oxfordHip: OXFORD_HIP,
  koos: KOOS, fakps: FAKPS, ikdc: IKDC, aclRsi: ACL_RSI,
  ffaam: FFAAM, cait: CAIT,
  ndi: NDI, csi: CSI,
  startBack: STARTBACK, odi: ODI, orebro: OREBRO, eifel: EIFEL,
  dn4: DN4, painDetect: PAIN_DETECT, fabq: FABQ, had: HAD, sf36: SF36,
}
