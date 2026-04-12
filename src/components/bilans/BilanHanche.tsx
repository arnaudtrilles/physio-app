import { useState, useImperativeHandle, forwardRef } from 'react'
import { AmplitudeInput, ForceInput, MRCInfo, OuiNon, SectionHeader, ScoreRow } from './shared'
import { useQuestionnaires } from './questionnaires/useQuestionnaires'
import { TestInfoButton } from './testInfo/TestInfoButton'
import {
  DouleurSection, RedFlagsSection, YellowFlagsSection, BlueBlackFlagsSection,
  ContratKineSection, ConseilsSection, PSFSCards,
  MobiliteRachisTable, initMobiliteRachis,
  StatusSymptomes,
  mergeDouleur,
  mergeRedFlags,
  mergeYellow,
  mergeBlueBlack,
  mergeContrat,
  emptyPsfs, mergePsfs,
  initMobAPGD,
  inputStyle, lblStyle, sectionTitleStyle, subTitleStyle,
  type DouleurState, type RedFlagsState, type YellowFlagsState, type BlueBlackState,
  type ContratState, type PsfsItem, type MobAPGDState, type MobiliteRachisState, type MobiliteRachisRow,
} from './bilanSections'

export interface BilanHancheHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

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
]
const ABDO_KEYS: [string, string][] = [
  ['transverse', 'Transverse'], ['droitsAbdomen', 'Droits de l’abdomen'], ['obliques', 'Obliques'],
]

export const BilanHanche = forwardRef<BilanHancheHandle, { initialData?: Record<string, unknown> }>(({ initialData }, ref) => {
  const init = initialData ?? {}

  // ── States via shared helpers ────────────────────────────────────────────
  const [douleur, setDouleur] = useState<DouleurState>(() => mergeDouleur((init.douleur as Record<string, unknown>) ?? {}))
  const [redFlags, setRedFlags] = useState<RedFlagsState>(() => mergeRedFlags((init.redFlags as Record<string, unknown>) ?? {}))
  const [yellow, setYellow] = useState<YellowFlagsState>(() => mergeYellow((init.yellowFlags as Record<string, unknown>) ?? {}))
  const [blueBlack, setBlueBlack] = useState<BlueBlackState>(() => mergeBlueBlack((init.blueBlackFlags as Record<string, unknown>) ?? {}))
  const [contrat, setContrat] = useState<ContratState>(() => mergeContrat((init.contrat as Record<string, unknown>) ?? {}))
  const [psfs, setPsfs] = useState<PsfsItem[]>(() => mergePsfs((init.psfs as unknown) ?? emptyPsfs()))

  // ── Examen clinique ──────────────────────────────────────────────────────
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

  const [mobHanche, setMobHanche] = useState<MobAPGDState>(() => initMobAPGD(MOB_HANCHE_KEYS.map(([k]) => k), (_ec.mobiliteHanche as MobAPGDState)))
  const updMobH = (k: string, side: 'ag' | 'ad' | 'pg' | 'pd', v: string) =>
    setMobHanche(p => ({ ...p, [k]: { ...p[k], [side]: v } }))

  const [mobLombaire, setMobLombaire] = useState<MobiliteRachisState>(() => initMobiliteRachis(MOB_LOMB_KEYS.map(([k]) => k), (_ec.mobiliteLombaire as MobiliteRachisState)))
  const updMobL = (k: string, patch: Partial<MobiliteRachisRow>) => setMobLombaire(p => ({ ...p, [k]: { ...p[k], ...patch } }))

  const [mobAutres, setMobAutres] = useState<Record<string, string>>({
    genoux: '', chevilles: '', autresZones: '',
    ...((_ec.mobAutres as Record<string, string>) ?? {}),
  })
  const setMobA = (k: string, v: string) => setMobAutres(p => ({ ...p, [k]: v }))

  // Fonctionnel
  const [fonctionnel, setFonctionnel] = useState<Record<string, string>>({
    accroupissement: '', accroupissementSympt: '',
    course: '', courseSympt: '',
    sauts: '', sautsSympt: '',
    autres: '',
    ...((_ec.fonctionnel as Record<string, string>) ?? {}),
  })
  const setFonc = (k: string, v: string) => setFonctionnel(p => ({ ...p, [k]: v }))

  // Modifications symptômes
  const [modifSymp, setModifSymp] = useState<Record<string, string>>({
    positionLomboPelvienne: '', positionMI: '', activationAbducteurs: '', activationTransverse: '',
    repartitionPoids: '', diminutionRom: '', chaineOuverteFermee: '', taping: '', chaussage: '',
    ...((_ec.modifSymp as Record<string, string>) ?? {}),
  })
  const setMS = (k: string, v: string) => setModifSymp(p => ({ ...p, [k]: v }))

  // ── Force musculaire ─────────────────────────────────────────────────────
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

  // Mvts répétés
  const [mvtRepMarqueurs, setMvtRepMarqueurs] = useState((_fo.marqueursAvant as string) ?? '')
  const [mvtRepResultats, setMvtRepResultats] = useState((_fo.resultats as string) ?? '')

  // ── Neuro ────────────────────────────────────────────────────────────────
  const _nr = (init.neurologique as Record<string, unknown>) ?? {}
  const [neuro, setNeuro] = useState<Record<string, string>>({
    reflexes: '', force: '', sensibilite: '', babinski: '', troublesSensitifsNotes: '',
    reversibilite: '', comportement: '', palpationNerfs: '',
    nerfSousPression: '', nerfMalade: '',
    ...((_nr as Record<string, string>) ?? {}),
  })
  const setN = (k: string, v: string) => setNeuro(p => ({ ...p, [k]: v }))

  // Mécanosensibilité
  const _me = (init.mecanosensibilite as Record<string, unknown>) ?? {}
  const [mecano, setMecano] = useState<Record<string, string>>({
    lasegue: '', pkb: '', slump: '', nerfCutaneLateralCuisse: '',
    ...((_me as Record<string, string>) ?? {}),
  })
  const setMe = (k: string, v: string) => setMecano(p => ({ ...p, [k]: v }))

  // ── Tests spécifiques ────────────────────────────────────────────────────
  const _ts = (init.testsSpecifiques as Record<string, unknown>) ?? {}
  const [tests, setTests] = useState<Record<string, string>>({
    clusterLaslett: '', ober: '', thomas: '', faddir: '', faber: '',
    clusterSultive: '', heer: '', abdHeer: '', autres: '',
    ...((_ts as Record<string, string>) ?? {}),
  })
  const setT = (k: string, v: string) => setTests(p => ({ ...p, [k]: v }))

  // ── Scores ───────────────────────────────────────────────────────────────
  const _sc = (init.scores as Record<string, unknown>) ?? {}
  const [scores, setScores] = useState<Record<string, string>>({
    hoos: '', oxfordHip: '', hagos: '', efmi: '', had: '', dn4: '', sensibilisation: '', autres: '',
    ...((_sc as Record<string, string>) ?? {}),
  })
  const updScore = (k: string, v: string) => setScores(p => ({ ...p, [k]: v }))

  // ── Conseils ─────────────────────────────────────────────────────────────
  const [conseils, setConseils] = useState((init.conseils as { recos?: string })?.recos ?? '')

  // ── Questionnaires interactifs ──
  const [qAnswers, setQAnswers] = useState<Record<string, Record<string, unknown>>>(
    (init.questionnaireAnswers as Record<string, Record<string, unknown>>) ?? {}
  )
  const [qResults, setQResults] = useState<Record<string, import('./questionnaires/useQuestionnaires').StoredResult>>(
    (init.questionnaireResults as Record<string, import('./questionnaires/useQuestionnaires').StoredResult>) ?? {}
  )
  const questionnaires = useQuestionnaires(updScore, qAnswers, setQAnswers, qResults, setQResults)

  // ── Open/toggle ──────────────────────────────────────────────────────────
  const [open, setOpen] = useState<Record<string, boolean>>({ douleur: true })
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  // ── Imperative handle ────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getData: () => ({
      douleur,
      redFlags,
      yellowFlags: yellow,
      blueBlackFlags: blueBlack,
      examClinique: { morpho, observation, mobiliteHanche: mobHanche, mobiliteLombaire: mobLombaire, mobAutres, fonctionnel, modifSymp },
      forceMusculaire: { force, abdo, autresForce, marqueursAvant: mvtRepMarqueurs, resultats: mvtRepResultats },
      neurologique: neuro,
      mecanosensibilite: mecano,
      testsSpecifiques: tests,
      scores,
      psfs,
      contrat,
      conseils: { recos: conseils },
      questionnaireAnswers: qAnswers,
      questionnaireResults: qResults,
    }),
    setData: (d: Record<string, unknown>) => {
      if (d.douleur)        setDouleur(mergeDouleur(d.douleur as Record<string, unknown>))
      if (d.redFlags)       setRedFlags(mergeRedFlags(d.redFlags as Record<string, unknown>))
      if (d.yellowFlags)    setYellow(mergeYellow(d.yellowFlags as Record<string, unknown>))
      if (d.blueBlackFlags) setBlueBlack(mergeBlueBlack(d.blueBlackFlags as Record<string, unknown>))
      if (d.contrat)        setContrat(mergeContrat(d.contrat as Record<string, unknown>))
      if (d.psfs)           setPsfs(mergePsfs(d.psfs))
      const ec = (d.examClinique as Record<string, unknown>) ?? {}
      if (ec.morpho)            setMorpho(p => ({ ...p, ...(ec.morpho as Record<string, string>) }))
      if (ec.observation)       setObservation(p => ({ ...p, ...(ec.observation as Record<string, string>) }))
      if (ec.mobiliteHanche)    setMobHanche(p => ({ ...p, ...(ec.mobiliteHanche as MobAPGDState) }))
      if (ec.mobiliteLombaire)  setMobLombaire(p => ({ ...p, ...(ec.mobiliteLombaire as MobiliteRachisState) }))
      if (ec.mobAutres)         setMobAutres(p => ({ ...p, ...(ec.mobAutres as Record<string, string>) }))
      if (ec.fonctionnel)       setFonctionnel(p => ({ ...p, ...(ec.fonctionnel as Record<string, string>) }))
      if (ec.modifSymp)         setModifSymp(p => ({ ...p, ...(ec.modifSymp as Record<string, string>) }))
      const fo = (d.forceMusculaire as Record<string, unknown>) ?? {}
      if (fo.force)        setForce(p => ({ ...p, ...(fo.force as Record<string, { gauche: string; droite: string }>) }))
      if (fo.abdo)         setAbdo(p => ({ ...p, ...(fo.abdo as Record<string, string>) }))
      if (fo.autresForce !== undefined)    setAutresForce(fo.autresForce as string)
      if (fo.marqueursAvant !== undefined) setMvtRepMarqueurs(fo.marqueursAvant as string)
      if (fo.resultats !== undefined)      setMvtRepResultats(fo.resultats as string)
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

  const sections = [
    { id: 'douleur',       title: 'Douleur',                          color: 'var(--primary)' },
    { id: 'redFlags',      title: 'Red Flags 🚩',                      color: '#dc2626' },
    { id: 'yellowFlags',   title: 'Yellow Flags 🟡',                   color: '#d97706' },
    { id: 'blueBlackFlags',title: 'Blue / Black Flags',                color: '#7c3aed' },
    { id: 'examClinique',  title: 'Examen clinique',                   color: 'var(--primary)' },
    { id: 'force',         title: 'Force musculaire',                  color: 'var(--primary)' },
    { id: 'neuro',         title: 'Neurologique & mécanosensibilité',  color: 'var(--primary)' },
    { id: 'testsSpec',     title: 'Tests spécifiques',                 color: 'var(--primary)' },
    { id: 'scores',        title: 'Scores fonctionnels',               color: 'var(--primary)' },
    { id: 'contrat',       title: 'Contrat kiné',                      color: '#059669' },
    { id: 'conseils',      title: 'Conseils & recommandations',        color: '#059669' },
  ]

  return (
    <div>
      {sections.map(sec => (
        <div key={sec.id} style={{ marginBottom: 4 }}>
          <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} color={sec.color} />
          {open[sec.id] && (
            <div style={{ paddingTop: 12, paddingBottom: 8 }}>

              {sec.id === 'douleur' && (
                <DouleurSection state={douleur} onChange={p => setDouleur(s => ({ ...s, ...p }))} />
              )}

              {sec.id === 'redFlags' && (
                <RedFlagsSection state={redFlags} onChange={p => setRedFlags(s => ({ ...s, ...p }) as RedFlagsState)} variant="lower" />
              )}

              {sec.id === 'yellowFlags' && (
                <YellowFlagsSection state={yellow} onChange={p => setYellow(s => ({ ...s, ...p }))} />
              )}

              {sec.id === 'blueBlackFlags' && (
                <BlueBlackFlagsSection state={blueBlack} onChange={p => setBlueBlack(s => ({ ...s, ...p }))} />
              )}

              {sec.id === 'examClinique' && (
                <>
                  <p style={sectionTitleStyle}>Morphostatique</p>
                  <label style={lblStyle}>Attitude du rachis</label>
                  <input value={morpho.rachis} onChange={e => setMorphoField('rachis', e.target.value)} placeholder="Hyperlordose, antéversion bassin…" style={inputStyle} />
                  <label style={lblStyle}>Attitude des membres inférieurs</label>
                  <input value={morpho.mi} onChange={e => setMorphoField('mi', e.target.value)} placeholder="Valgus / varus, rotation…" style={inputStyle} />
                  <OuiNon label="Corrigeable ?" value={morpho.corrigeable} onChange={v => setMorphoField('corrigeable', v)} />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    <label style={{ ...lblStyle, width: '100%', marginBottom: 2 }}>Modification de la posture</label>
                    {['Pire', 'Pareil', 'Mieux'].map(v => {
                      const key = v.toLowerCase()
                      return <button key={v} className={`choix-btn${morpho.modifPosture === key ? ' active' : ''}`} onClick={() => setMorphoField('modifPosture', morpho.modifPosture === key ? '' : key)}>{v}</button>
                    })}
                  </div>

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Observation</p>
                  <OuiNon label="Amyotrophie" value={observation.amyotrophie} onChange={v => setObs('amyotrophie', v)} />
                  {observation.amyotrophie === 'oui' && (
                    <input value={observation.amyotrophieLoc} onChange={e => setObs('amyotrophieLoc', e.target.value)} placeholder="Localisation…" style={{ ...inputStyle, marginTop: 6 }} />
                  )}
                  <label style={lblStyle}>Autre observation</label>
                  <input value={observation.autre} onChange={e => setObs('autre', e.target.value)} placeholder="—" style={inputStyle} />

                  <label style={subTitleStyle}>Mobilité — Hanche (°)</label>
                  <table className="mobility-table">
                    <thead>
                      <tr><th rowSpan={2}>Mouvement</th><th colSpan={2} style={{ textAlign: 'center' }}>Active</th><th colSpan={2} style={{ textAlign: 'center' }}>Passive</th></tr>
                      <tr><th style={{ textAlign: 'center' }}>G</th><th style={{ textAlign: 'center' }}>D</th><th style={{ textAlign: 'center' }}>G</th><th style={{ textAlign: 'center' }}>D</th></tr>
                    </thead>
                    <tbody>
                      {MOB_HANCHE_KEYS.map(([k, lbl]) => (
                        <tr key={k}>
                          <td>{lbl}</td>
                          <td><AmplitudeInput value={mobHanche[k].ag} onChange={v => updMobH(k, 'ag', v)} /></td>
                          <td><AmplitudeInput value={mobHanche[k].ad} onChange={v => updMobH(k, 'ad', v)} /></td>
                          <td><AmplitudeInput value={mobHanche[k].pg} onChange={v => updMobH(k, 'pg', v)} /></td>
                          <td><AmplitudeInput value={mobHanche[k].pd} onChange={v => updMobH(k, 'pd', v)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <label style={subTitleStyle}>Mobilité du rachis lombaire</label>
                  <MobiliteRachisTable rows={MOB_LOMB_KEYS} state={mobLombaire} onChange={updMobL} />

                  <label style={lblStyle}>Mobilité genoux</label>
                  <input value={mobAutres.genoux} onChange={e => setMobA('genoux', e.target.value)} placeholder="—" style={inputStyle} />
                  <label style={lblStyle}>Mobilité chevilles</label>
                  <input value={mobAutres.chevilles} onChange={e => setMobA('chevilles', e.target.value)} placeholder="—" style={inputStyle} />
                  <label style={lblStyle}>Autres zones</label>
                  <textarea value={mobAutres.autresZones} onChange={e => setMobA('autresZones', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Fonctionnel</p>
                  <StatusSymptomes label="Accroupissement" status={fonctionnel.accroupissement} symptomes={fonctionnel.accroupissementSympt} onChangeStatus={v => setFonc('accroupissement', v)} onChangeSympt={v => setFonc('accroupissementSympt', v)} />
                  <StatusSymptomes label="Course" status={fonctionnel.course} symptomes={fonctionnel.courseSympt} onChangeStatus={v => setFonc('course', v)} onChangeSympt={v => setFonc('courseSympt', v)} />
                  <StatusSymptomes label="Sauts" status={fonctionnel.sauts} symptomes={fonctionnel.sautsSympt} onChangeStatus={v => setFonc('sauts', v)} onChangeSympt={v => setFonc('sautsSympt', v)} />
                  <label style={lblStyle}>Autres</label>
                  <textarea value={fonctionnel.autres} onChange={e => setFonc('autres', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Modification des symptômes</p>
                  {([
                    ['positionLomboPelvienne', 'Modification de la position lombo-pelvienne'],
                    ['positionMI', 'Modification de la position des MI'],
                    ['activationAbducteurs', 'Activation des abducteurs'],
                    ['activationTransverse', 'Activation du transverse'],
                    ['repartitionPoids', 'Modification de la répartition du poids'],
                    ['diminutionRom', 'Diminution du ROM'],
                    ['chaineOuverteFermee', 'Chaîne ouverte vs fermée'],
                    ['taping', 'Application d’un taping'],
                    ['chaussage', 'Modification du chaussage'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}</label>
                      <input value={modifSymp[k] ?? ''} onChange={e => setMS(k, e.target.value)} placeholder="Résultat / observation…" style={inputStyle} />
                    </div>
                  ))}
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
                      {FORCE_KEYS.map(([k, lbl]) => (
                        <tr key={k}>
                          <td>{lbl}</td>
                          <td><ForceInput value={force[k].gauche} onChange={v => updForce(k, 'gauche', v)} /></td>
                          <td><ForceInput value={force[k].droite} onChange={v => updForce(k, 'droite', v)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <label style={{ ...subTitleStyle, marginTop: 14 }}>Muscles abdominaux</label>
                  <table className="mobility-table">
                    <thead><tr><th>Muscle</th><th style={{ textAlign: 'center' }}>Force</th></tr></thead>
                    <tbody>
                      {ABDO_KEYS.map(([k, lbl]) => (
                        <tr key={k}>
                          <td>{lbl}</td>
                          <td><ForceInput value={abdo[k]} onChange={v => updAbdo(k, v)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <label style={{ ...lblStyle, marginTop: 10 }}>Autres tests de force</label>
                  <textarea value={autresForce} onChange={e => setAutresForce(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Examen des mouvements répétés</p>
                  <label style={lblStyle}>Marqueurs avant procédure</label>
                  <input value={mvtRepMarqueurs} onChange={e => setMvtRepMarqueurs(e.target.value)} placeholder="Douleur, amplitude…" style={inputStyle} />
                  <label style={lblStyle}>Résultats</label>
                  <textarea value={mvtRepResultats} onChange={e => setMvtRepResultats(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Centralisation, périphérisation…" />
                </>
              )}

              {sec.id === 'neuro' && (
                <>
                  <p style={sectionTitleStyle}>Examen neurologique</p>
                  {([
                    ['reflexes', 'Réflexes', 'Rotulien, achilléen…'],
                    ['force', 'Force', 'Territoire concerné…'],
                    ['sensibilite', 'Sensibilité', 'Hypo/hyperesthésie, dermatome…'],
                    ['babinski', 'Babinski', '+ / -'],
                  ] as [string, string, string][]).map(([k, lbl, ph]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}{k === 'babinski' && <TestInfoButton testKey="babinski" />}</label>
                      <input value={neuro[k] ?? (k === 'force' ? (neuro.deficitMoteur ?? '') : '')} onChange={e => setN(k, e.target.value)} placeholder={ph} style={inputStyle} />
                    </div>
                  ))}
                  <label style={lblStyle}>Réversibilité</label>
                  <input value={neuro.reversibilite ?? ''} onChange={e => setN('reversibilite', e.target.value)} placeholder="Oui / Non — précisions…" style={inputStyle} />
                  <label style={lblStyle}>Comportement</label>
                  <input value={neuro.comportement ?? ''} onChange={e => setN('comportement', e.target.value)} placeholder="Utile / Inutile — type…" style={inputStyle} />
                  <label style={lblStyle}>Palpation Nerf(s)</label>
                  <input value={neuro.palpationNerfs ?? ''} onChange={e => setN('palpationNerfs', e.target.value)} placeholder="Douleur, lequel…" style={inputStyle} />
                  <p style={{ ...sectionTitleStyle, margin: '12px 0 6px' }}>Nerf / Racine</p>
                  <OuiNon label="Sous pression" value={neuro.nerfSousPression ?? ''} onChange={v => setN('nerfSousPression', v)} />
                  <OuiNon label="Malade" value={neuro.nerfMalade ?? ''} onChange={v => setN('nerfMalade', v)} />

                  <label style={{ ...lblStyle, marginTop: 10 }}>Schéma des troubles sensitifs</label>
                  <textarea value={neuro.troublesSensitifsNotes} onChange={e => setN('troublesSensitifsNotes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Localisation, qualité…" />

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Mécanosensibilité</p>
                  {([
                    ['lasegue', 'Lasègue'],
                    ['pkb', 'PKB (Prone Knee Bend)'],
                    ['slump', 'Slump test'],
                    ['nerfCutaneLateralCuisse', 'Nerf cutané latéral de la cuisse'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}<TestInfoButton testKey={k} /></label>
                      <input value={mecano[k] ?? ''} onChange={e => setMe(k, e.target.value)} placeholder="+ / − / reproduction symptômes…" style={inputStyle} />
                    </div>
                  ))}
                </>
              )}

              {sec.id === 'testsSpec' && (
                <>
                  {([
                    ['clusterLaslett', 'Cluster Laslett (SIJ)'],
                    ['ober', 'Test d’Ober'],
                    ['thomas', 'Test de Thomas'],
                    ['faddir', 'FADDIR'],
                    ['faber', 'FABER (Patrick)'],
                    ['clusterSultive', 'Cluster Sultive'],
                    ['heer', 'Test HEER'],
                    ['abdHeer', 'ABD HEER'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}<TestInfoButton testKey={k} /></label>
                      <input value={tests[k] ?? ''} onChange={e => setT(k, e.target.value)} placeholder="Résultat…" style={inputStyle} />
                    </div>
                  ))}
                  <label style={lblStyle}>Autres tests</label>
                  <textarea value={tests.autres ?? ''} onChange={e => setT('autres', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
                </>
              )}

              {sec.id === 'scores' && (
                <>
                  {([
                    ['hoos', 'HOOS — Hip disability and Osteoarthritis Outcome Score', 'hoos'],
                    ['oxfordHip', 'Oxford Hip Score', 'oxfordHip'],
                    ['hagos', 'HAGOS', null],
                    ['efmi', 'Échelle Fonctionnelle des MI (EFMI)', null],
                    ['had', 'Échelle HAD', 'had'],
                    ['dn4', 'DN4', 'dn4'],
                    ['sensibilisation', 'Sensibilisation centrale', 'csi'],
                  ] as [string, string, string | null][]).map(([k, lbl, qId]) => (
                    <ScoreRow key={k} label={lbl} value={scores[k]} onChange={v => updScore(k, v)}
                      onOpenQuestionnaire={qId ? () => questionnaires.open(qId, k) : undefined}
                      result={qId ? questionnaires.getResult(k, qId) : undefined} />
                  ))}
                  <PSFSCards items={psfs} onChange={setPsfs} />
                  <label style={{ ...lblStyle, marginTop: 8 }}>Autres scores</label>
                  <textarea value={scores.autres ?? ''} onChange={e => updScore('autres', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Nom et score…" />
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

BilanHanche.displayName = 'BilanHanche'
