// In-memory token bucket rate limiter.
// Works per serverless instance — good enough for burst protection.
// Upgrade to Upstash Redis for strict cross-instance limits.

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitConfig {
  maxRequests: number // bucket capacity
  windowMs: number   // refill period
}

export function checkRateLimit(key: string, { maxRequests, windowMs }: RateLimitConfig): boolean {
  const now = Date.now()
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

// Purge stale buckets every 10 minutes to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [key, bucket] of buckets) {
    if (bucket.lastRefill < cutoff) buckets.delete(key)
  }
}, 10 * 60 * 1000)
