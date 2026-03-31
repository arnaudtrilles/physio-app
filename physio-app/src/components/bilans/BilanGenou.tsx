import { useState, useImperativeHandle, forwardRef } from 'react'

export interface BilanGenouHandle {
  getData: () => Record<string, unknown>
}

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

function ScoreRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="oui-non-group">
      <span className="oui-non-label" style={{ fontSize: '0.85rem' }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 80, textAlign: 'right', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', fontSize: '0.9rem', color: 'var(--text-main)', padding: '0.1rem 0.3rem' }} placeholder="—" />
    </div>
  )
}

export const BilanGenou = forwardRef<BilanGenouHandle>((_, ref) => {
  const [open, setOpen] = useState<Record<string, boolean>>({ douleur: true })
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.92rem',
    color: 'var(--text-main)', background: 'var(--secondary)',
    border: '1px solid transparent', borderRadius: 'var(--radius-md)', marginBottom: 8,
  }

  const [evnPire, setEvnPire] = useState('')
  const [evnMieux, setEvnMieux] = useState('')
  const [evnMoy, setEvnMoy] = useState('')
  const [douleurType, setDouleurType] = useState('')
  const [nocturne, setNocturne] = useState('')

  const [rf, setRf] = useState<Record<string, string>>({
    tttMedical: '', antecedents: '', comorbidites: '', imageries: '', traumatisme: '', fievre: '', pertePoids: '', atcdCancer: '',
  })

  const [yf, setYf] = useState<Record<string, string>>({
    croyances: '', catastrophisme: '', fearAvoidance: '', coping: '', had: '',
  })

  const [bbf, setBbf] = useState<Record<string, string>>({ at: '', stressTravail: '', conditionsSocio: '' })

  const [morfho, setMorfho] = useState('')
  const [mob, setMob] = useState<Record<string, { gauche: string; droite: string }>>({
    flexionGenou: { gauche: '', droite: '' },
    extensionGenou: { gauche: '', droite: '' },
    flexionHanche: { gauche: '', droite: '' },
    extensionHanche: { gauche: '', droite: '' },
  })
  const updateMob = (mvt: string, side: 'gauche' | 'droite', v: string) => setMob(p => ({ ...p, [mvt]: { ...p[mvt], [side]: v } }))

  const [force, setForce] = useState<Record<string, { gauche: string; droite: string }>>({
    quadriceps: { gauche: '', droite: '' },
    ischios:    { gauche: '', droite: '' },
    abducteurs: { gauche: '', droite: '' },
    adducteurs: { gauche: '', droite: '' },
  })
  const updateForce = (m: string, side: 'gauche' | 'droite', v: string) => setForce(p => ({ ...p, [m]: { ...p[m], [side]: v } }))

  const [tests, setTests] = useState<Record<string, string>>({
    lachman: '', tiroir: '', lcl: '', lcm: '',
    thessaly: '', renne: '', noble: '', vague: '', hoffa: '',
    lasegue: '', pkb: '', slump: '',
  })
  const updateTest = (k: string, v: string) => setTests(p => ({ ...p, [k]: v }))

  const [scores, setScores] = useState<Record<string, string>>({
    koos: '', fakps: '', ikdc: '', aclRsi: '', psfs: '', had: '', dn4: '',
  })
  const updateScore = (k: string, v: string) => setScores(p => ({ ...p, [k]: v }))

  const [objectifs, setObjectifs] = useState('')
  const [autoReedo, setAutoReedo] = useState('')
  const [conseils, setConseils] = useState('')

  useImperativeHandle(ref, () => ({
    getData: () => ({
      douleur: { evnPire, evnMieux, evnMoy, douleurType, nocturne },
      redFlags: rf, yellowFlags: yf, blueBlackFlags: bbf,
      examClinique: { morfho, mobilite: mob, force },
      tests, scores,
      contrat: { objectifs, autoReedo, conseils },
    }),
  }))

  const FORCE_LABELS: Record<string, string> = {
    quadriceps: 'Quadriceps', ischios: 'Ischio-jambiers',
    abducteurs: 'Abducteurs hanche', adducteurs: 'Adducteurs hanche',
  }

  return (
    <div>
      {[
        { id: 'douleur', title: 'Douleur', color: 'var(--primary)' },
        { id: 'redFlags', title: 'Red Flags', color: '#dc2626' },
        { id: 'yellowFlags', title: 'Yellow Flags', color: '#d97706' },
        { id: 'blueBlackFlags', title: 'Blue / Black Flags', color: '#7c3aed' },
        { id: 'examClinique', title: 'Examen clinique', color: 'var(--primary)' },
        { id: 'tests', title: 'Tests spécifiques', color: 'var(--primary)' },
        { id: 'scores', title: 'Scores fonctionnels', color: 'var(--primary)' },
        { id: 'contrat', title: 'Contrat kiné', color: '#059669' },
      ].map(sec => (
        <div key={sec.id} style={{ marginBottom: 4 }}>
          <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} color={sec.color} />
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
                </>
              )}

              {sec.id === 'redFlags' && (
                <>
                  {[['tttMedical','TTT médical actuel'],['antecedents','Antécédents'],['comorbidites','Comorbidités'],
                    ['imageries','Imagerie(s)'],['traumatisme','Traumatisme récent'],['fievre','Fièvre inexpliquée'],
                    ['pertePoids','Perte de poids inexpliquée'],['atcdCancer','ATCD de cancer']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={rf[k]} onChange={v => setRf(p => ({ ...p, [k]: v }))} />
                  ))}
                </>
              )}

              {sec.id === 'yellowFlags' && (
                <>
                  {[['croyances','Croyances maladaptatives'],['catastrophisme','Catastrophisme'],
                    ['fearAvoidance','Fear-avoidance'],['coping','Coping passif'],['had','Score HAD pathologique']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={yf[k]} onChange={v => setYf(p => ({ ...p, [k]: v }))} />
                  ))}
                </>
              )}

              {sec.id === 'blueBlackFlags' && (
                <>
                  {[['at','Accident de travail'],['stressTravail','Stress au travail'],['conditionsSocio','Conditions socio-économiques précaires']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={bbf[k]} onChange={v => setBbf(p => ({ ...p, [k]: v }))} />
                  ))}
                </>
              )}

              {sec.id === 'examClinique' && (
                <>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Morphostatique</label>
                  <textarea value={morfho} onChange={e => setMorfho(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Valgus / varus / recurvatum / genu flexum…" />
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-dark)', display: 'block', margin: '12px 0 6px' }}>Mobilité active/passive (°)</label>
                  <table className="mobility-table">
                    <thead><tr><th>Mouvement</th><th>Gauche</th><th>Droite</th></tr></thead>
                    <tbody>
                      {[['flexionGenou','Flexion genou'],['extensionGenou','Extension genou'],['flexionHanche','Flexion hanche'],['extensionHanche','Extension hanche']].map(([k, lbl]) => (
                        <tr key={k}><td>{lbl}</td>
                          <td><input value={mob[k].gauche} onChange={e => updateMob(k, 'gauche', e.target.value)} placeholder="—" /></td>
                          <td><input value={mob[k].droite} onChange={e => updateMob(k, 'droite', e.target.value)} placeholder="—" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-dark)', display: 'block', margin: '12px 0 6px' }}>Force musculaire (MRC /5)</label>
                  <table className="mobility-table">
                    <thead><tr><th>Muscle</th><th>Gauche</th><th>Droite</th></tr></thead>
                    <tbody>
                      {Object.entries(FORCE_LABELS).map(([k, lbl]) => (
                        <tr key={k}><td>{lbl}</td>
                          <td><input value={force[k].gauche} onChange={e => updateForce(k, 'gauche', e.target.value)} placeholder="—" /></td>
                          <td><input value={force[k].droite} onChange={e => updateForce(k, 'droite', e.target.value)} placeholder="—" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {sec.id === 'tests' && (
                <>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Tests ligamentaires</p>
                  {[['lachman','Lachman'],['tiroir','Tiroir antérieur/postérieur'],['lcl','Test LCL'],['lcm','Test LCM']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={tests[k]} onChange={v => updateTest(k, v)} />
                  ))}
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 8px' }}>Tests méniscaux / tendinopathies</p>
                  {[['thessaly','Thessaly'],['renne','Renne'],['noble','Noble'],['vague','Vague rotulien'],['hoffa','Hoffa']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={tests[k]} onChange={v => updateTest(k, v)} />
                  ))}
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 8px' }}>Mécanosensibilité</p>
                  {[['lasegue','Lasègue'],['pkb','PKB'],['slump','Slump']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={tests[k]} onChange={v => updateTest(k, v)} />
                  ))}
                </>
              )}

              {sec.id === 'scores' && (
                <>
                  {[['koos','KOOS'],['fakps','F-AKPS'],['ikdc','IKDC'],['aclRsi','ACL-RSI'],['psfs','PSFS'],['had','HAD'],['dn4','DN4']].map(([k, lbl]) => (
                    <ScoreRow key={k} label={lbl} value={scores[k]} onChange={v => updateScore(k, v)} />
                  ))}
                </>
              )}

              {sec.id === 'contrat' && (
                <>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Objectifs SMART</label>
                  <textarea value={objectifs} onChange={e => setObjectifs(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="Objectifs spécifiques…" />
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Auto-rééducation</label>
                  <textarea value={autoReedo} onChange={e => setAutoReedo(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Exercices à domicile…" />
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Conseils</label>
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

BilanGenou.displayName = 'BilanGenou'
