import type { BilanDocument } from '../types'

export class GeminiAuthError extends Error {
  constructor() { super('auth') }
}

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
  const res = await fetch('/api/gemini', {
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
  })

  const body = await res.text()

  if (res.status === 401 || res.status === 403) throw new GeminiAuthError()
  if (!res.ok) throw new Error(body)

  const data = JSON.parse(body)
  console.log(`[Vertex AI] Modèle utilisé : ${data.model ?? 'inconnu'}`)
  return data.result ?? ''
}
