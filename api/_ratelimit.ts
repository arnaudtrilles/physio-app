// In-memory token bucket rate limiter.
// Works per serverless instance — good enough for burst protection.
// Upgrade to Upstash Redis for strict cross-instance limits.

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000
let lastCleanup = Date.now()

export interface RateLimitConfig {
  maxRequests: number // bucket capacity
  windowMs: number   // refill period
}

// Cleanup paresseux : ne PAS utiliser setInterval au top-level d'un module
// chargé par des fonctions serverless Vercel — ça crash l'init de la fonction
// ('FUNCTION_INVOCATION_FAILED' systématique). On purge à la place lors d'un
// appel checkRateLimit, au plus toutes les 10 minutes.
function maybeCleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  const cutoff = now - CLEANUP_INTERVAL_MS
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(key)
  }
  lastCleanup = now
}

export function checkRateLimit(key: string, { maxRequests, windowMs }: RateLimitConfig): boolean {
  const now = Date.now()
  maybeCleanup(now)
  let bucket = buckets.get(key)

  if (!bucket) {
    bucket = { tokens: maxRequests - 1, lastRefill: now }
    buckets.set(key, bucket)
    return true
  }

  const elapsed = now - bucket.lastRefill
  const refill = Math.floor((elapsed / windowMs) * maxRequests)
  if (refill > 0) {
    bucket.tokens = Math.min(maxRequests, bucket.tokens + refill)
    bucket.lastRefill = now
  }

  if (bucket.tokens <= 0) return false
  bucket.tokens--
  return true
}

export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const fwd = headers['x-forwarded-for']
  if (Array.isArray(fwd)) return fwd[0] ?? 'unknown'
  return (fwd as string | undefined)?.split(',')[0]?.trim() ?? 'unknown'
}
