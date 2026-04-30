import { useState, useImperativeHandle, forwardRef, memo } from 'react'
import type { BilanHandle, BilanMode, NarrativeReport } from '../../types'
import { BilanVocalMode } from './BilanVocalMode'
import { SmartObjectifsInline } from '../SmartObjectifsInline'
import { DictableInput, DictableTextarea } from '../VoiceMic'
import { AmplitudeInput, ForceInput, MRCInfo, OuiNon, SectionHeader, ScoreRow, BilanModeToggle } from './shared'
import { inputStyle, boolToStr, DouleurSection, mergeDouleur, type DouleurState } from './bilanSections'
import { useQuestionnaires } from './questionnaires/useQuestionnaires'
import { TestInfoButton } from './testInfo/TestInfoButton'
import { TestResultInput } from './testInputs'
import { InfosGeneralesSection } from './InfosGeneralesSection'

export type BilanEpauleHandle = BilanHandle

const BilanEpauleInner = forwardRef<BilanEpauleHandle, { initialData?: Record<string, unknown> }>(({ initialData }, ref) => {
  const _d  = (initialData?.douleur        as Record<string, unknown>) ?? {}
  const _rf = (initialData?.redFlags       as Record<string, unknown>) ?? {}
  const _yf = (initialData?.yellowFlags    as Record<string, unknown>) ?? {}
  const _bb = (initialData?.blueBlackFlags as Record<string, unknown>) ?? {}
  const _sc = (initialData?.scores        as Record<string, unknown>) ?? {}
  const _ck = (initialData?.contratKine   as Record<string, unknown>) ?? {}
  const _ex = (initialData?.examClinique  as Record<string, unknown>) ?? {}
  const _fo = (initialData?.forceMusculaire as Record<string, unknown>) ?? {}
  const _nr = (initialData?.neurologique  as Record<string, unknown>) ?? {}
  const _ts = (initialData?.testsSpecifiques as Record<string, unknown>) ?? {}
  const _cn = (initialData?.conseils      as Record<string, unknown>) ?? {}

  const [open, setOpen] = useState<Record<string, boolean>>({ infosGenerales: true, douleur: true })
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  // Mode Noyau EBP (JOSPT 2025 Rotator Cuff) activé par défaut.
  const [mode, setMode] = useState<BilanMode>(
    (initialData?._mode as BilanMode | undefined) ?? 'noyau'
  )
  const coreMode = mode === 'noyau'
  const [vocalReport, setVocalReport] = useState<NarrativeReport | null>(
    (initialData?.narrativeReport as NarrativeReport | undefined) ?? null
  )

  // Si initialData ne contient pas de redFlags existants, pré-cocher tous les booléens à "non".
  const redFlagsIsNew = !initialData?.redFlags || Object.keys(initialData.redFlags as Record<string, unknown>).length === 0

  // ── Douleur (partagée avec les autres bilans — inclut body chart) ──
  const [douleur, setDouleur] = useState<DouleurState>(() => mergeDouleur(_d))

  // ── Red Flags ──
  const [tttMedical, setTttMedical]         = useState((_rf.tttMedical as string) ?? '')
  const [antecedents, setAntecedents]       = useState((_rf.antecedents as string) ?? '')
  const [comorbidites, setComorbidites]     = useState((_rf.comorbidites as string) ?? '')
  const [sommeilQuantite, setSommeilQuantite] = useState((_rf.sommeilQuantite as string) ?? '')
  const [sommeilQualite, setSommeilQualite]   = useState((_rf.sommeilQualite as string) ?? '')
  const [cinqD3N, setCinqD3N]               = useState((_rf.cinqD3N as string) ?? '')
  const [imageries, setImageries]           = useState((_rf.imageries as string) ?? '')
  // Pour un nouveau bilan : tous les booléens red flags pré-cochés à "non".
  // Cela permet au kiné de cocher uniquement les exceptions positives (gain de temps majeur).
  const rfDefault = redFlagsIsNew ? 'non' : ''
  const [rf, setRf] = useState<Record<string, string>>({
    tabagisme: boolToStr(_rf.tabagisme) || rfDefault, traumatismeRecent: boolToStr(_rf.traumatismeRecent) || rfDefault,
    troublesMotricite: boolToStr(_rf.troublesMotricite) || rfDefault, troublesMarche: boolToStr(_rf.troublesMarche) || rfDefault,
    perteAppetit: boolToStr(_rf.perteAppetit) || rfDefault, pertePoids: boolToStr(_rf.pertePoids) || rfDefault,
    atcdCancer: boolToStr(_rf.atcdCancer) || rfDefault, cephalees: boolToStr(_rf.cephalees) || rfDefault,
    cephaleesIntenses: boolToStr(_rf.cephaleesIntenses), fievre: boolToStr(_rf.fievre) || rfDefault,
    csIs: boolToStr(_rf.csIs) || rfDefault, douleurThoracique: boolToStr(_rf.douleurThoracique) || rfDefault,
    douleurDigestion: boolToStr(_rf.douleurDigestion) || rfDefault, fatigueRF: boolToStr(_rf.fatigueRF) || rfDefault,
  })

  // ── Yellow Flags ──
  const [croyancesOrigine, setCroyancesOrigine]               = useState((_yf.croyancesOrigine as string) ?? '')
  const [croyancesTtt, setCroyancesTtt]                       = useState((_yf.croyancesTtt as string) ?? '')
  const [attentes, setAttentes]                               = useState((_yf.attentes as string) ?? '')
  const [autoEfficacite, setAutoEfficacite]                   = useState((_yf.autoEfficacite as string) ?? '')
  const [flexibilitePsy, setFlexibilitePsy]                   = useState((_yf.flexibilitePsy as string) ?? '')
  const [strategieCoping, setStrategieCoping]                 = useState((_yf.strategieCoping as string) ?? '')
  const [peurEvitementMouvements, setPeurEvitementMouvements] = useState((_yf.peurEvitementMouvements as string) ?? '')
  const [yf, setYf] = useState<Record<string, string>>({
    catastrophisme: boolToStr(_yf.catastrophisme), peurEvitement: boolToStr(_yf.peurEvitement),
    hypervigilance: boolToStr(_yf.hypervigilance), anxiete: boolToStr(_yf.anxiete),
    depression: boolToStr(_yf.depression),
  })

  // ── Blue / Black Flags ──
  const [stressNiveau, setStressNiveau]               = useState((_bb.stressNiveau as number) ?? 0)
  const [antecedentsAtDetails, setAntecedentsAtDetails] = useState((_bb.antecedentsAtDetails as string) ?? '')
  const [bb, setBb] = useState<Record<string, string>>({
    enAt: boolToStr(_bb.enAt), antecedentsAt: boolToStr(_bb.antecedentsAt),
    travailExigeant: boolToStr(_bb.travailExigeant), sousEstime: boolToStr(_bb.sousEstime),
    manqueControle: boolToStr(_bb.manqueControle), travailAggrave: boolToStr(_bb.travailAggrave),
    politiqueFlexible: boolToStr(_bb.politiqueFlexible), difficultesAcces: boolToStr(_bb.difficultesAcces),
    conditionsSocioEco: boolToStr(_bb.conditionsSocioEco), litige: boolToStr(_bb.litige),
  })

  // ── Scores ──
  const [scores, setScores] = useState<Record<string, string>>({
    oss: (_sc.scoreOSS as string) ?? '', constant: (_sc.scoreConstant as string) ?? '',
    dash: (_sc.scoreDASH as string) ?? '', rowe: (_sc.scoreRowe as string) ?? '',
    psfs1: (_sc.psfs1 as string) ?? '', psfs2: (_sc.psfs2 as string) ?? '', psfs3: (_sc.psfs3 as string) ?? '',
    psfs1Label: (_sc.psfs1Label as string) ?? '', psfs2Label: (_sc.psfs2Label as string) ?? '', psfs3Label: (_sc.psfs3Label as string) ?? '',
    psfs1Notes: (_sc.psfs1Notes as string) ?? '', psfs2Notes: (_sc.psfs2Notes as string) ?? '', psfs3Notes: (_sc.psfs3Notes as string) ?? '',
    had: (_sc.scoreHAD as string) ?? '', dn4: (_sc.scoreDN4 as string) ?? '',
    sensibilisation: (_sc.scoreSensibilisation as string) ?? '', autres: (_sc.autresScores as string) ?? '',
  })
  const updateScore = (k: string, v: string) => setScores(p => ({ ...p, [k]: v }))

  // ── Contrat Kiné ──
  const [objectifsSMART, setObjectifsSMART]   = useState<Array<{id: number; titre: string; cible: string; dateCible: string}>>(
    Array.isArray(_ck.objectifsSMART) ? _ck.objectifsSMART as Array<{id: number; titre: string; cible: string; dateCible: string}>
    : typeof _ck.objectifsSMART === 'string' && (_ck.objectifsSMART as string).trim()
      ? [{ id: Date.now(), titre: (_ck.objectifsSMART as string).trim(), cible: '', dateCible: '' }]
      : []
  )
  const [autoReeducation, setAutoReeducation] = useState(boolToStr(_ck.autoReeducation))
  const [frequenceDuree, setFrequenceDuree]   = useState((_ck.frequenceDuree as string) ?? '')

  // ── Questionnaires interactifs ──
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, Record<string, unknown>>>(
    (initialData?.questionnaireAnswers as Record<string, Record<string, unknown>>) ?? {}
  )
  const [questionnaireResults, setQuestionnaireResults] = useState<Record<string, import('./questionnaires/useQuestionnaires').StoredResult>>(
    (initialData?.questionnaireResults as Record<string, import('./questionnaires/useQuestionnaires').StoredResult>) ?? {}
  )
  const questionnaires = useQuestionnaires(
    (k, v) => setScores(p => ({ ...p, [k]: v })),
    questionnaireAnswers, setQuestionnaireAnswers,
    questionnaireResults, setQuestionnaireResults,
  )

  // ── Examen clinique : morphostatique / observation / mobilité / modifications ──
  const [morphoRachisCervical, setMorphoRachisCervical]     = useState((_ex.morphoRachisCervical as string) ?? '')
  const [morphoRachisThoracique, setMorphoRachisThoracique] = useState((_ex.morphoRachisThoracique as string) ?? '')
  const [morphoCeintureScap, setMorphoCeintureScap]         = useState((_ex.morphoCeintureScap as string) ?? '')
  const [modificationPosture, setModificationPosture]       = useState((_ex.modificationPosture as string) ?? '')
  const [amyoDeltoide, setAmyoDeltoide]                     = useState((_ex.amyoDeltoide as string) ?? '')
  const [amyoFosseSupraInfra, setAmyoFosseSupraInfra]       = useState((_ex.amyoFosseSupraInfra as string) ?? '')
  const [amyoPeriScapulaire, setAmyoPeriScapulaire]         = useState((_ex.amyoPeriScapulaire as string) ?? '')

  const MOBILITE_KEYS: [string, string][] = [
    ['flexion',   'Flexion'],     ['abduction', 'Abduction'],
    ['adduction', 'Adduction'],   ['extension', 'Extension'],
    ['re1', 'RE1'], ['re2', 'RE2'], ['ri1', 'RI1'], ['ri2', 'RI2'],
  ]
  const emptyMob = () => MOBILITE_KEYS.reduce((a, [k]) => ({ ...a, [k]: { ag: '', ad: '', pg: '', pd: '' } }), {} as Record<string, { ag: string; ad: string; pg: string; pd: string }>)
  const [mob, setMob] = useState<Record<string, { ag: string; ad: string; pg: string; pd: string }>>({
    ...emptyMob(),
    ...((_ex.mobilite as Record<string, { ag: string; ad: string; pg: string; pd: string }>) ?? {}),
  })
  const updateMob = (k: string, side: 'ag' | 'ad' | 'pg' | 'pd', v: string) =>
    setMob(p => ({ ...p, [k]: { ...p[k], [side]: v } }))

  const [mobiliteRachisCervical, setMobiliteRachisCervical]     = useState((_ex.mobiliteRachisCervical as string) ?? '')
  const [mobiliteRachisThoracique, setMobiliteRachisThoracique] = useState((_ex.mobiliteRachisThoracique as string) ?? '')
  const [mobiliteAutresZones, setMobiliteAutresZones]           = useState((_ex.mobiliteAutresZones as string) ?? '')

  const [modifSymp, setModifSymp] = useState<Record<string, string>>({
    testAssistanceScap: '', stabilisationScapula: '', testRetractionScap: '', testTrapezeSup: '',
    serrerPoings: '', ajoutResistance: '', activationCoiffe: '', pasAvantPrealable: '', diminutionLevier: '',
    modifPositionThoracique: '', modifPositionCervicale: '',
    ...((_ex.modifSymp as Record<string, string>) ?? {}),
  })
  const updateModifSymp = (k: string, v: string) => setModifSymp(p => ({ ...p, [k]: v }))

  // ── Force musculaire ──
  const FORCE_KEYS: [string, string][] = [
    ['planScapula90',     'Plan de la scapula à 90° de flexion'],
    ['re1Force',          'RE1'],
    ['re2StabEpaule',     'RE2 avec stabilisation de l’épaule'],
    ['re2StabCharge',     'RE2 avec stabilisation + charge'],
    ['re2SansStab',       'RE2 sans stabilisation'],
    ['re2SansStabCharge', 'RE2 sans stabilisation + charge'],
    ['ri2StabEpaule',     'RI2 avec stabilisation de l’épaule'],
    ['ri2StabCharge',     'RI2 avec stabilisation + charge'],
    ['ri2SansStab',       'RI2 sans stabilisation'],
    ['ri2SansStabCharge', 'RI2 sans stabilisation + charge'],
  ]
  const emptyForce = () => FORCE_KEYS.reduce((a, [k]) => ({ ...a, [k]: { gauche: '', droite: '' } }), {} as Record<string, { gauche: string; droite: string }>)
  const [force, setForce] = useState<Record<string, { gauche: string; droite: string }>>({
    ...emptyForce(),
    ...((_fo.force as Record<string, { gauche: string; droite: string }>) ?? {}),
  })
  const updateForce = (k: string, side: 'gauche' | 'droite', v: string) =>
    setForce(p => ({ ...p, [k]: { ...p[k], [side]: v } }))
  const [autresTestsForce, setAutresTestsForce] = useState((_fo.autresTestsForce as string) ?? '')

  // Mouvements améliorant la symptomatologie (ex "mouvements répétés")
  // État structuré : marqueurs avant / mouvement testé / nb répétitions / type de contraction / résultats
  const [marqueursAvant, setMarqueursAvant]       = useState((_fo.marqueursAvant as string) ?? '')
  const [resultatsMvtRep, setResultatsMvtRep]     = useState((_fo.resultatsMvtRep as string) ?? '')
  const [mvtAmelMouvement, setMvtAmelMouvement]   = useState((_fo.mvtAmelMouvement as string) ?? '')
  const [mvtAmelNbRep, setMvtAmelNbRep]           = useState((_fo.mvtAmelNbRep as string) ?? '')
  const [mvtAmelContraction, setMvtAmelContraction] = useState((_fo.mvtAmelContraction as string) ?? '')

  // ── Neurologique + Mécanosensibilité ──
  const [reflexes, setReflexes]               = useState((_nr.reflexes as string) ?? '')
  const [forceNeuro, setForceNeuro]           = useState((_nr.force as string) ?? (_nr.deficitMoteur as string) ?? '')
  const [sensibilite, setSensibilite]         = useState((_nr.sensibilite as string) ?? '')
  const [hoffmanTromner, setHoffmanTromner]   = useState((_nr.hoffmanTromner as string) ?? (_nr.hoffman as string) ?? '')
  const [reversibilite, setReversibilite]     = useState((_nr.reversibilite as string) ?? '')
  const [comportement, setComportement]       = useState((_nr.comportement as string) ?? '')
  const [palpationNerfs, setPalpationNerfs]   = useState((_nr.palpationNerfs as string) ?? '')
  const [nerfSousPression, setNerfSousPression] = useState(boolToStr(_nr.nerfSousPression))
  const [nerfMalade, setNerfMalade]           = useState(boolToStr(_nr.nerfMalade))
  const [nerfPrecisions, setNerfPrecisions]   = useState((_nr.nerfPrecisions as string) ?? '')
  const [troublesSensitifsNotes, setTroublesSensitifsNotes] = useState((_nr.troublesSensitifsNotes as string) ?? '')
  const [nerfMedian, setNerfMedian]           = useState((_nr.nerfMedian as string) ?? (_nr.ultt1 as string) ?? '')
  const [nerfUlnaire, setNerfUlnaire]         = useState((_nr.nerfUlnaire as string) ?? (_nr.ultt4 as string) ?? '')
  const [nerfRadial, setNerfRadial]           = useState((_nr.nerfRadial as string) ?? (_nr.ultt3 as string) ?? '')

  // ── Tests spécifiques ──
  const [testsSpec, setTestsSpec] = useState<Record<string, string>>({
    bearHug: '', bellyPress: '', externalRotLagSign: '', internalRotLagSign: '',
    obrien: '', palpationAC: '', crossArm: '', abdHorizResist: '',
    apprehensionRelocation: '', signeSulcus: '', jerkTest: '',
    ckcuest: '', ulrt: '', uqYbt: '', setPset: '', smbtSasspt: '',
    autresTestsFonctionnels: '',
    ...((_ts as Record<string, string>) ?? {}),
  })
  const updateTestSpec = (k: string, v: string) => setTestsSpec(p => ({ ...p, [k]: v }))

  // ── Conseils ──
  const [conseilsRecos, setConseilsRecos] = useState((_cn.conseilsRecos as string) ?? '')

  useImperativeHandle(ref, () => ({
    getData: () => ({
      douleur,
      redFlags: { tttMedical, antecedents, comorbidites, sommeilQuantite, sommeilQualite, cinqD3N, imageries, ...rf },
      yellowFlags: { croyancesOrigine, croyancesTtt, attentes, autoEfficacite, flexibilitePsy, strategieCoping, peurEvitementMouvements, ...yf },
      blueBlackFlags: { stressNiveau, antecedentsAtDetails, ...bb },
      scores: { scoreOSS: scores.oss, scoreConstant: scores.constant, scoreDASH: scores.dash, scoreRowe: scores.rowe, psfs1: scores.psfs1, psfs2: scores.psfs2, psfs3: scores.psfs3, psfs1Label: scores.psfs1Label, psfs2Label: scores.psfs2Label, psfs3Label: scores.psfs3Label, psfs1Notes: scores.psfs1Notes, psfs2Notes: scores.psfs2Notes, psfs3Notes: scores.psfs3Notes, scoreHAD: scores.had, scoreDN4: scores.dn4, scoreSensibilisation: scores.sensibilisation, autresScores: scores.autres },
      contratKine: { objectifsSMART: objectifsSMART.map(o => o.titre + (o.cible ? ` — ${o.cible}` : '')).join('\n'), objectifsSMARTItems: objectifsSMART, autoReeducation, frequenceDuree },
      examClinique: {
        morphoRachisCervical, morphoRachisThoracique, morphoCeintureScap, modificationPosture,
        amyoDeltoide, amyoFosseSupraInfra, amyoPeriScapulaire,
        mobilite: mob, mobiliteRachisCervical, mobiliteRachisThoracique, mobiliteAutresZones,
        modifSymp,
      },
      forceMusculaire: { force, autresTestsForce, marqueursAvant, resultatsMvtRep, mvtAmelMouvement, mvtAmelNbRep, mvtAmelContraction },
      neurologique: {
        reflexes, force: forceNeuro, sensibilite, hoffmanTromner,
        reversibilite, comportement, palpationNerfs,
        nerfSousPression, nerfMalade, nerfPrecisions,
        troublesSensitifsNotes,
        nerfMedian, nerfUlnaire, nerfRadial,
      },
      testsSpecifiques: testsSpec,
      conseils: { conseilsRecos },
      questionnaireAnswers,
      questionnaireResults,
      _mode: mode,
      narrativeReport: vocalReport,
    }),
    setData: (data: Record<string, unknown>) => {
      if (data._mode === 'vocal') { setMode('vocal'); if (data.narrativeReport) setVocalReport(data.narrativeReport as NarrativeReport); return }
      const d   = (data.douleur        as Record<string, unknown>) ?? {}
      const rfD = (data.redFlags       as Record<string, unknown>) ?? {}
      const yfD = (data.yellowFlags    as Record<string, unknown>) ?? {}
      const bbD = (data.blueBlackFlags as Record<string, unknown>) ?? {}
      const scD = (data.scores        as Record<string, unknown>) ?? {}
      const ckD = (data.contratKine   as Record<string, unknown>) ?? {}
      if (Object.keys(d).length > 0) setDouleur(prev => ({ ...prev, ...mergeDouleur(d) }))
      if (rfD.tttMedical !== undefined)        setTttMedical(rfD.tttMedical as string)
      if (rfD.antecedents !== undefined)       setAntecedents(rfD.antecedents as string)
      if (rfD.comorbidites !== undefined)      setComorbidites(rfD.comorbidites as string)
      if (rfD.sommeilQuantite !== undefined)   setSommeilQuantite(rfD.sommeilQuantite as string)
      if (rfD.sommeilQualite !== undefined)    setSommeilQualite(rfD.sommeilQualite as string)
      if (rfD.cinqD3N !== undefined)           setCinqD3N(rfD.cinqD3N as string)
      if (rfD.imageries !== undefined)         setImageries(rfD.imageries as string)
      setRf(p => {
        const u: Record<string, string> = {}
        for (const k of ['tabagisme','traumatismeRecent','troublesMotricite','troublesMarche','perteAppetit','pertePoids','atcdCancer','cephalees','cephaleesIntenses','fievre','csIs','douleurThoracique','douleurDigestion','fatigueRF']) {
          if (rfD[k] !== undefined) u[k] = boolToStr(rfD[k])
        }
        return { ...p, ...u }
      })
      if (yfD.croyancesOrigine !== undefined)         setCroyancesOrigine(yfD.croyancesOrigine as string)
      if (yfD.croyancesTtt !== undefined)             setCroyancesTtt(yfD.croyancesTtt as string)
      if (yfD.attentes !== undefined)                 setAttentes(yfD.attentes as string)
      if (yfD.autoEfficacite !== undefined)           setAutoEfficacite(yfD.autoEfficacite as string)
      if (yfD.flexibilitePsy !== undefined)           setFlexibilitePsy(yfD.flexibilitePsy as string)
      if (yfD.strategieCoping !== undefined)          setStrategieCoping(yfD.strategieCoping as string)
      if (yfD.peurEvitementMouvements !== undefined)  setPeurEvitementMouvements(yfD.peurEvitementMouvements as string)
      setYf(p => {
        const u: Record<string, string> = {}
        for (const k of ['catastrophisme','peurEvitement','hypervigilance','anxiete','depression']) {
          if (yfD[k] !== undefined) u[k] = boolToStr(yfD[k])
        }
        return { ...p, ...u }
      })
      if (bbD.stressNiveau !== undefined)         setStressNiveau(bbD.stressNiveau as number)
      if (bbD.antecedentsAtDetails !== undefined) setAntecedentsAtDetails(bbD.antecedentsAtDetails as string)
      setBb(p => {
        const u: Record<string, string> = {}
        for (const k of ['enAt','antecedentsAt','travailExigeant','sousEstime','manqueControle','travailAggrave','politiqueFlexible','difficultesAcces','conditionsSocioEco','litige']) {
          if (bbD[k] !== undefined) u[k] = boolToStr(bbD[k])
        }
        return { ...p, ...u }
      })
      setScores(p => ({
        ...p,
        ...(scD.scoreOSS !== undefined           ? { oss: scD.scoreOSS as string } : {}),
        ...(scD.scoreConstant !== undefined       ? { constant: scD.scoreConstant as string } : {}),
        ...(scD.scoreDASH !== undefined           ? { dash: scD.scoreDASH as string } : {}),
        ...(scD.scoreRowe !== undefined           ? { rowe: scD.scoreRowe as string } : {}),
        ...(scD.psfs1 !== undefined               ? { psfs1: scD.psfs1 as string } : {}),
        ...(scD.psfs2 !== undefined               ? { psfs2: scD.psfs2 as string } : {}),
        ...(scD.psfs3 !== undefined               ? { psfs3: scD.psfs3 as string } : {}),
        ...(scD.psfs1Label !== undefined          ? { psfs1Label: scD.psfs1Label as string } : {}),
        ...(scD.psfs2Label !== undefined          ? { psfs2Label: scD.psfs2Label as string } : {}),
        ...(scD.psfs3Label !== undefined          ? { psfs3Label: scD.psfs3Label as string } : {}),
        ...(scD.psfs1Notes !== undefined          ? { psfs1Notes: scD.psfs1Notes as string } : {}),
        ...(scD.psfs2Notes !== undefined          ? { psfs2Notes: scD.psfs2Notes as string } : {}),
        ...(scD.psfs3Notes !== undefined          ? { psfs3Notes: scD.psfs3Notes as string } : {}),
        ...(scD.scoreHAD !== undefined            ? { had: scD.scoreHAD as string } : {}),
        ...(scD.scoreDN4 !== undefined            ? { dn4: scD.scoreDN4 as string } : {}),
        ...(scD.scoreSensibilisation !== undefined ? { sensibilisation: scD.scoreSensibilisation as string } : {}),
        ...(scD.autresScores !== undefined         ? { autres: scD.autresScores as string } : {}),
      }))
      if (ckD.objectifsSMARTItems !== undefined) setObjectifsSMART(ckD.objectifsSMARTItems as Array<{id: number; titre: string; cible: string; dateCible: string}>)
      else if (typeof ckD.objectifsSMART === 'string' && (ckD.objectifsSMART as string).trim()) setObjectifsSMART([{ id: Date.now(), titre: (ckD.objectifsSMART as string).trim(), cible: '', dateCible: '' }])
      if (ckD.autoReeducation !== undefined) setAutoReeducation(boolToStr(ckD.autoReeducation))
      if (ckD.frequenceDuree !== undefined)  setFrequenceDuree(ckD.frequenceDuree as string)

      const exD = (data.examClinique     as Record<string, unknown>) ?? {}
      const foD = (data.forceMusculaire  as Record<string, unknown>) ?? {}
      const nrD = (data.neurologique     as Record<string, unknown>) ?? {}
      const tsD = (data.testsSpecifiques as Record<string, unknown>) ?? {}
      const cnD = (data.conseils         as Record<string, unknown>) ?? {}
      if (exD.morphoRachisCervical   !== undefined) setMorphoRachisCervical(exD.morphoRachisCervical as string)
      if (exD.morphoRachisThoracique !== undefined) setMorphoRachisThoracique(exD.morphoRachisThoracique as string)
      if (exD.morphoCeintureScap     !== undefined) setMorphoCeintureScap(exD.morphoCeintureScap as string)
      if (exD.modificationPosture    !== undefined) setModificationPosture(exD.modificationPosture as string)
      if (exD.amyoDeltoide           !== undefined) setAmyoDeltoide(exD.amyoDeltoide as string)
      if (exD.amyoFosseSupraInfra    !== undefined) setAmyoFosseSupraInfra(exD.amyoFosseSupraInfra as string)
      if (exD.amyoPeriScapulaire     !== undefined) setAmyoPeriScapulaire(exD.amyoPeriScapulaire as string)
      if (exD.mobilite               !== undefined) setMob(p => ({ ...p, ...(exD.mobilite as Record<string, { ag: string; ad: string; pg: string; pd: string }>) }))
      if (exD.mobiliteRachisCervical !== undefined) setMobiliteRachisCervical(exD.mobiliteRachisCervical as string)
      if (exD.mobiliteRachisThoracique !== undefined) setMobiliteRachisThoracique(exD.mobiliteRachisThoracique as string)
      if (exD.mobiliteAutresZones    !== undefined) setMobiliteAutresZones(exD.mobiliteAutresZones as string)
      if (exD.modifSymp              !== undefined) setModifSymp(p => ({ ...p, ...(exD.modifSymp as Record<string, string>) }))
      if (foD.force                  !== undefined) setForce(p => ({ ...p, ...(foD.force as Record<string, { gauche: string; droite: string }>) }))
      if (foD.autresTestsForce       !== undefined) setAutresTestsForce(foD.autresTestsForce as string)
      if (foD.marqueursAvant         !== undefined) setMarqueursAvant(foD.marqueursAvant as string)
      if (foD.resultatsMvtRep        !== undefined) setResultatsMvtRep(foD.resultatsMvtRep as string)
      if (foD.mvtAmelMouvement       !== undefined) setMvtAmelMouvement(foD.mvtAmelMouvement as string)
      if (foD.mvtAmelNbRep           !== undefined) setMvtAmelNbRep(foD.mvtAmelNbRep as string)
      if (foD.mvtAmelContraction     !== undefined) setMvtAmelContraction(foD.mvtAmelContraction as string)
      if (nrD.reflexes               !== undefined) setReflexes(nrD.reflexes as string)
      if (nrD.force                  !== undefined) setForceNeuro(nrD.force as string)
      else if (nrD.deficitMoteur     !== undefined) setForceNeuro(nrD.deficitMoteur as string)
      if (nrD.sensibilite            !== undefined) setSensibilite(nrD.sensibilite as string)
      if (nrD.hoffmanTromner         !== undefined) setHoffmanTromner(nrD.hoffmanTromner as string)
      else if (nrD.hoffman           !== undefined) setHoffmanTromner(nrD.hoffman as string)
      if (nrD.reversibilite          !== undefined) setReversibilite(nrD.reversibilite as string)
      if (nrD.comportement           !== undefined) setComportement(nrD.comportement as string)
      if (nrD.palpationNerfs         !== undefined) setPalpationNerfs(nrD.palpationNerfs as string)
      if (nrD.nerfSousPression       !== undefined) setNerfSousPression(boolToStr(nrD.nerfSousPression))
      if (nrD.nerfMalade             !== undefined) setNerfMalade(boolToStr(nrD.nerfMalade))
      if (nrD.nerfPrecisions         !== undefined) setNerfPrecisions(nrD.nerfPrecisions as string)
      if (nrD.troublesSensitifsNotes !== undefined) setTroublesSensitifsNotes(nrD.troublesSensitifsNotes as string)
      if (nrD.nerfMedian             !== undefined) setNerfMedian(nrD.nerfMedian as string)
      else if (nrD.ultt1             !== undefined) setNerfMedian(nrD.ultt1 as string)
      if (nrD.nerfUlnaire            !== undefined) setNerfUlnaire(nrD.nerfUlnaire as string)
      else if (nrD.ultt4             !== undefined) setNerfUlnaire(nrD.ultt4 as string)
      if (nrD.nerfRadial             !== undefined) setNerfRadial(nrD.nerfRadial as string)
      else if (nrD.ultt3             !== undefined) setNerfRadial(nrD.ultt3 as string)
      if (Object.keys(tsD).length > 0) setTestsSpec(p => ({ ...p, ...(tsD as Record<string, string>) }))
      if (cnD.conseilsRecos          !== undefined) setConseilsRecos(cnD.conseilsRecos as string)
      if (data.questionnaireAnswers) setQuestionnaireAnswers(data.questionnaireAnswers as Record<string, Record<string, unknown>>)
      if (data.questionnaireResults) setQuestionnaireResults(data.questionnaireResults as Record<string, import('./questionnaires/useQuestionnaires').StoredResult>)
    },
  }))

  // Noyau EBP épaule (JOSPT 2025 Rotator Cuff Tendinopathy CPG) : douleur, red flags, yellow flags simplifiés,
  // examen clinique (mobilité 4-6 mouvements), force (3 tests clés coiffe), neuro bref, tests spécifiques (3 tests
  // pour rupture de coiffe), scores (PSFS seul — tous les autres scores en approfondissement), contrat, conseils.
  // Blue/Black flags → approfondissement.
  type Priority = 'noyau' | 'approfondissement'
  const allSections: { id: string; title: string; color: string; priority: Priority }[] = [
    { id: 'infosGenerales',title: 'Infos générales',                      color: '#1A1A1A', priority: 'noyau' },
    { id: 'douleur',       title: 'Douleur',                              color: '#1A1A1A', priority: 'noyau' },
    { id: 'redFlags',      title: 'Red Flags 🚩',                          color: '#991b1b',        priority: 'noyau' },
    { id: 'yellowFlags',   title: 'Yellow Flags 🟡',                       color: '#d97706',        priority: 'noyau' },
    { id: 'blueBlackFlags',title: 'Blue / Black Flags',                    color: '#7c3aed',        priority: 'approfondissement' },
    { id: 'examClinique',  title: 'Examen clinique',                       color: '#1A1A1A', priority: 'noyau' },
    { id: 'force',         title: 'Force musculaire',                      color: '#1A1A1A', priority: 'noyau' },
    { id: 'neuro',         title: 'Neurologique & mécanosensibilité',      color: '#1A1A1A', priority: 'noyau' },
    { id: 'testsSpec',     title: 'Tests spécifiques',                     color: '#1A1A1A', priority: 'noyau' },
    { id: 'scores',        title: 'Scores fonctionnels',                   color: '#1A1A1A', priority: 'noyau' },
    { id: 'contrat',       title: 'Contrat kiné',                          color: '#059669',        priority: 'noyau' },
    { id: 'conseils',      title: 'Conseils & recommandations',            color: '#059669',        priority: 'noyau' },
  ]
  const sectionList = coreMode ? allSections.filter(s => s.priority === 'noyau') : allSections

  return (
    <div>
      <BilanModeToggle mode={mode} onChange={setMode} />
      {mode === 'vocal' && <BilanVocalMode zone="Épaule" initialReport={vocalReport} onChange={setVocalReport} />}
      {mode !== 'vocal' && sectionList.map(sec => (
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
                  {/* Texte anamnestique détaillé : imageries + 5D/3N en noyau (5D/3N sécurité vertébro-basilaire),
                      le reste (TTT, antécédents, comorbidités, sommeil) → approfondissement. */}
                  {((coreMode
                    ? [
                        ['cinqD3N',       '5D 3N (sécurité vertébro-basilaire)',    cinqD3N,       setCinqD3N,       'Dizziness, Drop attacks, Diplopie, Dysarthrie, Dysphagie, Nystagmus…'],
                        ['imageries',     'Imagerie(s)',             imageries,     setImageries,     'Radio, IRM, écho…'],
                      ]
                    : [
                        ['tttMedical',    'TTT médical actuel',      tttMedical,    setTttMedical,    'Médicaments…'],
                        ['antecedents',   'Antécédents',             antecedents,   setAntecedents,   'Chirurgies, pathologies…'],
                        ['comorbidites',  'Comorbidités',            comorbidites,  setComorbidites,  'Diabète, HTA…'],
                        ['sommeilQ',      'Sommeil — Quantité',      sommeilQuantite, setSommeilQuantite, 'Nb heures…'],
                        ['sommeilQual',   'Sommeil — Qualité',       sommeilQualite,  setSommeilQualite,  'Perturbé, bon…'],
                        ['cinqD3N',       '5D 3N',                   cinqD3N,       setCinqD3N,       'Dizziness, Drop attacks, Diplopie, Dysarthrie, Dysphagie, Nystagmus…'],
                        ['imageries',     'Imagerie(s)',             imageries,     setImageries,     'Radio, IRM, écho…'],
                      ]
                  ) as [string, string, string, (v: string) => void, string][]).map(([k, lbl, val, setter, ph]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{lbl}</label>
                      <DictableInput value={val} onChange={e => setter(e.target.value)} placeholder={ph} inputStyle={inputStyle} />
                    </div>
                  ))}
                  {([
                    ['tabagisme',         'Tabagisme'],
                    ['traumatismeRecent', 'Traumatisme récent'],
                    ['troublesMotricite', 'Troubles motricité MS'],
                    ['troublesMarche',    'Troubles de la marche'],
                    ['perteAppetit',      "Perte d'appétit"],
                    ['pertePoids',        'Perte de poids inexpliquée'],
                    ['atcdCancer',        'ATCD de cancer'],
                    ['cephalees',         'Céphalées'],
                    ['cephaleesIntenses', "Plus intenses que d'habitude"],
                    ['fievre',            'Fièvre'],
                    ['csIs',              'Utilisation prolongée CS / IS'],
                    ['douleurThoracique', 'Douleur thoracique associée'],
                    ['douleurDigestion',  'Douleur aggravée par la digestion'],
                    ['fatigueRF',         'Fatigue inexpliquée / inhabituelle'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={rf[k]} onChange={v => setRf(p => ({ ...p, [k]: v }))} />
                  ))}
                </>
              )}

              {sec.id === 'yellowFlags' && (
                <>
                  {/* Noyau : dépistage rapide 4 drapeaux jaunes prédictifs (catastrophisme, peur, anxiété, dépression). */}
                  {coreMode ? (
                    <>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10, fontStyle: 'italic' }}>
                        Dépistage rapide des prédicteurs majeurs de chronicisation.
                      </div>
                      {([
                        ['catastrophisme',  'Catastrophisme'],
                        ['peurEvitement',   'Peur-évitement du mouvement'],
                        ['anxiete',         'Anxiété'],
                        ['depression',      'Humeur dépressive'],
                      ] as [string, string][]).map(([k, lbl]) => (
                        <OuiNon key={k} label={lbl} value={yf[k]} onChange={v => setYf(p => ({ ...p, [k]: v }))} />
                      ))}
                      {yf.peurEvitement === 'oui' && (
                        <DictableInput value={peurEvitementMouvements} onChange={e => setPeurEvitementMouvements(e.target.value)}
                          placeholder="Quel(s) mouvement(s) évité(s)…" inputStyle={{ ...inputStyle, marginTop: 6 }} />
                      )}
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Croyances — Origine de la douleur</label>
                        <DictableInput value={croyancesOrigine} onChange={e => setCroyancesOrigine(e.target.value)} placeholder="Ce que pense le patient…" inputStyle={inputStyle} />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Croyances — TTT qui serait adapté</label>
                        <DictableInput value={croyancesTtt} onChange={e => setCroyancesTtt(e.target.value)} placeholder="Selon le patient…" inputStyle={inputStyle} />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Attentes</label>
                        <DictableTextarea value={attentes} onChange={e => setAttentes(e.target.value)} placeholder="Objectifs du patient…" rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', width: '100%', marginBottom: 2 }}>Auto-efficacité</label>
                        {['Faible', 'Moyen', 'Fort'].map(v => (
                          <button key={v} className={`choix-btn${autoEfficacite === v.toLowerCase() ? ' active' : ''}`} onClick={() => setAutoEfficacite(autoEfficacite === v.toLowerCase() ? '' : v.toLowerCase())}>{v}</button>
                        ))}
                      </div>
                      {([
                        ['catastrophisme',  'Catastrophisme'],
                        ['peurEvitement',   'Croyance(s) de Peur - Évitement'],
                        ['hypervigilance',  'Hypervigilance'],
                        ['anxiete',         'Anxiété'],
                        ['depression',      'Dépression'],
                      ] as [string, string][]).map(([k, lbl]) => (
                        <OuiNon key={k} label={lbl} value={yf[k]} onChange={v => setYf(p => ({ ...p, [k]: v }))} />
                      ))}
                      {yf.peurEvitement === 'oui' && (
                        <DictableInput value={peurEvitementMouvements} onChange={e => setPeurEvitementMouvements(e.target.value)}
                          placeholder="Quel(s) mouvement(s) évité(s)…" inputStyle={{ ...inputStyle, marginTop: 6 }} />
                      )}
                      <div style={{ marginTop: 8, marginBottom: 8 }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Stratégie(s) de Coping</label>
                        <DictableTextarea value={strategieCoping} onChange={e => setStrategieCoping(e.target.value)} placeholder="Repos, chaleur, médicaments…" rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', width: '100%', marginBottom: 2 }}>Flexibilité psychologique</label>
                        {['Faible', 'Moyenne', 'Forte'].map(v => (
                          <button key={v} className={`choix-btn${flexibilitePsy === v.toLowerCase() ? ' active' : ''}`} onClick={() => setFlexibilitePsy(flexibilitePsy === v.toLowerCase() ? '' : v.toLowerCase())}>{v}</button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {sec.id === 'blueBlackFlags' && (
                <>
                  {([
                    ['enAt',              'Actuellement en AT'],
                    ['antecedentsAt',     "Antécédents d'AT"],
                    ['travailExigeant',   'Travail physiquement exigeant et/ou dangereux'],
                    ['sousEstime',        "Sentiment d'être sous-estimé(e) ou mal soutenu(e)"],
                    ['manqueControle',    'Manque de contrôle sur ses tâches'],
                    ['travailAggrave',    'Croyance que le travail aggrave la douleur'],
                    ['politiqueFlexible', "Politique d'entreprise flexible pour reprise"],
                    ['difficultesAcces',  "Difficulté d'accès aux soins"],
                    ['conditionsSocioEco','Conditions socio-économiques défavorables'],
                    ['litige',            'Litige et/ou conflit liés aux indemnisations'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <OuiNon key={k} label={lbl} value={bb[k]} onChange={v => setBb(p => ({ ...p, [k]: v }))}
                      detail={k === 'antecedentsAt' ? antecedentsAtDetails : undefined}
                      onDetailChange={k === 'antecedentsAt' ? setAntecedentsAtDetails : undefined} />
                  ))}
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Niveau de stress au travail (0–100) : <strong style={{ color: 'var(--danger)' }}>{stressNiveau}</strong>
                    </label>
                    <input type="range" min="0" max="100" value={stressNiveau} onChange={e => setStressNiveau(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      <span>0</span><span>100</span>
                    </div>
                  </div>
                </>
              )}

              {sec.id === 'scores' && (
                <>
                  {/* Noyau : PSFS seul (gold standard EBP patient-centré). Tous les autres scores → approfondissement. */}
                  {!coreMode && ([
                    ['oss',           "Score d'Oxford Épaule (OSS)", 'oss'],
                    ['constant',      'Constant-Murley',              'constant'],
                    ['dash',          'DASH',                          'dash'],
                    ['rowe',          'Rowe score',                    'rowe'],
                    ['had',           'Échelle HAD',                   'had'],
                    ['dn4',           'DN4',                           'dn4'],
                    ['sensibilisation','Sensibilisation Centrale',     'csi'],
                  ] as [string, string, string][]).map(([k, lbl, qId]) => (
                    <ScoreRow key={k} label={lbl} value={scores[k]} onChange={v => updateScore(k, v)}
                      onOpenQuestionnaire={() => questionnaires.open(qId, k)}
                      result={questionnaires.getResult(k, qId)} />
                  ))}
                  <div style={{ margin: '14px 0 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Patient Specific Functional Scale
                    </label>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>0 = incapable · 10 = niveau normal</span>
                  </div>
                  {[1, 2, 3].map(i => {
                    const kScore = `psfs${i}`
                    const kLabel = `psfs${i}Label`
                    const kNotes = `psfs${i}Notes`
                    const score = scores[kScore]
                    const scoreNum = score === '' ? null : Math.max(0, Math.min(10, Number(score)))
                    const accent = scoreNum === null ? 'var(--text-muted)' : scoreNum >= 7 ? '#059669' : scoreNum >= 4 ? '#d97706' : '#dc2626'
                    return (
                      <div key={i} style={{ background: 'var(--secondary)', borderRadius: 'var(--radius-lg)', padding: '0.9rem 1rem', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', flexShrink: 0 }}>0{i}</span>
                          <input
                            value={scores[kLabel] ?? ''}
                            onChange={e => updateScore(kLabel, e.target.value)}
                            placeholder={`Activité ${i} — ex: enfiler une veste, dormir sur le côté…`}
                            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-main)', outline: 'none', padding: 0 }}
                          />
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 1, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: accent, lineHeight: 1, minWidth: 18, textAlign: 'right' }}>{scoreNum ?? '—'}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>/10</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={scoreNum ?? 0}
                          onChange={e => updateScore(kScore, e.target.value)}
                          className="psfs-slider"
                          style={{ width: '100%', ['--psfs-accent' as string]: accent }}
                        />
                        <DictableTextarea
                          value={scores[kNotes] ?? ''}
                          onChange={e => updateScore(kNotes, e.target.value)}
                          placeholder="Notes (contexte, évolution, conditions…)"
                          rows={1}
                          textareaStyle={{ width: '100%', marginTop: 8, padding: '0.4rem 0.6rem', fontSize: '0.78rem', color: 'var(--text-main)', background: 'transparent', border: 'none', borderTop: '1px solid var(--border-color)', borderRadius: 0, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
                        />
                      </div>
                    )
                  })}
                  {!coreMode && (
                    <div style={{ marginTop: 8 }}>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Autre(s) Score(s)</label>
                      <DictableTextarea value={scores.autres} onChange={e => updateScore('autres', e.target.value)} placeholder="Nom et score…" rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} />
                    </div>
                  )}
                </>
              )}

              {sec.id === 'contrat' && (
                <div style={{ background: 'var(--input-bg)', borderRadius: 14, border: '1px solid var(--border-color)', padding: '1rem', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                  <SmartObjectifsInline objectifs={objectifsSMART} onChange={setObjectifsSMART} />
                  <div style={{ marginTop: 12 }}>
                    <OuiNon label="S'engage à faire l'auto-rééducation" value={autoReeducation} onChange={setAutoReeducation} />
                  </div>
                  {autoReeducation === 'oui' && (
                    <DictableInput value={frequenceDuree} onChange={e => setFrequenceDuree(e.target.value)}
                      placeholder="Fréquence / Durée… Ex: 3x/semaine, 20 min" inputStyle={{ ...inputStyle, marginTop: 6 }} />
                  )}
                </div>
              )}

              {sec.id === 'examClinique' && (
                <>
                  {!coreMode && (
                    <>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Morphostatique</p>
                      {([
                        ['Attitude du rachis cervical',    morphoRachisCervical,   setMorphoRachisCervical,   'Antéprojection, rectitude…'],
                        ['Attitude du rachis thoracique',  morphoRachisThoracique, setMorphoRachisThoracique, 'Cyphose, rectitude…'],
                        ['Attitude de la ceinture scapulaire', morphoCeintureScap, setMorphoCeintureScap,     'Enroulement, sonnette…'],
                      ] as [string, string, (v: string) => void, string][]).map(([lbl, val, setter, ph]) => (
                        <div key={lbl} style={{ marginBottom: 8 }}>
                          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{lbl}</label>
                          <DictableInput value={val} onChange={e => setter(e.target.value)} placeholder={ph} inputStyle={inputStyle} />
                        </div>
                      ))}
                    </>
                  )}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', width: '100%', marginBottom: 2 }}>Modification de la posture</label>
                    {(['Pire', 'Pareil', 'Mieux']).map(v => (
                      <button key={v} className={`choix-btn${modificationPosture === v.toLowerCase() ? ' active' : ''}`} onClick={() => setModificationPosture(modificationPosture === v.toLowerCase() ? '' : v.toLowerCase())}>{v}</button>
                    ))}
                  </div>

                  {!coreMode && (
                    <>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 8px' }}>Observation — amyotrophies</p>
                      {([
                        ['Deltoïde',                       amyoDeltoide,        setAmyoDeltoide],
                        ['Fosse supra / infra-épineuse',   amyoFosseSupraInfra, setAmyoFosseSupraInfra],
                        ['Péri-scapulaire',                amyoPeriScapulaire,  setAmyoPeriScapulaire],
                      ] as [string, string, (v: string) => void][]).map(([lbl, val, setter]) => (
                        <div key={lbl} style={{ marginBottom: 8 }}>
                          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{lbl}</label>
                          <DictableInput value={val} onChange={e => setter(e.target.value)} placeholder="Observation…" inputStyle={inputStyle} />
                        </div>
                      ))}
                    </>
                  )}

                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-dark)', display: 'block', margin: '14px 0 6px' }}>Mobilité (°)</label>
                  <table className="mobility-table">
                    <thead>
                      <tr>
                        <th rowSpan={2}>Mouvement</th>
                        <th colSpan={2} style={{ textAlign: 'center' }}>Active</th>
                        <th colSpan={2} style={{ textAlign: 'center' }}>Passive</th>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'center' }}>G</th>
                        <th style={{ textAlign: 'center' }}>D</th>
                        <th style={{ textAlign: 'center' }}>G</th>
                        <th style={{ textAlign: 'center' }}>D</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Noyau : 4 mouvements clés JOSPT 2025 (flexion, abduction, RE1, RI2).
                          Complet : 8 mouvements avec adduction, extension, RE2, RI1. */}
                      {(coreMode
                        ? MOBILITE_KEYS.filter(([k]) => ['flexion', 'abduction', 're1', 'ri2'].includes(k))
                        : MOBILITE_KEYS
                      ).map(([k, lbl]) => (
                        <tr key={k}>
                          <td>{lbl}</td>
                          <td><AmplitudeInput value={mob[k].ag} onChange={v => updateMob(k, 'ag', v)} /></td>
                          <td><AmplitudeInput value={mob[k].ad} onChange={v => updateMob(k, 'ad', v)} /></td>
                          <td><AmplitudeInput value={mob[k].pg} onChange={v => updateMob(k, 'pg', v)} /></td>
                          <td><AmplitudeInput value={mob[k].pd} onChange={v => updateMob(k, 'pd', v)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!coreMode && (
                    <>
                      <div style={{ marginTop: 10 }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Mobilité du rachis cervical</label>
                        <DictableInput value={mobiliteRachisCervical} onChange={e => setMobiliteRachisCervical(e.target.value)} placeholder="Amplitudes / limitations…" inputStyle={inputStyle} />
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Mobilité du rachis thoracique</label>
                        <DictableInput value={mobiliteRachisThoracique} onChange={e => setMobiliteRachisThoracique(e.target.value)} placeholder="Amplitudes / limitations…" inputStyle={inputStyle} />
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Autres zones</label>
                        <DictableTextarea value={mobiliteAutresZones} onChange={e => setMobiliteAutresZones(e.target.value)} placeholder="Coude, poignet…" rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} />
                      </div>

                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 8px' }}>Modifications des symptômes</p>
                      {([
                        ['testAssistanceScap',   "Test d'assistance scapulaire"],
                        ['stabilisationScapula', 'Stabilisation de la scapula'],
                        ['testRetractionScap',   'Test de rétraction scapulaire'],
                        ['testTrapezeSup',       'Test du trapèze supérieur'],
                        ['serrerPoings',         'Serrer les poings'],
                        ['ajoutResistance',      'Ajout de résistance'],
                        ['activationCoiffe',     'Activation spécifique de la coiffe'],
                        ['pasAvantPrealable',    'Pas en avant préalable'],
                        ['diminutionLevier',     'Diminution du bras de levier'],
                        ['modifPositionThoracique', 'Modification de la position thoracique'],
                        ['modifPositionCervicale',  'Modification de la position cervicale'],
                      ] as [string, string][]).map(([k, lbl]) => (
                        <div key={k} style={{ marginBottom: 8 }}>
                          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{lbl}</label>
                          <DictableInput value={modifSymp[k] ?? ''} onChange={e => updateModifSymp(k, e.target.value)} placeholder="Résultat / observation…" inputStyle={inputStyle} />
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {sec.id === 'force' && (
                <>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', margin: '0 0 6px' }}>
                    Force musculaire <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>(échelle MRC)</span><MRCInfo />
                  </label>
                  <table className="mobility-table">
                    <thead><tr><th>Test</th><th style={{ textAlign: 'center' }}>Gauche</th><th style={{ textAlign: 'center' }}>Droite</th></tr></thead>
                    <tbody>
                      {/* Noyau JOSPT 2025 : 3 tests coiffe clés — Plan de la scapula 90° (sus-épineux/Jobe),
                          RE1 isométrique (infra-épineux/petit rond), RI2 stabilisée (subscapulaire). */}
                      {(coreMode
                        ? FORCE_KEYS.filter(([k]) => ['planScapula90', 're1Force', 'ri2StabEpaule'].includes(k))
                        : FORCE_KEYS
                      ).map(([k, lbl]) => (
                        <tr key={k}>
                          <td>{lbl}</td>
                          <td><ForceInput value={force[k].gauche} onChange={v => updateForce(k, 'gauche', v)} /></td>
                          <td><ForceInput value={force[k].droite} onChange={v => updateForce(k, 'droite', v)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!coreMode && (
                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Autres tests de force</label>
                      <DictableTextarea value={autresTestsForce} onChange={e => setAutresTestsForce(e.target.value)} placeholder="Préciser…" rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} />
                    </div>
                  )}

                  {/* Mouvements améliorant la symptomatologie — gardé en noyau (identification de préférence directionnelle). */}
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 8px' }}>Examen des mouvements améliorant la symptomatologie</p>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Marqueurs avant procédure</label>
                  <DictableInput value={marqueursAvant} onChange={e => setMarqueursAvant(e.target.value)} placeholder="EVN, amplitude, douleur…" inputStyle={inputStyle} />

                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Mouvement testé</label>
                  <DictableInput value={mvtAmelMouvement} onChange={e => setMvtAmelMouvement(e.target.value)} placeholder="Ex : rétraction scapulaire, RE2, flexion, abduction…" inputStyle={inputStyle} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Nb répétitions</label>
                      <DictableInput value={mvtAmelNbRep} onChange={e => setMvtAmelNbRep(e.target.value)} placeholder="Ex : 10" inputStyle={{ ...inputStyle, marginBottom: 0 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type de contraction</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Concentrique', 'Excentrique', 'Isométrique'].map(v => {
                          const key = v.toLowerCase()
                          return <button key={v} className={`choix-btn${mvtAmelContraction === key ? ' active' : ''}`} onClick={() => setMvtAmelContraction(mvtAmelContraction === key ? '' : key)}>{v}</button>
                        })}
                      </div>
                    </div>
                  </div>

                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Résultats après procédure</label>
                  <DictableTextarea value={resultatsMvtRep} onChange={e => setResultatsMvtRep(e.target.value)} placeholder="Effet sur EVN / amplitude / douleur — centralisation, périphérisation…" rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} />
                </>
              )}

              {sec.id === 'neuro' && (
                <>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Examen neurologique</p>
                  {/* Screening neuro bref (JOSPT 2025 : screening cervical recommandé). */}
                  {((coreMode
                    ? [
                        ['Réflexes',          reflexes,       setReflexes,       'Bicipital, tricipital, stylo-radial…'],
                        ['Force',             forceNeuro,     setForceNeuro,     'Territoire concerné…'],
                        ['Sensibilité',       sensibilite,    setSensibilite,    'Dermatomes C5-T1…'],
                      ]
                    : [
                        ['Réflexes',          reflexes,       setReflexes,       'Bicipital, tricipital, stylo-radial…'],
                        ['Force',             forceNeuro,     setForceNeuro,     'Territoire concerné…'],
                        ['Sensibilité',       sensibilite,    setSensibilite,    'Pinceau / Monofilaments / Roulette / NeuroPen / Chaud-Froid…'],
                        ['Hoffman / Tromner', hoffmanTromner, setHoffmanTromner, '+ / -'],
                      ]
                  ) as [string, string, (v: string) => void, string][]).map(([lbl, val, setter, ph]) => (
                    <div key={lbl} style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                        {lbl}
                        {lbl === 'Hoffman / Tromner' && (<><TestInfoButton testKey="hoffman" /><TestInfoButton testKey="tromner" /></>)}
                      </label>
                      <DictableInput value={val} onChange={e => setter(e.target.value)} placeholder={ph} inputStyle={inputStyle} />
                    </div>
                  ))}
                  {!coreMode && (
                    <>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Réversibilité</label>
                      <DictableInput value={reversibilite} onChange={e => setReversibilite(e.target.value)} placeholder="Oui / Non — Force, Pinceau/Monofilaments…" inputStyle={inputStyle} />
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Comportement</label>
                      <DictableInput value={comportement} onChange={e => setComportement(e.target.value)} placeholder="Utile / Inutile — Type…" inputStyle={inputStyle} />
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Palpation Nerf(s)</label>
                      <DictableInput value={palpationNerfs} onChange={e => setPalpationNerfs(e.target.value)} placeholder="Douleur, lequel…" inputStyle={inputStyle} />
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 0 6px' }}>Nerf / Racine</p>
                      <OuiNon label="Sous pression" value={nerfSousPression} onChange={setNerfSousPression} />
                      <OuiNon label="Malade" value={nerfMalade} onChange={setNerfMalade} />
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Précision(s)</label>
                      <DictableInput value={nerfPrecisions} onChange={e => setNerfPrecisions(e.target.value)} placeholder="—" inputStyle={inputStyle} />

                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', margin: '12px 0 4px' }}>Schéma des troubles sensitifs</label>
                      <DictableTextarea value={troublesSensitifsNotes} onChange={e => setTroublesSensitifsNotes(e.target.value)} placeholder="Localisation, qualité (fourmillements, engourdissement…)" rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} />
                    </>
                  )}

                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 8px' }}>Mécanosensibilité — ULNT</p>
                  {/* Gardé en noyau : 3 nerfs du MS pour la neurodynamique complète (ULNT1/2b/3). */}
                  {([
                    ['Nerf médian (ULNT1)',   'nerfMedian',  nerfMedian,  setNerfMedian],
                    ['Nerf radial (ULNT2b)',  'nerfRadial',  nerfRadial,  setNerfRadial],
                    ['Nerf ulnaire (ULNT3)',  'nerfUlnaire', nerfUlnaire, setNerfUlnaire],
                  ] as [string, string, string, (v: string) => void][]).map(([lbl, tKey, val, setter]) => (
                    <TestResultInput
                      key={lbl}
                      label={lbl}
                      testKey={tKey}
                      value={val}
                      onChange={setter}
                      placeholder="Reproduction symptômes, différenciation structurelle…"
                    />
                  ))}
                </>
              )}

              {sec.id === 'testsSpec' && (
                <>
                  {/* Noyau aligné sur la catégorisation clinique EBP : syndrome sous-acromial / épaule raide / instabilité.
                      Rupture de coiffe : Bear Hug (subscap), Belly Press (subscap), ERLS (sus/infra-épineux), IRLS (subscap). */}
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Rupture de coiffe (lag signs inclus)</p>
                  {([
                    ['bearHug',            'Bear Hug Test'],
                    ['bellyPress',         'Belly Press Test'],
                    ['externalRotLagSign', 'External Rotation Lag Sign (ERLS)'],
                    ['internalRotLagSign', 'Internal Rotation Lag Sign (IRLS — subscapulaire)'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <TestResultInput
                      key={k}
                      label={lbl}
                      testKey={k}
                      value={testsSpec[k] ?? ''}
                      onChange={v => updateTestSpec(k, v)}
                    />
                  ))}

                  {/* Tests d'instabilité — GARDÉS en noyau pour la catégorisation (syndrome sous-acromial / raide / instabilité). */}
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 8px' }}>Instabilité</p>
                  {([
                    ['apprehensionRelocation', 'Apprehension / Relocation Test'],
                    ['signeSulcus',            'Test du signe du Sulcus'],
                    ['jerkTest',               'Jerk Test'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <TestResultInput
                      key={k}
                      label={lbl}
                      testKey={k}
                      value={testsSpec[k] ?? ''}
                      onChange={v => updateTestSpec(k, v)}
                    />
                  ))}

                  {!coreMode && (
                    <>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 8px' }}>Cluster acromio-claviculaire</p>
                      {([
                        ['obrien',            "O'Brien"],
                        ['palpationAC',       'Palpation AC'],
                        ['crossArm',          'Cross-Arm'],
                        ['abdHorizResist',    'Abduction horizontale contre résistance'],
                      ] as [string, string][]).map(([k, lbl]) => (
                        <div key={k} className="oui-non-group">
                          <span className="oui-non-label">{lbl}<TestInfoButton testKey={k} /></span>
                          <div className="oui-non-btns">
                            {(['+', '−'] as const).map(v => {
                              const stored = v === '+' ? 'positif' : 'negatif'
                              return (
                                <button key={v} className={`oui-non-btn${testsSpec[k] === stored ? ' active' : ''}`} onClick={() => updateTestSpec(k, testsSpec[k] === stored ? '' : stored)}>{v}</button>
                              )
                            })}
                          </div>
                        </div>
                      ))}

                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '14px 0 8px' }}>Tests fonctionnels</p>
                      {([
                        ['ckcuest',     'CKCUEST'],
                        ['ulrt',        'ULRT'],
                        ['uqYbt',       'UQ-YBT'],
                        ['setPset',     'SET / PSET'],
                        ['smbtSasspt',  'SMBT / SASSPT'],
                      ] as [string, string][]).map(([k, lbl]) => (
                        <TestResultInput
                          key={k}
                          label={lbl}
                          testKey={k}
                          value={testsSpec[k] ?? ''}
                          onChange={v => updateTestSpec(k, v)}
                          placeholder="Score, nombre, côté…"
                        />
                      ))}
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Autres tests</label>
                      <DictableTextarea value={testsSpec.autresTestsFonctionnels ?? ''} onChange={e => updateTestSpec('autresTestsFonctionnels', e.target.value)} placeholder="Préciser…" rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} />
                    </>
                  )}
                </>
              )}

              {sec.id === 'conseils' && (
                <>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Conseils & recommandations au patient</label>
                  <DictableTextarea value={conseilsRecos} onChange={e => setConseilsRecos(e.target.value)} placeholder="Hygiène de vie, gestion de la charge, exercices à privilégier, signes d'alerte…" rows={6} textareaStyle={{ ...inputStyle, resize: 'vertical', minHeight: 140 }} />
                </>
              )}

            </div>
          )}
        </div>
      ))}
      {questionnaires.modal}
    </div>
  )
})

BilanEpauleInner.displayName = 'BilanEpaule'

export const BilanEpaule = memo(BilanEpauleInner)
