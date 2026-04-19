import { useMemo } from 'react'
import type { BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord, SmartObjectif, ExerciceBankEntry, ProfileData } from '../types'

interface AdminDashboardProps {
  db: BilanRecord[]
  dbIntermediaires: BilanIntermediaireRecord[]
  dbNotes: NoteSeanceRecord[]
  dbObjectifs: SmartObjectif[]
  dbExerciceBank: ExerciceBankEntry[]
  profile: ProfileData
  onClose: () => void
}

// ── Palette Claire Métallique ──────────────────────────────────────────────────
const C = {
  bg: '#eef1f6',
  card: '#ffffff',
  cardBorder: 'rgba(148,163,184,0.22)',
  cardShadow: '0 1px 4px rgba(15,23,42,0.06), 0 6px 16px rgba(15,23,42,0.04)',
  headerBg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  headerText: '#f1f5f9',
  headerMuted: '#64748b',
  text: '#0f172a',
  muted: '#64748b',
  mutedLight: '#94a3b8',
  divider: 'rgba(148,163,184,0.18)',
  accent: '#1d4ed8',
  accentSoft: 'rgba(29,78,216,0.07)',
  accentBorder: 'rgba(29,78,216,0.18)',
  green: '#059669',
  greenSoft: 'rgba(5,150,105,0.07)',
  greenBorder: 'rgba(5,150,105,0.2)',
  yellow: '#b45309',
  yellowSoft: 'rgba(180,83,9,0.07)',
  yellowBorder: 'rgba(180,83,9,0.18)',
  red: '#dc2626',
  redSoft: 'rgba(220,38,38,0.06)',
  kpiGrad: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
  silverAccent: 'linear-gradient(135deg, #334155, #64748b)',
}

// ── Forfaits planifiés (Phase 2 — Stripe) ─────────────────────────────────────
const FORFAITS = [
  { id: 'starter', label: 'Starter', price: '29 CHF/mois', color: '#64748b', desc: 'Solo, 50 bilans/mois' },
  { id: 'pro', label: 'Pro', price: '49 CHF/mois', color: '#1d4ed8', desc: 'Solo + Lucie illimitée' },
  { id: 'cabinet', label: 'Cabinet', price: '89 CHF/mois', color: '#7c3aed', desc: "Jusqu'à 5 thérapeutes" },
]

// ── Composants utilitaires ─────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, boxShadow: C.cardShadow, borderRadius: 14, padding: '1.1rem', ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ label, badge, color }: { label: string; badge?: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: color ?? C.accent }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.09em', color: C.muted, textTransform: 'uppercase' }}>{label}</span>
      </div>
      {badge !== undefined && (
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: color ?? C.accent, background: color ? `${color}14` : C.accentSoft, padding: '0.15rem 0.6rem', borderRadius: 999, border: `1px solid ${color ? `${color}25` : C.accentBorder}` }}>{badge}</span>
      )}
    </div>
  )
}

function KpiCard({ value, label, sub, trend }: { value: string | number; label: string; sub?: string; trend?: 'up' | 'down' | 'neutral' }) {
  const trendColor = trend === 'up' ? C.green : trend === 'down' ? C.red : C.muted
  return (
    <Card style={{ flex: 1, minWidth: 0, padding: '1rem 0.9rem' }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, background: C.kpiGrad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1, letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: '0.67rem', color: C.muted, fontWeight: 700, marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.65rem', color: trendColor, marginTop: 3, fontWeight: 600 }}>{sub}</div>}
    </Card>
  )
}

function HBar({ label, value, max, color = C.accent }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.75rem', color: C.text, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.72rem', color: C.muted, fontWeight: 700 }}>{value} <span style={{ color: C.mutedLight, fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: '#e2e8f0' }}>
        <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: color, opacity: 0.85 }} />
      </div>
    </div>
  )
}

function StatusRow({ label, status, note }: { label: string; status: 'ok' | 'warn' | 'pending'; note?: string }) {
  const color = status === 'ok' ? C.green : status === 'warn' ? C.yellow : C.muted
  const bg = status === 'ok' ? C.greenSoft : status === 'warn' ? C.yellowSoft : '#f1f5f9'
  const icon = status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '–'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.5rem 0', borderBottom: `1px solid ${C.divider}` }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.65rem', color, fontWeight: 800, marginTop: 1 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.78rem', color: C.text, fontWeight: 500 }}>{label}</div>
        {note && <div style={{ fontSize: '0.67rem', color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{note}</div>}
      </div>
    </div>
  )
}

const ZONE_LABELS: Record<string, string> = {
  epaule: 'Épaule', cheville: 'Cheville', genou: 'Genou', hanche: 'Hanche',
  cervical: 'Cervical', lombaire: 'Lombaire', generique: 'Générique', geriatrique: 'Gériatrique',
}
const ZONE_COLORS: Record<string, string> = {
  epaule: '#2563eb', cheville: '#7c3aed', genou: '#059669', hanche: '#d97706',
  cervical: '#dc2626', lombaire: '#ea580c', generique: '#64748b', geriatrique: '#0891b2',
}

// ── Composant principal ────────────────────────────────────────────────────────
export function AdminDashboard({ db, dbIntermediaires, dbNotes, dbObjectifs, dbExerciceBank, profile, onClose }: AdminDashboardProps) {
  const now = new Date()
  const updatedAt = now.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })

  const metrics = useMemo(() => {
    const patientKeys = new Set(db.map(r => `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim()))
    const totalPatients = patientKeys.size
    const totalBilansComplets = db.filter(r => r.status === 'complet').length
    const totalBilansIncomplets = db.filter(r => r.status !== 'complet').length

    // Taux d'amélioration
    const patientEvnMap: Record<string, number[]> = {}
    db.forEach(r => {
      if (r.evn == null) return
      const key = `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim()
      if (!patientEvnMap[key]) patientEvnMap[key] = []
      patientEvnMap[key].push(r.evn)
    })
    const improvements: number[] = []
    Object.values(patientEvnMap).forEach(evns => {
      if (evns.length < 2) return
      const first = evns[0], last = evns[evns.length - 1]
      if (first > 0) improvements.push(((first - last) / first) * 100)
    })
    const tauxAmelioration = improvements.length > 0 ? Math.round(improvements.reduce((a, b) => a + b, 0) / improvements.length) : null

    // Zones
    const zoneCounts: Record<string, number> = {}
    db.forEach(r => { const z = r.bilanType ?? 'generique'; zoneCounts[z] = (zoneCounts[z] ?? 0) + 1 })
    const zoneMax = Math.max(...Object.values(zoneCounts), 1)
    const zonesSorted = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])

    // Activité mensuelle
    const monthCounts: Record<string, number> = {}
    const monthLabels: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthLabels.push(d.toLocaleDateString('fr-CH', { month: 'short' }))
      monthCounts[key] = 0
    }
    db.forEach(r => {
      if (!r.dateBilan) return
      const p = r.dateBilan.split('/')
      if (p.length < 3) return
      const key = `${p[2]}-${p[1].padStart(2, '0')}`
      if (key in monthCounts) monthCounts[key]++
    })
    const monthData = Object.values(monthCounts)
    const monthMax = Math.max(...monthData, 1)

    // EVN par zone
    const evnByZone: Record<string, number[]> = {}
    db.forEach(r => {
      const z = r.bilanType ?? 'generique'
      const evn = r.evn ?? (r.bilanData?.evn_repos as number | undefined)
      if (evn == null) return
      if (!evnByZone[z]) evnByZone[z] = []
      evnByZone[z].push(typeof evn === 'number' ? evn : parseFloat(String(evn)))
    })
    const evnZone = Object.entries(evnByZone)
      .map(([z, evns]) => ({ zone: z, avg: Math.round((evns.reduce((a, b) => a + b, 0) / evns.length) * 10) / 10 }))
      .sort((a, b) => b.avg - a.avg)

    // Objectifs
    const objActifs = dbObjectifs.filter(o => o.status === 'en_cours').length
    const objAtteints = dbObjectifs.filter(o => o.status === 'atteint').length
    const objNonAtteints = dbObjectifs.filter(o => o.status === 'non_atteint').length
    const tauxObjectifs = dbObjectifs.length > 0 ? Math.round((objAtteints / dbObjectifs.length) * 100) : null

    // Exercices
    const topExercices = [...dbExerciceBank].sort((a, b) => b.occurrences - a.occurrences).slice(0, 5)
    const exerciceMax = topExercices[0]?.occurrences ?? 1

    // EVA notes
    const evas = dbNotes.map(n => parseFloat(n.data.eva)).filter(v => !isNaN(v))
    const evaMoyen = evas.length > 0 ? Math.round((evas.reduce((a, b) => a + b, 0) / evas.length) * 10) / 10 : null

    // Patients inactifs > 30j
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const lastBilanByPatient: Record<string, Date> = {}
    db.forEach(r => {
      const key = `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim()
      const p = (r.dateBilan || '').split('/')
      if (p.length < 3) return
      const d = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]))
      if (!lastBilanByPatient[key] || d > lastBilanByPatient[key]) lastBilanByPatient[key] = d
    })
    const patientsInactifs = Object.entries(lastBilanByPatient)
      .filter(([, d]) => d < thirtyDaysAgo).map(([k]) => k).slice(0, 4)

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const bilansSemaine = db.filter(r => {
      const p = (r.dateBilan || '').split('/')
      if (p.length < 3) return false
      return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])) >= weekAgo
    }).length

    return {
      totalPatients, totalBilansComplets, totalBilansIncomplets, tauxAmelioration,
      zonesSorted, zoneMax, monthData, monthLabels, monthMax,
      evnZone, objActifs, objAtteints, objNonAtteints, tauxObjectifs,
      topExercices, exerciceMax, evaMoyen, patientsInactifs, bilansSemaine,
    }
  }, [db, dbIntermediaires, dbNotes, dbObjectifs, dbExerciceBank])

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, overflowY: 'auto', zIndex: 500, fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* ── Header sombre ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: C.headerBg, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: C.headerText, letterSpacing: '-0.01em' }}>PhysioScan Admin</span>
          </div>
          <div style={{ fontSize: '0.63rem', color: C.headerMuted, marginTop: 2 }}>{profile.prenom} {profile.nom} · Mis à jour à {updatedAt}</div>
        </div>
        {/* TODO Phase 2 : restreindre l'accès aux emails elkamelelyes@gmail.com + arnaud@… via Supabase Auth */}
        <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '0.25rem 0.6rem', borderRadius: 999, border: '1px solid rgba(245,158,11,0.2)' }}>Phase test</div>
      </div>

      <div style={{ padding: '1rem', paddingBottom: '2.5rem', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

        {/* ── KPIs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <KpiCard value={metrics.totalPatients} label="Patients" sub={`+${metrics.bilansSemaine} cette semaine`} trend="up" />
          <KpiCard value={metrics.totalBilansComplets} label="Bilans complets" sub={`${metrics.totalBilansIncomplets} en cours`} />
          <KpiCard
            value={metrics.tauxAmelioration !== null ? `${metrics.tauxAmelioration > 0 ? '+' : ''}${metrics.tauxAmelioration}%` : '—'}
            label="Amélioration EVN"
            sub={metrics.tauxAmelioration !== null ? 'Moy. patients suivis' : 'Données insuffisantes'}
            trend={metrics.tauxAmelioration !== null && metrics.tauxAmelioration > 0 ? 'up' : 'neutral'}
          />
          <KpiCard value={dbNotes.length} label="Notes séance" sub={metrics.evaMoyen !== null ? `EVA moy. ${metrics.evaMoyen}/10` : 'Aucune EVA'} />
        </div>

        {/* ── Clients & Forfaits ── */}
        <Card>
          <SectionTitle label="Clients & Forfaits" color="#7c3aed" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.75rem', background: '#faf5ff', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 9, marginBottom: 12 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style={{ fontSize: '0.69rem', color: '#6d28d9' }}>Données réelles disponibles après intégration Stripe + Supabase</span>
          </div>

          {/* Compteur clients */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Clients actifs', value: '—', note: 'Phase test' },
              { label: 'Testeurs invités', value: '0', note: 'Phase 1' },
              { label: 'MRR estimé', value: '—', note: 'CHF/mois' },
            ].map(({ label, value, note }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 9, padding: '0.65rem 0.5rem', border: `1px solid ${C.cardBorder}`, textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#334155' }}>{value}</div>
                <div style={{ fontSize: '0.6rem', color: C.muted, marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                <div style={{ fontSize: '0.58rem', color: C.mutedLight, marginTop: 1 }}>{note}</div>
              </div>
            ))}
          </div>

          {/* Forfaits planifiés */}
          <div style={{ fontSize: '0.67rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Forfaits planifiés — Phase 2</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {FORFAITS.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.75rem', background: '#f8fafc', border: `1px solid ${C.cardBorder}`, borderRadius: 9, borderLeft: `3px solid ${f.color}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.text }}>{f.label}</div>
                  <div style={{ fontSize: '0.67rem', color: C.muted, marginTop: 1 }}>{f.desc}</div>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: f.color }}>{f.price}</div>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: C.mutedLight, background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: 999 }}>0 client</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Répartition zones ── */}
        <Card>
          <SectionTitle label="Répartition par zone" badge={`${db.length} bilans`} />
          {metrics.zonesSorted.length === 0
            ? <div style={{ fontSize: '0.78rem', color: C.muted, textAlign: 'center', padding: '1rem 0' }}>Aucun bilan enregistré</div>
            : metrics.zonesSorted.map(([zone, count]) => (
                <HBar key={zone} label={ZONE_LABELS[zone] ?? zone} value={count} max={metrics.zoneMax} color={ZONE_COLORS[zone] ?? C.accent} />
              ))
          }
        </Card>

        {/* ── Activité mensuelle ── */}
        <Card>
          <SectionTitle label="Activité — 6 derniers mois" />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 60, marginBottom: 4 }}>
            {metrics.monthData.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: v > 0 ? '#2563eb' : '#e2e8f0', height: metrics.monthMax > 0 ? `${Math.max((v / metrics.monthMax) * 48, v > 0 ? 8 : 4)}px` : '4px' }} />
                <span style={{ fontSize: '0.58rem', color: C.muted, fontWeight: 600, textTransform: 'capitalize' }}>{metrics.monthLabels[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── EVN + Objectifs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <Card>
            <SectionTitle label="EVN / zone" />
            {metrics.evnZone.length === 0
              ? <div style={{ fontSize: '0.72rem', color: C.muted }}>Pas de données</div>
              : metrics.evnZone.slice(0, 4).map(({ zone, avg }) => (
                  <div key={zone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: `1px solid ${C.divider}` }}>
                    <span style={{ fontSize: '0.72rem', color: C.muted }}>{ZONE_LABELS[zone] ?? zone}</span>
                    <span style={{ fontSize: '0.83rem', fontWeight: 800, color: avg >= 7 ? C.red : avg >= 4 ? '#d97706' : C.green }}>{avg}</span>
                  </div>
                ))
            }
          </Card>
          <Card>
            <SectionTitle label="Objectifs SMART" badge={dbObjectifs.length} />
            {[
              { label: 'En cours', value: metrics.objActifs, color: C.accent },
              { label: 'Atteints', value: metrics.objAtteints, color: C.green },
              { label: 'Non atteints', value: metrics.objNonAtteints, color: C.red },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: `1px solid ${C.divider}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: '0.72rem', color: C.muted }}>{label}</span>
                </div>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color }}>{value}</span>
              </div>
            ))}
            {metrics.tauxObjectifs !== null && (
              <div style={{ marginTop: 8, fontSize: '0.67rem', color: C.muted, textAlign: 'center' }}>
                Taux d'atteinte : <span style={{ color: C.green, fontWeight: 700 }}>{metrics.tauxObjectifs}%</span>
              </div>
            )}
          </Card>
        </div>

        {/* ── Banque d'exercices ── */}
        <Card>
          <SectionTitle label="Banque d'exercices" badge={`${dbExerciceBank.length}`} color={C.green} />
          {metrics.topExercices.length === 0
            ? <div style={{ fontSize: '0.78rem', color: C.muted, textAlign: 'center', padding: '0.75rem 0' }}>Aucun exercice généré</div>
            : <>
                {metrics.topExercices.map(ex => (
                  <HBar key={ex.id} label={ex.nom.length > 34 ? ex.nom.slice(0, 34) + '…' : ex.nom} value={ex.occurrences} max={metrics.exerciceMax} color={ZONE_COLORS[ex.bilanType] ?? C.accent} />
                ))}
                <div style={{ marginTop: 6, fontSize: '0.67rem', color: C.muted, textAlign: 'right' }}>
                  {dbExerciceBank.reduce((s, e) => s + e.occurrences, 0)} prescriptions totales
                </div>
              </>
          }
        </Card>

        {/* ── Lucie + Coûts ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <Card>
            <SectionTitle label="Lucie IA" />
            <div style={{ fontSize: '0.67rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 7, padding: '0.45rem 0.6rem', marginBottom: 10 }}>
              Suivi précis après Supabase
            </div>
            {[
              { label: 'Plan', value: 'Creator' },
              { label: 'Coût fixe', value: '22 $/mois' },
              { label: 'Par session', value: '~0.32 $' },
              { label: 'Zero retention', value: '✓ Actif', green: true },
            ].map(({ label, value, green }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: `1px solid ${C.divider}` }}>
                <span style={{ fontSize: '0.71rem', color: C.muted }}>{label}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: green ? C.green : C.text }}>{value}</span>
              </div>
            ))}
          </Card>
          <Card>
            <SectionTitle label="Coûts API" />
            {[
              { label: 'ElevenLabs', value: '22 $', note: 'fixe/mois' },
              { label: 'Gemini', value: 'Gratuit', note: 'phase test', green: true },
              { label: 'Vercel', value: 'Gratuit', note: 'hobby', green: true },
            ].map(({ label, value, note, green }) => (
              <div key={label} style={{ padding: '0.35rem 0', borderBottom: `1px solid ${C.divider}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.71rem', color: C.muted }}>{label}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: green ? C.green : C.text }}>{value}</span>
                </div>
                <div style={{ fontSize: '0.62rem', color: C.mutedLight }}>{note}</div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: `2px solid ${C.cardBorder}` }}>
              <span style={{ fontSize: '0.73rem', fontWeight: 700, color: C.text }}>Total</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: C.accent }}>~22 $/mois</span>
            </div>
          </Card>
        </div>

        {/* ── Conformité nLPD / RGPD ── */}
        <Card>
          <SectionTitle label="Conformité nLPD / RGPD" color={C.green} />
          <StatusRow label="Zero retention ElevenLabs" status="ok" note="Aucun audio ni transcript stocké côté serveur" />
          <StatusRow label="Stockage 100% local (IndexedDB)" status="ok" note="Données sur l'appareil du thérapeute uniquement" />
          <StatusRow label="Transit HTTPS chiffré (Vercel)" status="ok" note="TLS 1.3 sur tous les endpoints" />
          <StatusRow label="Clé Gemini propriétaire" status="ok" note="Aucune donnée patient transmise aux tiers" />
          <StatusRow label="Pas de partage tiers sans consentement" status="ok" note="Architecture locale — pas de CRM ni tracking tiers" />
          <StatusRow label="Aucun nom patient dans sessions vocales" status="warn" note="Recommandé — à rappeler à l'onboarding" />
          <div style={{ marginTop: 10, padding: '0.6rem 0.75rem', background: '#fffbeb', borderRadius: 9, border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '0.67rem', color: '#92400e', fontWeight: 700 }}>Avant commercialisation</div>
            <div style={{ fontSize: '0.65rem', color: '#78350f', marginTop: 2, lineHeight: 1.5 }}>Consulter avocat nLPD (~500–1 000 CHF) · Régénérer clé ElevenLabs · Migrer Supabase EU (Frankfurt)</div>
          </div>
        </Card>

        {/* ── Suivi patients ── */}
        <Card>
          <SectionTitle label="Suivi patients" />
          {metrics.patientsInactifs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.67rem', color: '#b45309', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706' }} />
                Sans bilan depuis + 30 jours
              </div>
              {metrics.patientsInactifs.map(key => (
                <div key={key} style={{ fontSize: '0.75rem', color: C.muted, padding: '0.25rem 0', borderBottom: `1px solid ${C.divider}` }}>{key}</div>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Incomplets', value: metrics.totalBilansIncomplets, color: '#d97706' },
              { label: 'Intermédiaires', value: dbIntermediaires.length, color: C.accent },
              { label: 'Inactifs 30j', value: metrics.patientsInactifs.length, color: metrics.patientsInactifs.length > 0 ? C.red : C.green },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#f8fafc', borderRadius: 9, padding: '0.65rem 0.5rem', border: `1px solid ${C.cardBorder}`, textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: '0.6rem', color: C.muted, marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3 }}>{label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Footer ── */}
        <div style={{ textAlign: 'center', padding: '0.25rem 0' }}>
          <div style={{ fontSize: '0.61rem', color: C.mutedLight }}>PhysioScan Admin · Données locales · Phase test</div>
        </div>

      </div>
    </div>
  )
}
