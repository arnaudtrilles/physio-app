/**
 * Identifiants Claude utilisés dans l'app.
 *
 * Répartition actuelle :
 *   - DEFAULT (Sonnet 4.6) : analyses, bilans, fiches, lettres, notes
 *   - VOICE_REFORMULATION (Haiku 4.5) : reformulation de dictée (rapide/éco)
 *
 * Pour upgrader une tâche vers Opus : remplacer la constante dans le caller.
 */
export const CLAUDE_MODELS = {
  DEFAULT: 'claude-sonnet-4-6',
  VOICE_REFORMULATION: 'claude-haiku-4-5-20251001',
  OPUS: 'claude-opus-4-7',
} as const

export type ClaudeModelId = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS]
