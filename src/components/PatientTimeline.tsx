import { useMemo } from 'react'

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

interface NoteSeanceItem {
  id: number
  dateSeance: string
  numSeance: string
  zone?: string
  bilanType?: string
  data: { eva: string; evolution: string; tolerance: string }
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
        {hasIA && <Badge label="IA" bg="#dbeafe" fg="#1e3a8a" />}
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

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#6d28d9' }}>
          Séance n°{item.numSeance}
        </span>
        {item.data.evolution && (
          <Badge label={item.data.evolution} bg={`${evoBg}1a`} fg={evoBg} />
        )}
      </div>
      <div style={metaRowStyle}>
        <span>{item.dateSeance}</span>
        {item.zone && <span style={chipStyle}>{item.zone}</span>}
      </div>
      {item.data.eva && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
          EVA : <strong>{item.data.eva}/10</strong>
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

export function PatientTimeline({ bilans, intermediaires, notesSeance }: PatientTimelineProps) {
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

    // newest first
    all.sort((a, b) => b.date.getTime() - a.date.getTime())
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
}
