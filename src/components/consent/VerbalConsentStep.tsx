import { useMemo, useState } from 'react'

/**
 * Étape de consentement verbal — remplace l'ancienne signature PDF.
 *
 * Modèle aligné sur Heidi Health / Nabla / Abridge :
 * le praticien reste responsable de traitement (RGPD art. 4.7), Canode est
 * sous-traitant (art. 28). Le consentement patient est recueilli oralement
 * par le praticien à partir d'un script standardisé, puis confirmé via un
 * toggle dans l'app. Un marqueur horodaté est persisté en preuve.
 */

type Profession = 'Kinésithérapeute' | 'Physiothérapeute'

interface VerbalConsentStepProps {
  patient: {
    nom: string
    prenom: string
    dateNaissance: string
  }
  therapist?: {
    nom?: string
    prenom?: string
    profession?: Profession
  }
  onConfirm: (result: { consentedAt: string; scriptVersion: string }) => void
  onCancel: () => void
}

export const VERBAL_CONSENT_SCRIPT_VERSION = 'v1.0'

export function VerbalConsentStep({ patient, therapist, onConfirm, onCancel }: VerbalConsentStepProps) {
  const [informed, setInformed] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isPhysio = therapist?.profession === 'Physiothérapeute'
  const therapeute = isPhysio ? 'physiothérapeute' : 'kinésithérapeute'

  const dateNaissanceFr = useMemo(() => {
    if (!patient.dateNaissance) return ''
    try {
      return new Date(patient.dateNaissance).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    } catch {
      return patient.dateNaissance
    }
  }, [patient.dateNaissance])

  const canConfirm = informed && consentGiven && !submitting

  const handleConfirm = () => {
    if (!canConfirm) return
    setSubmitting(true)
    try {
      onConfirm({
        consentedAt: new Date().toISOString(),
        scriptVersion: VERBAL_CONSENT_SCRIPT_VERSION,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="identity-screen fade-in">
      <header className="screen-header">
        <button className="btn-back" onClick={onCancel} aria-label="Retour">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="title-section">Consentement patient</h2>
      </header>

      <div className="scroll-area" style={{ paddingBottom: '7rem' }}>
        {/* Carte identité patient */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
          borderRadius: 'var(--radius-xl)',
          padding: '1rem 1.2rem',
          color: 'white',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 14px rgba(30, 58, 138, 0.25)',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {patient.nom.toUpperCase()} {patient.prenom}
          </div>
          {dateNaissanceFr && (
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
              Né(e) le {dateNaissanceFr}
            </div>
          )}
        </div>

        {/* Encadré script à lire au patient */}
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          border: '1.5px solid #f59e0b',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.2rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
            </svg>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', letterSpacing: 0.3 }}>
              À DIRE AU PATIENT
            </div>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: '#451a03', margin: 0, fontStyle: 'italic' }}>
            « Pour gagner du temps administratif et me concentrer sur vous,
            j'utilise un assistant numérique qui transcrit notre échange et
            m'aide à rédiger votre dossier. La voix n'est pas conservée,
            seul le texte sert à votre suivi, et vous pouvez refuser à
            tout moment. <strong>Êtes-vous d'accord ?</strong> »
          </p>
        </div>

        {/* Section : ce que fait l'assistant */}
        <Section title="Ce que vous expliquez au patient si besoin">
          <Bullet>
            L'assistant <strong>transcrit ce qui est dit</strong> pour aider
            à rédiger le dossier — vous gagnez du temps administratif.
          </Bullet>
          <Bullet>
            La <strong>voix n'est jamais conservée</strong> : elle est
            transformée en texte et effacée immédiatement après.
          </Bullet>
          <Bullet>
            Les données sont traitées <strong>en France sur Microsoft Azure (HDS)</strong>
            {' '}et ne servent à <strong>aucune publicité ni revente</strong>.
          </Bullet>
          <Bullet>
            <strong>Seul vous</strong> avez accès au dossier. Le patient
            peut à tout moment <strong>consulter, rectifier, supprimer</strong>
            ses données ou <strong>retirer son accord</strong>.
          </Bullet>
        </Section>

        {/* Encadré refus */}
        <div style={{
          background: 'var(--secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.9rem 1.1rem',
          marginBottom: '1.5rem',
          fontSize: 13,
          lineHeight: 1.55,
          color: 'var(--text-muted)',
        }}>
          <strong style={{ color: 'var(--text)' }}>Si le patient refuse :</strong>
          {' '}revenez en arrière. Vous pourrez le suivre sans l'assistant numérique,
          ou en utilisant les fonctions hors-IA de l'app.
        </div>

        {/* Toggles de validation */}
        <div style={{
          background: 'white',
          border: '1.5px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.2rem',
          marginBottom: '1rem',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 12 }}>
            Confirmation du {therapeute}
          </div>

          <CheckRow
            checked={informed}
            onChange={setInformed}
            label="J'ai informé le patient du fonctionnement et de la finalité de l'assistant numérique."
          />

          <div style={{ height: 10 }} />

          <CheckRow
            checked={consentGiven}
            onChange={setConsentGiven}
            label={`J'ai recueilli son consentement libre, éclairé et oral à l'usage de l'assistant pour sa prise en charge.`}
          />
        </div>

        {/* Bouton continuer — bloqué tant que les 2 cases ne sont pas cochées */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          style={{
            marginTop: '0.5rem',
            width: '100%',
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            background: canConfirm ? 'var(--primary)' : '#d1d5db',
            color: 'white',
            border: 'none',
            fontSize: 16,
            fontWeight: 600,
            cursor: canConfirm ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background 0.15s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {submitting ? 'Enregistrement…' : 'Confirmer et commencer le bilan'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          style={{
            marginTop: '0.8rem',
            width: '100%',
            padding: '0.7rem',
            borderRadius: 'var(--radius-lg)',
            background: 'transparent',
            color: 'var(--text-muted)',
            border: 'none',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      cursor: 'pointer',
      userSelect: 'none',
    }}>
      <div
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: 6,
          border: `2px solid ${checked ? '#059669' : 'var(--border-color)'}`,
          background: checked ? '#059669' : 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
          transition: 'all 0.15s ease',
        }}
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ display: 'none' }}
      />
      <div style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: 'var(--text)' }}>
        {label}
      </div>
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.2rem' }}>
      <h3 style={{
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--primary-dark)',
        margin: '0 0 0.6rem',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
      }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{
        flexShrink: 0,
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: 'rgba(5, 150, 105, 0.12)',
        color: '#059669',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <div style={{ flex: 1, fontSize: 14, lineHeight: 1.55, color: 'var(--text)' }}>
        {children}
      </div>
    </div>
  )
}
