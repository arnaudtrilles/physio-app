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
  if (!base || base === 'Anonyme') return undefined
  const parts = base.split(/\s+/)
  if (parts.length === 0) return undefined
  const nom = parts[0]
  const prenom = parts.slice(1).join(' ').trim() || undefined
  return { nom: nom || undefined, prenom }
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

function buildNameScrubber(hint?: ScrubPatientHint): { pattern: RegExp | null; replacement: string } {
  if (!hint) return { pattern: null, replacement: '[PATIENT]' }
  const tokens = [hint.nom, hint.prenom]
    .filter((t): t is string => typeof t === 'string' && t.trim().length >= 2)
    .map(t => escapeRegex(t.trim()))
  if (tokens.length === 0) return { pattern: null, replacement: '[PATIENT]' }
  return {
    pattern: new RegExp(`\\b(?:${tokens.join('|')})\\b`, 'gi'),
    replacement: '[PATIENT]',
  }
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

  const { pattern: namePattern, replacement: nameRepl } = buildNameScrubber(hint)
  if (namePattern) {
    const matches = scrubbed.match(namePattern)
    if (matches) count += matches.length
    scrubbed = scrubbed.replace(namePattern, nameRepl)
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
