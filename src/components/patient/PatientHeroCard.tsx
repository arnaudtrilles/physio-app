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
        background: colors.surfaceMuted,
        borderRadius: radius['2xl'],
        padding: `${spacing.lg}px`,
        marginBottom: spacing.lg,
        color: colors.text,
        border: `1.5px solid ${colors.primary}`,
        boxShadow: shadow.primary,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Prescription + counters */}
      <div style={{ position: 'relative', display: 'flex', gap: spacing.md, marginBottom: spacing.md }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: typography.caption,
              fontWeight: typography.extrabold,
              color: colors.primary,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 4,
            }}
          >
            Prescription en cours
          </div>
          <div
            style={{
              fontSize: typography.display,
              fontWeight: typography.extrabold,
              color: colors.text,
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            {totalSeances}
            {totalPrescribed > 0 && (
              <span
                style={{
                  fontSize: typography.heading,
                  fontWeight: typography.semibold,
                  color: colors.textFaint,
                }}
              >
                {' '}
                / {totalPrescribed}
              </span>
            )}
          </div>
          <div style={{ fontSize: typography.meta, color: colors.textMuted, marginTop: 3 }}>
            {totalPrescribed > 0 ? 'séances effectuées' : `${totalSeances} séance${totalSeances > 1 ? 's' : ''}`}
            {prescripteur && ` · Dr ${prescripteur}`}
          </div>
        </div>

        {lastPain !== undefined && lastPain !== null && (
          <div
            style={{
              background: colors.infoSoft,
              border: `1px solid ${colors.infoBg}`,
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
            <div
              style={{
                fontSize: typography.caption,
                fontWeight: typography.extrabold,
                color: colors.primary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Douleur
            </div>
            <div
              style={{
                fontSize: typography.title,
                fontWeight: typography.extrabold,
                color: colors.text,
                letterSpacing: '-0.02em',
              }}
            >
              {lastPain}
              <span style={{ fontSize: typography.body, color: colors.textFaint }}>/10</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalPrescribed > 0 && (
        <div
          onClick={onOpenPrescription}
          style={{
            position: 'relative',
            height: 6,
            borderRadius: radius.full,
            background: colors.base,
            overflow: 'hidden',
            marginBottom: spacing.md,
            cursor: onOpenPrescription ? 'pointer' : 'default',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: prescriptionOverLimit
                ? colors.danger
                : nearEnd
                ? colors.warning
                : `linear-gradient(to right, ${colors.primaryLight}, ${colors.primary})`,
              borderRadius: radius.full,
              transition: 'width 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </div>
      )}

      {/* Alerts line */}
      {nearEnd && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: spacing.md,
            fontSize: typography.meta,
            fontWeight: typography.semibold,
            color: colors.warning,
          }}
        >
          <IconFile size={12} />
          Renouvellement à prévoir — il reste {remaining} séance{remaining > 1 ? 's' : ''}
        </div>
      )}

      {/* Last consultation + improvement */}
      {(lastConsultation || improvementPct !== null) && (
        <div
          style={{
            display: 'flex',
            gap: spacing.md,
            marginBottom: spacing.md,
            fontSize: typography.meta,
            color: colors.textMuted,
          }}
        >
          {lastConsultation && <span>Dernière consultation · {formatDate(lastConsultation)}</span>}
          {improvementPct !== null && improvementPct !== undefined && (
            <span
              style={{
                color: improvementPct > 0 ? colors.success : improvementPct < 0 ? colors.danger : colors.textMuted,
                fontWeight: typography.bold,
              }}
            >
              {improvementPct > 0 ? '↑' : improvementPct < 0 ? '↓' : '→'} {Math.abs(improvementPct)}%
            </span>
          )}
          {zonesCount > 0 && (
            <span>
              · {zonesCount} zone{zonesCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* CTA */}
      <Button
        variant="outline"
        size="lg"
        fullWidth
        onClick={onAddConsultation}
        icon={<IconPlus size={18} />}
        iconEnd={<IconSparkles size={14} color={colors.primary} />}
      >
        Consultation du jour
      </Button>
    </div>
  )
}
