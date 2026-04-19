import { useState, useImperativeHandle, forwardRef } from 'react'
import { SmartObjectifsInline } from '../SmartObjectifsInline'
import { AmplitudeInput } from './shared'

export interface BilanChevilleHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
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

function MobilityRow({ label, state, onChange }: { label: string; state: { gauche: string; droite: string }; onChange: (side: 'gauche' | 'droite', v: string) => void }) {
  return (
    <tr>
      <td>{label}</td>
      <td><AmplitudeInput value={state.gauche} onChange={v => onChange('gauche', v)} /></td>
      <td><AmplitudeInput value={state.droite} onChange={v => onChange('droite', v)} /></td>
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

export const BilanCheville = forwardRef<BilanChevilleHandle, { initialData?: Record<string, unknown> }>(({ initialData }, ref) => {
  const [open, setOpen] = useState<Record<string, boolean>>({ douleur: true })

  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  const _d  = (initialData?.douleur        as Record<string, unknown>) ?? {}
  const _rf = (initialData?.redFlags       as Record<string, unknown>) ?? {}
  const _ot = (initialData?.ottawa         as Record<string, unknown>) ?? {}
  const _yf = (initialData?.yellowFlags    as Record<string, unknown>) ?? {}
  const _bb = (initialData?.blueBlackFlags as Record<string, unknown>) ?? {}
  const _ec = (initialData?.examClinique   as Record<string, unknown>) ?? {}
  const _t  = (initialData?.tests         as Record<string, unknown>) ?? {}
  const _sc = (initialData?.scores        as Record<string, unknown>) ?? {}
  const _ct = (initialData?.contrat       as Record<string, unknown>) ?? {}

  // Douleur
  const [evnPire,   setEvnPire]   = useState((_d.evnPire as string) ?? '')
  const [evnMieux,  setEvnMieux]  = useState((_d.evnMieux as string) ?? '')
  const [evnMoy,    setEvnMoy]    = useState((_d.evnMoy as string) ?? '')
  const [douleurType, setDouleurType] = useState((_d.douleurType as string) ?? '')
  const [nocturne,  setNocturne]  = useState((_d.nocturne as string) ?? '')
  const [derouillage, setDerouillage] = useState((_d.derouillage as string) ?? '')

  // Red Flags
  const [rf, setRf] = useState<Record<string, string>>({
    tttMedical: (_rf.tttMedical as string) ?? '', antecedents: (_rf.antecedents as string) ?? '', comorbidites: (_rf.comorbidites as string) ?? '', imageries: (_rf.imageries as string) ?? '', traumatisme: (_rf.traumatisme as string) ?? '', fievre: (_rf.fievre as string) ?? '', pertePoids: (_rf.pertePoids as string) ?? '', atcdCancer: (_rf.atcdCancer as string) ?? '',
  })
  const updateRf = (k: string, v: string) => setRf(p => ({ ...p, [k]: v }))

  // Ottawa
  const [ottawa, setOttawa] = useState<Record<string, string>>({
    malleoleExternePalpation: (_ot.malleoleExternePalpation as string) ?? '', malleoleInternePalpation: (_ot.malleoleInternePalpation as string) ?? '', naviculairePalpation: (_ot.naviculairePalpation as string) ?? '', base5ePalpation: (_ot.base5ePalpation as string) ?? '', appuiImpossible: (_ot.appuiImpossible as string) ?? '',
  })
  const updateOttawa = (k: string, v: string) => setOttawa(p => ({ ...p, [k]: v }))

  // Yellow Flags
  const [yf, setYf] = useState<Record<string, string>>({
    croyances: (_yf.croyances as string) ?? '', catastrophisme: (_yf.catastrophisme as string) ?? '', fearAvoidance: (_yf.fearAvoidance as string) ?? '', coping: (_yf.coping as string) ?? '', had: (_yf.had as string) ?? '',
  })
  const updateYf = (k: string, v: string) => setYf(p => ({ ...p, [k]: v }))

  // Blue/Black
  const [bbf, setBbf] = useState<Record<string, string>>({
    at: (_bb.at as string) ?? '', stressTravail: (_bb.stressTravail as string) ?? '', conditionsSocio: (_bb.conditionsSocio as string) ?? '',
  })
  const updateBbf = (k: string, v: string) => setBbf(p => ({ ...p, [k]: v }))

  // Exam clinique
  const [oedeme, setOedeme] = useState((_ec.oedeme as string) ?? '')
  const [morfho, setMorfho] = useState((_ec.morfho as string) ?? '')
  const [mob, setMob] = useState<Record<string, { gauche: string; droite: string }>>({
    flexionDorsale:   { gauche: ((_ec.mobilite as Record<string, { gauche: string; droite: string }>)?.flexionDorsale?.gauche) ?? '', droite: ((_ec.mobilite as Record<string, { gauche: string; droite: string }>)?.flexionDorsale?.droite) ?? '' },
    flexionPlantaire: { gauche: ((_ec.mobilite as Record<string, { gauche: string; droite: string }>)?.flexionPlantaire?.gauche) ?? '', droite: ((_ec.mobilite as Record<string, { gauche: string; droite: string }>)?.flexionPlantaire?.droite) ?? '' },
    eversion:         { gauche: ((_ec.mobilite as Record<string, { gauche: string; droite: string }>)?.eversion?.gauche) ?? '', droite: ((_ec.mobilite as Record<string, { gauche: string; droite: string }>)?.eversion?.droite) ?? '' },
    inversion:        { gauche: ((_ec.mobilite as Record<string, { gauche: string; droite: string }>)?.inversion?.gauche) ?? '', droite: ((_ec.mobilite as Record<string, { gauche: string; droite: string }>)?.inversion?.droite) ?? '' },
  })
  const updateMob = (mvt: string, side: 'gauche' | 'droite', v: string) => setMob(p => ({ ...p, [mvt]: { ...p[mvt], [side]: v } }))

  // Tests spécifiques
  const [tests, setTests] = useState<Record<string, string>>({
    altd: (_t.altd as string) ?? '', raltd: (_t.raltd as string) ?? '', talerTiltVarus: (_t.talerTiltVarus as string) ?? '', talerTiltValgus: (_t.talerTiltValgus as string) ?? '',
    kleiger: (_t.kleiger as string) ?? '', fibularTranslation: (_t.fibularTranslation as string) ?? '', squeeze: (_t.squeeze as string) ?? '',
    grinding: (_t.grinding as string) ?? '', impaction: (_t.impaction as string) ?? '', lfh: (_t.lfh as string) ?? '', molloy: (_t.molloy as string) ?? '',
    footLift: (_t.footLift as string) ?? '', bessStatique: (_t.bessStatique as string) ?? '', yBalance: (_t.yBalance as string) ?? '',
  })
  const updateTest = (k: string, v: string) => setTests(p => ({ ...p, [k]: v }))

  // Scores
  const [scores, setScores] = useState<Record<string, string>>({
    ffaam: (_sc.ffaam as string) ?? '', cait: (_sc.cait as string) ?? '', psfs: (_sc.psfs as string) ?? '',
  })
  const updateScore = (k: string, v: string) => setScores(p => ({ ...p, [k]: v }))

  // Contrat
  const [objectifs, setObjectifs] = useState<Array<{id: number; titre: string; cible: string; dateCible: string}>>(
    Array.isArray(_ct.objectifs) ? _ct.objectifs as Array<{id: number; titre: string; cible: string; dateCible: string}>
    : typeof _ct.objectifs === 'string' && (_ct.objectifs as string).trim()
      ? [{ id: Date.now(), titre: (_ct.objectifs as string).trim(), cible: '', dateCible: '' }]
      : []
  )
  const [autoReedo, setAutoReedo] = useState((_ct.autoReedo as string) ?? '')
  const [conseils,  setConseils]  = useState((_ct.conseils as string) ?? '')

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
      contrat: { objectifs: objectifs.map(o => o.titre + (o.cible ? ` — ${o.cible}` : '')).join('\n'), objectifsItems: objectifs, autoReedo, conseils },
    }),
    setData: (data: Record<string, unknown>) => {
      const d  = (data.douleur        as Record<string, unknown>) ?? {}
      const rf = (data.redFlags       as Record<string, unknown>) ?? {}
      const ot = (data.ottawa         as Record<string, unknown>) ?? {}
      const yf = (data.yellowFlags    as Record<string, unknown>) ?? {}
      const bb = (data.blueBlackFlags as Record<string, unknown>) ?? {}
      const ec = (data.examClinique   as Record<string, unknown>) ?? {}
      const t  = (data.tests         as Record<string, unknown>) ?? {}
      const sc = (data.scores        as Record<string, unknown>) ?? {}
      const ct = (data.contrat       as Record<string, unknown>) ?? {}
      if (d.evnPire !== undefined)      setEvnPire(d.evnPire as string)
      if (d.evnMieux !== undefined)     setEvnMieux(d.evnMieux as string)
      if (d.evnMoy !== undefined)       setEvnMoy(d.evnMoy as string)
      if (d.douleurType !== undefined)  setDouleurType(d.douleurType as string)
      if (d.nocturne !== undefined)     setNocturne(d.nocturne as string)
      if (d.derouillage !== undefined)  setDerouillage(d.derouillage as string)
      if (Object.keys(rf).length > 0)   setRf(p => ({ ...p, ...rf as Record<string, string> }))
      if (Object.keys(ot).length > 0)   setOttawa(p => ({ ...p, ...ot as Record<string, string> }))
      if (Object.keys(yf).length > 0)   setYf(p => ({ ...p, ...yf as Record<string, string> }))
      if (Object.keys(bb).length > 0)   setBbf(p => ({ ...p, ...bb as Record<string, string> }))
      if (ec.morfho !== undefined)      setMorfho(ec.morfho as string)
      if (ec.oedeme !== undefined)      setOedeme(ec.oedeme as string)
      if (ec.mobilite !== undefined)    setMob(ec.mobilite as Record<string, { gauche: string; droite: string }>)
      if (Object.keys(t).length > 0)    setTests(p => ({ ...p, ...t as Record<string, string> }))
      if (Object.keys(sc).length > 0)   setScores(p => ({ ...p, ...sc as Record<string, string> }))
      if (ct.objectifsItems !== undefined) setObjectifs(ct.objectifsItems as Array<{id: number; titre: string; cible: string; dateCible: string}>)
      else if (typeof ct.objectifs === 'string' && (ct.objectifs as string).trim()) setObjectifs([{ id: Date.now(), titre: (ct.objectifs as string).trim(), cible: '', dateCible: '' }])
      if (ct.autoReedo !== undefined)   setAutoReedo(ct.autoReedo as string)
      if (ct.conseils !== undefined)    setConseils(ct.conseils as string)
    },
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
            color={sec.id === 'redFlags' ? 'var(--color-danger)' : sec.id === 'yellowFlags' ? 'var(--color-warning)' : sec.id === 'blueBlackFlags' ? 'var(--color-purple)' : 'var(--primary)'}
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
                  ].map(([k, lbl]) => <OuiNon key={k} label={lbl} value={rf[k]} onChange={v => updateRf(k, v)} detail={rf[k + '_detail']} onDetailChange={v => setRf(p => ({ ...p, [k + '_detail']: v }))} />)}
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
                  ].map(([k, lbl]) => <OuiNon key={k} label={lbl} value={ottawa[k]} onChange={v => updateOttawa(k, v)} detail={ottawa[k + '_detail']} onDetailChange={v => setOttawa(p => ({ ...p, [k + '_detail']: v }))} />)}
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
                  <SmartObjectifsInline objectifs={objectifs} onChange={setObjectifs} />
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
