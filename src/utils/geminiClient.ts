import type { BilanDocument } from '../types'

// Fallback order when the preferred model is unavailable
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
]

function isAuthError(status: number, body: string): boolean {
  if (status === 401 || status === 403) return true
  if (body.includes('API_KEY_INVALID') || body.includes('UNAUTHENTICATED')) return true
  return false
}

export class GeminiAuthError extends Error {
  constructor() { super('auth') }
}

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens: number,
  jsonMode = false,
  preferredModel?: string,
  documents?: BilanDocument[]
): Promise<string> {
  if (apiKey.startsWith('gsk_')) throw new GeminiAuthError()

  // Build model list: preferred first, then fallbacks (deduped)
  const models = preferredModel
    ? [preferredModel, ...FALLBACK_MODELS.filter(m => m !== preferredModel)]
    : FALLBACK_MODELS

  // Build content parts: text + optional inline documents
  const parts: Array<Record<string, unknown>> = [{ text: userPrompt }]
  if (documents && documents.length > 0) {
    for (const doc of documents) {
      parts.push({ inline_data: { mime_type: doc.mimeType, data: doc.data } })
    }
    parts.push({ text: '\nLes documents ci-dessus sont les pièces jointes du patient (radios, comptes rendus médicaux). Tiens-en compte dans ton analyse.' })
  }

  let lastError = ''
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts }],
          generationConfig: {
            maxOutputTokens,
            ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
          },
        }),
      }
    )
    if (res.status === 404) continue
    const body = await res.text()
    if (isAuthError(res.status, body)) throw new GeminiAuthError()
    if (!res.ok) {
      lastError = body
      if (res.status === 503 || res.status === 429) continue
      throw new Error(body)
    }
    const data = JSON.parse(body)
    const responseParts: Array<{ thought?: boolean; text?: string }> = data?.candidates?.[0]?.content?.parts ?? []
    const textPart = responseParts.find(p => !p.thought && typeof p.text === 'string')
    return textPart?.text ?? responseParts[0]?.text ?? ''
  }
  throw new Error(lastError || 'Aucun modèle Gemini disponible. Réessayez dans quelques secondes.')
}
