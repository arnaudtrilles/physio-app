import { useState } from 'react'
import type { AnalyseIAIntermediaire } from '../types'
import { buildIntermediairePrompt, parseAnalyseIAIntermediaire } from '../utils/clinicalPrompt'
import type { BilanIntermediaireEntry } from '../utils/clinicalPrompt'
import { callGemini, GeminiAuthError } from '../utils/geminiClient'

interface Props {
  apiKey: string
  patient: { nom: string; prenom: string; dateNaissance: string }
  zone: string
  bilanType: string
  intermData: Record<string, unknown>
  historique: BilanIntermediaireEntry[]
  cached?: AnalyseIAIntermediaire | null
  onResult: (a: AnalyseIAIntermediaire) => void
  onBack: () => void
  onGoToProfile: () => void
  onFicheExercice: () => void
}

function SkeletonBlock({ h, w = '100%' }: { h: number; w?: string }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: 6, marginBottom: 8 }} />
}

export function BilanNoteIntermediaire({
  apiKey, patient, zone, bilanType, intermData, historique,
  cached, onResult, onBack, onGoToProfile, onFicheExercice,
}: Props) {
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [note, setNote]         = useState<AnalyseIAIntermediaire | null>(cached ?? null)
  const [retryCount, setRetryCount] = useState(0)
  const [correction, setCorrection] = useState('')
  const [showCorrection, setShowCorrection] = useState(false)
  const [refining, setRefining] = useState(false)

  const run = async (attempt = 0) => {
    setLoading(true)
    setError(null)
    try {
      const prompt = buildIntermediairePrompt(patient, zone, bilanType, intermData, historique)
      const raw = await callGemini(
        apiKey,
        'Agis comme un physiothérapeute expert. Rédige impérativement en français médical professionnel.',
        prompt,
        8192,
        true,
        'gemini-2.5-pro',
      )
      const parsed = parseAnalyseIAIntermediaire(raw)
      if (!parsed) throw new Error('Réponse invalide — format JSON inattendu')
      setNote(parsed)
      onResult(parsed)
    } catch (err: unknown) {
      if (attempt < 2) {
        setRetryCount(attempt + 1)
        setTimeout(() => run(attempt + 1), 1200)
        return
      }
      if (err instanceof GeminiAuthError) {
        setError('auth')
      } else {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        setError(msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') ? 'quota' : msg)
      }
    } finally {
      if (attempt >= 2) setLoading(false)
      else if (attempt === 0) setLoading(true)
    }
  }

  const runRefinement = async () => {
    if (!correction.trim() || !note) return
    setRefining(true)
    setError(null)
    try {
      const prevNote = `NOTE PRÉCÉDENTE (à corriger) :
- Diagnostic : ${note.noteDiagnostique.titre}
- Évolution : ${note.noteDiagnostique.evolution}
- Description : ${note.noteDiagnostique.description}
- Prise en charge : ${note.priseEnChargeAjustee.map(p => p.point).join(' | ')}`

      const prompt = buildIntermediairePrompt(patient, zone, bilanType, intermData, historique)
      const raw = await callGemini(
        apiKey,
        `Agis comme un physiothérapeute expert. Tu as déjà produit une note diagnostique intermédiaire, mais le thérapeute te donne des corrections basées sur son examen. Tu DOIS intégrer ces corrections et ajuster ta note. Rédige en français médical professionnel.`,
        `${prompt}

${prevNote}

CORRECTIONS DU THÉRAPEUTE (prioritaires) :
${correction.trim()}

Produis une nouvelle note corrigée en tenant compte des observations du thérapeute.`,
        8192,
        true,
        'gemini-2.5-pro',
      )
      const parsed = parseAnalyseIAIntermediaire(raw)
      if (!parsed) throw new Error('Réponse invalide')
      setNote(parsed)
      onResult(parsed)
      setCorrection('')
      setShowCorrection(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
    } finally {
      setRefining(false)
    }
  }

  const isLoading = loading && !note

  const ZONE_LABELS: Record<string, string> = {
    epaule: 'Épaule', cheville: 'Cheville', genou: 'Genou', hanche: 'Hanche',
    cervical: 'Rachis Cervical', lombaire: 'Rachis Lombaire', generique: 'Bilan Général',
  }
  const zoneLabel = ZONE_LABELS[bilanType] ?? zone

  return (
    <div className="general-info-screen slide-in-left">
      <header className="screen-header">
        <button className="btn-back" aria-label="Retour" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="title-section" style={{ marginBottom: 0 }}>Note diagnostique</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bilan intermédiaire · {zoneLabel}</p>
        </div>
        <div style={{ background: 'var(--color-orange-bg)', border: '1px solid var(--color-orange-border)', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: 'var(--color-orange-dark)' }}>
          Intermédiaire
        </div>
      </header>

      <div className="scroll-area" style={{ paddingBottom: '6rem' }}>

        {/* Hero */}
        <div className="ai-hero" style={{ background: 'linear-gradient(135deg, var(--color-orange), var(--color-orange-dark))' }}>
          <div className="ai-hero-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <div className="ai-hero-text">
            <h4>Note diagnostique intermédiaire</h4>
            <p>Basée sur l'évolution et l'historique de la zone. À titre indicatif — le diagnostic reste du ressort du thérapeute.</p>
          </div>
        </div>

        {/* No API key */}
        {!apiKey && (
          <div style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 14, padding: 20, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-warning-dark)', fontSize: '0.95rem', marginBottom: 8 }}>Clé API Gemini requise</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-warning-deeper)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Configurez votre clé API Gemini dans votre profil pour accéder à cette fonctionnalité.
            </p>
            <button onClick={onGoToProfile}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}>
              Configurer dans le Profil
            </button>
          </div>
        )}

        {/* Errors */}
        {error === 'quota' && (
          <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-danger-dark)', marginBottom: 4 }}>Quota dépassé</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-danger-deeper)', margin: 0 }}>Quota de requêtes dépassé. Vérifiez votre compte Google AI Studio.</p>
          </div>
        )}
        {error === 'auth' && (
          <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 14, padding: 20, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-danger-dark)', fontSize: '0.95rem', marginBottom: 8 }}>Clé API invalide</div>
            <button onClick={onGoToProfile}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, var(--color-purple-dark), var(--color-purple))', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}>
              Configurer ma clé Gemini
            </button>
          </div>
        )}
        {error && error !== 'quota' && error !== 'auth' && (
          <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-danger-dark)', marginBottom: 4 }}>Erreur</div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-danger-deeper)', margin: 0 }}>{retryCount > 0 ? `Tentative ${retryCount}/2 échouée. ` : ''}{error}</p>
            <button onClick={() => { setRetryCount(0); run(0) }} style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--color-info)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Réessayer</button>
          </div>
        )}

        {/* Skeleton */}
        {isLoading && (
          <div>
            <div className="ai-section-card">
              <div className="ai-section-header"><SkeletonBlock h={30} w="30px" /><SkeletonBlock h={14} w="60%" /></div>
              <div className="ai-section-body"><SkeletonBlock h={80} /><SkeletonBlock h={14} w="80%" /></div>
            </div>
            <div className="ai-section-card">
              <div className="ai-section-header"><SkeletonBlock h={30} w="30px" /><SkeletonBlock h={14} w="50%" /></div>
              <div className="ai-section-body">
                {[1, 2, 3, 4].map(i => <SkeletonBlock key={i} h={32} />)}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {note && (
          <div className="fade-in-up">

            {/* Note diagnostique */}
            <div className="ai-section-card">
              <div className="ai-section-header">
                <div className="ai-section-icon" style={{ background: 'var(--color-orange-bg)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-orange-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
                    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                  </svg>
                </div>
                <h4 style={{ color: 'var(--color-orange-red)' }}>Note diagnostique</h4>
              </div>
              <div className="ai-section-body">
                <div className="ai-diagnostic-box" style={{ borderLeft: '4px solid var(--color-orange)' }}>
                  <div className="label">Diagnostic intermédiaire</div>
                  <div className="value">{note.noteDiagnostique.titre}</div>
                  <p className="desc" style={{ marginBottom: 10 }}>{note.noteDiagnostique.description}</p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.75rem', background: 'var(--color-orange-bg)', borderRadius: 8, border: '1px solid var(--color-orange-border)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-orange-dark)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-orange-dark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    {note.noteDiagnostique.evolution}
                  </span>
                </div>
              </div>
            </div>

            {/* Prise en charge ajustée */}
            <div className="ai-section-card">
              <div className="ai-section-header">
                <div className="ai-section-icon" style={{ background: 'var(--color-success-bg)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                    <polyline points="9 12 11 14 15 10"/>
                  </svg>
                </div>
                <h4 style={{ color: 'var(--color-success-dark)' }}>Prise en charge ajustée</h4>
              </div>
              <div className="ai-section-body">
                {note.priseEnChargeAjustee.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.6rem 0', borderBottom: i < note.priseEnChargeAjustee.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-success), var(--color-success-deeper))', color: 'white', fontWeight: 700, fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>{item.point}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alertes */}
            {note.alertes.length > 0 && (
              <div className="ai-section-card">
                <div className="ai-section-header">
                  <div className="ai-section-icon" style={{ background: 'var(--color-rose-bg)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-rose)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <h4 style={{ color: 'var(--color-rose-dark)' }}>Alertes cliniques</h4>
                </div>
                <div className="ai-section-body">
                  {note.alertes.map((a, i) => (
                    <div key={i} className="ai-alerte-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-rose)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ai-footer">
              <div className="ai-dot" />
              <p>Cette note est fournie à titre indicatif et ne remplace pas le jugement clinique du professionnel de santé.</p>
            </div>
          </div>
        )}

        {/* Correction du thérapeute */}
        {note && !loading && (
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <button
              onClick={() => setShowCorrection(!showCorrection)}
              style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: 10, background: showCorrection ? 'var(--color-orange-bg)' : 'var(--secondary)', border: `1.5px solid ${showCorrection ? 'var(--color-orange-border)' : 'var(--border-color)'}`, color: showCorrection ? 'var(--color-warning-dark)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {showCorrection ? 'Masquer les corrections' : 'Corriger / Affiner la note'}
            </button>
            {showCorrection && (
              <div className="fade-in" style={{ marginTop: 8, background: 'var(--color-amber-bg2)', border: '1.5px solid var(--color-warning-border)', borderRadius: 12, padding: '0.85rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-warning-dark)', fontWeight: 600, marginBottom: 6 }}>Vos observations cliniques</div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-warning-deeper)', margin: '0 0 8px', lineHeight: 1.5 }}>
                  Indiquez ce que vous souhaitez corriger. L'IA ajustera la note diagnostique en conséquence.
                </p>
                <textarea
                  value={correction}
                  onChange={e => setCorrection(e.target.value)}
                  rows={3}
                  placeholder="Ex : L'évolution est plutôt favorable, le catastrophisme a diminué depuis la dernière séance. Retirer l'alerte sur la compliance."
                  style={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.82rem', color: 'var(--text-main)', background: 'white', border: '1px solid var(--color-warning-border)', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                />
                <button
                  onClick={runRefinement}
                  disabled={!correction.trim() || refining}
                  style={{ marginTop: 8, width: '100%', padding: '0.7rem', borderRadius: 10, background: !correction.trim() ? 'var(--secondary)' : 'linear-gradient(135deg, var(--color-orange), var(--color-orange-dark))', border: 'none', color: !correction.trim() ? 'var(--text-muted)' : 'white', fontWeight: 700, fontSize: '0.85rem', cursor: !correction.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: refining ? 0.7 : 1 }}>
                  {refining ? (
                    <><div className="spinner" /> Analyse en cours…</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Affiner la note</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!note && !loading && apiKey && !error && (
            <button className="btn-primary-luxe" style={{ marginBottom: 0, background: 'linear-gradient(135deg, var(--color-orange), var(--color-orange-dark))' }} onClick={() => run(0)}>
              Générer la note diagnostique
            </button>
          )}
          {loading && (
            <button className="btn-primary-luxe" disabled style={{ marginBottom: 0, opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg, var(--color-orange), var(--color-orange-dark))' }}>
              <div className="spinner" />
              Analyse en cours…
            </button>
          )}
          {note && (
            <button
              onClick={onFicheExercice}
              style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: 'var(--color-success-bg)', border: '1.5px solid var(--color-success-border)', color: 'var(--color-success-deeper)', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Fiche d'exercices
            </button>
          )}
          {note && !loading && !refining && (
            <button
              onClick={() => { setNote(null); run(0) }}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
              Regénérer la note
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
