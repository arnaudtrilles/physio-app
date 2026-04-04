import { useState, useImperativeHandle, forwardRef } from 'react'
import type { BilanType } from '../../types'

export interface BilanIntermediaireHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

// ─── Local helpers ──────────────────────────────────────────────────────────

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

function OuiNon({ label, value, onChange, detail, onDetailChange }: { label: string; value: string; onChange: (v: string) => void; detail?: string; onDetailChange?: (v: string) => void }) {
  return (
    <div className="oui-non-group" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="oui-non-label">{label}</span>
        <div className="oui-non-btns">
          {['Oui', 'Non'].map(v => (
            <button key={v} className={`oui-non-btn${value === v.toLowerCase() ? ' active' : ''}`}
              onClick={() => onChange(value === v.toLowerCase() ? '' : v.toLowerCase())}>{v}</button>
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

function RadioGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map(o => (
          <button key={o} className={`choix-btn${value === o ? ' active' : ''}`} onClick={() => onChange(value === o ? '' : o)}>{o}</button>
        ))}
      </div>
    </div>
  )
}

function ScoreRow({ label, actuel, initial, onActuel, onInitial }: { label: string; actuel: string; initial: string; onActuel: (v: string) => void; onInitial: (v: string) => void }) {
  const inStyle: React.CSSProperties = { width: 70, textAlign: 'center', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', fontSize: '0.88rem', color: 'var(--text-main)', padding: '0.1rem 0.3rem', outline: 'none' }
  return (
    <div className="oui-non-group">
      <span className="oui-non-label" style={{ fontSize: '0.85rem' }}>{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input value={actuel} onChange={e => onActuel(e.target.value)} style={inStyle} placeholder="Actuel" />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ Init :</span>
        <input value={initial} onChange={e => onInitial(e.target.value)} style={inStyle} placeholder="Init." />
      </div>
    </div>
  )
}

// Comparative table for mobility
function CompTable({ rows, data, onChange }: {
  rows: string[]
  data: Record<string, { initial: string; actuel: string; gain: string; sympt: string }>
  onChange: (row: string, field: string, v: string) => void
}) {
  const cellIn: React.CSSProperties = { width: '100%', border: 'none', background: 'transparent', fontSize: '0.78rem', color: 'var(--text-main)', padding: '2px 4px', outline: 'none', borderBottom: '1px solid var(--border-color)' }
  return (
    <div style={{ overflowX: 'auto', marginBottom: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ background: 'var(--secondary)' }}>
            {['Mouvement', 'Initiale (G/D)', 'Actuelle (G/D)', 'Gain', 'Symptômes'].map(h => (
              <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const r = data[row] ?? { initial: '', actuel: '', gain: '', sympt: '' }
            return (
              <tr key={row}>
                <td style={{ padding: '5px 8px', fontWeight: 500, fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--text-main)' }}>{row}</td>
                <td style={{ padding: '3px 4px' }}><input value={r.initial} onChange={e => onChange(row, 'initial', e.target.value)} style={cellIn} placeholder="—" /></td>
                <td style={{ padding: '3px 4px' }}><input value={r.actuel} onChange={e => onChange(row, 'actuel', e.target.value)} style={cellIn} placeholder="—" /></td>
                <td style={{ padding: '3px 4px' }}><input value={r.gain} onChange={e => onChange(row, 'gain', e.target.value)} style={cellIn} placeholder="—" /></td>
                <td style={{ padding: '3px 4px' }}><input value={r.sympt} onChange={e => onChange(row, 'sympt', e.target.value)} style={cellIn} placeholder="—" /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export const BilanIntermediaire = forwardRef<
  BilanIntermediaireHandle,
  { bilanType: BilanType; initialData?: Record<string, unknown> }
>(({ bilanType, initialData }, ref) => {

  const _tc  = (initialData?.troncCommun     as Record<string, unknown>) ?? {}
  const _evn = (_tc.evn                      as Record<string, unknown>) ?? {}
  const _dn  = (_tc.douleurNocturne          as Record<string, unknown>) ?? {}
  const _der = (_tc.derouillage              as Record<string, unknown>) ?? {}
  const _fl  = (_tc.flags                    as Record<string, unknown>) ?? {}
  const _sv  = (_tc.suivi                    as Record<string, unknown>) ?? {}
  const _ps  = (_tc.psfs                     as Record<string, unknown>) ?? {}
  const _rfi = (_fl.redFlagItems             as Record<string, string>)  ?? {}
  const _mod = (initialData?.moduleSpecifique as Record<string, unknown>) ?? {}
  const _mob = (_mod.mobilite                as Record<string, unknown>) ?? {}
  const _sc  = (_mod.scores                  as Record<string, unknown>) ?? {}
  const _syn = (initialData?.synthese        as Record<string, unknown>) ?? {}

  const [open, setOpen] = useState<Record<string, boolean>>({ infosGenerales: true, evolutionDouleur: true })
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.88rem',
    color: 'var(--text-main)', background: 'var(--secondary)',
    border: '1px solid transparent', borderRadius: 'var(--radius-md)', marginBottom: 8,
  }
  const taStyle: React.CSSProperties = {
    ...inputStyle, resize: 'vertical', minHeight: 72,
  }

  // ── Tronc commun state ───────────────────────────────────────────────────
  const [prescripteur, setPrescripteur]   = useState((_tc.prescripteur as string) ?? '')
  const [nbSeances,    setNbSeances]      = useState((_tc.nbSeances    as string) ?? '')
  const [localisation, setLocalisation]   = useState((_tc.localisation as string) ?? '')
  const [evnPireAct,   setEvnPireAct]     = useState((_evn.pireActuel  as string) ?? '')
  const [evnPireInit,  setEvnPireInit]    = useState((_evn.pireInitial as string) ?? '')
  const [evnMieuxAct,  setEvnMieuxAct]   = useState((_evn.mieuxActuel as string) ?? '')
  const [evnMieuxInit, setEvnMieuxInit]  = useState((_evn.mieuxInitial as string) ?? '')
  const [evnMoyAct,    setEvnMoyAct]     = useState((_evn.moyActuel   as string) ?? '')
  const [evnMoyInit,   setEvnMoyInit]    = useState((_evn.moyInitial  as string) ?? '')
  const [evolutionGlobale, setEvolutionGlobale] = useState((_tc.evolutionGlobale as string) ?? '')
  const [dnActuelle,   setDnActuelle]    = useState((_dn.actuelle     as string) ?? '')
  const [dnInitiale,   setDnInitiale]    = useState((_dn.initiale     as string) ?? '')
  const [derAct,       setDerAct]        = useState((_der.actuel      as string) ?? '')
  const [derInit,      setDerInit]       = useState((_der.initial     as string) ?? '')
  const [redFlagNouv,  setRedFlagNouv]   = useState((_fl.redFlagNouveau as string) ?? '')
  const [redFlagItems, setRedFlagItems]  = useState<Record<string, string>>(_rfi)
  const updateRedFlag = (k: string, v: string) => setRedFlagItems(p => ({ ...p, [k]: v }))
  const [catastrophisme, setCatastrophisme] = useState((_fl.catastrophisme as string) ?? '')
  const [autoEff,      setAutoEff]       = useState((_fl.autoEfficacite       as string) ?? '')
  const [autoEffInit,  setAutoEffInit]   = useState((_fl.autoEfficaciteInitiale as string) ?? '')
  const [tolerance,    setTolerance]     = useState((_sv.tolerance     as string) ?? '')
  const [toleranceDetail, setToleranceDetail] = useState((_sv.toleranceDetail as string) ?? '')
  const [observance,   setObservance]    = useState((_sv.observance    as string) ?? '')
  const [observanceDetail, setObservanceDetail] = useState((_sv.observanceDetail as string) ?? '')
  const [freins,       setFreins]        = useState<string[]>((_sv.freins as string[]) ?? [])
  const [psfsNom1,     setPsfsNom1]      = useState((_ps.nom1   as string) ?? '')
  const [psfsNom2,     setPsfsNom2]      = useState((_ps.nom2   as string) ?? '')
  const [psfsNom3,     setPsfsNom3]      = useState((_ps.nom3   as string) ?? '')
  const [psfs1Act,     setPsfs1Act]      = useState((_ps.act1    as string) ?? '')
  const [psfs1Init,    setPsfs1Init]     = useState((_ps.init1   as string) ?? '')
  const [psfs2Act,     setPsfs2Act]      = useState((_ps.act2    as string) ?? '')
  const [psfs2Init,    setPsfs2Init]     = useState((_ps.init2   as string) ?? '')
  const [psfs3Act,     setPsfs3Act]      = useState((_ps.act3    as string) ?? '')
  const [psfs3Init,    setPsfs3Init]     = useState((_ps.init3   as string) ?? '')

  // ── Module spécifique state ──────────────────────────────────────────────
  const [scores, setScores] = useState<Record<string, string>>({
    faamAct: '', faamInit: '', cumberlandAct: '', cumberlandInit: '',
    ossAct: '', ossInit: '', constantAct: '', constantInit: '', dashAct: '', dashInit: '',
    koosAct: '', koosInit: '', ikdcAct: '', ikdcInit: '',
    hoosAct: '', hoosInit: '', oxfordHipAct: '', oxfordHipInit: '',
    ndiAct: '', ndiInit: '',
    startBackAct: '', startBackInit: '', eifelAct: '', eifelInit: '',
    ...(_sc as Record<string, string>),
  })
  const updScore = (k: string, v: string) => setScores(p => ({ ...p, [k]: v }))

  const initMob = (rows: string[]) => {
    const base: Record<string, { initial: string; actuel: string; gain: string; sympt: string }> = {}
    rows.forEach(r => { base[r] = { initial: '', actuel: '', gain: '', sympt: '' } })
    const saved = _mob as Record<string, { initial: string; actuel: string; gain: string; sympt: string }>
    rows.forEach(r => { if (saved[r]) base[r] = { ...base[r], ...saved[r] } })
    return base
  }

  const mobCheville = ['Flexion', 'Extension', 'Inversion', 'Éversion']
  const mobEpaule   = ['Flexion', 'Abduction', 'RE 1', 'RE 2', 'RI 1', 'RI 2']
  const mobGenou    = ['Flexion', 'Extension', 'RE / RI tibiale']
  const mobHanche   = ['Flexion', 'Abduction', 'Adduction', 'Extension', 'RE / RI']
  const mobCervical = ['Flexion / Extension', 'Protrusion / Rétraction', 'Rotation D / G', 'Inclinaison D / G']
  const mobLombaire = ['Flexion / Extension', 'Glissement Latéral D/G', 'Inclinaison D / G', 'Rotation D / G']

  const getMobRows = () => {
    if (bilanType === 'cheville') return mobCheville
    if (bilanType === 'epaule')   return mobEpaule
    if (bilanType === 'genou')    return mobGenou
    if (bilanType === 'hanche')   return mobHanche
    if (bilanType === 'cervical') return mobCervical
    if (bilanType === 'lombaire') return mobLombaire
    return []
  }

  const [mob, setMob] = useState(() => initMob(getMobRows()))
  const updateMob = (row: string, field: string, v: string) =>
    setMob(p => ({ ...p, [row]: { ...p[row], [field]: v } }))

  const [oedeme,        setOedeme]        = useState((_mod.oedeme        as string) ?? '')
  const [wbLunge,       setWbLunge]       = useState((_mod.wbLunge        as string) ?? '')
  const [yBalance,      setYBalance]      = useState((_mod.yBalanceAct    as string) ?? '')
  const [yBalanceInit,  setYBalanceInit]  = useState((_mod.yBalanceInit   as string) ?? '')
  const [fonctionnel,   setFonctionnel]   = useState((_mod.fonctionnel    as string) ?? '')
  const [testsSpec,     setTestsSpec]     = useState((_mod.testsSpec      as string) ?? '')
  const [re2Stab,       setRe2Stab]       = useState((_mod.re2Stab        as string) ?? '')
  const [ri2Stab,       setRi2Stab]       = useState((_mod.ri2Stab        as string) ?? '')
  const [forceMusc,     setForceMusc]     = useState((_mod.forceMusc      as string) ?? '')
  const [morpho,        setMorpho]        = useState((_mod.morpho         as string) ?? '')
  const [mouvRep,       setMouvRep]       = useState((_mod.mouvementsRepetes as string) ?? '')
  const [neuroMecano,   setNeuroMecano]   = useState((_mod.neuroMecano    as string) ?? '')
  const [modifSympt,    setModifSympt]    = useState((_mod.modifSymptomes as string) ?? '')

  // ── Synthèse state ───────────────────────────────────────────────────────
  const [bilanEvol,     setBilanEvol]     = useState((_syn.bilanEvolution as string) ?? '')
  const [validObjSmrt,  setValidObjSmrt]  = useState((_syn.validationObjectifs as string) ?? '')
  const [obj1,          setObj1]          = useState(((_syn.nouveauxObjectifs as string[]) ?? [])[0] ?? '')
  const [obj2,          setObj2]          = useState(((_syn.nouveauxObjectifs as string[]) ?? [])[1] ?? '')
  const [obj3,          setObj3]          = useState(((_syn.nouveauxObjectifs as string[]) ?? [])[2] ?? '')
  const [ajustPlan,     setAjustPlan]     = useState((_syn.ajustementPlan       as string) ?? '')
  const [priorities,    setPriorities]    = useState((_syn.nouvellesPriorites   as string) ?? '')
  const [exercices,     setExercices]     = useState((_syn.nouveauxExercices    as string) ?? '')

  // ── Expose ref ───────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getData: () => ({
      troncCommun: {
        prescripteur, nbSeances, localisation, evolutionGlobale,
        evn: { pireActuel: evnPireAct, pireInitial: evnPireInit, mieuxActuel: evnMieuxAct, mieuxInitial: evnMieuxInit, moyActuel: evnMoyAct, moyInitial: evnMoyInit },
        douleurNocturne: { actuelle: dnActuelle, initiale: dnInitiale },
        derouillage: { actuel: derAct, initial: derInit },
        flags: { redFlagNouveau: redFlagNouv, redFlagItems, catastrophisme, autoEfficacite: autoEff, autoEfficaciteInitiale: autoEffInit },
        suivi: { tolerance, toleranceDetail, observance, observanceDetail, freins },
        psfs: { nom1: psfsNom1, nom2: psfsNom2, nom3: psfsNom3, act1: psfs1Act, init1: psfs1Init, act2: psfs2Act, init2: psfs2Init, act3: psfs3Act, init3: psfs3Init },
      },
      moduleSpecifique: {
        scores, mobilite: mob,
        oedeme, wbLunge, yBalanceAct: yBalance, yBalanceInit, fonctionnel, testsSpec,
        re2Stab, ri2Stab, forceMusc, morpho, mouvementsRepetes: mouvRep, neuroMecano, modifSymptomes: modifSympt,
      },
      synthese: {
        bilanEvolution: bilanEvol, validationObjectifs: validObjSmrt,
        nouveauxObjectifs: [obj1, obj2, obj3],
        ajustementPlan: ajustPlan, nouvellesPriorites: priorities, nouveauxExercices: exercices,
      },
    }),
    setData: (data: Record<string, unknown>) => {
      const tc  = (data.troncCommun       as Record<string, unknown>) ?? {}
      const evn = (tc.evn                 as Record<string, unknown>) ?? {}
      const dn  = (tc.douleurNocturne     as Record<string, unknown>) ?? {}
      const der = (tc.derouillage         as Record<string, unknown>) ?? {}
      const fl  = (tc.flags               as Record<string, unknown>) ?? {}
      const sv  = (tc.suivi               as Record<string, unknown>) ?? {}
      const ps  = (tc.psfs                as Record<string, unknown>) ?? {}
      const mod = (data.moduleSpecifique  as Record<string, unknown>) ?? {}
      const sc  = (mod.scores             as Record<string, unknown>) ?? {}
      const syn = (data.synthese          as Record<string, unknown>) ?? {}
      if (tc.prescripteur)      setPrescripteur(tc.prescripteur as string)
      if (tc.nbSeances)         setNbSeances(tc.nbSeances as string)
      if (tc.localisation)      setLocalisation(tc.localisation as string)
      if (tc.evolutionGlobale)  setEvolutionGlobale(tc.evolutionGlobale as string)
      if (evn.pireActuel)       setEvnPireAct(evn.pireActuel as string)
      if (evn.pireInitial)      setEvnPireInit(evn.pireInitial as string)
      if (evn.mieuxActuel)      setEvnMieuxAct(evn.mieuxActuel as string)
      if (evn.mieuxInitial)     setEvnMieuxInit(evn.mieuxInitial as string)
      if (evn.moyActuel)        setEvnMoyAct(evn.moyActuel as string)
      if (evn.moyInitial)       setEvnMoyInit(evn.moyInitial as string)
      if (dn.actuelle)          setDnActuelle(dn.actuelle as string)
      if (dn.initiale)          setDnInitiale(dn.initiale as string)
      if (der.actuel)           setDerAct(der.actuel as string)
      if (der.initial)          setDerInit(der.initial as string)
      if (fl.redFlagNouveau)    setRedFlagNouv(fl.redFlagNouveau as string)
      if (fl.redFlagItems)      setRedFlagItems(fl.redFlagItems as Record<string, string>)
      if (fl.catastrophisme)    setCatastrophisme(fl.catastrophisme as string)
      if (fl.autoEfficacite)    setAutoEff(fl.autoEfficacite as string)
      if (fl.autoEfficaciteInitiale) setAutoEffInit(fl.autoEfficaciteInitiale as string)
      if (sv.tolerance)         setTolerance(sv.tolerance as string)
      if (sv.toleranceDetail)   setToleranceDetail(sv.toleranceDetail as string)
      if (sv.observance)        setObservance(sv.observance as string)
      if (sv.observanceDetail)  setObservanceDetail(sv.observanceDetail as string)
      if (sv.freins)            setFreins(sv.freins as string[])
      if (ps.nom1) setPsfsNom1(ps.nom1 as string)
      if (ps.nom2) setPsfsNom2(ps.nom2 as string)
      if (ps.nom3) setPsfsNom3(ps.nom3 as string)
      if (ps.act1)  setPsfs1Act(ps.act1 as string)
      if (ps.init1) setPsfs1Init(ps.init1 as string)
      if (ps.act2)  setPsfs2Act(ps.act2 as string)
      if (ps.init2) setPsfs2Init(ps.init2 as string)
      if (ps.act3)  setPsfs3Act(ps.act3 as string)
      if (ps.init3) setPsfs3Init(ps.init3 as string)
      if (Object.keys(sc).length > 0) setScores(p => ({ ...p, ...(sc as Record<string, string>) }))
      if (mod.mobilite) setMob(mod.mobilite as Record<string, { initial: string; actuel: string; gain: string; sympt: string }>)
      if (mod.oedeme)   setOedeme(mod.oedeme as string)
      if (mod.wbLunge)  setWbLunge(mod.wbLunge as string)
      if (mod.yBalanceAct)  setYBalance(mod.yBalanceAct as string)
      if (mod.yBalanceInit) setYBalanceInit(mod.yBalanceInit as string)
      if (mod.fonctionnel)  setFonctionnel(mod.fonctionnel as string)
      if (mod.testsSpec)    setTestsSpec(mod.testsSpec as string)
      if (mod.re2Stab)      setRe2Stab(mod.re2Stab as string)
      if (mod.ri2Stab)      setRi2Stab(mod.ri2Stab as string)
      if (mod.forceMusc)    setForceMusc(mod.forceMusc as string)
      if (mod.morpho)       setMorpho(mod.morpho as string)
      if (mod.mouvementsRepetes) setMouvRep(mod.mouvementsRepetes as string)
      if (mod.neuroMecano)  setNeuroMecano(mod.neuroMecano as string)
      if (mod.modifSymptomes) setModifSympt(mod.modifSymptomes as string)
      if (syn.bilanEvolution)      setBilanEvol(syn.bilanEvolution as string)
      if (syn.validationObjectifs) setValidObjSmrt(syn.validationObjectifs as string)
      if (syn.nouveauxObjectifs) {
        const arr = syn.nouveauxObjectifs as string[]
        if (arr[0]) setObj1(arr[0])
        if (arr[1]) setObj2(arr[1])
        if (arr[2]) setObj3(arr[2])
      }
      if (syn.ajustementPlan)      setAjustPlan(syn.ajustementPlan as string)
      if (syn.nouvellesPriorites)  setPriorities(syn.nouvellesPriorites as string)
      if (syn.nouveauxExercices)   setExercices(syn.nouveauxExercices as string)
    },
  }))

  const toggleFrein = (f: string) => setFreins(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f])

  const sectionLabel: Record<BilanType, string> = {
    epaule: 'Épaule', cheville: 'Cheville', genou: 'Genou', hanche: 'Hanche',
    cervical: 'Rachis Cervical', lombaire: 'Rachis Lombaire', generique: 'Bilan Général',
  }

  const evnRowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }
  const evnInStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.88rem', color: 'var(--text-main)', background: 'var(--secondary)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', textAlign: 'center' }
  const lblStyle: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }

  const sections = [
    { id: 'infosGenerales',   title: 'Informations générales',          color: 'var(--primary)' },
    { id: 'evolutionDouleur', title: 'Évolution de la douleur',         color: '#dc2626' },
    { id: 'vigilanceFlags',   title: 'Vigilance & Drapeaux (Flags)',    color: '#d97706' },
    { id: 'suiviTraitement',  title: 'Suivi du traitement et observance', color: '#7c3aed' },
    { id: 'moduleSpecifique', title: `Module spécifique : ${sectionLabel[bilanType]}`, color: 'var(--primary)' },
    { id: 'synthese',         title: 'Synthèse et objectifs',           color: '#059669' },
  ]

  return (
    <div>
      {sections.map(sec => (
        <div key={sec.id} style={{ marginBottom: 4 }}>
          <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} color={sec.color} />
          {open[sec.id] && (
            <div style={{ paddingTop: 12, paddingBottom: 8 }}>

              {/* ── INFORMATIONS GÉNÉRALES ─────────────────────────── */}
              {sec.id === 'infosGenerales' && (
                <>
                  <label style={lblStyle}>Prescripteur</label>
                  <input value={prescripteur} onChange={e => setPrescripteur(e.target.value)} style={inputStyle} placeholder="Nom du prescripteur" />
                  <label style={lblStyle}>Nombre de séances réalisées</label>
                  <input type="number" value={nbSeances} onChange={e => setNbSeances(e.target.value)} style={{ ...inputStyle, width: 120 }} placeholder="0" min="0" />
                </>
              )}

              {/* ── ÉVOLUTION DE LA DOULEUR ────────────────────────── */}
              {sec.id === 'evolutionDouleur' && (
                <>
                  <RadioGroup label="Localisation actuelle" value={localisation} onChange={setLocalisation}
                    options={['Idem', 'Modifiée', 'Étendue', 'Réduite']} />

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>EVN (0-10) Actuelle vs Initiale</div>
                    {[
                      ['Pire', evnPireAct, setEvnPireAct, evnPireInit, setEvnPireInit],
                      ['Mieux', evnMieuxAct, setEvnMieuxAct, evnMieuxInit, setEvnMieuxInit],
                      ['Moy.', evnMoyAct, setEvnMoyAct, evnMoyInit, setEvnMoyInit],
                    ].map(([lbl, actVal, actSet, initVal, initSet]) => (
                      <div key={lbl as string} style={evnRowStyle}>
                        <div>
                          <label style={lblStyle}>{lbl as string} — Actuelle</label>
                          <input type="number" min="0" max="10" value={actVal as string}
                            onChange={e => (actSet as (v: string) => void)(e.target.value)}
                            style={evnInStyle} placeholder="0-10" />
                        </div>
                        <div>
                          <label style={lblStyle}>{lbl as string} — Initiale</label>
                          <input type="number" min="0" max="10" value={initVal as string}
                            onChange={e => (initSet as (v: string) => void)(e.target.value)}
                            style={{ ...evnInStyle, opacity: 0.7 }} placeholder="0-10" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <RadioGroup label="Évolution globale" value={evolutionGlobale} onChange={setEvolutionGlobale}
                    options={["S'améliore", 'Stationnaire', 'Se dégrade']} />

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Douleur nocturne</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div>
                        <label style={lblStyle}>Actuelle</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['Oui', 'Non'].map(v => (
                            <button key={v} className={`oui-non-btn${dnActuelle === v.toLowerCase() ? ' active' : ''}`}
                              onClick={() => setDnActuelle(dnActuelle === v.toLowerCase() ? '' : v.toLowerCase())}>{v}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={lblStyle}>Initiale</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['Oui', 'Non'].map(v => (
                            <button key={v} className={`oui-non-btn${dnInitiale === v.toLowerCase() ? ' active' : ''}`}
                              onClick={() => setDnInitiale(dnInitiale === v.toLowerCase() ? '' : v.toLowerCase())}>{v}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                    <div>
                      <label style={lblStyle}>Dérouillage matinal — Actuel (min)</label>
                      <input type="number" value={derAct} onChange={e => setDerAct(e.target.value)} style={evnInStyle} placeholder="min" min="0" />
                    </div>
                    <div>
                      <label style={lblStyle}>Dérouillage matinal — Initial (min)</label>
                      <input type="number" value={derInit} onChange={e => setDerInit(e.target.value)} style={{ ...evnInStyle, opacity: 0.7 }} placeholder="min" min="0" />
                    </div>
                  </div>
                </>
              )}

              {/* ── VIGILANCE & FLAGS ──────────────────────────────── */}
              {sec.id === 'vigilanceFlags' && (
                <>
                  <OuiNon label="Nouveaux Red Flags apparus en cours de prise en charge ?" value={redFlagNouv}
                    onChange={v => { setRedFlagNouv(v); if (v !== 'oui') setRedFlagItems({}) }} />

                  {redFlagNouv === 'oui' && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem', marginTop: 4, marginBottom: 10 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#991b1b', marginBottom: 8 }}>Préciser les nouveaux red flags :</div>
                      {[
                        ['fievre', 'Fièvre inexpliquée'],
                        ['pertePoids', 'Perte de poids inexpliquée'],
                        ['douleurNoctIrred', 'Douleur nocturne irréductible (réveil nocturne)'],
                        ['atcdCancer', 'ATCD de cancer / néoplasie'],
                        ['troublesNeuro', 'Déficit neurologique nouveau'],
                        ['traumatisme', 'Traumatisme récent sévère'],
                        ['troublesSphincter', 'Troubles sphinctériens / Anesthésie en selle'],
                      ].map(([k, lbl]) => (
                        <OuiNon key={k} label={lbl} value={redFlagItems[k] ?? ''} onChange={v => updateRedFlag(k, v)} />
                      ))}
                    </div>
                  )}

                  <RadioGroup label="Catastrophisme / Peur-Évitement (évolution)" value={catastrophisme} onChange={setCatastrophisme}
                    options={['En baisse', 'Stable', 'En hausse']} />

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div>
                        <label style={lblStyle}>Auto-efficacité — Actuelle</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {['Faible', 'Moyen', 'Fort'].map(v => (
                            <button key={v} className={`choix-btn${autoEff === v ? ' active' : ''}`} onClick={() => setAutoEff(autoEff === v ? '' : v)}>{v}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={lblStyle}>Auto-efficacité — Initiale</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {['Faible', 'Moyen', 'Fort'].map(v => (
                            <button key={v} className={`choix-btn${autoEffInit === v ? ' active' : ''}`} onClick={() => setAutoEffInit(autoEffInit === v ? '' : v)}>{v}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ── SUIVI TRAITEMENT & OBSERVANCE ─────────────────── */}
              {sec.id === 'suiviTraitement' && (
                <>
                  <RadioGroup label="Tolérance au traitement" value={tolerance} onChange={setTolerance}
                    options={['Excellente', 'Bonne', 'Moyenne', 'Mauvaise']} />
                  {tolerance !== '' && tolerance !== 'Excellente' && (
                    <textarea value={toleranceDetail} onChange={e => setToleranceDetail(e.target.value)}
                      placeholder="Préciser le problème de tolérance…" rows={2}
                      style={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', color: 'var(--text-main)', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, resize: 'vertical', marginBottom: 10, boxSizing: 'border-box' }} />
                  )}

                  <RadioGroup label="Observance (auto-rééducation)" value={observance} onChange={setObservance}
                    options={['Fait régulièrement', 'Irrégulièrement', 'Non fait']} />
                  {observance !== '' && observance !== 'Fait régulièrement' && (
                    <textarea value={observanceDetail} onChange={e => setObservanceDetail(e.target.value)}
                      placeholder="Préciser les difficultés d'observance…" rows={2}
                      style={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', color: 'var(--text-main)', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, resize: 'vertical', marginBottom: 10, boxSizing: 'border-box' }} />
                  )}

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Freins éventuels (plusieurs possibles)</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {['Manque de temps', 'Douleur', 'Incompréhension'].map(f => (
                        <button key={f} className={`choix-btn${freins.includes(f) ? ' active' : ''}`} onClick={() => toggleFrein(f)}>{f}</button>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: 'var(--secondary)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: 8 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>PSFS — Patient Specific Functional Scale</div>
                    {[
                      ['Activité 1', psfs1Act, setPsfs1Act, psfs1Init, setPsfs1Init, psfsNom1, setPsfsNom1],
                      ['Activité 2', psfs2Act, setPsfs2Act, psfs2Init, setPsfs2Init, psfsNom2, setPsfsNom2],
                      ['Activité 3', psfs3Act, setPsfs3Act, psfs3Init, setPsfs3Init, psfsNom3, setPsfsNom3],
                    ].map(([lbl, actV, actS, initV, initS, nomV, nomS]) => (
                      <div key={lbl as string} style={{ marginBottom: 10, padding: '0.5rem', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <input value={nomV as string} onChange={e => (nomS as (v: string) => void)(e.target.value)}
                          placeholder={`${lbl as string} — nom de l'activité (ex: monter les escaliers)`}
                          style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.82rem', fontStyle: nomV ? 'normal' : 'italic', color: 'var(--text-main)', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', marginBottom: 8, boxSizing: 'border-box', outline: 'none' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <div>
                            <label style={lblStyle}>Score actuel /10</label>
                            <input type="number" min="0" max="10" value={actV as string}
                              onChange={e => (actS as (v: string) => void)(e.target.value)}
                              style={evnInStyle} placeholder="0-10" />
                          </div>
                          <div>
                            <label style={lblStyle}>Score initial /10</label>
                            <input type="number" min="0" max="10" value={initV as string}
                              onChange={e => (initS as (v: string) => void)(e.target.value)}
                              style={{ ...evnInStyle, opacity: 0.7 }} placeholder="0-10" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── MODULE SPÉCIFIQUE ─────────────────────────────── */}
              {sec.id === 'moduleSpecifique' && (
                <>
                  {/* Scores fonctionnels */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Scores fonctionnels</div>
                    {bilanType === 'cheville' && <>
                      <ScoreRow label="FAAM" actuel={scores.faamAct} initial={scores.faamInit} onActuel={v => updScore('faamAct', v)} onInitial={v => updScore('faamInit', v)} />
                      <ScoreRow label="Cumberland Ankle Instability Tool" actuel={scores.cumberlandAct} initial={scores.cumberlandInit} onActuel={v => updScore('cumberlandAct', v)} onInitial={v => updScore('cumberlandInit', v)} />
                    </>}
                    {bilanType === 'epaule' && <>
                      <ScoreRow label="Oxford Shoulder Score (OSS)" actuel={scores.ossAct} initial={scores.ossInit} onActuel={v => updScore('ossAct', v)} onInitial={v => updScore('ossInit', v)} />
                      <ScoreRow label="Constant-Murley" actuel={scores.constantAct} initial={scores.constantInit} onActuel={v => updScore('constantAct', v)} onInitial={v => updScore('constantInit', v)} />
                      <ScoreRow label="DASH" actuel={scores.dashAct} initial={scores.dashInit} onActuel={v => updScore('dashAct', v)} onInitial={v => updScore('dashInit', v)} />
                    </>}
                    {bilanType === 'genou' && <>
                      <ScoreRow label="KOOS" actuel={scores.koosAct} initial={scores.koosInit} onActuel={v => updScore('koosAct', v)} onInitial={v => updScore('koosInit', v)} />
                      <ScoreRow label="IKDC / ACL-RSI" actuel={scores.ikdcAct} initial={scores.ikdcInit} onActuel={v => updScore('ikdcAct', v)} onInitial={v => updScore('ikdcInit', v)} />
                    </>}
                    {bilanType === 'hanche' && <>
                      <ScoreRow label="HOOS" actuel={scores.hoosAct} initial={scores.hoosInit} onActuel={v => updScore('hoosAct', v)} onInitial={v => updScore('hoosInit', v)} />
                      <ScoreRow label="Oxford Hip Score" actuel={scores.oxfordHipAct} initial={scores.oxfordHipInit} onActuel={v => updScore('oxfordHipAct', v)} onInitial={v => updScore('oxfordHipInit', v)} />
                    </>}
                    {bilanType === 'cervical' && <>
                      <ScoreRow label="NDI (Neck Disability Index)" actuel={scores.ndiAct} initial={scores.ndiInit} onActuel={v => updScore('ndiAct', v)} onInitial={v => updScore('ndiInit', v)} />
                    </>}
                    {bilanType === 'lombaire' && <>
                      <ScoreRow label="Start Back Screening Tool" actuel={scores.startBackAct} initial={scores.startBackInit} onActuel={v => updScore('startBackAct', v)} onInitial={v => updScore('startBackInit', v)} />
                      <ScoreRow label="EIFEL / Roland Morris / FABQ" actuel={scores.eifelAct} initial={scores.eifelInit} onActuel={v => updScore('eifelAct', v)} onInitial={v => updScore('eifelInit', v)} />
                    </>}
                  </div>

                  {/* Examen clinique comparatif */}
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Examen clinique comparatif</div>

                  {(bilanType === 'cervical' || bilanType === 'lombaire') && (
                    <>
                      <label style={lblStyle}>Morphostatique</label>
                      <input value={morpho} onChange={e => setMorpho(e.target.value)} style={inputStyle}
                        placeholder={bilanType === 'cervical' ? 'Tête en avant / Torticolis (corrigeable : Oui/Non)' : 'Shift D/G — Amélioration / Correction possible ?'} />
                    </>
                  )}

                  {bilanType === 'cheville' && (
                    <>
                      <label style={lblStyle}>Œdème — Technique en 8 : Actuel ___ cm (Initial ___ cm)</label>
                      <input value={oedeme} onChange={e => setOedeme(e.target.value)} style={inputStyle} placeholder="Ex : 28 cm (initial : 30 cm)" />
                    </>
                  )}

                  {getMobRows().length > 0 && (
                    <>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        {(bilanType === 'cervical' || bilanType === 'lombaire') ? 'Mobilité & Perte d\'amplitude (Maj/Mod/Min/Nulle)' : 'Mobilité active / passive'}
                      </div>
                      <CompTable rows={getMobRows()} data={mob} onChange={updateMob} />
                    </>
                  )}

                  {bilanType === 'epaule' && (
                    <>
                      <label style={lblStyle}>Force musculaire — RE 2 avec/sans stabilisation : Initial → Actuel</label>
                      <input value={re2Stab} onChange={e => setRe2Stab(e.target.value)} style={inputStyle} placeholder="Ex : MRC 3 → MRC 4+" />
                      <label style={lblStyle}>Force musculaire — RI 2 avec/sans stabilisation : Initial → Actuel</label>
                      <input value={ri2Stab} onChange={e => setRi2Stab(e.target.value)} style={inputStyle} placeholder="Ex : MRC 4- → MRC 4+" />
                    </>
                  )}

                  {(bilanType === 'genou' || bilanType === 'hanche') && (
                    <>
                      <label style={lblStyle}>Force musculaire (initial vs actuel)</label>
                      <textarea value={forceMusc} onChange={e => setForceMusc(e.target.value)} style={taStyle}
                        placeholder={bilanType === 'genou' ? 'Quadriceps, Ischios-jambiers, Triceps sural…' : 'Ilio-psoas, Abducteurs, Rotateurs…'} />
                    </>
                  )}

                  {bilanType === 'hanche' && (
                    <>
                      <label style={lblStyle}>Modification des symptômes</label>
                      <textarea value={modifSympt} onChange={e => setModifSympt(e.target.value)} style={taStyle}
                        placeholder="Activation abducteurs (Mieux/Pareil/Pire) ? Modification position lombo-pelvienne ?" />
                    </>
                  )}

                  {bilanType === 'cheville' && (
                    <>
                      <label style={lblStyle}>Weight Bearing Lunge Test</label>
                      <input value={wbLunge} onChange={e => setWbLunge(e.target.value)} style={inputStyle} placeholder="Résultat actuel / initial" />
                      <label style={lblStyle}>Y Balance Test — Actuel vs Initial</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                        <input value={yBalance} onChange={e => setYBalance(e.target.value)} style={evnInStyle} placeholder="Actuel" />
                        <input value={yBalanceInit} onChange={e => setYBalanceInit(e.target.value)} style={{ ...evnInStyle, opacity: 0.7 }} placeholder="Initial" />
                      </div>
                    </>
                  )}

                  {(bilanType === 'cheville' || bilanType === 'genou') && (
                    <>
                      <RadioGroup label="Fonctionnel" value={fonctionnel} onChange={setFonctionnel}
                        options={['Possible', 'Partiellement', 'Impossible']} />
                    </>
                  )}

                  {(bilanType === 'cervical' || bilanType === 'lombaire') && (
                    <>
                      <label style={lblStyle}>Examen des Mouvements Répétés</label>
                      <textarea value={mouvRep} onChange={e => setMouvRep(e.target.value)} style={taStyle}
                        placeholder={bilanType === 'lombaire' ? 'Centralisation maintenue ou évolutive ? Marqueurs actuels…' : 'Évolution des marqueurs et de la centralisation/périphérisation…'} />
                      <label style={lblStyle}>Neuro / Mécanosensibilité</label>
                      <textarea value={neuroMecano} onChange={e => setNeuroMecano(e.target.value)} style={taStyle}
                        placeholder={bilanType === 'lombaire' ? 'Lasègue, PKB, Slump test, déficits radiculaires…' : 'Déficits moteurs/sensitifs, ULTT 1 à 4…'} />
                    </>
                  )}

                  <label style={lblStyle}>Tests spécifiques (évolution des tests initialement positifs)</label>
                  <textarea value={testsSpec} onChange={e => setTestsSpec(e.target.value)} style={taStyle}
                    placeholder={
                      bilanType === 'cheville' ? 'Antero Lateral Drawer, Squeeze test… Positifs / Négatifs' :
                      bilanType === 'epaule'   ? 'Bear Hug, Apprehension test… Positifs / Négatifs' :
                      bilanType === 'genou'    ? 'Lachman, Tiroirs, LCL, LCM — évolution laxité/douleur…' :
                      bilanType === 'hanche'   ? 'FABER, FADDIR, Thomas — positifs / négatifs' :
                      'Tests spécifiques…'
                    } />
                </>
              )}

              {/* ── SYNTHÈSE ET OBJECTIFS ─────────────────────────── */}
              {sec.id === 'synthese' && (
                <>
                  <label style={lblStyle}>Bilan de l'évolution (points forts, points stagnants)</label>
                  <textarea value={bilanEvol} onChange={e => setBilanEvol(e.target.value)} style={taStyle} placeholder="Points forts de la rééducation, points stagnants…" />

                  <RadioGroup label="Validation des anciens objectifs SMART" value={validObjSmrt} onChange={setValidObjSmrt}
                    options={['Atteints', 'Partiellement atteints', 'Non atteints']} />

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Nouveaux objectifs SMART (court / moyen terme)</div>
                    {[[obj1, setObj1, '1'], [obj2, setObj2, '2'], [obj3, setObj3, '3']].map(([val, setter, n]) => (
                      <input key={n as string} value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)}
                        style={{ ...inputStyle, marginBottom: 6 }} placeholder={`Objectif ${n as string}…`} />
                    ))}
                  </div>

                  <label style={lblStyle}>Ajustement du plan de traitement (nouveau contrat kiné)</label>
                  <textarea value={ajustPlan} onChange={e => setAjustPlan(e.target.value)} style={taStyle} placeholder="Nouvelles priorités de prise en charge…" />

                  <label style={lblStyle}>Nouvelles priorités en séance</label>
                  <textarea value={priorities} onChange={e => setPriorities(e.target.value)} style={taStyle} placeholder="Thérapie manuelle, renforcement, contrôle moteur…" />

                  <label style={lblStyle}>Nouveaux exercices d'auto-rééducation remis au patient</label>
                  <textarea value={exercices} onChange={e => setExercices(e.target.value)} style={taStyle} placeholder="Décrire les exercices prescrits…" />
                </>
              )}

            </div>
          )}
        </div>
      ))}
    </div>
  )
})

BilanIntermediaire.displayName = 'BilanIntermediaire'
