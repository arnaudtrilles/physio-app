import { memo, useMemo, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BilanItem {
  id: number
  dateBilan: string
  zone?: string
  bilanType?: string
  status?: string
  evn?: number
  analyseIA?: unknown
}

interface IntermediaireItem {
  id: number
  dateBilan: string
  zone?: string
  bilanType?: string
  status?: string
  data?: Record<string, unknown>
}

interface NoteAnalyseIA {
  resume: string
  evolution: string
  vigilance: string[]
  focus: string
  conseil: string
}

interface NoteSeanceItem {
  id: number
  dateSeance: string
  numSeance: string
  zone?: string
  bilanType?: string
  data: {
    eva: string
    evolution: string
    tolerance: string
    observance?: string
    noteSubjective?: string
    interventions?: string[]
    detailDosage?: string
    toleranceDetail?: string
    prochaineEtape?: string[]
    notePlan?: string
  }
  analyseIA?: NoteAnalyseIA
}

export interface PatientTimelineProps {
  bilans: BilanItem[]
  intermediaires: IntermediaireItem[]
  notesSeance: NoteSeanceItem[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TimelineEvent = {
  kind: 'bilan' | 'intermediaire' | 'note'
  date: Date
  dateLabel: string
  monthKey: string
  payload: BilanItem | IntermediaireItem | NoteSeanceItem
}

function parseDDMMYYYY(raw: string): Date {
  const parts = raw.split('/')
  if (parts.length !== 3) return new Date(NaN)
  const [d, m, y] = parts.map(Number)
  return new Date(y, m - 1, d)
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function extractEvnFromIntermed(item: IntermediaireItem): number | null {
  try {
    const tc = (item.data as Record<string, Record<string, Record<string, unknown>>>)
      ?.troncCommun
    const val = tc?.evn?.pireActuel
    if (typeof val === 'number') return val
    if (typeof val === 'string' && val !== '') return Number(val)
  } catch {
    // data shape mismatch — ignore
  }
  return null
}

const EVOLUTION_COLORS: Record<string, string> = {
  'Amélioré': '#16a34a',
  'Stable': '#71717a',
  'Aggravé': '#dc2626',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: '9999px',
        fontSize: 11,
        fontWeight: 600,
        lineHeight: '18px',
        background: bg,
        color: fg,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function MonthSeparator({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '4px 0 4px 36px',
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'capitalize',
        color: 'var(--text-muted)',
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </div>
  )
}

function BilanCard({ item }: { item: BilanItem }) {
  const hasIA = item.analyseIA != null
  const incomplet = item.status === 'incomplet'

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e3a8a' }}>Bilan initial</span>
        {hasIA && <Badge label="Analysé" bg="#dbeafe" fg="#1e3a8a" />}
        {incomplet && <Badge label="Incomplet" bg="#fef3c7" fg="#92400e" />}
      </div>
      <div style={metaRowStyle}>
        <span>{item.dateBilan}</span>
        {item.zone && <span style={chipStyle}>{item.zone}</span>}
      </div>
      {item.evn != null && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          EVN : <strong>{item.evn}/10</strong>
        </div>
      )}
    </div>
  )
}

function IntermediaireCard({ item }: { item: IntermediaireItem }) {
  const evn = extractEvnFromIntermed(item)

  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#ea580c' }}>
        Bilan intermédiaire
      </div>
      <div style={metaRowStyle}>
        <span>{item.dateBilan}</span>
        {item.zone && <span style={chipStyle}>{item.zone}</span>}
      </div>
      {evn != null && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          EVN : <strong>{evn}/10</strong>
        </div>
      )}
    </div>
  )
}

function NoteCard({ item }: { item: NoteSeanceItem }) {
  const evoBg = EVOLUTION_COLORS[item.data.evolution] ?? '#71717a'
  const [detailOpen, setDetailOpen] = useState(false)
  const [analyseOpen, setAnalyseOpen] = useState(false)

  const interventions = item.data.interventions ?? []
  const prochaineEtape = item.data.prochaineEtape ?? []
  const hasDetail =
    interventions.length > 0 ||
    !!item.data.detailDosage ||
    !!item.data.noteSubjective ||
    !!item.data.toleranceDetail ||
    prochaineEtape.length > 0 ||
    !!item.data.notePlan

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#6d28d9' }}>
          Séance n°{item.numSeance}
        </span>
        {item.data.evolution && (
          <Badge label={item.data.evolution} bg={`${evoBg}1a`} fg={evoBg} />
        )}
        {item.data.tolerance && (
          <Badge
            label={item.data.tolerance}
            bg={item.data.tolerance === 'Bien toléré' ? '#dcfce7' : '#fffbeb'}
            fg={item.data.tolerance === 'Bien toléré' ? '#16a34a' : '#d97706'}
          />
        )}
      </div>
      <div style={metaRowStyle}>
        <span>{item.dateSeance}</span>
      </div>
      {item.data.eva && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          EVA : <strong>{item.data.eva}/10</strong>
        </div>
      )}

      {hasDetail && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setDetailOpen(v => !v)}
            style={{
              width: '100%',
              padding: '0.3rem 0.7rem',
              borderRadius: detailOpen ? '8px 8px 0 0' : 8,
              background: '#f5f3ff',
              border: '1px solid #ede9fe',
              color: '#7c3aed',
              fontWeight: 600,
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <span>Détails séance</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: detailOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {detailOpen && (
            <div style={{ background: '#f5f3ff', borderRadius: '0 0 8px 8px', padding: '0.55rem 0.7rem', fontSize: '0.75rem', color: '#5b21b6', lineHeight: 1.5, borderTop: '1px solid #ede9fe' }}>
              {interventions.length > 0 && (
                <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Traitement :</span> {interventions.join(', ')}</div>
              )}
              {item.data.detailDosage && (
                <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Dosage :</span> {item.data.detailDosage}</div>
              )}
              {item.data.noteSubjective && (
                <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Ressenti :</span> {item.data.noteSubjective}</div>
              )}
              {item.data.toleranceDetail && (
                <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Tolérance :</span> {item.data.toleranceDetail}</div>
              )}
              {prochaineEtape.length > 0 && (
                <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Prochaine étape :</span> {prochaineEtape.join(', ')}</div>
              )}
              {item.data.notePlan && (
                <div><span style={{ fontWeight: 700 }}>Note :</span> {item.data.notePlan}</div>
              )}
            </div>
          )}
        </div>
      )}

      {item.analyseIA && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setAnalyseOpen(v => !v)}
            style={{
              width: '100%',
              padding: '0.4rem 0.7rem',
              borderRadius: analyseOpen ? '8px 8px 0 0' : 8,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              fontWeight: 600,
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <span>Analyse</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: analyseOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {analyseOpen && (
            <div style={{ background: '#eff6ff', borderRadius: '0 0 8px 8px', padding: '0.55rem 0.7rem', fontSize: '0.75rem', color: '#1e3a8a', lineHeight: 1.5, borderLeft: '3px solid #2563eb', borderTop: 'none' }}>
              <div style={{ marginBottom: 3 }}>{item.analyseIA.resume}</div>
              <div style={{ marginBottom: 3, fontSize: '0.72rem' }}>{item.analyseIA.evolution}</div>
              {item.analyseIA.vigilance.length > 0 && (
                <div style={{ color: '#dc2626', fontSize: '0.72rem', marginBottom: 3 }}>Vigilance : {item.analyseIA.vigilance.join(' / ')}</div>
              )}
              <div style={{ fontWeight: 600, fontSize: '0.72rem' }}>Focus : {item.analyseIA.focus}</div>
              {item.analyseIA.conseil && (
                <div style={{ marginTop: 4, padding: '0.4rem 0.55rem', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', color: '#15803d', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: 700 }}>Conseil :</span> {item.analyseIA.conseil}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared inline styles
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  padding: '10px 14px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  color: 'var(--text-muted)',
  marginTop: 2,
}

const chipStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0 6px',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 500,
  background: 'var(--secondary)',
  color: 'var(--text-main)',
  lineHeight: '18px',
}

const DOT_COLORS: Record<TimelineEvent['kind'], string> = {
  bilan: '#1e3a8a',
  intermediaire: '#ea580c',
  note: '#6d28d9',
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const PatientTimeline = memo(function PatientTimeline({ bilans, intermediaires, notesSeance }: PatientTimelineProps) {
  const events = useMemo<TimelineEvent[]>(() => {
    const all: TimelineEvent[] = []

    for (const b of bilans) {
      const d = parseDDMMYYYY(b.dateBilan)
      all.push({ kind: 'bilan', date: d, dateLabel: b.dateBilan, monthKey: formatMonthYear(d), payload: b })
    }
    for (const i of intermediaires) {
      const d = parseDDMMYYYY(i.dateBilan)
      all.push({ kind: 'intermediaire', date: d, dateLabel: i.dateBilan, monthKey: formatMonthYear(d), payload: i })
    }
    for (const n of notesSeance) {
      const d = parseDDMMYYYY(n.dateSeance)
      all.push({ kind: 'note', date: d, dateLabel: n.dateSeance, monthKey: formatMonthYear(d), payload: n })
    }

    // oldest first (chronological order)
    all.sort((a, b) => a.date.getTime() - b.date.getTime())
    return all
  }, [bilans, intermediaires, notesSeance])

  if (events.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
        Aucun événement à afficher.
      </div>
    )
  }

  // Group by month
  let lastMonth = ''

  return (
    <div style={{ position: 'relative', paddingLeft: 18 }}>
      {/* Vertical line */}
      <div
        style={{
          position: 'absolute',
          left: 5,
          top: 0,
          bottom: 0,
          width: 2,
          background: 'var(--border-color)',
          borderRadius: 1,
        }}
      />

      {events.map((ev, idx) => {
        const showMonth = ev.monthKey !== lastMonth
        lastMonth = ev.monthKey

        return (
          <div key={`${ev.kind}-${(ev.payload as { id: number }).id}-${idx}`}>
            {showMonth && <MonthSeparator label={ev.monthKey} />}

            <div style={{ position: 'relative', paddingLeft: 24, paddingBottom: 16 }}>
              {/* Colored dot */}
              <div
                style={{
                  position: 'absolute',
                  left: -1,
                  top: 12,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: DOT_COLORS[ev.kind],
                  border: '2px solid var(--surface)',
                  boxSizing: 'border-box',
                  zIndex: 1,
                }}
              />

              {/* Card */}
              {ev.kind === 'bilan' && <BilanCard item={ev.payload as BilanItem} />}
              {ev.kind === 'intermediaire' && <IntermediaireCard item={ev.payload as IntermediaireItem} />}
              {ev.kind === 'note' && <NoteCard item={ev.payload as NoteSeanceItem} />}
            </div>
          </div>
        )
      })}
    </div>
  )
})
