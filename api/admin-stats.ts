import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from './_ratelimit.js'

const ADMIN_EMAILS = new Set(['elkamelelyes@gmail.com', 'arnaud.trilles@gmail.com'])
const RATE_LIMIT = { maxRequests: 60, windowMs: 60_000 }

export const config = { maxDuration: 30 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const ip = getClientIp(req.headers as Record<string, string | string[] | undefined>)
  if (!checkRateLimit(`admin:${ip}`, RATE_LIMIT)) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }
  const token = authHeader.slice(7)

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  // Verify user token + check admin whitelist
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user?.email) return res.status(401).json({ error: 'Invalid token' })
  if (!ADMIN_EMAILS.has(user.email)) return res.status(403).json({ error: 'Access denied' })

  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

  try {
    const [
      { count: patientsCount },
      { data: bilans },
      { count: intermediairesCount },
      { count: notesCount },
      { data: objectifs },
      { count: practitionersCount },
      { data: profiles },
      { data: exercices },
      { data: aiAudit },
    ] = await Promise.all([
      admin.from('patients').select('*', { count: 'exact', head: true }),
      admin.from('bilans').select('status, bilan_type, date_bilan, evn, practitioner_id'),
      admin.from('bilans_intermediaires').select('*', { count: 'exact', head: true }),
      admin.from('notes_seance').select('*', { count: 'exact', head: true }),
      admin.from('objectifs').select('status'),
      admin.from('practitioners').select('*', { count: 'exact', head: true }),
      admin.from('profiles').select('plan, created_at'),
      admin.from('exercice_bank').select('nom, zone, occurrences').order('occurrences', { ascending: false }).limit(10),
      admin.from('ai_call_audit').select('model_used, category, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ])

    // Bilans stats
    const bilansTotal = bilans?.length ?? 0
    const bilansComplets = bilans?.filter(b => b.status === 'complet').length ?? 0

    // BilanType distribution
    const bilanTypes: Record<string, number> = {}
    bilans?.forEach(b => {
      if (b.bilan_type) bilanTypes[b.bilan_type] = (bilanTypes[b.bilan_type] ?? 0) + 1
    })

    // Monthly activity (6 derniers mois)
    const now = new Date()
    const monthlyActivity = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const label = d.toLocaleDateString('fr-FR', { month: 'short' })
      const count = bilans?.filter(b => {
        if (!b.date_bilan) return false
        const bd = new Date(b.date_bilan)
        return bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear()
      }).length ?? 0
      return { label, count }
    })

    // Plans distribution
    const plans: Record<string, number> = {}
    profiles?.forEach(p => {
      const plan = (p.plan as string) || 'basique'
      plans[plan] = (plans[plan] ?? 0) + 1
    })

    // Objectifs stats
    const objTotal = objectifs?.length ?? 0
    const objAtteints = objectifs?.filter(o => o.status === 'atteint').length ?? 0
    const objNonAtteints = objectifs?.filter(o => o.status === 'non_atteint').length ?? 0

    // EVN moyen
    const evnValues = bilans?.filter(b => typeof b.evn === 'number').map(b => b.evn as number) ?? []
    const evnMoyen = evnValues.length > 0 ? evnValues.reduce((a, b) => a + b, 0) / evnValues.length : null

    // AI calls (30 derniers jours)
    const aiByModel: Record<string, number> = {}
    aiAudit?.forEach(a => {
      if (a.model_used) aiByModel[a.model_used] = (aiByModel[a.model_used] ?? 0) + 1
    })

    // PostHog stats (optionnel — nécessite POSTHOG_PRIVATE_KEY + POSTHOG_PROJECT_ID)
    let postHog: { uniqueUsers30j: number; events: { name: string; count: number }[]; planGating: { feature: string; count: number }[] } | null = null
    const phPrivateKey = process.env.POSTHOG_PRIVATE_KEY
    const phProjectId = process.env.POSTHOG_PROJECT_ID
    const phHost = 'https://eu.posthog.com'

    if (phPrivateKey && phProjectId) {
      try {
        const phQuery = async (sql: string) => {
          const r = await fetch(`${phHost}/api/projects/${phProjectId}/query/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${phPrivateKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
          })
          return r.json()
        }

        const [eventsRes, usersRes, gatingRes] = await Promise.all([
          phQuery(`SELECT event, count() as cnt FROM events WHERE timestamp >= now() - INTERVAL 30 DAY AND event NOT LIKE '$%' GROUP BY event ORDER BY cnt DESC LIMIT 20`),
          phQuery(`SELECT count(DISTINCT distinct_id) as users FROM events WHERE timestamp >= now() - INTERVAL 30 DAY AND event NOT LIKE '$%'`),
          phQuery(`SELECT properties.feature as feature, count() as cnt FROM events WHERE event = 'plan_gating_shown' AND timestamp >= now() - INTERVAL 30 DAY GROUP BY feature ORDER BY cnt DESC`),
        ])

        postHog = {
          uniqueUsers30j: (usersRes.results?.[0]?.[0] as number) ?? 0,
          events: ((eventsRes.results ?? []) as [string, number][]).map(([name, count]) => ({ name, count })),
          planGating: ((gatingRes.results ?? []) as [string, number][]).map(([feature, count]) => ({ feature, count })),
        }
      } catch (e) {
        console.warn('[admin-stats] PostHog query failed:', e)
      }
    }

    return res.status(200).json({
      practitioners: practitionersCount ?? 0,
      patients: patientsCount ?? 0,
      bilans: bilansTotal,
      bilansComplets,
      intermediaires: intermediairesCount ?? 0,
      notes: notesCount ?? 0,
      bilanTypes,
      monthlyActivity,
      plans,
      objectifs: { total: objTotal, atteints: objAtteints, nonAtteints: objNonAtteints, enCours: objTotal - objAtteints - objNonAtteints },
      evnMoyen,
      topExercices: (exercices ?? []).slice(0, 5).map(e => ({ nom: e.nom, zone: e.zone, count: e.occurrences })),
      aiCalls30j: { total: aiAudit?.length ?? 0, byModel: aiByModel },
      postHog,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[admin-stats] error:', message)
    return res.status(500).json({ error: message })
  }
}
