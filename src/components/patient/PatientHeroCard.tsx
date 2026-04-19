import { colors, spacing, radius, typography } from '../../design/tokens'
import { IconPlus } from '../../design/icons'
import { Button } from '../../design/primitives'

interface ZoneSeances {
  label: string
  count: number
}

interface PatientHeroCardProps {
  activeZones: ZoneSeances[]
  lastConsultation?: string | null
  lastConsultationZone?: string | null
  onAddConsultation: () => void
}

function formatDate(raw?: string | null): string {
  if (!raw) return ''
  if (raw.includes('/')) return raw
  if (raw.includes('-')) return raw.split('-').reverse().join('/')
  return raw
}

export function PatientHeroCard({
  activeZones,
  lastConsultation,
  lastConsultationZone,
  onAddConsultation,
}: PatientHeroCardProps) {
  const totalTraitements = activeZones.length

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)',
        borderRadius: radius['2xl'],
        padding: `${spacing.lg}px`,
        marginBottom: spacing.lg,
        color: colors.text,
        border: `1.5px solid ${colors.primary}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 2px rgba(15,23,42,0.04), 0 6px 16px -8px rgba(15,23,42,0.12), 0 2px 4px -2px rgba(15,23,42,0.06)',
      }}
    >
      {/* Traitements en cours */}
      <div style={{ marginBottom: spacing.md }}>
        <div style={{
          fontSize: typography.caption, fontWeight: typography.extrabold,
          color: colors.primary, textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: 4,
        }}>
          {totalTraitements > 1
            ? `${totalTraitements} traitements en cours`
            : totalTraitements === 1
              ? '1 traitement en cours'
              : 'Aucun traitement'}
        </div>

        {/* Séances par zone */}
        {activeZones.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
            {activeZones.map(z => (
              <div key={z.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: typography.label, color: colors.text,
              }}>
                <span style={{ fontWeight: typography.semibold }}>{z.label}</span>
                <span style={{
                  fontSize: typography.meta, fontWeight: typography.bold,
                  color: colors.primaryLight,
                }}>
                  {z.count} séance{z.count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dernière consultation */}
      {lastConsultation && (
        <div style={{
          fontSize: typography.meta, color: colors.textMuted,
          marginBottom: spacing.md,
        }}>
          Dernière consultation · <span style={{ fontWeight: typography.semibold, color: colors.text }}>{formatDate(lastConsultation)}</span>
          {lastConsultationZone && (
            <span style={{ color: colors.primaryLight, fontWeight: typography.semibold }}> · {lastConsultationZone}</span>
          )}
        </div>
      )}

      {/* CTA */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={onAddConsultation}
        icon={<IconPlus size={18} />}
      >
        Consultation du jour
      </Button>
    </div>
  )
}
