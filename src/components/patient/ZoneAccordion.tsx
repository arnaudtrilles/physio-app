import type { ReactNode } from 'react'
import { colors, spacing, radius, typography, shadow, motion } from '../../design/tokens'
import { IconChevronDown, IconLock, IconMoreH } from '../../design/icons'

interface ZoneAccordionProps {
  label: string
  accent: string
  open: boolean
  closed?: boolean
  counts: { bilans: number; interms: number; seances: number }
  onToggle: () => void
  onMenu?: () => void
  children: ReactNode
}

export function ZoneAccordion({ label, accent, open, closed, counts, onToggle, onMenu, children }: ZoneAccordionProps) {
  return (
    <div
      style={{
        background: 'var(--info-soft)',
        border: `1px solid ${colors.borderSoft}`,
        borderLeft: `3px solid ${closed ? colors.textFaint : accent}`,
        borderRadius: radius.xl,
        overflow: 'hidden',
        marginBottom: spacing.md,
        boxShadow: shadow.xs,
        opacity: closed ? 0.75 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          padding: '0.95rem 1rem',
          cursor: 'pointer',
          background: open ? `${accent}05` : 'transparent',
          transition: `background ${motion.fast}`,
        }}
        onClick={onToggle}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: radius.md,
              background: closed ? colors.surfaceMuted : `${accent}15`,
              color: closed ? colors.textFaint : accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {closed ? (
              <IconLock size={16} strokeWidth={2.2} />
            ) : (
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 10v6m11-11h-6M7 12H1" />
              </svg>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: typography.bodyLg,
                fontWeight: typography.extrabold,
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                letterSpacing: '-0.01em',
              }}
            >
              {label}
              {closed && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: '0.15rem 0.5rem',
                    borderRadius: radius.full,
                    background: colors.successBg,
                    color: colors.success,
                    fontSize: typography.caption,
                    fontWeight: typography.bold,
                  }}
                >
                  PEC terminée
                </span>
              )}
            </div>
            <div style={{ fontSize: typography.meta, color: colors.textMuted, marginTop: 2, display: 'flex', gap: spacing.md }}>
              {counts.bilans > 0 && <span>{counts.bilans} bilan{counts.bilans > 1 ? 's' : ''}</span>}
              {counts.seances > 0 && <span>{counts.seances} séance{counts.seances > 1 ? 's' : ''}</span>}
              {counts.interms > 0 && <span>{counts.interms} interm.</span>}
              {counts.bilans === 0 && counts.seances === 0 && counts.interms === 0 && <span>Aucune activité</span>}
            </div>
          </div>
        </div>
        {onMenu && (
          <button
            onClick={e => {
              e.stopPropagation()
              onMenu()
            }}
            aria-label="Options zone"
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.md,
              background: 'transparent',
              color: colors.textMuted,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconMoreH size={16} />
          </button>
        )}
        <IconChevronDown size={18} color={colors.textMuted} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: `transform ${motion.normal}` }} />
      </div>
      {open && (
        <div
          style={{
            borderTop: `1px solid ${colors.borderSoft}`,
            padding: `${spacing.md}px ${spacing.lg}px ${spacing.lg}px`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
