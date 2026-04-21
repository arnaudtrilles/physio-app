import type { ReactNode } from 'react'
import { colors, spacing, radius, typography } from '../../design/tokens'
import { IconBack, IconMoreH } from '../../design/icons'

interface PatientHeaderProps {
  name: string
  initials: string
  avatarBg?: string
  birthday?: boolean
  subtitle?: ReactNode
  /** Extra info line: age, sex, weight, height */
  infoLine?: string
  /** Stats row */
  stats?: { label: string; value: string }[]
  onBack: () => void
  onMenu?: () => void
}

export function PatientHeader({ name, initials, birthday, subtitle, infoLine, stats, onBack, onMenu }: PatientHeaderProps) {
  return (
    <div style={{ marginBottom: spacing.md }}>
      {/* Top bar: back + title + menu */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.6rem 0',
          marginBottom: spacing.sm,
        }}
      >
        <button
          onClick={onBack}
          aria-label="Retour"
          style={{
            width: 38, height: 38, borderRadius: radius.md,
            background: '#FDFCFA', border: `1px solid ${colors.borderSoft}`,
            color: colors.text, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <IconBack size={18} strokeWidth={2.5} />
        </button>
        <span style={{ fontSize: typography.body, fontWeight: typography.semibold, color: colors.textMuted }}>
          Dossier
        </span>
        {onMenu ? (
          <button
            onClick={onMenu}
            aria-label="Options patient"
            style={{
              width: 38, height: 38, borderRadius: radius.md,
              background: '#FDFCFA', border: `1px solid ${colors.borderSoft}`,
              color: colors.textMuted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <IconMoreH size={18} />
          </button>
        ) : (
          <div style={{ width: 38 }} />
        )}
      </header>

      {/* Patient identity row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
        <span
          style={{
            width: 36, height: 36, borderRadius: radius.md,
            background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colors.primary, fontWeight: typography.semibold,
            fontSize: '0.68rem', letterSpacing: '0.03em', flexShrink: 0,
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          {initials}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '1.15rem', fontWeight: typography.extrabold,
              color: colors.text, letterSpacing: '-0.01em',
              display: 'flex', alignItems: 'center', gap: 5,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
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
          {infoLine && (
            <div style={{ fontSize: typography.label, color: colors.textMuted, marginTop: 1 }}>{infoLine}</div>
          )}
        </div>
      </div>

      {/* Stats row */}
      {stats && stats.length > 0 && (
        <div style={{
          display: 'flex', gap: 0,
          background: '#FDFCFA', borderRadius: 14,
          border: `1px solid ${colors.borderSoft}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{
              flex: 1, textAlign: 'center',
              padding: '0.65rem 0.4rem',
              borderLeft: i > 0 ? `1px solid ${colors.borderSoft}` : 'none',
            }}>
              <div style={{ fontSize: typography.caption, fontWeight: typography.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                {s.label}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: typography.extrabold, color: colors.text }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
