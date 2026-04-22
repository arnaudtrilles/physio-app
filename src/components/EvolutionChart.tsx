import { useMemo, useState } from 'react'

/**
 * Graphique d'évolution EVN/EVA dans le temps pour une zone donnée.
 * SVG vanilla, responsive, sans dépendance externe.
 *
 * Mélange 3 sources de données chronologiques :
 *   - Bilans initiaux (●)       — fond bleu
 *   - Bilans intermédiaires (■) — fond orange
 *   - Notes de séance (◆)        — fond violet
 */

export interface EvolutionPoint {
  date: string          // "jj/mm/aaaa"
  value: number         // 0-10
  kind: 'bilan' | 'intermediaire' | 'note'
  label: string         // infobulle (ex: "Bilan initial · 12/03/2026")
}

interface EvolutionChartProps {
  points: EvolutionPoint[]
  title?: string
  /** Si true, compact version (hauteur réduite, moins de marges) */
  compact?: boolean
  /** Pourcentage d'amélioration globale (ex: 40 = +40%) */
  improvementPct?: number | null
}

function parseFrDate(s: string | undefined): number {
  if (!s) return 0
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return 0
  return new Date(+m[3], +m[2] - 1, +m[1]).getTime()
}

const COLORS = {
  bilan:         { fill: 'var(--primary-light)', stroke: 'var(--primary)' },
  intermediaire: { fill: '#f97316', stroke: '#c2410c' },
  note:          { fill: '#8b5cf6', stroke: '#6d28d9' },
} as const

export function EvolutionChart({ points, title, compact, improvementPct }: EvolutionChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const sorted = useMemo(() => {
    return [...points]
      .map(p => ({ ...p, ts: parseFrDate(p.date) }))
      .filter(p => p.ts > 0 && !isNaN(p.value))
      .sort((a, b) => a.ts - b.ts)
  }, [points])

  if (sorted.length < 2) {
    return null // Pas assez de données pour un graph
  }

  // ── Dimensions & marges ────────────────────────────────────────────────
  const W = 560
  const H = compact ? 140 : 180
  const M = { top: 18, right: 16, bottom: compact ? 28 : 36, left: 28 }
  const innerW = W - M.left - M.right
  const innerH = H - M.top - M.bottom

  // ── Échelles ──────────────────────────────────────────────────────────
  const minTs = sorted[0].ts
  const maxTs = sorted[sorted.length - 1].ts
  const range = Math.max(maxTs - minTs, 1)

  const xScale = (ts: number) => M.left + ((ts - minTs) / range) * innerW
  // Échelle Y : 0 en bas, 10 en haut
  const yScale = (v: number) => M.top + innerH - (v / 10) * innerH

  // ── Points avec coordonnées ──────────────────────────────────────────
  const plotted = sorted.map((p, i) => ({
    ...p,
    x: xScale(p.ts),
    y: yScale(p.value),
    idx: i,
  }))

  // ── Path de la courbe ────────────────────────────────────────────────
  const pathD = plotted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  // ── Lignes de grille horizontales (0, 2, 4, 6, 8, 10) ────────────────
  const gridLines = [0, 2, 4, 6, 8, 10].map(v => ({ v, y: yScale(v) }))

  // ── Dates affichées en bas (début + fin + quelques intermédiaires) ───
  const dateTicks = useMemo(() => {
    const max = compact ? 3 : 5
    if (plotted.length <= max) return plotted
    const step = (plotted.length - 1) / (max - 1)
    const ticks: typeof plotted = []
    for (let i = 0; i < max; i++) {
      const idx = Math.round(i * step)
      ticks.push(plotted[idx])
    }
    return ticks
  }, [plotted, compact])

  const firstVal = sorted[0].value
  const lastVal = sorted[sorted.length - 1].value
  const delta = lastVal - firstVal
  const trendColor = delta < -0.5 ? '#166534' : delta > 0.5 ? '#881337' : '#64748b'
  const trendLabel = delta < -0.5 ? 'Amélioration' : delta > 0.5 ? 'Dégradation' : 'Stable'

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '0.75rem 0.9rem', marginBottom: '0.75rem' }}>
      {/* Titre */}
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-dark)', letterSpacing: '0.02em', marginBottom: 6 }}>
        {title ?? 'Évolution de la douleur (EVN/EVA)'}
      </div>

      {/* Résumé chiffré */}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{firstVal.toFixed(1)}</span>
        {' → '}
        <span style={{ fontWeight: 700, color: trendColor }}>{lastVal.toFixed(1)}</span>
        {' · '}
        <span style={{ color: trendColor, fontWeight: 600 }}>
          {trendLabel}{improvementPct != null ? ` (+${Math.abs(improvementPct)}%)` : ''}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Grille horizontale */}
        {gridLines.map(g => (
          <g key={g.v}>
            <line x1={M.left} y1={g.y} x2={W - M.right} y2={g.y}
              stroke={g.v === 0 || g.v === 10 ? '#cbd5e1' : '#e2e8f0'}
              strokeWidth={g.v === 0 || g.v === 10 ? 1 : 0.5}
              strokeDasharray={g.v === 0 || g.v === 10 ? '' : '2 3'} />
            <text x={M.left - 6} y={g.y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="inherit">{g.v}</text>
          </g>
        ))}

        {/* Zone de confort EVN ≤ 3 (léger fond vert) */}
        <rect
          x={M.left}
          y={yScale(3)}
          width={innerW}
          height={yScale(0) - yScale(3)}
          fill="#dcfce7"
          opacity="0.35"
        />
        {/* Zone rouge EVN ≥ 7 */}
        <rect
          x={M.left}
          y={yScale(10)}
          width={innerW}
          height={yScale(7) - yScale(10)}
          fill="#fee2e2"
          opacity="0.35"
        />

        {/* Courbe */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#evolGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="evolGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor='var(--primary)' />
            <stop offset="100%" stopColor='var(--primary-light)' />
          </linearGradient>
        </defs>

        {/* Points */}
        {plotted.map((p) => {
          const c = COLORS[p.kind]
          const isHovered = hoveredIdx === p.idx
          const r = isHovered ? 6.5 : (p.kind === 'bilan' ? 5.5 : p.kind === 'intermediaire' ? 5 : 4.5)
          return (
            <g key={p.idx}>
              {/* halo au hover */}
              {isHovered && <circle cx={p.x} cy={p.y} r={r + 3} fill={c.fill} opacity="0.25" />}
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={c.fill}
                stroke="white"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'r 0.1s' }}
                onMouseEnter={() => setHoveredIdx(p.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <title>{p.label} · EVN {p.value}/10</title>
              </circle>
            </g>
          )
        })}

        {/* Ticks de dates X */}
        {dateTicks.map((t, i) => (
          <text key={`${t.date}-${i}`} x={t.x} y={H - M.bottom + 14} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="inherit">
            {t.date.slice(0, 5)}
          </text>
        ))}
      </svg>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 4, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: COLORS.bilan.fill, border: '1.5px solid white', boxShadow: '0 0 0 1px ' + COLORS.bilan.stroke }} />
          Bilan initial
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: COLORS.intermediaire.fill, border: '1.5px solid white', boxShadow: '0 0 0 1px ' + COLORS.intermediaire.stroke }} />
          Intermédiaire
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: COLORS.note.fill, border: '1.5px solid white', boxShadow: '0 0 0 1px ' + COLORS.note.stroke }} />
          Séance
        </span>
      </div>
    </div>
  )
}
