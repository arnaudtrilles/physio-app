import { useState, useImperativeHandle, forwardRef } from 'react'
import { OuiNon, SectionHeader, ScoreRow } from './shared'
import { useQuestionnaires } from './questionnaires/useQuestionnaires'
import { TestInfoButton } from './testInfo/TestInfoButton'
import {
  DouleurSection, RedFlagsSection, YellowFlagsSection, BlueBlackFlagsSection,
  ContratKineSection, ConseilsSection, PSFSCards,
  MobiliteRachisTable, initMobiliteRachis,
  MvtsRepetesTable, emptyMvtRep,
  emptyDouleur, mergeDouleur,
  emptyRedFlags, mergeRedFlags,
  emptyYellow, mergeYellow,
  emptyBlueBlack, mergeBlueBlack,
  emptyContrat, mergeContrat,
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

  const [douleur, setDouleur] = useState<DouleurState>(() => mergeDouleur((init.douleur as Record<string, unknown>) ?? {}))
  const [redFlags, setRedFlags] = useState<RedFlagsState>(() => mergeRedFlags((init.redFlags as Record<string, unknown>) ?? {}))
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
    clusterLaslett: '', extensionRotation: '', proneInstability: '', ta: '', autres: '',
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

  const [open, setOpen] = useState<Record<string, boolean>>({ douleur: true })
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

  const sections = [
    { id: 'douleur',       title: 'Douleur',                          color: 'var(--primary)' },
    { id: 'redFlags',      title: 'Red Flags 🚩',                      color: '#dc2626' },
    { id: 'yellowFlags',   title: 'Yellow Flags 🟡',                   color: '#d97706' },
    { id: 'blueBlackFlags',title: 'Blue / Black Flags',                color: '#7c3aed' },
    { id: 'examClinique',  title: 'Examen clinique',                   color: 'var(--primary)' },
    { id: 'neuro',         title: 'Neurologique',                      color: 'var(--primary)' },
    { id: 'mecano',        title: 'Mécanosensibilité',                 color: 'var(--primary)' },
    { id: 'mvtRep',        title: 'Mouvements répétés',                color: 'var(--primary)' },
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
                <>
                  {hasCaudaEquina && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.88rem', marginBottom: 4 }}>
                        🚨 Urgence — Suspicion syndrome queue de cheval
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#7f1d1d', margin: 0 }}>Orientation en urgence aux urgences chirurgicales. IRM immédiate.</p>
                    </div>
                  )}
                  <RedFlagsSection state={redFlags} onChange={p => setRedFlags(s => ({ ...s, ...p }))} variant="lower" />
                </>
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

                  <label style={subTitleStyle}>Mobilité du rachis lombaire</label>
                  <MobiliteRachisTable rows={MOB_LOMB_KEYS} state={mobLombaire} onChange={updMobL} />

                  <label style={lblStyle}>Autres zones</label>
                  <textarea value={autresZones} onChange={e => setAutresZones(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Hanches, genoux, sacro-iliaques…" />
                </>
              )}

              {sec.id === 'neuro' && (
                <>
                  <p style={sectionTitleStyle}>Réflexes</p>
                  {([
                    ['reflexeQuadriciptal', 'Réflexe quadricipital (L3-L4)'],
                    ['reflexeAchilleen', 'Réflexe achilléen (S1)'],
                    ['reflexesAutres', 'Autres réflexes'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}</label>
                      <input value={neuro[k]} onChange={e => setN(k, e.target.value)} placeholder="Normo-, hypo-, aréflexique…" style={inputStyle} />
                    </div>
                  ))}

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Sensibilité</p>
                  {([
                    ['sensibilitePinceau', 'Pinceau'],
                    ['sensibiliteMonofilaments', 'Monofilaments'],
                    ['sensibiliteRoulette', 'Roulette'],
                    ['sensibiliteNeuroPen', 'NeuroPen'],
                    ['sensibiliteChaudFroid', 'Chaud-Froid'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}</label>
                      <input value={neuro[k] ?? ''} onChange={e => setN(k, e.target.value)} placeholder="Par dermatome…" style={inputStyle} />
                    </div>
                  ))}

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Force par niveau</p>
                  {([
                    ['deficitL2', 'L2 — flexion hanche'],
                    ['deficitL3', 'L3 — extension genou'],
                    ['deficitL4', 'L4 — tibial antérieur'],
                    ['deficitL5', 'L5 — long extenseur de l’hallux'],
                    ['deficitS1', 'S1 — triceps sural'],
                    ['deficitS2', 'S2 — fléchisseurs orteils'],
                    ['deficitS3S4', 'S3-S4 — périnée'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}</label>
                      <input value={neuro[k]} onChange={e => setN(k, e.target.value)} placeholder="MRC / observation…" style={inputStyle} />
                    </div>
                  ))}

                  <label style={lblStyle}>Babinski<TestInfoButton testKey="babinski" /></label>
                  <input value={neuro.babinski} onChange={e => setN('babinski', e.target.value)} placeholder="+ / -" style={inputStyle} />

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Réversibilité</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {['Oui', 'Non'].map(v => {
                      const key = v.toLowerCase()
                      return <button key={v} className={`choix-btn${(neuro.reversibiliteStatut ?? '') === key ? ' active' : ''}`} onClick={() => setN('reversibiliteStatut', neuro.reversibiliteStatut === key ? '' : key)}>{v}</button>
                    })}
                  </div>
                  <label style={lblStyle}>Force</label>
                  <input value={neuro.reversibiliteForce ?? ''} onChange={e => setN('reversibiliteForce', e.target.value)} placeholder="—" style={inputStyle} />
                  <label style={lblStyle}>Pinceau / Monofilaments</label>
                  <input value={neuro.reversibilitePinceau ?? ''} onChange={e => setN('reversibilitePinceau', e.target.value)} placeholder="—" style={inputStyle} />

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Comportement</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {['Utile', 'Inutile'].map(v => {
                      const key = v.toLowerCase()
                      return <button key={v} className={`choix-btn${(neuro.comportementStatut ?? '') === key ? ' active' : ''}`} onClick={() => setN('comportementStatut', neuro.comportementStatut === key ? '' : key)}>{v}</button>
                    })}
                  </div>
                  <label style={lblStyle}>Type</label>
                  <input value={neuro.comportementType ?? ''} onChange={e => setN('comportementType', e.target.value)} placeholder="—" style={inputStyle} />

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Nerf / Racine</p>
                  <OuiNon label="Sous pression" value={neuro.nerfSousPression ?? ''} onChange={v => setN('nerfSousPression', v)} />
                  <OuiNon label="Malade" value={neuro.nerfMalade ?? ''} onChange={v => setN('nerfMalade', v)} />
                  <label style={lblStyle}>Précision(s)</label>
                  <input value={neuro.nerfPrecisions ?? ''} onChange={e => setN('nerfPrecisions', e.target.value)} placeholder="—" style={inputStyle} />

                  <p style={{ ...sectionTitleStyle, margin: '14px 0 8px' }}>Palpation nerf</p>
                  <OuiNon label="Douleur" value={neuro.palpationNerfDouleur ?? ''} onChange={v => setN('palpationNerfDouleur', v)} />
                  <label style={lblStyle}>Le(s)quel(s) ?</label>
                  <input value={neuro.palpationNerfLesquels ?? ''} onChange={e => setN('palpationNerfLesquels', e.target.value)} placeholder="—" style={inputStyle} />

                  <label style={lblStyle}>Schéma des troubles sensitifs</label>
                  <textarea value={neuro.troublesSensitifsNotes} onChange={e => setN('troublesSensitifsNotes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Localisation, qualité…" />
                </>
              )}

              {sec.id === 'mecano' && (
                <>
                  {([
                    ['lasegue', 'Lasègue'],
                    ['pkb', 'PKB (Prone Knee Bend)'],
                    ['slump', 'Slump test'],
                    ['nerfCutaneLateralCuisse', 'Nerf cutané latéral de la cuisse'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}<TestInfoButton testKey={k} /></label>
                      <input value={mecano[k] ?? ''} onChange={e => setMe(k, e.target.value)} placeholder="+ / − / angle / reproduction symptômes…" style={inputStyle} />
                    </div>
                  ))}
                </>
              )}

              {sec.id === 'mvtRep' && (
                <MvtsRepetesTable rows={mvtRepRows} onChange={setMvtRepRows} />
              )}

              {sec.id === 'testsSpec' && (
                <>
                  {([
                    ['clusterLaslett', 'Cluster Laslett (SIJ)'],
                    ['extensionRotation', 'Extension-Rotation Test'],
                    ['proneInstability', 'Prone Instability Test'],
                    ['ta', 'Test TA'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={lblStyle}>{lbl}{k !== 'ta' && <TestInfoButton testKey={k} />}</label>
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
                    ['startBack', 'Start Back Screening Tool', 'startBack'],
                    ['orebro', 'Örebro Musculoskeletal Pain Screening Q.', 'orebro'],
                    ['fabq', 'FABQ (Fear Avoidance Beliefs Q.)', 'fabq'],
                    ['had', 'Échelle HAD', 'had'],
                    ['eifel', 'EIFEL — Roland Morris', 'eifel'],
                    ['dn4', 'DN4', 'dn4'],
                    ['painDetect', 'Pain Detect', 'painDetect'],
                    ['sensibilisation', 'Sensibilisation centrale', 'csi'],
                    ['odi', 'Oswestry Disability Index (ODI)', 'odi'],
                  ] as [string, string, string][]).map(([k, lbl, qId]) => (
                    <ScoreRow key={k} label={lbl} value={scores[k] ?? ''} onChange={v => updScore(k, v)}
                      onOpenQuestionnaire={() => questionnaires.open(qId, k)}
                      result={questionnaires.getResult(k, qId)} />
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

BilanLombaire.displayName = 'BilanLombaire'
