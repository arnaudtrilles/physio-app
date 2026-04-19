import { useState } from 'react'
import type { FicheExercice, AnalyseIA } from '../types'
import { buildFicheExercicePrompt } from '../utils/clinicalPrompt'
import type { BilanContext } from '../utils/clinicalPrompt'
import { callGemini } from '../utils/geminiClient'
import { loadBanque, addToBanque, extractExercicesFromFiche } from '../utils/banqueExercices'

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
        if (/^\s*#{1,2}\s*$/.test(line)) return null
        if (line.startsWith('### ')) {
          return (
            <div key={i} style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary-dark)', marginTop: 20, marginBottom: 10 }}>
              {renderBold(line.slice(4))}
            </div>
          )
        }
        if (line.startsWith('#### ')) {
          return (
            <div key={i} style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)', marginTop: 18, marginBottom: 8, padding: '7px 12px', background: 'var(--color-info-bg)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
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
            <div key={i} style={{ fontSize: '0.82rem', color: 'var(--color-gray)', background: 'var(--color-gray-bg)', border: '1px solid var(--color-gray-border)', borderRadius: 6, padding: '4px 10px', margin: '3px 0 3px 12px', lineHeight: 1.55 }}>
              {renderBold(line.replace(/^\s*>\s*/, ''))}
            </div>
          )
        }
        if (/^\s*\d+\.\s/.test(line)) {
          return (
            <div key={i} style={{ fontSize: '0.83rem', color: 'var(--color-gray)', padding: '2px 0 2px 4px', lineHeight: 1.55 }}>
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
  const [shared, setShared] = useState(false)
  const generate = async () => {
    if (!apiKey) return
    setLoading(true)
    setError(null)
    try {
      const systemPrompt = `Tu es un physiothérapeute expert en biomécanique et en rééducation fonctionnelle. Ton rôle est de traduire un plan de traitement technique en une fiche d'exercices à domicile claire, professionnelle et sécurisée.

Tu vas recevoir en entrée l'état actuel du patient ainsi que la demande du thérapeute dans la balise <notes_seance_actuelle>.

<regles_strictes>
1. Rédige en français courant mais professionnel. Pas de jargon inaccessible (dis "couché sur le dos" plutôt que "décubitus dorsal"), mais utilise les vrais noms des exercices de kinésithérapie (ex: "Rotation externe en décubitus latéral", "Flexion isométrique contre résistance", "Proprioception unipode sur plan instable", "Étirement capsulaire postérieur en cross-body").
2. Limite-toi à un MAXIMUM STRICT de 4 exercices pour garantir l'observance.
3. La sécurité est absolue : chaque exercice doit avoir une limite de douleur claire.
4. Adresse-toi directement au patient (utilise le "vous").
5. NE COMMENCE PAS par un mot d'encouragement, de félicitations ou de "bravo". Va directement aux exercices.
</regles_strictes>

Voici la structure EXACTE que ta réponse doit suivre en format Markdown :

### Programme d'exercices à domicile

---

#### 1. [Nom professionnel de l'exercice]
- **Objectif :** [Pourquoi on fait ça, en 1 phrase].
- **Position de départ :** [Comment bien s'installer].
- **Mouvement :**
  > 1. [Étape 1]
  > 2. [Étape 2]
- **Dosage :** [Séries] x [Répétitions] — Repos [Temps]. Fréquence : [ex: 1x/jour].
- **Limite de sécurité :** [Ex: Arrêtez si la douleur dépasse 3/10 ou si vous ressentez des fourmillements].

[Répéter pour l'exercice 2, 3 et 4 maximum]`

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

      // Auto-add exercices individuels à la banque commune
      const zone = context.zone ?? 'Général'
      const extracted = extractExercicesFromFiche(markdown, zone, 'ia')
      let banque = loadBanque()
      for (const ex of extracted) {
        const res = addToBanque(ex, banque)
        banque = res.banque
      }
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

  const handleExportPDF = () => {
    if (!fiche) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    // Convert markdown to simple HTML for print
    const html = fiche.markdown
      .replace(/^\s*#{1,2}\s*$/gm, '')
      .replace(/### (.+)/g, '<h2 style="font-size:16px;color:var(--primary);margin:18px 0 8px;font-weight:800">$1</h2>')
      .replace(/#### (.+)/g, '<h3 style="font-size:14px;color:var(--primary);margin:16px 0 6px;padding:6px 10px;background:var(--color-info-bg);border-left:3px solid var(--accent);border-radius:4px;font-weight:700">$1</h3>')
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--color-gray-border);margin:12px 0">')
      .replace(/- \*\*(.+?)\*\*/g, '<p style="margin:4px 0;font-size:13px"><strong>$1</strong></p>')
      .replace(/^- (.+)$/gm, '<p style="margin:3px 0 3px 8px;font-size:13px">• $1</p>')
      .replace(/^\s*>\s*(.+)$/gm, '<p style="margin:2px 0 2px 16px;font-size:12px;color:var(--color-gray);background:var(--color-gray-bg);padding:3px 8px;border:1px solid var(--color-gray-border);border-radius:4px">$1</p>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br>')
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fiche d'exercices — ${context.patient.prenom} ${context.patient.nom}</title>
      <style>@page{margin:20mm 15mm}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;color:var(--color-gray-dark);line-height:1.6;max-width:700px;margin:0 auto;padding:20px}
      .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--color-emerald);padding-bottom:10px;margin-bottom:16px}
      .patient{font-size:11px;color:var(--color-gray-mid)}</style></head><body>
      <div class="header"><div><strong style="font-size:16px;color:var(--color-emerald)">Fiche d'exercices à domicile</strong><div class="patient">${context.patient.prenom} ${context.patient.nom} · ${context.zone}</div></div>
      <div style="font-size:11px;color:var(--color-gray-mid)">${new Date(fiche.generatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div></div>
      ${html}
      <div style="margin-top:24px;padding-top:12px;border-top:1px solid var(--color-gray-border);font-size:11px;color:#9ca3af">Ces exercices sont personnalisés. Arrêtez en cas de douleur intense et contactez votre thérapeute.</div>
      <script>window.onload=function(){window.print()}</script></body></html>`)
    printWindow.document.close()
  }

  const handleShare = async () => {
    if (!fiche) return
    // Build clean text for sharing
    const cleanText = fiche.markdown
      .replace(/#{1,4}\s*/g, '')
      .replace(/\*\*/g, '')
      .replace(/^\s*>\s*/gm, '  ')
      .trim()

    const shareText = `Programme d'exercices à domicile\n${context.zone} — ${new Date(fiche.generatedAt).toLocaleDateString('fr-FR')}\n\n${cleanText}\n\nAttention : Arrêtez en cas de douleur intense et contactez votre thérapeute.`

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: `Exercices — ${context.zone}`, text: shareText })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
        return
      } catch { /* user cancelled or not supported */ }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className="general-info-screen slide-in-left">
      <header className="screen-header">
        <button className="btn-back" aria-label="Retour" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="title-section" style={{ marginBottom: 0 }}>Fiche d'exercices</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{context.zone} · {context.patient.prenom} {context.patient.nom}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border2)', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: 'var(--color-success)' }}>Fiche</div>
          {onClose && (
            <button onClick={onClose} aria-label="Fermer" style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="scroll-area" style={{ paddingBottom: '5.5rem' }}>

        {/* Hero */}
        <div className="ai-hero" style={{ background: 'linear-gradient(135deg, var(--color-emerald), var(--color-emerald-dark))' }}>
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
          <div style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 14, padding: 20, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-warning-dark)', fontSize: '0.95rem', marginBottom: 8 }}>Clé API Gemini requise</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-warning-deeper)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Configurez votre clé API Gemini dans votre profil pour générer la fiche d'exercices.
            </p>
            <button onClick={onGoToProfile} style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, var(--color-emerald), var(--color-emerald-dark))', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}>
              Configurer dans le Profil
            </button>
          </div>
        )}

        {/* Errors */}
        {error === 'quota' && (
          <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-danger-dark)', marginBottom: 4 }}>Quota dépassé</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-danger-deeper)', margin: 0 }}>Vérifiez votre compte Google AI Studio.</p>
          </div>
        )}
        {error === 'auth' && (
          <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-danger-dark)', marginBottom: 4 }}>Clé API Gemini invalide</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-danger-deeper)', margin: '0 0 10px' }}>Clé Gemini absente ou incorrecte (AIza...).</p>
            <button onClick={onGoToProfile} style={{ fontSize: '0.82rem', color: 'var(--color-info)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Configurer ma clé Gemini</button>
          </div>
        )}
        {error && error !== 'quota' && error !== 'auth' && (
          <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-danger-dark)', marginBottom: 4 }}>Erreur</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-danger-deeper)', margin: 0 }}>{error}</p>
            <button onClick={generate} style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--color-info)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Réessayer</button>
          </div>
        )}

        {/* Notes du thérapeute (saisie) */}
        {!fiche && apiKey && (
          <div className="ai-section-card">
            <div className="ai-section-header">
              <div className="ai-section-icon" style={{ background: 'var(--color-success-bg)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <h4 style={{ color: 'var(--color-success-dark)' }}>Notes de séance</h4>
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
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleCopy}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--border-color)', background: copied ? 'var(--color-success-bg)' : 'white', color: copied ? 'var(--color-success)' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {copied ? (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copié</>
                    ) : (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copier</>
                    )}
                  </button>
                  <button
                    onClick={handleExportPDF}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--color-success-border)', background: 'var(--color-success-bg)', color: 'var(--color-success-deeper)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    PDF
                  </button>
                  <button
                    onClick={handleShare}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--color-purple-border)', background: shared ? 'var(--color-purple-bg)' : 'white', color: shared ? 'var(--color-purple-dark)' : 'var(--color-purple-dark)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                    {shared ? (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Envoyé</>
                    ) : (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Partager</>
                    )}
                  </button>
                </div>
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
            <button className="btn-primary-luxe" style={{ marginBottom: 0, background: 'linear-gradient(135deg, var(--color-emerald), var(--color-emerald-dark))' }} onClick={generate}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Générer la fiche d'exercices
              </div>
            </button>
          )}
          {loading && (
            <button className="btn-primary-luxe" disabled style={{ marginBottom: 0, opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg, var(--color-emerald), var(--color-emerald-dark))' }}>
              <div className="spinner" />
              Génération en cours…
            </button>
          )}
          {fiche && !loading && (
            <>
              <button
                onClick={handleShare}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: shared ? 'var(--color-purple-bg)' : 'linear-gradient(135deg, var(--color-purple-dark), var(--color-purple))', border: shared ? '1.5px solid var(--color-purple-border)' : 'none', color: shared ? 'var(--color-purple-dark)' : 'white', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                {shared ? 'Copié — prêt à envoyer au patient' : 'Envoyer au patient'}
              </button>
              <button
                onClick={handleExportPDF}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--color-success-bg)', border: '1.5px solid var(--color-success-border)', color: 'var(--color-success-deeper)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                Exporter en PDF
              </button>
              <button
                onClick={() => { setFiche(null); setNotesSeance(fiche.notesSeance) }}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                Modifier les notes et regénérer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
