import { useState } from 'react'
import type { EvolutionIA, AICallAuditEntry } from '../types'
import { buildEvolutionPrompt, parseEvolutionIA, roleTitle } from '../utils/clinicalPrompt'
import type { EvolutionContext } from '../utils/clinicalPrompt'
import { GeminiAuthError } from '../utils/geminiClient'
import { callGeminiSecure } from '../utils/geminiSecure'

interface BilanEvolutionIAProps {
  apiKey: string
  context: EvolutionContext
  patientKey: string
  profession?: string
  onAudit?: (entry: AICallAuditEntry) => void
  onBack: () => void
  onClose?: () => void
  onGoToProfile: () => void
}

function SkeletonBlock({ h, w = '100%' }: { h: number; w?: string }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: 6, marginBottom: 8 }} />
}

const TENDANCE_CONFIG = {
  amelioration: { label: 'Amélioration', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', icon: '▲' },
  stationnaire:  { label: 'Stationnaire', color: '#d97706', bg: '#fffbeb', border: '#fcd34d', icon: '=' },
  regression:    { label: 'Régression',   color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', icon: '▼' },
  mixte:         { label: 'Évolution mixte', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', icon: '~' },
}

export function BilanEvolutionIA({ apiKey, context, patientKey, profession, onAudit, onBack, onClose, onGoToProfile }: BilanEvolutionIAProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evolution, setEvolution] = useState<EvolutionIA | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const patientLabel = `${context.bilans[0]?.zone ?? ''} · ${context.bilans.length} bilan(s)`

  const runAnalysis = async (attempt = 0) => {
    setLoading(true)
    setError(null)
    try {
      const raw = await callGeminiSecure({
        apiKey,
        systemPrompt: `Agis comme un ${roleTitle(profession)} expert. Rédige le rapport d'évolution clinique impérativement en français médical professionnel.`,
        userPrompt: buildEvolutionPrompt(context),
        maxOutputTokens: 8192,
        preferredModel: 'gemini-3.1-pro-preview',
        patient: { nom: context.patient.nom, prenom: context.patient.prenom, patientKey },
        category: 'bilan_evolution',
        onAudit,
      })
      const parsed = parseEvolutionIA(raw)
      if (!parsed) throw new Error('Réponse invalide — format JSON inattendu')
      setEvolution(parsed)
    } catch (err: unknown) {
      if (attempt < 2) {
        setRetryCount(attempt + 1)
        setTimeout(() => runAnalysis(attempt + 1), 1200)
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
      if (attempt >= 2) setLoading(false)
      else if (attempt === 0) setLoading(true)
    }
  }

  const isLoading = loading && !evolution
  const tendanceCfg = evolution ? (TENDANCE_CONFIG[evolution.tendance] ?? TENDANCE_CONFIG.mixte) : null

  return (
    <div className="general-info-screen slide-in-left">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="title-section" style={{ marginBottom: 0 }}>Rapport d'évolution</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{patientLabel}</p>
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
          <div className="ai-hero-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div className="ai-hero-text">
            <h4>Rapport d'évolution</h4>
            <p>Analyse de la progression sur l'ensemble des bilans du patient. À titre indicatif uniquement.</p>
          </div>
        </div>

        {/* No API key */}
        {!apiKey && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 20, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 6 }}>Clé API Gemini requise</div>
            <p style={{ fontSize: '0.85rem', color: '#78350f', margin: '0 0 14px' }}>Configurez votre clé API Gemini dans votre profil.</p>
            <button onClick={onGoToProfile}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}>
              Configurer dans le Profil
            </button>
          </div>
        )}

        {/* Error states */}
        {error === 'quota' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Quota dépassé</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>Vérifiez votre compte Google AI Studio.</p>
          </div>
        )}
        {error === 'auth' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 14, padding: 20, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>Clé API Gemini invalide</div>
            <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: '0 0 14px' }}>Renseignez une clé valide (AIza...) dans votre profil.</p>
            <button onClick={onGoToProfile}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}>
              Configurer ma clé Gemini
            </button>
          </div>
        )}
        {error && error !== 'quota' && error !== 'auth' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Erreur de connexion</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>{retryCount > 0 ? `Tentative ${retryCount}/2 échouée. ` : ''}{error}</p>
            <button onClick={() => { setRetryCount(0); runAnalysis(0) }} style={{ marginTop: 8, fontSize: '0.82rem', color: '#7c3aed', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Réessayer</button>
          </div>
        )}

        {/* Skeleton */}
        {isLoading && (
          <div>
            <div className="ai-section-card">
              <div className="ai-section-header"><SkeletonBlock h={30} w="30px" /><SkeletonBlock h={14} w="55%" /></div>
              <div className="ai-section-body"><SkeletonBlock h={70} /><SkeletonBlock h={14} w="75%" /></div>
            </div>
            <div className="ai-section-card">
              <div className="ai-section-header"><SkeletonBlock h={30} w="30px" /><SkeletonBlock h={14} w="45%" /></div>
              <div className="ai-section-body">
                {[1, 2, 3].map(i => <div key={i} style={{ marginBottom: 10 }}><SkeletonBlock h={12} w="60%" /><SkeletonBlock h={8} w="40%" /></div>)}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {evolution && tendanceCfg && (
          <div className="fade-in-up">

            {/* Tendance globale */}
            <div style={{ background: tendanceCfg.bg, border: `1px solid ${tendanceCfg.border}`, borderRadius: 14, padding: '1rem 1.25rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: tendanceCfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1.4rem', flexShrink: 0 }}>
                {tendanceCfg.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: tendanceCfg.color, fontSize: '1rem' }}>{tendanceCfg.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Tendance générale sur {evolution.progression.length} bilan(s)</div>
              </div>
            </div>

            {/* Résumé */}
            <div className="ai-section-card">
              <div className="ai-section-header">
                <div className="ai-section-icon" style={{ background: '#eff6ff' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <h4 style={{ color: '#1e3a8a' }}>Résumé clinique</h4>
              </div>
              <div className="ai-section-body">
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>{evolution.resume}</p>
              </div>
            </div>

            {/* Progression bilan par bilan */}
            <div className="ai-section-card">
              <div className="ai-section-header">
                <div className="ai-section-icon" style={{ background: '#f0fdf4' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <h4 style={{ color: '#166534' }}>Progression séance par séance</h4>
              </div>
              <div className="ai-section-body">
                {evolution.progression.map((p, i) => {
                  const prev = i > 0 ? evolution.progression[i - 1].evn : null
                  const curr = p.evn
                  const delta = prev != null && curr != null ? Math.round(((prev - curr) / prev) * 100) : null
                  const dColor = delta === null ? '#94a3b8' : delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#94a3b8'
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary-dark)', flexShrink: 0 }}>
                        {p.bilanNum}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{p.date}</span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {curr != null && <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-dark)' }}>EVN {curr}/10</span>}
                            {delta !== null && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: dColor }}>({delta > 0 ? '+' : ''}{delta}%)</span>}
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{p.commentaire}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Points forts */}
            {evolution.pointsForts.length > 0 && (
              <div className="ai-section-card">
                <div className="ai-section-header">
                  <div className="ai-section-icon" style={{ background: '#f0fdf4' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <h4 style={{ color: '#166534' }}>Points forts</h4>
                </div>
                <div className="ai-section-body">
                  {evolution.pointsForts.map((p, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Points de vigilance */}
            {evolution.pointsVigilance.length > 0 && (
              <div className="ai-section-card">
                <div className="ai-section-header">
                  <div className="ai-section-icon" style={{ background: '#fff7ed' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <h4 style={{ color: '#9a3412' }}>Points de vigilance</h4>
                </div>
                <div className="ai-section-body">
                  {evolution.pointsVigilance.map((p, i) => (
                    <div key={i} className="ai-alerte-item" style={{ marginBottom: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommandations */}
            {evolution.recommandations.length > 0 && (
              <div className="ai-section-card">
                <div className="ai-section-header">
                  <div className="ai-section-icon" style={{ background: '#f5f3ff' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                      <rect x="9" y="3" width="6" height="4" rx="1"/>
                      <polyline points="9 12 11 14 15 10"/>
                    </svg>
                  </div>
                  <h4 style={{ color: '#6d28d9' }}>Recommandations thérapeutiques</h4>
                </div>
                <div className="ai-section-body">
                  {evolution.recommandations.map((r, i) => (
                    <div key={i} className="treatment-item">
                      <div className="treatment-num">{i + 1}</div>
                      <div className="treatment-content">
                        <div className="title">{r.titre}</div>
                        <div className="detail">{r.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conclusion */}
            <div className="ai-section-card">
              <div className="ai-section-header">
                <div className="ai-section-icon" style={{ background: '#eff6ff' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </div>
                <h4 style={{ color: '#1e3a8a' }}>Conclusion & orientation</h4>
              </div>
              <div className="ai-section-body">
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>{evolution.conclusion}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="ai-footer">
              <div className="ai-dot" />
              <p>Ce rapport est fourni à titre indicatif et ne remplace pas le jugement clinique du professionnel de santé.</p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!evolution && !loading && apiKey && !error && (
            <button className="btn-primary-luxe" style={{ marginBottom: 0, background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }} onClick={() => runAnalysis(0)}>
              Générer le rapport d'évolution
            </button>
          )}
          {loading && (
            <button className="btn-primary-luxe" disabled style={{ marginBottom: 0, opacity: 0.7, background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div className="spinner" />
              Analyse en cours…
            </button>
          )}
          {evolution && !loading && (
            <button
              onClick={() => { setEvolution(null); runAnalysis(0) }}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
              Regénérer le rapport
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
