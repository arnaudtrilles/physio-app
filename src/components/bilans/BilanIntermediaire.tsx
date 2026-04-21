import { useState, useImperativeHandle, forwardRef } from 'react'
import { DictableInput, DictableTextarea } from '../VoiceMic'
import type { BilanType } from '../../types'
import { SectionHeader, OuiNon, EVASlider } from './shared'

export interface BilanIntermediaireHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

// ─── Local helpers ──────────────────────────────────────────────────────────

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
    color: 'var(--text-main)', background: '#FDFCFA',
    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', marginBottom: 8,
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
    // common shared
    hadAct: '', hadInit: '', dn4Act: '', dn4Init: '', sensiCAct: '', sensiCInit: '',
    painDetectAct: '', painDetectInit: '',
    // cheville
    faamAct: '', faamInit: '', cumberlandAct: '', cumberlandInit: '',
    // épaule
    ossAct: '', ossInit: '', constantAct: '', constantInit: '', dashAct: '', dashInit: '',
    roweAct: '', roweInit: '',
    // genou
    koosAct: '', koosInit: '', fakpsAct: '', fakpsInit: '', ikdcAct: '', ikdcInit: '',
    aclRsiAct: '', aclRsiInit: '', sf36Act: '', sf36Init: '',
    // hanche
    hoosAct: '', hoosInit: '', oxfordHipAct: '', oxfordHipInit: '',
    hagosAct: '', hagosInit: '', efmiAct: '', efmiInit: '',
    // cervical
    ndiAct: '', ndiInit: '',
    // lombaire
    startBackAct: '', startBackInit: '', eifelAct: '', eifelInit: '',
    orebroAct: '', orebroInit: '', fabqAct: '', fabqInit: '',
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

  const mobCheville = ['Flexion', 'Extension', 'Varus', 'Valgus', 'Inversion', 'Éversion']
  const mobEpaule   = ['Flexion', 'Abduction', 'Adduction', 'Extension', 'RE 1', 'RE 2', 'RI 1', 'RI 2']
  const mobGenou    = ['Flexion', 'Extension', 'RI tibiale', 'RE tibiale']
  const mobHanche   = ['Flexion', 'Abduction', 'Adduction', 'Extension', 'RE', 'RI']
  const mobCervical = ['Flexion', 'Extension', 'Protrusion', 'Rétraction', 'Rotation D', 'Rotation G', 'Inclinaison D', 'Inclinaison G']
  const mobLombaire = ['Flexion', 'Extension', 'Glissement Lat. D', 'Glissement Lat. G', 'Inclinaison D', 'Inclinaison G', 'Rotation D', 'Rotation G']

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

  // ── Force comparative (épaule) ───────────────────────────────────────────
  const FORCE_EPAULE_KEYS: [string, string][] = [
    ['planScapula90',     'Plan scapula à 90° flexion'],
    ['re1',               'RE 1'],
    ['re2StabEpaule',     'RE 2 avec stabilisation'],
    ['re2StabCharge',     'RE 2 avec stab + charge'],
    ['re2SansStab',       'RE 2 sans stabilisation'],
    ['re2SansStabCharge', 'RE 2 sans stab + charge'],
    ['ri2StabEpaule',     'RI 2 avec stabilisation'],
    ['ri2StabCharge',     'RI 2 avec stab + charge'],
    ['ri2SansStab',       'RI 2 sans stabilisation'],
    ['ri2SansStabCharge', 'RI 2 sans stab + charge'],
  ]
  const _fce = (_mod.forceCompareEpaule as Record<string, { initial: string; actuel: string }>) ?? {}
  const initForceEpaule = () => {
    const base: Record<string, { initial: string; actuel: string }> = {}
    FORCE_EPAULE_KEYS.forEach(([k]) => { base[k] = _fce[k] ?? { initial: '', actuel: '' } })
    return base
  }
  const [forceEpaule, setForceEpaule] = useState(initForceEpaule)
  const updForceEp = (k: string, side: 'initial' | 'actuel', v: string) =>
    setForceEpaule(p => ({ ...p, [k]: { ...p[k], [side]: v } }))

  // ── Force comparative — Hanche / Genou / Cheville ────────────────────────
  const FORCE_MI_KEYS: [string, string][] = [
    ['ilioPsoas', 'Ilio-psoas'], ['quadriceps', 'Quadriceps'],
    ['ischios', 'Ischio-jambiers'], ['abducteurs', 'Abducteurs'],
    ['adducteurs', 'Adducteurs'], ['rotateursExt', 'Rotateurs externes'],
    ['rotateursInt', 'Rotateurs internes'], ['tricepsSural', 'Triceps sural'],
  ]
  const FORCE_GENOU_KEYS: [string, string][] = [...FORCE_MI_KEYS, ['tibialAnt', 'Tibial antérieur']]
  const FORCE_CHEVILLE_KEYS: [string, string][] = [
    ...FORCE_MI_KEYS,
    ['tibialAnt', 'Tibial antérieur'], ['tibialPost', 'Tibial postérieur'],
    ['longFibulaire', 'Long fibulaire'], ['courtFibulaire', 'Court fibulaire'],
  ]
  const _fcm = (_mod.forceCompareMI as Record<string, { initial: string; actuel: string }>) ?? {}
  const initForceMI = (keys: [string, string][]) => {
    const base: Record<string, { initial: string; actuel: string }> = {}
    keys.forEach(([k]) => { base[k] = _fcm[k] ?? { initial: '', actuel: '' } })
    return base
  }
  const getForceKeys = () => bilanType === 'genou' ? FORCE_GENOU_KEYS
    : bilanType === 'cheville' ? FORCE_CHEVILLE_KEYS
    : FORCE_MI_KEYS
  const [forceMI, setForceMI] = useState(() => initForceMI(getForceKeys()))
  const updForceMI = (k: string, side: 'initial' | 'actuel', v: string) =>
    setForceMI(p => ({ ...p, [k]: { ...p[k], [side]: v } }))

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
        forceCompareEpaule: forceEpaule,
        forceCompareMI: forceMI,
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
      if (mod.forceCompareEpaule) setForceEpaule(p => ({ ...p, ...(mod.forceCompareEpaule as Record<string, { initial: string; actuel: string }>) }))
      if (mod.forceCompareMI) setForceMI(p => ({ ...p, ...(mod.forceCompareMI as Record<string, { initial: string; actuel: string }>) }))
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
    cervical: 'Rachis Cervical', lombaire: 'Rachis Lombaire', generique: 'Bilan Général', geriatrique: 'Bilan Gériatrique',
  }

  const evnInStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.88rem', color: 'var(--text-main)', background: '#FDFCFA', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', textAlign: 'center' }
  const lblStyle: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }

  const sections = [
    { id: 'infosGenerales',   title: 'Informations générales',          color: '#1A1A1A' },
    { id: 'evolutionDouleur', title: 'Évolution de la douleur',         color: '#991b1b' },
    { id: 'vigilanceFlags',   title: 'Vigilance & Drapeaux (Flags)',    color: '#d97706' },
    { id: 'suiviTraitement',  title: 'Suivi du traitement et observance', color: '#7c3aed' },
    { id: 'moduleSpecifique', title: `Module spécifique : ${sectionLabel[bilanType]}`, color: '#1A1A1A' },
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
                  <DictableInput value={prescripteur} onChange={e => setPrescripteur(e.target.value)} inputStyle={inputStyle} placeholder="Nom du prescripteur" />
                  <label style={lblStyle}>Nombre de séances réalisées</label>
                  <input type="number" value={nbSeances} onChange={e => setNbSeances(e.target.value)} style={{ ...inputStyle, width: 120 }} placeholder="0" min="0" />
                </>
              )}

              {/* ── ÉVOLUTION DE LA DOULEUR ────────────────────────── */}
              {sec.id === 'evolutionDouleur' && (
                <>
                  <RadioGroup label="Localisation actuelle" value={localisation} onChange={setLocalisation}
                    options={['Idem', 'Modifiée', 'Étendue', 'Réduite']} />

                  <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--secondary)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>EVA — Actuelle vs Initiale</div>
                    {([
                      ['EVA Max',  evnPireAct,  setEvnPireAct,  evnPireInit,  setEvnPireInit],
                      ['EVA Min',  evnMieuxAct, setEvnMieuxAct, evnMieuxInit, setEvnMieuxInit],
                      ['EVA Moy.', evnMoyAct,   setEvnMoyAct,   evnMoyInit,   setEvnMoyInit],
                    ] as [string, string, (v: string) => void, string, (v: string) => void][]).map(([lbl, actVal, actSet, initVal, initSet]) => (
                      <div key={lbl} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>{lbl}</div>
                        <EVASlider label="Actuelle" value={actVal} onChange={actSet} compact />
                        <div style={{ height: 6 }} />
                        <EVASlider label="Initiale" value={initVal} onChange={initSet} compact />
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
                    <DictableTextarea value={toleranceDetail} onChange={e => setToleranceDetail(e.target.value)}
                      placeholder="Préciser le problème de tolérance…" rows={2}
                      textareaStyle={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', color: 'var(--text-main)', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, resize: 'vertical', marginBottom: 10, boxSizing: 'border-box' }} />
                  )}

                  <RadioGroup label="Observance (auto-rééducation)" value={observance} onChange={setObservance}
                    options={['Fait régulièrement', 'Irrégulièrement', 'Non fait']} />
                  {observance !== '' && observance !== 'Fait régulièrement' && (
                    <DictableTextarea value={observanceDetail} onChange={e => setObservanceDetail(e.target.value)}
                      placeholder="Préciser les difficultés d'observance…" rows={2}
                      textareaStyle={{ width: '100%', padding: '0.5rem 0.7rem', fontSize: '0.82rem', color: 'var(--text-main)', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, resize: 'vertical', marginBottom: 10, boxSizing: 'border-box' }} />
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
                        <EVASlider label="Score actuel" value={actV as string} onChange={actS as (v: string) => void} compact />
                        <div style={{ height: 6 }} />
                        <EVASlider label="Score initial" value={initV as string} onChange={initS as (v: string) => void} compact />
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
                      <ScoreRow label="Échelle HAD" actuel={scores.hadAct} initial={scores.hadInit} onActuel={v => updScore('hadAct', v)} onInitial={v => updScore('hadInit', v)} />
                      <ScoreRow label="DN4" actuel={scores.dn4Act} initial={scores.dn4Init} onActuel={v => updScore('dn4Act', v)} onInitial={v => updScore('dn4Init', v)} />
                    </>}
                    {bilanType === 'epaule' && <>
                      <ScoreRow label="Oxford Shoulder Score (OSS)" actuel={scores.ossAct} initial={scores.ossInit} onActuel={v => updScore('ossAct', v)} onInitial={v => updScore('ossInit', v)} />
                      <ScoreRow label="Constant-Murley" actuel={scores.constantAct} initial={scores.constantInit} onActuel={v => updScore('constantAct', v)} onInitial={v => updScore('constantInit', v)} />
                      <ScoreRow label="DASH" actuel={scores.dashAct} initial={scores.dashInit} onActuel={v => updScore('dashAct', v)} onInitial={v => updScore('dashInit', v)} />
                      <ScoreRow label="Rowe Score" actuel={scores.roweAct} initial={scores.roweInit} onActuel={v => updScore('roweAct', v)} onInitial={v => updScore('roweInit', v)} />
                      <ScoreRow label="Échelle HAD" actuel={scores.hadAct} initial={scores.hadInit} onActuel={v => updScore('hadAct', v)} onInitial={v => updScore('hadInit', v)} />
                      <ScoreRow label="DN4" actuel={scores.dn4Act} initial={scores.dn4Init} onActuel={v => updScore('dn4Act', v)} onInitial={v => updScore('dn4Init', v)} />
                      <ScoreRow label="Sensibilisation centrale" actuel={scores.sensiCAct} initial={scores.sensiCInit} onActuel={v => updScore('sensiCAct', v)} onInitial={v => updScore('sensiCInit', v)} />
                    </>}
                    {bilanType === 'genou' && <>
                      <ScoreRow label="KOOS" actuel={scores.koosAct} initial={scores.koosInit} onActuel={v => updScore('koosAct', v)} onInitial={v => updScore('koosInit', v)} />
                      <ScoreRow label="F-AKPS" actuel={scores.fakpsAct} initial={scores.fakpsInit} onActuel={v => updScore('fakpsAct', v)} onInitial={v => updScore('fakpsInit', v)} />
                      <ScoreRow label="IKDC" actuel={scores.ikdcAct} initial={scores.ikdcInit} onActuel={v => updScore('ikdcAct', v)} onInitial={v => updScore('ikdcInit', v)} />
                      <ScoreRow label="ACL-RSI" actuel={scores.aclRsiAct} initial={scores.aclRsiInit} onActuel={v => updScore('aclRsiAct', v)} onInitial={v => updScore('aclRsiInit', v)} />
                      <ScoreRow label="SF-36" actuel={scores.sf36Act} initial={scores.sf36Init} onActuel={v => updScore('sf36Act', v)} onInitial={v => updScore('sf36Init', v)} />
                      <ScoreRow label="Échelle HAD" actuel={scores.hadAct} initial={scores.hadInit} onActuel={v => updScore('hadAct', v)} onInitial={v => updScore('hadInit', v)} />
                      <ScoreRow label="DN4" actuel={scores.dn4Act} initial={scores.dn4Init} onActuel={v => updScore('dn4Act', v)} onInitial={v => updScore('dn4Init', v)} />
                    </>}
                    {bilanType === 'hanche' && <>
                      <ScoreRow label="HOOS" actuel={scores.hoosAct} initial={scores.hoosInit} onActuel={v => updScore('hoosAct', v)} onInitial={v => updScore('hoosInit', v)} />
                      <ScoreRow label="Oxford Hip Score" actuel={scores.oxfordHipAct} initial={scores.oxfordHipInit} onActuel={v => updScore('oxfordHipAct', v)} onInitial={v => updScore('oxfordHipInit', v)} />
                      <ScoreRow label="HAGOS" actuel={scores.hagosAct} initial={scores.hagosInit} onActuel={v => updScore('hagosAct', v)} onInitial={v => updScore('hagosInit', v)} />
                      <ScoreRow label="EFMI" actuel={scores.efmiAct} initial={scores.efmiInit} onActuel={v => updScore('efmiAct', v)} onInitial={v => updScore('efmiInit', v)} />
                      <ScoreRow label="Échelle HAD" actuel={scores.hadAct} initial={scores.hadInit} onActuel={v => updScore('hadAct', v)} onInitial={v => updScore('hadInit', v)} />
                      <ScoreRow label="DN4" actuel={scores.dn4Act} initial={scores.dn4Init} onActuel={v => updScore('dn4Act', v)} onInitial={v => updScore('dn4Init', v)} />
                      <ScoreRow label="Sensibilisation centrale" actuel={scores.sensiCAct} initial={scores.sensiCInit} onActuel={v => updScore('sensiCAct', v)} onInitial={v => updScore('sensiCInit', v)} />
                    </>}
                    {bilanType === 'cervical' && <>
                      <ScoreRow label="NDI (Neck Disability Index)" actuel={scores.ndiAct} initial={scores.ndiInit} onActuel={v => updScore('ndiAct', v)} onInitial={v => updScore('ndiInit', v)} />
                      <ScoreRow label="Échelle HAD" actuel={scores.hadAct} initial={scores.hadInit} onActuel={v => updScore('hadAct', v)} onInitial={v => updScore('hadInit', v)} />
                      <ScoreRow label="DN4" actuel={scores.dn4Act} initial={scores.dn4Init} onActuel={v => updScore('dn4Act', v)} onInitial={v => updScore('dn4Init', v)} />
                      <ScoreRow label="Pain Detect" actuel={scores.painDetectAct} initial={scores.painDetectInit} onActuel={v => updScore('painDetectAct', v)} onInitial={v => updScore('painDetectInit', v)} />
                      <ScoreRow label="Sensibilisation centrale" actuel={scores.sensiCAct} initial={scores.sensiCInit} onActuel={v => updScore('sensiCAct', v)} onInitial={v => updScore('sensiCInit', v)} />
                    </>}
                    {bilanType === 'lombaire' && <>
                      <ScoreRow label="Start Back Screening Tool" actuel={scores.startBackAct} initial={scores.startBackInit} onActuel={v => updScore('startBackAct', v)} onInitial={v => updScore('startBackInit', v)} />
                      <ScoreRow label="Örebro" actuel={scores.orebroAct} initial={scores.orebroInit} onActuel={v => updScore('orebroAct', v)} onInitial={v => updScore('orebroInit', v)} />
                      <ScoreRow label="FABQ" actuel={scores.fabqAct} initial={scores.fabqInit} onActuel={v => updScore('fabqAct', v)} onInitial={v => updScore('fabqInit', v)} />
                      <ScoreRow label="EIFEL / Roland Morris" actuel={scores.eifelAct} initial={scores.eifelInit} onActuel={v => updScore('eifelAct', v)} onInitial={v => updScore('eifelInit', v)} />
                      <ScoreRow label="Échelle HAD" actuel={scores.hadAct} initial={scores.hadInit} onActuel={v => updScore('hadAct', v)} onInitial={v => updScore('hadInit', v)} />
                      <ScoreRow label="DN4" actuel={scores.dn4Act} initial={scores.dn4Init} onActuel={v => updScore('dn4Act', v)} onInitial={v => updScore('dn4Init', v)} />
                      <ScoreRow label="Pain Detect" actuel={scores.painDetectAct} initial={scores.painDetectInit} onActuel={v => updScore('painDetectAct', v)} onInitial={v => updScore('painDetectInit', v)} />
                      <ScoreRow label="Sensibilisation centrale" actuel={scores.sensiCAct} initial={scores.sensiCInit} onActuel={v => updScore('sensiCAct', v)} onInitial={v => updScore('sensiCInit', v)} />
                    </>}
                    {bilanType === 'generique' && <>
                      <ScoreRow label="Échelle HAD" actuel={scores.hadAct} initial={scores.hadInit} onActuel={v => updScore('hadAct', v)} onInitial={v => updScore('hadInit', v)} />
                      <ScoreRow label="DN4" actuel={scores.dn4Act} initial={scores.dn4Init} onActuel={v => updScore('dn4Act', v)} onInitial={v => updScore('dn4Init', v)} />
                      <ScoreRow label="Pain Detect" actuel={scores.painDetectAct} initial={scores.painDetectInit} onActuel={v => updScore('painDetectAct', v)} onInitial={v => updScore('painDetectInit', v)} />
                      <ScoreRow label="Sensibilisation centrale (CSI)" actuel={scores.sensiCAct} initial={scores.sensiCInit} onActuel={v => updScore('sensiCAct', v)} onInitial={v => updScore('sensiCInit', v)} />
                      <ScoreRow label="SF-36" actuel={scores.sf36Act} initial={scores.sf36Init} onActuel={v => updScore('sf36Act', v)} onInitial={v => updScore('sf36Init', v)} />
                    </>}
                  </div>

                  {/* Examen clinique comparatif */}
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Examen clinique comparatif</div>

                  {(bilanType === 'cervical' || bilanType === 'lombaire') && (
                    <>
                      <label style={lblStyle}>Morphostatique</label>
                      <DictableInput value={morpho} onChange={e => setMorpho(e.target.value)} inputStyle={inputStyle}
                        placeholder={bilanType === 'cervical' ? 'Tête en avant / Torticolis (corrigeable : Oui/Non)' : 'Shift D/G — Amélioration / Correction possible ?'} />
                    </>
                  )}

                  {bilanType === 'cheville' && (
                    <>
                      <label style={lblStyle}>Œdème — Technique en 8 : Actuel ___ cm (Initial ___ cm)</label>
                      <DictableInput value={oedeme} onChange={e => setOedeme(e.target.value)} inputStyle={inputStyle} placeholder="Ex : 28 cm (initial : 30 cm)" />
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
                      <label style={lblStyle}>Force musculaire (MRC) — Initial → Actuel</label>
                      <div style={{ overflowX: 'auto', marginBottom: 10 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--secondary)' }}>
                              {['Test', 'Initial', 'Actuel'].map(h => (
                                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {FORCE_EPAULE_KEYS.map(([k, lbl]) => (
                              <tr key={k}>
                                <td style={{ padding: '5px 8px', fontSize: '0.78rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{lbl}</td>
                                <td style={{ padding: '3px 4px' }}>
                                  <input value={forceEpaule[k]?.initial ?? ''} onChange={e => updForceEp(k, 'initial', e.target.value)}
                                    placeholder="—" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', fontSize: '0.78rem', color: 'var(--text-main)', padding: '2px 4px', outline: 'none', opacity: 0.7 }} />
                                </td>
                                <td style={{ padding: '3px 4px' }}>
                                  <input value={forceEpaule[k]?.actuel ?? ''} onChange={e => updForceEp(k, 'actuel', e.target.value)}
                                    placeholder="—" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', fontSize: '0.78rem', color: 'var(--text-main)', padding: '2px 4px', outline: 'none' }} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <label style={lblStyle}>Modification des symptômes (tests scapulaires, neuromusculaires, positionnels)</label>
                      <DictableTextarea value={modifSympt} onChange={e => setModifSympt(e.target.value)} textareaStyle={taStyle}
                        placeholder="Assistance scapulaire, stabilisation scapula, activation coiffe, modification position cervicale/thoracique… (Mieux/Pareil/Pire)" />

                      <label style={lblStyle}>Examen des mouvements répétés</label>
                      <DictableTextarea value={mouvRep} onChange={e => setMouvRep(e.target.value)} textareaStyle={taStyle}
                        placeholder="Marqueurs avant procédure, évolution centralisation/périphérisation…" />

                      <label style={lblStyle}>Neurologique & mécanosensibilité (ULTT 1-4)</label>
                      <DictableTextarea value={neuroMecano} onChange={e => setNeuroMecano(e.target.value)} textareaStyle={taStyle}
                        placeholder="Réflexes, déficit moteur, sensibilité, ULTT 1 (médian), ULTT 2 (médian), ULTT 3 (radial), ULTT 4 (ulnaire)…" />
                    </>
                  )}

                  {(bilanType === 'genou' || bilanType === 'hanche' || bilanType === 'cheville') && (
                    <>
                      <label style={lblStyle}>Force musculaire (MRC) — Initial → Actuel</label>
                      <div style={{ overflowX: 'auto', marginBottom: 10 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--secondary)' }}>
                              {['Muscle', 'Initial', 'Actuel'].map(h => (
                                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {getForceKeys().map(([k, lbl]) => (
                              <tr key={k}>
                                <td style={{ padding: '5px 8px', fontSize: '0.78rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{lbl}</td>
                                <td style={{ padding: '3px 4px' }}>
                                  <input value={forceMI[k]?.initial ?? ''} onChange={e => updForceMI(k, 'initial', e.target.value)}
                                    placeholder="—" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', fontSize: '0.78rem', color: 'var(--text-main)', padding: '2px 4px', outline: 'none', opacity: 0.7 }} />
                                </td>
                                <td style={{ padding: '3px 4px' }}>
                                  <input value={forceMI[k]?.actuel ?? ''} onChange={e => updForceMI(k, 'actuel', e.target.value)}
                                    placeholder="—" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', fontSize: '0.78rem', color: 'var(--text-main)', padding: '2px 4px', outline: 'none' }} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <label style={lblStyle}>Modification des symptômes</label>
                      <DictableTextarea value={modifSympt} onChange={e => setModifSympt(e.target.value)} textareaStyle={taStyle}
                        placeholder={
                          bilanType === 'hanche' ? 'Activation abducteurs, modification position lombo-pelvienne / MI, taping, chaussage… (Mieux/Pareil/Pire)' :
                          bilanType === 'genou' ? 'Modification appui, alignement MI, taping rotulien… (Mieux/Pareil/Pire)' :
                          'Stabilisation cheville, taping, modification appui… (Mieux/Pareil/Pire)'
                        } />

                      <label style={lblStyle}>Examen des mouvements répétés</label>
                      <DictableTextarea value={mouvRep} onChange={e => setMouvRep(e.target.value)} textareaStyle={taStyle}
                        placeholder="Marqueurs avant procédure, évolution…" />

                      <label style={lblStyle}>Neurologique & mécanosensibilité</label>
                      <DictableTextarea value={neuroMecano} onChange={e => setNeuroMecano(e.target.value)} textareaStyle={taStyle}
                        placeholder="Réflexes, déficit moteur, sensibilité, Lasègue / PKB / Slump…" />
                    </>
                  )}

                  {bilanType === 'cheville' && (
                    <>
                      <label style={lblStyle}>Œdème — Technique en 8 (Initial → Actuel)</label>
                      <DictableInput value={oedeme} onChange={e => setOedeme(e.target.value)} inputStyle={inputStyle} placeholder="Ex : 28 cm (initial : 30 cm)" />
                      <label style={lblStyle}>Weight Bearing Lunge Test (initial → actuel)</label>
                      <DictableInput value={wbLunge} onChange={e => setWbLunge(e.target.value)} inputStyle={inputStyle} placeholder="Résultat actuel / initial" />
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
                      <DictableTextarea value={mouvRep} onChange={e => setMouvRep(e.target.value)} textareaStyle={taStyle}
                        placeholder={bilanType === 'lombaire' ? 'Centralisation maintenue ou évolutive ? Marqueurs actuels…' : 'Évolution des marqueurs et de la centralisation/périphérisation…'} />
                      <label style={lblStyle}>Neuro / Mécanosensibilité</label>
                      <DictableTextarea value={neuroMecano} onChange={e => setNeuroMecano(e.target.value)} textareaStyle={taStyle}
                        placeholder={bilanType === 'lombaire' ? 'Lasègue, PKB, Slump test, déficits radiculaires…' : 'Déficits moteurs/sensitifs, ULTT 1 à 4…'} />
                    </>
                  )}

                  <label style={lblStyle}>Tests spécifiques (évolution des tests initialement positifs)</label>
                  <DictableTextarea value={testsSpec} onChange={e => setTestsSpec(e.target.value)} textareaStyle={taStyle}
                    placeholder={
                      bilanType === 'cheville' ? 'ALTD, RALTD, Talar Tilt, Kleiger, Squeeze, Grinding, Molloy, Spring Ligament… (Positifs / Négatifs / évolution)' :
                      bilanType === 'epaule'   ? "Bear Hug, Belly Press, ER Lag Sign, O'Brien, Cross-Arm, Apprehension/Relocation, Sulcus, Jerk, CKCUEST, ULRT, UQ-YBT… (positifs / négatifs / évolution)" :
                      bilanType === 'genou'    ? 'Lachman, Tiroirs A/P, LCL, LCM, Thessaly, Renne, Noble, Hoffa… (évolution laxité/douleur)' :
                      bilanType === 'hanche'   ? 'Cluster Laslett, Ober, Thomas, FADDIR, FABER, Cluster Sultive, HEER… (positifs / négatifs)' :
                      bilanType === 'cervical' ? 'Spurling, Distraction, Adson, Roos, TA…' :
                      bilanType === 'lombaire' ? 'Cluster Laslett, Extension-Rotation, Prone Instability, TA…' :
                      'Tests spécifiques…'
                    } />
                </>
              )}

              {/* ── SYNTHÈSE ET OBJECTIFS ─────────────────────────── */}
              {sec.id === 'synthese' && (
                <>
                  <label style={lblStyle}>Bilan de l'évolution (points forts, points stagnants)</label>
                  <DictableTextarea value={bilanEvol} onChange={e => setBilanEvol(e.target.value)} textareaStyle={taStyle} placeholder="Points forts de la rééducation, points stagnants…" />

                  <RadioGroup label="Validation des anciens objectifs SMART" value={validObjSmrt} onChange={setValidObjSmrt}
                    options={['Atteints', 'Partiellement atteints', 'Non atteints']} />

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Nouveaux objectifs SMART (court / moyen terme)</div>
                    {[[obj1, setObj1, '1'], [obj2, setObj2, '2'], [obj3, setObj3, '3']].map(([val, setter, n]) => (
                      <DictableInput key={n as string} value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)}
                        inputStyle={{ ...inputStyle, marginBottom: 6 }} placeholder={`Objectif ${n as string}…`} />
                    ))}
                  </div>

                  <label style={lblStyle}>Ajustement du plan de traitement (nouveau contrat kiné)</label>
                  <DictableTextarea value={ajustPlan} onChange={e => setAjustPlan(e.target.value)} textareaStyle={taStyle} placeholder="Nouvelles priorités de prise en charge…" />

                  <label style={lblStyle}>Nouvelles priorités en séance</label>
                  <DictableTextarea value={priorities} onChange={e => setPriorities(e.target.value)} textareaStyle={taStyle} placeholder="Thérapie manuelle, renforcement, contrôle moteur…" />

                  <label style={lblStyle}>Nouveaux exercices d'auto-rééducation remis au patient</label>
                  <DictableTextarea value={exercices} onChange={e => setExercices(e.target.value)} textareaStyle={taStyle} placeholder="Décrire les exercices prescrits…" />
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
