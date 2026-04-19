import { useState, useImperativeHandle, forwardRef } from 'react'
import { DictableInput, DictableTextarea } from './VoiceMic'
import { SectionHeader } from './bilans/shared'

export interface NoteSeanceHandle {
  getData: () => NoteSeanceData
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
}

const INTERVENTIONS = [
  'Thérapie manuelle', 'Mobilisations', 'Étirements', 'Renforcement',
  'Proprioception', 'Électrothérapie', 'Cryothérapie',
  'Éducation thérapeutique', 'Travail fonctionnel', 'Neuro-dynamique',
]

const PROCHAINES = [
  'Continuer protocole', 'Augmenter charge', 'Réduire intensité',
  'Ajouter exercice', 'Prévoir bilan intermédiaire', 'Contacter médecin',
]

export const NoteSeance = forwardRef<NoteSeanceHandle, { initialData?: NoteSeanceData }>(
  ({ initialData }, ref) => {
    const [open, setOpen] = useState<Record<string, boolean>>({ subjective: true, objective: true, assessment: true, plan: true })
    const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

    // S — Ressenti / Suivi
    const [eva, setEva] = useState(initialData?.eva ?? '')
    const [observance, setObservance] = useState(initialData?.observance ?? '')
    const [evolution, setEvolution] = useState(initialData?.evolution ?? '')
    const [noteSubjective, setNoteSubjective] = useState(initialData?.noteSubjective ?? '')

    // O — Traitement du jour
    const [interventions, setInterventions] = useState<string[]>(initialData?.interventions ?? [])
    const [detailDosage, setDetailDosage] = useState(initialData?.detailDosage ?? '')

    // A — Réaction
    const [tolerance, setTolerance] = useState(initialData?.tolerance ?? '')
    const [toleranceDetail, setToleranceDetail] = useState(initialData?.toleranceDetail ?? '')

    // P — Prochaine étape
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
      }),
    }))

    const lblStyle: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }
    const inputStyle: React.CSSProperties = {
      width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.88rem',
      color: 'var(--text-main)', background: 'var(--secondary)',
      border: '1px solid transparent', borderRadius: 'var(--radius-md)', marginBottom: 8, boxSizing: 'border-box',
    }

    const sections = [
      { id: 'subjective', title: 'S — Ressenti / Suivi', color: '#4A8C73' },
      { id: 'objective',  title: 'O — Traitement du jour', color: '#059669' },
      { id: 'assessment', title: 'A — Réaction', color: '#d97706' },
      { id: 'plan',       title: 'P — Prochaine étape', color: '#7c3aed' },
    ]

    return (
      <div>
        {sections.map(sec => (
          <div key={sec.id} style={{ marginBottom: 4 }}>
            <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} color={sec.color} />
            {open[sec.id] && (
              <div style={{ paddingTop: 12, paddingBottom: 8 }}>

                {/* ── S — RESSENTI / SUIVI ─────────────────────── */}
                {sec.id === 'subjective' && (
                  <>
                    {/* EVA slider */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={lblStyle}>EVA actuelle (0-10)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="range" min="0" max="10" step="1" value={eva || '0'}
                          onChange={e => setEva(e.target.value)}
                          style={{ flex: 1, accentColor: '#4A8C73' }} />
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#4A8C73', minWidth: 28, textAlign: 'center' }}>
                          {eva || '—'}
                        </span>
                      </div>
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
                    <DictableInput value={noteSubjective} onChange={e => setNoteSubjective(e.target.value)}
                      inputStyle={inputStyle} placeholder="Ex : douleur au réveil diminuée, gêne persistante en fin de journée…" />
                  </>
                )}

                {/* ── O — TRAITEMENT DU JOUR ──────────────────── */}
                {sec.id === 'objective' && (
                  <>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Interventions réalisées</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {INTERVENTIONS.map(i => (
                          <button key={i} className={`choix-btn${interventions.includes(i) ? ' active' : ''}`}
                            onClick={() => toggleIntervention(i)}>{i}</button>
                        ))}
                      </div>
                    </div>

                    <label style={lblStyle}>Détail charge / dosage (optionnel)</label>
                    <DictableInput value={detailDosage} onChange={e => setDetailDosage(e.target.value)}
                      inputStyle={inputStyle} placeholder="Ex : presse 3x12 à 40kg, squat 3x10 PDC…" />
                  </>
                )}

                {/* ── A — RÉACTION ────────────────────────────── */}
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
                        textareaStyle={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', color: 'var(--text-main)', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, resize: 'vertical', marginBottom: 10, boxSizing: 'border-box' }} />
                    )}
                  </>
                )}

                {/* ── P — PROCHAINE ÉTAPE ─────────────────────── */}
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
                    <DictableInput value={notePlan} onChange={e => setNotePlan(e.target.value)}
                      inputStyle={inputStyle} placeholder="Ex : tester charge supérieure, revoir posture de travail…" />
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
