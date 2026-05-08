import { useMemo, useState } from 'react'
import { generateConsentPdf } from '../../utils/consentPdf'
import { SignaturePad } from './SignaturePad'

interface ConsentFormProps {
  patient: {
    nom: string
    prenom: string
    dateNaissance: string
  }
  therapist?: {
    nom?: string
    prenom?: string
    cabinet?: string
    email?: string
  }
  /**
   * Appelé après signature & génération du PDF. Le parent persiste le blob
   * dans IndexedDB (onglet Documents du dossier patient) puis enchaîne sur
   * le bilan.
   */
  onSigned: (result: { blob: Blob; fileName: string; signedAt: string }) => void
  onCancel: () => void
}

/**
 * Formulaire de consentement patient — affiché après IdentityStep, avant le bilan.
 * Pas de jargon RGPD agressif. Préview lisible + bouton "Signer ici" qui ouvre
 * un canvas tactile (signature au doigt). Une fois signé, le PDF est généré et
 * persisté dans le dossier patient (preuve légale : RGPD Art.9 + nLPD CH).
 */
export function ConsentForm({ patient, therapist, onSigned, onCancel }: ConsentFormProps) {
  const [showPad, setShowPad] = useState(false)
  const [generating, setGenerating] = useState(false)

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

  const handleConfirmSignature = async (signatureDataUrl: string) => {
    setShowPad(false)
    setGenerating(true)
    try {
      const result = generateConsentPdf({
        patient,
        therapist,
        signatureDataUrl,
      })
      onSigned(result)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="identity-screen fade-in">
      <header className="screen-header">
        <button className="btn-back" onClick={onCancel} aria-label="Retour">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="title-section">Information & autorisation</h2>
      </header>

      <div className="scroll-area" style={{ paddingBottom: '6rem' }}>
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

        {/* Intro */}
        <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text)', margin: '0 0 1.5rem' }}>
          Bonjour <strong>{patient.prenom}</strong>,
          <br /><br />
          Pour préparer et suivre votre prise en charge, votre kinésithérapeute peut utiliser
          un assistant numérique. Voici ce qu'il fait — et ce que vous devez savoir.
        </p>

        {/* Section : Ce que fait l'assistant */}
        <Section title="Ce que fait l'assistant">
          <Bullet>
            Il <strong>transcrit ce qui est dit pendant la séance</strong> pour aider votre
            kinésithérapeute à rédiger votre dossier plus rapidement.
          </Bullet>
          <Bullet>
            Il aide à organiser les informations cliniques (douleur, mobilité, exercices)
            pour proposer un plan de soin adapté.
          </Bullet>
        </Section>

        {/* Section : Ce que vous devez savoir */}
        <Section title="Ce que vous devez savoir">
          <Bullet>
            Vos <strong>enregistrements vocaux ne sont jamais conservés</strong>. Ils sont
            transformés en texte sur le moment, puis effacés immédiatement.
          </Bullet>
          <Bullet>
            <strong>Aucune image ni vidéo n'est enregistrée.</strong> Seule la voix sert
            ponctuellement à la transcription.
          </Bullet>
          <Bullet>
            Vos données sont traitées en France, sur des serveurs <strong>Microsoft Azure
            agréés Hébergeur de Données de Santé (HDS)</strong>.
          </Bullet>
          <Bullet>
            <strong>Seul votre kinésithérapeute</strong> a accès à votre dossier. Aucune
            donnée n'est utilisée à des fins commerciales ou publicitaires.
          </Bullet>
        </Section>

        {/* Section : Vos droits */}
        <Section title="Vos droits">
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', margin: 0 }}>
            À tout moment, vous pouvez demander à <strong>consulter, modifier ou supprimer</strong> vos
            données. Vous pouvez aussi <strong>retirer cet accord</strong>. Il vous suffit
            d'en parler à votre kinésithérapeute. Conformément au <strong>RGPD</strong> (UE)
            et à la <strong>nLPD</strong> (Suisse), votre consentement est libre et révocable.
          </p>
        </Section>

        {/* Encadré "En signant" */}
        <div style={{
          background: 'var(--secondary)',
          border: '1.5px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.2rem',
          marginTop: '1.5rem',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary-dark)', marginBottom: 6 }}>
            En signant ci-dessous :
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', margin: 0 }}>
            J'autorise mon kinésithérapeute à utiliser cet assistant numérique pour ma
            prise en charge, dans les conditions décrites ci-dessus.
          </p>
        </div>

        {/* Zone signature ou bouton ouvrir pad */}
        {showPad ? (
          <div style={{ marginTop: '1.5rem' }}>
            <SignaturePad
              onConfirm={handleConfirmSignature}
              onCancel={() => setShowPad(false)}
              height={220}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPad(true)}
            disabled={generating}
            style={{
              marginTop: '1.5rem',
              width: '100%',
              padding: '1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              fontSize: 16,
              fontWeight: 600,
              cursor: generating ? 'wait' : 'pointer',
              opacity: generating ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {generating ? 'Génération du document…' : 'Signer ici'}
          </button>
        )}

        {/* Lien discret pour annuler */}
        {!showPad && !generating && (
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
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.2rem' }}>
      <h3 style={{
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--primary-dark)',
        margin: '0 0 0.6rem',
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
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div style={{ flex: 1, fontSize: 14, lineHeight: 1.55, color: 'var(--text)' }}>
        {children}
      </div>
    </div>
  )
}
