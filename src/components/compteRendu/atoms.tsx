import { type ReactNode, type CSSProperties } from 'react'
import type { DrapeauGroupe, MobiliteStatut, TestResultat } from '../../types'

/**
 * Atomes UI du compte rendu V10.
 *
 * Mix : couleurs sémantiques pour les éléments inline (Chip/Badge) +
 * encadrés doux pour les groupes (FlagBadge, MobilityStatus pill,
 * TestCard gris). Pas d'emoji — pictogrammes SVG côté parent.
 */

// ── Palette ───────────────────────────────────────────────────────────

export const PALETTE = {
  aggravant:    { fg: '#b91c1c' },
  soulageant:   { fg: '#15803d' },
  tolere:       { fg: '#1d4ed8' },
  neutral:      { fg: '#475569' },
  success:      { fg: '#15803d' },
  warning:      { fg: '#a16207' },
  danger:       { fg: '#b91c1c' },
  drapeauRouge: { fg: '#dc2626' },
  drapeauJaune: { fg: '#a16207' },
  drapeauBleu:  { fg: '#0369a1' },
  drapeauNoir:  { fg: '#374151' },
} as const

export type ChipVariant =
  | 'aggravant'
  | 'soulageant'
  | 'tolere'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'

// ── Chip (texte coloré inline, pas d'encadré) ─────────────────────────

interface ChipProps {
  variant: ChipVariant
  label: string
  detail?: string | null
  prefix?: string
}

export function Chip({ variant, label, detail, prefix }: ChipProps) {
  const p = PALETTE[variant]
  return (
    <span style={{
      display: 'inline',
      color: p.fg,
      fontSize: '0.86rem',
      fontWeight: 500,
      lineHeight: 1.5,
    }}>
      {prefix && <span style={{ opacity: 0.75, marginRight: 3 }}>{prefix}</span>}
      {label}
      {detail && detail.trim().length > 0 && (
        <span style={{ color: '#64748b', fontWeight: 400 }}> ({detail})</span>
      )}
    </span>
  )
}

// ── Badge (neutre, non-cliquable) ─────────────────────────────────────

export function Badge({ variant, children, icon }: { variant: ChipVariant; children: ReactNode; icon?: ReactNode }) {
  const p = PALETTE[variant]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 5,
        color: p.fg,
        fontSize: '0.84rem',
        fontWeight: 500,
        lineHeight: 1.5,
      }}
    >
      {icon}
      {children}
    </span>
  )
}

// ── Accordion (via <details>/<summary> natif) ─────────────────────────

interface AccordionProps {
  title: string
  count?: number
  defaultOpen?: boolean
  rightHint?: ReactNode
  children: ReactNode
}

export function Accordion({ title, count, defaultOpen = false, rightHint, children }: AccordionProps) {
  return (
    <details
      open={defaultOpen}
      style={{
        background: 'transparent',
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 0',
          fontSize: '0.82rem',
          fontWeight: 500,
          color: '#64748b',
          listStyle: 'none',
          userSelect: 'none',
        }}
      >
        <span aria-hidden style={{
          display: 'inline-block', transition: 'transform 200ms ease-out',
          fontSize: '0.6rem', color: '#cbd5e1', lineHeight: 1,
        }} className="cr-acc-caret">
          ▾
        </span>
        <span>{title}</span>
        {typeof count === 'number' && (
          <span style={{
            fontSize: '0.76rem', color: '#94a3b8', fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
          }}>
            ({count})
          </span>
        )}
        {rightHint && <span style={{ marginLeft: 'auto', fontSize: '0.76rem', color: '#94a3b8', fontWeight: 400 }}>{rightHint}</span>}
      </summary>
      <div style={{ paddingTop: 6, paddingLeft: 18 }}>
        {children}
      </div>
    </details>
  )
}

// ── EVNBadge ──────────────────────────────────────────────────────────

function parseEvnMax(v: string): number | null {
  // On ne lit QUE le numérateur : tout ce qui suit le « / » est le dénominateur
  // de l'échelle (ex. « 5/10 »→10) et ne doit jamais être interprété comme une
  // valeur de douleur. Sans ce split, « 5/10 » donnait max=10 → toujours « Sévère ».
  const numerator = v.split('/')[0]
  const matches = numerator.match(/\d+(?:[.,]\d+)?/g)
  if (!matches) return null
  const nums = matches.map(n => parseFloat(n.replace(',', '.'))).filter(n => !Number.isNaN(n))
  if (nums.length === 0) return null
  // Cas plage (« 5-7/10 ») : on retient la borne la plus élevée.
  return Math.max(...nums)
}

function evnSeverity(max: number | null): { fg: string; tone: string } {
  // Échelle EVN : 7-10 Sévère (rouge), 4-6 Modérée (orange),
  // 1-3 Légère (vert), 0 Aucune (vert).
  if (max === null) return { fg: '#94a3b8', tone: 'Non renseigné' }
  if (max >= 7) return { fg: '#be123c', tone: 'Sévère' }
  if (max >= 4) return { fg: '#ea580c', tone: 'Modérée' }
  if (max >= 1) return { fg: '#16a34a', tone: 'Légère' }
  return { fg: '#16a34a', tone: 'Aucune' }
}

export function EVNBadge({ value, label = 'EVN' }: { value: string; label?: string }) {
  const max = parseEvnMax(value)
  const sev = evnSeverity(max)
  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      padding: '6px 12px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      minWidth: 70,
      lineHeight: 1.2,
    }}>
      <span style={{
        fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#94a3b8',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '1.1rem', fontWeight: 700, color: '#0f172a',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.01em',
      }}>
        {value}
      </span>
      <span style={{
        fontSize: '0.74rem', fontWeight: 600, color: sev.fg,
      }}>
        {sev.tone}
      </span>
    </div>
  )
}

// ── MobilityStatus (pill encadrée douce, demande utilisateur) ─────────

const MOBILITE_META: Record<MobiliteStatut, { label: string; bg: string; border: string; fg: string }> = {
  algique_limitant: { label: 'Algique limitant', bg: '#fef2f2', border: '#fecaca', fg: '#b91c1c' },
  algique:          { label: 'Algique',          bg: '#fef2f2', border: '#fecaca', fg: '#b91c1c' },
  peu_algiques:     { label: 'Peu algique',      bg: '#fffbeb', border: '#fde68a', fg: '#a16207' },
  tolere:           { label: 'Tolérée',          bg: '#f0fdf4', border: '#bbf7d0', fg: '#15803d' },
  limite:           { label: 'Limitée',          bg: '#fffbeb', border: '#fde68a', fg: '#a16207' },
  NR:               { label: 'Non renseignée',   bg: '#f8fafc', border: '#e2e8f0', fg: '#475569' },
}

export function MobilityStatus({ statut }: { statut: MobiliteStatut }) {
  const meta = MOBILITE_META[statut]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 9px',
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        borderRadius: 999,
        color: meta.fg,
        fontSize: '0.76rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        lineHeight: 1.5,
      }}
    >
      {meta.label}
    </span>
  )
}

// ── TestCard (encadré gris doux, demande utilisateur) ─────────────────

const TEST_META: Record<TestResultat, { fg: string; symbol: string; label: string }> = {
  positif:      { fg: '#b91c1c', symbol: '+', label: 'Positif' },
  negatif:      { fg: '#15803d', symbol: '−', label: 'Négatif' },
  non_realise:  { fg: '#475569', symbol: '·', label: 'Non réalisé' },
}

interface TestCardProps {
  nom: string
  resultat: TestResultat
  cote: 'D' | 'G' | null
  detail: string | null
}

export function TestCard({ nom, resultat, cote, detail }: TestCardProps) {
  const meta = TEST_META[resultat]
  const coteLabel = cote ? (cote === 'D' ? 'droite' : 'gauche') : null

  return (
    <div style={{
      padding: '8px 10px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      lineHeight: 1.5,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>{nom}</span>
        {coteLabel && (
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>({coteLabel})</span>
        )}
        <span style={{ color: meta.fg, fontSize: '0.82rem', fontWeight: 600, marginLeft: 'auto' }}>
          {meta.symbol} {meta.label}
        </span>
      </div>
      {detail && (
        <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
          {detail}
        </p>
      )}
    </div>
  )
}

// ── FlagBadge (encadré coloré doux, demande utilisateur) ──────────────

const FLAG_META = {
  rouges: { label: 'Rouges',  bg: '#fef2f2', border: '#fecaca', fg: '#dc2626' },
  jaunes: { label: 'Jaunes',  bg: '#fefce8', border: '#fef08a', fg: '#a16207' },
  bleus:  { label: 'Bleus',   bg: '#eff6ff', border: '#bfdbfe', fg: '#0369a1' },
  noirs:  { label: 'Noirs',   bg: '#f3f4f6', border: '#d1d5db', fg: '#374151' },
} as const

export type FlagKey = keyof typeof FLAG_META

interface FlagBadgeProps {
  flag: FlagKey
  data: DrapeauGroupe
}

export function FlagBadge({ flag, data }: FlagBadgeProps) {
  const meta = FLAG_META[flag]
  const inactive = data.statut === 'non_renseigne'

  return (
    <section style={{
      background: inactive ? '#f8fafc' : meta.bg,
      border: `1px solid ${inactive ? '#e2e8f0' : meta.border}`,
      borderRadius: 10,
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.86rem', fontWeight: 700,
          color: inactive ? '#94a3b8' : meta.fg,
        }}>
          {meta.label}
        </span>
        <FlagStatusLine data={data} />
      </header>

      {(data.statut === 'positifs' || data.statut === 'mixte') && (data.elementsPositifs ?? []).length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.84rem', color: '#1e293b', lineHeight: 1.55 }}>
          {(data.elementsPositifs ?? []).map((el, i) => (
            <li key={i}>{el}</li>
          ))}
        </ul>
      )}

      {data.statut === 'tous_negatifs' && (data.elementsVerifies ?? []).length > 0 && (
        <Accordion title="Éléments vérifiés" count={(data.elementsVerifies ?? []).length}>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: '#475569', lineHeight: 1.7 }}>
            {(data.elementsVerifies ?? []).map((el, i) => (
              <li key={i}>{el}</li>
            ))}
          </ul>
        </Accordion>
      )}
    </section>
  )
}

function FlagStatusLine({ data }: { data: DrapeauGroupe }) {
  const baseStyle: CSSProperties = { fontSize: '0.78rem', fontWeight: 500 }
  if (data.statut === 'tous_negatifs') {
    return (
      <span style={{ ...baseStyle, color: '#16a34a' }}>
        Vérifié, tous absents
      </span>
    )
  }
  if (data.statut === 'positifs' || data.statut === 'mixte') {
    const n = (data.elementsPositifs ?? []).length
    return (
      <span style={{ ...baseStyle, color: '#a16207' }}>
        {n} élément{n > 1 ? 's' : ''} positif{n > 1 ? 's' : ''}
      </span>
    )
  }
  return (
    <span style={{ ...baseStyle, color: '#94a3b8' }}>
      Non renseigné
    </span>
  )
}
