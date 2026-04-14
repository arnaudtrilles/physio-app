import type { ReactNode } from 'react'
import { colors, spacing, radius, typography, motion } from '../../design/tokens'
import { IconMoreV, IconSparkles, IconAlertTriangle, IconTrendUp, IconTrendDown } from '../../design/icons'
import { Badge } from '../../design/primitives'

export type TimelineCardKind = 'bilan_initial' | 'bilan_interm' | 'note_seance'

interface TimelineCardProps {
  kind: TimelineCardKind
  label: string
  subtitle?: string
  date?: string
  pain?: number | null
  delta?: number | null
  analyzed?: boolean
  incomplete?: boolean
  customLabel?: string
  onClick?: () => void
  onMenu: () => void
  children?: ReactNode
}

const KIND_META: Record<TimelineCardKind, { accent: string; bg: string; tone: 'primary' | 'seance' | 'interm' }> = {
  bilan_initial: { accent: colors.bilan, bg: colors.bilanSoft, tone: 'primary' },
  bilan_interm: { accent: colors.interm, bg: colors.intermSoft, tone: 'interm' },
  note_seance: { accent: colors.seance, bg: colors.seanceSoft, tone: 'seance' },
}

function formatFrDate(raw?: string | null): string {
  if (!raw) return ''
  if (raw.includes('/')) return raw
  if (raw.includes('-')) return raw.split('-').reverse().join('/')
  return raw
}

export function TimelineCard({
  kind,
  label,
  subtitle,
  date,
  pain,
  delta,
  analyzed,
  incomplete,
  customLabel,
  onClick,
  onMenu,
  children,
}: TimelineCardProps) {
  const meta = KIND_META[kind]
  return (
    <div
      style={{
        background: meta.bg,
        border: `1px solid ${meta.accent}20`,
        borderLeft: `3px solid ${meta.accent}`,
        borderRadius: radius.lg,
        padding: '0.85rem 0.95rem',
        marginBottom: spacing.sm,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
        cursor: onClick ? 'pointer' : 'default',
        transition: `transform ${motion.fast}, box-shadow ${motion.fast}`,
      }}
      onClick={onClick}
      onPointerDown={onClick ? e => (e.currentTarget.style.transform = 'scale(0.99)') : undefined}
      onPointerUp={onClick ? e => (e.currentTarget.style.transform = 'scale(1)') : undefined}
      onPointerLeave={onClick ? e => (e.currentTarget.style.transform = 'scale(1)') : undefined}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: typography.body,
              fontWeight: typography.extrabold,
              color: meta.accent,
              letterSpacing: '-0.01em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {label}
            {incomplete && <Badge tone="warning">Incomplet</Badge>}
            {analyzed && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: typography.caption,
                  fontWeight: typography.bold,
                  color: colors.info,
                }}
              >
                <IconSparkles size={11} />
                IA
              </span>
            )}
          </div>
          {(customLabel || subtitle) && (
            <div
              style={{
                fontSize: typography.meta,
                color: colors.textMuted,
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontStyle: customLabel ? 'italic' : 'normal',
              }}
            >
              {customLabel || subtitle}
            </div>
          )}
        </div>
        <button
          onClick={e => {
            e.stopPropagation()
            onMenu()
          }}
          aria-label="Options"
          style={{
            width: 30,
            height: 30,
            borderRadius: radius.md,
            background: 'transparent',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <IconMoreV size={16} />
        </button>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', fontSize: typography.meta, color: colors.textMuted }}>
        {date && <span>{formatFrDate(date)}</span>}
        {pain !== undefined && pain !== null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <IconAlertTriangle size={11} color={colors.warning} />
            <span style={{ fontWeight: typography.bold, color: colors.text }}>{pain}/10</span>
          </span>
        )}
        {delta !== undefined && delta !== null && delta !== 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontWeight: typography.bold,
              color: delta > 0 ? colors.success : colors.danger,
            }}
          >
            {delta > 0 ? <IconTrendUp size={11} /> : <IconTrendDown size={11} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>

      {children}
    </div>
  )
}
