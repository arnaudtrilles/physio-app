import type { BilanDocument } from '../types'

export class GeminiAuthError extends Error {
  constructor() { super('auth') }
}

export class GeminiTimeoutError extends Error {
  constructor() { super('timeout') }
}

// 58s — légèrement sous la limite Vercel Hobby Node serverless de 60s
const CLIENT_TIMEOUT_MS = 58_000

/**
 * Appelle Vertex AI via le proxy serverless /api/gemini.
 * La clé API n'est plus nécessaire côté client — l'auth se fait
 * via Service Account côté serveur.
 *
 * Le paramètre apiKey est conservé dans la signature pour compatibilité
 * avec callGeminiSecure, mais il n'est plus utilisé.
 */
export async function callGemini(
  _apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens: number,
  jsonMode = false,
  preferredModel?: string,
  documents?: BilanDocument[]
): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch('/api/gemini', {
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
      throw new GeminiTimeoutError()
    }
    throw new Error(`Erreur réseau : ${(e as Error).message}`)
  }
  clearTimeout(timeoutId)

  const body = await res.text()

  if (res.status === 401 || res.status === 403) throw new GeminiAuthError()
  if (!res.ok) {
    // Tente de parser comme JSON d'erreur ; sinon utilise le body brut
    let message = body
    try {
      const parsed = JSON.parse(body)
      message = parsed?.error || body
    } catch { /* body n'est pas du JSON, c'est ok */ }
    const truncated = message.length > 500 ? message.slice(0, 500) + '…' : message
    throw new Error(`API ${res.status} : ${truncated}`)
  }

  let data: { result?: string; model?: string; endpoint?: string }
  try {
    data = JSON.parse(body)
  } catch (e) {
    throw new Error(`Réponse JSON invalide : ${(e as Error).message}`)
  }

  if (typeof data.result !== 'string' || data.result.length === 0) {
    throw new Error('Réponse vide reçue de l\'IA. Réessayez.')
  }

  console.log(`[Vertex AI] Modèle : ${data.model ?? 'inconnu'} | Endpoint : ${data.endpoint ?? '?'}`)
  return data.result
}
