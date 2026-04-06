import { useMemo } from 'react'
import type { BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord } from '../types'

interface DashboardStatsProps {
  bilans: BilanRecord[]
  intermediaires: BilanIntermediaireRecord[]
  notesSeance: NoteSeanceRecord[]
}

const BILAN_TYPE_LABELS: Record<string, string> = {
  epaule: 'Épaule',
  genou: 'Genou',
  hanche: 'Hanche',
  cheville: 'Cheville',
  cervical: 'Cervical',
  lombaire: 'Lombaire',
  generique: 'Général',
  geriatrique: 'Gériatrie',
}

function Icon({ type, size = 18, color = 'currentColor' }: { type: 'user' | 'clipboard' | 'trending' | 'calendar'; size?: number; color?: string }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (type === 'user') return <svg {...s}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  if (type === 'clipboard') return <svg {...s}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
  if (type === 'trending') return <svg {...s}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
  if (type === 'calendar') return <svg {...s}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  return null
}

export function DashboardStats({ bilans, intermediaires, notesSeance }: DashboardStatsProps) {
  const patientsActifs = useMemo(() => {
    const keys = new Set(bilans.map(b => `${b.nom.toUpperCase()} ${b.prenom}`))
    return keys.size
  }, [bilans])

  const bilansComplets = useMemo(
    () => bilans.filter(b => b.status === 'complet').length,
    [bilans]
  )

  const tauxAmelioration = useMemo(() => {
    const byPatientAndType = new Map<string, BilanRecord[]>()
    for (const b of bilans) {
      if (b.evn == null || !b.bilanType) continue
      const key = `${b.nom.toUpperCase()} ${b.prenom}|${b.bilanType}`
      const list = byPatientAndType.get(key) ?? []
      list.push(b)
      byPatientAndType.set(key, list)
    }
    const improvements: number[] = []
    for (const records of byPatientAndType.values()) {
      if (records.length < 2) continue
      const sorted = [...records].sort((a, b) => a.id - b.id)
      const firstEvn = sorted[0].evn!
      const lastEvn = sorted[sorted.length - 1].evn!
      if (firstEvn > 0) improvements.push(((firstEvn - lastEvn) / firstEvn) * 100)
    }
    if (improvements.length === 0) return null
    return improvements.reduce((sum, v) => sum + v, 0) / improvements.length
  }, [bilans])

  void notesSeance

  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of bilans) {
      const t = b.bilanType ?? 'generique'
      counts[t] = (counts[t] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([type, count]) => ({ type, label: BILAN_TYPE_LABELS[type] ?? type, count }))
      .sort((a, b) => b.count - a.count)
  }, [bilans])

  const maxZoneCount = Math.max(1, ...zoneCounts.map(z => z.count))
  const totalBilans = bilans.length || 1

  // suppress unused var
  void intermediaires

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: '1.25rem' }}>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <StatCard label="Patients" value={patientsActifs} color="#1e3a8a" iconType="user" />
        <StatCard label="Bilans" value={bilansComplets} color="#1e3a8a" iconType="clipboard" />
        <AmeliorationCard tauxAmelioration={tauxAmelioration} />
      </div>

      {/* Zone chart */}
      {zoneCounts.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', padding: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary-dark)', marginBottom: 12 }}>Zones les plus traitées</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {zoneCounts.map(({ type, label, count }) => {
              const pct = (count / maxZoneCount) * 100
              const share = ((count / totalBilans) * 100).toFixed(0)
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} ({share}%)</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--secondary)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: 'var(--primary)', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color, iconType }: { label: string; value: string | number; color: string; iconType: 'user' | 'clipboard' | 'trending' | 'calendar' }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: '0.75rem 0.65rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon type={iconType} size={13} color={color} />
        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>{label}</span>
      </div>
      <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-dark)', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{value}</span>
    </div>
  )
}

function AmeliorationCard({ tauxAmelioration }: { tauxAmelioration: number | null }) {
  const hasValue = tauxAmelioration != null
  const isPositive = hasValue && tauxAmelioration > 0
  const isNegative = hasValue && tauxAmelioration < 0
  const color = !hasValue ? '#64748b' : isPositive ? '#16a34a' : isNegative ? '#dc2626' : '#64748b'
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: '0.75rem 0.65rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon type="trending" size={13} color={color} />
        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>Amélioration</span>
      </div>
      {hasValue ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '1.35rem', fontWeight: 700, color, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
          {isPositive ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          ) : isNegative ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          )}
          {Math.abs(tauxAmelioration).toFixed(0)}%
        </span>
      ) : (
        <span style={{ fontSize: '1.35rem', fontWeight: 700, color: '#cbd5e1', lineHeight: 1.1 }}>—</span>
      )}
    </div>
  )
}
