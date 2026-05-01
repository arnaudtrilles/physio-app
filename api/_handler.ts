import type { VercelRequest, VercelResponse } from '@vercel/node'

type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<unknown>

// Wrap un handler pour centraliser la gestion d'erreurs non attrapées.
export function withHandler(fn: ApiHandler): ApiHandler {
  return async (req, res) => {
    try {
      await fn(req, res)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error'
      console.error(`[api] ${req.url ?? '?'} — ${message}`)
      if (!res.headersSent) {
        res.status(500).json({ error: message })
      }
    }
  }
}
