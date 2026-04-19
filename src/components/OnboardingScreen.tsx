import { useState, useRef, type FormEvent } from 'react'
import { colors, spacing, radius, typography, shadow, motion } from '../design/tokens'
import { Button } from '../design/primitives'
import type { ProfileData } from '../types'

interface OnboardingScreenProps {
  initialProfile: ProfileData
  onComplete: (profile: ProfileData) => void
}

const SPECIALITES = ['Thérapie manuelle', 'McKenzie (MDT)', 'Sport', 'Pédiatrie', 'Neurologie', 'Vestibulaire', 'Périnéologie', 'Respiratoire', 'Rhumatologie', 'Gériatrie', 'Orthopédie']
const TECHNIQUES = ['Dry needling', 'Mulligan', 'Maitland', 'Cupping', 'Taping / K-Tape', 'PNF (Kabat)', 'Chaînes musculaires (GDS/Busquet)', 'Éducation neurosciences douleur', 'Crochetage / IASTM', 'Drainage lymphatique', 'Trigger points', 'Ventouses', 'Stretching global actif']
const EQUIPEMENTS = ['Ondes de choc', 'TENS', 'Tecarthérapie (Winback/Indiba)', 'Ultrasons', 'Laser', 'Isocinétisme', 'Plateforme proprioceptive', 'Huber / LPG', 'Pressothérapie', 'Électrostimulation', 'Cryothérapie', 'Traction cervicale/lombaire', 'Vélo / Elliptique', 'Presse']

type Step = 1 | 2 | 3

export function OnboardingScreen({ initialProfile, onComplete }: OnboardingScreenProps) {
  const [step, setStepRaw] = useState<Step>(1)
  const cardRef = useRef<HTMLFormElement>(null)
  const stepChangedAt = useRef(0)
  const setStep = (s: Step) => {
    setStepRaw(s)
    stepChangedAt.current = Date.now()
    setTimeout(() => cardRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 0)
  }
  const [draft, setDraft] = useState<ProfileData>({
    ...initialProfile,
    profession: initialProfile.profession || 'Kinésithérapeute',
  })
  const photoRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setDraft(p => ({ ...p, photo: reader.result as string }))
    reader.readAsDataURL(f)
  }

  const toggleList = (field: 'specialites' | 'techniques' | 'equipements', item: string) => {
    setDraft(p => {
      const list = p[field] ?? []
      return { ...p, [field]: list.includes(item) ? list.filter(x => x !== item) : [...list, item] }
    })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onComplete(draft)
  }

  const canNext = step === 1 ? !!(draft.nom?.trim()) : true

  // ── Styles ──────────────────────────────────────────────────
  const containerStyle = {
    minHeight: '100dvh',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    background: `linear-gradient(135deg, ${colors.surfaceMuted} 0%, ${colors.base} 100%)`,
    padding: spacing.lg,
  }

  const cardStyle = {
    width: '100%',
    maxWidth: 520,
    background: colors.surface,
    borderRadius: radius['2xl'],
    boxShadow: shadow.lg,
    padding: spacing['3xl'],
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: spacing.xl,
    maxHeight: '90dvh',
    overflow: 'auto' as const,
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: typography.label,
    fontWeight: typography.semibold as number,
    color: colors.text,
    marginBottom: spacing.xs,
  }

  const inputStyle = {
    width: '100%',
    padding: `${spacing.md}px ${spacing.lg}px`,
    fontSize: typography.body,
    color: colors.text,
    background: colors.surfaceMuted,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: radius.lg,
    outline: 'none',
    transition: `border-color ${motion.fast}, box-shadow ${motion.fast}`,
    boxSizing: 'border-box' as const,
  }

  const chipStyle = (active: boolean) => ({
    padding: '0.45rem 0.75rem',
    borderRadius: radius.full,
    border: active ? `2px solid ${colors.primary}` : `1.5px solid ${colors.borderSoft}`,
    background: active ? '#eff6ff' : 'transparent',
    color: active ? colors.primary : colors.textMuted,
    fontWeight: active ? 600 : 400,
    fontSize: '0.78rem',
    cursor: 'pointer' as const,
  })

  const stepDotStyle = (s: number) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: s <= step ? colors.primary : colors.borderSoft,
    transition: `background ${motion.fast}`,
  })

  const sectionTitle = {
    fontWeight: typography.bold as number,
    color: colors.primary,
    fontSize: '0.95rem',
    marginBottom: 8,
  }

  // ── Steps ──────────────────────────────────────────────────

  return (
    <div style={containerStyle}>
      <form ref={cardRef} onSubmit={handleSubmit} style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: typography.hero, fontWeight: typography.extrabold as number, color: colors.primary, letterSpacing: '-0.03em' }}>
            Bienvenue
          </h1>
          <p style={{ margin: 0, marginTop: spacing.xs, fontSize: typography.body, color: colors.textMuted }}>
            {step === 1 && 'Commençons par votre profil'}
            {step === 2 && 'Vos compétences & équipements'}
            {step === 3 && 'Vos coordonnées professionnelles'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: spacing.md }}>
            <div style={stepDotStyle(1)} />
            <div style={stepDotStyle(2)} />
            <div style={stepDotStyle(3)} />
          </div>
        </div>

        {/* Step 1: Identity */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            {/* Photo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.sm }}>
              <div
                onClick={() => photoRef.current?.click()}
                style={{
                  width: 90, height: 90, borderRadius: '50%', overflow: 'hidden',
                  background: `linear-gradient(135deg, ${colors.primary}, #8b5cf6)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', position: 'relative',
                }}
              >
                {draft.photo
                  ? <img src={draft.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Photo" />
                  : <span style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>{(draft.nom || '?')[0]}</span>}
              </div>
              <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
              <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>Appuyez pour ajouter une photo</span>
            </div>

            {/* Nom */}
            <div>
              <label style={labelStyle}>Nom affiché *</label>
              <input
                type="text"
                value={draft.nom || ''}
                onChange={e => setDraft(p => ({ ...p, nom: e.target.value }))}
                placeholder="Ex : Dr. Dupont"
                style={inputStyle}
              />
            </div>

            {/* Prénom */}
            <div>
              <label style={labelStyle}>Prénom</label>
              <input
                type="text"
                value={draft.prenom || ''}
                onChange={e => setDraft(p => ({ ...p, prenom: e.target.value }))}
                placeholder="Ex : Marie"
                style={inputStyle}
              />
            </div>

            {/* Profession */}
            <div>
              <label style={labelStyle}>Profession *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Kinésithérapeute', 'Physiothérapeute'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDraft(p => ({ ...p, profession: opt }))}
                    style={{
                      flex: 1,
                      padding: '0.6rem 0.5rem',
                      borderRadius: radius.md,
                      border: draft.profession === opt ? `2px solid ${colors.primary}` : `1.5px solid ${colors.borderSoft}`,
                      background: draft.profession === opt ? '#eff6ff' : colors.surface,
                      color: draft.profession === opt ? colors.primary : colors.text,
                      fontWeight: draft.profession === opt ? 700 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {opt}
                    <div style={{ fontSize: '0.65rem', color: colors.textMuted, fontWeight: 400, marginTop: 2 }}>
                      {opt === 'Kinésithérapeute' ? 'France' : 'Suisse / Belgique'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Spécialisations libellé */}
            <div>
              <label style={labelStyle}>Spécialisations (affichées sur les courriers)</label>
              <input
                type="text"
                value={draft.specialisationsLibelle || ''}
                onChange={e => setDraft(p => ({ ...p, specialisationsLibelle: e.target.value }))}
                placeholder="Ex : Thérapie manuelle, Sport"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* Step 2: Skills & Equipment */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            <p style={{ fontSize: '0.75rem', color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>
              Les propositions de prise en charge seront adaptées en fonction de vos compétences et équipements.
            </p>

            <div>
              <div style={sectionTitle}>Spécialités</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SPECIALITES.map(s => (
                  <button key={s} type="button" style={chipStyle((draft.specialites ?? []).includes(s))}
                    onClick={() => toggleList('specialites', s)}>{s}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={sectionTitle}>Techniques maîtrisées</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TECHNIQUES.map(t => (
                  <button key={t} type="button" style={chipStyle((draft.techniques ?? []).includes(t))}
                    onClick={() => toggleList('techniques', t)}>{t}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={sectionTitle}>Équipements au cabinet</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {EQUIPEMENTS.map(eq => (
                  <button key={eq} type="button" style={chipStyle((draft.equipements ?? []).includes(eq))}
                    onClick={() => toggleList('equipements', eq)}>{eq}</button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Autres (non listés ci-dessus)</label>
              <textarea
                value={draft.autresCompetences ?? ''}
                onChange={e => setDraft(p => ({ ...p, autresCompetences: e.target.value }))}
                placeholder="Ex : méthode Schroth, posturologie, biofeedback..."
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' as const }}
              />
            </div>
          </div>
        )}

        {/* Step 3: Contact & Address */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <p style={{ fontSize: '0.75rem', color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>
              Ces informations apparaîtront en en-tête de vos courriers PDF.
            </p>

            <div>
              <label style={labelStyle}>Adresse</label>
              <input type="text" value={draft.adresse ?? ''} onChange={e => setDraft(p => ({ ...p, adresse: e.target.value }))}
                placeholder="Ex : 12 rue des Lilas" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Complément (bâtiment, étage)</label>
              <input type="text" value={draft.adresseComplement ?? ''} onChange={e => setDraft(p => ({ ...p, adresseComplement: e.target.value }))}
                placeholder="Ex : Cabinet 2B" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>CP</label>
                <input type="text" value={draft.codePostal ?? ''} onChange={e => setDraft(p => ({ ...p, codePostal: e.target.value }))}
                  placeholder="75001" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ville</label>
                <input type="text" value={draft.ville ?? ''} onChange={e => setDraft(p => ({ ...p, ville: e.target.value }))}
                  placeholder="Paris" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Téléphone</label>
              <input type="text" value={draft.telephone ?? ''} onChange={e => setDraft(p => ({ ...p, telephone: e.target.value }))}
                placeholder="01 23 45 67 89" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Email professionnel</label>
              <input type="email" value={draft.email ?? ''} onChange={e => setDraft(p => ({ ...p, email: e.target.value }))}
                placeholder="contact@cabinet.fr" style={inputStyle} />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: spacing.md }}>
          {step > 1 && (
            <Button type="button" variant="secondary" fullWidth onClick={() => setStep((step - 1) as Step)}>
              Retour
            </Button>
          )}
          {step < 3 ? (
            <Button type="button" variant="primary" size="lg" fullWidth disabled={!canNext}
              onClick={() => setStep((step + 1) as Step)}>
              Suivant
            </Button>
          ) : (
            <Button type="submit" variant="primary" size="lg" fullWidth>
              Commencer
            </Button>
          )}
        </div>

        {step === 2 && (
          <button type="button" onClick={() => setStep(3)}
            style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}>
            Passer cette étape
          </button>
        )}
        {step === 3 && (
          <button type="button" onClick={() => {
              // Guard against ghost clicks from the step 2 "Passer" button at the same position
              if (Date.now() - stepChangedAt.current < 400) return
              onComplete(draft)
            }}
            style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}>
            Remplir plus tard
          </button>
        )}
      </form>
    </div>
  )
}
