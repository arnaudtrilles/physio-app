import type { VercelRequest, VercelResponse } from '@vercel/node'

// Origines autorisées : prod Vercel, previews `*.vercel.app`, dev local.
// Tout le reste est rejeté — pas de wildcard `*` car les endpoints servent
// du PHI / appellent des LLMs payés.
const STATIC_ALLOWED = new Set([
  'https://physio-app-version-finale.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
])

function isAllowedOrigin(origin: string): boolean {
  if (STATIC_ALLOWED.has(origin)) return true
  // Previews Vercel : https://physio-app-version-finale-<hash>-<team>.vercel.app
  try {
    const u = new URL(origin)
    if (u.protocol === 'https:' && u.hostname.endsWith('.vercel.app')) return true
  } catch { /* origin invalide */ }
  return false
}

// Pose les headers CORS si l'origine est autorisée.
// Retourne `true` si la requête doit être traitée, `false` si elle a été
// court-circuitée (preflight OPTIONS ou origine refusée).
export function applyCors(
  req: VercelRequest,
  res: VercelResponse,
  methods: string,
  extraHeaders = 'Content-Type',
): boolean {
  const origin = req.headers.origin
  const allowed = typeof origin === 'string' && isAllowedOrigin(origin)

  // Vary doit toujours être posé pour ne pas empoisonner les caches.
  res.setHeader('Vary', 'Origin')

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin as string)
    res.setHeader('Access-Control-Allow-Methods', methods)
    res.setHeader('Access-Control-Allow-Headers', extraHeaders)
  }

  if (req.method === 'OPTIONS') {
    res.status(allowed ? 204 : 403).end()
    return false
  }

  if (origin && !allowed) {
    res.status(403).json({ error: 'Origin not allowed' })
    return false
  }

  return true
}
