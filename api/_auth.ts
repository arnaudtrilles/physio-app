import type { VercelRequest } from '@vercel/node'

// Extrait le userId Supabase depuis le header Authorization Bearer.
// Décodage best-effort sans vérification cryptographique : c'est suffisant pour
// segmenter les compteurs de rate-limit par utilisateur. Un attaquant qui forge
// des sub aléatoires sera rattrapé par la limite IP-fallback puisqu'il viendra
// de la même IP. Pour l'auth réelle (autoriser/refuser des actions sensibles),
// utiliser supabase.auth.getUser(token) avec vérification serveur.
export function extractUserId(req: VercelRequest): string | null {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  const token = auth.slice(7).trim()
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    )
    if (typeof payload?.sub !== 'string' || !payload.sub) return null

    if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
      return null
    }
    return payload.sub
  } catch {
    return null
  }
}
