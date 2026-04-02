import { useState } from 'react'
import type { FicheExercice, AnalyseIA } from '../types'
import { buildFicheExercicePrompt } from '../utils/clinicalPrompt'
import type { BilanContext } from '../utils/clinicalPrompt'
import { callGemini } from '../utils/geminiClient'

interface FicheExerciceIAProps {
  apiKey: string
  context: BilanContext
  analyseIA?: AnalyseIA | null
  cached?: FicheExercice | null
  onResult: (fiche: FicheExercice) => void
  onBack: () => void
  onClose?: () => void
  onGoToProfile: () => void
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return <>{parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}</>
}

function MarkdownFiche({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  return (
    <div>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) {
          return (
            <div key={i} style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary-dark)', marginTop: 20, marginBottom: 10 }}>
              {renderBold(line.slice(4))}
            </div>
          )
        }
        if (line.startsWith('#### ')) {
          return (
            <div key={i} style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e3a8a', marginTop: 18, marginBottom: 8, padding: '7px 12px', background: '#eff6ff', borderRadius: 8, borderLeft: '3px solid #2563eb' }}>
              {renderBold(line.slice(5))}
            </div>
          )
        }
        if (line === '---') {
          return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '14px 0' }} />
        }
        if (line.startsWith('- **') || line.startsWith('- ** ')) {
          return (
            <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '5px 0', lineHeight: 1.6, paddingLeft: 4 }}>
              {renderBold(line.slice(2))}
            </div>
          )
        }
        if (line.startsWith('- ')) {
          return (
            <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '4px 0', lineHeight: 1.5, display: 'flex', gap: 7, paddingLeft: 4 }}>
              <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>•</span>
              <span>{renderBold(line.slice(2))}</span>
            </div>
          )
        }
        if (/^\s*>\s/.test(line)) {
          return (
            <div key={i} style={{ fontSize: '0.82rem', color: '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', margin: '3px 0 3px 12px', lineHeight: 1.55 }}>
              {renderBold(line.replace(/^\s*>\s*/, ''))}
            </div>
          )
        }
        if (/^\s*\d+\.\s/.test(line)) {
          return (
            <div key={i} style={{ fontSize: '0.83rem', color: '#374151', padding: '2px 0 2px 4px', lineHeight: 1.55 }}>
              {renderBold(line.trim())}
            </div>
          )
        }
        if (line.trim() === '') {
          return <div key={i} style={{ height: 6 }} />
        }
        return (
          <p key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '5px 0', lineHeight: 1.55 }}>
            {renderBold(line)}
          </p>
        )
      })}
    </div>
  )
}

export function FicheExerciceIA({ apiKey, context, analyseIA, cached, onResult, onBack, onClose, onGoToProfile }: FicheExerciceIAProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fiche, setFiche] = useState<FicheExercice | null>(cached ?? null)
  const [notesSeance, setNotesSeance] = useState(cached?.notesSeance ?? '')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    if (!apiKey) return
    setLoading(true)
    setError(null)
    try {
      const systemPrompt = `Tu es un physiothérapeute expert en biomécanique et en pédagogie patient. Ton rôle est de traduire un plan de traitement technique en une fiche d'exercices à domicile (Fiche d'exercice) simple, claire et sécurisée pour le praticien et le patient.

Tu vas recevoir en entrée l'état actuel du patient ainsi que la demande du thérapeute dans la balise <notes_seance_actuelle>.

<regles_strictes>
1. Rédige IMPÉRATIVEMENT en français courant, empathique et vulgarisé. Bannis tout jargon médical complexe (ne dis pas "décubitus dorsal", dis "couché sur le dos").
2. Limite-toi à un MAXIMUM STRICT de 4 exercices pour garantir l'observance du patient.
3. La sécurité est absolue : chaque exercice doit avoir une limite de douleur claire.
4. Adresse-toi directement au patient (utilise le "vous").
</regles_strictes>

Voici la structure EXACTE que ta réponse doit suivre en format Markdown. Commence par un très court mot d'encouragement personnalisé basé sur les notes de la séance, puis liste les exercices :

### Le Programme d'Exercices
[Petit mot d'encouragement de 2 phrases, ex: "Bravo pour vos progrès sur la mobilité aujourd'hui ! Voici vos exercices pour consolider ce travail à la maison."]

---

#### 1. [Nom de l'exercice simple et motivant]
- ** L'objectif :** [Pourquoi on fait ça, en 1 phrase simple].
- ** Position de départ :** [Comment bien s'installer].
- ** Le mouvement pas-à-pas :**
  > 1. [Étape 1]
  > 2. [Étape 2]
- ** Votre Dosage :** [Séries] x [Répétitions] avec [Temps de repos] de pause. À faire [Fréquence, ex: 1x/jour].
- ** Consigne de sécurité :** [Ex: Arrêtez si la douleur dépasse 3/10 ou si vous ressentez des fourmillements].

[Répéter pour l'exercice 2, 3 et 4 maximum en circuit ou en séries distinctes]`

      const markdown = await callGemini(
        apiKey,
        systemPrompt,
        buildFicheExercicePrompt(context, notesSeance, analyseIA),
        8192,
        false,
        'gemini-2.5-pro'
      )
      if (!markdown.trim()) throw new Error('Réponse vide reçue')

      const result: FicheExercice = {
        generatedAt: new Date().toISOString(),
        markdown,
        notesSeance,
      }
      setFiche(result)
      onResult(result)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      if (msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) setError('quota')
      else if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403') || msg.includes('API key')) setError('auth')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!fiche) return
    try {
      await navigator.clipboard.writeText(fiche.markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className="general-info-screen slide-in-left">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="title-section" style={{ marginBottom: 0 }}>Fiche d'exercices</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{context.zone} · {context.patient.prenom} {context.patient.nom}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#16a34a' }}>Fiche</div>
          {onClose && (
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="scroll-area" style={{ paddingBottom: '5.5rem' }}>

        {/* Hero */}
        <div className="ai-hero" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
          <div className="ai-hero-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div className="ai-hero-text">
            <h4>Fiche d'exercices personnalisée</h4>
            <p>Programme à domicile adapté au patient, en langage simple. Maximum 4 exercices pour une observance optimale.</p>
          </div>
        </div>

        {/* No API key */}
        {!apiKey && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 20, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem', marginBottom: 8 }}>Clé API Gemini requise</div>
            <p style={{ fontSize: '0.85rem', color: '#78350f', margin: '0 0 14px', lineHeight: 1.5 }}>
              Configurez votre clé API Gemini dans votre profil pour générer la fiche d'exercices.
            </p>
            <button onClick={onGoToProfile} style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}>
              Configurer dans le Profil
            </button>
          </div>
        )}

        {/* Errors */}
        {error === 'quota' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Quota dépassé</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>Vérifiez votre compte Google AI Studio.</p>
          </div>
        )}
        {error === 'auth' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Clé API Gemini invalide</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: '0 0 10px' }}>Clé Gemini absente ou incorrecte (AIza...).</p>
            <button onClick={onGoToProfile} style={{ fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Configurer ma clé Gemini</button>
          </div>
        )}
        {error && error !== 'quota' && error !== 'auth' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Erreur</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>{error}</p>
            <button onClick={generate} style={{ marginTop: 8, fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Réessayer</button>
          </div>
        )}

        {/* Notes du thérapeute (saisie) */}
        {!fiche && apiKey && (
          <div className="ai-section-card">
            <div className="ai-section-header">
              <div className="ai-section-icon" style={{ background: '#f0fdf4' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <h4 style={{ color: '#166534' }}>Notes de séance</h4>
            </div>
            <div className="ai-section-body">
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Décrivez ce que vous avez travaillé ou ce que vous souhaitez prescrire. Laissez vide pour un programme automatique basé sur le diagnostic.
              </p>
              <textarea
                value={notesSeance}
                onChange={e => setNotesSeance(e.target.value)}
                rows={5}
                placeholder="Ex : Travail mobilisation active épaule, patient a bien toléré les exercices pendulaires. Prescrire renforcement coiffe des rotateurs léger + étirements capsulaires. Patient sportif — football 3x/semaine…"
                style={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.85rem', color: 'var(--text-main)', background: 'var(--secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
              />
            </div>
          </div>
        )}

        {/* Résultat */}
        {fiche && (
          <div className="fade-in-up">
            <div className="ai-section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Générée le {new Date(fiche.generatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <button
                  onClick={handleCopy}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--border-color)', background: copied ? '#f0fdf4' : 'white', color: copied ? '#16a34a' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {copied ? (
                    <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copié</>
                  ) : (
                    <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copier</>
                  )}
                </button>
              </div>
              <MarkdownFiche markdown={fiche.markdown} />
            </div>
            <div className="ai-footer">
              <div className="ai-dot" />
              <p>Ces exercices sont personnalisés selon les données du bilan. Arrêtez en cas de douleur intense ou de symptôme inhabituel et contactez votre thérapeute.</p>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!fiche && !loading && apiKey && (
            <button className="btn-primary-luxe" style={{ marginBottom: 0, background: 'linear-gradient(135deg, #059669, #047857)' }} onClick={generate}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Générer la fiche d'exercices
              </div>
            </button>
          )}
          {loading && (
            <button className="btn-primary-luxe" disabled style={{ marginBottom: 0, opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg, #059669, #047857)' }}>
              <div className="spinner" />
              Génération en cours…
            </button>
          )}
          {fiche && !loading && (
            <button
              onClick={() => { setFiche(null); setNotesSeance(fiche.notesSeance) }}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
              Modifier les notes et regénérer
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
