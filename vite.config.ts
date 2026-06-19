import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import type { Plugin } from 'vite'
import Anthropic from '@anthropic-ai/sdk'

function transcribeDevProxy(): Plugin {
  let azureEndpoint = ''
  let azureKey = ''
  let azureSoloDeployment = ''
  let azureSessionDeployment = ''
  let azureApiVersion = '2025-03-01-preview'
  return {
    name: 'transcribe-dev-proxy',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, '')
      azureEndpoint = env.AZURE_OPENAI_ENDPOINT || ''
      azureKey = env.AZURE_OPENAI_KEY || ''
      azureSoloDeployment = env.AZURE_OPENAI_SOLO_DEPLOYMENT || ''
      azureSessionDeployment = env.AZURE_OPENAI_SESSION_DEPLOYMENT || ''
      azureApiVersion = env.AZURE_OPENAI_API_VERSION || '2025-03-01-preview'
    },
    configureServer(server) {
      server.middlewares.use('/api/transcribe', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-transcribe-mode')
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
        if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
        if (!azureEndpoint || !azureKey || !azureSoloDeployment) {
          res.writeHead(500)
          res.end(JSON.stringify({ error: 'Azure OpenAI not configured (set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_SOLO_DEPLOYMENT in .env)' }))
          return
        }

        // Mode = solo (default) | session — match le handler prod.
        const headerMode = req.headers['x-transcribe-mode']
        const rawMode = (Array.isArray(headerMode) ? headerMode[0] : headerMode || 'solo').toString().toLowerCase()
        const mode = rawMode === 'session' ? 'session' : 'solo'
        const deployment = mode === 'session'
          ? (azureSessionDeployment || azureSoloDeployment)
          : azureSoloDeployment

        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', async () => {
          try {
            const audioBuffer = Buffer.concat(chunks)
            if (audioBuffer.length === 0) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Empty audio body' }))
              return
            }
            console.log(`[transcribe] Received ${audioBuffer.length} bytes (mode=${mode}, deployment=${deployment})`)

            const incomingType = (req.headers['content-type'] as string) || 'audio/webm'
            const ext = incomingType.includes('mp4') ? 'mp4' : incomingType.includes('wav') ? 'wav' : 'webm'
            const filename = `audio.${ext}`
            const prompt = 'Transcription kinésithérapie français. EVA, EVN, PSFS, MRC, ROM, flexion, extension, abduction, rotation.'

            const boundary = '----ViteDev' + Date.now().toString(36)
            // Sur Azure, le modèle est porté par le deployment-id dans l'URL.
            const fields = [
              ['language', 'fr'],
              ['prompt', prompt],
              ['response_format', mode === 'session' ? 'verbose_json' : 'json'],
              ['temperature', '0'],
            ]
            const parts: Buffer[] = []
            for (const [name, value] of fields) {
              parts.push(Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
              ))
            }
            parts.push(Buffer.from(
              `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${incomingType}\r\n\r\n`
            ))
            parts.push(audioBuffer)
            parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))
            const body = Buffer.concat(parts)

            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 55_000)

            const url = `${azureEndpoint.replace(/\/+$/, '')}/openai/deployments/${encodeURIComponent(deployment)}/audio/transcriptions?api-version=${encodeURIComponent(azureApiVersion)}`

            let apiRes: Response
            try {
              apiRes = await fetch(url, {
                method: 'POST',
                headers: {
                  'api-key': azureKey,
                  'Content-Type': `multipart/form-data; boundary=${boundary}`,
                },
                body,
                signal: controller.signal,
              })
            } finally {
              clearTimeout(timeoutId)
            }

            const responseBody = await apiRes.text()
            console.log(`[transcribe] Azure ${apiRes.status}: ${responseBody.slice(0, 200)}`)
            res.writeHead(apiRes.status, { 'Content-Type': 'application/json' })
            res.end(responseBody)
          } catch (err) {
            console.error('[transcribe] Error:', err)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: (err as Error).message }))
          }
        })
      })
    },
  }
}

function claudeDevProxy(): Plugin {
  let anthropicKey = ''
  let client: Anthropic | null = null

  const DEFAULT_MODEL = 'claude-sonnet-4-6'
  const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
  const OPUS_MODEL = 'claude-opus-4-7'

  const LEGACY_REMAP: Record<string, string> = {
    'gemini-3.1-pro-preview': DEFAULT_MODEL,
    'gemini-3-flash': DEFAULT_MODEL,
    'gemini-2.5-pro': DEFAULT_MODEL,
    'gemini-2.5-flash': DEFAULT_MODEL,
    'gemini-2.5-flash-preview-04-17': DEFAULT_MODEL,
    'gemini-2.0-flash': HAIKU_MODEL,
    'gemini-1.5-pro': DEFAULT_MODEL,
    'gemini-1.5-flash': HAIKU_MODEL,
  }
  const ALLOWED_MODELS = new Set([DEFAULT_MODEL, HAIKU_MODEL, OPUS_MODEL])

  type SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  const IMAGE_MIMES: ReadonlySet<SupportedImageMime> = new Set<SupportedImageMime>([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  ])

  return {
    name: 'claude-dev-proxy',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, '')
      anthropicKey = env.ANTHROPIC_API_KEY || ''
      if (anthropicKey) client = new Anthropic({ apiKey: anthropicKey })
    },
    configureServer(server) {
      server.middlewares.use('/api/claude', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
        if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
        if (!client) { res.writeHead(500); res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' })); return }

        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString()) as {
              systemPrompt?: string
              userPrompt?: string
              maxOutputTokens?: number
              jsonMode?: boolean
              preferredModel?: string
              documents?: Array<{ mimeType: string; data: string }>
            }
            const { systemPrompt, userPrompt, maxOutputTokens, jsonMode, preferredModel, documents } = body
            if (!userPrompt) { res.writeHead(400); res.end(JSON.stringify({ error: 'userPrompt required' })); return }

            let model = DEFAULT_MODEL
            if (preferredModel) {
              const remapped = LEGACY_REMAP[preferredModel] ?? preferredModel
              model = ALLOWED_MODELS.has(remapped) ? remapped : DEFAULT_MODEL
            }

            const userContent: Anthropic.ContentBlockParam[] = []
            if (documents?.length) {
              for (const doc of documents) {
                if (!doc?.mimeType || !doc?.data) continue
                if (IMAGE_MIMES.has(doc.mimeType as SupportedImageMime)) {
                  userContent.push({
                    type: 'image',
                    source: { type: 'base64', media_type: doc.mimeType as SupportedImageMime, data: doc.data },
                  })
                } else if (doc.mimeType === 'application/pdf') {
                  userContent.push({
                    type: 'document',
                    source: { type: 'base64', media_type: 'application/pdf', data: doc.data },
                  })
                }
              }
              if (userContent.length > 0) {
                userContent.push({
                  type: 'text',
                  text: 'Les documents ci-dessus sont les pièces jointes du patient (radios, comptes rendus médicaux). Tiens-en compte dans ton analyse.',
                })
              }
            }

            let finalUserText = userPrompt
            if (jsonMode) {
              finalUserText += '\n\nRéponds UNIQUEMENT avec du JSON valide, sans markdown, sans préambule, sans commentaires.'
            }
            userContent.push({ type: 'text', text: finalUserText })

            const systemBlocks: Anthropic.TextBlockParam[] | undefined = systemPrompt
              ? [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }]
              : undefined

            const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userContent }]

            let response: Anthropic.Message
            try {
              response = await client!.messages.create({
                model,
                max_tokens: maxOutputTokens || 8192,
                system: systemBlocks,
                messages,
              })
            } catch (e: unknown) {
              const err = e as { status?: number; message?: string }
              const status = err?.status ?? 500
              const message = err?.message || 'Unknown Anthropic error'
              console.error(`[claude] API error ${status}: ${message}`)
              const outStatus = status === 529 ? 503 : status
              res.writeHead(outStatus, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: message }))
              return
            }

            const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
            const result = textBlock ? textBlock.text : ''

            if (!result) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Empty response from Claude' }))
              return
            }

            const usage = {
              input: response.usage.input_tokens,
              output: response.usage.output_tokens,
              cacheRead: response.usage.cache_read_input_tokens ?? 0,
              cacheCreated: response.usage.cache_creation_input_tokens ?? 0,
            }
            console.log(`[claude] ${response.model} OK (${result.length} chars, in: ${usage.input}, out: ${usage.output}, cache hit: ${usage.cacheRead})`)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              result,
              model: response.model,
              endpoint: 'anthropic',
              usage,
            }))
          } catch (err) {
            console.error('[claude] Error:', err)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: (err as Error).message }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    transcribeDevProxy(),
    claudeDevProxy(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Physio App',
        short_name: 'Physio',
        description: 'Application de bilans en physiothérapie',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1e3a8a',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: true,
  },
  server: {
    host: true,
    port: 5173,
  },
})
