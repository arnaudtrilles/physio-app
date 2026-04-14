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
  onPickSeance: (bilanType: string) => void
  onPickIntermediaire: (bilanType: string) => void
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
  return (
    <BottomSheet open={open} onClose={onClose} title="Consultation du jour" subtitle="Que souhaitez-vous faire ?">
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {/* Section: Nouvelle séance (une par zone active) */}
        {zones.length > 0 && (
          <div>
            <SectionLabel>Séance de suivi</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {zones.map(z => (
                <ChoiceRow
                  key={`seance-${z.bilanType}`}
                  icon={<IconActivity size={18} />}
                  accent={colors.seance}
                  title={`+ Séance ${z.label}`}
                  description="Noter le suivi d'une séance"
                  onClick={() => {
                    onPickSeance(z.bilanType)
                    onClose()
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section: Bilan intermédiaire */}
        {zones.filter(z => z.hasBilans).length > 0 && (
          <div>
            <SectionLabel>Bilan intermédiaire</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {zones.filter(z => z.hasBilans).map(z => (
                <ChoiceRow
                  key={`interm-${z.bilanType}`}
                  icon={<IconFileText size={18} />}
                  accent={colors.interm}
                  title={`Bilan interm. ${z.label}`}
                  description="Ré-évaluation à mi-parcours"
                  onClick={() => {
                    onPickIntermediaire(z.bilanType)
                    onClose()
                  }}
                />
              ))}
            </div>
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
                description="Récapitulatif final"
                onClick={() => {
                  onPickBilanSortie()
                  onClose()
                }}
              />
              <ChoiceRow
                icon={<IconMail size={18} />}
                accent={colors.info}
                title="Courrier médecin"
                description="Compte-rendu pour le prescripteur"
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
        background: colors.surfaceMuted,
        border: `1px solid ${colors.borderSoft}`,
        borderRadius: radius.lg,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          background: 'white',
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
