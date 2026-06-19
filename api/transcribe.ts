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
  // Plan Vercel Pro : maxDuration jusqu'à 300s (timeout sur audio long de séance)
  maxDuration: 300,
  api: {
    bodyParser: false,
  },
}

// Backend obligatoire : Azure OpenAI France Central (HDS-compliant via DPA Microsoft).
// Pas de fallback OpenAI standard — le PHI ne doit jamais quitter la zone EU.
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT // ex: https://physio-app-bilan.openai.azure.com
const AZURE_KEY = process.env.AZURE_OPENAI_KEY

// Deux deployments Azure pour deux profils audio :
//   - SOLO    = `gpt-4o-transcribe`         (kiné dicte seul, ~80% de l'usage)
//   - SESSION = `gpt-4o-transcribe-diarize` (kiné + patient parlent, sortie segmentée)
const AZURE_DEPLOYMENT_SOLO = process.env.AZURE_OPENAI_SOLO_DEPLOYMENT
const AZURE_DEPLOYMENT_SESSION = process.env.AZURE_OPENAI_SESSION_DEPLOYMENT

// `gpt-4o-transcribe` requiert ≥ 2025-03-01-preview.
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION ?? '2025-03-01-preview'

// Vocabulaire kiné/physio — biaise Whisper vers les noms propres + acronymes
// les plus mal transcrits sans donner assez de contexte pour halluciner un bilan.
// Budget Whisper ≈ 224 tokens — mesuré ~210. Source canonique :
// src/utils/clinicalLexicon.ts (WHISPER_VOCAB_PROMPT).
const MEDICAL_VOCAB_PROMPT =
  "Vocabulaire kinésithérapie : Lasègue, Lachman, Spurling, Hawkins, Neer, Jobe, " +
  "McMurray, Thessaly, FABER, FADIR, Thomas, Ober, Trendelenburg, Slump, ULNT, " +
  "Schober, Romberg, Phalen, Tinel, Finkelstein, Cozen, Mill, Babinski, Mézières, " +
  "McKenzie, Maitland, Mulligan, Sohier, Bobath, Kabat, Cyriax. " +
  "Coiffe des rotateurs, supra-épineux, infra-épineux, sub-scapulaire, " +
  "sterno-cléido-mastoïdien, ischio-jambiers, ilio-psoas, gastrocnémiens, " +
  "scaphoïde, épicondyle, épitrochlée, fémoro-tibiale, tibio-tarsienne, " +
  "sacro-iliaque, capsulite, tendinopathie, sciatique. " +
  "EVA, EVN, PSFS, HAD, DN4, DASH, KOOS, WOMAC, NDI, MRC, ROM, PEC, BDK, " +
  "LCA, LCP, AVC, BPCO, VPPB, SDRC, NCB, TMS, PTH, PTG, TFL, IUE, TENS, IRM."

type TranscribeMode = 'solo' | 'session'

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

// Le client peut spécifier le mode via header `x-transcribe-mode` ou query `?mode=`.
// Default = 'solo' pour rétro-compat avec tous les call sites existants (VoiceMic,
// VoiceDictation) — seul l'enregistrement de séance enverra explicitement 'session'.
function readMode(req: VercelRequest): TranscribeMode {
  const headerVal = req.headers['x-transcribe-mode']
  const headerMode = Array.isArray(headerVal) ? headerVal[0] : headerVal
  const queryVal = req.query?.mode
  const queryMode = Array.isArray(queryVal) ? queryVal[0] : queryVal
  const raw = (headerMode ?? queryMode ?? 'solo').toString().toLowerCase()
  return raw === 'session' ? 'session' : 'solo'
}

function pickAzureDeployment(mode: TranscribeMode): string {
  // Si SESSION_DEPLOYMENT manque, fallback sur SOLO (l'app fonctionne sans
  // diarisation plutôt que crasher — log warning côté handler).
  if (mode === 'session') return AZURE_DEPLOYMENT_SESSION ?? AZURE_DEPLOYMENT_SOLO!
  return AZURE_DEPLOYMENT_SOLO!
}

function buildTranscribeRequest(
  mode: TranscribeMode,
): { url: string; headers: Record<string, string>; deployment: string } {
  const base = AZURE_ENDPOINT!.replace(/\/+$/, '')
  const deployment = pickAzureDeployment(mode)
  return {
    url: `${base}/openai/deployments/${encodeURIComponent(deployment)}/audio/transcriptions?api-version=${encodeURIComponent(AZURE_API_VERSION)}`,
    headers: { 'api-key': AZURE_KEY! },
    deployment,
  }
}

// Retry interne — protège des 429/5xx/network jitter.
// La logique externe (Vercel cold start, OOM…) est gérée côté client.
async function callTranscribe(
  form: FormData,
  mode: TranscribeMode,
  attempt: number,
): Promise<{ ok: boolean; status: number; body: string }> {
  const { url, headers } = buildTranscribeRequest(mode)
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
    console.error(`[transcribe] Azure ${mode} fetch attempt ${attempt} failed:`, message)
    return { ok: false, status: 0, body: message }
  } finally {
    clearTimeout(timeoutId)
  }
}

// ── Parser : flat (mode solo) vs segmenté (mode session/diarize) ──
// Le format diarize d'Azure renvoie un JSON enrichi avec `segments` (liste
// d'objets {text, speaker, start, end}). On le restitue en texte structuré
// que le LLM downstream (Claude) parsera proprement :
//
//   [Patient] J'ai mal au dos depuis trois semaines.
//   [Kiné]   D'accord, montrez-moi où exactement…
//
// Heuristique speaker labeling : Azure renvoie "speaker_0", "speaker_1"…
// On les map sur "Locuteur 1", "Locuteur 2"… (le client peut renommer
// "Kiné" / "Patient" en post-traitement après confirmation manuelle).

interface DiarizeSegment {
  text?: string
  speaker?: string | number
  start?: number
  end?: number
}

interface TranscribeResponse {
  text?: string
  segments?: DiarizeSegment[]
}

function formatDiarizedText(data: TranscribeResponse): string {
  if (!data.segments || data.segments.length === 0) {
    return data.text?.trim() ?? ''
  }
  // Stabilise l'ordre des speaker labels (premier rencontré = Locuteur 1).
  const labelMap = new Map<string, string>()
  let nextLabel = 1
  const lines: string[] = []
  for (const seg of data.segments) {
    const text = seg.text?.trim()
    if (!text) continue
    const rawSpeaker = String(seg.speaker ?? 'unknown')
    let label = labelMap.get(rawSpeaker)
    if (!label) {
      label = `Locuteur ${nextLabel++}`
      labelMap.set(rawSpeaker, label)
    }
    lines.push(`[${label}] ${text}`)
  }
  return lines.join('\n')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res, 'POST, OPTIONS', 'Content-Type, x-transcribe-mode')) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>)
  const userId = extractUserId(req)
  const rl = await rateLimit({ config: RATE_LIMIT_CONFIG, userId, ip })
  if (!rl.allowed) {
    const retrySec = Math.max(1, Math.ceil((rl.retryAfterMs ?? 60_000) / 1000))
    res.setHeader('Retry-After', String(retrySec))
    return res.status(429).json({ error: `Trop de requêtes. Réessaie dans ${retrySec}s.` })
  }

  if (!AZURE_ENDPOINT || !AZURE_KEY || !AZURE_DEPLOYMENT_SOLO) {
    console.error('[transcribe] Azure config incomplete — set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_SOLO_DEPLOYMENT')
    return res.status(500).json({ error: 'Transcription backend not configured on server' })
  }

  const mode = readMode(req)

  // Si mode=session demandé mais le deployment dédié n'est pas configuré,
  // on log un warning explicite — la diarisation ne fonctionnera pas mais
  // le code retombe sur le solo deployment pour ne pas casser l'enregistrement.
  if (mode === 'session' && !AZURE_DEPLOYMENT_SESSION) {
    console.warn('[transcribe] mode=session demandé mais AZURE_OPENAI_SESSION_DEPLOYMENT non configuré — fallback sur deployment SOLO (pas de diarisation)')
  }

  try {
    const audioBuffer = await readBody(req)
    if (audioBuffer.length === 0) {
      return res.status(400).json({ error: 'Empty audio body' })
    }

    // Limite OpenAI / Azure Whisper : 25 Mo. Au-delà → erreur claire pour que le
    // client splitte. Ce check garde-fou ne devrait jamais se déclencher si
    // le client utilise le rolling MediaRecorder (chunks de ~1-2 Mo).
    if (audioBuffer.length > 25 * 1024 * 1024) {
      return res.status(413).json({ error: 'Audio chunk too large (max 25 MB) — split client-side' })
    }

    const incomingType = (req.headers['content-type'] as string) || 'audio/webm'
    // Mappe le content-type vers un nom de fichier plausible (l'API lit l'extension).
    const ext = incomingType.includes('mp4') ? 'mp4'
      : incomingType.includes('mpeg') ? 'mp3'
      : incomingType.includes('wav') ? 'wav'
      : incomingType.includes('ogg') ? 'ogg'
      : 'webm'

    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(audioBuffer)], { type: incomingType }), `audio.${ext}`)
    // Sur Azure le modèle est porté par le deployment-id dans l'URL → pas de field model.
    form.append('language', 'fr')
    form.append('prompt', MEDICAL_VOCAB_PROMPT)
    // Mode session → on demande verbose_json pour récupérer les segments diarisés.
    // Mode solo → json plat suffit (plus rapide, payload plus petit).
    form.append('response_format', mode === 'session' ? 'verbose_json' : 'json')
    // Anti-hallucination : température 0 = décodage déterministe, le modèle
    // s'en tient au plus probable au lieu d'« inventer » des reformulations
    // (« travail de relevé de sol » → « initiation du relevé de sol »).
    form.append('temperature', '0')

    // Retry interne (3 tentatives) sur erreurs transitoires : 429 (rate limit),
    // 500/502/503/504 (panne), ou network jitter. Backoff exponentiel léger.
    const RETRY_DELAYS_MS = [800, 2000, 5000]
    let lastResult: { ok: boolean; status: number; body: string } | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      lastResult = await callTranscribe(form, mode, attempt + 1)
      if (lastResult.ok) break
      const transient = lastResult.status === 0 || lastResult.status === 429 || (lastResult.status >= 500 && lastResult.status < 600)
      if (!transient) break // erreur définitive (400, 401, 413…) → arrêter
      if (attempt < 2) await sleep(RETRY_DELAYS_MS[attempt])
    }

    if (!lastResult) {
      return res.status(500).json({ error: 'No Azure response' })
    }

    if (!lastResult.ok) {
      let message = lastResult.body
      try {
        const parsed = JSON.parse(lastResult.body)
        message = parsed?.error?.message || lastResult.body
      } catch { /* keep raw */ }
      const truncated = message.length > 500 ? message.slice(0, 500) + '…' : message
      const status = lastResult.status === 0 ? 502 : lastResult.status
      return res.status(status).json({ error: `Azure ${lastResult.status}: ${truncated}` })
    }

    let data: TranscribeResponse
    try {
      data = JSON.parse(lastResult.body)
    } catch (e) {
      return res.status(502).json({ error: `Invalid JSON from Azure: ${(e as Error).message}` })
    }

    // En mode session avec Azure diarize, on assemble la sortie texte structurée
    // à partir des segments. Si le deployment ne supporte pas la diarisation
    // (fallback solo), `segments` peut être absent → on renvoie le `text` plat.
    const text = mode === 'session' ? formatDiarizedText(data) : (data.text?.trim() ?? '')

    if (!text) {
      return res.status(502).json({ error: 'Empty transcription from Azure' })
    }

    // `model` retourné = identifiant logique pour le client (debug/telemetry).
    // Le deployment-id est utile sans révéler l'endpoint complet.
    const modelLabel = `azure:${pickAzureDeployment(mode)}`
    const diarized = mode === 'session' && Array.isArray(data.segments) && data.segments.length > 0
    return res.status(200).json({ text, model: modelLabel, mode, diarized })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const stack = err instanceof Error ? err.stack : ''
    console.error('[transcribe] handler crashed:', message, stack)
    return res.status(500).json({ error: message })
  }
}
