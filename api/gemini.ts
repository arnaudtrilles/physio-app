// Edge Runtime — 30s timeout on Hobby plan (vs 10s for Node.js)
export const config = { runtime: 'edge' }

const PROJECT_ID = process.env.GCP_PROJECT_ID!
const REGION = process.env.GCP_REGION || 'europe-west9'

const FALLBACK_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
]

// Remap old model names to Vertex-available equivalents
const MODEL_REMAP: Record<string, string> = {
  'gemini-3-flash': 'gemini-2.5-flash',
  'gemini-2.5-flash-preview-04-17': 'gemini-2.5-flash',
  'gemini-2.0-flash': 'gemini-2.5-flash',
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-1.5-flash': 'gemini-2.5-flash',
}

// ── JWT auth for Edge Runtime (no google-auth-library needed) ──

function base64url(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlFromBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  // Reuse token if still valid (with 60s margin)
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

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`))
  const jwt = `${header}.${payload}.${base64urlFromBytes(new Uint8Array(sig))}`

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

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { systemPrompt, userPrompt, maxOutputTokens, jsonMode, preferredModel, documents } = await req.json()

    if (!userPrompt) return Response.json({ error: 'userPrompt is required' }, { status: 400 })

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

    // Try regional (europe-west9) first, then global endpoint as fallback
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

        if (apiRes.status === 404) continue // try next endpoint or model

        const body = await apiRes.text()
        if (!apiRes.ok) {
          lastError = body
          if (apiRes.status === 503 || apiRes.status === 429) continue
          return Response.json({ error: body }, { status: apiRes.status })
        }

        const data = JSON.parse(body)
        const responseParts: Array<{ thought?: boolean; text?: string }> =
          data?.candidates?.[0]?.content?.parts ?? []
        const textPart = responseParts.find((p: { thought?: boolean; text?: string }) => !p.thought && typeof p.text === 'string')
        const result = textPart?.text ?? responseParts[0]?.text ?? ''

        return Response.json({ result, model, endpoint: ep.location })
      }
    }

    return Response.json({ error: lastError || 'No model available' }, { status: 503 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Vertex AI proxy error:', message)
    return Response.json({ error: message }, { status: 500 })
  }
}
