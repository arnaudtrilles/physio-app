import type { BilanDocument, AICallCategory, AICallAuditEntry } from '../types'
import { callClaude } from './claudeClient'

/**
 * Wrapper sécurisé autour de callClaude.
 *
 * Objectifs :
 *  1. Défense en profondeur : applique un scrub final sur system + user prompts
 *     en remplaçant toute occurrence du nom/prénom du patient par "[PATIENT]"
 *     avant l'envoi. Même si un builder en amont oublie de nettoyer, rien de
 *     nominatif ne sort du poste.
 *  2. Audit : enregistre chaque appel avec métadonnées non-identifiantes.
 *  3. Détection : compte combien de tokens ont été remplacés au niveau du
 *     wrapper — si ce nombre est > 0, cela signale qu'un builder en amont
 *     n'a pas correctement scrubbé.
 */

export interface SecurePatientHint {
  nom?: string
  prenom?: string
  /** Clé interne (non envoyée à l'IA) — utilisée pour l'audit uniquement */
  patientKey: string
}

export interface SecureCallOptions {
  apiKey: string
  systemPrompt: string
  userPrompt: string
  maxOutputTokens: number
  jsonMode?: boolean
  preferredModel?: string
  documents?: BilanDocument[]
  patient: SecurePatientHint
  category: AICallCategory
  /** Callback pour enregistrer l'entrée d'audit en IndexedDB. */
  onAudit?: (entry: AICallAuditEntry) => void
  /**
   * Si true, l'utilisateur a été averti et a explicitement choisi d'envoyer
   * des documents non masqués. Permet de tracer l'override dans l'audit.
   */
  userAcknowledgedUnmasked?: boolean
}

/**
 * Erreur levée quand l'appel contient des documents non-masqués et que
 * l'utilisateur n'a pas encore donné son consentement explicite. Le code
 * appelant doit afficher une modal et rappeler la fonction avec
 * `userAcknowledgedUnmasked: true` si l'utilisateur accepte.
 */
export class UnmaskedDocumentsError extends Error {
  readonly unmaskedDocs: BilanDocument[]
  constructor(unmaskedDocs: BilanDocument[]) {
    super(`${unmaskedDocs.length} document(s) non masqué(s) détecté(s). Validation utilisateur requise.`)
    this.name = 'UnmaskedDocumentsError'
    this.unmaskedDocs = unmaskedDocs
  }
}

/**
 * Construit un regex robuste à partir de tokens qui sont au moins de 2 caractères.
 */
function buildFinalScrubber(nom?: string, prenom?: string): { scrub: (t: string) => string; count: (t: string) => number } {
  const tokens = [nom, prenom]
    .filter((t): t is string => typeof t === 'string' && t.trim().length >= 2)
    .map(t => t.trim())
  if (tokens.length === 0) {
    return { scrub: (t) => t, count: () => 0 }
  }
  const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`\\b(?:${escaped.join('|')})\\b`, 'gi')
  return {
    scrub: (t) => t.replace(pattern, '[PATIENT]'),
    count: (t) => (t.match(pattern) ?? []).length,
  }
}

export async function callClaudeSecure(opts: SecureCallOptions): Promise<string> {
  const {
    apiKey, systemPrompt, userPrompt, maxOutputTokens, jsonMode, preferredModel,
    documents, patient, category, onAudit, userAcknowledgedUnmasked,
  } = opts

  // ── Garde-fou documents non masqués ────────────────────────────────────
  const docs = documents ?? []
  const unmaskedDocs = docs.filter(d => d.masked !== true)
  if (unmaskedDocs.length > 0 && !userAcknowledgedUnmasked) {
    throw new UnmaskedDocumentsError(unmaskedDocs)
  }

  // ── Défense en profondeur : scrub final avant envoi ────────────────────
  const { scrub, count } = buildFinalScrubber(patient.nom, patient.prenom)
  const cleanedSystem = scrub(systemPrompt)
  const cleanedUser = scrub(userPrompt)
  const replacementsCount = count(systemPrompt) + count(userPrompt)

  const promptLength = cleanedSystem.length + cleanedUser.length
  const hasDocuments = docs.length > 0
  const documentsCount = docs.length
  const documentsUnmasked = unmaskedDocs.length
  let result = ''
  let success = false

  try {
    result = await callClaude(
      apiKey,
      cleanedSystem,
      cleanedUser,
      maxOutputTokens,
      jsonMode ?? false,
      preferredModel,
      documents,
    )
    success = true
    return result
  } catch (err) {
    success = false
    throw err
  } finally {
    if (onAudit) {
      try {
        onAudit({
          id: Date.now() + Math.floor(Math.random() * 1000),
          timestamp: new Date().toISOString(),
          category,
          patientKey: patient.patientKey,
          pseudonymized: true,
          scrubReplacements: replacementsCount,
          hasDocuments,
          documentsCount,
          documentsUnmasked,
          modelUsed: preferredModel ?? 'claude-sonnet-4-6',
          promptLength,
          resultLength: result.length,
          success,
        })
      } catch {
        // Audit ne doit jamais casser l'appel principal
      }
    }
  }
}
