import { BottomSheet } from '../../design/sheets'
import { colors, spacing, radius, typography, shadow } from '../../design/tokens'
import { IconActivity, IconFileText, IconPlus, IconChevronRight, IconMail, IconFlag } from '../../design/icons'

interface Zone {
  bilanType: string
  label: string
  accent: string
  hasBilans: boolean
}

interface ConsultationChooserProps {
  open: boolean
  onClose: () => void
  zones: Zone[]
  hasAnyBilan: boolean
  onPickSeance: () => void
  onPickIntermediaire: () => void
  onPickNouveauBilan: () => void
  onPickBilanSortie: () => void
  onPickCourrier: () => void
}

export function ConsultationChooser({
  open,
  onClose,
  zones,
  hasAnyBilan,
  onPickSeance,
  onPickIntermediaire,
  onPickNouveauBilan,
  onPickBilanSortie,
  onPickCourrier,
}: ConsultationChooserProps) {
  const zonesWithBilans = zones.filter(z => z.hasBilans)
  const multiZonesHint = (count: number, fallback: string) =>
    count > 1 ? `${count} PEC actives — choisir la zone` : fallback

  return (
    <BottomSheet open={open} onClose={onClose} title="Consultation du jour" subtitle="Que souhaitez-vous faire ?">
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {/* Section: Séance de suivi */}
        {zones.length > 0 && (
          <div>
            <SectionLabel>Séance de suivi</SectionLabel>
            <ChoiceRow
              icon={<IconActivity size={18} />}
              accent={colors.seance}
              title="Nouvelle séance"
              description={multiZonesHint(zones.length, "Noter le suivi d'une séance")}
              onClick={() => {
                onPickSeance()
                onClose()
              }}
            />
          </div>
        )}

        {/* Section: Bilan intermédiaire */}
        {zonesWithBilans.length > 0 && (
          <div>
            <SectionLabel>Bilan intermédiaire</SectionLabel>
            <ChoiceRow
              icon={<IconFileText size={18} />}
              accent={colors.interm}
              title="Bilan intermédiaire"
              description={multiZonesHint(zonesWithBilans.length, 'Ré-évaluation à mi-parcours')}
              onClick={() => {
                onPickIntermediaire()
                onClose()
              }}
            />
          </div>
        )}

        {/* Section: Nouveau bilan */}
        <div>
          <SectionLabel>Nouveau bilan</SectionLabel>
          <ChoiceRow
            icon={<IconPlus size={18} />}
            accent={colors.primary}
            title="Nouveau bilan initial"
            description="Nouvelle zone ou nouvelle pathologie"
            onClick={() => {
              onPickNouveauBilan()
              onClose()
            }}
          />
        </div>

        {/* Section: Fin de prise en charge */}
        {hasAnyBilan && (
          <div>
            <SectionLabel>Fin de prise en charge</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <ChoiceRow
                icon={<IconFlag size={18} />}
                accent={colors.success}
                title="Bilan de sortie"
                description={multiZonesHint(zonesWithBilans.length, 'Récapitulatif final')}
                onClick={() => {
                  onPickBilanSortie()
                  onClose()
                }}
              />
              <ChoiceRow
                icon={<IconMail size={18} />}
                accent={colors.info}
                title="Courrier médecin"
                description={multiZonesHint(zonesWithBilans.length, 'Compte-rendu pour le prescripteur')}
                onClick={() => {
                  onPickCourrier()
                  onClose()
                }}
              />
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: typography.caption,
        fontWeight: typography.extrabold,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: spacing.sm,
      }}
    >
      {children}
    </div>
  )
}

interface ChoiceRowProps {
  icon: React.ReactNode
  accent: string
  title: string
  description?: string
  onClick: () => void
}

function ChoiceRow({ icon, accent, title, description, onClick }: ChoiceRowProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.md,
        padding: '0.9rem 1rem',
        background: 'white',
        border: `1px solid ${colors.borderSoft}`,
        borderRadius: radius.xl,
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: shadow.xs,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          background: '#ffffff',
          color: accent,
          boxShadow: shadow.xs,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: typography.body, fontWeight: typography.bold, color: colors.text, letterSpacing: '-0.01em' }}>{title}</div>
        {description && <div style={{ fontSize: typography.meta, color: colors.textMuted, marginTop: 1 }}>{description}</div>}
      </div>
      <IconChevronRight size={16} color={colors.textFaint} />
    </button>
  )
}
