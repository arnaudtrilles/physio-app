import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import crypto from 'node:crypto'

function transcribeDevProxy(): Plugin {
  let openaiKey = ''
  return {
    name: 'transcribe-dev-proxy',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, '')
      openaiKey = env.OPENAI_API_KEY || ''
    },
    configureServer(server) {
      server.middlewares.use('/api/transcribe', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
        if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
        if (!openaiKey) { res.writeHead(500); res.end(JSON.stringify({ error: 'OPENAI_API_KEY not set' })); return }

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
            console.log(`[transcribe] Received ${audioBuffer.length} bytes of audio`)

            const incomingType = (req.headers['content-type'] as string) || 'audio/webm'
            const ext = incomingType.includes('mp4') ? 'mp4' : incomingType.includes('wav') ? 'wav' : 'webm'
            const filename = `audio.${ext}`
            const prompt = 'Transcription kinésithérapie français. EVA, EVN, PSFS, MRC, ROM, flexion, extension, abduction, rotation.'

            const boundary = '----ViteDev' + Date.now().toString(36)
            const fields = [
              ['model', 'gpt-4o-transcribe'],
              ['language', 'fr'],
              ['prompt', prompt],
              ['response_format', 'json'],
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

            let apiRes: Response
            try {
              apiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${openaiKey}`,
                  'Content-Type': `multipart/form-data; boundary=${boundary}`,
                },
                body,
                signal: controller.signal,
              })
            } finally {
              clearTimeout(timeoutId)
            }

            const responseBody = await apiRes.text()
            console.log(`[transcribe] OpenAI ${apiRes.status}: ${responseBody.slice(0, 200)}`)
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

function geminiDevProxy(): Plugin {
  let projectId = ''
  let region = ''
  let saKeyJson = ''
  let cachedToken: { token: string; expiresAt: number } | null = null

  const MODEL_REMAP: Record<string, string> = {
    'gemini-3-flash': 'gemini-2.5-flash',
    'gemini-2.0-flash': 'gemini-2.5-flash',
    'gemini-1.5-pro': 'gemini-2.5-pro',
    'gemini-1.5-flash': 'gemini-2.5-flash',
  }
  const FALLBACK_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash']

  async function getAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token
    const sa = JSON.parse(saKeyJson) as { client_email: string; private_key: string }
    const now = Math.floor(Date.now() / 1000)
    const b64url = (s: string) => Buffer.from(s).toString('base64url')
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))
    const sig = crypto.createSign('RSA-SHA256').update(`${header}.${payload}`).sign(sa.private_key, 'base64url')
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${header}.${payload}.${sig}`,
    })
    const data = await tokenRes.json() as { access_token?: string; expires_in?: number }
    if (!data.access_token) throw new Error('OAuth failed: ' + JSON.stringify(data).slice(0, 300))
    cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 }
    return cachedToken.token
  }

  return {
    name: 'gemini-dev-proxy',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, '')
      projectId = env.GCP_PROJECT_ID || ''
      region = env.GCP_REGION || 'europe-west9'
      if (env.GCP_SERVICE_ACCOUNT_KEY_B64) {
        try { saKeyJson = Buffer.from(env.GCP_SERVICE_ACCOUNT_KEY_B64, 'base64').toString('utf8') } catch { /* */ }
      }
      if (!saKeyJson && env.GCP_SERVICE_ACCOUNT_KEY) saKeyJson = env.GCP_SERVICE_ACCOUNT_KEY
    },
    configureServer(server) {
      server.middlewares.use('/api/gemini', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
        if (req.method !== 'POST') { res.writeHead(405); res.end(JSON.stringify({ error: 'Method not allowed' })); return }
        if (!saKeyJson || !projectId) { res.writeHead(500); res.end(JSON.stringify({ error: 'GCP credentials not configured' })); return }

        const chunks: Buffer[] = []
        req.on('data', (c: Buffer) => chunks.push(c))
        req.on('end', async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString())
            const { systemPrompt, userPrompt, maxOutputTokens, jsonMode, preferredModel, documents } = body
            if (!userPrompt) { res.writeHead(400); res.end(JSON.stringify({ error: 'userPrompt required' })); return }

            const remapped = preferredModel ? (MODEL_REMAP[preferredModel] ?? preferredModel) : null
            const models = remapped ? [remapped, ...FALLBACK_MODELS.filter(m => m !== remapped)] : FALLBACK_MODELS

            const parts: Array<Record<string, unknown>> = [{ text: userPrompt }]
            if (documents?.length) {
              for (const doc of documents) parts.push({ inline_data: { mime_type: doc.mimeType, data: doc.data } })
            }

            const accessToken = await getAccessToken()
            const requestBody = JSON.stringify({
              system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
              contents: [{ role: 'user', parts }],
              generationConfig: { maxOutputTokens: maxOutputTokens || 8192, ...(jsonMode ? { responseMimeType: 'application/json' } : {}) },
            })

            let lastError = ''
            for (const model of models) {
              const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:generateContent`
              console.log(`[gemini] Trying ${model}…`)
              let apiRes: Response
              try {
                apiRes = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                  body: requestBody,
                })
              } catch (e) { lastError = (e as Error).message; continue }
              if (apiRes.status === 404) { lastError = `${model} not found`; continue }
              const respBody = await apiRes.text()
              if (!apiRes.ok) {
                lastError = respBody.slice(0, 500)
                if (apiRes.status === 503 || apiRes.status === 429) continue
                res.writeHead(apiRes.status, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: lastError }))
                return
              }
              const data = JSON.parse(respBody)
              const responseParts = data?.candidates?.[0]?.content?.parts ?? []
              const textPart = responseParts.find((p: { thought?: boolean; text?: string }) => !p.thought && typeof p.text === 'string')
              const result = textPart?.text ?? ''
              if (!result) { lastError = `Empty response from ${model}`; continue }
              console.log(`[gemini] ${model} OK (${result.length} chars)`)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ result, model }))
              return
            }
            res.writeHead(503, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: lastError || 'No model available' }))
          } catch (err) {
            console.error('[gemini] Error:', err)
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
    geminiDevProxy(),
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
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
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gemini/, ''),
        secure: true,
      },
    },
  },
})
