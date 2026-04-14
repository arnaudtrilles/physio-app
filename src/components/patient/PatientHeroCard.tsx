import { colors, spacing, radius, typography, shadow } from '../../design/tokens'
import { IconSparkles, IconPlus, IconFile } from '../../design/icons'
import { Button } from '../../design/primitives'

interface PatientHeroCardProps {
  totalSeances: number
  totalPrescribed: number
  prescripteur?: string
  prescriptionOverLimit?: boolean
  lastEVA?: number | null
  lastEVN?: number | null
  lastConsultation?: string | null
  improvementPct?: number | null
  onAddConsultation: () => void
  onOpenPrescription?: () => void
  zonesCount: number
}

function formatDate(raw?: string | null): string {
  if (!raw) return ''
  if (raw.includes('/')) return raw
  if (raw.includes('-')) return raw.split('-').reverse().join('/')
  return raw
}

export function PatientHeroCard({
  totalSeances,
  totalPrescribed,
  prescripteur,
  prescriptionOverLimit,
  lastEVA,
  lastEVN,
  lastConsultation,
  improvementPct,
  onAddConsultation,
  onOpenPrescription,
  zonesCount,
}: PatientHeroCardProps) {
  const pct = totalPrescribed > 0 ? Math.min(100, Math.round((totalSeances / totalPrescribed) * 100)) : 0
  const remaining = totalPrescribed - totalSeances
  const nearEnd = totalPrescribed > 0 && remaining <= 3 && remaining > 0 && totalSeances >= 6
  const lastPain = lastEVA ?? lastEVN

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
        borderRadius: radius['2xl'],
        padding: `${spacing.lg}px ${spacing.lg}px ${spacing.lg}px`,
        marginBottom: spacing.lg,
        color: 'white',
        boxShadow: shadow.lg,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative gradient blob */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.45) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Prescription + counters */}
      <div style={{ position: 'relative', display: 'flex', gap: spacing.md, marginBottom: spacing.md }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: typography.caption, fontWeight: typography.semibold, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Prescription en cours
          </div>
          <div style={{ fontSize: typography.display, fontWeight: typography.extrabold, color: 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>
            {totalSeances}
            {totalPrescribed > 0 && <span style={{ fontSize: typography.heading, fontWeight: typography.semibold, color: 'rgba(255,255,255,0.55)' }}> / {totalPrescribed}</span>}
          </div>
          <div style={{ fontSize: typography.meta, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>
            {totalPrescribed > 0 ? 'séances effectuées' : `${totalSeances} séance${totalSeances > 1 ? 's' : ''}`}
            {prescripteur && ` · Dr ${prescripteur}`}
          </div>
        </div>

        {lastPain !== undefined && lastPain !== null && (
          <div
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: radius.lg,
              padding: '0.55rem 0.75rem',
              minWidth: 62,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: typography.caption, fontWeight: typography.semibold, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Douleur</div>
            <div style={{ fontSize: typography.title, fontWeight: typography.extrabold, color: 'white', letterSpacing: '-0.02em' }}>{lastPain}<span style={{ fontSize: typography.body, color: 'rgba(255,255,255,0.55)' }}>/10</span></div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalPrescribed > 0 && (
        <div
          onClick={onOpenPrescription}
          style={{ position: 'relative', height: 6, borderRadius: radius.full, background: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginBottom: spacing.md, cursor: onOpenPrescription ? 'pointer' : 'default' }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: prescriptionOverLimit ? '#f87171' : nearEnd ? '#fbbf24' : 'linear-gradient(to right, #93c5fd, #ffffff)',
              borderRadius: radius.full,
              transition: 'width 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>
      )}

      {/* Alerts line */}
      {nearEnd && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: spacing.md, fontSize: typography.meta, fontWeight: typography.semibold, color: '#fbbf24' }}>
          <IconFile size={12} />
          Renouvellement à prévoir — il reste {remaining} séance{remaining > 1 ? 's' : ''}
        </div>
      )}

      {/* Last consultation + improvement */}
      {(lastConsultation || improvementPct !== null) && (
        <div style={{ display: 'flex', gap: spacing.md, marginBottom: spacing.md, fontSize: typography.meta, color: 'rgba(255,255,255,0.72)' }}>
          {lastConsultation && <span>Dernière consultation · {formatDate(lastConsultation)}</span>}
          {improvementPct !== null && improvementPct !== undefined && (
            <span style={{ color: improvementPct > 0 ? '#86efac' : improvementPct < 0 ? '#fca5a5' : 'rgba(255,255,255,0.72)', fontWeight: typography.bold }}>
              {improvementPct > 0 ? '↑' : improvementPct < 0 ? '↓' : '→'} {Math.abs(improvementPct)}%
            </span>
          )}
          {zonesCount > 0 && <span>· {zonesCount} zone{zonesCount > 1 ? 's' : ''}</span>}
        </div>
      )}

      {/* CTA */}
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        onClick={onAddConsultation}
        icon={<IconPlus size={18} />}
        iconEnd={<IconSparkles size={14} color={colors.primary} />}
        style={{
          background: 'white',
          color: colors.primary,
          border: 'none',
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        }}
      >
        Consultation du jour
      </Button>
    </div>
  )
}
