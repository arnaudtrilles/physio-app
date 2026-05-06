import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const ADMIN_EMAILS = new Set(['elkamelelyes@gmail.com', 'arnaud.trilles@gmail.com'])

interface AdminStats {
  practitioners: number
  patients: number
  bilans: number
  bilansComplets: number
  intermediaires: number
  notes: number
  bilanTypes: Record<string, number>
  monthlyActivity: { label: string; count: number }[]
  plans: Record<string, number>
  objectifs: { total: number; atteints: number; nonAtteints: number; enCours: number }
  evnMoyen: number | null
  topExercices: { nom: string; zone: string; count: number }[]
  aiCalls30j: { total: number; byModel: Record<string, number> }
  generatedAt: string
}

const BILAN_TYPE_LABELS: Record<string, string> = {
  epaule: 'Épaule', genou: 'Genou', lombaire: 'Lombaire', cervical: 'Cervical',
  hanche: 'Hanche', cheville: 'Cheville', geriatrique: 'Gériatrique',
  generique: 'Générique', 'drainage-lymphatique': 'Drainage',
}

const PLAN_LABELS: Record<string, string> = {
  basique: 'Basique', pro: 'Pro', cabinet: 'Cabinet',
}

const S = {
  page: {
    minHeight: '100vh', background: '#07090f', color: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: '0 0 60px',
  } as React.CSSProperties,
  header: {
    position: 'sticky' as const, top: 0, zIndex: 50,
    background: 'rgba(7,9,15,0.95)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(148,163,184,0.08)',
    padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12,
  },
  logo: { fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#f1f5f9' },
  badge: {
    fontSize: '0.65rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999,
    background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
    border: '1px solid rgba(59,130,246,0.25)', textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  },
  ts: { marginLeft: 'auto', fontSize: '0.72rem', color: '#475569' },
  body: { maxWidth: 1100, margin: '0 auto', padding: '32px 20px' },
  sectionTitle: {
    fontSize: '0.72rem', fontWeight: 700, color: '#475569',
    textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 14,
  },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12, marginBottom: 32 },
  card: {
    background: 'linear-gradient(135deg, rgba(18,26,44,0.95), rgba(10,15,28,0.98))',
    border: '1px solid rgba(148,163,184,0.10)',
    borderRadius: 14, padding: '20px 22px',
    boxShadow: '0 0 0 1px rgba(148,163,184,0.04), 0 8px 32px rgba(0,0,0,0.4)',
  },
  kpiValue: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  kpiLabel: { fontSize: '0.78rem', color: '#475569', marginTop: 4 },
  kpiSub: { fontSize: '0.7rem', color: '#334155', marginTop: 2 },
}

function KpiCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div style={S.card}>
      <div style={S.kpiValue}>{value}</div>
      <div style={S.kpiLabel}>{label}</div>
      {sub && <div style={S.kpiSub}>{sub}</div>}
    </div>
  )
}

function HBar({ label, value, max, color = '#3b82f6' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.75rem' }}>
        <span style={{ color: '#94a3b8' }}>{label}</span>
        <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(148,163,184,0.08)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function VBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
      <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{
          width: '60%', height: `${Math.max(pct, 3)}%`,
          background: 'linear-gradient(to top, #3b82f6, #818cf8)',
          borderRadius: '3px 3px 0 0', minHeight: 4, transition: 'height 0.6s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.62rem', color: '#475569' }}>{label}</span>
    </div>
  )
}

function CheckRow({ label, ok, warn }: { label: string; ok?: boolean; warn?: boolean }) {
  const icon = warn ? '⚠' : ok ? '✓' : '✗'
  const color = warn ? '#f59e0b' : ok ? '#10b981' : '#ef4444'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(148,163,184,0.06)', fontSize: '0.78rem' }}>
      <span style={{ color: '#94a3b8' }}>{label}</span>
      <span style={{ color, fontWeight: 700, fontSize: '0.8rem' }}>{icon} {warn ? 'Recommandé' : ok ? 'Actif' : 'Inactif'}</span>
    </div>
  )
}

function Screen403() {
  return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.3 }}>⬡</div>
        <div style={{ fontSize: '0.9rem', color: '#475569' }}>Accès réservé aux administrateurs PhysioScan.</div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid rgba(148,163,184,0.15)', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)

  const isAdmin = user?.email && ADMIN_EMAILS.has(user.email)

  useEffect(() => {
    if (!isAdmin || !user) return
    setFetching(true)

    // Get session token
    import('../lib/supabase').then(({ supabase }) => {
      if (!supabase) { setError('Supabase non configuré'); setFetching(false); return }
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) { setError('Session expirée'); setFetching(false); return }
        fetch('/api/admin-stats', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then(r => r.json())
          .then(data => {
            if (data.error) setError(data.error)
            else setStats(data)
          })
          .catch(e => setError(e.message))
          .finally(() => setFetching(false))
      })
    })
  }, [isAdmin, user])

  if (authLoading || fetching) return <Spinner />
  if (!user || !isAdmin) return <Screen403 />
  if (error) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '0.85rem' }}>{error}</div>
    </div>
  )

  const maxBilanType = Math.max(1, ...Object.values(stats?.bilanTypes ?? {}))
  const maxMonthly = Math.max(1, ...(stats?.monthlyActivity ?? []).map(m => m.count))
  const maxExercice = Math.max(1, ...(stats?.topExercices ?? []).map(e => e.count))
  const totalPlans = Object.values(stats?.plans ?? {}).reduce((a, b) => a + b, 0)

  const ts = stats ? new Date(stats.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div style={S.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={S.header}>
        <span style={S.logo}>⬡ PhysioScan</span>
        <span style={S.badge}>Admin</span>
        {ts && <span style={S.ts}>Mis à jour à {ts}</span>}
      </div>

      <div style={S.body}>

        {/* KPIs */}
        <div style={S.sectionTitle}>Vue globale</div>
        <div style={S.grid4}>
          <KpiCard value={stats?.practitioners ?? '—'} label="Kinésithérapeutes" sub="comptes actifs" />
          <KpiCard value={stats?.patients ?? '—'} label="Patients" sub="tous praticiens" />
          <KpiCard value={stats?.bilans ?? '—'} label="Bilans" sub={stats ? `${stats.bilansComplets} complets` : ''} />
          <KpiCard value={stats?.notes ?? '—'} label="Notes de séance" />
        </div>

        <div style={S.grid2}>
          <KpiCard value={stats?.intermediaires ?? '—'} label="Bilans intermédiaires" />
          <KpiCard
            value={stats?.evnMoyen != null ? stats.evnMoyen.toFixed(1) + '/10' : '—'}
            label="EVN moyen"
            sub="douleur initiale moyenne"
          />
        </div>

        {/* Répartition zones */}
        <div style={S.sectionTitle}>Bilans par zone</div>
        <div style={{ ...S.card, marginBottom: 32 }}>
          {Object.entries(stats?.bilanTypes ?? {})
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <HBar key={type} label={BILAN_TYPE_LABELS[type] ?? type} value={count} max={maxBilanType} />
            ))}
          {!stats && <div style={{ color: '#334155', fontSize: '0.78rem' }}>Chargement…</div>}
        </div>

        {/* Activité mensuelle */}
        <div style={S.sectionTitle}>Activité — 6 derniers mois</div>
        <div style={{ ...S.card, marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {(stats?.monthlyActivity ?? []).map(m => (
              <VBar key={m.label} label={m.label} value={m.count} max={maxMonthly} />
            ))}
          </div>
        </div>

        <div style={S.grid2}>
          {/* Plans */}
          <div>
            <div style={S.sectionTitle}>Distribution des forfaits</div>
            <div style={S.card}>
              {Object.entries(stats?.plans ?? {}).map(([plan, count]) => (
                <HBar
                  key={plan}
                  label={`${PLAN_LABELS[plan] ?? plan} (${totalPlans > 0 ? Math.round(count / totalPlans * 100) : 0}%)`}
                  value={count}
                  max={Math.max(1, totalPlans)}
                  color={plan === 'cabinet' ? '#10b981' : plan === 'pro' ? '#818cf8' : '#475569'}
                />
              ))}
              {!stats && <div style={{ color: '#334155', fontSize: '0.78rem' }}>Chargement…</div>}
            </div>
          </div>

          {/* Objectifs SMART */}
          <div>
            <div style={S.sectionTitle}>Objectifs SMART</div>
            <div style={S.card}>
              <HBar label={`En cours (${stats?.objectifs.enCours ?? 0})`} value={stats?.objectifs.enCours ?? 0} max={Math.max(1, stats?.objectifs.total ?? 1)} color="#f59e0b" />
              <HBar label={`Atteints (${stats?.objectifs.atteints ?? 0})`} value={stats?.objectifs.atteints ?? 0} max={Math.max(1, stats?.objectifs.total ?? 1)} color="#10b981" />
              <HBar label={`Non atteints (${stats?.objectifs.nonAtteints ?? 0})`} value={stats?.objectifs.nonAtteints ?? 0} max={Math.max(1, stats?.objectifs.total ?? 1)} color="#ef4444" />
              {stats && stats.objectifs.total > 0 && (
                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 12 }}>
                  Taux de réussite : {Math.round(stats.objectifs.atteints / stats.objectifs.total * 100)}%
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={S.grid2}>
          {/* Top exercices */}
          <div>
            <div style={S.sectionTitle}>Top 5 exercices</div>
            <div style={S.card}>
              {(stats?.topExercices ?? []).map(e => (
                <HBar key={e.nom} label={`${e.nom} (${e.zone})`} value={e.count} max={maxExercice} color="#818cf8" />
              ))}
              {stats?.topExercices?.length === 0 && <div style={{ color: '#334155', fontSize: '0.78rem' }}>Aucune donnée</div>}
            </div>
          </div>

          {/* Appels IA 30j */}
          <div>
            <div style={S.sectionTitle}>Appels IA — 30 derniers jours</div>
            <div style={S.card}>
              <div style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 12 }}>
                {stats?.aiCalls30j.total ?? '—'}
              </div>
              {Object.entries(stats?.aiCalls30j.byModel ?? {}).map(([model, count]) => (
                <HBar key={model} label={model} value={count} max={Math.max(1, stats?.aiCalls30j.total ?? 1)} color="#3b82f6" />
              ))}
              <div style={{ fontSize: '0.72rem', color: '#334155', marginTop: 8 }}>
                ElevenLabs Creator : 22$/mois (fixe) · Claude : selon tokens
              </div>
            </div>
          </div>
        </div>

        {/* Conformité nLPD */}
        <div style={S.sectionTitle}>Conformité nLPD / RGPD</div>
        <div style={S.card}>
          <CheckRow label="Stockage 100% local (IndexedDB)" ok />
          <CheckRow label="Transit HTTPS chiffré (Vercel)" ok />
          <CheckRow label="Supabase hébergé EU (Frankfurt)" ok />
          <CheckRow label="Zero retention ElevenLabs" ok />
          <CheckRow label="Aucun nom patient dans sessions vocales" warn />
          <CheckRow label="DPA Vercel signé" warn />
          <CheckRow label="Pas de partage tiers sans consentement" ok />
        </div>

      </div>
    </div>
  )
}
