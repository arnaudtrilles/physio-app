import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: false,
  },
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const TRANSCRIBE_MODEL = 'gpt-4o-transcribe'

// Prompt de vocabulaire médical pour orienter la transcription sur le jargon kiné/physio.
// OpenAI utilise ce prompt comme contexte stylistique et lexical.
const MEDICAL_VOCAB_PROMPT =
  "Transcription d'un bilan kinésithérapique en français. Vocabulaire attendu : " +
  "EVA, EVN, PSFS, HAD, DN4, DASH, Constant, OSS, Rowe, MRC, ROM, 5D3N, " +
  "red flags, yellow flags, blue flags, black flags, bilan initial, " +
  "douleur mécanique, douleur inflammatoire, tendinopathie, rupture de coiffe, " +
  "conflit sous-acromial, capsulite rétractile, arthropathie acromio-claviculaire, " +
  "sus-épineux, sous-épineux, sous-scapulaire, petit rond, grand rond, deltoïde, " +
  "trapèze, rhomboïde, abduction, adduction, flexion, extension, rotation interne, " +
  "rotation externe, élévation, antépulsion, rétropulsion, Hawkins, Neer, Jobe, " +
  "Yocum, Patte, palm-up test, scapula alata, dyskinésie, articulation gléno-humérale, " +
  "acromio-claviculaire, sterno-claviculaire, scapulo-thoracique, " +
  "amplitude active, amplitude passive, catastrophisme, kinésiophobie, fear-avoidance, " +
  "auto-rééducation, objectifs SMART, prise en charge, PEC, séance."

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

    // Limite raisonnable : ~25 Mo (même plafond que l'API OpenAI audio).
    if (audioBuffer.length > 25 * 1024 * 1024) {
      return res.status(413).json({ error: 'Audio too large (max 25 MB)' })
    }

    const incomingType = (req.headers['content-type'] as string) || 'audio/webm'
    // Mappe le content-type vers un nom de fichier plausible (OpenAI lit l'extension).
    const ext = incomingType.includes('mp4') ? 'mp4'
      : incomingType.includes('mpeg') ? 'mp3'
      : incomingType.includes('wav') ? 'wav'
      : incomingType.includes('ogg') ? 'ogg'
      : 'webm'

    const form = new FormData()
    form.append('file', new Blob([audioBuffer], { type: incomingType }), `audio.${ext}`)
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
