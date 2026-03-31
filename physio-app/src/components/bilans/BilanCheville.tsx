import { useState, useImperativeHandle, forwardRef } from 'react'

export interface BilanChevilleHandle {
  getData: () => Record<string, unknown>
}

interface Section {
  id: string
  title: string
  icon: string
}

const SECTIONS: Section[] = [
  { id: 'douleur',       title: 'Douleur',             icon: '1' },
  { id: 'redFlags',      title: 'Red Flags',            icon: '2' },
  { id: 'ottawa',        title: 'Critères d\'Ottawa',   icon: '3' },
  { id: 'yellowFlags',   title: 'Yellow Flags',         icon: '4' },
  { id: 'blueBlackFlags',title: 'Blue / Black Flags',   icon: '5' },
  { id: 'examClinique',  title: 'Examen clinique',      icon: '6' },
  { id: 'tests',         title: 'Tests spécifiques',    icon: '7' },
  { id: 'scores',        title: 'Scores fonctionnels',  icon: '8' },
  { id: 'contrat',       title: 'Contrat kiné',         icon: '9' },
]

function OuiNon({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="oui-non-group">
      <span className="oui-non-label">{label}</span>
      <div className="oui-non-btns">
        {['Oui', 'Non'].map(v => (
          <button key={v} className={`oui-non-btn${value === v.toLowerCase() ? ' active' : ''}`} onClick={() => onChange(value === v.toLowerCase() ? '' : v.toLowerCase())}>{v}</button>
        ))}
      </div>
    </div>
  )
}

function SectionHeader({ title, open, onToggle, color = 'var(--primary)' }: { title: string; open: boolean; onToggle: () => void; color?: string }) {
  return (
    <button className="bilan-collapsible-header" onClick={onToggle}>
      <span className="bilan-collapsible-title" style={{ color }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        {title}
      </span>
      <svg className={`bilan-collapsible-chevron${open ? ' open' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
  )
}

function MobilityRow({ label, state, onChange }: { label: string; state: { gauche: string; droite: string }; onChange: (side: 'gauche' | 'droite', v: string) => void }) {
  return (
    <tr>
      <td>{label}</td>
      <td><input value={state.gauche} onChange={e => onChange('gauche', e.target.value)} placeholder="—" /></td>
      <td><input value={state.droite} onChange={e => onChange('droite', e.target.value)} placeholder="—" /></td>
    </tr>
  )
}

function ScoreRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="oui-non-group">
      <span className="oui-non-label" style={{ fontSize: '0.85rem' }}>{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: 80, textAlign: 'right', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', fontSize: '0.9rem', color: 'var(--text-main)', padding: '0.1rem 0.3rem' }}
        placeholder="—"
      />
    </div>
  )
}

export const BilanCheville = forwardRef<BilanChevilleHandle>((_, ref) => {
  const [open, setOpen] = useState<Record<string, boolean>>({ douleur: true })

  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  // Douleur
  const [evnPire,   setEvnPire]   = useState('')
  const [evnMieux,  setEvnMieux]  = useState('')
  const [evnMoy,    setEvnMoy]    = useState('')
  const [douleurType, setDouleurType] = useState('')
  const [nocturne,  setNocturne]  = useState('')
  const [derouillage, setDerouillage] = useState('')

  // Red Flags
  const [rf, setRf] = useState<Record<string, string>>({
    tttMedical: '', antecedents: '', comorbidites: '', imageries: '', traumatisme: '', fievre: '', pertePoids: '', atcdCancer: '',
  })
  const updateRf = (k: string, v: string) => setRf(p => ({ ...p, [k]: v }))

  // Ottawa
  const [ottawa, setOttawa] = useState<Record<string, string>>({
    malleoleExternePalpation: '', malleoleInternePalpation: '', naviculairePalpation: '', base5ePalpation: '', appuiImpossible: '',
  })
  const updateOttawa = (k: string, v: string) => setOttawa(p => ({ ...p, [k]: v }))

  // Yellow Flags
  const [yf, setYf] = useState<Record<string, string>>({
    croyances: '', catastrophisme: '', fearAvoidance: '', coping: '', had: '',
  })
  const updateYf = (k: string, v: string) => setYf(p => ({ ...p, [k]: v }))

  // Blue/Black
  const [bbf, setBbf] = useState<Record<string, string>>({
    at: '', stressTravail: '', conditionsSocio: '',
  })
  const updateBbf = (k: string, v: string) => setBbf(p => ({ ...p, [k]: v }))

  // Exam clinique
  const [oedeme, setOedeme] = useState('')
  const [morfho, setMorfho] = useState('')
  const [mob, setMob] = useState<Record<string, { gauche: string; droite: string }>>({
    flexionDorsale:   { gauche: '', droite: '' },
    flexionPlantaire: { gauche: '', droite: '' },
    eversion:         { gauche: '', droite: '' },
    inversion:        { gauche: '', droite: '' },
  })
  const updateMob = (mvt: string, side: 'gauche' | 'droite', v: string) => setMob(p => ({ ...p, [mvt]: { ...p[mvt], [side]: v } }))

  // Tests spécifiques
  const [tests, setTests] = useState<Record<string, string>>({
    altd: '', raltd: '', talerTiltVarus: '', talerTiltValgus: '',
    kleiger: '', fibularTranslation: '', squeeze: '',
    grinding: '', impaction: '', lfh: '', molloy: '',
    footLift: '', bessStatique: '', yBalance: '',
  })
  const updateTest = (k: string, v: string) => setTests(p => ({ ...p, [k]: v }))

  // Scores
  const [scores, setScores] = useState<Record<string, string>>({
    ffaam: '', cait: '', psfs: '',
  })
  const updateScore = (k: string, v: string) => setScores(p => ({ ...p, [k]: v }))

  // Contrat
  const [objectifs, setObjectifs] = useState('')
  const [autoReedo, setAutoReedo] = useState('')
  const [conseils,  setConseils]  = useState('')

  useImperativeHandle(ref, () => ({
    getData: () => ({
      douleur: { evnPire, evnMieux, evnMoy, douleurType, nocturne, derouillage },
      redFlags: rf,
      ottawa,
      yellowFlags: yf,
      blueBlackFlags: bbf,
      examClinique: { morfho, oedeme, mobilite: mob },
      tests,
      scores,
      contrat: { objectifs, autoReedo, conseils },
    }),
  }))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.92rem',
    color: 'var(--text-main)', background: 'var(--secondary)',
    border: '1px solid transparent', borderRadius: 'var(--radius-md)',
    marginBottom: 8,
  }

  return (
    <div>
      {SECTIONS.map(sec => (
        <div key={sec.id} style={{ marginBottom: 4 }}>
          <SectionHeader
            title={sec.title}
            open={!!open[sec.id]}
            onToggle={() => toggle(sec.id)}
            color={sec.id === 'redFlags' ? '#dc2626' : sec.id === 'yellowFlags' ? '#d97706' : sec.id === 'blueBlackFlags' ? '#7c3aed' : 'var(--primary)'}
          />
          {open[sec.id] && (
            <div style={{ paddingTop: 12, paddingBottom: 8 }}>

              {sec.id === 'douleur' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[['EVN Pire', evnPire, setEvnPire], ['EVN Mieux', evnMieux, setEvnMieux], ['EVN Moy.', evnMoy, setEvnMoy]].map(([lbl, val, setter]) => (
                      <div key={lbl as string}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{lbl as string}</label>
                        <input type="number" min="0" max="10" value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)}
                          style={{ ...inputStyle, textAlign: 'center', marginBottom: 0 }} placeholder="0-10" />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {['Constante', 'Intermittente'].map(v => (
                      <button key={v} className={`choix-btn${douleurType === v ? ' active' : ''}`} onClick={() => setDouleurType(douleurType === v ? '' : v)}>{v}</button>
                    ))}
                  </div>
                  <OuiNon label="Douleur nocturne" value={nocturne} onChange={setNocturne} />
                  <OuiNon label="Dérouillage matinal" value={derouillage} onChange={setDerouillage} />
                </>
              )}

              {sec.id === 'redFlags' && (
                <>
                  {[
                    ['tttMedical','TTT médical actuel'],['antecedents','Antécédents'],['comorbidites','Comorbidités'],
                    ['imageries','Imagerie(s)'],['traumatisme','Traumatisme récent'],['fievre','Fièvre inexpliquée'],
                    ['pertePoids','Perte de poids inexpliquée'],['atcdCancer','ATCD de cancer'],
                  ].map(([k, lbl]) => <OuiNon key={k} label={lbl} value={rf[k]} onChange={v => updateRf(k, v)} />)}
                </>
              )}

              {sec.id === 'ottawa' && (
                <>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>Si un critère est positif → radiographie recommandée</p>
                  {[
                    ['malleoleExternePalpation', 'Douleur à la palpation malléole externe'],
                    ['malleoleInternePalpation', 'Douleur à la palpation malléole interne'],
                    ['naviculairePalpation',     'Douleur à la palpation du naviculaire'],
                    ['base5ePalpation',          'Douleur à la palpation base 5e métatarse'],
                    ['appuiImpossible',          'Incapacité à faire 4 pas en appui'],
                  ].map(([k, lbl]) => <OuiNon key={k} label={lbl} value={ottawa[k]} onChange={v => updateOttawa(k, v)} />)}
                </>
              )}

              {sec.id === 'yellowFlags' && (
                <>
                  {[
                    ['croyances','Croyances maladaptatives'],['catastrophisme','Catastrophisme'],
                    ['fearAvoidance','Fear-avoidance'],['coping','Stratégies de coping passif'],['had','Score HAD pathologique'],
                  ].map(([k, lbl]) => <OuiNon key={k} label={lbl} value={yf[k]} onChange={v => updateYf(k, v)} />)}
                </>
              )}

              {sec.id === 'blueBlackFlags' && (
                <>
                  {[
                    ['at','Accident de travail (AT)'],['stressTravail','Stress au travail'],['conditionsSocio','Conditions socio-économiques précaires'],
                  ].map(([k, lbl]) => <OuiNon key={k} label={lbl} value={bbf[k]} onChange={v => updateBbf(k, v)} />)}
                </>
              )}

              {sec.id === 'examClinique' && (
                <>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Morphostatique</label>
                  <textarea value={morfho} onChange={e => setMorfho(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Valgus / varus / œdème…" />
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Technique en 8 — Œdème (cm)</label>
                  <input value={oedeme} onChange={e => setOedeme(e.target.value)} style={inputStyle} placeholder="Ex: G: 52 cm / D: 48 cm" />
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-dark)', display: 'block', margin: '12px 0 6px' }}>Mobilité active/passive (°)</label>
                  <table className="mobility-table">
                    <thead><tr><th>Mouvement</th><th>Gauche</th><th>Droite</th></tr></thead>
                    <tbody>
                      {[
                        ['flexionDorsale','Flexion dorsale'],['flexionPlantaire','Flexion plantaire'],
                        ['eversion','Éversion'],['inversion','Inversion'],
                      ].map(([k, lbl]) => (
                        <MobilityRow key={k} label={lbl} state={mob[k]} onChange={(s, v) => updateMob(k, s, v)} />
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {sec.id === 'tests' && (
                <>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Talo-crurale</p>
                  {[['altd','ALTD'],['raltd','RALTD'],['talerTiltVarus','Talar Tilt varus'],['talerTiltValgus','Talar Tilt valgus']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={tests[k]} onChange={v => updateTest(k, v)} />
                  ))}
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 8px' }}>Syndesmose</p>
                  {[['kleiger','Kleiger'],['fibularTranslation','Fibular Translation'],['squeeze','Squeeze']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={tests[k]} onChange={v => updateTest(k, v)} />
                  ))}
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 8px' }}>Carrefour postérieur</p>
                  {[['grinding','Grinding'],['impaction','Test d\'impaction'],['lfh','LFH'],['molloy','Molloy']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={tests[k]} onChange={v => updateTest(k, v)} />
                  ))}
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 8px' }}>Équilibre postural</p>
                  {[['footLift','Foot Lift Test'],['bessStatique','BESS statique'],['yBalance','Y Balance Test']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={tests[k]} onChange={v => updateTest(k, v)} />
                  ))}
                </>
              )}

              {sec.id === 'scores' && (
                <>
                  {[['ffaam','F-FAAM'],['cait','Cumberland Ankle Instability Tool (CAIT)'],['psfs','PSFS']].map(([k, lbl]) => (
                    <ScoreRow key={k} label={lbl} value={scores[k]} onChange={v => updateScore(k, v)} />
                  ))}
                </>
              )}

              {sec.id === 'contrat' && (
                <>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Objectifs SMART</label>
                  <textarea value={objectifs} onChange={e => setObjectifs(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="Objectifs spécifiques, mesurables, atteignables…" />
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Auto-rééducation</label>
                  <textarea value={autoReedo} onChange={e => setAutoReedo(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Exercices à domicile…" />
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Conseils / recommandations</label>
                  <textarea value={conseils} onChange={e => setConseils(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Conseils au patient…" />
                </>
              )}

            </div>
          )}
        </div>
      ))}
    </div>
  )
})

BilanCheville.displayName = 'BilanCheville'
