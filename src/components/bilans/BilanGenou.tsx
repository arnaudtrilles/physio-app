import { useState, useImperativeHandle, forwardRef } from 'react'
import type { BilanMode, NarrativeReport } from '../../types'
import { BilanVocalMode } from './BilanVocalMode'
import { DictableInput, DictableTextarea } from '../VoiceMic'
import { AmplitudeInput, ForceInput, MRCInfo, OuiNon, SectionHeader, ScoreRow, BilanModeToggle } from './shared'
import { useQuestionnaires } from './questionnaires/useQuestionnaires'
import { TestInfoButton } from './testInfo/TestInfoButton'
import { TestResultInput } from './testInputs'
import { InfosGeneralesSection } from './InfosGeneralesSection'
import {
  DouleurSection, RedFlagsSection, YellowFlagsSection, BlueBlackFlagsSection,
  ContratKineSection, ConseilsSection, PSFSCards,
  MobiliteRachisTable, initMobiliteRachis,
  StatusSymptomes,
  mergeDouleur,
  initRedFlags,
  mergeYellow,
  mergeBlueBlack,
  mergeContrat,
  emptyPsfs, mergePsfs,
  initMobAPGD,
  inputStyle, lblStyle, sectionTitleStyle, subTitleStyle,
  type DouleurState, type RedFlagsState, type YellowFlagsState, type BlueBlackState,
  type ContratState, type PsfsItem, type MobAPGDState, type MobiliteRachisState, type MobiliteRachisRow,
} from './bilanSections'

export interface BilanGenouHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

const MOB_GENOU_KEYS: [string, string][] = [
  ['flexion', 'Flexion'], ['extension', 'Extension'],
  ['riTibiale', 'RI tibiale'], ['reTibiale', 'RE tibiale'],
]
const MOB_HANCHE_KEYS: [string, string][] = [
  ['flexion', 'Flexion'], ['abduction', 'Abduction'], ['adduction', 'Adduction'],
  ['extension', 'Extension'], ['re', 'Rotation externe'], ['ri', 'Rotation interne'],
]
const MOB_LOMB_KEYS: [string, string][] = [
  ['flexion', 'Flexion'], ['extension', 'Extension'],
  ['glissementLatD', 'Glissement latéral D'], ['glissementLatG', 'Glissement latéral G'],
  ['inclinaisonD', 'Inclinaison D'], ['inclinaisonG', 'Inclinaison G'],
  ['rotationD', 'Rotation D'], ['rotationG', 'Rotation G'],
]
const FORCE_KEYS: [string, string][] = [
  ['ilioPsoas', 'Ilio-psoas'], ['quadriceps', 'Quadriceps'],
  ['ischios', 'Ischio-jambiers'], ['abducteurs', 'Abducteurs'],
  ['adducteurs', 'Adducteurs'], ['rotateursExt', 'Rotateurs externes'],
  ['rotateursInt', 'Rotateurs internes'], ['tricepsSural', 'Triceps sural'],
  ['tibialAnt', 'Tibial antérieur'],
]
const ABDO_KEYS: [string, string][] = [
  ['transverse', 'Transverse'], ['droitsAbdomen', 'Droits de l’abdomen'], ['obliques', 'Obliques'],
]

export const BilanGenou = forwardRef<BilanGenouHandle, { initialData?: Record<string, unknown> }>(({ initialData }, ref) => {
  const init = initialData ?? {}

  const [mode, setMode] = useState<BilanMode>('noyau')
  const coreMode = mode === 'noyau'
  const [vocalReport, setVocalReport] = useState<NarrativeReport | null>(null)

  const [douleur, setDouleur] = useState<DouleurState>(() => mergeDouleur((init.douleur as Record<string, unknown>) ?? {}))
  const [redFlags, setRedFlags] = useState<RedFlagsState>(() => initRedFlags(init.redFlags as Record<string, unknown> | undefined))
  const [yellow, setYellow] = useState<YellowFlagsState>(() => mergeYellow((init.yellowFlags as Record<string, unknown>) ?? {}))
  const [blueBlack, setBlueBlack] = useState<BlueBlackState>(() => mergeBlueBlack((init.blueBlackFlags as Record<string, unknown>) ?? {}))
  const [contrat, setContrat] = useState<ContratState>(() => mergeContrat((init.contrat as Record<string, unknown>) ?? {}))
  const [psfs, setPsfs] = useState<PsfsItem[]>(() => mergePsfs((init.psfs as unknown) ?? emptyPsfs()))

  // Examen clinique
  const _ec = (init.examClinique as Record<string, unknown>) ?? {}
  const [morpho, setMorpho] = useState<Record<string, string>>({
    rachis: '', mi: '', corrigeable: '', modifPosture: '',
    ...((_ec.morpho as Record<string, string>) ?? {}),
  })
  const setMorphoField = (k: string, v: string) => setMorpho(p => ({ ...p, [k]: v }))

  const [observation, setObservation] = useState<Record<string, string>>({
    amyotrophie: '', amyotrophieLoc: '', autre: '',
    ...((_ec.observation as Record<string, string>) ?? {}),
  })
  const setObs = (k: string, v: string) => setObservation(p => ({ ...p, [k]: v }))

  const [mobGenou, setMobGenou] = useState<MobAPGDState>(() => initMobAPGD(MOB_GENOU_KEYS.map(([k]) => k), (_ec.mobiliteGenou as MobAPGDState)))
  const updMobG = (k: string, side: 'ag' | 'ad' | 'pg' | 'pd', v: string) =>
    setMobGenou(p => ({ ...p, [k]: { ...p[k], [side]: v } }))

  const [mobHanche, setMobHanche] = useState<MobAPGDState>(() => initMobAPGD(MOB_HANCHE_KEYS.map(([k]) => k), (_ec.mobiliteHanche as MobAPGDState)))
  const updMobH = (k: string, side: 'ag' | 'ad' | 'pg' | 'pd', v: string) =>
    setMobHanche(p => ({ ...p, [k]: { ...p[k], [side]: v } }))

  const [mobLombaire, setMobLombaire] = useState<MobiliteRachisState>(() => initMobiliteRachis(MOB_LOMB_KEYS.map(([k]) => k), (_ec.mobiliteLombaire as MobiliteRachisState)))
  const updMobL = (k: string, patch: Partial<MobiliteRachisRow>) => setMobLombaire(p => ({ ...p, [k]: { ...p[k], ...patch } }))

  const [mobAutres, setMobAutres] = useState<Record<string, string>>({
    chevilles: '', autresZones: '',
    ...((_ec.mobAutres as Record<string, string>) ?? {}),
  })
  const setMobA = (k: string, v: string) => setMobAutres(p => ({ ...p, [k]: v }))

  const [fonctionnel, setFonctionnel] = useState<Record<string, string>>({
    accroupissement: '', accroupissementSympt: '',
    course: '', courseSympt: '',
    sauts: '', sautsSympt: '',
    autres: '',
    ...((_ec.fonctionnel as Record<string, string>) ?? {}),
  })
  const setFonc = (k: string, v: string) => setFonctionnel(p => ({ ...p, [k]: v }))

  // Force musculaire
  const _fo = (init.forceMusculaire as Record<string, unknown>) ?? {}
  const initForce = () => {
    const base: Record<string, { gauche: string; droite: string }> = {}
    FORCE_KEYS.forEach(([k]) => { base[k] = { gauche: '', droite: '' } })
    return { ...base, ...((_fo.force as Record<string, { gauche: string; droite: string }>) ?? {}) }
  }
  const [force, setForce] = useState<Record<string, { gauche: string; droite: string }>>(initForce)
  const updForce = (k: string, side: 'gauche' | 'droite', v: string) =>
    setForce(p => ({ ...p, [k]: { ...p[k], [side]: v } }))

  const [abdo, setAbdo] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {}
    ABDO_KEYS.forEach(([k]) => { base[k] = '' })
    return { ...base, ...((_fo.abdo as Record<string, string>) ?? {}) }
  })
  const updAbdo = (k: string, v: string) => setAbdo(p => ({ ...p, [k]: v }))

  const [autresForce, setAutresForce] = useState((_fo.autresForce as string) ?? '')
  const [mvtRepMarqueurs, setMvtRepMarqueurs] = useState((_fo.marqueursAvant as string) ?? '')
  const [mvtRepResultats, setMvtRepResultats] = useState((_fo.resultats as string) ?? '')

  // Tests ligamentaires
  const _tl = (init.testsLigamentaires as Record<string, unknown>) ?? {}
  const [ligTests, setLigTests] = useState<Record<string, string>>({
    lachman: '', tiroirAnt: '', tiroirPost: '', lcl: '', lcm: '', autres: '',
    ...((_tl as Record<string, string>) ?? {}),
  })
  const setLT = (k: string, v: string) => setLigTests(p => ({ ...p, [k]: v }))

  // Neuro
  const _nr = (init.neurologique as Record<string, unknown>) ?? {}
  const [neuro, setNeuro] = useState<Record<string, string>>({
    reflexes: '', force: '', sensibilite: '', babinski: '', troublesSensitifsNotes: '',
    reversibilite: '', comportement: '', palpationNerfs: '',
    nerfSousPression: '', nerfMalade: '',
    ...((_nr as Record<string, string>) ?? {}),
  })
  const setN = (k: string, v: string) => setNeuro(p => ({ ...p, [k]: v }))

  const _me = (init.mecanosensibilite as Record<string, unknown>) ?? {}
  const [mecano, setMecano] = useState<Record<string, string>>({
    lasegue: '', pkb: '', slump: '', nerfCutaneLateralCuisse: '',
    ...((_me as Record<string, string>) ?? {}),
  })
  const setMe = (k: string, v: string) => setMecano(p => ({ ...p, [k]: v }))

  // Tests spécifiques
  const _ts = (init.testsSpecifiques as Record<string, unknown>) ?? {}
  const [tests, setTests] = useState<Record<string, string>>({
    thessaly: '', renne: '', noble: '', vague: '', hoffa: '', autres: '',
    ...((_ts as Record<string, string>) ?? {}),
  })
  const setT = (k: string, v: string) => setTests(p => ({ ...p, [k]: v }))

  // Scores
  const _sc = (init.scores as Record<string, unknown>) ?? {}
  const [scores, setScores] = useState<Record<string, string>>({
    koos: '', fakps: '', ikdc: '', aclRsi: '', sf36: '', had: '', dn4: '', autres: '',
    ...((_sc as Record<string, string>) ?? {}),
  })
  const updScore = (k: string, v: string) => setScores(p => ({ ...p, [k]: v }))

  const [conseils, setConseils] = useState((init.conseils as { recos?: string })?.recos ?? '')

  const [qAnswers, setQAnswers] = useState<Record<string, Record<string, unknown>>>(
    (init.questionnaireAnswers as Record<string, Record<string, unknown>>) ?? {}
  )
  const [qResults, setQResults] = useState<Record<string, import('./questionnaires/useQuestionnaires').StoredResult>>(
    (init.questionnaireResults as Record<string, import('./questionnaires/useQuestionnaires').StoredResult>) ?? {}
  )
  const questionnaires = useQuestionnaires(updScore, qAnswers, setQAnswers, qResults, setQResults)

  const [open, setOpen] = useState<Record<string, boolean>>({ infosGenerales: true, douleur: true })
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  useImperativeHandle(ref, () => ({
    getData: () => ({
      douleur, redFlags, yellowFlags: yellow, blueBlackFlags: blueBlack,
      examClinique: { morpho, observation, mobiliteGenou: mobGenou, mobiliteHanche: mobHanche, mobiliteLombaire: mobLombaire, mobAutres, fonctionnel },
      forceMusculaire: { force, abdo, autresForce, marqueursAvant: mvtRepMarqueurs, resultats: mvtRepResultats },
      testsLigamentaires: ligTests,
      neurologique: neuro,
      mecanosensibilite: mecano,
      testsSpecifiques: tests,
      scores,
      psfs,
      contrat,
      conseils: { recos: conseils },
      questionnaireAnswers: qAnswers,
      questionnaireResults: qResults,
      _mode: mode,
      narrativeReport: vocalReport,
    }),
    setData: (d: Record<string, unknown>) => {
      if (d._mode === 'vocal') { setMode('vocal'); if (d.narrativeReport) setVocalReport(d.narrativeReport as NarrativeReport); return }
      if (d.douleur)        setDouleur(mergeDouleur(d.douleur as Record<string, unknown>))
      if (d.redFlags)       setRedFlags(initRedFlags(d.redFlags as Record<string, unknown>))
      if (d.yellowFlags)    setYellow(mergeYellow(d.yellowFlags as Record<string, unknown>))
      if (d.blueBlackFlags) setBlueBlack(mergeBlueBlack(d.blueBlackFlags as Record<string, unknown>))
      if (d.contrat)        setContrat(mergeContrat(d.contrat as Record<string, unknown>))
      if (d.psfs)           setPsfs(mergePsfs(d.psfs))
      const ec = (d.examClinique as Record<string, unknown>) ?? {}
      if (ec.morpho)            setMorpho(p => ({ ...p, ...(ec.morpho as Record<string, string>) }))
      if (ec.observation)       setObservation(p => ({ ...p, ...(ec.observation as Record<string, string>) }))
      if (ec.mobiliteGenou)     setMobGenou(p => ({ ...p, ...(ec.mobiliteGenou as MobAPGDState) }))
      if (ec.mobiliteHanche)    setMobHanche(p => ({ ...p, ...(ec.mobiliteHanche as MobAPGDState) }))
      if (ec.mobiliteLombaire)  setMobLombaire(p => ({ ...p, ...(ec.mobiliteLombaire as MobiliteRachisState) }))
      if (ec.mobAutres)         setMobAutres(p => ({ ...p, ...(ec.mobAutres as Record<string, string>) }))
      if (ec.fonctionnel)       setFonctionnel(p => ({ ...p, ...(ec.fonctionnel as Record<string, string>) }))
      const fo = (d.forceMusculaire as Record<string, unknown>) ?? {}
      if (fo.force)        setForce(p => ({ ...p, ...(fo.force as Record<string, { gauche: string; droite: string }>) }))
      if (fo.abdo)         setAbdo(p => ({ ...p, ...(fo.abdo as Record<string, string>) }))
      if (fo.autresForce !== undefined)    setAutresForce(fo.autresForce as string)
      if (fo.marqueursAvant !== undefined) setMvtRepMarqueurs(fo.marqueursAvant as string)
      if (fo.resultats !== undefined)      setMvtRepResultats(fo.resultats as string)
      if (d.testsLigamentaires)  setLigTests(p => ({ ...p, ...(d.testsLigamentaires as Record<string, string>) }))
      if (d.neurologique)        setNeuro(p => ({ ...p, ...(d.neurologique as Record<string, string>) }))
      if (d.mecanosensibilite)   setMecano(p => ({ ...p, ...(d.mecanosensibilite as Record<string, string>) }))
      if (d.testsSpecifiques)    setTests(p => ({ ...p, ...(d.testsSpecifiques as Record<string, string>) }))
      if (d.scores)              setScores(p => ({ ...p, ...(d.scores as Record<string, string>) }))
      const cn = (d.conseils as Record<string, unknown>) ?? {}
      if (cn.recos !== undefined) setConseils(cn.recos as string)
      if (d.questionnaireAnswers) setQAnswers(d.questionnaireAnswers as Record<string, Record<string, unknown>>)
      if (d.questionnaireResults) setQResults(d.questionnaireResults as Record<string, import('./questionnaires/useQuestionnaires').StoredResult>)
    },
  }))

  // Noyau EBP genou (JOSPT Patellofemoral 2019 + OARSI) : douleur, red flags, yellow flags, examen clinique
  // simplifié (mobilité genou flexion/extension), force (quadriceps + abducteurs + rotateurs ext — JOSPT PFP),
  // tests ligamentaires (Lachman + tiroir ant si trauma), neuro bref, mécanosensibilité (Lasègue),
  // tests spécifiques (Thessaly + Noble), scores (PSFS seul), contrat, conseils.
  type Priority = 'noyau' | 'approfondissement'
  const allSections: { id: string; title: string; color: string; priority: Priority }[] = [
    { id: 'infosGenerales',title: 'Infos générales',                  color: '#1A1A1A', priority: 'noyau' },
    { id: 'douleur',       title: 'Douleur',                          color: '#1A1A1A', priority: 'noyau' },
    { id: 'redFlags',      title: 'Red Flags 🚩',                      color: '#991b1b',        priority: 'noyau' },
    { id: 'yellowFlags',   title: 'Yellow Flags 🟡',                   color: '#d97706',        priority: 'noyau' },
    { id: 'blueBlackFlags',title: 'Blue / Black Flags',                color: '#7c3aed',        priority: 'approfondissement' },
    { id: 'examClinique',  title: 'Examen clinique',                   color: '#1A1A1A', priority: 'noyau' },
    { id: 'force',         title: 'Force musculaire',                  color: '#1A1A1A', priority: 'noyau' },
    { id: 'ligamentaires', title: 'Tests ligamentaires',               color: '#1A1A1A', priority: 'noyau' },
    { id: 'neuro',         title: 'Neurologique & mécanosensibilité',  color: '#1A1A1A', priority: 'noyau' },
    { id: 'testsSpec',     title: 'Tests spécifiques',                 color: '#1A1A1A', priority: 'noyau' },
    { id: 'scores',        title: 'Scores fonctionnels',               color: '#1A1A1A', priority: 'noyau' },
    { id: 'contrat',       title: 'Contrat kiné',                      color: '#059669',        priority: 'noyau' },
    { id: 'conseils',      title: 'Conseils & recommandations',        color: '#059669',        priority: 'noyau' },
  ]
  const sections = coreMode ? allSections.filter(s => s.priority === 'noyau') : allSections

  const renderMobApgdTable = (rows: [string, string][], state: MobAPGDState, upd: (k: string, side: 'ag' | 'ad' | 'pg' | 'pd', v: string) => void) => (
    <table className="mobility-table">
      <thead>
        <tr><th rowSpan={2}>Mouvement</th><th colSpan={2} style={{ textAlign: 'center' }}>Active</th><th colSpan={2} style={{ textAlign: 'center' }}>Passive</th></tr>
        <tr><th style={{ textAlign: 'center' }}>G</th><th style={{ textAlign: 'center' }}>D</th><th style={{ textAlign: 'center' }}>G</th><th style={{ textAlign: 'center' }}>D</th></tr>
      </thead>
      <tbody>
        {rows.map(([k, lbl]) => (
          <tr key={k}>
            <td>{lbl}</td>
            <td><AmplitudeInput value={state[k].ag} onChange={v => upd(k, 'ag', v)} /></td>
            <td><AmplitudeInput value={state[k].ad} onChange={v => upd(k, 'ad', v)} /></td>
            <td><AmplitudeInput value={state[k].pg} onChange={v => upd(k, 'pg', v)} /></td>
            <td><AmplitudeInput value={state[k].pd} onChange={v => upd(k, 'pd', v)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div>
      <BilanModeToggle mode={mode} onChange={setMode} />
      {mode === 'vocal' && <BilanVocalMode zone="Genou" initialReport={vocalReport} onChange={setVocalReport} />}
      {mode !== 'vocal' && sections.map(sec => (
        <div key={sec.id} style={{ marginBottom: 4 }}>
          <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} color={sec.color} badge={sec.priority === 'approfondissement' ? 'approfondissement' : undefined} />
          {open[sec.id] && (
            <div style={{ paddingTop: 12, paddingBottom: 8 }}>

              {sec.id === 'infosGenerales' && <InfosGeneralesSection />}
              {sec.id === 'douleur' && (
                <DouleurSection state={douleur} onChange={p => setDouleur(s => ({ ...s, ...p }))} options={{ hasMecanismeLesionnel: true }} coreMode={coreMode} />
              )}
              {sec.id === 'redFlags' && (
                <RedFlagsSection state={redFlags} onChange={p => setRedFlags(s => ({ ...s, ...p }) as RedFlagsState)} variant="lower" coreMode={coreMode} />
              )}
              {sec.id === 'yellowFlags' && (
                <YellowFlagsSection state={yellow} onChange={p => setYellow(s => ({ ...s, ...p }))} coreMode={coreMode} />
              )}
              {sec.id === 'blueBlackFlags' && (
                <BlueBlackFlagsSection state={blueBlack} onChange={p => setBlueBlack(s => ({ ...s, ...p }))} coreMode={coreMode} />
              )}

              {sec.id === 'examClinique' && (
                <>
                  <p style={sectionTitleStyle}>Morphostatique</p>
                  <label style={lblStyle}>Attitude des membres inférieurs</label>
                  <DictableInput value={morpho.mi} onChange={e => setMorphoField('mi', e.target.value)} placeholder="Valgus / varus, recurvatum…" inputStyle={inputStyle} />
                  {!coreMode && (
                    <>
                      <label style={lblStyle}>Attitude du rachis</label>
                      <DictableInput value={morpho.rachis} onChange={e => setMorphoField('rachis', e.target.value)} placeholder="—" inputStyle={inputStyle} />
                      <OuiNon label="Corrigeable ?" value={morpho.corrigeable} onChange={v => setMorphoField('corrigeable', v)} />
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <label style={{ ...lblStyle, width: '100%', marginBottom: 2 }}>Modification de la posture</label>
                        {['Pire', 'Pareil', 'Mieux'].map(v => {
                          const key = v.toLowerCase()
                          return <button key={v} className={`choix-btn${morpho.modifPosture === key ? ' active' : ''}`} onClick={() => setMorphoField('modifPosture', morpho.modifPosture === key ? '' : key)}>{v}</button>
                        })}
                      </div>
                    </>
                  )}

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Observation</p>
                  <OuiNon label="Épanchement / amyotrophie VMO" value={observation.amyotrophie} onChange={v => setObs('amyotrophie', v)} />
                  {observation.amyotrophie === 'oui' && (
                    <DictableInput value={observation.amyotrophieLoc} onChange={e => setObs('amyotrophieLoc', e.target.value)} placeholder="Localisation…" inputStyle={{ ...inputStyle, marginTop: 6 }} />
                  )}
                  {!coreMode && (
                    <>
                      <label style={lblStyle}>Autre observation</label>
                      <DictableInput value={observation.autre} onChange={e => setObs('autre', e.target.value)} placeholder="—" inputStyle={inputStyle} />
                    </>
                  )}

                  <label style={subTitleStyle}>Mobilité — Genou (°)</label>
                  {renderMobApgdTable(MOB_GENOU_KEYS, mobGenou, updMobG)}

                  {!coreMode && (
                    <>
                      <label style={subTitleStyle}>Mobilité — Hanche (°)</label>
                      {renderMobApgdTable(MOB_HANCHE_KEYS, mobHanche, updMobH)}

                      <label style={subTitleStyle}>Mobilité du rachis lombaire</label>
                      <MobiliteRachisTable rows={MOB_LOMB_KEYS} state={mobLombaire} onChange={updMobL} />

                      <label style={lblStyle}>Mobilité chevilles</label>
                      <DictableInput value={mobAutres.chevilles} onChange={e => setMobA('chevilles', e.target.value)} placeholder="—" inputStyle={inputStyle} />
                      <label style={lblStyle}>Autres zones</label>
                      <DictableTextarea value={mobAutres.autresZones} onChange={e => setMobA('autresZones', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
                    </>
                  )}

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Fonctionnel</p>
                  {/* Noyau JOSPT PFP : test reproductif squat/accroupissement (ou step-down) pour suivi. */}
                  <StatusSymptomes label="Accroupissement (test reproductif)" status={fonctionnel.accroupissement} symptomes={fonctionnel.accroupissementSympt} onChangeStatus={v => setFonc('accroupissement', v)} onChangeSympt={v => setFonc('accroupissementSympt', v)} />
                  {!coreMode && (
                    <>
                      <StatusSymptomes label="Course" status={fonctionnel.course} symptomes={fonctionnel.courseSympt} onChangeStatus={v => setFonc('course', v)} onChangeSympt={v => setFonc('courseSympt', v)} />
                      <StatusSymptomes label="Sauts" status={fonctionnel.sauts} symptomes={fonctionnel.sautsSympt} onChangeStatus={v => setFonc('sauts', v)} onChangeSympt={v => setFonc('sautsSympt', v)} />
                      <label style={lblStyle}>Autres</label>
                      <DictableTextarea value={fonctionnel.autres} onChange={e => setFonc('autres', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
                    </>
                  )}
                </>
              )}

              {sec.id === 'force' && (
                <>
                  <label style={{ ...subTitleStyle, display: 'flex', alignItems: 'center' }}>
                    Force musculaire <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(MRC)</span><MRCInfo />
                  </label>
                  <table className="mobility-table">
                    <thead><tr><th>Muscle</th><th style={{ textAlign: 'center' }}>Gauche</th><th style={{ textAlign: 'center' }}>Droite</th></tr></thead>
                    <tbody>
                      {/* Noyau JOSPT Patellofemoral 2019 étendu : quadriceps, ischios, abducteurs, adducteurs,
                          rotateurs externes, rotateurs internes et triceps sural (chaîne postérieure / mollet). */}
                      {(coreMode
                        ? FORCE_KEYS.filter(([k]) => ['quadriceps', 'ischios', 'abducteurs', 'adducteurs', 'rotateursExt', 'rotateursInt', 'tricepsSural'].includes(k))
                        : FORCE_KEYS
                      ).map(([k, lbl]) => (
                        <tr key={k}>
                          <td>{lbl}</td>
                          <td><ForceInput value={force[k].gauche} onChange={v => updForce(k, 'gauche', v)} /></td>
                          <td><ForceInput value={force[k].droite} onChange={v => updForce(k, 'droite', v)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!coreMode && (
                    <>
                      <label style={{ ...subTitleStyle, marginTop: 14 }}>Muscles abdominaux</label>
                      <table className="mobility-table">
                        <thead><tr><th>Muscle</th><th style={{ textAlign: 'center' }}>Force</th></tr></thead>
                        <tbody>
                          {ABDO_KEYS.map(([k, lbl]) => (
                            <tr key={k}><td>{lbl}</td><td><ForceInput value={abdo[k]} onChange={v => updAbdo(k, v)} /></td></tr>
                          ))}
                        </tbody>
                      </table>
                      <label style={{ ...lblStyle, marginTop: 10 }}>Autres tests de force</label>
                      <DictableTextarea value={autresForce} onChange={e => setAutresForce(e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />

                      <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Examen des mouvements répétés</p>
                      <label style={lblStyle}>Marqueurs avant procédure</label>
                      <DictableInput value={mvtRepMarqueurs} onChange={e => setMvtRepMarqueurs(e.target.value)} placeholder="Douleur, ROM…" inputStyle={inputStyle} />
                      <label style={lblStyle}>Résultats</label>
                      <DictableTextarea value={mvtRepResultats} onChange={e => setMvtRepResultats(e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
                    </>
                  )}
                </>
              )}

              {sec.id === 'ligamentaires' && (
                <>
                  {/* Noyau : Lachman + tiroir antérieur (cluster ACL le plus validé). Le reste → approfondissement. */}
                  {(coreMode
                    ? [['lachman', 'Lachman'], ['tiroirAnt', 'Tiroir antérieur']]
                    : [
                        ['lachman', 'Lachman'],
                        ['tiroirAnt', 'Tiroir antérieur'],
                        ['tiroirPost', 'Tiroir postérieur'],
                        ['lcl', 'Ligament collatéral latéral (LCL)'],
                        ['lcm', 'Ligament collatéral médial (LCM)'],
                      ]
                  ).map(([k, lbl]) => (
                    <TestResultInput
                      key={k}
                      label={lbl}
                      testKey={k}
                      value={ligTests[k] ?? ''}
                      onChange={v => setLT(k, v)}
                      placeholder="Laxité, arrêt mou/dur, grade…"
                    />
                  ))}
                  {!coreMode && (
                    <>
                      <label style={lblStyle}>Autres tests ligamentaires</label>
                      <DictableTextarea value={ligTests.autres} onChange={e => setLT('autres', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
                    </>
                  )}
                </>
              )}

              {sec.id === 'neuro' && (
                <>
                  <p style={sectionTitleStyle}>Examen neurologique</p>
                  {(coreMode
                    ? [
                        ['reflexes', 'Réflexes (rotulien, achilléen)', 'Rotulien, achilléen…'],
                        ['force', 'Force (MRC)', '—'],
                        ['sensibilite', 'Sensibilité (dermatomes L2-S1)', 'Dermatome…'],
                      ]
                    : [
                        ['reflexes', 'Réflexes', 'Rotulien, achilléen…'],
                        ['force', 'Force', '—'],
                        ['sensibilite', 'Sensibilité', 'Dermatome…'],
                        ['babinski', 'Babinski', '+ / -'],
                      ]
                  ).map(([k, lbl, ph]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}{k === 'babinski' && <TestInfoButton testKey="babinski" />}</label>
                      <DictableInput value={neuro[k] ?? (k === 'force' ? (neuro.deficitMoteur ?? '') : '')} onChange={e => setN(k, e.target.value)} placeholder={ph} inputStyle={inputStyle} />
                    </div>
                  ))}
                  {!coreMode && (
                    <>
                      <label style={lblStyle}>Réversibilité</label>
                      <DictableInput value={neuro.reversibilite ?? ''} onChange={e => setN('reversibilite', e.target.value)} placeholder="Oui / Non — précisions…" inputStyle={inputStyle} />
                      <label style={lblStyle}>Comportement</label>
                      <DictableInput value={neuro.comportement ?? ''} onChange={e => setN('comportement', e.target.value)} placeholder="Utile / Inutile — type…" inputStyle={inputStyle} />
                      <label style={lblStyle}>Palpation Nerf(s)</label>
                      <DictableInput value={neuro.palpationNerfs ?? ''} onChange={e => setN('palpationNerfs', e.target.value)} placeholder="Douleur, lequel…" inputStyle={inputStyle} />
                      <p style={{ ...sectionTitleStyle, margin: '12px 0 6px' }}>Nerf / Racine</p>
                      <OuiNon label="Sous pression" value={neuro.nerfSousPression ?? ''} onChange={v => setN('nerfSousPression', v)} />
                      <OuiNon label="Malade" value={neuro.nerfMalade ?? ''} onChange={v => setN('nerfMalade', v)} />

                      <label style={{ ...lblStyle, marginTop: 10 }}>Schéma des troubles sensitifs</label>
                      <DictableTextarea value={neuro.troublesSensitifsNotes} onChange={e => setN('troublesSensitifsNotes', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
                    </>
                  )}

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Mécanosensibilité</p>
                  {(coreMode
                    ? [['lasegue', 'Lasègue (SLR)']]
                    : [
                        ['lasegue', 'Lasègue'],
                        ['pkb', 'PKB'],
                        ['slump', 'Slump test'],
                        ['nerfCutaneLateralCuisse', 'Nerf cutané latéral de la cuisse'],
                      ]
                  ).map(([k, lbl]) => (
                    <TestResultInput
                      key={k}
                      label={lbl}
                      testKey={k}
                      value={mecano[k] ?? ''}
                      onChange={v => setMe(k, v)}
                      placeholder={k === 'lasegue' || k === 'pkb' ? 'Amplitude (°), reproduction…' : 'Reproduction symptômes…'}
                    />
                  ))}
                </>
              )}

              {sec.id === 'testsSpec' && (
                <>
                  {/* Noyau : Thessaly (méniscal) + Noble (band ilio-tibial). Renne/vague/Hoffa → approfondissement. */}
                  {(coreMode
                    ? [['thessaly', 'Test de Thessaly (méniscal)'], ['noble', 'Test de Noble (TFL/ITB)']]
                    : [
                        ['thessaly', 'Test de Thessaly'],
                        ['renne', 'Test de Renne'],
                        ['noble', 'Test de Noble'],
                        ['vague', 'Test du vague rotulien'],
                        ['hoffa', 'Test de Hoffa'],
                      ]
                  ).map(([k, lbl]) => (
                    <TestResultInput
                      key={k}
                      label={lbl}
                      testKey={k}
                      value={tests[k] ?? ''}
                      onChange={v => setT(k, v)}
                    />
                  ))}
                  {!coreMode && (
                    <>
                      <label style={lblStyle}>Autres tests</label>
                      <DictableTextarea value={tests.autres ?? ''} onChange={e => setT('autres', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
                    </>
                  )}
                </>
              )}

              {sec.id === 'scores' && (
                <>
                  {/* Noyau : PSFS seul. Tous les autres scores (KOOS, F-AKPS, IKDC, ACL-RSI, SF-36, HAD, DN4) → approfondissement. */}
                  {!coreMode && ([
                    ['koos', 'KOOS', 'koos'],
                    ['fakps', 'F-AKPS', 'fakps'],
                    ['ikdc', 'IKDC', 'ikdc'],
                    ['aclRsi', 'ACL-RSI', 'aclRsi'],
                    ['sf36', 'SF-36', 'sf36'],
                    ['had', 'Échelle HAD', 'had'],
                    ['dn4', 'DN4', 'dn4'],
                  ] as [string, string, string][]).map(([k, lbl, qId]) => (
                    <ScoreRow key={k} label={lbl} value={scores[k]} onChange={v => updScore(k, v)}
                      onOpenQuestionnaire={() => questionnaires.open(qId, k)}
                      result={questionnaires.getResult(k, qId)} />
                  ))}
                  <PSFSCards items={psfs} onChange={setPsfs} />
                  {!coreMode && (
                    <>
                      <label style={{ ...lblStyle, marginTop: 8 }}>Autres scores</label>
                      <DictableTextarea value={scores.autres ?? ''} onChange={e => updScore('autres', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
                    </>
                  )}
                </>
              )}

              {sec.id === 'contrat' && (
                <ContratKineSection state={contrat} onChange={p => setContrat(s => ({ ...s, ...p }))} />
              )}
              {sec.id === 'conseils' && (
                <ConseilsSection value={conseils} onChange={setConseils} />
              )}

            </div>
          )}
        </div>
      ))}
      {questionnaires.modal}
    </div>
  )
})

BilanGenou.displayName = 'BilanGenou'
