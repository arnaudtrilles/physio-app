import type { VercelRequest, VercelResponse } from '@vercel/node'
import { GoogleAuth } from 'google-auth-library'

const PROJECT_ID = process.env.GCP_PROJECT_ID!
const REGION = process.env.GCP_REGION || 'europe-west9'

// Models available on Vertex AI (keep short to avoid slow 404 fallbacks)
const FALLBACK_MODELS = [
  'gemini-3-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
]

// Models that don't exist on Vertex AI — remap to equivalent
const MODEL_REMAP: Record<string, string> = {
  'gemini-3.1-pro-preview': 'gemini-3-flash',
  'gemini-2.5-flash-preview-04-17': 'gemini-2.5-flash',
  'gemini-2.0-flash': 'gemini-2.5-flash',
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-1.5-flash': 'gemini-2.5-flash',
}

// Parse service account key from env
function getAuth(): GoogleAuth {
  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GCP_SERVICE_ACCOUNT_KEY not configured')
  const credentials = JSON.parse(raw)
  return new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
}

let authClient: GoogleAuth | null = null

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { systemPrompt, userPrompt, maxOutputTokens, jsonMode, preferredModel, documents } = req.body

    if (!userPrompt) return res.status(400).json({ error: 'userPrompt is required' })

    // Build model list (remap old/preview model names to Vertex-available ones)
    const remapped = preferredModel ? (MODEL_REMAP[preferredModel] ?? preferredModel) : null
    const models = remapped
      ? [remapped, ...FALLBACK_MODELS.filter(m => m !== remapped)]
      : FALLBACK_MODELS

    // Build content parts
    const parts: Array<Record<string, unknown>> = [{ text: userPrompt }]
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        parts.push({ inline_data: { mime_type: doc.mimeType, data: doc.data } })
      }
      parts.push({
        text: '\nLes documents ci-dessus sont les pièces jointes du patient (radios, comptes rendus médicaux). Tiens-en compte dans ton analyse.',
      })
    }

    // Get access token
    if (!authClient) authClient = getAuth()
    const client = await authClient.getClient()
    const tokenRes = await client.getAccessToken()
    const accessToken = tokenRes.token

    const requestBody = JSON.stringify({
      system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents: [{ role: 'user', parts }],
      generationConfig: {
        maxOutputTokens: maxOutputTokens || 8192,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    })

    let lastError = ''
    for (const model of models) {
      const url = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${model}:generateContent`

      const apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: requestBody,
      })

      if (apiRes.status === 404) continue // model not available in region

      const body = await apiRes.text()
      if (!apiRes.ok) {
        lastError = body
        if (apiRes.status === 503 || apiRes.status === 429) continue
        return res.status(apiRes.status).json({ error: body })
      }

      const data = JSON.parse(body)
      const responseParts: Array<{ thought?: boolean; text?: string }> =
        data?.candidates?.[0]?.content?.parts ?? []
      const textPart = responseParts.find(p => !p.thought && typeof p.text === 'string')
      const result = textPart?.text ?? responseParts[0]?.text ?? ''

      return res.status(200).json({ result, model })
    }

    return res.status(503).json({ error: lastError || 'No model available' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Vertex AI proxy error:', message)
    return res.status(500).json({ error: message })
  }
}
