import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'node:fs'
import path from 'node:path'
import { checkRateLimit, getClientIp } from './_ratelimit'

// 30 appels Claude par minute par IP
const RATE_LIMIT = { maxRequests: 30, windowMs: 60_000 }
// Timeout global : 120s (modèles lents comme Opus peuvent prendre du temps)
const CLAUDE_TIMEOUT_MS = 120_000

// Plan Vercel Pro : maxDuration jusqu'à 300s (transcriptions longues = beaucoup de tokens)
export const config = { maxDuration: 300 }

// ── Modèles ───────────────────────────────────────────────────────────────
const DEFAULT_MODEL = 'claude-sonnet-4-6'
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const OPUS_MODEL = 'claude-opus-4-7'

// Remap des anciens IDs Gemini vers Claude (pour compat rétro pendant la migration)
const LEGACY_REMAP: Record<string, string> = {
  'gemini-3.1-pro-preview': DEFAULT_MODEL,
  'gemini-3-flash': DEFAULT_MODEL,
  'gemini-2.5-pro': DEFAULT_MODEL,
  'gemini-2.5-flash': DEFAULT_MODEL,
  'gemini-2.5-flash-preview-04-17': DEFAULT_MODEL,
  'gemini-2.0-flash': HAIKU_MODEL, // flash → haiku (rapide/léger)
  'gemini-1.5-pro': DEFAULT_MODEL,
  'gemini-1.5-flash': HAIKU_MODEL,
}

const ALLOWED_MODELS = new Set([DEFAULT_MODEL, HAIKU_MODEL, OPUS_MODEL])

// ── Dev fallback : lire .env.local directement ───────────────────────────
// `vercel dev` ne propage PAS les variables locales (seulement celles sur Vercel cloud).
// En dev, on lit `.env.local` au premier appel. En prod, ce fichier n'existe pas.
let localEnvFallbackCache: string | null | undefined = undefined
function loadApiKeyFromLocalEnv(): string | null {
  if (localEnvFallbackCache !== undefined) return localEnvFallbackCache
  try {
    const envPath = path.join(process.cwd(), '.env.local')
    if (!fs.existsSync(envPath)) return (localEnvFallbackCache = null)
    const content = fs.readFileSync(envPath, 'utf8')
    const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m)
    if (!match) return (localEnvFallbackCache = null)
    const raw = match[1].trim()
    // Retire guillemets éventuels
    const cleaned = raw.replace(/^["']|["']$/g, '').trim()
    return (localEnvFallbackCache = cleaned || null)
  } catch (e) {
    console.error('[claude] .env.local read failed:', (e as Error).message)
    return (localEnvFallbackCache = null)
  }
}

// ── Client singleton ─────────────────────────────────────────────────────
let anthropicClient: Anthropic | null = null
function getClient(): Anthropic {
  if (anthropicClient) return anthropicClient
  let apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    const fromFile = loadApiKeyFromLocalEnv()
    if (fromFile) apiKey = fromFile
  }
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')
  anthropicClient = new Anthropic({ apiKey })
  return anthropicClient
}

// ── Types document côté wire ─────────────────────────────────────────────
interface WireDoc {
  mimeType: string
  data: string // base64 pure (sans préfixe data:)
}

type SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
const IMAGE_MIMES: ReadonlySet<SupportedImageMime> = new Set<SupportedImageMime>([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
])

// ── Handler ──────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>)
  if (!checkRateLimit(`claude:${ip}`, RATE_LIMIT)) {
    return res.status(429).json({ error: 'Trop de requêtes. Réessaie dans une minute.' })
  }

  try {
    const { systemPrompt, userPrompt, maxOutputTokens, jsonMode, preferredModel, documents } = req.body as {
      systemPrompt?: string
      userPrompt?: string
      maxOutputTokens?: number
      jsonMode?: boolean
      preferredModel?: string
      documents?: WireDoc[]
    }

    if (!userPrompt) return res.status(400).json({ error: 'userPrompt is required' })

    // Sélection du modèle
    let model = DEFAULT_MODEL
    if (preferredModel) {
      const remapped = LEGACY_REMAP[preferredModel] ?? preferredModel
      model = ALLOWED_MODELS.has(remapped) ? remapped : DEFAULT_MODEL
    }

    // ── Construction des content blocks utilisateur ────────────────────
    const userContent: Anthropic.ContentBlockParam[] = []

    if (documents && Array.isArray(documents) && documents.length > 0) {
      for (const doc of documents) {
        if (!doc?.mimeType || !doc?.data) continue
        if (IMAGE_MIMES.has(doc.mimeType as SupportedImageMime)) {
          userContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: doc.mimeType as SupportedImageMime,
              data: doc.data,
            },
          })
        } else if (doc.mimeType === 'application/pdf') {
          userContent.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: doc.data,
            },
          })
        }
        // autres types ignorés silencieusement (texte, docx, etc.)
      }
      if (userContent.length > 0) {
        userContent.push({
          type: 'text',
          text: 'Les documents ci-dessus sont les pièces jointes du patient (radios, comptes rendus médicaux). Tiens-en compte dans ton analyse.',
        })
      }
    }

    // Texte principal — en JSON mode, on ajoute une consigne stricte
    let finalUserText = userPrompt
    if (jsonMode) {
      finalUserText += '\n\nRéponds UNIQUEMENT avec du JSON valide, sans markdown, sans préambule, sans commentaires.'
    }
    userContent.push({ type: 'text', text: finalUserText })

    // ── System prompt avec prompt caching ─────────────────────────────
    // cache_control: ephemeral → mis en cache 5 min, -90% sur les tokens
    // d'input répétés. Les system prompts de cette app font souvent >1000 tokens
    // (ex: EPAULE_SCHEMA) donc largement au-dessus du seuil de caching.
    const systemBlocks: Anthropic.TextBlockParam[] | undefined = systemPrompt
      ? [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]
      : undefined

    // ── Messages ──────────────────────────────────────────────────────
    // Note : pas de prefill assistant — certains modèles Claude 4.6+ le refusent
    // ("This model does not support assistant message prefill"). La consigne JSON
    // est déjà injectée dans finalUserText ci-dessus ; les parseurs côté client
    // utilisent /\{[\s\S]*\}/ donc tolèrent un éventuel fencing markdown.
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userContent },
    ]

    const client = getClient()

    let response: Anthropic.Message
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Claude request timeout after 120s')), CLAUDE_TIMEOUT_MS)
      )
      response = await Promise.race([
        client.messages.create({
          model,
          max_tokens: maxOutputTokens || 8192,
          system: systemBlocks,
          messages,
        }),
        timeout,
      ])
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      const status = err?.status ?? 500
      const message = err?.message || 'Unknown Anthropic error'
      if (status === 401 || status === 403) {
        return res.status(status).json({ error: `Auth: ${message}` })
      }
      if (status === 429) {
        return res.status(429).json({ error: `Rate limit: ${message}` })
      }
      if (status === 529 || status === 503) {
        return res.status(503).json({ error: `Service overloaded: ${message}` })
      }
      if (status === 400) {
        return res.status(400).json({ error: message })
      }
      throw e
    }

    // Récupère le premier bloc texte
    const textBlock = response.content.find(b => b.type === 'text')
    const result = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    if (!result) {
      return res.status(503).json({ error: 'Empty response from Claude' })
    }

    return res.status(200).json({
      result,
      model: response.model,
      endpoint: 'anthropic',
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cacheRead: response.usage.cache_read_input_tokens ?? 0,
        cacheCreated: response.usage.cache_creation_input_tokens ?? 0,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[claude] proxy error:', message)
    return res.status(500).json({ error: message })
  }
}
