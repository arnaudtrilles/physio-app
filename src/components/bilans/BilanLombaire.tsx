import { useState, useImperativeHandle, forwardRef } from 'react'
import type { BilanMode, NarrativeReport } from '../../types'
import { BilanVocalMode } from './BilanVocalMode'
import { DictableInput, DictableTextarea } from '../VoiceMic'
import { OuiNon, SectionHeader, ScoreRow, BilanModeToggle } from './shared'
import { useQuestionnaires } from './questionnaires/useQuestionnaires'
import { TestInfoButton } from './testInfo/TestInfoButton'
import { TestResultInput, ClusterLaslettInput } from './testInputs'
import { InfosGeneralesSection } from './InfosGeneralesSection'
import {
  DouleurSection, RedFlagsSection, YellowFlagsSection, BlueBlackFlagsSection,
  ContratKineSection, ConseilsSection, PSFSCards,
  MobiliteRachisTable, initMobiliteRachis,
  MvtsRepetesTable, emptyMvtRep,
  mergeDouleur,
  initRedFlags,
  mergeYellow,
  mergeBlueBlack,
  mergeContrat,
  emptyPsfs, mergePsfs,
  inputStyle, lblStyle, sectionTitleStyle, subTitleStyle,
  type DouleurState, type RedFlagsState, type YellowFlagsState, type BlueBlackState,
  type ContratState, type PsfsItem, type MobiliteRachisState, type MobiliteRachisRow, type MvtRepRow,
} from './bilanSections'

export interface BilanLombaireHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

const MOB_LOMB_KEYS: [string, string][] = [
  ['flexion', 'Flexion'], ['extension', 'Extension'],
  ['glissementLatD', 'Glissement latéral D'], ['glissementLatG', 'Glissement latéral G'],
  ['inclinaisonD', 'Inclinaison D'], ['inclinaisonG', 'Inclinaison G'],
  ['rotationD', 'Rotation D'], ['rotationG', 'Rotation G'],
]

export const BilanLombaire = forwardRef<BilanLombaireHandle, { initialData?: Record<string, unknown> }>(({ initialData }, ref) => {
  const init = initialData ?? {}

  // Mode Noyau (EBP minimum) activé par défaut pour tout nouveau bilan.
  // Si initialData contient déjà des données, on reste en Noyau également — le kiné peut basculer en Complet à tout moment.
  const [mode, setMode] = useState<BilanMode>('noyau')
  const coreMode = mode === 'noyau'
  const [vocalReport, setVocalReport] = useState<NarrativeReport | null>(null)

  const [douleur, setDouleur] = useState<DouleurState>(() => mergeDouleur((init.douleur as Record<string, unknown>) ?? {}))
  const [redFlags, setRedFlags] = useState<RedFlagsState>(() => initRedFlags(init.redFlags as Record<string, unknown> | undefined))
  const [yellow, setYellow] = useState<YellowFlagsState>(() => mergeYellow((init.yellowFlags as Record<string, unknown>) ?? {}))
  const [blueBlack, setBlueBlack] = useState<BlueBlackState>(() => mergeBlueBlack((init.blueBlackFlags as Record<string, unknown>) ?? {}))
  const [contrat, setContrat] = useState<ContratState>(() => mergeContrat((init.contrat as Record<string, unknown>) ?? {}))
  const [psfs, setPsfs] = useState<PsfsItem[]>(() => mergePsfs((init.psfs as unknown) ?? emptyPsfs()))

  // ── Examen clinique ──────────────────────────────────────────────────────
  const _ec = (init.examClinique as Record<string, unknown>) ?? {}
  const [morpho, setMorpho] = useState<Record<string, string>>({
    deformation: '', shift: '', corrigeable: '', modifPosture: '',
    ...((_ec.morpho as Record<string, string>) ?? {}),
  })
  const setMorphoField = (k: string, v: string) => setMorpho(p => ({ ...p, [k]: v }))

  const [mobLombaire, setMobLombaire] = useState<MobiliteRachisState>(() => initMobiliteRachis(MOB_LOMB_KEYS.map(([k]) => k), (_ec.mobiliteLombaire as MobiliteRachisState)))
  const updMobL = (k: string, patch: Partial<MobiliteRachisRow>) => setMobLombaire(p => ({ ...p, [k]: { ...p[k], ...patch } }))

  const [autresZones, setAutresZones] = useState((_ec.autresZones as string) ?? '')

  // ── Neurologique ─────────────────────────────────────────────────────────
  const _nr = (init.neurologique as Record<string, unknown>) ?? {}
  const [neuro, setNeuro] = useState<Record<string, string>>({
    reflexeQuadriciptal: '', reflexeAchilleen: '', reflexesAutres: '',
    sensibilitePinceau: '', sensibiliteMonofilaments: '', sensibiliteRoulette: '', sensibiliteNeuroPen: '', sensibiliteChaudFroid: '',
    deficitL2: '', deficitL3: '', deficitL4: '', deficitL5: '', deficitS1: '', deficitS2: '', deficitS3S4: '',
    babinski: '', troublesSensitifsNotes: '',
    reversibiliteStatut: '', reversibiliteForce: '', reversibilitePinceau: '',
    comportementStatut: '', comportementType: '',
    nerfSousPression: '', nerfMalade: '', nerfPrecisions: '',
    palpationNerfDouleur: '', palpationNerfLesquels: '',
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

  // Mvts répétés
  const [mvtRepRows, setMvtRepRows] = useState<MvtRepRow[]>(() => {
    const saved = init.mouvementsRepetes as MvtRepRow[] | undefined
    return Array.isArray(saved) && saved.length > 0 ? saved : emptyMvtRep()
  })

  // Tests spécifiques
  const _ts = (init.testsSpecifiques as Record<string, unknown>) ?? {}
  const [tests, setTests] = useState<Record<string, string>>({
    clusterLaslett: '', extensionRotation: '', proneInstability: '', adam: '', aslr: '', autres: '',
    ...((_ts as Record<string, string>) ?? {}),
  })
  const setT = (k: string, v: string) => setTests(p => ({ ...p, [k]: v }))

  // Scores
  const _sc = (init.scores as Record<string, unknown>) ?? {}
  const [scores, setScores] = useState<Record<string, string>>({
    startBack: '', orebro: '', fabq: '', had: '', eifel: '', dn4: '', painDetect: '', sensibilisation: '', autres: '',
    ...((_sc as Record<string, string>) ?? {}),
  })
  const updScore = (k: string, v: string) => setScores(p => ({ ...p, [k]: v }))

  // Conseils
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

  // ── Cauda equina alert ───────────────────────────────────────────────────
  const hasCaudaEquina = redFlags.fonctionVesicaleAnale === 'oui' && redFlags.fonctionVesicaleStatus === 'anormal'

  useImperativeHandle(ref, () => ({
    getData: () => ({
      douleur, redFlags, yellowFlags: yellow, blueBlackFlags: blueBlack,
      examClinique: { morpho, mobiliteLombaire: mobLombaire, autresZones },
      neurologique: neuro,
      mecanosensibilite: mecano,
      mouvementsRepetes: mvtRepRows,
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
      if (ec.mobiliteLombaire)  setMobLombaire(p => ({ ...p, ...(ec.mobiliteLombaire as MobiliteRachisState) }))
      if (ec.autresZones !== undefined) setAutresZones(ec.autresZones as string)
      if (d.neurologique)        setNeuro(p => ({ ...p, ...(d.neurologique as Record<string, string>) }))
      if (d.mecanosensibilite)   setMecano(p => ({ ...p, ...(d.mecanosensibilite as Record<string, string>) }))
      if (Array.isArray(d.mouvementsRepetes)) setMvtRepRows(d.mouvementsRepetes as MvtRepRow[])
      if (d.testsSpecifiques)    setTests(p => ({ ...p, ...(d.testsSpecifiques as Record<string, string>) }))
      if (d.scores)              setScores(p => ({ ...p, ...(d.scores as Record<string, string>) }))
      const cn = (d.conseils as Record<string, unknown>) ?? {}
      if (cn.recos !== undefined) setConseils(cn.recos as string)
      if (d.questionnaireAnswers) setQAnswers(d.questionnaireAnswers as Record<string, Record<string, unknown>>)
      if (d.questionnaireResults) setQResults(d.questionnaireResults as Record<string, import('./questionnaires/useQuestionnaires').StoredResult>)
    },
  }))

  // Sections du bilan lombaire — `priority` contrôle leur visibilité en Mode Noyau.
  // Noyau EBP (NICE NG59 + McKenzie/MDT) : douleur, red flags, examen clinique (mobilité simplifiée),
  // neuro ciblé, mécanosensibilité (Lasègue), mouvements répétés, tests spécifiques (Cluster Laslett),
  // scores (StarT Back obligatoire selon NICE pour stratification), contrat, conseils.
  // Yellow/Blue flags : en Noyau, version dépistage rapide (déjà filtré dans les sections partagées).
  type Priority = 'noyau' | 'approfondissement'
  const allSections: { id: string; title: string; color: string; priority: Priority }[] = [
    { id: 'infosGenerales',title: 'Infos générales',                  color: '#1A1A1A', priority: 'noyau' },
    { id: 'douleur',       title: 'Douleur',                          color: '#1A1A1A', priority: 'noyau' },
    { id: 'redFlags',      title: 'Red Flags 🚩',                      color: '#991b1b',        priority: 'noyau' },
    { id: 'yellowFlags',   title: 'Yellow Flags 🟡',                   color: '#d97706',        priority: 'noyau' },
    { id: 'blueBlackFlags',title: 'Blue / Black Flags',                color: '#7c3aed',        priority: 'approfondissement' },
    { id: 'examClinique',  title: 'Examen clinique',                   color: '#1A1A1A', priority: 'noyau' },
    { id: 'neuro',         title: 'Neurologique',                      color: '#1A1A1A', priority: 'noyau' },
    { id: 'mecano',        title: 'Mécanosensibilité',                 color: '#1A1A1A', priority: 'noyau' },
    { id: 'mvtRep',        title: 'Mouvements répétés',                color: '#1A1A1A', priority: 'noyau' },
    { id: 'testsSpec',     title: 'Tests spécifiques',                 color: '#1A1A1A', priority: 'noyau' },
    { id: 'scores',        title: 'Scores fonctionnels',               color: '#1A1A1A', priority: 'noyau' },
    { id: 'contrat',       title: 'Contrat kiné',                      color: '#059669',        priority: 'noyau' },
    { id: 'conseils',      title: 'Conseils & recommandations',        color: '#059669',        priority: 'noyau' },
  ]
  const sections = coreMode ? allSections.filter(s => s.priority === 'noyau') : allSections

  // Mobilité lombaire en mode noyau : 4 mouvements clés (flexion, extension, inclinaisons D/G).
  // Mode complet : 8 mouvements incluant glissements latéraux et rotations.
  const mobKeysDisplayed = coreMode
    ? MOB_LOMB_KEYS.filter(([k]) => ['flexion', 'extension', 'inclinaisonD', 'inclinaisonG'].includes(k))
    : MOB_LOMB_KEYS

  // Neurologie en mode noyau : réflexes quadriciptal + achilléen, force par niveau L2-S1, sensibilité pinceau,
  // Lasègue (en section mécanosensibilité). Le reste (monofilaments, roulette, NeuroPen, chaud-froid,
  // Babinski, réversibilité, comportement, nerf sous pression, palpation) → approfondissement.
  // Mécanosensibilité noyau : Lasègue seulement (reproduit la radiculopathie lombaire).
  // Tests spécifiques noyau : Cluster Laslett (SIJ, cluster validé EBP) + Prone Instability Test.

  return (
    <div>
      <BilanModeToggle mode={mode} onChange={setMode} />
      {mode === 'vocal' && <BilanVocalMode zone="Lombaire" initialReport={vocalReport} onChange={setVocalReport} />}
      {mode !== 'vocal' && sections.map(sec => (
        <div key={sec.id} style={{ marginBottom: 4 }}>
          <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} color={sec.color} badge={sec.priority === 'approfondissement' ? 'approfondissement' : undefined} />
          {open[sec.id] && (
            <div style={{ paddingTop: 12, paddingBottom: 8 }}>

              {sec.id === 'infosGenerales' && <InfosGeneralesSection />}

              {sec.id === 'douleur' && (
                <DouleurSection state={douleur} onChange={p => setDouleur(s => ({ ...s, ...p }))} coreMode={coreMode} />
              )}

              {sec.id === 'redFlags' && (
                <>
                  {hasCaudaEquina && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.88rem', marginBottom: 4 }}>
                        🚨 Urgence — Suspicion syndrome queue de cheval
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#7f1d1d', margin: 0 }}>Orientation en urgence aux urgences chirurgicales. IRM immédiate.</p>
                    </div>
                  )}
                  <RedFlagsSection state={redFlags} onChange={p => setRedFlags(s => ({ ...s, ...p }) as RedFlagsState)} variant="lower" coreMode={coreMode} />
                </>
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
                  {coreMode ? (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                      <label style={{ ...lblStyle, width: '100%', marginBottom: 2 }}>Shift latéral (pertinent McKenzie)</label>
                      {['Aucun', 'Droit', 'Gauche'].map(v => {
                        const key = v.toLowerCase()
                        return <button key={v} className={`choix-btn${morpho.shift === key ? ' active' : ''}`} onClick={() => setMorphoField('shift', morpho.shift === key ? '' : key)}>{v}</button>
                      })}
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <label style={{ ...lblStyle, width: '100%', marginBottom: 2 }}>Déformation lombaire</label>
                        {['Cyphose', 'Lordose'].map(v => {
                          const key = v.toLowerCase()
                          return <button key={v} className={`choix-btn${morpho.deformation === key ? ' active' : ''}`} onClick={() => setMorphoField('deformation', morpho.deformation === key ? '' : key)}>{v}</button>
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <label style={{ ...lblStyle, width: '100%', marginBottom: 2 }}>Shift latéral</label>
                        {['Droit', 'Gauche'].map(v => {
                          const key = v.toLowerCase()
                          return <button key={v} className={`choix-btn${morpho.shift === key ? ' active' : ''}`} onClick={() => setMorphoField('shift', morpho.shift === key ? '' : key)}>{v}</button>
                        })}
                      </div>
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

                  <label style={subTitleStyle}>Mobilité du rachis lombaire</label>
                  <MobiliteRachisTable rows={mobKeysDisplayed} state={mobLombaire} onChange={updMobL} />

                  {!coreMode && (
                    <>
                      <label style={lblStyle}>Autres zones</label>
                      <DictableTextarea value={autresZones} onChange={e => setAutresZones(e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Hanches, genoux, sacro-iliaques…" />
                    </>
                  )}
                </>
              )}

              {sec.id === 'neuro' && (
                <>
                  <p style={sectionTitleStyle}>Réflexes</p>
                  {(coreMode
                    ? [['reflexeQuadriciptal', 'Réflexe quadricipital (L3-L4)'], ['reflexeAchilleen', 'Réflexe achilléen (S1)']]
                    : [['reflexeQuadriciptal', 'Réflexe quadricipital (L3-L4)'], ['reflexeAchilleen', 'Réflexe achilléen (S1)'], ['reflexesAutres', 'Autres réflexes']]
                  ).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}</label>
                      <DictableInput value={neuro[k]} onChange={e => setN(k, e.target.value)} placeholder="Normo-, hypo-, aréflexique…" inputStyle={inputStyle} />
                    </div>
                  ))}

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Sensibilité</p>
                  {(coreMode
                    ? [['sensibilitePinceau', 'Pinceau (dermatomes L2-S1)']]
                    : [
                        ['sensibilitePinceau', 'Pinceau'],
                        ['sensibiliteMonofilaments', 'Monofilaments'],
                        ['sensibiliteRoulette', 'Roulette'],
                        ['sensibiliteNeuroPen', 'NeuroPen'],
                        ['sensibiliteChaudFroid', 'Chaud-Froid'],
                      ]
                  ).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}</label>
                      <DictableInput value={neuro[k] ?? ''} onChange={e => setN(k, e.target.value)} placeholder="Par dermatome…" inputStyle={inputStyle} />
                    </div>
                  ))}

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Force par niveau (MRC)</p>
                  {([
                    ['deficitL2', 'L2 — flexion hanche'],
                    ['deficitL3', 'L3 — extension genou'],
                    ['deficitL4', 'L4 — tibial antérieur'],
                    ['deficitL5', 'L5 — long extenseur de l’hallux'],
                    ['deficitS1', 'S1 — triceps sural'],
                    ...(coreMode ? [] : [['deficitS2', 'S2 — fléchisseurs orteils'] as [string, string], ['deficitS3S4', 'S3-S4 — périnée'] as [string, string]]),
                  ] as [string, string][]).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}</label>
                      <DictableInput value={neuro[k]} onChange={e => setN(k, e.target.value)} placeholder="MRC / observation…" inputStyle={inputStyle} />
                    </div>
                  ))}

                  {!coreMode && (
                    <>
                      <label style={lblStyle}>Babinski<TestInfoButton testKey="babinski" /></label>
                      <DictableInput value={neuro.babinski} onChange={e => setN('babinski', e.target.value)} placeholder="+ / -" inputStyle={inputStyle} />

                      <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Réversibilité</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        {['Oui', 'Non'].map(v => {
                          const key = v.toLowerCase()
                          return <button key={v} className={`choix-btn${(neuro.reversibiliteStatut ?? '') === key ? ' active' : ''}`} onClick={() => setN('reversibiliteStatut', neuro.reversibiliteStatut === key ? '' : key)}>{v}</button>
                        })}
                      </div>
                      <label style={lblStyle}>Force</label>
                      <DictableInput value={neuro.reversibiliteForce ?? ''} onChange={e => setN('reversibiliteForce', e.target.value)} placeholder="—" inputStyle={inputStyle} />
                      <label style={lblStyle}>Pinceau / Monofilaments</label>
                      <DictableInput value={neuro.reversibilitePinceau ?? ''} onChange={e => setN('reversibilitePinceau', e.target.value)} placeholder="—" inputStyle={inputStyle} />

                      <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Comportement</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        {['Utile', 'Inutile'].map(v => {
                          const key = v.toLowerCase()
                          return <button key={v} className={`choix-btn${(neuro.comportementStatut ?? '') === key ? ' active' : ''}`} onClick={() => setN('comportementStatut', neuro.comportementStatut === key ? '' : key)}>{v}</button>
                        })}
                      </div>
                      <label style={lblStyle}>Type</label>
                      <DictableInput value={neuro.comportementType ?? ''} onChange={e => setN('comportementType', e.target.value)} placeholder="—" inputStyle={inputStyle} />

                      <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Nerf / Racine</p>
                      <OuiNon label="Sous pression" value={neuro.nerfSousPression ?? ''} onChange={v => setN('nerfSousPression', v)} />
                      <OuiNon label="Malade" value={neuro.nerfMalade ?? ''} onChange={v => setN('nerfMalade', v)} />
                      <label style={lblStyle}>Précision(s)</label>
                      <DictableInput value={neuro.nerfPrecisions ?? ''} onChange={e => setN('nerfPrecisions', e.target.value)} placeholder="—" inputStyle={inputStyle} />

                      <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Palpation nerf</p>
                      <OuiNon label="Douleur" value={neuro.palpationNerfDouleur ?? ''} onChange={v => setN('palpationNerfDouleur', v)} />
                      <label style={lblStyle}>Le(s)quel(s) ?</label>
                      <DictableInput value={neuro.palpationNerfLesquels ?? ''} onChange={e => setN('palpationNerfLesquels', e.target.value)} placeholder="—" inputStyle={inputStyle} />

                      <label style={lblStyle}>Schéma des troubles sensitifs</label>
                      <DictableTextarea value={neuro.troublesSensitifsNotes} onChange={e => setN('troublesSensitifsNotes', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Localisation, qualité…" />
                    </>
                  )}
                </>
              )}

              {sec.id === 'mecano' && (
                <>
                  {(coreMode
                    ? [
                        ['lasegue', 'Lasègue (SLR)'],
                        ['pkb', 'PKB (Prone Knee Bend)'],
                        ['slump', 'Slump test'],
                      ]
                    : [
                        ['lasegue', 'Lasègue'],
                        ['pkb', 'PKB (Prone Knee Bend)'],
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
                      placeholder={k === 'lasegue' ? 'Amplitude (°), reproduction radiculaire…' : 'Angle, reproduction symptômes…'}
                    />
                  ))}
                </>
              )}

              {sec.id === 'mvtRep' && (
                <MvtsRepetesTable rows={mvtRepRows} onChange={setMvtRepRows} />
              )}

              {sec.id === 'testsSpec' && (
                <>
                  <ClusterLaslettInput value={tests.clusterLaslett ?? ''} onChange={v => setT('clusterLaslett', v)} />
                  {(coreMode
                    ? [
                        ['proneInstability', 'Prone Instability Test'],
                        ['aslr', 'ASLR (Active Straight Leg Raise)'],
                      ]
                    : [
                        ['extensionRotation', 'Extension-Rotation Test'],
                        ['proneInstability', 'Prone Instability Test'],
                        ['aslr', 'ASLR (Active Straight Leg Raise)'],
                        ['adam', "Test d'Adam (flexion antérieure)"],
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
                  {/* Noyau : StarT Back (stratification risque NICE NG59) + PSFS (patient-centré, gold standard). */}
                  {/* Les autres scores (Örebro, FABQ, HAD, EIFEL, ODI, DN4, PainDetect, CSI) → approfondissement. */}
                  {(coreMode
                    ? [['startBack', 'Start Back Screening Tool (stratification NICE)', 'startBack']]
                    : [
                        ['startBack', 'Start Back Screening Tool', 'startBack'],
                        ['orebro', 'Örebro Musculoskeletal Pain Screening Q.', 'orebro'],
                        ['fabq', 'FABQ (Fear Avoidance Beliefs Q.)', 'fabq'],
                        ['had', 'Échelle HAD', 'had'],
                        ['eifel', 'EIFEL — Roland Morris', 'eifel'],
                        ['dn4', 'DN4', 'dn4'],
                        ['painDetect', 'Pain Detect', 'painDetect'],
                        ['sensibilisation', 'Sensibilisation centrale', 'csi'],
                        ['odi', 'Oswestry Disability Index (ODI)', 'odi'],
                      ]
                  ).map(([k, lbl, qId]) => (
                    <ScoreRow key={k} label={lbl} value={scores[k] ?? ''} onChange={v => updScore(k, v)}
                      onOpenQuestionnaire={() => questionnaires.open(qId, k)}
                      result={questionnaires.getResult(k, qId)} />
                  ))}
                  <PSFSCards items={psfs} onChange={setPsfs} />
                  {!coreMode && (
                    <>
                      <label style={{ ...lblStyle, marginTop: 8 }}>Autres scores</label>
                      <DictableTextarea value={scores.autres ?? ''} onChange={e => updScore('autres', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Nom et score…" />
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

BilanLombaire.displayName = 'BilanLombaire'
