/**
 * Scrubbing proactif des transcriptions vocales avant envoi à Claude.
 *
 * Aligné sur le modèle Heidi Health / Nabla : minimiser les données
 * identifiantes envoyées à un sous-traitant IA (RGPD art. 5.1.c —
 * minimisation, art. 32 — sécurité). Le praticien reste responsable
 * de traitement, mais l'envoi à Anthropic ne doit contenir que ce
 * qui est strictement nécessaire à l'analyse clinique.
 *
 * Stratégie :
 *  1. Si patient hint fourni → remplacer nom/prénom par [PATIENT].
 *  2. Toujours scrub les patterns PII : téléphone FR, email, NIR
 *     (sécu), adresses postales explicites.
 *  3. Laisser les données cliniques (EVN, mobilité, tests) intactes.
 */

export interface ScrubPatientHint {
  nom?: string
  prenom?: string
}

/**
 * Convertit un patientKey ("NOM Prenom" ou "NOM Prenom|YYYY-MM-DD")
 * en hint de scrubbing. Pratique pour les composants qui n'ont que la
 * clé interne sous la main.
 */
export function patientKeyToScrubHint(patientKey?: string): ScrubPatientHint | undefined {
  if (!patientKey) return undefined
  const base = patientKey.split('|')[0].trim()
  if (!base) return undefined
  const words = base.split(/\s+/).filter(Boolean)
  if (words.length === 0) return undefined
  // Patient anonyme : pk() met le nom en MAJUSCULES → comparaison insensible à la casse.
  if (words[0].toUpperCase() === 'ANONYME') return undefined
  // pk() met le nom en MAJUSCULES et le prénom en Titre. On coupe sur la bascule
  // de casse : le nom = la suite initiale de mots tout-en-majuscules. Gère les noms
  // composés « LE GOFF Marie » → nom « LE GOFF », prénom « Marie » (un simple
  // split sur le 1ᵉʳ espace donnerait nom « LE », laissant fuiter « GOFF »).
  let split = 0
  while (
    split < words.length &&
    /\p{L}/u.test(words[split]) &&
    words[split] === words[split].toUpperCase()
  ) split++
  if (split === 0) split = 1 // données non normalisées (nom non majusculé) : 1 mot de nom
  const nom = words.slice(0, split).join(' ')
  const prenom = words.slice(split).join(' ') || undefined
  return { nom, prenom }
}

export interface ScrubResult {
  text: string
  replacements: number
}

const PHONE_FR = /(?:\+33\s?[1-9](?:[\s.-]?\d{2}){4}|\b0[1-9](?:[\s.-]?\d{2}){4}\b)/g
const EMAIL = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g
const NIR = /\b[12]\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[1-2]\d|3[0-1]|\d{2})\d{2}\d{3}\d{3}(?:\s?\d{2})?\b/g
const POSTAL_ADDRESS = /\b\d{1,4}\s?(?:bis|ter)?,?\s+(?:rue|avenue|av\.|boulevard|bd|place|impasse|allée|allee|chemin|route|quai)\s+[A-ZÀ-Ÿa-zà-ÿ][\wÀ-ÿ'-]+(?:\s+[A-ZÀ-Ÿa-zà-ÿ][\wÀ-ÿ'-]+)*/gi
const POSTAL_CODE = /\b\d{5}\s+[A-ZÀ-Ÿ][A-ZÀ-Ÿa-zà-ÿ-]+(?:\s+[A-ZÀ-Ÿa-zà-ÿ-]+)?\b/g

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Particules nobiliaires / articles à ne PAS masquer isolément (« le », « de »…) :
// ce sont des mots courants non identifiants. La valeur COMPLÈTE du champ reste
// toujours masquée (ex. « LE GOFF »), mais en tant que mot isolé une particule est
// ignorée pour ne pas caviarder le texte clinique (« le patient », « de la »…).
const NAME_PARTICLES = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'au', 'aux', 'd', 'von', 'van',
  'di', 'da', 'del', 'della', 'der', 'den',
])

/**
 * Variantes de nom à masquer depuis un hint : la valeur COMPLÈTE de chaque champ
 * (nom, prénom) ET chaque mot significatif (≥ 2 caractères, hors particule).
 * Trié du plus long au plus court pour que les formes composées (« LE GOFF »)
 * l'emportent sur les mots isolés (« GOFF ») dans l'alternance regex.
 */
function buildNameVariants(hint?: ScrubPatientHint): string[] {
  if (!hint) return []
  const variants = new Set<string>()
  const addField = (field?: string) => {
    const v = field?.trim()
    if (!v || v.length < 2) return
    variants.add(v) // valeur complète → masque les noms composés contigus
    for (const word of v.split(/\s+/)) {
      const w = word.trim()
      if (w.length < 2) continue
      if (NAME_PARTICLES.has(w.toLowerCase().replace(/'$/, ''))) continue
      variants.add(w)
    }
  }
  addField(hint.nom)
  addField(hint.prenom)
  return [...variants].sort((a, b) => b.length - a.length)
}

/**
 * Regex de détection nom/prénom avec frontières Unicode SANS lookbehind.
 *  - frontière gauche : groupe capturant `(^|[^\p{L}\p{N}_])` (réinjecté à la
 *    substitution) — un lookbehind lèverait un SyntaxError sur Safari < 16.4 = régression ;
 *  - frontière droite : lookahead `(?![\p{L}\p{N}_])`.
 * `\b` est ASCII-only en JS : il rate tout nom à accent initial/final (Hervé,
 * René, Éric, André…) → on utilise des classes Unicode (flag `u`). Renvoie `null`
 * s'il n'y a aucun nom à masquer (comportement historique préservé).
 */
function buildNameScrubber(hint?: ScrubPatientHint): RegExp | null {
  const variants = buildNameVariants(hint)
  if (variants.length === 0) return null
  const alt = variants.map(escapeRegex).join('|')
  return new RegExp(`(^|[^\\p{L}\\p{N}_])(?:${alt})(?![\\p{L}\\p{N}_])`, 'giu')
}

/**
 * Scrub une transcription orale avant envoi à un sous-traitant IA.
 * - Anonymise nom/prénom du patient si fourni.
 * - Masque les patterns PII universels (téléphone, email, NIR, adresse).
 */
export function scrubTranscription(text: string, hint?: ScrubPatientHint): ScrubResult {
  if (!text) return { text: '', replacements: 0 }

  let scrubbed = text
  let count = 0

  const namePattern = buildNameScrubber(hint)
  if (namePattern) {
    // La frontière gauche capturée (`lead`) est réinjectée : on ne masque que le nom.
    scrubbed = scrubbed.replace(namePattern, (_m: string, lead: string) => {
      count++
      return `${lead}[PATIENT]`
    })
  }

  const apply = (re: RegExp, repl: string) => {
    const matches = scrubbed.match(re)
    if (matches) count += matches.length
    scrubbed = scrubbed.replace(re, repl)
  }

  apply(PHONE_FR, '[TELEPHONE]')
  apply(EMAIL, '[EMAIL]')
  apply(NIR, '[NIR]')
  apply(POSTAL_ADDRESS, '[ADRESSE]')
  apply(POSTAL_CODE, '[VILLE]')

  return { text: scrubbed, replacements: count }
}

// ─── Scrub RÉVERSIBLE (cas verbatim : reformulation par champ) ───────────────
//
// La sortie de `reformulateTranscription` est insérée TELLE QUELLE dans le champ
// du formulaire. On ne peut donc pas y laisser un jeton `[PATIENT]` : il faut
// masquer le nom/prénom AVANT l'envoi à l'IA puis RESTAURER les vraies valeurs
// dans la réponse. Chaque occurrence reçoit un placeholder INDEXÉ unique
// (`__PATIENT_0__`, `__PATIENT_1__`…) qui mémorise le texte EXACT rencontré →
// restauration au caractère près (zéro changement visuel), insensible à la
// façon dont le hint avait été découpé en nom/prénom.
//
// Les PII universels (téléphone, email, NIR, adresse) restent masqués de façon
// NON réversible — comportement identique à `scrubTranscription`, déjà en place.

export interface ReversibleScrubResult {
  text: string
  replacements: number
  /** Réinjecte les vraies valeurs nom/prénom dans la réponse IA. No-op si rien n'a été masqué. */
  restore: (out: string) => string
}

/**
 * Variante réversible de {@link scrubTranscription} pour le SEUL cas où la
 * sortie de l'IA est affichée verbatim (reformulation d'un champ). Chaque
 * occurrence de nom/prénom est remplacée par un placeholder indexé unique
 * restaurable au texte exact ; les autres PII sont masqués comme d'habitude
 * (non réversibles).
 */
export function scrubTranscriptionReversible(text: string, hint?: ScrubPatientHint): ReversibleScrubResult {
  const noop = (o: string) => o
  if (!text) return { text: '', replacements: 0, restore: noop }

  let scrubbed = text
  let count = 0
  const restorers: Array<{ index: number; value: string }> = []

  // Frontières Unicode (cf. buildNameScrubber) : couvre les noms accentués et
  // composés. Chaque occurrence → un placeholder indexé mémorisant le texte exact.
  const namePattern = buildNameScrubber(hint)
  if (namePattern) {
    scrubbed = scrubbed.replace(namePattern, (match: string, lead: string) => {
      const index = restorers.length
      restorers.push({ index, value: match.slice(lead.length) })
      count++
      return `${lead}__PATIENT_${index}__`
    })
  }

  // PII universels — non réversibles, strictement identique à scrubTranscription.
  const apply = (re: RegExp, repl: string) => {
    const matches = scrubbed.match(re)
    if (matches) count += matches.length
    scrubbed = scrubbed.replace(re, repl)
  }
  apply(PHONE_FR, '[TELEPHONE]')
  apply(EMAIL, '[EMAIL]')
  apply(NIR, '[NIR]')
  apply(POSTAL_ADDRESS, '[ADRESSE]')
  apply(POSTAL_CODE, '[VILLE]')

  const restore = restorers.length === 0
    ? noop
    : (out: string): string => {
        let restored = out
        for (const { index, value } of restorers) {
          // Tolère une altération de casse/espaces du marqueur par l'IA. Le
          // numéro est ancré : le motif d'index 1 ne capture pas `__PATIENT_10__`.
          const tolerant = new RegExp(`__\\s*PATIENT[\\s_]*${index}\\s*__`, 'gi')
          restored = restored.replace(tolerant, () => value)
        }
        return restored
      }

  return { text: scrubbed, replacements: count, restore }
}

// Détecteur (non global → sans état) : un de NOS jetons est-il présent ?
const ANY_PII_TOKEN = /\[(?:PATIENT|TELEPHONE|EMAIL|NIR|ADRESSE|VILLE)\]/
// Jetons PII résiduels + espaces HORIZONTAUX alentour absorbés ([^\S\n] et non
// \s, pour préserver les sauts de ligne / paragraphes du texte clinique).
// N'inclut PAS [inaudible]/[à préciser] (annotations cliniques).
const RESIDUAL_PII_TOKENS = /[^\S\n]*\[(?:TELEPHONE|EMAIL|NIR|ADRESSE|VILLE)\][^\S\n]*/g

/**
 * Retire les jetons PII résiduels d'un texte destiné à être STOCKÉ (cas JSON :
 * extraction de bilan, sections narratives). Ne touche QUE les jetons exacts
 * produits par le scrub — jamais les annotations cliniques comme `[inaudible]`
 * ou `[à préciser : X ou Y ?]`. Ne réinjecte JAMAIS le vrai nom : les champs
 * cliniques ne doivent pas stocker l'identité en clair (elle vient du dossier).
 *
 * Garde-fou « zéro changement visuel » : si AUCUN jeton n'est présent, le texte
 * est renvoyé tel quel — on ne normalise jamais la typographie française d'un
 * texte clinique propre (l'espace avant `:` `;` `!` `?` est correct en français).
 */
export function stripPiiTokens(text: string): string {
  if (!text) return text
  if (!ANY_PII_TOKEN.test(text)) return text
  let out = text
    .replace(/\[PATIENT\]/g, 'le patient')
    // Contractions grammaticales : « de le » → « du », « à le » → « au ».
    // NB : « à » est un caractère non-ASCII → `\b` ne marche pas devant lui
    // (frontière ASCII-only) ; on capture la frontière gauche Unicode et on la réinjecte.
    .replace(/\bde le patient\b/gi, 'du patient')
    .replace(/(^|[^\p{L}])à le patient\b/giu, '$1au patient')
    // Collisions « le le patient » / « du le patient » → « <déterminant> patient ».
    .replace(/\b(le|la|les|l['’]|du|des|au|aux)\s+le\s+patient\b/gi, '$1 patient')
    .replace(/\ble patient le patient\b/gi, 'le patient')
    .replace(RESIDUAL_PII_TOKENS, ' ')
    // Espace orphelin avant `,` ou `.` UNIQUEMENT (jamais avant : ; ! ? — qui
    // prennent légitimement une espace en français). Horizontal seulement (\n préservés).
    .replace(/[^\S\n]+([,.])/g, '$1')
    // Espace horizontal résiduel en fin de ligne (jeton retiré en bout de ligne).
    .replace(/[^\S\n]+(\n)/g, '$1')
  // Capitalise « le patient » en tête de phrase (début de texte ou après . ! ?).
  out = out.replace(/(^|[.!?]\s+)le patient\b/g, (_m, lead) => `${lead}Le patient`)
  return out.trim()
}
