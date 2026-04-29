import type { VercelRequest, VercelResponse } from '@vercel/node'

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
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' })
  }

  try {
    const audioBuffer = await readBody(req)
    if (audioBuffer.length === 0) {
      return res.status(400).json({ error: 'Empty audio body' })
    }

    // Limite OpenAI Whisper : 25 Mo. Au-delà → erreur claire pour que le
    // client splitte. Ce check garde-fou ne devrait jamais se déclencher si
    // le client utilise le rolling MediaRecorder (chunks de ~3-4 Mo).
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

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 55_000)

    let apiRes: Response
    try {
      apiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: form,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const body = await apiRes.text()

    if (!apiRes.ok) {
      let message = body
      try {
        const parsed = JSON.parse(body)
        message = parsed?.error?.message || body
      } catch { /* keep raw */ }
      const truncated = message.length > 500 ? message.slice(0, 500) + '…' : message
      return res.status(apiRes.status).json({ error: `OpenAI ${apiRes.status}: ${truncated}` })
    }

    let data: { text?: string }
    try {
      data = JSON.parse(body)
    } catch (e) {
      return res.status(502).json({ error: `Invalid JSON from OpenAI: ${(e as Error).message}` })
    }

    if (!data.text) {
      return res.status(502).json({ error: 'Empty transcription from OpenAI' })
    }

    return res.status(200).json({ text: data.text, model: TRANSCRIBE_MODEL })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Transcribe proxy error:', message)
    return res.status(500).json({ error: message })
  }
}
