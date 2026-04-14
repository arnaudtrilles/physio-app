import type { ReactNode } from 'react'
import { colors, spacing, radius, typography, shadow } from '../../design/tokens'
import { IconBack, IconMoreH } from '../../design/icons'

interface PatientHeaderProps {
  name: string
  initials: string
  avatarBg?: string
  birthday?: boolean
  subtitle?: ReactNode
  onBack: () => void
  onMenu: () => void
}

export function PatientHeader({ name, initials, avatarBg, birthday, subtitle, onBack, onMenu }: PatientHeaderProps) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: `linear-gradient(180deg, ${colors.surface} 0%, ${colors.surface} 78%, transparent 100%)`,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: '0.85rem 0 1rem',
        marginBottom: '0.5rem',
      }}
    >
      <button
        onClick={onBack}
        aria-label="Retour"
        style={{
          width: 38,
          height: 38,
          borderRadius: radius.md,
          background: colors.surfaceMuted,
          border: `1px solid ${colors.borderSoft}`,
          color: colors.text,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IconBack size={18} strokeWidth={2.5} />
      </button>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: radius.full,
          background: `linear-gradient(135deg, ${avatarBg || colors.primary}, ${avatarBg || colors.primary}cc)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: typography.bold,
          fontSize: typography.label,
          flexShrink: 0,
          boxShadow: shadow.sm,
        }}
      >
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: typography.heading,
            fontWeight: typography.extrabold,
            color: colors.text,
            letterSpacing: '-0.01em',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
          {birthday && (
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="14" width="18" height="8" rx="2" />
              <rect x="6" y="11" width="12" height="3" rx="1" />
              <line x1="8.5" y1="11" x2="8.5" y2="7" />
              <line x1="12" y1="11" x2="12" y2="7" />
              <line x1="15.5" y1="11" x2="15.5" y2="7" />
            </svg>
          )}
        </div>
        {subtitle && <div style={{ fontSize: typography.meta, color: colors.textMuted, marginTop: 1 }}>{subtitle}</div>}
      </div>
      <button
        onClick={onMenu}
        aria-label="Options patient"
        style={{
          width: 38,
          height: 38,
          borderRadius: radius.md,
          background: colors.surfaceMuted,
          border: `1px solid ${colors.borderSoft}`,
          color: colors.textMuted,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IconMoreH size={18} />
      </button>
    </header>
  )
}
