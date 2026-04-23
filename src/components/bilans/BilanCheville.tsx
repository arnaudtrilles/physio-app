import { useState, useImperativeHandle, forwardRef } from 'react'
import type { BilanMode, NarrativeReport } from '../../types'
import { BilanVocalMode } from './BilanVocalMode'
import { DictableInput, DictableTextarea } from '../VoiceMic'
import { AmplitudeInput, ForceInput, MRCInfo, OuiNon, SectionHeader, ScoreRow, BilanModeToggle } from './shared'
import { useQuestionnaires } from './questionnaires/useQuestionnaires'
import { TestInfoButton } from './testInfo/TestInfoButton'
import {
  DouleurSection, RedFlagsSection, YellowFlagsSection, BlueBlackFlagsSection,
  ContratKineSection, ConseilsSection, PSFSCards,
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
  type ContratState, type PsfsItem, type MobAPGDState,
} from './bilanSections'

export interface BilanChevilleHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

const MOB_CHEVILLE_KEYS: [string, string][] = [
  ['flexion', 'Flexion (dorsi)'], ['extension', 'Extension (plantaire)'],
  ['varus', 'Varus'], ['valgus', 'Valgus'],
  ['inversion', 'Inversion'], ['eversion', 'Éversion'],
]
const FORCE_KEYS: [string, string][] = [
  ['ilioPsoas', 'Ilio-psoas'], ['quadriceps', 'Quadriceps'],
  ['ischios', 'Ischio-jambiers'], ['abducteurs', 'Abducteurs'],
  ['adducteurs', 'Adducteurs'], ['rotateursExt', 'Rotateurs externes'],
  ['rotateursInt', 'Rotateurs internes'], ['tricepsSural', 'Triceps sural'],
  ['tibialAnt', 'Tibial antérieur'], ['tibialPost', 'Tibial postérieur'],
  ['longFibulaire', 'Long fibulaire'], ['courtFibulaire', 'Court fibulaire'],
]
const ABDO_KEYS: [string, string][] = [
  ['transverse', 'Transverse'], ['droitsAbdomen', 'Droits de l’abdomen'], ['obliques', 'Obliques'],
]

export const BilanCheville = forwardRef<BilanChevilleHandle, { initialData?: Record<string, unknown> }>(({ initialData }, ref) => {
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

  // Ottawa
  const _ot = (init.ottawa as Record<string, unknown>) ?? {}
  const [ottawa, setOttawa] = useState<Record<string, string>>({
    malleoleMediale: '', malleoleLaterale: '', cinquiemeMetatarsien: '', naviculaire: '', appuiUnipodal: '',
    ...((_ot as Record<string, string>) ?? {}),
  })
  const setOt = (k: string, v: string) => setOttawa(p => ({ ...p, [k]: v }))
  const ottawaPositive = Object.entries(ottawa).filter(([k]) => !k.endsWith('_detail')).some(([, v]) => v === 'oui')

  // Antécédents
  const _ant = (init.antecedentsEntorse as Record<string, unknown>) ?? {}
  const [ant, setAnt] = useState<Record<string, string>>({
    precedentes: '', precedentesMemeCheville: '', precedentesCombien: '', precedentesType: '',
    autreCheville: '', autreChevilleCombien: '', autreChevilleType: '',
    ...((_ant as Record<string, string>) ?? {}),
  })
  const setA = (k: string, v: string) => setAnt(p => ({ ...p, [k]: v }))

  // Examen clinique
  const _ec = (init.examClinique as Record<string, unknown>) ?? {}
  const [morpho, setMorpho] = useState<Record<string, string>>({
    rachis: '', mi: '', corrigeable: '',
    ...((_ec.morpho as Record<string, string>) ?? {}),
  })
  const setMorphoField = (k: string, v: string) => setMorpho(p => ({ ...p, [k]: v }))

  const [observation, setObservation] = useState<Record<string, string>>({
    boiterie: '', amyotrophie: '', amyotrophieLoc: '', autre: '',
    ...((_ec.observation as Record<string, string>) ?? {}),
  })
  const setObs = (k: string, v: string) => setObservation(p => ({ ...p, [k]: v }))

  const [oedeme, setOedeme] = useState<Record<string, string>>({
    technique8Gauche: '', technique8Droite: '',
    malleo5cmGauche: '', malleo5cmDroite: '',
    malleoGauche: '', malleoDroite: '',
    ...((_ec.oedeme as Record<string, string>) ?? {}),
  })
  const setOed = (k: string, v: string) => setOedeme(p => ({ ...p, [k]: v }))

  const [fonctionnel, setFonctionnel] = useState<Record<string, string>>({
    accroupissement: '', accroupissementSympt: '',
    course: '', courseSympt: '',
    sautsBi: '', sautsBiSympt: '',
    sautsUni: '', sautsUniSympt: '',
    autres: '',
    ...((_ec.fonctionnel as Record<string, string>) ?? {}),
  })
  const setFonc = (k: string, v: string) => setFonctionnel(p => ({ ...p, [k]: v }))

  // WBLT
  const [wblt, setWblt] = useState<Record<string, string>>({
    gauchePiedPlat: '', gaucheHalluxReleve: '',
    droitePiedPlat: '', droiteHalluxReleve: '',
    ...((_ec.wblt as Record<string, string>) ?? {}),
  })
  const setW = (k: string, v: string) => setWblt(p => ({ ...p, [k]: v }))

  const [mobCheville, setMobCheville] = useState<MobAPGDState>(() => initMobAPGD(MOB_CHEVILLE_KEYS.map(([k]) => k), (_ec.mobiliteCheville as MobAPGDState)))
  const updMob = (k: string, side: 'ag' | 'ad' | 'pg' | 'pd', v: string) =>
    setMobCheville(p => ({ ...p, [k]: { ...p[k], [side]: v } }))

  // Tests cheville (groupés par catégorie)
  const _ts = (init.testsSpecifiques as Record<string, unknown>) ?? {}
  const [tests, setTests] = useState<Record<string, string>>({
    // Talo-crurale
    altd: '', altdRemarques: '', raltd: '', raltdRemarques: '',
    talarTiltVarus: '', talarTiltVarusRemarques: '',
    talarTiltValgus: '', talarTiltValgusRemarques: '',
    // Syndesmose
    kleiger: '', kleigerRemarques: '',
    fibularTranslation: '', fibularTranslationRemarques: '',
    tiroirTalienTransversal: '', tiroirTalienTransversalRemarques: '',
    squeeze: '', squeezeRemarques: '',
    // Carrefour postérieur
    grinding: '', grindingRemarques: '',
    impaction: '', impactionRemarques: '',
    longFlechisseurHallux: '', longFlechisseurHalluxRemarques: '',
    molloy: '', molloyRemarques: '',
    // Sub-talaire
    varusFd: '', varusFdRemarques: '',
    valgusFd: '', valgusFdRemarques: '',
    cisaillementFd: '', cisaillementFdRemarques: '',
    // Médio-tarse
    neutralHeel: '', neutralHeelRemarques: '',
    adductionSupination: '', adductionSupinationRemarques: '',
    abductionPronation: '', abductionPronationRemarques: '',
    autres: '',
    ...((_ts as Record<string, string>) ?? {}),
  })
  const setT = (k: string, v: string) => setTests(p => ({ ...p, [k]: v }))

  // Force
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

  // Équilibre
  const _eq = (init.equilibre as Record<string, unknown>) ?? {}
  const [equilibre, setEquilibre] = useState<Record<string, string>>({
    footLiftGauche: '', footLiftDroite: '', bessGauche: '', bessDroite: '',
    yBalanceGauche: '', yBalanceDroite: '',
    ...((_eq as Record<string, string>) ?? {}),
  })
  const setEq = (k: string, v: string) => setEquilibre(p => ({ ...p, [k]: v }))

  // Mvts répétés
  const [mvtRepMarqueurs, setMvtRepMarqueurs] = useState((init.mvtRepMarqueurs as string) ?? '')
  const [mvtRepResultats, setMvtRepResultats] = useState((init.mvtRepResultats as string) ?? '')
  const [autresTestsCheville, setAutresTestsCheville] = useState((init.autresTests as string) ?? '')

  // Scores
  const _sc = (init.scores as Record<string, unknown>) ?? {}
  const [scores, setScores] = useState<Record<string, string>>({
    faam: '', cait: '', autres: '',
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

  const [open, setOpen] = useState<Record<string, boolean>>({ ottawa: true })
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  useImperativeHandle(ref, () => ({
    getData: () => ({
      ottawa,
      antecedentsEntorse: ant,
      douleur, redFlags, yellowFlags: yellow, blueBlackFlags: blueBlack,
      examClinique: { morpho, observation, oedeme, fonctionnel, wblt, mobiliteCheville: mobCheville },
      testsSpecifiques: tests,
      forceMusculaire: { force, abdo, autresForce },
      equilibre,
      mvtRepMarqueurs, mvtRepResultats, autresTests: autresTestsCheville,
      scores, psfs, contrat,
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
      if (d.ottawa)              setOttawa(p => ({ ...p, ...(d.ottawa as Record<string, string>) }))
      if (d.antecedentsEntorse)  setAnt(p => ({ ...p, ...(d.antecedentsEntorse as Record<string, string>) }))
      const ec = (d.examClinique as Record<string, unknown>) ?? {}
      if (ec.morpho)            setMorpho(p => ({ ...p, ...(ec.morpho as Record<string, string>) }))
      if (ec.observation)       setObservation(p => ({ ...p, ...(ec.observation as Record<string, string>) }))
      if (ec.oedeme)            setOedeme(p => ({ ...p, ...(ec.oedeme as Record<string, string>) }))
      if (ec.fonctionnel)       setFonctionnel(p => ({ ...p, ...(ec.fonctionnel as Record<string, string>) }))
      if (ec.wblt)              setWblt(p => ({ ...p, ...(ec.wblt as Record<string, string>) }))
      if (ec.mobiliteCheville)  setMobCheville(p => ({ ...p, ...(ec.mobiliteCheville as MobAPGDState) }))
      if (d.testsSpecifiques)    setTests(p => ({ ...p, ...(d.testsSpecifiques as Record<string, string>) }))
      const fo = (d.forceMusculaire as Record<string, unknown>) ?? {}
      if (fo.force)        setForce(p => ({ ...p, ...(fo.force as Record<string, { gauche: string; droite: string }>) }))
      if (fo.abdo)         setAbdo(p => ({ ...p, ...(fo.abdo as Record<string, string>) }))
      if (fo.autresForce !== undefined) setAutresForce(fo.autresForce as string)
      if (d.equilibre)           setEquilibre(p => ({ ...p, ...(d.equilibre as Record<string, string>) }))
      if (d.mvtRepMarqueurs !== undefined) setMvtRepMarqueurs(d.mvtRepMarqueurs as string)
      if (d.mvtRepResultats !== undefined) setMvtRepResultats(d.mvtRepResultats as string)
      if (d.autresTests !== undefined) setAutresTestsCheville(d.autresTests as string)
      if (d.scores)              setScores(p => ({ ...p, ...(d.scores as Record<string, string>) }))
      const cn = (d.conseils as Record<string, unknown>) ?? {}
      if (cn.recos !== undefined) setConseils(cn.recos as string)
      if (d.questionnaireAnswers) setQAnswers(d.questionnaireAnswers as Record<string, Record<string, unknown>>)
      if (d.questionnaireResults) setQResults(d.questionnaireResults as Record<string, import('./questionnaires/useQuestionnaires').StoredResult>)
    },
  }))

  // Noyau EBP cheville (JOSPT Lateral Ankle Ligament Sprains 2021) : Ottawa rules obligatoires,
  // antécédents d'entorse, douleur, red flags, yellow flags simplifiés, examen clinique (dorsiflexion + WBLT),
  // tests spécifiques (ALTD + Reverse ALTD), force ciblée, équilibre (appui unipodal), scores (CAIT pour CAI).
  type Priority = 'noyau' | 'approfondissement'
  const allSections: { id: string; title: string; color: string; priority: Priority }[] = [
    { id: 'ottawa',        title: "Critères d'Ottawa",                color: '#991b1b',        priority: 'noyau' },
    { id: 'antecedents',   title: "Antécédents d'entorse",            color: '#1A1A1A', priority: 'noyau' },
    { id: 'douleur',       title: 'Douleur',                          color: '#1A1A1A', priority: 'noyau' },
    { id: 'redFlags',      title: 'Red Flags 🚩',                      color: '#991b1b',        priority: 'noyau' },
    { id: 'yellowFlags',   title: 'Yellow Flags 🟡',                   color: '#d97706',        priority: 'noyau' },
    { id: 'blueBlackFlags',title: 'Blue / Black Flags',                color: '#7c3aed',        priority: 'approfondissement' },
    { id: 'examClinique',  title: 'Examen clinique',                   color: '#1A1A1A', priority: 'noyau' },
    { id: 'testsSpec',     title: 'Tests spécifiques cheville',        color: '#1A1A1A', priority: 'noyau' },
    { id: 'force',         title: 'Force musculaire',                  color: '#1A1A1A', priority: 'noyau' },
    { id: 'equilibre',     title: 'Équilibre postural',                color: '#1A1A1A', priority: 'noyau' },
    { id: 'mvtRep',        title: 'Mouvements répétés',                color: '#1A1A1A', priority: 'approfondissement' },
    { id: 'scores',        title: 'Scores fonctionnels',               color: '#1A1A1A', priority: 'noyau' },
    { id: 'contrat',       title: 'Contrat kiné',                      color: '#059669',        priority: 'noyau' },
    { id: 'conseils',      title: 'Conseils & recommandations',        color: '#059669',        priority: 'noyau' },
  ]
  const sections = coreMode ? allSections.filter(s => s.priority === 'noyau') : allSections

  const renderTestRow = (k: string, lbl: string) => (
    <div key={k} className="oui-non-group" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="oui-non-label">{lbl}<TestInfoButton testKey={k} /></span>
        <div className="oui-non-btns">
          {(['Positif', 'Négatif'] as const).map(v => {
            const stored = v === 'Positif' ? 'positif' : 'negatif'
            return (
              <button key={v} className={`oui-non-btn${tests[k] === stored ? ' active' : ''}`} onClick={() => setT(k, tests[k] === stored ? '' : stored)}>{v}</button>
            )
          })}
        </div>
      </div>
      {tests[k] && (
        <DictableInput value={tests[k + 'Remarques'] ?? ''} onChange={e => setT(k + 'Remarques', e.target.value)} placeholder="Remarques…"
          inputStyle={{ marginTop: 6, width: '100%', padding: '0.45rem 0.7rem', fontSize: '0.82rem', color: 'var(--text-main)', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)' }} />
      )}
    </div>
  )

  return (
    <div>
      <BilanModeToggle mode={mode} onChange={setMode} />
      {mode === 'vocal' && <BilanVocalMode zone="Cheville" initialReport={vocalReport} onChange={setVocalReport} />}
      {mode !== 'vocal' && sections.map(sec => (
        <div key={sec.id} style={{ marginBottom: 4 }}>
          <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} color={sec.color} badge={sec.priority === 'approfondissement' ? 'approfondissement' : undefined} />
          {open[sec.id] && (
            <div style={{ paddingTop: 12, paddingBottom: 8 }}>

              {sec.id === 'ottawa' && (
                <>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Si <strong>1 critère positif</strong> → radiographie recommandée
                  </p>
                  {ottawaPositive && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.85rem' }}>⚠️ Au moins un critère positif — orientation radio</div>
                    </div>
                  )}
                  {([
                    ['malleoleMediale', 'Sensibilité osseuse bord post / pointe malléole médiale'],
                    ['malleoleLaterale', 'Sensibilité osseuse bord post / pointe malléole latérale'],
                    ['cinquiemeMetatarsien', 'Sensibilité osseuse base 5e métatarsien'],
                    ['naviculaire', 'Sensibilité osseuse naviculaire'],
                    ['appuiUnipodal', 'Incapacité à supporter poids en unipodal + 4 pas'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={ottawa[k]} onChange={v => setOt(k, v)} />
                  ))}
                </>
              )}

              {sec.id === 'antecedents' && (
                <>
                  <OuiNon label="Précédentes entorses" value={ant.precedentes} onChange={v => setA('precedentes', v)} />
                  {ant.precedentes === 'oui' && (
                    <>
                      <OuiNon label="Sur la même cheville ?" value={ant.precedentesMemeCheville} onChange={v => setA('precedentesMemeCheville', v)} />
                      <label style={lblStyle}>Combien ?</label>
                      <DictableInput value={ant.precedentesCombien} onChange={e => setA('precedentesCombien', e.target.value)} placeholder="Nombre…" inputStyle={inputStyle} />
                      <label style={lblStyle}>Type</label>
                      <DictableInput value={ant.precedentesType} onChange={e => setA('precedentesType', e.target.value)} placeholder="Inversion / éversion / haute…" inputStyle={inputStyle} />
                    </>
                  )}
                  <OuiNon label="Entorse autre cheville" value={ant.autreCheville} onChange={v => setA('autreCheville', v)} />
                  {ant.autreCheville === 'oui' && (
                    <>
                      <label style={lblStyle}>Combien ?</label>
                      <DictableInput value={ant.autreChevilleCombien} onChange={e => setA('autreChevilleCombien', e.target.value)} placeholder="—" inputStyle={inputStyle} />
                      <label style={lblStyle}>Type</label>
                      <DictableInput value={ant.autreChevilleType} onChange={e => setA('autreChevilleType', e.target.value)} placeholder="—" inputStyle={inputStyle} />
                    </>
                  )}
                </>
              )}

              {sec.id === 'douleur' && (
                <DouleurSection state={douleur} onChange={p => setDouleur(s => ({ ...s, ...p }))}
                  options={{ hasFacteurDeclenchant: false, hasMecanismeLesionnel: true }} coreMode={coreMode} />
              )}

              {sec.id === 'redFlags' && (
                <RedFlagsSection state={redFlags} onChange={p => setRedFlags(s => ({ ...s, ...p }) as RedFlagsState)} variant="ankle" coreMode={coreMode} />
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
                  <DictableInput value={morpho.mi} onChange={e => setMorphoField('mi', e.target.value)} placeholder="Valgus / varus, rotation…" inputStyle={inputStyle} />
                  {!coreMode && (
                    <>
                      <label style={lblStyle}>Attitude du rachis</label>
                      <DictableInput value={morpho.rachis} onChange={e => setMorphoField('rachis', e.target.value)} placeholder="—" inputStyle={inputStyle} />
                      <OuiNon label="Corrigeable ?" value={morpho.corrigeable} onChange={v => setMorphoField('corrigeable', v)} />
                    </>
                  )}

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Observation</p>
                  <OuiNon label="Boiterie à la marche" value={observation.boiterie} onChange={v => setObs('boiterie', v)} />
                  <OuiNon label="Œdème" value={observation.amyotrophie} onChange={v => setObs('amyotrophie', v)} />
                  {observation.amyotrophie === 'oui' && (
                    <DictableInput value={observation.amyotrophieLoc} onChange={e => setObs('amyotrophieLoc', e.target.value)} placeholder="Localisation…" inputStyle={{ ...inputStyle, marginTop: 6 }} />
                  )}
                  {!coreMode && (
                    <>
                      <label style={lblStyle}>Autre observation</label>
                      <DictableInput value={observation.autre} onChange={e => setObs('autre', e.target.value)} placeholder="—" inputStyle={inputStyle} />

                      <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Œdème (mesures)</p>
                      <table className="mobility-table">
                        <thead><tr><th>Mesure</th><th style={{ textAlign: 'center' }}>Gauche</th><th style={{ textAlign: 'center' }}>Droite</th></tr></thead>
                        <tbody>
                          {([
                            ['technique8', 'Technique en 8'],
                            ['malleo5cm', 'Malléolaire +5 cm'],
                            ['malleo', 'Malléolaire'],
                          ] as [string, string][]).map(([k, lbl]) => (
                            <tr key={k}>
                              <td>{lbl}</td>
                              <td><input value={oedeme[k + 'Gauche']} onChange={e => setOed(k + 'Gauche', e.target.value)} placeholder="cm" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', textAlign: 'center', fontSize: '0.82rem', padding: '2px' }} /></td>
                              <td><input value={oedeme[k + 'Droite']} onChange={e => setOed(k + 'Droite', e.target.value)} placeholder="cm" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', textAlign: 'center', fontSize: '0.82rem', padding: '2px' }} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Fonctionnel</p>
                      <StatusSymptomes label="Accroupissement" status={fonctionnel.accroupissement} symptomes={fonctionnel.accroupissementSympt} onChangeStatus={v => setFonc('accroupissement', v)} onChangeSympt={v => setFonc('accroupissementSympt', v)} />
                      <StatusSymptomes label="Course" status={fonctionnel.course} symptomes={fonctionnel.courseSympt} onChangeStatus={v => setFonc('course', v)} onChangeSympt={v => setFonc('courseSympt', v)} />
                      <StatusSymptomes label="Sauts bipodaux" status={fonctionnel.sautsBi} symptomes={fonctionnel.sautsBiSympt} onChangeStatus={v => setFonc('sautsBi', v)} onChangeSympt={v => setFonc('sautsBiSympt', v)} />
                      <StatusSymptomes label="Sauts unipodaux" status={fonctionnel.sautsUni} symptomes={fonctionnel.sautsUniSympt} onChangeStatus={v => setFonc('sautsUni', v)} onChangeSympt={v => setFonc('sautsUniSympt', v)} />
                      <label style={lblStyle}>Autres</label>
                      <DictableTextarea value={fonctionnel.autres} onChange={e => setFonc('autres', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
                    </>
                  )}

                  {/* WBLT : JOSPT 2021 impose dorsiflexion ROM — WBLT est le test le plus fiable. */}
                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Weight Bearing Lunge Test (dorsiflexion)</p>
                  <table className="mobility-table">
                    <thead><tr><th>Position</th><th style={{ textAlign: 'center' }}>Gauche</th><th style={{ textAlign: 'center' }}>Droite</th></tr></thead>
                    <tbody>
                      <tr><td>Pied à plat</td>
                        <td><input value={wblt.gauchePiedPlat} onChange={e => setW('gauchePiedPlat', e.target.value)} placeholder="cm" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', textAlign: 'center', fontSize: '0.82rem', padding: '2px' }} /></td>
                        <td><input value={wblt.droitePiedPlat} onChange={e => setW('droitePiedPlat', e.target.value)} placeholder="cm" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', textAlign: 'center', fontSize: '0.82rem', padding: '2px' }} /></td>
                      </tr>
                      <tr><td>Hallux relevé</td>
                        <td><input value={wblt.gaucheHalluxReleve} onChange={e => setW('gaucheHalluxReleve', e.target.value)} placeholder="cm" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', textAlign: 'center', fontSize: '0.82rem', padding: '2px' }} /></td>
                        <td><input value={wblt.droiteHalluxReleve} onChange={e => setW('droiteHalluxReleve', e.target.value)} placeholder="cm" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', textAlign: 'center', fontSize: '0.82rem', padding: '2px' }} /></td>
                      </tr>
                    </tbody>
                  </table>

                  <label style={subTitleStyle}>Mobilité — Cheville (°)</label>
                  <table className="mobility-table">
                    <thead>
                      <tr><th rowSpan={2}>Mouvement</th><th colSpan={2} style={{ textAlign: 'center' }}>Active</th><th colSpan={2} style={{ textAlign: 'center' }}>Passive</th></tr>
                      <tr><th style={{ textAlign: 'center' }}>G</th><th style={{ textAlign: 'center' }}>D</th><th style={{ textAlign: 'center' }}>G</th><th style={{ textAlign: 'center' }}>D</th></tr>
                    </thead>
                    <tbody>
                      {MOB_CHEVILLE_KEYS.map(([k, lbl]) => (
                        <tr key={k}>
                          <td>{lbl}</td>
                          <td><AmplitudeInput value={mobCheville[k].ag} onChange={v => updMob(k, 'ag', v)} /></td>
                          <td><AmplitudeInput value={mobCheville[k].ad} onChange={v => updMob(k, 'ad', v)} /></td>
                          <td><AmplitudeInput value={mobCheville[k].pg} onChange={v => updMob(k, 'pg', v)} /></td>
                          <td><AmplitudeInput value={mobCheville[k].pd} onChange={v => updMob(k, 'pd', v)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {sec.id === 'testsSpec' && (
                <>
                  {/* Noyau JOSPT 2021 : Revised Anterior Drawer (RALTD) + Anterior Drawer (ALTD)
                      + talar tilt varus (CFL). Le reste en approfondissement. */}
                  <p style={sectionTitleStyle}>Talo-crurale</p>
                  {renderTestRow('altd', 'ALTD — Lig. talo-fibulaire antérieur')}
                  {renderTestRow('raltd', 'Reverse ALTD — anterolateral talar palpation')}
                  {renderTestRow('talarTiltVarus', 'Talar Tilt varus — Lig. calcanéo-fibulaire')}
                  {!coreMode && renderTestRow('talarTiltValgus', 'Talar Tilt valgus — Lig. deltoïde')}

                  {!coreMode && (
                    <>
                      <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Syndesmose tibio-fibulaire inférieure</p>
                      {renderTestRow('kleiger', 'Test de Kleiger')}
                      {renderTestRow('fibularTranslation', 'Fibular Translation Test')}
                      {renderTestRow('tiroirTalienTransversal', 'Tiroir talien transversal')}
                      {renderTestRow('squeeze', 'Squeeze Test')}

                      <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Carrefour postérieur</p>
                      {renderTestRow('grinding', 'Grinding Test — conflit postérieur osseux')}
                      {renderTestRow('impaction', "Test d'impaction — conflit postérieur osseux")}
                      {renderTestRow('longFlechisseurHallux', "Long fléchisseur de l'hallux — tissus mous")}
                      {renderTestRow('molloy', 'Molloy Test — conflit antéro-latéral')}

                      <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Sub-talaire</p>
                      {renderTestRow('varusFd', 'Varus FD')}
                      {renderTestRow('valgusFd', 'Valgus FD')}
                      {renderTestRow('cisaillementFd', 'Cisaillement FD')}

                      <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Médio-tarse (Chopart)</p>
                      {renderTestRow('neutralHeel', 'Neutral Heel Lateral Push — Spring Ligament')}
                      {renderTestRow('adductionSupination', 'Adduction-supination')}
                      {renderTestRow('abductionPronation', 'Abduction-pronation')}

                      <label style={{ ...lblStyle, marginTop: 10 }}>Autres tests</label>
                      <DictableTextarea value={tests.autres ?? ''} onChange={e => setT('autres', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
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
                      {/* Noyau JOSPT 2021 : triceps sural, tibial antérieur/postérieur, long/court fibulaire
                          (éverseurs — protection instabilité latérale). */}
                      {(coreMode
                        ? FORCE_KEYS.filter(([k]) => ['tricepsSural', 'tibialAnt', 'tibialPost', 'longFibulaire', 'courtFibulaire'].includes(k))
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
                    </>
                  )}
                </>
              )}

              {sec.id === 'equilibre' && (
                <>
                  {/* JOSPT 2021 : balance impaired = critère d'instabilité chronique. Foot Lift = test simple et sensible. */}
                  <p style={sectionTitleStyle}>Statique</p>
                  <table className="mobility-table">
                    <thead><tr><th>Test</th><th style={{ textAlign: 'center' }}>Gauche</th><th style={{ textAlign: 'center' }}>Droite</th></tr></thead>
                    <tbody>
                      <tr><td>Foot Lift Test<TestInfoButton testKey="footLift" /></td>
                        <td><input value={equilibre.footLiftGauche} onChange={e => setEq('footLiftGauche', e.target.value)} placeholder="—" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', textAlign: 'center', fontSize: '0.82rem', padding: '2px' }} /></td>
                        <td><input value={equilibre.footLiftDroite} onChange={e => setEq('footLiftDroite', e.target.value)} placeholder="—" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', textAlign: 'center', fontSize: '0.82rem', padding: '2px' }} /></td>
                      </tr>
                      {!coreMode && (
                        <tr><td>BESS /60<TestInfoButton testKey="bess" /></td>
                          <td><input type="number" value={equilibre.bessGauche} onChange={e => setEq('bessGauche', e.target.value)} placeholder="/60" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', textAlign: 'center', fontSize: '0.82rem', padding: '2px' }} /></td>
                          <td><input type="number" value={equilibre.bessDroite} onChange={e => setEq('bessDroite', e.target.value)} placeholder="/60" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', textAlign: 'center', fontSize: '0.82rem', padding: '2px' }} /></td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {!coreMode && (
                    <>
                      <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Dynamique — Y Balance Test<TestInfoButton testKey="yBalance" /></p>
                      <label style={lblStyle}>Gauche (Antérieur / Postéro-médial / Postéro-latéral)</label>
                      <DictableInput value={equilibre.yBalanceGauche} onChange={e => setEq('yBalanceGauche', e.target.value)} placeholder="ex: 65 / 95 / 90 cm" inputStyle={inputStyle} />
                      <label style={lblStyle}>Droite (Antérieur / Postéro-médial / Postéro-latéral)</label>
                      <DictableInput value={equilibre.yBalanceDroite} onChange={e => setEq('yBalanceDroite', e.target.value)} placeholder="ex: 67 / 96 / 92 cm" inputStyle={inputStyle} />
                    </>
                  )}
                </>
              )}

              {sec.id === 'mvtRep' && (
                <>
                  <label style={lblStyle}>Marqueurs avant procédure</label>
                  <DictableInput value={mvtRepMarqueurs} onChange={e => setMvtRepMarqueurs(e.target.value)} placeholder="—" inputStyle={inputStyle} />
                  <label style={lblStyle}>Résultats</label>
                  <DictableTextarea value={mvtRepResultats} onChange={e => setMvtRepResultats(e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
                  <label style={{ ...lblStyle, marginTop: 10 }}>Autres tests</label>
                  <DictableTextarea value={autresTestsCheville} onChange={e => setAutresTestsCheville(e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
                </>
              )}

              {sec.id === 'scores' && (
                <>
                  {/* Noyau : PSFS seul. F-FAAM et CAIT → approfondissement. */}
                  {!coreMode && ([
                    ['faam', 'F-FAAM (Foot and Ankle Ability Measure)', 'ffaam'],
                    ['cait', 'Cumberland Ankle Instability Tool', 'cait'],
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

BilanCheville.displayName = 'BilanCheville'
