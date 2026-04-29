import type { BilanDocument } from '../types'

export class ClaudeAuthError extends Error {
  constructor() { super('auth') }
}

export class ClaudeTimeoutError extends Error {
  constructor() { super('timeout') }
}

// 290s — légèrement sous la limite Vercel Pro Node serverless de 300s.
// Couvre les transcriptions longues (ex: bilan vocal séance 45 min) sans
// abandonner avant que la fonction serverless n'ait eu le temps de répondre.
const CLIENT_TIMEOUT_MS = 290_000

export interface ClaudeUsage {
  input: number
  output: number
  cacheRead: number
  cacheCreated: number
}

/**
 * Appelle l'API Claude via le proxy serverless /api/claude.
 * La clé API reste côté serveur (env var ANTHROPIC_API_KEY).
 *
 * Le premier paramètre `_apiKey` est conservé dans la signature pour
 * rétro-compatibilité avec l'ancien `callGemini` (et avec callClaudeSecure).
 * Il n'est pas utilisé côté client.
 */
export async function callClaude(
  _apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens: number,
  jsonMode = false,
  preferredModel?: string,
  documents?: BilanDocument[],
): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        userPrompt,
        maxOutputTokens,
        jsonMode,
        preferredModel,
        documents: documents?.map(d => ({
          mimeType: d.mimeType,
          data: d.data,
        })),
      }),
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timeoutId)
    if ((e as Error).name === 'AbortError') {
      throw new ClaudeTimeoutError()
    }
    throw new Error(`Erreur réseau : ${(e as Error).message}`)
  }
  clearTimeout(timeoutId)

  const body = await res.text()

  if (res.status === 401 || res.status === 403) throw new ClaudeAuthError()
  if (!res.ok) {
    let message = body
    try {
      const parsed = JSON.parse(body)
      message = parsed?.error || body
    } catch { /* body n'est pas du JSON, c'est ok */ }
    const truncated = message.length > 500 ? message.slice(0, 500) + '…' : message
    throw new Error(`API ${res.status} : ${truncated}`)
  }

  let data: { result?: string; model?: string; endpoint?: string; usage?: ClaudeUsage }
  try {
    data = JSON.parse(body)
  } catch (e) {
    throw new Error(`Réponse JSON invalide : ${(e as Error).message}`)
  }

  if (typeof data.result !== 'string' || data.result.length === 0) {
    throw new Error('Réponse vide reçue de l\'IA. Réessayez.')
  }

  if (data.usage) {
    const { input, output, cacheRead, cacheCreated } = data.usage
    console.log(
      `[Claude] ${data.model ?? '?'} | in: ${input} (cache hit: ${cacheRead}, created: ${cacheCreated}) | out: ${output}`,
    )
  } else {
    console.log(`[Claude] Modèle : ${data.model ?? 'inconnu'}`)
  }

  return data.result
}
