import type { VercelRequest, VercelResponse } from '@vercel/node'
import { rateLimit, getClientIp } from './_ratelimit.js'
import { extractUserId } from './_auth.js'
import { applyCors } from './_cors.js'

// 60/min par utilisateur authentifié (large headroom : un séance vocale 30 min
// = 6 chunks ; un kiné qui dicte rapidement = ~5/min). Pas de faux positif sur
// cabinet partagé / 4G CGNAT puisque c'est par userId Supabase, pas par IP.
// Fallback anonyme (token JWT absent ou invalide) : 15/min par IP — anti-abus.
const RATE_LIMIT_CONFIG = {
  name: 'transcribe',
  perUser: { max: 60, windowMs: 60_000 },
  perIp: { max: 15, windowMs: 60_000 },
}

export const config = {
  // Plan Vercel Pro : maxDuration jusqu'à 300s (timeout Whisper sur audio long)
  maxDuration: 300,
  api: {
    bodyParser: false,
  },
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const TRANSCRIBE_MODEL = 'gpt-4o-transcribe'

// Prompt court de vocabulaire — uniquement les abréviations/sigles pour orienter la
// reconnaissance sans fournir assez de contexte pour que le modèle hallucine un bilan.
const MEDICAL_VOCAB_PROMPT =
  "EVA, EVN, PSFS, HAD, DN4, DASH, MRC, ROM, PEC, SMART, IRM."

function readBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on('data', (c: Buffer) => {
      chunks.push(c)
      total += c.length
    })
    req.on('end', () => resolve(Buffer.concat(chunks, total)))
    req.on('error', reject)
  })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Retry interne sur l'appel OpenAI — protège des 429/5xx/network jitter.
// La logique externe (Vercel cold start, OOM…) est gérée côté client.
async function callOpenAITranscribe(form: FormData, attempt: number): Promise<{ ok: boolean; status: number; body: string }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90_000)
  try {
    const apiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
      signal: controller.signal,
    })
    const body = await apiRes.text()
    return { ok: apiRes.ok, status: apiRes.status, body }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed'
    console.error(`[transcribe] OpenAI fetch attempt ${attempt} failed:`, message)
    return { ok: false, status: 0, body: message }
  } finally {
    clearTimeout(timeoutId)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res, 'POST, OPTIONS')) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>)
  const userId = extractUserId(req)
  const rl = await rateLimit({ config: RATE_LIMIT_CONFIG, userId, ip })
  if (!rl.allowed) {
    const retrySec = Math.max(1, Math.ceil((rl.retryAfterMs ?? 60_000) / 1000))
    res.setHeader('Retry-After', String(retrySec))
    return res.status(429).json({ error: `Trop de requêtes. Réessaie dans ${retrySec}s.` })
  }

  if (!OPENAI_API_KEY) {
    console.error('[transcribe] OPENAI_API_KEY not configured')
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' })
  }

  try {
    const audioBuffer = await readBody(req)
    if (audioBuffer.length === 0) {
      return res.status(400).json({ error: 'Empty audio body' })
    }

    // Limite OpenAI Whisper : 25 Mo. Au-delà → erreur claire pour que le
    // client splitte. Ce check garde-fou ne devrait jamais se déclencher si
    // le client utilise le rolling MediaRecorder (chunks de ~1-2 Mo).
    if (audioBuffer.length > 25 * 1024 * 1024) {
      return res.status(413).json({ error: 'Audio chunk too large (max 25 MB) — split client-side' })
    }

    const incomingType = (req.headers['content-type'] as string) || 'audio/webm'
    // Mappe le content-type vers un nom de fichier plausible (OpenAI lit l'extension).
    const ext = incomingType.includes('mp4') ? 'mp4'
      : incomingType.includes('mpeg') ? 'mp3'
      : incomingType.includes('wav') ? 'wav'
      : incomingType.includes('ogg') ? 'ogg'
      : 'webm'

    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(audioBuffer)], { type: incomingType }), `audio.${ext}`)
    form.append('model', TRANSCRIBE_MODEL)
    form.append('language', 'fr')
    form.append('prompt', MEDICAL_VOCAB_PROMPT)
    form.append('response_format', 'json')
    // Anti-hallucination : température 0 = décodage déterministe, le modèle
    // s'en tient au plus probable au lieu d'« inventer » des reformulations
    // (« travail de relevé de sol » → « initiation du relevé de sol »).
    form.append('temperature', '0')

    // Retry interne (3 tentatives) sur erreurs transitoires OpenAI : 429 (rate limit),
    // 500/502/503/504 (panne), ou network jitter. Backoff exponentiel léger.
    const RETRY_DELAYS_MS = [800, 2000, 5000]
    let lastResult: { ok: boolean; status: number; body: string } | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      lastResult = await callOpenAITranscribe(form, attempt + 1)
      if (lastResult.ok) break
      const transient = lastResult.status === 0 || lastResult.status === 429 || (lastResult.status >= 500 && lastResult.status < 600)
      if (!transient) break // erreur définitive (400, 401, 413…) → arrêter
      if (attempt < 2) await sleep(RETRY_DELAYS_MS[attempt])
    }

    if (!lastResult) {
      return res.status(500).json({ error: 'No OpenAI response' })
    }

    if (!lastResult.ok) {
      let message = lastResult.body
      try {
        const parsed = JSON.parse(lastResult.body)
        message = parsed?.error?.message || lastResult.body
      } catch { /* keep raw */ }
      const truncated = message.length > 500 ? message.slice(0, 500) + '…' : message
      const status = lastResult.status === 0 ? 502 : lastResult.status
      return res.status(status).json({ error: `OpenAI ${lastResult.status}: ${truncated}` })
    }

    let data: { text?: string }
    try {
      data = JSON.parse(lastResult.body)
    } catch (e) {
      return res.status(502).json({ error: `Invalid JSON from OpenAI: ${(e as Error).message}` })
    }

    if (!data.text) {
      return res.status(502).json({ error: 'Empty transcription from OpenAI' })
    }

    return res.status(200).json({ text: data.text, model: TRANSCRIBE_MODEL })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const stack = err instanceof Error ? err.stack : ''
    console.error('[transcribe] handler crashed:', message, stack)
    return res.status(500).json({ error: message })
  }
}
