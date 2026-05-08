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

// Backend par défaut : Azure OpenAI EU (HDS-able via DPA Microsoft, signé par Arnaud).
// Si AZURE_OPENAI_* sont configurés → on utilise Azure (PHI reste en zone EU).
// Sinon → fallback OpenAI standard (dev local / preview tant qu'Azure pas provisioné).
// IMPORTANT : retirer ce fallback dès qu'Azure est déployé en prod (PHI leak sinon).
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT // ex: https://canode-eu.openai.azure.com
const AZURE_KEY = process.env.AZURE_OPENAI_KEY
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT // nom du déploiement Azure (ex: "whisper-prod")
// Default ciblé `gpt-4o-transcribe` (requis ≥ 2025-03-01-preview).
// Whisper-large-v3 marche aussi avec cette version → safe par défaut.
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION ?? '2025-03-01-preview'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const USE_AZURE = !!(AZURE_ENDPOINT && AZURE_KEY && AZURE_DEPLOYMENT)

// Sur Azure, le modèle est porté par le nom du déploiement → pas de form.append('model').
// Sur OpenAI standard, on garde gpt-4o-transcribe (qualité > whisper-1 sur français médical).
const OPENAI_MODEL = 'gpt-4o-transcribe'

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

function buildTranscribeRequest(form: FormData): { url: string; headers: Record<string, string> } {
  if (USE_AZURE) {
    const base = AZURE_ENDPOINT!.replace(/\/+$/, '')
    return {
      url: `${base}/openai/deployments/${encodeURIComponent(AZURE_DEPLOYMENT!)}/audio/transcriptions?api-version=${encodeURIComponent(AZURE_API_VERSION)}`,
      headers: { 'api-key': AZURE_KEY! },
    }
  }
  return {
    url: 'https://api.openai.com/v1/audio/transcriptions',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  }
}

// Retry interne — protège des 429/5xx/network jitter.
// La logique externe (Vercel cold start, OOM…) est gérée côté client.
async function callTranscribe(form: FormData, attempt: number): Promise<{ ok: boolean; status: number; body: string }> {
  const { url, headers } = buildTranscribeRequest(form)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90_000)
  try {
    const apiRes = await fetch(url, {
      method: 'POST',
      headers,
      body: form,
      signal: controller.signal,
    })
    const body = await apiRes.text()
    return { ok: apiRes.ok, status: apiRes.status, body }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed'
    const provider = USE_AZURE ? 'Azure' : 'OpenAI'
    console.error(`[transcribe] ${provider} fetch attempt ${attempt} failed:`, message)
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

  if (!USE_AZURE && !OPENAI_API_KEY) {
    console.error('[transcribe] No transcription backend configured (set AZURE_OPENAI_* or OPENAI_API_KEY)')
    return res.status(500).json({ error: 'Transcription backend not configured on server' })
  }
  if (!USE_AZURE) {
    // PHI leak warning : tant qu'Azure pas configuré, l'audio (qui contient
    // nom/symptômes patient) part chez OpenAI standard — pas de DPA HDS.
    console.warn('[transcribe] AZURE_OPENAI_* not set — falling back to OpenAI standard (no HDS DPA, PHI leaving EU)')
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
    // Sur Azure le modèle est porté par le deployment-id dans l'URL → pas de field model.
    if (!USE_AZURE) form.append('model', OPENAI_MODEL)
    form.append('language', 'fr')
    form.append('prompt', MEDICAL_VOCAB_PROMPT)
    form.append('response_format', 'json')
    // Anti-hallucination : température 0 = décodage déterministe, le modèle
    // s'en tient au plus probable au lieu d'« inventer » des reformulations
    // (« travail de relevé de sol » → « initiation du relevé de sol »).
    form.append('temperature', '0')

    // Retry interne (3 tentatives) sur erreurs transitoires : 429 (rate limit),
    // 500/502/503/504 (panne), ou network jitter. Backoff exponentiel léger.
    const RETRY_DELAYS_MS = [800, 2000, 5000]
    let lastResult: { ok: boolean; status: number; body: string } | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      lastResult = await callTranscribe(form, attempt + 1)
      if (lastResult.ok) break
      const transient = lastResult.status === 0 || lastResult.status === 429 || (lastResult.status >= 500 && lastResult.status < 600)
      if (!transient) break // erreur définitive (400, 401, 413…) → arrêter
      if (attempt < 2) await sleep(RETRY_DELAYS_MS[attempt])
    }

    const provider = USE_AZURE ? 'Azure' : 'OpenAI'

    if (!lastResult) {
      return res.status(500).json({ error: `No ${provider} response` })
    }

    if (!lastResult.ok) {
      let message = lastResult.body
      try {
        const parsed = JSON.parse(lastResult.body)
        message = parsed?.error?.message || lastResult.body
      } catch { /* keep raw */ }
      const truncated = message.length > 500 ? message.slice(0, 500) + '…' : message
      const status = lastResult.status === 0 ? 502 : lastResult.status
      return res.status(status).json({ error: `${provider} ${lastResult.status}: ${truncated}` })
    }

    let data: { text?: string }
    try {
      data = JSON.parse(lastResult.body)
    } catch (e) {
      return res.status(502).json({ error: `Invalid JSON from ${provider}: ${(e as Error).message}` })
    }

    if (!data.text) {
      return res.status(502).json({ error: `Empty transcription from ${provider}` })
    }

    // `model` retourné = identifiant logique pour le client (debug/telemetry).
    // Sur Azure, on expose le deployment-id (info utile sans révéler l'endpoint).
    const modelLabel = USE_AZURE ? `azure:${AZURE_DEPLOYMENT}` : OPENAI_MODEL
    return res.status(200).json({ text: data.text, model: modelLabel })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const stack = err instanceof Error ? err.stack : ''
    console.error('[transcribe] handler crashed:', message, stack)
    return res.status(500).json({ error: message })
  }
}
