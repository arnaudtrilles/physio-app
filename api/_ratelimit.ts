import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Stratégie en cascade :
//   1. Si UPSTASH_REDIS_REST_URL/TOKEN sont définis → Upstash sliding window,
//      cross-instance (la limite annoncée est la limite réelle, peu importe
//      combien d'instances Vercel tournent)
//   2. Sinon → token-bucket en mémoire, par instance serverless. Moins
//      précis (5 instances = 5x la limite affichée) mais sécurisé en burst
//   3. Si Upstash répond une erreur réseau → fallback in-memory pour ne pas
//      bloquer les utilisateurs légitimes pendant une panne du provider
//
// La clé de bucket est `${name}:user:${userId}` ou `${name}:ip:${ip}` :
//   - userId existe → on n'utilise QUE la limite per-user (pas de fausse
//     positive sur cabinet partagé / 4G CGNAT)
//   - userId absent → fallback IP avec limite plus stricte (anti-abus
//     anonyme)

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

let redis: Redis | null = null
if (REDIS_URL && REDIS_TOKEN) {
  try {
    redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
  } catch (err) {
    console.error('[ratelimit] Failed to init Upstash Redis:', err)
    redis = null
  }
}

const limiterCache = new Map<string, Ratelimit>()

function getUpstashLimiter(name: string, max: number, windowMs: number): Ratelimit | null {
  if (!redis) return null
  const cacheKey = `${name}:${max}:${windowMs}`
  const cached = limiterCache.get(cacheKey)
  if (cached) return cached
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
    prefix: `physio:${name}`,
    analytics: false,
  })
  limiterCache.set(cacheKey, limiter)
  return limiter
}

interface Bucket { tokens: number; lastRefill: number }
const buckets = new Map<string, Bucket>()
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000
let lastCleanup = Date.now()

function maybeCleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  const cutoff = now - CLEANUP_INTERVAL_MS
  for (const [key, b] of buckets) {
    if (b.lastRefill < cutoff) buckets.delete(key)
  }
  lastCleanup = now
}

function inMemoryCheck(key: string, max: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  maybeCleanup(now)
  let b = buckets.get(key)
  if (!b) {
    b = { tokens: max - 1, lastRefill: now }
    buckets.set(key, b)
    return { allowed: true, retryAfterMs: 0 }
  }
  const elapsed = now - b.lastRefill
  const refill = Math.floor((elapsed / windowMs) * max)
  if (refill > 0) {
    b.tokens = Math.min(max, b.tokens + refill)
    b.lastRefill = now
  }
  if (b.tokens <= 0) {
    const msPerToken = windowMs / max
    return { allowed: false, retryAfterMs: Math.ceil(msPerToken) }
  }
  b.tokens--
  return { allowed: true, retryAfterMs: 0 }
}

export interface RateLimitConfig {
  /** Endpoint label (used in keys / logs) */
  name: string
  /** Per-user limit (applied when userId is provided) */
  perUser: { max: number; windowMs: number }
  /** Per-IP limit (applied as anonymous fallback only) */
  perIp: { max: number; windowMs: number }
}

export interface RateLimitResult {
  allowed: boolean
  scope?: 'user' | 'ip'
  retryAfterMs?: number
}

export async function rateLimit(opts: {
  config: RateLimitConfig
  userId: string | null
  ip: string
}): Promise<RateLimitResult> {
  const { config, userId, ip } = opts

  if (userId) {
    return await checkScope({
      bucketKey: `${config.name}:user:${userId}`,
      upstashId: userId,
      upstashName: `${config.name}:user`,
      max: config.perUser.max,
      windowMs: config.perUser.windowMs,
      scope: 'user',
    })
  }

  return await checkScope({
    bucketKey: `${config.name}:ip:${ip}`,
    upstashId: ip,
    upstashName: `${config.name}:ip`,
    max: config.perIp.max,
    windowMs: config.perIp.windowMs,
    scope: 'ip',
  })
}

async function checkScope(opts: {
  bucketKey: string
  upstashId: string
  upstashName: string
  max: number
  windowMs: number
  scope: 'user' | 'ip'
}): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(opts.upstashName, opts.max, opts.windowMs)
  if (limiter) {
    try {
      const r = await limiter.limit(opts.upstashId)
      if (!r.success) {
        return { allowed: false, scope: opts.scope, retryAfterMs: Math.max(0, r.reset - Date.now()) }
      }
      return { allowed: true }
    } catch (err) {
      console.warn(`[ratelimit] Upstash error on ${opts.upstashName}, falling back in-memory:`, err)
    }
  }
  const r = inMemoryCheck(opts.bucketKey, opts.max, opts.windowMs)
  return r.allowed
    ? { allowed: true }
    : { allowed: false, scope: opts.scope, retryAfterMs: r.retryAfterMs }
}

export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const fwd = headers['x-forwarded-for']
  if (Array.isArray(fwd)) return fwd[0] ?? 'unknown'
  return (fwd as string | undefined)?.split(',')[0]?.trim() ?? 'unknown'
}
