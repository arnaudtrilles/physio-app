import { memo, useMemo } from 'react'
import type { BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord } from '../types'

interface DashboardStatsProps {
  bilans: BilanRecord[]
  intermediaires: BilanIntermediaireRecord[]
  notesSeance: NoteSeanceRecord[]
  onSelectPatient?: (key: string) => void
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

const parseFR = (d: string) => {
  const [dd, mm, yy] = d.split('/')
  return new Date(`${yy}-${mm}-${dd}`).getTime() || 0
}

export const DashboardStats = memo(function DashboardStats({ bilans, intermediaires, notesSeance, onSelectPatient }: DashboardStatsProps) {

  // ── Séances cette semaine ──────────────────────────────────────────────────
  const seancesThisWeek = useMemo(() => {
    const now = Date.now()
    const weekAgo = now - 7 * 86400000
    let count = 0
    for (const b of bilans) { if (parseFR(b.dateBilan) > weekAgo) count++ }
    for (const r of intermediaires) { if (parseFR(r.dateBilan) > weekAgo) count++ }
    for (const n of notesSeance) { if (parseFR(n.dateSeance) > weekAgo) count++ }
    return count
  }, [bilans, intermediaires, notesSeance])

  // ── Amélioration moyenne (EVN) ─────────────────────────────────────────────
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

  // ── Scores par patient ─────────────────────────────────────────────────────
  const patientScores = useMemo(() => {
    const byPatient = new Map<string, { times: number[]; evns: number[] }>()
    for (const b of bilans) {
      if (b.evn == null) continue
      const key = `${(b.nom || '').toUpperCase()} ${b.prenom}`.trim()
      const entry = byPatient.get(key) ?? { times: [], evns: [] }
      entry.times.push(parseFR(b.dateBilan))
      entry.evns.push(b.evn)
      byPatient.set(key, entry)
    }
    for (const r of intermediaires) {
      const tc = (r.data as Record<string, Record<string, Record<string, unknown>>> | undefined)?.troncCommun
      const v = tc?.evn?.pireActuel
      const n = typeof v === 'number' ? v : typeof v === 'string' && v !== '' ? Number(v) : NaN
      if (isNaN(n)) continue
      const entry = byPatient.get(r.patientKey) ?? { times: [], evns: [] }
      entry.times.push(parseFR(r.dateBilan))
      entry.evns.push(n)
      byPatient.set(r.patientKey, entry)
    }
    for (const ns of notesSeance) {
      const v = ns.data?.eva
      const n = typeof v === 'string' && v !== '' ? Number(v) : typeof v === 'number' ? v : NaN
      if (isNaN(n)) continue
      const entry = byPatient.get(ns.patientKey) ?? { times: [], evns: [] }
      entry.times.push(parseFR(ns.dateSeance))
      entry.evns.push(n)
      byPatient.set(ns.patientKey, entry)
    }

    const results: { key: string; score: number }[] = []
    for (const [key, { times, evns }] of byPatient) {
      if (evns.length < 2) continue
      const indices = times.map((_, i) => i).sort((a, b) => times[a] - times[b])
      const first = evns[indices[0]]
      const last = evns[indices[indices.length - 1]]
      if (first === 0) continue
      results.push({ key, score: Math.round(((first - last) / first) * 100) })
    }
    return results
  }, [bilans, intermediaires, notesSeance])

  // Meilleure progression
  const bestPatient = useMemo(() => {
    const positive = patientScores.filter(p => p.score > 0).sort((a, b) => b.score - a.score)
    return positive[0] ?? null
  }, [patientScores])

  // Patients à surveiller (stagnation ou régression)
  const patientsToWatch = useMemo(() => {
    return patientScores.filter(p => p.score <= 0).sort((a, b) => a.score - b.score)
  }, [patientScores])

  // ── Zones les plus traitées ────────────────────────────────────────────────
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1.25rem' }}>
      {/* 3 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, alignItems: 'stretch' }}>
        {[
          {
            icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
            label: 'Semaine',
            value: String(seancesThisWeek),
            valueColor: 'var(--primary-dark)',
            sub: `séance${seancesThisWeek > 1 ? 's' : ''}`,
          },
          {
            icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
            label: 'Amélioration',
            value: tauxAmelioration != null ? `${Math.abs(tauxAmelioration).toFixed(0)}%` : '—',
            valueColor: tauxAmelioration != null ? (tauxAmelioration > 0 ? '#166534' : tauxAmelioration < 0 ? '#881337' : '#64748b') : '#cbd5e1',
            sub: 'moyenne EVN',
          },
          {
            icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
            label: 'Top',
            value: bestPatient ? `+${bestPatient.score}%` : '—',
            valueColor: bestPatient ? '#166534' : '#cbd5e1',
            sub: bestPatient?.key ?? '',
            onClick: bestPatient ? () => onSelectPatient?.(bestPatient.key) : undefined,
          },
        ].map((card, i) => (
          <div key={i} style={{ ...cardStyle, cursor: card.onClick ? 'pointer' : 'default' }} onClick={card.onClick}>
            <div style={cardHeaderStyle}>
              {card.icon}
              <span style={cardLabelStyle}>{card.label}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
              <span style={{ ...valueStyle, color: card.valueColor }}>{card.value}</span>
            </div>
            <span style={{ ...subtextStyle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.sub || '\u00A0'}</span>
          </div>
        ))}
      </div>

      {/* Patients à surveiller */}
      {patientsToWatch.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid #fecaca', boxShadow: '0 1px 4px rgba(220,38,38,0.06)', padding: '0.8rem 0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#881337" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#881337' }}>Patients à surveiller</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {patientsToWatch.slice(0, 3).map(p => (
              <div
                key={p.key}
                onClick={() => onSelectPatient?.(p.key)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '0.3rem 0' }}
              >
                <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.key}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: p.score < 0 ? '#881337' : '#94a3b8', flexShrink: 0, marginLeft: 8 }}>
                  {p.score < 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      {Math.abs(p.score)}%
                    </span>
                  ) : 'Stagnation'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zone chart */}
      {zoneCounts.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '0.85rem 0.9rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--primary-dark)', marginBottom: 10 }}>Zones les plus traitées</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {zoneCounts.map(({ type, label, count }) => {
              const pct = (count / maxZoneCount) * 100
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{label}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{count}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--secondary)', overflow: 'hidden' }}>
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
})

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border-color)',
  padding: '0.7rem 0.65rem',
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  overflow: 'hidden',
}

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  marginBottom: 6,
}

const cardLabelStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  letterSpacing: '0.02em',
}

const valueStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  fontWeight: 700,
  color: 'var(--primary-dark)',
  lineHeight: 1.15,
  letterSpacing: '-0.01em',
  marginBottom: 1,
}

const subtextStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  color: 'var(--text-muted)',
  lineHeight: 1.3,
}
