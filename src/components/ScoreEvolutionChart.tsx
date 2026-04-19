import { memo, useMemo } from 'react'

/* ──────────────────────────────────────────────────────────────────────────
 * ScoreEvolutionChart
 *
 * Plots questionnaire / functional scores over time for a patient.
 * Pure SVG sparklines, no external dependency.
 * ────────────────────────────────────────────────────────────────────────── */

export interface ScoreEvolutionChartProps {
  bilans: Array<{
    dateBilan: string
    bilanData?: Record<string, unknown>
    analyseIA?: unknown
  }>
  intermediaires: Array<{
    dateBilan: string
    data?: Record<string, unknown>
  }>
}

// ── Score key → display label ───────────────────────────────────────────

const SCORE_LABELS: Record<string, string> = {
  ndi: 'NDI',
  had: 'HAD',
  dn4: 'DN4',
  koos: 'KOOS',
  fakps: 'F-AKPS',
  ikdc: 'IKDC',
  aclRsi: 'ACL-RSI',
  sf36: 'SF-36',
  faam: 'FAAM',
  cumberland: 'Cumberland',
  oss: 'OSS',
  constantMurley: 'Constant-Murley',
  dash: 'DASH',
  rowe: 'Rowe',
  hoos: 'HOOS',
  oxfordHip: 'Oxford Hip',
  hagos: 'HAGOS',
  efmi: 'EFMI',
  startBack: 'Start Back',
  orebro: 'Orebro',
  fabq: 'FABQ',
  eifel: 'EIFEL',
  painDetect: 'Pain Detect',
  sensiC: 'CSI',
}

// ── Helpers ─────────────────────────────────────────────────────────────

function parseFrDate(s: string | undefined): number {
  if (!s) return 0
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return 0
  return new Date(+m[3], +m[2] - 1, +m[1]).getTime()
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && !isNaN(v)
}

/** Strip the "Act" suffix used in intermediaire keys (e.g. "ndiAct" -> "ndi") */
function stripActSuffix(key: string): string {
  if (key.endsWith('Act')) return key.slice(0, -3)
  return key
}

/** Strip "_score" suffix used in questionnaire results (e.g. "had_score" -> "had") */
function stripScoreSuffix(key: string): string {
  if (key.endsWith('_score')) return key.slice(0, -6)
  return key
}

interface DataPoint {
  ts: number
  date: string
  value: number
}

// ── Score extraction ────────────────────────────────────────────────────

function extractScores(
  bilans: ScoreEvolutionChartProps['bilans'],
  intermediaires: ScoreEvolutionChartProps['intermediaires'],
): Map<string, DataPoint[]> {
  const map = new Map<string, DataPoint[]>()

  function push(key: string, date: string, value: number) {
    const ts = parseFrDate(date)
    if (ts === 0) return
    const normalised = SCORE_LABELS[key] ? key : undefined
    if (!normalised) return
    if (!map.has(normalised)) map.set(normalised, [])
    map.get(normalised)!.push({ ts, date, value })
  }

  // From bilans — bilanData.scores
  for (const b of bilans) {
    const bd = b.bilanData
    if (!bd) continue

    const scores = bd.scores as Record<string, unknown> | undefined
    if (scores && typeof scores === 'object') {
      for (const [k, v] of Object.entries(scores)) {
        if (isNum(v)) push(k, b.dateBilan, v)
      }
    }

    // bilanData.questionnaires.results  (keys like "had_score")
    const q = bd.questionnaires as Record<string, unknown> | undefined
    if (q && typeof q === 'object') {
      const results = q.results as Record<string, unknown> | undefined
      if (results && typeof results === 'object') {
        for (const [k, v] of Object.entries(results)) {
          if (isNum(v)) push(stripScoreSuffix(k), b.dateBilan, v)
        }
      }
    }
  }

  // From intermediaires — data.moduleSpecifique.scores  (keys with "Act" suffix)
  for (const inter of intermediaires) {
    const d = inter.data as Record<string, unknown> | undefined
    if (!d) continue
    const ms = d.moduleSpecifique as Record<string, unknown> | undefined
    if (!ms) continue
    const scores = ms.scores as Record<string, unknown> | undefined
    if (!scores || typeof scores !== 'object') continue
    for (const [k, v] of Object.entries(scores)) {
      if (isNum(v)) push(stripActSuffix(k), inter.dateBilan, v)
    }
  }

  // Sort each series by time and deduplicate same-date entries (keep last)
  Array.from(map.entries()).forEach(([key, pts]) => {
    pts.sort((a, b) => a.ts - b.ts)
    const deduped: DataPoint[] = []
    for (const p of pts) {
      if (deduped.length > 0 && deduped[deduped.length - 1].ts === p.ts) {
        deduped[deduped.length - 1] = p
      } else {
        deduped.push(p)
      }
    }
    map.set(key, deduped)
  })

  return map
}

// ── Sparkline sub-component ─────────────────────────────────────────────

const SPARK_W = 160
const SPARK_H = 60
const SPARK_PAD = { top: 6, right: 6, bottom: 6, left: 6 }

function Sparkline({ points }: { points: DataPoint[] }) {
  const innerW = SPARK_W - SPARK_PAD.left - SPARK_PAD.right
  const innerH = SPARK_H - SPARK_PAD.top - SPARK_PAD.bottom

  const minVal = Math.min(...points.map(p => p.value))
  const maxVal = Math.max(...points.map(p => p.value))
  const valRange = maxVal - minVal || 1

  const minTs = points[0].ts
  const maxTs = points[points.length - 1].ts
  const tsRange = maxTs - minTs || 1

  const coords = points.map(p => ({
    x: SPARK_PAD.left + ((p.ts - minTs) / tsRange) * innerW,
    y: SPARK_PAD.top + innerH - ((p.value - minVal) / valRange) * innerH,
  }))

  const pathD = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ')

  // Gradient area fill
  const areaD =
    pathD +
    ` L ${coords[coords.length - 1].x.toFixed(1)} ${(SPARK_H - SPARK_PAD.bottom).toFixed(1)}` +
    ` L ${coords[0].x.toFixed(1)} ${(SPARK_H - SPARK_PAD.bottom).toFixed(1)} Z`

  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      style={{ width: SPARK_W, height: SPARK_H, display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="sparkFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--primary-dark)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--primary-dark)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkFill)" />
      <path
        d={pathD}
        fill="none"
        stroke="var(--primary-dark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={3}
          fill="white"
          stroke="var(--primary-dark)"
          strokeWidth="1.5"
        >
          <title>{`${points[i].date} : ${points[i].value}`}</title>
        </circle>
      ))}
    </svg>
  )
}

// ── Main component ──────────────────────────────────────────────────────

export const ScoreEvolutionChart = memo(function ScoreEvolutionChart({
  bilans,
  intermediaires,
}: ScoreEvolutionChartProps) {
  const series = useMemo(
    () => extractScores(bilans, intermediaires),
    [bilans, intermediaires],
  )

  // Keep only series with 2+ data points
  const displayable = useMemo(() => {
    const entries: Array<{ key: string; label: string; points: DataPoint[] }> = []
    Array.from(series.entries()).forEach(([key, pts]) => {
      if (pts.length >= 2) {
        entries.push({ key, label: SCORE_LABELS[key] ?? key, points: pts })
      }
    })
    // Sort alphabetically by label for stable ordering
    entries.sort((a, b) => a.label.localeCompare(b.label))
    return entries
  }, [series])

  if (displayable.length === 0) return null

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.75rem 0.9rem',
        marginBottom: '0.75rem',
      }}
    >
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'var(--primary-dark)',
          letterSpacing: '0.02em',
          marginBottom: 8,
        }}
      >
        Evolution des scores fonctionnels
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {displayable.map(({ key, label, points }) => {
          const first = points[0].value
          const last = points[points.length - 1].value
          const delta = last - first
          const trendColor =
            delta > 0.5 ? '#166534' : delta < -0.5 ? '#881337' : '#64748b'
          const arrow = delta > 0.5 ? '\u2191' : delta < -0.5 ? '\u2193' : '\u2192'

          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: 8,
              }}
            >
              {/* Label + values */}
              <div style={{ minWidth: 130, flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    marginBottom: 2,
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {first}
                  </span>
                  {' \u2192 '}
                  <span style={{ fontWeight: 700, color: trendColor }}>
                    {last}
                  </span>
                  {' '}
                  <span style={{ color: trendColor, fontWeight: 600 }}>
                    {arrow}{' '}
                    {delta !== 0
                      ? `${delta > 0 ? '+' : ''}${delta % 1 === 0 ? delta : delta.toFixed(1)}`
                      : ''}
                  </span>
                </div>
              </div>

              {/* Sparkline */}
              <Sparkline points={points} />
            </div>
          )
        })}
      </div>
    </div>
  )
})
