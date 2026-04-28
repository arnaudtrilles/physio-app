import { useState, useImperativeHandle, forwardRef } from 'react'
import type { BilanMode, NarrativeReport } from '../types'
import { DictableTextarea } from './VoiceMic'
import { SectionHeader, BilanModeToggle, EVASlider } from './bilans/shared'
import { BilanVocalMode } from './bilans/BilanVocalMode'

export interface NoteSeanceHandle {
  getData: () => NoteSeanceData
}

export interface ExerciceProtocole {
  series?: string
  tempsOuReps?: string
  recuperation?: string
  frequence?: string
}

export interface ExerciceDomicile {
  nom: string
  fait: boolean
  categorie?: string
  protocole?: ExerciceProtocole
  description?: string
  source?: 'manuel' | 'ia'
}

export interface NoteSeanceData {
  eva: string
  observance: string
  evolution: string
  noteSubjective: string
  interventions: string[]
  detailDosage: string
  tolerance: string
  toleranceDetail: string
  prochaineEtape: string[]
  notePlan: string
  exercicesDomicile?: ExerciceDomicile[]
}

/**
 * Format élégant d'un dosage pour l'affichage dans la card.
 *  - "3" + "15"              → "3 × 15"
 *  - "3" + "30 sec"          → "3 × 30 s"
 *  - "2" + "10 par jambe"    → "2 × 10 par jambe"
 *  - "" + "15 min"           → "15 min"
 *  - "" + ""                 → ""
 */
function formatDosageCompact(proto?: ExerciceProtocole): string {
  if (!proto) return ''
  const series = (proto.series ?? '').trim()
  const tr = (proto.tempsOuReps ?? '').trim()
  if (!series && !tr) return ''
  const trClean = tr
    .replace(/\brépétitions?\b/gi, '')
    .replace(/\brepetitions?\b/gi, '')
    .replace(/\breps?\b/gi, '')
    .replace(/\bsecondes?\b/gi, 's')
    .replace(/\bsec\b/gi, 's')
    .replace(/\bminutes?\b/gi, 'min')
    .replace(/\bmin\.\b/gi, 'min')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (series && trClean) return `${series} × ${trClean}`
  return trClean || series
}

const editInputStyle: React.CSSProperties = {
  width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.85rem',
  color: 'var(--text-main)', background: 'white',
  border: '1px solid var(--border-color)', borderRadius: 8,
  boxSizing: 'border-box',
}

const INTERVENTIONS_CORE = [
  'Mobilisation', 'Renforcement', 'Étirements',
  'Proprioception', 'Électrostim', 'Massage',
  'Cryothérapie', 'Exercices à domicile',
]

const INTERVENTIONS_FULL = [
  'Thérapie manuelle', 'Mobilisations', 'Étirements', 'Renforcement',
  'Proprioception', 'Électrothérapie', 'Cryothérapie',
  'Éducation thérapeutique', 'Travail fonctionnel', 'Neuro-dynamique',
]

const PROCHAINES = [
  'Continuer protocole', 'Augmenter charge', 'Réduire intensité',
  'Ajouter exercice', 'Prévoir bilan intermédiaire', 'Contacter médecin',
]

interface NoteSeanceProps {
  initialData?: NoteSeanceData
  zone?: string
  onGenerateExercices?: (prompt: string) => Promise<ExerciceDomicile[]>
  onExportExercicesPDF?: (exercices: ExerciceDomicile[]) => void
}

export const NoteSeance = forwardRef<NoteSeanceHandle, NoteSeanceProps>(
  ({ initialData, zone, onGenerateExercices, onExportExercicesPDF }, ref) => {
    const [mode, setMode] = useState<BilanMode>('noyau')
    const coreMode = mode === 'noyau'
    const [vocalReport, setVocalReport] = useState<NarrativeReport | null>(null)
    const [open, setOpen] = useState<Record<string, boolean>>({ subjective: true, objective: true, assessment: true, plan: true })
    const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

    // S
    const [eva, setEva] = useState(initialData?.eva ?? '')
    const [observance, setObservance] = useState(initialData?.observance ?? '')
    const [evolution, setEvolution] = useState(initialData?.evolution ?? '')
    const [noteSubjective, setNoteSubjective] = useState(initialData?.noteSubjective ?? '')

    // O
    const [interventions, setInterventions] = useState<string[]>(initialData?.interventions ?? [])
    const [detailDosage, setDetailDosage] = useState(initialData?.detailDosage ?? '')
    const [showAutreIntervention, setShowAutreIntervention] = useState(false)
    const [autreInterventionText, setAutreInterventionText] = useState('')

    // Exercices à domicile
    const [exercicesDomicile, setExercicesDomicile] = useState<ExerciceDomicile[]>(initialData?.exercicesDomicile ?? [])
    const [exerciceDictation, setExerciceDictation] = useState('')
    const [generating, setGenerating] = useState(false)
    const [generateError, setGenerateError] = useState<string | null>(null)
    const [editingExercice, setEditingExercice] = useState<number | null>(null)

    // A
    const [tolerance, setTolerance] = useState(initialData?.tolerance ?? '')
    const [toleranceDetail, setToleranceDetail] = useState(initialData?.toleranceDetail ?? '')

    // P
    const [prochaineEtape, setProchaineEtape] = useState<string[]>(initialData?.prochaineEtape ?? [])
    const [notePlan, setNotePlan] = useState(initialData?.notePlan ?? '')

    const toggleIntervention = (i: string) =>
      setInterventions(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])
    const toggleProchaine = (p: string) =>
      setProchaineEtape(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

    useImperativeHandle(ref, () => ({
      getData: () => ({
        eva, observance, evolution, noteSubjective,
        interventions, detailDosage,
        tolerance, toleranceDetail,
        prochaineEtape, notePlan,
        exercicesDomicile,
      }),
    }))

    const sectionLabel: React.CSSProperties = {
      fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
    }

    // ── EXERCICES À DOMICILE (shared core + complete) ─────────────
    const exercicesSection = (
      <div style={{ marginBottom: 20 }}>
        <div style={sectionLabel}>Exercices à domicile</div>

        {/* Cards exercices */}
        {exercicesDomicile.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {exercicesDomicile.map((ex, idx) => {
              const dosage = formatDosageCompact(ex.protocole)
              const isEditing = editingExercice === idx
              const update = (patch: Partial<ExerciceDomicile>) =>
                setExercicesDomicile(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e))
              const updateProto = (patch: Partial<ExerciceProtocole>) =>
                setExercicesDomicile(prev => prev.map((e, i) => i === idx ? { ...e, protocole: { ...(e.protocole ?? {}), ...patch } } : e))
              return (
                <div key={idx} style={{
                  background: 'white', border: '1px solid var(--border-color)',
                  borderRadius: 10, overflow: 'hidden',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}>
                  <div
                    onClick={() => setEditingExercice(isEditing ? null : idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '0.7rem 0.9rem', cursor: 'pointer',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.35, letterSpacing: '-0.005em' }}>
                        {ex.nom}
                      </div>
                      {ex.categorie && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.35 }}>
                          {ex.categorie}
                        </div>
                      )}
                    </div>
                    {dosage && (
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 500,
                        color: 'var(--text-muted)',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap', letterSpacing: '0.01em',
                      }}>
                        {dosage}
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setExercicesDomicile(prev => prev.filter((_, i) => i !== idx)); if (isEditing) setEditingExercice(null) }}
                      aria-label="Supprimer cet exercice"
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, flexShrink: 0, display: 'flex', opacity: 0.6 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {isEditing && (
                    <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.75rem 0.9rem', background: 'var(--input-bg)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Nom</label>
                        <input value={ex.nom} onChange={e => update({ nom: e.target.value })} style={editInputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Catégorie / contexte</label>
                        <input value={ex.categorie ?? ''} onChange={e => update({ categorie: e.target.value })}
                          placeholder="Ex : Renforcement quadriceps · Phase 2 post-LCA" style={editInputStyle} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Séries</label>
                          <input value={ex.protocole?.series ?? ''} onChange={e => updateProto({ series: e.target.value })} placeholder="3" style={editInputStyle} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Reps / Temps</label>
                          <input value={ex.protocole?.tempsOuReps ?? ''} onChange={e => updateProto({ tempsOuReps: e.target.value })} placeholder="15 ou 30 sec" style={editInputStyle} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Récupération</label>
                          <input value={ex.protocole?.recuperation ?? ''} onChange={e => updateProto({ recuperation: e.target.value })} placeholder="45 sec" style={editInputStyle} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Fréquence</label>
                          <input value={ex.protocole?.frequence ?? ''} onChange={e => updateProto({ frequence: e.target.value })} placeholder="2× par jour" style={editInputStyle} />
                        </div>
                      </div>
                      {ex.description !== undefined && (
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Consignes</label>
                          <textarea value={ex.description ?? ''} onChange={e => update({ description: e.target.value })} rows={3}
                            style={{ ...editInputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Dictée IA */}
        {onGenerateExercices && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <DictableTextarea
              value={exerciceDictation}
              onChange={e => setExerciceDictation(e.target.value)}
              rows={1}
              minHeight={32}
              placeholder="Dictez les exercices (ex : squat 3×15, pont fessier 3×12)..."
              textareaStyle={{
                width: '100%', padding: '0.4rem 0.75rem', fontSize: '0.8rem',
                color: 'var(--text-main)', background: 'var(--input-bg)',
                border: '1px solid var(--border-color)', borderRadius: 8,
                boxSizing: 'border-box', lineHeight: 1.4,
              }}
            />
            {generateError && (
              <div style={{
                fontSize: '0.75rem', color: '#991b1b',
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, padding: '0.4rem 0.6rem', lineHeight: 1.4,
              }}>
                {generateError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async () => {
                  if (!exerciceDictation.trim() || generating) return
                  setGenerating(true)
                  setGenerateError(null)
                  try {
                    const results = await onGenerateExercices(exerciceDictation.trim())
                    if (results.length > 0) {
                      setExercicesDomicile(prev => [...prev, ...results])
                      setExerciceDictation('')
                    } else {
                      setGenerateError('Aucun exercice détecté. Reformulez.')
                    }
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
                    if (msg.includes('API key') || msg.includes('API_KEY') || msg.includes('401') || msg.includes('403')) {
                      setGenerateError('Authentification IA échouée. Réessayez dans quelques minutes.')
                    } else if (msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                      setGenerateError('Quota IA dépassé. Réessayez plus tard.')
                    } else if (err instanceof SyntaxError) {
                      setGenerateError('Réponse IA invalide. Réessayez.')
                    } else {
                      setGenerateError(msg)
                    }
                  } finally { setGenerating(false) }
                }}
                disabled={!exerciceDictation.trim() || generating}
                style={{
                  flex: 1, padding: '0.6rem 0.75rem', borderRadius: 10,
                  border: '1px solid var(--primary-dark)',
                  background: exerciceDictation.trim() && !generating ? 'var(--primary)' : 'var(--secondary)',
                  color: exerciceDictation.trim() && !generating ? 'white' : 'var(--text-muted)',
                  fontWeight: 600, fontSize: '0.84rem',
                  cursor: exerciceDictation.trim() && !generating ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: exerciceDictation.trim() && !generating ? 1 : 0.6,
                }}
              >
                {generating ? (
                  <>
                    <span style={{ width: 12, height: 12, border: '1.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Génération…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
                    </svg>
                    Intégrer les exercices
                  </>
                )}
              </button>
              {onExportExercicesPDF && exercicesDomicile.length > 0 && (
                <button
                  onClick={() => onExportExercicesPDF(exercicesDomicile)}
                  style={{
                    padding: '0.6rem 0.85rem', borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    background: 'white', color: 'var(--primary-dark)',
                    fontWeight: 600, fontSize: '0.84rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  PDF
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    )

    // ── VOCAL MODE ───────────────────────────────────────────────
    if (mode === 'vocal') {
      return (
        <div>
          <BilanModeToggle mode={mode} onChange={setMode} />
          <BilanVocalMode zone={zone ?? 'Séance'} initialReport={vocalReport} onChange={setVocalReport} />
        </div>
      )
    }

    // ── CORE MODE (flat, simple) ──────────────────────────────────
    if (coreMode) {
      return (
        <div>
          <BilanModeToggle mode={mode} onChange={setMode} />

          {/* EVN DU JOUR */}
          <div style={{ marginBottom: 20 }}>
            <div style={sectionLabel}>EVN du jour</div>
            <EVASlider label="" value={eva} onChange={setEva} />
          </div>

          {/* TECHNIQUES UTILISÉES */}
          <div style={{ marginBottom: 20 }}>
            <div style={sectionLabel}>Techniques utilisées</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {INTERVENTIONS_CORE.map(i => (
                <button key={i} className={`choix-btn${interventions.includes(i) ? ' active' : ''}`}
                  onClick={() => toggleIntervention(i)}>{i}</button>
              ))}
              {/* Custom interventions added via "Autre" */}
              {interventions.filter(i => !INTERVENTIONS_CORE.includes(i) && !INTERVENTIONS_FULL.includes(i)).map(i => (
                <button key={i} className="choix-btn active"
                  onClick={() => toggleIntervention(i)}>{i}</button>
              ))}
              <button
                className={`choix-btn${showAutreIntervention ? ' active' : ''}`}
                onClick={() => setShowAutreIntervention(p => !p)}
                style={{ fontStyle: 'italic' }}
              >
                Autre…
              </button>
            </div>
            {showAutreIntervention && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  value={autreInterventionText}
                  onChange={e => setAutreInterventionText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && autreInterventionText.trim()) {
                      const val = autreInterventionText.trim()
                      if (!interventions.includes(val)) setInterventions(p => [...p, val])
                      setAutreInterventionText('')
                    }
                  }}
                  placeholder="Ex : Dry needling, Drainage…"
                  autoFocus
                  style={{
                    flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem',
                    border: '1px solid var(--border-color)', borderRadius: 10,
                    background: 'var(--input-bg)', color: 'var(--text-main)', boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={() => {
                    const val = autreInterventionText.trim()
                    if (val && !interventions.includes(val)) setInterventions(p => [...p, val])
                    setAutreInterventionText('')
                  }}
                  disabled={!autreInterventionText.trim()}
                  style={{
                    padding: '0.5rem 0.85rem', borderRadius: 10, border: 'none',
                    background: autreInterventionText.trim() ? 'var(--primary)' : 'var(--secondary)',
                    color: autreInterventionText.trim() ? 'white' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '0.82rem',
                    cursor: autreInterventionText.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Ajouter
                </button>
              </div>
            )}
          </div>

          {/* OBSERVATIONS */}
          <div style={{ marginBottom: 20 }}>
            <div style={sectionLabel}>Observations</div>
            <DictableTextarea
              value={noteSubjective}
              onChange={e => setNoteSubjective(e.target.value)}
              placeholder="Bonne séance. Gains en flexion active (+5°), quadriceps plus réactif..."
              rows={4}
              textareaStyle={{
                width: '100%', padding: '0.7rem 0.9rem', fontSize: '0.88rem',
                color: 'var(--text-main)', background: 'var(--input-bg)',
                border: '1px solid var(--border-color)', borderRadius: 14,
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>

          {exercicesSection}

        </div>
      )
    }

    // ── COMPLETE MODE (SOAP sections) ─────────────────────────────
    const lblStyle: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }
    const inputStyle: React.CSSProperties = {
      width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.88rem',
      color: 'var(--text-main)', background: 'var(--input-bg)',
      border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', marginBottom: 8, boxSizing: 'border-box',
    }

    const sections = [
      { id: 'subjective', title: 'S — Ressenti / Suivi', color: '#1A1A1A' },
      { id: 'objective',  title: 'O — Traitement du jour', color: '#1A1A1A' },
      { id: 'assessment', title: 'A — Réaction', color: '#d97706' },
      { id: 'plan',       title: 'P — Prochaine étape', color: '#059669' },
    ]

    return (
      <div>
        <BilanModeToggle mode={mode} onChange={setMode} />

        {sections.map(sec => (
          <div key={sec.id} style={{ marginBottom: 4 }}>
            <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} color={sec.color} />
            {open[sec.id] && (
              <div style={{ paddingTop: 12, paddingBottom: 8 }}>

                {sec.id === 'subjective' && (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <EVASlider label="EVA actuelle" value={eva} onChange={setEva} />
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Observance exercices domicile</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Fait régulièrement', 'Irrégulièrement', 'Non fait'].map(v => (
                          <button key={v} className={`choix-btn${observance === v ? ' active' : ''}`}
                            onClick={() => setObservance(observance === v ? '' : v)}>{v}</button>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Évolution depuis dernière séance</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Amélioré', 'Stable', 'Aggravé'].map(v => (
                          <button key={v} className={`choix-btn${evolution === v ? ' active' : ''}`}
                            onClick={() => setEvolution(evolution === v ? '' : v)}>{v}</button>
                        ))}
                      </div>
                    </div>

                    <label style={lblStyle}>Note libre (optionnel)</label>
                    <DictableTextarea value={noteSubjective} onChange={e => setNoteSubjective(e.target.value)}
                      textareaStyle={inputStyle} placeholder="Ex : douleur au réveil diminuée, gêne persistante en fin de journée…" rows={2} />
                  </>
                )}

                {sec.id === 'objective' && (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Interventions réalisées</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {INTERVENTIONS_FULL.map(i => (
                          <button key={i} className={`choix-btn${interventions.includes(i) ? ' active' : ''}`}
                            onClick={() => toggleIntervention(i)}>{i}</button>
                        ))}
                        {interventions.filter(i => !INTERVENTIONS_CORE.includes(i) && !INTERVENTIONS_FULL.includes(i)).map(i => (
                          <button key={i} className="choix-btn active"
                            onClick={() => toggleIntervention(i)}>{i}</button>
                        ))}
                        <button
                          className={`choix-btn${showAutreIntervention ? ' active' : ''}`}
                          onClick={() => setShowAutreIntervention(p => !p)}
                          style={{ fontStyle: 'italic' }}
                        >
                          Autre…
                        </button>
                      </div>
                      {showAutreIntervention && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <input
                            value={autreInterventionText}
                            onChange={e => setAutreInterventionText(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && autreInterventionText.trim()) {
                                const val = autreInterventionText.trim()
                                if (!interventions.includes(val)) setInterventions(p => [...p, val])
                                setAutreInterventionText('')
                              }
                            }}
                            placeholder="Ex : Dry needling, Drainage…"
                            autoFocus
                            style={{
                              flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem',
                              border: '1px solid var(--border-color)', borderRadius: 10,
                              background: 'var(--input-bg)', color: 'var(--text-main)', boxSizing: 'border-box',
                            }}
                          />
                          <button
                            onClick={() => {
                              const val = autreInterventionText.trim()
                              if (val && !interventions.includes(val)) setInterventions(p => [...p, val])
                              setAutreInterventionText('')
                            }}
                            disabled={!autreInterventionText.trim()}
                            style={{
                              padding: '0.5rem 0.85rem', borderRadius: 10, border: 'none',
                              background: autreInterventionText.trim() ? 'var(--primary)' : 'var(--secondary)',
                              color: autreInterventionText.trim() ? 'white' : 'var(--text-muted)',
                              fontWeight: 700, fontSize: '0.82rem',
                              cursor: autreInterventionText.trim() ? 'pointer' : 'not-allowed',
                            }}
                          >
                            Ajouter
                          </button>
                        </div>
                      )}
                    </div>

                    <label style={lblStyle}>Détail charge / dosage (optionnel)</label>
                    <DictableTextarea value={detailDosage} onChange={e => setDetailDosage(e.target.value)}
                      textareaStyle={inputStyle} placeholder="Ex : presse 3x12 à 40kg, squat 3x10 PDC…" rows={2} />
                  </>
                )}

                {sec.id === 'assessment' && (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Tolérance au traitement du jour</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Bien toléré', 'Partiellement toléré', 'Aggravation transitoire', 'Aggravation persistante'].map(v => (
                          <button key={v} className={`choix-btn${tolerance === v ? ' active' : ''}`}
                            onClick={() => setTolerance(tolerance === v ? '' : v)}>{v}</button>
                        ))}
                      </div>
                    </div>

                    {tolerance !== '' && tolerance !== 'Bien toléré' && (
                      <DictableTextarea value={toleranceDetail} onChange={e => setToleranceDetail(e.target.value)}
                        placeholder="Préciser la réaction…" rows={2}
                        textareaStyle={{ ...inputStyle, background: '#fff7ed', border: '1px solid #fed7aa' }} />
                    )}
                  </>
                )}

                {sec.id === 'plan' && (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Actions pour la prochaine séance</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {PROCHAINES.map(p => (
                          <button key={p} className={`choix-btn${prochaineEtape.includes(p) ? ' active' : ''}`}
                            onClick={() => toggleProchaine(p)}>{p}</button>
                        ))}
                      </div>
                    </div>

                    <label style={lblStyle}>Note libre</label>
                    <DictableTextarea value={notePlan} onChange={e => setNotePlan(e.target.value)}
                      textareaStyle={inputStyle} placeholder="Ex : tester charge supérieure, revoir posture de travail…" rows={2} />

                    <div style={{ marginTop: 16 }}>
                      {exercicesSection}
                    </div>
                  </>
                )}

              </div>
            )}
          </div>
        ))}
      </div>
    )
  }
)

NoteSeance.displayName = 'NoteSeance'
