import { useState } from 'react'
import type { AnalyseIA } from '../types'
import { buildClinicalPrompt, parseAnalyseIA } from '../utils/clinicalPrompt'
import type { BilanContext } from '../utils/clinicalPrompt'

interface BilanAnalyseIAProps {
  apiKey: string
  context: BilanContext
  cached?: AnalyseIA | null
  onResult: (analyse: AnalyseIA) => void
  onBack: () => void
  onExport: () => void
  onGoToProfile: () => void
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

export function BilanAnalyseIA({ apiKey, context, cached, onResult, onBack, onExport, onGoToProfile }: BilanAnalyseIAProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analyse, setAnalyse] = useState<AnalyseIA | null>(cached ?? null)
  const [retryCount, setRetryCount] = useState(0)

  const runAnalysis = async (attempt = 0) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/groq/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1500,
          messages: [
            {
              role: 'system',
              content: 'Agis comme un physiothérapeute expert. Rédige ton analyse clinique, tes 3 hypothèses et ton plan de traitement impérativement en français médical professionnel.',
            },
            { role: 'user', content: buildClinicalPrompt(context) },
          ],
        }),
      })

      if (res.status === 401) throw new Error('auth')
      if (res.status === 429) throw new Error('quota')
      if (!res.ok) {
        let detail = ''
        try { const e = await res.json(); detail = e?.error?.message ?? '' } catch { /* ignore */ }
        throw new Error(`Erreur serveur (${res.status})${detail ? ` : ${detail}` : ''}`)
      }

      const data = await res.json()
      const raw: string = data.choices?.[0]?.message?.content ?? ''
      const parsed = parseAnalyseIA(raw)
      if (!parsed) throw new Error('Réponse invalide — format JSON inattendu')
      setAnalyse(parsed)
      onResult(parsed)
    } catch (err: unknown) {
      if (attempt < 2) {
        setRetryCount(attempt + 1)
        setTimeout(() => runAnalysis(attempt + 1), 1200)
        return
      }
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      if (msg === 'quota' || msg.includes('rate') || msg.includes('429')) {
        setError('quota')
      } else if (msg === 'auth' || msg.includes('401') || msg.includes('invalid') || msg.includes('api_key')) {
        setError('auth')
      } else {
        setError(msg)
      }
    } finally {
      if (attempt >= 2) setLoading(false)
      else if (attempt === 0) setLoading(true)
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
          <h2 className="title-section" style={{ marginBottom: 0 }}>Analyse IA</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{context.zone} · {context.patient.prenom} {context.patient.nom}</p>
        </div>
        <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#7c3aed' }}>IA</div>
      </header>

      <div className="scroll-area" style={{ paddingBottom: '5.5rem' }}>

        {/* Hero */}
        <div className="ai-hero">
          <div className="ai-hero-icon"><NeuralIcon /></div>
          <div className="ai-hero-text">
            <h4>Analyse générée par IA</h4>
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
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>Clé API Groq requise</div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#78350f', margin: '0 0 14px', lineHeight: 1.5 }}>
              Pour accéder à l'analyse clinique, configurez votre clé API Groq dans votre profil.
            </p>
            <button onClick={onGoToProfile}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>Quota de requêtes dépassé. Vérifiez votre compte Groq.</p>
          </div>
        )}
        {error && error !== 'quota' && error !== 'auth' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Erreur de connexion</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>{retryCount > 0 ? `Tentative ${retryCount}/2 échouée. ` : ''}{error}</p>
            <button onClick={() => { setRetryCount(0); runAnalysis(0) }} style={{ marginTop: 8, fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Réessayer</button>
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
              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.95rem' }}>Clé API Groq invalide</div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: '0 0 14px', lineHeight: 1.5 }}>
              Votre clé API Groq est absente ou incorrecte. Rendez-vous dans votre profil et renseignez une clé valide commençant par <strong>gsk_</strong>.
            </p>
            <button onClick={onGoToProfile}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Configurer ma clé Groq
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
                <div className="ai-section-icon" style={{ background: '#eff6ff' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
                    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                  </svg>
                </div>
                <h4 style={{ color: '#1e3a8a' }}>Diagnostic principal</h4>
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
                {analyse.priseEnCharge.map((p, i) => (
                  <div key={i} className="treatment-item">
                    <div className="treatment-num">{i + 1}</div>
                    <div className="treatment-content">
                      <div className="title">{p.phase} : {p.titre}</div>
                      <div className="detail">{p.detail}</div>
                    </div>
                  </div>
                ))}
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

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!analyse && !loading && apiKey && !error && (
            <button className="btn-primary-luxe" style={{ marginBottom: 0 }} onClick={() => runAnalysis(0)}>
              Lancer l'analyse IA
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
              Exporter le bilan + analyse IA
            </button>
          )}
          {analyse && !loading && (
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
