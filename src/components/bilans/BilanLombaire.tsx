import { useState, useImperativeHandle, forwardRef } from 'react'
import { SmartObjectifsInline } from '../SmartObjectifsInline'
import { AmplitudeInput } from './shared'

export interface BilanLombaireHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

function OuiNon({ label, value, onChange, detail, onDetailChange }: { label: string; value: string; onChange: (v: string) => void; detail?: string; onDetailChange?: (v: string) => void }) {
  return (
    <div className="oui-non-group" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="oui-non-label">{label}</span>
        <div className="oui-non-btns">
          {['Oui', 'Non'].map(v => (
            <button key={v} className={`oui-non-btn${value === v.toLowerCase() ? ' active' : ''}`} onClick={() => onChange(value === v.toLowerCase() ? '' : v.toLowerCase())}>{v}</button>
          ))}
        </div>
      </div>
      {value === 'oui' && onDetailChange && (
        <textarea value={detail ?? ''} onChange={e => onDetailChange(e.target.value)} placeholder="Préciser…" rows={2}
          style={{ marginTop: 6, width: '100%', padding: '0.45rem 0.7rem', fontSize: '0.82rem', color: 'var(--text-main)', background: 'var(--secondary)', border: '1px solid var(--border-color)', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box' }} />
      )}
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

export const BilanLombaire = forwardRef<BilanLombaireHandle, { initialData?: Record<string, unknown> }>(({ initialData }, ref) => {
  const _d  = (initialData?.douleur           as Record<string, unknown>) ?? {}
  const _rf = (initialData?.redFlags          as Record<string, unknown>) ?? {}
  const _yf = (initialData?.yellowFlags       as Record<string, unknown>) ?? {}
  const _bb = (initialData?.blueBlackFlags    as Record<string, unknown>) ?? {}
  const _ec = (initialData?.examClinique      as Record<string, unknown>) ?? {}
  const _ne = (initialData?.neurologique      as Record<string, unknown>) ?? {}
  const _me = (initialData?.mecanosensibilite as Record<string, unknown>) ?? {}
  const _t  = (initialData?.tests            as Record<string, unknown>) ?? {}
  const _sc = (initialData?.scores           as Record<string, unknown>) ?? {}
  const _ct = (initialData?.contrat          as Record<string, unknown>) ?? {}

  const [open, setOpen] = useState<Record<string, boolean>>({ douleur: true })
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.92rem',
    color: 'var(--text-main)', background: 'var(--secondary)',
    border: '1px solid transparent', borderRadius: 'var(--radius-md)', marginBottom: 8,
  }

  const [evnPire, setEvnPire] = useState((_d.evnPire as string) ?? '')
  const [evnMieux, setEvnMieux] = useState((_d.evnMieux as string) ?? '')
  const [evnMoy, setEvnMoy] = useState((_d.evnMoy as string) ?? '')
  const [douleurType, setDouleurType] = useState((_d.douleurType as string) ?? '')
  const [nocturne, setNocturne] = useState((_d.nocturne as string) ?? '')

  const [rf, setRf] = useState<Record<string, string>>({
    tttMedical: '', antecedents: '', comorbidites: '', imageries: '', traumatisme: '',
    fievre: '', pertePoids: '', atcdCancer: '', fonctionVesicale: '', fonctionAnale: '', selleAnesthesie: '',
    ...(_rf as Record<string, string>),
  })
  const [yf, setYf] = useState<Record<string, string>>({ croyances: '', catastrophisme: '', fearAvoidance: '', coping: '', had: '', ...(_yf as Record<string, string>) })
  const [bbf, setBbf] = useState<Record<string, string>>({ at: '', stressTravail: '', conditionsSocio: '', ...(_bb as Record<string, string>) })

  const [morfho, setMorfho] = useState((_ec.morfho as string) ?? '')
  const [mob, setMob] = useState<Record<string, string>>({
    flexion: '', extension: '', inclinaisonD: '', inclinaisonG: '', rotationD: '', rotationG: '', lateralD: '', lateralG: '',
    ...(_ec.mobilite as Record<string, string> ?? {}),
  })
  const updateMob = (k: string, v: string) => setMob(p => ({ ...p, [k]: v }))

  const [neuro, setNeuro] = useState<Record<string, string>>({
    reflexeQuadricipital: '', reflexeAchileen: '', babinski: '', deficitMoteur: '', sensibilite: '',
    ...(_ne as Record<string, string>),
  })
  const updateNeuro = (k: string, v: string) => setNeuro(p => ({ ...p, [k]: v }))

  const [mecano, setMecano] = useState<Record<string, string>>({
    lasegue: '', pkb: '', slump: '',
    ...(_me as Record<string, string>),
  })
  const updateMecano = (k: string, v: string) => setMecano(p => ({ ...p, [k]: v }))

  const [tests, setTests] = useState<Record<string, string>>({
    clusterLaslett: '', extensionRotation: '', proneInstability: '', ta: '',
    ...(_t as Record<string, string>),
  })
  const updateTest = (k: string, v: string) => setTests(p => ({ ...p, [k]: v }))

  const [scores, setScores] = useState<Record<string, string>>({
    startBack: '', orebro: '', fabq: '', had: '', eifel: '', dn4: '', painDetect: '', isc: '', psfs: '',
    ...(_sc as Record<string, string>),
  })
  const updateScore = (k: string, v: string) => setScores(p => ({ ...p, [k]: v }))

  const [objectifs, setObjectifs] = useState<Array<{id: number; titre: string; cible: string; dateCible: string}>>(
    Array.isArray(_ct.objectifs) ? _ct.objectifs as Array<{id: number; titre: string; cible: string; dateCible: string}>
    : typeof _ct.objectifs === 'string' && (_ct.objectifs as string).trim()
      ? [{ id: Date.now(), titre: (_ct.objectifs as string).trim(), cible: '', dateCible: '' }]
      : []
  )
  const [autoReedo, setAutoReedo] = useState((_ct.autoReedo as string) ?? '')
  const [conseils, setConseils] = useState((_ct.conseils as string) ?? '')

  const hasCaudaEquina = rf.fonctionVesicale === 'oui' || rf.fonctionAnale === 'oui' || rf.selleAnesthesie === 'oui'

  useImperativeHandle(ref, () => ({
    getData: () => ({
      douleur: { evnPire, evnMieux, evnMoy, douleurType, nocturne },
      redFlags: rf, yellowFlags: yf, blueBlackFlags: bbf,
      examClinique: { morfho, mobilite: mob },
      neurologique: neuro, mecanosensibilite: mecano,
      tests, scores,
      contrat: { objectifs: objectifs.map(o => o.titre + (o.cible ? ` — ${o.cible}` : '')).join('\n'), objectifsItems: objectifs, autoReedo, conseils },
    }),
    setData: (data: Record<string, unknown>) => {
      const d  = (data.douleur           as Record<string, unknown>) ?? {}
      const rf = (data.redFlags          as Record<string, unknown>) ?? {}
      const yf = (data.yellowFlags       as Record<string, unknown>) ?? {}
      const bb = (data.blueBlackFlags    as Record<string, unknown>) ?? {}
      const ec = (data.examClinique      as Record<string, unknown>) ?? {}
      const ne = (data.neurologique      as Record<string, unknown>) ?? {}
      const me = (data.mecanosensibilite as Record<string, unknown>) ?? {}
      const t  = (data.tests            as Record<string, unknown>) ?? {}
      const sc = (data.scores           as Record<string, unknown>) ?? {}
      const ct = (data.contrat          as Record<string, unknown>) ?? {}
      if (d.evnPire !== undefined)      setEvnPire(d.evnPire as string)
      if (d.evnMieux !== undefined)     setEvnMieux(d.evnMieux as string)
      if (d.evnMoy !== undefined)       setEvnMoy(d.evnMoy as string)
      if (d.douleurType !== undefined)  setDouleurType(d.douleurType as string)
      if (d.nocturne !== undefined)     setNocturne(d.nocturne as string)
      if (Object.keys(rf).length > 0)   setRf(p => ({ ...p, ...rf as Record<string, string> }))
      if (Object.keys(yf).length > 0)   setYf(p => ({ ...p, ...yf as Record<string, string> }))
      if (Object.keys(bb).length > 0)   setBbf(p => ({ ...p, ...bb as Record<string, string> }))
      if (ec.morfho !== undefined)      setMorfho(ec.morfho as string)
      if (ec.mobilite !== undefined)    setMob(ec.mobilite as Record<string, string>)
      if (Object.keys(ne).length > 0)   setNeuro(p => ({ ...p, ...ne as Record<string, string> }))
      if (Object.keys(me).length > 0)   setMecano(p => ({ ...p, ...me as Record<string, string> }))
      if (Object.keys(t).length > 0)    setTests(p => ({ ...p, ...t as Record<string, string> }))
      if (Object.keys(sc).length > 0)   setScores(p => ({ ...p, ...sc as Record<string, string> }))
      if (ct.objectifsItems !== undefined) setObjectifs(ct.objectifsItems as Array<{id: number; titre: string; cible: string; dateCible: string}>)
      else if (typeof ct.objectifs === 'string' && (ct.objectifs as string).trim()) setObjectifs([{ id: Date.now(), titre: (ct.objectifs as string).trim(), cible: '', dateCible: '' }])
      if (ct.autoReedo !== undefined)   setAutoReedo(ct.autoReedo as string)
      if (ct.conseils !== undefined)    setConseils(ct.conseils as string)
    },
  }))

  const MOB_LABELS: Record<string, string> = {
    flexion: 'Flexion', extension: 'Extension',
    inclinaisonD: 'Inclinaison droite', inclinaisonG: 'Inclinaison gauche',
    rotationD: 'Rotation droite', rotationG: 'Rotation gauche',
    lateralD: 'Latéral droit', lateralG: 'Latéral gauche',
  }

  return (
    <div>
      {[
        { id: 'douleur', title: 'Douleur', color: 'var(--primary)' },
        { id: 'redFlags', title: 'Red Flags + Syndrome queue de cheval', color: '#dc2626' },
        { id: 'yellowFlags', title: 'Yellow Flags', color: '#d97706' },
        { id: 'blueBlackFlags', title: 'Blue / Black Flags', color: '#7c3aed' },
        { id: 'examClinique', title: 'Examen clinique', color: 'var(--primary)' },
        { id: 'neurologique', title: 'Bilan neurologique', color: 'var(--primary)' },
        { id: 'mecanosensibilite', title: 'Mécanosensibilité', color: 'var(--primary)' },
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
                    {['Constante', 'Intermittente', 'Mécanique', 'Neurologique'].map(v => (
                      <button key={v} className={`choix-btn${douleurType === v ? ' active' : ''}`} onClick={() => setDouleurType(douleurType === v ? '' : v)}>{v}</button>
                    ))}
                  </div>
                  <OuiNon label="Douleur nocturne" value={nocturne} onChange={setNocturne} />
                </>
              )}

              {sec.id === 'redFlags' && (
                <>
                  {hasCaudaEquina && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.88rem', marginBottom: 4 }}>
                        Urgence — Syndrome queue de cheval
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#7f1d1d', margin: 0 }}>Orientation en urgence aux urgences chirurgicales. IRM immédiate.</p>
                    </div>
                  )}
                  {[
                    ['fonctionVesicale','Trouble fonction vésicale (rétention/incontinence)'],
                    ['fonctionAnale','Trouble fonction anale (incontinence)'],
                    ['selleAnesthesie','Anesthésie en selle'],
                    ['tttMedical','TTT médical actuel'],['antecedents','Antécédents'],['comorbidites','Comorbidités'],
                    ['imageries','Imagerie(s)'],['traumatisme','Traumatisme récent'],['fievre','Fièvre inexpliquée'],
                    ['pertePoids','Perte de poids inexpliquée'],['atcdCancer','ATCD de cancer'],
                  ].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={rf[k]} onChange={v => setRf(p => ({ ...p, [k]: v }))} detail={rf[k + '_detail']} onDetailChange={v => setRf(p => ({ ...p, [k + '_detail']: v }))} />
                  ))}
                </>
              )}

              {sec.id === 'yellowFlags' && (
                <>
                  {[['croyances','Croyances maladaptatives'],['catastrophisme','Catastrophisme'],
                    ['fearAvoidance','Fear-avoidance'],['coping','Coping passif'],['had','Score HAD pathologique']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={yf[k]} onChange={v => setYf(p => ({ ...p, [k]: v }))} detail={yf[k + '_detail']} onDetailChange={v => setYf(p => ({ ...p, [k + '_detail']: v }))} />
                  ))}
                </>
              )}

              {sec.id === 'blueBlackFlags' && (
                <>
                  {[['at','Accident de travail'],['stressTravail','Stress au travail'],['conditionsSocio','Conditions socio-économiques précaires']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={bbf[k]} onChange={v => setBbf(p => ({ ...p, [k]: v }))} detail={bbf[k + '_detail']} onDetailChange={v => setBbf(p => ({ ...p, [k + '_detail']: v }))} />
                  ))}
                </>
              )}

              {sec.id === 'examClinique' && (
                <>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Morphostatique</label>
                  <textarea value={morfho} onChange={e => setMorfho(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Cyphose / lordose / shift latéral…" />
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-dark)', display: 'block', margin: '12px 0 6px' }}>Mobilité lombaire (°)</label>
                  <table className="mobility-table">
                    <thead><tr><th>Mouvement</th><th>Amplitude</th></tr></thead>
                    <tbody>
                      {Object.entries(MOB_LABELS).map(([k, lbl]) => (
                        <tr key={k}><td>{lbl}</td>
                          <td><AmplitudeInput value={mob[k]} onChange={v => updateMob(k, v)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {sec.id === 'neurologique' && (
                <>
                  {[['reflexeQuadricipital','Réflexe quadricipital'],['reflexeAchileen','Réflexe achiléen'],['babinski','Signe de Babinski']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={neuro[k]} onChange={v => updateNeuro(k, v)} />
                  ))}
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', margin: '8px 0 4px' }}>Déficit moteur L2-S4</label>
                  <textarea value={neuro.deficitMoteur} onChange={e => updateNeuro('deficitMoteur', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="L2-L3: fléch hanche, L3-L4: quad, L4-L5: tibial ant, L5-S1: péroniers/fessiers, S1-S2: mollet, S2-S4: périnée" />
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Sensibilité</label>
                  <textarea value={neuro.sensibilite} onChange={e => updateNeuro('sensibilite', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Nociceptive, thermique, épicritique par dermatome…" />
                </>
              )}

              {sec.id === 'mecanosensibilite' && (
                <>
                  {[['lasegue','Lasègue'],['pkb','PKB (femoral)'],['slump','Slump']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={mecano[k]} onChange={v => updateMecano(k, v)} />
                  ))}
                </>
              )}

              {sec.id === 'tests' && (
                <>
                  {[['clusterLaslett','Cluster LASLETT (SIJ)'],['extensionRotation','Test Extension-Rotation'],
                    ['proneInstability','Prone Instability Test'],['ta','TA']].map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={tests[k]} onChange={v => updateTest(k, v)} />
                  ))}
                </>
              )}

              {sec.id === 'scores' && (
                <>
                  {[['startBack','Start Back Screening Tool'],['orebro','Örebro'],['fabq','FABQ'],['had','HAD'],
                    ['eifel','EIFEL-Roland Morris'],['dn4','DN4'],['painDetect','Pain Detect'],['isc','ISC'],['psfs','PSFS']].map(([k, lbl]) => (
                    <ScoreRow key={k} label={lbl} value={scores[k]} onChange={v => updateScore(k, v)} />
                  ))}
                </>
              )}

              {sec.id === 'contrat' && (
                <>
                  <SmartObjectifsInline objectifs={objectifs} onChange={setObjectifs} />
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Auto-rééducation</label>
                  <textarea value={autoReedo} onChange={e => setAutoReedo(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Exercices…" />
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Conseils</label>
                  <textarea value={conseils} onChange={e => setConseils(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Conseils…" />
                </>
              )}

            </div>
          )}
        </div>
      ))}
    </div>
  )
})

BilanLombaire.displayName = 'BilanLombaire'
