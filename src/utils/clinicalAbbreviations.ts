/**
 * Référentiel d'abréviations cliniques — kinésithérapie / physiothérapie.
 *
 * Utilisé par le compte rendu condensé (Knode) pour produire une sortie
 * télégraphique standard. Extensible : ajouter des entrées ici sans toucher
 * au prompt côté `compteRendu.ts`.
 *
 * Principes :
 *  - `sigle` court, sans points (sauf convention médicale établie : Flex., Ext., etc.)
 *  - `forme` longue lisible — sert au "dépliage" si un export externe en a besoin
 *  - Catégorisé pour faciliter l'injection ciblée dans un prompt
 */

export interface Abbreviation {
  sigle: string
  forme: string
}

export const ABBR_ANATOMIE: Abbreviation[] = [
  { sigle: 'MS', forme: 'membre supérieur' },
  { sigle: 'MSD', forme: 'membre supérieur droit' },
  { sigle: 'MSG', forme: 'membre supérieur gauche' },
  { sigle: 'MI', forme: 'membre inférieur' },
  { sigle: 'MID', forme: 'membre inférieur droit' },
  { sigle: 'MIG', forme: 'membre inférieur gauche' },
  { sigle: 'D', forme: 'droit / droite' },
  { sigle: 'G', forme: 'gauche' },
  { sigle: 'Bilat.', forme: 'bilatéral' },
  { sigle: 'Ant.', forme: 'antérieur' },
  { sigle: 'Post.', forme: 'postérieur' },
  { sigle: 'Int.', forme: 'interne' },
  { sigle: 'Ext.', forme: 'externe' },
]

export const ABBR_MOUVEMENTS: Abbreviation[] = [
  { sigle: 'Flex.', forme: 'flexion' },
  { sigle: 'Ext.', forme: 'extension' },
  { sigle: 'Abd.', forme: 'abduction' },
  { sigle: 'Add.', forme: 'adduction' },
  { sigle: 'RI', forme: 'rotation interne' },
  { sigle: 'RE', forme: 'rotation externe' },
  { sigle: 'Rot.', forme: 'rotation' },
  { sigle: 'Incl.', forme: 'inclinaison' },
  { sigle: 'AA', forme: 'amplitude active' },
  { sigle: 'AP', forme: 'amplitude passive' },
]

export const ABBR_EXAMEN: Abbreviation[] = [
  { sigle: 'ROT', forme: 'réflexes ostéotendineux' },
  { sigle: 'EVN', forme: 'échelle visuelle numérique' },
  { sigle: 'EVA', forme: 'échelle visuelle analogique' },
  { sigle: 'DN', forme: 'douleur nocturne' },
  { sigle: 'TTT', forme: 'traitement' },
  { sigle: 'ATCD', forme: 'antécédent' },
  { sigle: 'Rx', forme: 'radiographie' },
  { sigle: 'IRM', forme: 'imagerie par résonance magnétique' },
  { sigle: 'TDM', forme: 'tomodensitométrie (scanner)' },
  { sigle: 'MRC', forme: 'cotation force musculaire (Medical Research Council, 0/5 à 5/5)' },
  { sigle: 'NR', forme: 'non renseigné' },
  { sigle: 'Ø', forme: 'absent / négatif / rien à signaler' },
]

export const ABBR_SYMBOLES: Abbreviation[] = [
  { sigle: '+', forme: 'positif (test, signe)' },
  { sigle: '−', forme: 'négatif' },
  { sigle: '↑', forme: 'augmente / aggrave' },
  { sigle: '↓', forme: 'diminue / soulage' },
  { sigle: '→', forme: 'tolère / pas de problème' },
  { sigle: '⇒', forme: 'implique / oriente vers' },
  { sigle: '≈', forme: 'environ / proche de' },
  { sigle: '♂', forme: 'masculin' },
  { sigle: '♀', forme: 'féminin' },
]

export const DRAPEAUX: Array<{ symbole: string; nom: string; description: string }> = [
  { symbole: '🔴', nom: 'rouges', description: 'pathologie grave (cancer, fracture, etc.)' },
  { symbole: '🟡', nom: 'jaunes', description: 'facteurs psychosociaux (peur, dépression)' },
  { symbole: '🔵', nom: 'bleus', description: 'facteurs professionnels' },
  { symbole: '⚫', nom: 'noirs', description: 'contexte socio-économique / assurance' },
]

/** Tests cliniques à reproduire verbatim (jamais traduits ni abrégés). */
export const TESTS_VERBATIM = [
  'Spurling', 'Lasègue', 'SLR', 'Slump', 'ULTT 1', 'ULTT 2', 'ULTT 3',
  'Jobe', 'Neer', 'Hawkins', 'Yergason', "Test d'Adam", 'Laslett',
  'Prone Instability Test', 'Lachman', 'McMurray', 'Apprehension', 'Distraction',
  'Tinel', 'Phalen', 'Finkelstein', 'Faber', 'Fadir', 'Thomas', 'Ober',
  'Trendelenburg',
] as const

/** Format d'une ligne de tableau pour injection dans un prompt. */
function formatRow(a: Abbreviation): string {
  return `  ${a.sigle.padEnd(10)} → ${a.forme}`
}

/** Sérialisation compacte du référentiel pour injection en system prompt. */
export function abbreviationsAsPromptBlock(): string {
  const sections: string[] = []

  sections.push('ANATOMIE & RÉGIONS :')
  sections.push(ABBR_ANATOMIE.map(formatRow).join('\n'))

  sections.push('\nMOUVEMENTS :')
  sections.push(ABBR_MOUVEMENTS.map(formatRow).join('\n'))

  sections.push('\nEXAMEN & TESTS :')
  sections.push(ABBR_EXAMEN.map(formatRow).join('\n'))

  sections.push('\nSYMBOLES :')
  sections.push(ABBR_SYMBOLES.map(formatRow).join('\n'))

  sections.push('\nDRAPEAUX (pictogrammes obligatoires) :')
  sections.push(DRAPEAUX.map(d => `  ${d.symbole} ${d.nom} — ${d.description}`).join('\n'))

  sections.push('\nTESTS VERBATIM (reproduire tels quels, jamais traduits) :')
  sections.push('  ' + TESTS_VERBATIM.join(', ') + ', etc.')

  return sections.join('\n')
}

/**
 * Dépliage automatique d'un texte télégraphique pour un export externe lisible.
 * Remplace les sigles par leur forme longue (utile pour PDF destiné au médecin).
 * Ne touche pas aux noms de tests verbatim ni aux symboles graphiques.
 */
export function expandAbbreviations(text: string): string {
  let out = text
  const all = [...ABBR_ANATOMIE, ...ABBR_MOUVEMENTS, ...ABBR_EXAMEN]
  // Tri par longueur décroissante pour ne pas que "D" écrase "Dx", "MS" écrase "MSD", etc.
  const sorted = [...all].sort((a, b) => b.sigle.length - a.sigle.length)
  for (const { sigle, forme } of sorted) {
    const escaped = sigle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(?<![A-Za-zÀ-ÿ])${escaped}(?![A-Za-zÀ-ÿ])`, 'g')
    out = out.replace(re, forme)
  }
  return out
}
