import { useState, useRef, useEffect } from 'react'
import { DictableTextarea } from './VoiceMic'
import type { AnalyseIA, BilanDocument, AICallAuditEntry } from '../types'
import { buildClinicalPrompt, parseAnalyseIA, roleTitle } from '../utils/clinicalPrompt'
import type { BilanContext } from '../utils/clinicalPrompt'
import { GeminiAuthError } from '../utils/geminiClient'
import { callGeminiSecure, UnmaskedDocumentsError } from '../utils/geminiSecure'

interface BilanAnalyseIAProps {
  apiKey: string
  context: BilanContext
  profession?: string
  patientKey: string
  documents?: BilanDocument[]
  cached?: AnalyseIA | null
  onAudit?: (entry: AICallAuditEntry) => void
  /** Callback qui renvoie une Promise<boolean> — true si le praticien accepte d'envoyer des documents non masqués. */
  onUnmaskedDocsConfirm?: (docs: BilanDocument[]) => Promise<boolean>
  onResult: (analyse: AnalyseIA) => void
  onBack: () => void
  onClose?: () => void
  onExport: () => void
  onGoToProfile: () => void
  onFicheExercice?: () => void
}

function SkeletonBlock({ h, w = '100%' }: { h: number; w?: string }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: 6, marginBottom: 8 }} />
}

function NeuralIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/>
      <path d="M14.5 3.5C17 4 19 6.5 19 9.5c0 1-.2 2-.6 2.8"/>
      <path d="M9.5 3.5C7 4 5 6.5 5 9.5c0 1 .2 2 .6 2.8"/>
      <path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/>
      <path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/>
      <path d="M9 20v-6"/><path d="M15 20v-6"/><path d="M9 14h6"/>
      <circle cx="9" cy="20" r="1" fill="white" stroke="none"/>
      <circle cx="15" cy="20" r="1" fill="white" stroke="none"/>
    </svg>
  )
}

export function BilanAnalyseIA({ apiKey, context, patientKey, profession, documents, cached, onAudit, onUnmaskedDocsConfirm, onResult, onBack, onClose, onExport, onGoToProfile, onFicheExercice }: BilanAnalyseIAProps) {
  // Helper : appelle callGeminiSecure en gérant la confirmation documents non-masqués
  const callWithDocGuard = async (opts: Parameters<typeof callGeminiSecure>[0]): Promise<string> => {
    try {
      return await callGeminiSecure(opts)
    } catch (err) {
      if (err instanceof UnmaskedDocumentsError && onUnmaskedDocsConfirm) {
        const ok = await onUnmaskedDocsConfirm(err.unmaskedDocs)
        if (!ok) throw new Error('UNMASKED_DOCS_CANCELLED')
        return await callGeminiSecure({ ...opts, userAcknowledgedUnmasked: true })
      }
      throw err
    }
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analyse, setAnalyse] = useState<AnalyseIA | null>(cached ?? null)
  const [retryCount, setRetryCount] = useState(0)
  const [correction, setCorrection] = useState('')
  const [showCorrection, setShowCorrection] = useState(false)
  const [refining, setRefining] = useState(false)
  const [preAnalyseNotes, setPreAnalyseNotes] = useState('')

  // Cleanup : annule le retry timeout et bloque les setState après unmount
  const isMountedRef = useRef(true)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
    }
  }, [])

  const runAnalysis = async (attempt = 0) => {
    if (!isMountedRef.current) return
    setLoading(true)
    setError(null)
    try {
      // Merge therapist pre-analysis notes into context.notesLibres
      const therapistNotes = preAnalyseNotes.trim()
      const mergedNotes = therapistNotes
        ? (context.notesLibres?.trim()
            ? `${context.notesLibres.trim()}\n\n--- OBSERVATIONS DU THÉRAPEUTE (pré-analyse, prioritaires) ---\n${therapistNotes}`
            : `OBSERVATIONS DU THÉRAPEUTE (pré-analyse) :\n${therapistNotes}`)
        : context.notesLibres
      const mergedContext = { ...context, notesLibres: mergedNotes }

      const raw = await callWithDocGuard({
        apiKey,
        systemPrompt: `Agis comme un ${roleTitle(profession)} expert. Rédige ton analyse clinique, tes 3 hypothèses et ton plan de traitement impérativement en français médical professionnel. Si le thérapeute a laissé des observations pré-analyse, tiens-en compte prioritairement — il a vu le patient.`,
        userPrompt: buildClinicalPrompt(mergedContext),
        maxOutputTokens: 8192,
        jsonMode: true,
        preferredModel: 'gemini-3.1-pro-preview',
        documents,
        patient: { nom: context.patient.nom, prenom: context.patient.prenom, patientKey },
        category: 'bilan_analyse',
        onAudit,
      })
      const parsed = parseAnalyseIA(raw)
      if (!parsed) throw new Error('Réponse invalide — format JSON inattendu')
      if (!isMountedRef.current) return
      setAnalyse(parsed)
      onResult(parsed)
    } catch (err: unknown) {
      if (!isMountedRef.current) return
      // Annulation volontaire par l'utilisateur (docs non masqués) → silencieux
      if (err instanceof Error && err.message === 'UNMASKED_DOCS_CANCELLED') {
        setLoading(false)
        return
      }
      if (attempt < 2) {
        setRetryCount(attempt + 1)
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null
          if (isMountedRef.current) runAnalysis(attempt + 1)
        }, 1200)
        return
      }
      if (err instanceof GeminiAuthError) {
        setError('auth')
      } else {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
          setError('quota')
        } else {
          setError(msg)
        }
      }
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  const runRefinement = async () => {
    if (!correction.trim() || !analyse) return
    setRefining(true)
    setError(null)
    try {
      const prevAnalyse = `ANALYSE PRÉCÉDENTE (à corriger) :
- Diagnostic : ${analyse.diagnostic.titre} — ${analyse.diagnostic.description}
- Hypothèses : ${analyse.hypotheses.map(h => `H${h.rang} (${h.probabilite}%) ${h.titre}`).join(' | ')}
- Prise en charge : ${analyse.priseEnCharge.map(p => `${p.phase}: ${p.titre}`).join(' | ')}`

      const raw = await callWithDocGuard({
        apiKey,
        systemPrompt: `Agis comme un ${roleTitle(profession)} expert. Tu as déjà produit une analyse clinique, mais le thérapeute qui a vu le patient te donne des corrections basées sur son examen clinique réel. Tu DOIS intégrer ces corrections et ajuster ton analyse en conséquence. Rédige en français médical professionnel.`,
        userPrompt: `${buildClinicalPrompt(context)}

${prevAnalyse}

CORRECTIONS DU THÉRAPEUTE (prioritaires — elles priment sur l'analyse précédente) :
${correction.trim()}

Produis une nouvelle analyse corrigée en tenant compte des observations du thérapeute. Ajuste les probabilités des hypothèses, le diagnostic principal et le plan de traitement en conséquence.`,
        maxOutputTokens: 8192,
        jsonMode: true,
        preferredModel: 'gemini-3.1-pro-preview',
        documents,
        patient: { nom: context.patient.nom, prenom: context.patient.prenom, patientKey },
        category: 'bilan_analyse_refine',
        onAudit,
      })
      const parsed = parseAnalyseIA(raw)
      if (!parsed) throw new Error('Réponse invalide')
      if (!isMountedRef.current) return
      setAnalyse(parsed)
      onResult(parsed)
      setCorrection('')
      setShowCorrection(false)
    } catch (err: unknown) {
      if (!isMountedRef.current) return
      // Annulation volontaire (docs non masqués) → silencieux
      if (err instanceof Error && err.message === 'UNMASKED_DOCS_CANCELLED') {
        setRefining(false)
        return
      }
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
    } finally {
      if (isMountedRef.current) setRefining(false)
    }
  }

  const isLoading = loading && !analyse

  return (
    <div className="general-info-screen slide-in-left">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="title-section" style={{ marginBottom: 0 }}>Analyse</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{context.zone} · {context.patient.prenom} {context.patient.nom}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#7c3aed' }}>Analysé</div>
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
        <div className="ai-hero">
          <div className="ai-hero-icon"><NeuralIcon /></div>
          <div className="ai-hero-text">
            <h4>Analyse générée</h4>
            <p>Basée sur l'ensemble des données du bilan. À titre indicatif — le diagnostic clinique reste du ressort du thérapeute.</p>
          </div>
        </div>

        {/* No API key */}
        {!apiKey && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>Clé API Gemini requise</div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#78350f', margin: '0 0 14px', lineHeight: 1.5 }}>
              Pour accéder à l'analyse clinique, configurez votre clé API Gemini dans votre profil.
            </p>
            <button onClick={onGoToProfile}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Configurer dans le Profil
            </button>
          </div>
        )}

        {/* Error states */}
        {error === 'quota' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Quota dépassé</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>Quota de requêtes dépassé. Vérifiez votre compte Google AI Studio.</p>
          </div>
        )}
        {error && error !== 'quota' && error !== 'auth' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Erreur de connexion</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>{retryCount > 0 ? `Tentative ${retryCount}/2 échouée. ` : ''}{error}</p>
            <button onClick={() => { setRetryCount(0); runAnalysis(0) }} style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Réessayer</button>
          </div>
        )}
        {error === 'auth' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 14, padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.95rem' }}>Clé API Gemini invalide</div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: '0 0 14px', lineHeight: 1.5 }}>
              Votre clé API Gemini est absente ou incorrecte. Rendez-vous dans votre profil et renseignez une clé valide commençant par <strong>AIza</strong>.
            </p>
            <button onClick={onGoToProfile}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Configurer ma clé Gemini
            </button>
          </div>
        )}

        {/* Skeleton loading */}
        {isLoading && (
          <div>
            <div className="ai-section-card">
              <div className="ai-section-header">
                <SkeletonBlock h={30} w="30px" /><SkeletonBlock h={14} w="60%" />
              </div>
              <div className="ai-section-body">
                <SkeletonBlock h={80} /><SkeletonBlock h={14} w="80%" />
              </div>
            </div>
            <div className="ai-section-card">
              <div className="ai-section-header"><SkeletonBlock h={30} w="30px" /><SkeletonBlock h={14} w="50%" /></div>
              <div className="ai-section-body">
                {[78, 55, 32].map((w, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <SkeletonBlock h={14} w="70%" /><SkeletonBlock h={4} w={`${w}%`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {analyse && (
          <div className="fade-in-up">
            {/* Diagnostic */}
            <div className="ai-section-card">
              <div className="ai-section-header">
                <div className="ai-section-icon" style={{ background: 'var(--info-soft)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke='var(--primary)' strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
                    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                  </svg>
                </div>
                <h4 style={{ color: 'var(--primary)' }}>Diagnostic principal</h4>
              </div>
              <div className="ai-section-body">
                <div className="ai-diagnostic-box">
                  <div className="label">Hypothèse retenue</div>
                  <div className="value">{analyse.diagnostic.titre}</div>
                  <p className="desc">{analyse.diagnostic.description}</p>
                </div>
              </div>
            </div>

            {/* Hypothèses */}
            <div className="ai-section-card">
              <div className="ai-section-header">
                <div className="ai-section-icon" style={{ background: '#f0fdf4' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
                  </svg>
                </div>
                <h4 style={{ color: '#166534' }}>Hypothèses cliniques</h4>
              </div>
              <div className="ai-section-body">
                {analyse.hypotheses.map(h => (
                  <div key={h.rang} className="hypo-item">
                    <div className={`hypo-rank h${h.rang}`}>H{h.rang}</div>
                    <div className="hypo-content" style={{ flex: 1 }}>
                      <div className="title">{h.titre}</div>
                      <div className="prob">Probabilité estimée : {h.probabilite}%{h.justification ? ` — ${h.justification}` : ''}</div>
                      <div className="hypo-bar-wrap">
                        <div className={`hypo-bar-h${h.rang}`} style={{ width: `${h.probabilite}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prise en charge */}
            <div className="ai-section-card">
              <div className="ai-section-header">
                <div className="ai-section-icon" style={{ background: '#fff7ed' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                </div>
                <h4 style={{ color: '#9a3412' }}>Prise en charge suggérée</h4>
              </div>
              <div className="ai-section-body">
                {analyse.priseEnCharge.map((p, i) => {
                  const bullets = (p.points && p.points.length > 0)
                    ? p.points
                    : (p.detail ? [p.detail] : [])
                  return (
                    <div key={i} className="treatment-item">
                      <div className="treatment-num">{i + 1}</div>
                      <div className="treatment-content">
                        <div className="title">{p.phase} : {p.titre}</div>
                        {bullets.length > 0 && (
                          <ul className="treatment-points">
                            {bullets.map((b, j) => <li key={j}>{b}</li>)}
                          </ul>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Alertes */}
            {analyse.alertes.length > 0 && (
              <div className="ai-section-card">
                <div className="ai-section-header">
                  <div className="ai-section-icon" style={{ background: '#fff1f2' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <h4 style={{ color: '#be123c' }}>Alertes cliniques</h4>
                </div>
                <div className="ai-section-body">
                  {analyse.alertes.map((a, i) => (
                    <div key={i} className="ai-alerte-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer disclaimer */}
            <div className="ai-footer">
              <div className="ai-dot" />
              <p>Cette analyse est fournie à titre indicatif et ne remplace pas le jugement clinique du professionnel de santé.</p>
            </div>
          </div>
        )}

        {/* Correction du thérapeute */}
        {analyse && !loading && (
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <button
              onClick={() => setShowCorrection(!showCorrection)}
              style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: 10, background: showCorrection ? 'var(--info-soft)' : 'var(--secondary)', border: `1.5px solid ${showCorrection ? 'var(--info-border)' : 'var(--border-color)'}`, color: showCorrection ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {showCorrection ? 'Masquer les corrections' : 'Corriger / Affiner l\'analyse'}
            </button>
            {showCorrection && (
              <div className="fade-in" style={{ marginTop: 8, background: '#fefce8', border: '1.5px solid #fde68a', borderRadius: 12, padding: '0.85rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 600, marginBottom: 6 }}>
                  Vos observations cliniques
                </div>
                <p style={{ fontSize: '0.75rem', color: '#78350f', margin: '0 0 8px', lineHeight: 1.5 }}>
                  Indiquez ce que vous souhaitez corriger. Les probabilités seront recalculées et l'analyse ajustée en conséquence.
                </p>
                <DictableTextarea
                  value={correction}
                  onChange={e => setCorrection(e.target.value)}
                  rows={3}
                  placeholder="Ex : La fracture est exclue — pas de douleur à la palpation osseuse et radio négative. Plutôt une tendinopathie d'insertion. Le patient a aussi une instabilité en valgus dynamique que je n'avais pas notée."
                  textareaStyle={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.82rem', color: 'var(--text-main)', background: 'white', border: '1px solid #fde68a', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                />
                <button
                  onClick={runRefinement}
                  disabled={!correction.trim() || refining}
                  style={{ marginTop: 8, width: '100%', padding: '0.7rem', borderRadius: 10, background: !correction.trim() ? 'var(--secondary)' : 'linear-gradient(135deg, #d97706, #b45309)', border: 'none', color: !correction.trim() ? 'var(--text-muted)' : 'white', fontWeight: 700, fontSize: '0.85rem', cursor: !correction.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: refining ? 0.7 : 1 }}>
                  {refining ? (
                    <><div className="spinner" /> Analyse en cours…</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Affiner l'analyse</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notes pré-analyse du thérapeute */}
        {!analyse && !loading && apiKey && !error && (
          <div className="ai-section-card">
            <div className="ai-section-header">
              <div className="ai-section-icon" style={{ background: 'var(--info-soft)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke='var(--primary)' strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <h4 style={{ color: 'var(--primary)' }}>Vos observations cliniques</h4>
            </div>
            <div className="ai-section-body">
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Notez votre diagnostic supposé, vos hypothèses, ou toute observation clinique avant l'analyse. Optionnel — laissez vide pour une analyse uniquement basée sur les données du bilan.
              </p>
              <DictableTextarea
                value={preAnalyseNotes}
                onChange={e => setPreAnalyseNotes(e.target.value)}
                rows={4}
                placeholder="Ex : Je suspecte une tendinopathie de la coiffe des rotateurs. Patient avec douleur nocturne sélective, arc douloureux 60-120°. Pas de signes d'atteinte capsulaire. Vérifier si impingement sous-acromial."
                textareaStyle={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.85rem', color: 'var(--text-main)', background: 'var(--secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
              />
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!analyse && !loading && apiKey && !error && (
            <button className="btn-primary-luxe" style={{ marginBottom: 0 }} onClick={() => runAnalysis(0)}>
              Lancer l'analyse
            </button>
          )}
          {loading && (
            <button className="btn-primary-luxe" disabled style={{ marginBottom: 0, opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div className="spinner" />
              Analyse en cours…
            </button>
          )}
          {analyse && (
            <button
              className="btn-primary-luxe"
              style={{ marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={onExport}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Exporter le bilan + analyse
            </button>
          )}
          {analyse && onFicheExercice && (
            <button
              onClick={onFicheExercice}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Fiche d'exercices
            </button>
          )}
          {analyse && !loading && !refining && (
            <button
              onClick={() => { setAnalyse(null); runAnalysis(0) }}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Regénérer l'analyse
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
