import type { CSSProperties, ReactNode, ButtonHTMLAttributes } from 'react'
import { colors, spacing, radius, typography, shadow, motion } from './tokens'

// ──────────────────────────────────────────────────────────────────
// Button
// ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success' | 'soft'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconEnd?: ReactNode
  fullWidth?: boolean
  style?: CSSProperties
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconEnd,
  fullWidth,
  style,
  children,
  ...props
}: ButtonProps) {
  const sizeStyles: Record<ButtonSize, CSSProperties> = {
    sm: { padding: '0.45rem 0.85rem', fontSize: typography.label, minHeight: 34, borderRadius: radius.md },
    md: { padding: '0.7rem 1.1rem', fontSize: typography.body, minHeight: 42, borderRadius: radius.lg },
    lg: { padding: '0.95rem 1.3rem', fontSize: typography.bodyLg, minHeight: 52, borderRadius: radius.lg },
  }

  const variantStyles: Record<ButtonVariant, CSSProperties> = {
    primary: {
      background: `linear-gradient(to right, ${colors.primary}, ${colors.primaryDark})`,
      color: 'white',
      border: 'none',
      boxShadow: shadow.primary,
      fontWeight: typography.semibold,
    },
    secondary: {
      background: colors.surfaceMuted,
      color: colors.text,
      border: `1px solid ${colors.borderSoft}`,
      fontWeight: typography.semibold,
    },
    ghost: {
      background: 'transparent',
      color: colors.text,
      border: 'none',
      fontWeight: typography.medium,
    },
    outline: {
      background: 'transparent',
      color: colors.primary,
      border: `1.5px solid ${colors.primary}`,
      fontWeight: typography.semibold,
    },
    danger: {
      background: colors.dangerSoft,
      color: colors.danger,
      border: `1px solid ${colors.dangerBg}`,
      fontWeight: typography.semibold,
    },
    success: {
      background: colors.successSoft,
      color: colors.success,
      border: `1px solid ${colors.successBg}`,
      fontWeight: typography.semibold,
    },
    soft: {
      background: colors.infoSoft,
      color: colors.info,
      border: `1px solid ${colors.infoBg}`,
      fontWeight: typography.semibold,
    },
  }

  return (
    <button
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        width: fullWidth ? '100%' : undefined,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.55 : 1,
        transition: `transform ${motion.fast}, box-shadow ${motion.fast}, background ${motion.fast}`,
        whiteSpace: 'nowrap',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
    >
      {icon}
      {children}
      {iconEnd}
    </button>
  )
}

// ──────────────────────────────────────────────────────────────────
// IconButton
// ──────────────────────────────────────────────────────────────────

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  size?: number
  tone?: 'default' | 'muted' | 'primary' | 'danger'
  style?: CSSProperties
}

export function IconButton({ size = 36, tone = 'default', style, children, ...props }: IconButtonProps) {
  const toneStyles: Record<string, CSSProperties> = {
    default: { background: colors.surfaceMuted, color: colors.text, border: `1px solid ${colors.borderSoft}` },
    muted: { background: 'transparent', color: colors.textMuted, border: 'none' },
    primary: { background: colors.infoSoft, color: colors.primary, border: `1px solid ${colors.infoBg}` },
    danger: { background: colors.dangerSoft, color: colors.danger, border: `1px solid ${colors.dangerBg}` },
  }
  return (
    <button
      {...props}
      aria-label={props['aria-label']}
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: `background ${motion.fast}, transform ${motion.fast}`,
        flexShrink: 0,
        ...toneStyles[tone],
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ──────────────────────────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  padding?: number | string
  onClick?: () => void
  interactive?: boolean
  accent?: string
  style?: CSSProperties
}

export function Card({ children, padding = spacing.lg, onClick, interactive, accent, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: colors.surface,
        border: `1px solid ${colors.borderSoft}`,
        borderLeft: accent ? `3px solid ${accent}` : undefined,
        borderRadius: radius.xl,
        padding,
        boxShadow: shadow.sm,
        cursor: interactive || onClick ? 'pointer' : undefined,
        transition: `transform ${motion.fast}, box-shadow ${motion.fast}`,
        ...style,
      }}
      onPointerDown={interactive || onClick ? e => (e.currentTarget.style.transform = 'scale(0.985)') : undefined}
      onPointerUp={interactive || onClick ? e => (e.currentTarget.style.transform = 'scale(1)') : undefined}
      onPointerLeave={interactive || onClick ? e => (e.currentTarget.style.transform = 'scale(1)') : undefined}
    >
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Badge
// ──────────────────────────────────────────────────────────────────

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'seance' | 'interm'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  icon?: ReactNode
  style?: CSSProperties
}

export function Badge({ children, tone = 'neutral', icon, style }: BadgeProps) {
  const toneStyles: Record<BadgeTone, CSSProperties> = {
    neutral: { background: colors.surfaceMuted, color: colors.textMuted, border: `1px solid ${colors.borderSoft}` },
    success: { background: colors.successBg, color: colors.success },
    warning: { background: colors.warningBg, color: '#92400e' },
    danger: { background: colors.dangerBg, color: colors.danger },
    info: { background: colors.infoBg, color: colors.info },
    primary: { background: colors.bilanBg, color: colors.primary },
    seance: { background: colors.seanceBg, color: colors.seance },
    interm: { background: colors.intermBg, color: colors.interm },
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '0.18rem 0.55rem',
        borderRadius: radius.full,
        fontSize: typography.caption,
        fontWeight: typography.semibold,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        ...toneStyles[tone],
        ...style,
      }}
    >
      {icon}
      {children}
    </span>
  )
}

// ──────────────────────────────────────────────────────────────────
// Chip (filter pill)
// ──────────────────────────────────────────────────────────────────

interface ChipProps {
  label: string
  active?: boolean
  onClick: () => void
  count?: number
  icon?: ReactNode
}

export function Chip({ label, active, onClick, count, icon }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0.45rem 0.85rem',
        borderRadius: radius.full,
        border: active ? `1.5px solid ${colors.primary}` : `1.5px solid ${colors.borderSoft}`,
        background: active ? colors.primary : colors.surface,
        color: active ? 'white' : colors.text,
        fontSize: typography.label,
        fontWeight: active ? typography.bold : typography.medium,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: `all ${motion.fast}`,
        flexShrink: 0,
      }}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 && (
        <span
          style={{
            marginLeft: 2,
            background: active ? 'rgba(255,255,255,0.25)' : colors.bilanBg,
            color: active ? 'white' : colors.primary,
            padding: '0 6px',
            borderRadius: radius.full,
            fontSize: typography.caption,
            fontWeight: typography.bold,
            minWidth: 18,
            height: 18,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ──────────────────────────────────────────────────────────────────
// Accordion (collapsible section)
// ──────────────────────────────────────────────────────────────────

interface AccordionProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  badge?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
  accent?: string
}

export function Accordion({ icon, title, subtitle, badge, open, onToggle, children, accent }: AccordionProps) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.borderSoft}`,
        borderRadius: radius.xl,
        overflow: 'hidden',
        marginBottom: spacing.md,
        boxShadow: shadow.xs,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: '0.9rem 1rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.md,
              background: accent ? `${accent}15` : colors.surfaceMuted,
              color: accent ?? colors.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: typography.body, fontWeight: typography.bold, color: colors.text }}>{title}</div>
          {subtitle && (
            <div
              style={{
                fontSize: typography.meta,
                color: colors.textMuted,
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {badge}
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: colors.textMuted,
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: `transform ${motion.normal}`,
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            padding: '0 1rem 1rem',
            borderTop: `1px solid ${colors.borderSoft}`,
            paddingTop: spacing.md,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Stat (mini-metric)
// ──────────────────────────────────────────────────────────────────

interface StatProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger'
  trend?: 'up' | 'down' | 'flat'
  style?: CSSProperties
}

export function Stat({ label, value, icon, tone = 'default', trend, style }: StatProps) {
  const toneMap: Record<string, { bg: string; color: string }> = {
    default: { bg: colors.surfaceMuted, color: colors.text },
    success: { bg: colors.successSoft, color: colors.success },
    warning: { bg: colors.warningSoft, color: '#92400e' },
    danger: { bg: colors.dangerSoft, color: colors.danger },
  }
  const s = toneMap[tone]
  return (
    <div
      style={{
        background: s.bg,
        borderRadius: radius.lg,
        padding: '0.75rem 0.9rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flex: 1,
        minWidth: 0,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: colors.textMuted, fontSize: typography.caption, fontWeight: typography.semibold, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: typography.title, fontWeight: typography.extrabold, color: s.color, letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: 4 }}>
        {value}
        {trend && (
          <span style={{ fontSize: typography.body, color: trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.textMuted }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Divider
// ──────────────────────────────────────────────────────────────────

export function Divider({ label, style }: { label?: string; style?: CSSProperties }) {
  if (!label) return <div style={{ height: 1, background: colors.borderSoft, margin: `${spacing.md}px 0`, ...style }} />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, margin: `${spacing.lg}px 0`, ...style }}>
      <div style={{ flex: 1, height: 1, background: colors.borderSoft }} />
      <span style={{ fontSize: typography.caption, fontWeight: typography.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: colors.borderSoft }} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// SectionTitle
// ──────────────────────────────────────────────────────────────────

export function SectionTitle({ children, action, style }: { children: ReactNode; action?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md, ...style }}>
      <h3 style={{ margin: 0, fontSize: typography.label, fontWeight: typography.extrabold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {children}
      </h3>
      {action}
    </div>
  )
}
