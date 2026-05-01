import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { checkRateLimit, getClientIp } from './_ratelimit'

// 30 appels Gemini par minute par IP
const RATE_LIMIT = { maxRequests: 30, windowMs: 60_000 }

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
// Promise verrou : déduplique les fetchs concurrents (sinon N requêtes simultanées
// déclenchent N appels OAuth → quota Google grillé pour rien)
let tokenFetchPromise: Promise<string> | null = null

async function fetchWithTimeout(url: string, opts: RequestInit & { timeoutMs?: number }): Promise<Response> {
  const { timeoutMs = 15_000, ...rest } = opts
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

/**
 * Dev-only : `vercel dev` ne propage PAS les variables ajoutées manuellement
 * dans `.env.local` (il ne relaie que celles déclarées sur Vercel cloud). Pour
 * contourner, on lit directement le fichier `.env.local` au premier appel et
 * on récupère la clé de service account si elle y est. En production, ce
 * fichier n'existe pas et cette branche est court-circuitée.
 */
let localEnvFallbackCache: string | null | undefined = undefined
function loadServiceAccountFromLocalEnv(): string | null {
  if (localEnvFallbackCache !== undefined) return localEnvFallbackCache
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    if (!fs.existsSync(envPath)) return (localEnvFallbackCache = null)
    const content = fs.readFileSync(envPath, 'utf8')
    // Cherche GCP_SERVICE_ACCOUNT_KEY_B64=<base64> (sans quotes)
    const b64Match = content.match(/^GCP_SERVICE_ACCOUNT_KEY_B64=([A-Za-z0-9+/=]+)$/m)
    if (b64Match) {
      const decoded = Buffer.from(b64Match[1], 'base64').toString('utf8')
      JSON.parse(decoded) // validate
      return (localEnvFallbackCache = decoded)
    }
    // Fallback : GCP_SERVICE_ACCOUNT_KEY='<raw json>'
    const rawMatch = content.match(/^GCP_SERVICE_ACCOUNT_KEY='([^']+)'$/m)
    if (rawMatch) {
      JSON.parse(rawMatch[1])
      return (localEnvFallbackCache = rawMatch[1])
    }
    return (localEnvFallbackCache = null)
  } catch (e) {
    console.error('[gemini] .env.local local fallback read failed:', (e as Error).message)
    return (localEnvFallbackCache = null)
  }
}

async function fetchNewToken(): Promise<string> {
  let raw = process.env.GCP_SERVICE_ACCOUNT_KEY
  if (!raw && process.env.GCP_SERVICE_ACCOUNT_KEY_B64) {
    try {
      raw = Buffer.from(process.env.GCP_SERVICE_ACCOUNT_KEY_B64, 'base64').toString('utf8')
    } catch (e) {
      throw new Error('GCP_SERVICE_ACCOUNT_KEY_B64 decode failed: ' + (e as Error).message)
    }
  }
  // Dev local : si rien dans process.env, lit .env.local direct
  if (!raw) {
    const fromFile = loadServiceAccountFromLocalEnv()
    if (fromFile) raw = fromFile
  }
  if (!raw) throw new Error('GCP_SERVICE_ACCOUNT_KEY not configured')

  let sa: { client_email: string; private_key: string }
  try {
    sa = JSON.parse(raw)
  } catch (e) {
    throw new Error('GCP_SERVICE_ACCOUNT_KEY is not valid JSON: ' + (e as Error).message)
  }

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

  const tokenRes = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    timeoutMs: 10_000,
  })

  const text = await tokenRes.text()
  if (!tokenRes.ok) {
    throw new Error(`OAuth token fetch failed (${tokenRes.status}): ${text.slice(0, 500)}`)
  }

  let tokenData: { access_token?: string; expires_in?: number }
  try {
    tokenData = JSON.parse(text)
  } catch {
    throw new Error('OAuth response is not valid JSON: ' + text.slice(0, 200))
  }

  if (!tokenData.access_token || typeof tokenData.expires_in !== 'number') {
    throw new Error('Failed to get access token: ' + JSON.stringify(tokenData).slice(0, 300))
  }

  cachedToken = {
    token: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  }
  return cachedToken.token
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }
  // Si un fetch est déjà en vol, attend son résultat (déduplication)
  if (tokenFetchPromise) return tokenFetchPromise

  tokenFetchPromise = fetchNewToken().finally(() => {
    tokenFetchPromise = null
  })
  return tokenFetchPromise
}

// ── Handler ──

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>)
  if (!checkRateLimit(`gemini:${ip}`, RATE_LIMIT)) {
    return res.status(429).json({ error: 'Trop de requêtes. Réessaie dans une minute.' })
  }

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

        let apiRes: Response
        try {
          apiRes = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: requestBody,
            timeoutMs: 55_000, // marge sous le maxDuration de 60s
          })
        } catch (e) {
          // Timeout ou erreur réseau → essaie le modèle/endpoint suivant
          lastError = `Network error on ${model}/${ep.location}: ${(e as Error).message}`
          continue
        }

        if (apiRes.status === 404) continue

        const body = await apiRes.text()
        if (!apiRes.ok) {
          // Tronque pour éviter les énormes réponses d'erreur (avec attachements)
          lastError = body.length > 1000 ? body.slice(0, 1000) + '…' : body
          if (apiRes.status === 503 || apiRes.status === 429) continue
          // Tente de parser le message d'erreur Vertex AI proprement
          let errorMessage = lastError
          try {
            const parsed = JSON.parse(body)
            errorMessage = parsed?.error?.message || lastError
          } catch { /* garde le body brut */ }
          return res.status(apiRes.status).json({ error: errorMessage })
        }

        let data: { candidates?: Array<{ content?: { parts?: Array<{ thought?: boolean; text?: string }> } }> }
        try {
          data = JSON.parse(body)
        } catch (e) {
          lastError = `Invalid JSON from Vertex AI (${model}): ${(e as Error).message}`
          continue
        }

        const responseParts: Array<{ thought?: boolean; text?: string }> =
          data?.candidates?.[0]?.content?.parts ?? []

        if (!Array.isArray(responseParts) || responseParts.length === 0) {
          lastError = `Empty response from ${model}: no parts found`
          continue
        }

        const textPart = responseParts.find((p) => !p.thought && typeof p.text === 'string')
        const result = textPart?.text ?? responseParts[0]?.text ?? ''

        if (!result) {
          lastError = `No text content in response from ${model}`
          continue
        }

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
