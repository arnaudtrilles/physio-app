import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs/promises'
import path from 'node:path'

// En dev, Vite ne sert pas les fonctions serverless de /api/*.ts.
// Ce plugin les monte manuellement en chargeant chaque handler via
// ssrLoadModule, en shimant VercelRequest/VercelResponse sur
// IncomingMessage/ServerResponse.
function vercelApiDevPlugin(): Plugin {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      // Charge .env, .env.local (toutes les clés, pas seulement VITE_*) dans
      // process.env pour que les handlers serverless y aient accès comme sur Vercel.
      const allEnv = loadEnv('', process.cwd(), '')
      for (const [k, v] of Object.entries(allEnv)) {
        if (process.env[k] === undefined) process.env[k] = v
      }
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        const urlPath = req.url.split('?')[0]
        const route = urlPath.replace(/^\/api\//, '').replace(/\/+$/, '')
        const handlerPath = path.resolve(process.cwd(), 'api', `${route}.ts`)
        try {
          await fs.access(handlerPath)
        } catch {
          return next()
        }
        try {
          const mod = await server.ssrLoadModule(handlerPath)
          const handler = (mod as { default?: (req: unknown, res: unknown) => unknown }).default
          if (typeof handler !== 'function') {
            res.statusCode = 500
            res.end(`No default export in ${handlerPath}`)
            return
          }
          // Parse query
          const urlObj = new URL(req.url, 'http://localhost')
          const query: Record<string, string> = {}
          urlObj.searchParams.forEach((v, k) => { query[k] = v })
          // Parse body (JSON)
          let body: unknown = undefined
          if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk as Buffer)
            const raw = Buffer.concat(chunks).toString('utf8')
            if (raw) {
              const ct = req.headers['content-type'] || ''
              if (ct.includes('application/json')) {
                try { body = JSON.parse(raw) } catch { body = raw }
              } else {
                body = raw
              }
            }
          }
          // Shim VercelRequest
          const shimReq = Object.assign(req, { query, body })
          // Shim VercelResponse: .status().json()/.send()/.end()
          const shimRes = Object.assign(res, {
            status(code: number) { res.statusCode = code; return shimRes },
            json(payload: unknown) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(payload))
              return shimRes
            },
            send(payload: unknown) {
              if (typeof payload === 'string' || Buffer.isBuffer(payload)) {
                res.end(payload)
              } else {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(payload))
              }
              return shimRes
            },
          })
          await handler(shimReq, shimRes)
        } catch (err) {
          console.error(`[vercel-api-dev] ${handlerPath} failed:`, err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: (err as Error).message }))
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vercelApiDevPlugin(),
    react(),
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
