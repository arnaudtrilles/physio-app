import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'node:crypto'

// Node.js Serverless — 60s timeout on Hobby plan (Edge was limited to 30s)
export const config = { maxDuration: 60 }

const PROJECT_ID = process.env.GCP_PROJECT_ID!
const REGION = process.env.GCP_REGION || 'europe-west9'

const FALLBACK_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
]

const MODEL_REMAP: Record<string, string> = {
  'gemini-3-flash': 'gemini-2.5-flash',
  'gemini-2.5-flash-preview-04-17': 'gemini-2.5-flash',
  'gemini-2.0-flash': 'gemini-2.5-flash',
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-1.5-flash': 'gemini-2.5-flash',
}

// ── JWT auth using Node.js crypto ──

function base64url(data: string): string {
  return Buffer.from(data).toString('base64url')
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const raw = process.env.GCP_SERVICE_ACCOUNT_KEY
  if (!raw) throw new Error('GCP_SERVICE_ACCOUNT_KEY not configured')
  const sa = JSON.parse(raw)

  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const sig = sign.sign(sa.private_key, 'base64url')
  const jwt = `${header}.${payload}.${sig}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(tokenData))

  cachedToken = { token: tokenData.access_token, expiresAt: Date.now() + tokenData.expires_in * 1000 }
  return cachedToken.token
}

// ── Handler ──

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

    const remapped = preferredModel ? (MODEL_REMAP[preferredModel] ?? preferredModel) : null
    const models = remapped
      ? [remapped, ...FALLBACK_MODELS.filter(m => m !== remapped)]
      : FALLBACK_MODELS

    const parts: Array<Record<string, unknown>> = [{ text: userPrompt }]
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        parts.push({ inline_data: { mime_type: doc.mimeType, data: doc.data } })
      }
      parts.push({
        text: '\nLes documents ci-dessus sont les pièces jointes du patient (radios, comptes rendus médicaux). Tiens-en compte dans ton analyse.',
      })
    }

    const accessToken = await getAccessToken()

    const requestBody = JSON.stringify({
      system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents: [{ role: 'user', parts }],
      generationConfig: {
        maxOutputTokens: maxOutputTokens || 8192,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    })

    const endpoints = [
      { host: `${REGION}-aiplatform.googleapis.com`, location: REGION },
      { host: 'aiplatform.googleapis.com', location: 'global' },
    ]

    let lastError = ''
    for (const model of models) {
      for (const ep of endpoints) {
        const url = `https://${ep.host}/v1/projects/${PROJECT_ID}/locations/${ep.location}/publishers/google/models/${model}:generateContent`

        const apiRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: requestBody,
        })

        if (apiRes.status === 404) continue

        const body = await apiRes.text()
        if (!apiRes.ok) {
          lastError = body
          if (apiRes.status === 503 || apiRes.status === 429) continue
          return res.status(apiRes.status).json({ error: body })
        }

        const data = JSON.parse(body)
        const responseParts: Array<{ thought?: boolean; text?: string }> =
          data?.candidates?.[0]?.content?.parts ?? []
        const textPart = responseParts.find((p: { thought?: boolean; text?: string }) => !p.thought && typeof p.text === 'string')
        const result = textPart?.text ?? responseParts[0]?.text ?? ''

        return res.status(200).json({ result, model, endpoint: ep.location })
      }
    }

    return res.status(503).json({ error: lastError || 'No model available' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Vertex AI proxy error:', message)
    return res.status(500).json({ error: message })
  }
}
