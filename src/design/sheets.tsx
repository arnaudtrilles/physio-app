import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { colors, spacing, radius, typography, shadow, motion } from './tokens'

// ──────────────────────────────────────────────────────────────────
// BottomSheet — mobile-first modal sliding from bottom
// ──────────────────────────────────────────────────────────────────

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  maxHeight?: string
  footer?: ReactNode
}

export function BottomSheet({ open, onClose, title, subtitle, children, maxHeight = '85vh', footer }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 2000,
        animation: `sheet-fade-in ${motion.fast}`,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.surface,
          borderRadius: `${radius['3xl']}px ${radius['3xl']}px 0 0`,
          width: '100%',
          maxWidth: 430,
          boxShadow: shadow.xl,
          maxHeight,
          display: 'flex',
          flexDirection: 'column',
          animation: `sheet-slide-up ${motion.normal}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '0.6rem 0 0.2rem',
          }}
        >
          <div style={{ width: 38, height: 4, borderRadius: radius.full, background: colors.borderSoft }} />
        </div>
        {(title || subtitle) && (
          <div style={{ padding: '0.4rem 1.2rem 0.75rem' }}>
            {title && <div style={{ fontSize: typography.heading, fontWeight: typography.extrabold, color: colors.text }}>{title}</div>}
            {subtitle && <div style={{ fontSize: typography.meta, color: colors.textMuted, marginTop: 2 }}>{subtitle}</div>}
          </div>
        )}
        <div style={{ overflowY: 'auto', padding: '0.5rem 1.2rem 1.2rem', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: '0.75rem 1.2rem 1rem', borderTop: `1px solid ${colors.borderSoft}` }}>{footer}</div>}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// ActionSheet — list of actions (iOS-style)
// ──────────────────────────────────────────────────────────────────

export interface ActionItem {
  label: string
  description?: string
  icon?: ReactNode
  tone?: 'default' | 'primary' | 'danger' | 'success'
  onClick: () => void
  disabled?: boolean
}

interface ActionSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  actions: ActionItem[]
}

export function ActionSheet({ open, onClose, title, subtitle, actions }: ActionSheetProps) {
  const toneColors: Record<string, { color: string; bg: string }> = {
    default: { color: colors.text, bg: colors.surfaceMuted },
    primary: { color: colors.primary, bg: colors.infoSoft },
    danger: { color: colors.danger, bg: colors.dangerSoft },
    success: { color: colors.success, bg: colors.successSoft },
  }
  return (
    <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {actions.map((a, i) => {
          const t = toneColors[a.tone || 'default']
          return (
            <button
              key={i}
              disabled={a.disabled}
              onClick={() => {
                if (a.disabled) return
                a.onClick()
                onClose()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: '0.9rem 1rem',
                background: t.bg,
                border: 'none',
                borderRadius: radius.lg,
                cursor: a.disabled ? 'not-allowed' : 'pointer',
                opacity: a.disabled ? 0.5 : 1,
                textAlign: 'left',
                transition: `transform ${motion.fast}`,
              }}
            >
              {a.icon && (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: radius.md,
                    background: 'white',
                    color: t.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: shadow.xs,
                  }}
                >
                  {a.icon}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: typography.body, fontWeight: typography.bold, color: t.color }}>{a.label}</div>
                {a.description && <div style={{ fontSize: typography.meta, color: colors.textMuted, marginTop: 1 }}>{a.description}</div>}
              </div>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}

// Styles for sheet animations (global keyframes via a small injected stylesheet)
const STYLE_ID = 'design-sheets-style'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    @keyframes sheet-fade-in { from { opacity: 0 } to { opacity: 1 } }
    @keyframes sheet-slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
  `
  document.head.appendChild(el)
}
