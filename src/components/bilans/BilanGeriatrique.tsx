import { useState, useImperativeHandle, forwardRef } from 'react'
import { OuiNon, SectionHeader, ScoreRow } from './shared'
import { useQuestionnaires } from './questionnaires/useQuestionnaires'
import { Chrono } from './Chrono'
import { SPPBInteractiveModal } from './SPPBInteractiveModal'
import {
  QuestionnaireModal,
  FES_I_QUESTIONS, interpretFesI,
  MINI_GDS_QUESTIONS, interpretMiniGds,
  TINETTI_QUESTIONS, interpretTinetti,
} from './QuestionnaireModal'
import {
  ContratKineSection, ConseilsSection, PSFSCards,
  mergeContrat,
  emptyPsfs, mergePsfs,
  inputStyle, lblStyle, sectionTitleStyle, subTitleStyle,
  type ContratState, type PsfsItem,
} from './bilanSections'

export interface BilanGeriatriqueHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

// ─── Petits helpers de rendu ───────────────────────────────────────────────
function ChoixGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
      {options.map(v => (
        <button key={v} className={`choix-btn${value === v ? ' active' : ''}`} onClick={() => onChange(value === v ? '' : v)}>{v}</button>
      ))}
    </div>
  )
}

function ChoixMulti({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => onChange(values.includes(opt) ? values.filter(x => x !== opt) : [...values, opt])
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
      {options.map(v => (
        <button key={v} className={`choix-btn${values.includes(v) ? ' active' : ''}`} onClick={() => toggle(v)}>{v}</button>
      ))}
    </div>
  )
}

// Mobilité fonctionnelle "Complète / Limitée + détail"
function MobInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const isComplet = value === 'complet'
  const isLimit = value.startsWith('limité')
  const limitDetail = isLimit ? value.replace(/^limité:?/, '').trim() : ''
  const clickComp = () => onChange(isComplet ? '' : 'complet')
  const clickLim  = () => onChange(isLimit ? '' : 'limité')
  const updateDetail = (txt: string) => onChange(txt.trim() ? `limité:${txt}` : 'limité')
  return (
    <div style={{ padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', flex: 1 }}>{label}</span>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className={`choix-btn${isComplet ? ' active' : ''}`} onClick={clickComp} style={{ fontSize: '0.72rem', padding: '3px 10px' }}>Complète</button>
          <button className={`choix-btn${isLimit ? ' active' : ''}`} onClick={clickLim} style={{ fontSize: '0.72rem', padding: '3px 10px' }}>Limitée</button>
        </div>
      </div>
      {isLimit && (
        <input
          type="text"
          value={limitDetail}
          onChange={e => updateDetail(e.target.value)}
          placeholder="Amplitude approximative (ex: 90° d'élévation)"
          style={{ marginTop: 6, width: '100%', padding: '0.4rem 0.7rem', fontSize: '0.78rem', color: 'var(--text-main)', background: 'var(--secondary)', border: '1px solid var(--border-color)', borderRadius: 6, boxSizing: 'border-box' }}
        />
      )}
    </div>
  )
}

// ─── Composant principal ────────────────────────────────────────────────────
export const BilanGeriatrique = forwardRef<BilanGeriatriqueHandle, { initialData?: Record<string, unknown> }>(({ initialData }, ref) => {
  const init = initialData ?? {}

  // ── Section 1 : Contexte de vie ──────────────────────────────────────────
  const _ctx = (init.contexte as Record<string, unknown>) ?? {}
  const [lieuVie, setLieuVie] = useState((_ctx.lieuVie as string) ?? '')
  const [aidesTech, setAidesTech] = useState<string[]>(Array.isArray(_ctx.aidesTech) ? _ctx.aidesTech as string[] : [])
  const [aidesHum, setAidesHum] = useState<string[]>(Array.isArray(_ctx.aidesHum) ? _ctx.aidesHum as string[] : [])
  const [accompagnant, setAccompagnant] = useState((_ctx.accompagnant as string) ?? '')
  const [profession, setProfession] = useState((_ctx.profession as string) ?? '')

  // ── Section 2 : Chutes & Red Flags ───────────────────────────────────────
  const _chutes = (init.chutes as Record<string, unknown>) ?? {}
  const [chutes12m, setChutes12m] = useState((_chutes.passees as string) ?? '')
  const [chutesNb, setChutesNb] = useState((_chutes.nombre as string) ?? '')
  const [chutesCirc, setChutesCirc] = useState((_chutes.circonstances as string) ?? '')
  const [peurTomber, setPeurTomber] = useState((_chutes.peurTomber as string) ?? '')
  const [chuteAvecCons, setChuteAvecCons] = useState((_chutes.consequences as string) ?? '')

  const _rf = (init.redFlags as Record<string, unknown>) ?? {}
  const [rf, setRf] = useState<Record<string, string>>({
    pertePoids: '', troublesCognitifs: '', incontinence: '', hospitalisation: '', polymedication: '',
    syncope: '', deshydratation: '', troublesVisuels: '', troublesAuditifs: '',
    ...(_rf as Record<string, string>),
  })

  // ── Section 3 : Douleur (simplifiée gériatrie) ───────────────────────────
  const _d = (init.douleur as Record<string, unknown>) ?? {}
  const [douleurLoc, setDouleurLoc] = useState((_d.localisation as string) ?? '')
  const [douleurLocSecondaire, setDouleurLocSecondaire] = useState((_d.localisationSecondaire as string) ?? '')
  const [evnRepos, setEvnRepos] = useState((_d.evnRepos as string) ?? '')
  const [evnMvt, setEvnMvt] = useState((_d.evnMvt as string) ?? '')
  const [echelle, setEchelle] = useState((_d.echelle as string) ?? 'EN')
  const [derouillage, setDerouillage] = useState((_d.derouillageMatinal as string) ?? '')
  const [derouillageDuree, setDerouillageDuree] = useState((_d.derouillageTemps as string) ?? '')
  const [retentissement, setRetentissement] = useState((_d.retentissement as string) ?? '')

  // ── Section 4 : Yellow flags + scores psycho-sociaux ─────────────────────
  const _yf = (init.yellowFlags as Record<string, unknown>) ?? {}
  const [isolement, setIsolement] = useState((_yf.isolement as string) ?? '')
  const [moral, setMoral] = useState((_yf.moral as string) ?? '')
  const [fesI, setFesI] = useState((_yf.fesI as string) ?? '')
  const [fesIAnswers, setFesIAnswers] = useState<Record<string, number>>((_yf.fesIAnswers as Record<string, number>) ?? {})
  const [miniGds, setMiniGds] = useState((_yf.miniGds as string) ?? '')
  const [miniGdsAnswers, setMiniGdsAnswers] = useState<Record<string, number>>((_yf.miniGdsAnswers as Record<string, number>) ?? {})
  const [openFesI, setOpenFesI] = useState(false)
  const [openMiniGds, setOpenMiniGds] = useState(false)

  // ── Section 5 : Examen clinique ──────────────────────────────────────────
  const _ec = (init.examClinique as Record<string, unknown>) ?? {}
  const _mob = (_ec.mobilite as Record<string, unknown>) ?? {}
  const [morfho, setMorfho] = useState<string[]>(Array.isArray(_ec.morfho) ? _ec.morfho as string[] : [])
  const [postureNotes, setPostureNotes] = useState((_ec.postureNotes as string) ?? '')
  const [mobEpaules, setMobEpaules] = useState((_mob.epaules as string) ?? '')
  const [mobHanchesGenoux, setMobHanchesGenoux] = useState((_mob.hanchesGenoux as string) ?? '')
  const [mobChevilles, setMobChevilles] = useState((_mob.chevilles as string) ?? '')
  const [mobRachis, setMobRachis] = useState((_mob.rachis as string) ?? '')
  const [forceGlobale, setForceGlobale] = useState((_ec.forceGlobale as string) ?? '')
  const [trophicite, setTrophicite] = useState((_ec.trophicite as string) ?? '')

  // ── Section 6 : Tests fonctionnels gériatriques ──────────────────────────
  const _t = (init.tests as Record<string, unknown>) ?? {}
  const [tug, setTug] = useState((_t.tug as string) ?? '')
  const [sppbEquilibre, setSppbEquilibre] = useState((_t.sppbEquilibre as string) ?? '')
  const [sppbVitesse, setSppbVitesse] = useState((_t.sppbVitesse as string) ?? '')
  const [sppbLever, setSppbLever] = useState((_t.sppbLever as string) ?? '')
  const [sppbRawData, setSppbRawData] = useState<Record<string, unknown>>((_t.sppbRawData as Record<string, unknown>) ?? {})
  const [openSppb, setOpenSppb] = useState(false)
  const [tinetti, setTinetti] = useState((_t.tinetti as string) ?? '')
  const [tinettiAnswers, setTinettiAnswers] = useState<Record<string, number>>((_t.tinettiAnswers as Record<string, number>) ?? {})
  const [openTinetti, setOpenTinetti] = useState(false)
  const [doubleTache, setDoubleTache] = useState((_t.doubleTache as string) ?? '')
  const [cinqLeverTime, setCinqLeverTime] = useState((_t.cinqLeverTime as string) ?? '')
  const [vitesseMarche, setVitesseMarche] = useState((_t.vitesseMarche as string) ?? '')
  const [appuiMonopodal, setAppuiMonopodal] = useState((_t.appuiMonopodal as string) ?? '')

  const sppbTotal = (() => {
    const e = Number(sppbEquilibre) || 0
    const v = Number(sppbVitesse) || 0
    const l = Number(sppbLever) || 0
    return (sppbEquilibre || sppbVitesse || sppbLever) ? e + v + l : null
  })()

  // ── Section 7 : Scores cliniques unifiés (Katz, Lawton, MNA-SF, Fried) ──
  const _sc = (init.scores as Record<string, unknown>) ?? {}
  const [scores, setScores] = useState<Record<string, string>>({
    katzAdl: '', lawtonIadl: '', mnaSf: '', fried: '', autres: '',
    ...((_sc as Record<string, string>) ?? {}),
  })
  const updScore = (k: string, v: string) => setScores(p => ({ ...p, [k]: v }))

  // ── PSFS (objectifs fonctionnels personnalisés) ──────────────────────────
  const [psfs, setPsfs] = useState<PsfsItem[]>(() => mergePsfs((init.psfs as unknown) ?? emptyPsfs()))

  // ── Section 8 : Contrat kiné + conseils ──────────────────────────────────
  const [contrat, setContrat] = useState<ContratState>(() => mergeContrat((init.contrat as Record<string, unknown>) ?? {}))
  const [conseils, setConseils] = useState((init.conseils as { recos?: string })?.recos ?? '')

  // ── Questionnaires interactifs (système moderne) ─────────────────────────
  const [qAnswers, setQAnswers] = useState<Record<string, Record<string, unknown>>>(
    (init.questionnaireAnswers as Record<string, Record<string, unknown>>) ?? {}
  )
  const [qResults, setQResults] = useState<Record<string, import('./questionnaires/useQuestionnaires').StoredResult>>(
    (init.questionnaireResults as Record<string, import('./questionnaires/useQuestionnaires').StoredResult>) ?? {}
  )
  const questionnaires = useQuestionnaires(updScore, qAnswers, setQAnswers, qResults, setQResults)

  // ── Sections collapsibles ────────────────────────────────────────────────
  const [open, setOpen] = useState<Record<string, boolean>>({ contexte: true })
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  // ── Interpretations rapides ──────────────────────────────────────────────
  const tugRisk = tug !== '' && Number(tug) > 12
  const cinqLeverRisk = cinqLeverTime !== '' && Number(cinqLeverTime) > 15
  const vitesseLente = vitesseMarche !== '' && Number(vitesseMarche) < 0.8
  const monopodalRisk = appuiMonopodal !== '' && Number(appuiMonopodal) < 5

  useImperativeHandle(ref, () => ({
    getData: () => ({
      contexte: { lieuVie, aidesTech, aidesHum, accompagnant, profession },
      chutes: { passees: chutes12m, nombre: chutesNb, circonstances: chutesCirc, peurTomber, consequences: chuteAvecCons },
      redFlags: rf,
      douleur: {
        localisation: douleurLoc, localisationSecondaire: douleurLocSecondaire,
        evnRepos, evnMvt, echelle,
        derouillageMatinal: derouillage, derouillageTemps: derouillageDuree,
        retentissement,
      },
      yellowFlags: { isolement, moral, fesI, fesIAnswers, miniGds, miniGdsAnswers },
      examClinique: {
        morfho, postureNotes,
        mobilite: { epaules: mobEpaules, hanchesGenoux: mobHanchesGenoux, chevilles: mobChevilles, rachis: mobRachis },
        forceGlobale, trophicite,
      },
      tests: {
        tug, sppbEquilibre, sppbVitesse, sppbLever, sppbRawData,
        tinetti, tinettiAnswers, doubleTache, cinqLeverTime, vitesseMarche, appuiMonopodal,
      },
      scores: { ...scores, sppbTotal: sppbTotal ?? '', fesI, miniGds, tinetti },
      psfs,
      contrat,
      conseils: { recos: conseils },
      questionnaireAnswers: qAnswers,
      questionnaireResults: qResults,
    }),
    setData: (data: Record<string, unknown>) => {
      const ctx    = (data.contexte     as Record<string, unknown>) ?? {}
      const chutes = (data.chutes       as Record<string, unknown>) ?? {}
      const rfd    = (data.redFlags     as Record<string, unknown>) ?? {}
      const d      = (data.douleur      as Record<string, unknown>) ?? {}
      const yfd    = (data.yellowFlags  as Record<string, unknown>) ?? {}
      const ec     = (data.examClinique as Record<string, unknown>) ?? {}
      const mob    = (ec.mobilite       as Record<string, unknown>) ?? {}
      const t      = (data.tests        as Record<string, unknown>) ?? {}
      if (ctx.lieuVie !== undefined)    setLieuVie(ctx.lieuVie as string)
      if (Array.isArray(ctx.aidesTech)) setAidesTech(ctx.aidesTech as string[])
      if (Array.isArray(ctx.aidesHum))  setAidesHum(ctx.aidesHum as string[])
      if (ctx.accompagnant !== undefined) setAccompagnant(ctx.accompagnant as string)
      if (ctx.profession !== undefined)   setProfession(ctx.profession as string)
      if (chutes.passees !== undefined)        setChutes12m(chutes.passees as string)
      if (chutes.nombre !== undefined)         setChutesNb(chutes.nombre as string)
      if (chutes.circonstances !== undefined)  setChutesCirc(chutes.circonstances as string)
      if (chutes.peurTomber !== undefined)     setPeurTomber(chutes.peurTomber as string)
      if (chutes.consequences !== undefined)   setChuteAvecCons(chutes.consequences as string)
      if (Object.keys(rfd).length > 0)  setRf(p => ({ ...p, ...rfd as Record<string, string> }))
      if (d.localisation !== undefined)           setDouleurLoc(d.localisation as string)
      if (d.localisationSecondaire !== undefined) setDouleurLocSecondaire(d.localisationSecondaire as string)
      if (d.evnRepos !== undefined)           setEvnRepos(d.evnRepos as string)
      if (d.evnMvt !== undefined)             setEvnMvt(d.evnMvt as string)
      if (d.echelle !== undefined)            setEchelle(d.echelle as string)
      if (d.derouillageMatinal !== undefined) setDerouillage(d.derouillageMatinal as string)
      if (d.derouillageTemps !== undefined)   setDerouillageDuree(d.derouillageTemps as string)
      if (d.retentissement !== undefined)     setRetentissement(d.retentissement as string)
      if (yfd.isolement !== undefined)        setIsolement(yfd.isolement as string)
      if (yfd.moral !== undefined)            setMoral(yfd.moral as string)
      if (yfd.fesI !== undefined)             setFesI(yfd.fesI as string)
      if (yfd.fesIAnswers !== undefined)      setFesIAnswers(yfd.fesIAnswers as Record<string, number>)
      if (yfd.miniGds !== undefined)          setMiniGds(yfd.miniGds as string)
      if (yfd.miniGdsAnswers !== undefined)   setMiniGdsAnswers(yfd.miniGdsAnswers as Record<string, number>)
      if (Array.isArray(ec.morfho))           setMorfho(ec.morfho as string[])
      if (ec.postureNotes !== undefined)      setPostureNotes(ec.postureNotes as string)
      if (mob.epaules !== undefined)          setMobEpaules(mob.epaules as string)
      if (mob.hanchesGenoux !== undefined)    setMobHanchesGenoux(mob.hanchesGenoux as string)
      if (mob.chevilles !== undefined)        setMobChevilles(mob.chevilles as string)
      if (mob.rachis !== undefined)           setMobRachis(mob.rachis as string)
      if (ec.forceGlobale !== undefined)      setForceGlobale(ec.forceGlobale as string)
      if (ec.trophicite !== undefined)        setTrophicite(ec.trophicite as string)
      if (t.tug !== undefined)            setTug(t.tug as string)
      if (t.sppbEquilibre !== undefined)  setSppbEquilibre(t.sppbEquilibre as string)
      if (t.sppbVitesse !== undefined)    setSppbVitesse(t.sppbVitesse as string)
      if (t.sppbLever !== undefined)      setSppbLever(t.sppbLever as string)
      if (t.sppbRawData !== undefined)    setSppbRawData(t.sppbRawData as Record<string, unknown>)
      if (t.tinetti !== undefined)        setTinetti(t.tinetti as string)
      if (t.tinettiAnswers !== undefined) setTinettiAnswers(t.tinettiAnswers as Record<string, number>)
      if (t.doubleTache !== undefined)    setDoubleTache(t.doubleTache as string)
      if (t.cinqLeverTime !== undefined)  setCinqLeverTime(t.cinqLeverTime as string)
      if (t.vitesseMarche !== undefined)  setVitesseMarche(t.vitesseMarche as string)
      if (t.appuiMonopodal !== undefined) setAppuiMonopodal(t.appuiMonopodal as string)
      if (data.scores)  setScores(p => ({ ...p, ...(data.scores as Record<string, string>) }))
      if (data.psfs)    setPsfs(mergePsfs(data.psfs))
      if (data.contrat) setContrat(mergeContrat(data.contrat as Record<string, unknown>))
      const cn = (data.conseils as Record<string, unknown>) ?? {}
      if (cn.recos !== undefined) setConseils(cn.recos as string)
      if (data.questionnaireAnswers) setQAnswers(data.questionnaireAnswers as Record<string, Record<string, unknown>>)
      if (data.questionnaireResults) setQResults(data.questionnaireResults as Record<string, import('./questionnaires/useQuestionnaires').StoredResult>)
    },
  }))

  // ─── Liste des sections collapsibles ────────────────────────────────────
  const sections = [
    { id: 'contexte',     title: '1. Contexte de vie & autonomie',         color: 'var(--primary)' },
    { id: 'chutes',       title: '2. Chutes & Red Flags 🚩',                color: '#dc2626' },
    { id: 'douleur',      title: '3. Douleur',                              color: 'var(--primary)' },
    { id: 'yellow',       title: '4. Yellow Flags 🟡 — psycho-social',      color: '#d97706' },
    { id: 'examClinique', title: '5. Examen clinique & mobilité',           color: 'var(--primary)' },
    { id: 'tests',        title: '6. Tests fonctionnels (5 piliers)',       color: 'var(--primary)' },
    { id: 'scores',       title: '7. Scores gériatriques',                  color: 'var(--primary)' },
    { id: 'contrat',      title: '8. Contrat kiné & objectifs SMART',       color: '#059669' },
    { id: 'conseils',     title: '9. Conseils & recommandations',           color: '#059669' },
  ]

  return (
    <div>
      {sections.map(sec => (
        <div key={sec.id} style={{ marginBottom: 4 }}>
          <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} color={sec.color} />
          {open[sec.id] && (
            <div style={{ paddingTop: 12, paddingBottom: 8 }}>

              {/* ── 1. Contexte ────────────────────────────────────── */}
              {sec.id === 'contexte' && (
                <>
                  <label style={lblStyle}>Lieu de vie</label>
                  <ChoixGroup options={['Domicile plain-pied', 'Domicile étages', 'Home Médicalisé', 'Résidence Autonomie', 'EHPAD']} value={lieuVie} onChange={setLieuVie} />

                  <label style={lblStyle}>Aides techniques actuelles</label>
                  <ChoixMulti options={['Aucune', 'Canne simple', 'Double canne', 'Béquilles', 'Déambulateur 2R', 'Déambulateur 4R / rollator', 'Fauteuil roulant', 'Lit médicalisé']} values={aidesTech} onChange={setAidesTech} />

                  <label style={lblStyle}>Aides humaines</label>
                  <ChoixMulti options={['Aucune', 'Auxiliaire de vie', 'Famille', 'Infirmier(e)', 'Kinésithérapeute', 'Aide-soignant(e)']} values={aidesHum} onChange={setAidesHum} />

                  <label style={lblStyle}>Accompagnant présent à la séance</label>
                  <input value={accompagnant} onChange={e => setAccompagnant(e.target.value)} placeholder="Conjoint, enfant, aidant…" style={inputStyle} />

                  <label style={lblStyle}>Ancienne profession (utile pour personnaliser la PEC)</label>
                  <input value={profession} onChange={e => setProfession(e.target.value)} placeholder="Ex : agriculteur, enseignante, ouvrier…" style={inputStyle} />
                </>
              )}

              {/* ── 2. Chutes & Red Flags ─────────────────────────── */}
              {sec.id === 'chutes' && (
                <>
                  <p style={sectionTitleStyle}>Antécédents de chute</p>
                  <OuiNon label="Chute(s) sur les 12 derniers mois ?" value={chutes12m} onChange={setChutes12m} />
                  {chutes12m === 'oui' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, marginTop: 8, marginBottom: 8 }}>
                        <div>
                          <label style={lblStyle}>Nombre</label>
                          <input type="number" min="0" value={chutesNb} onChange={e => setChutesNb(e.target.value)} placeholder="ex: 2" style={{ ...inputStyle, textAlign: 'center', marginBottom: 0 }} />
                        </div>
                        <div>
                          <label style={lblStyle}>Circonstances</label>
                          <input value={chutesCirc} onChange={e => setChutesCirc(e.target.value)} placeholder="Salle de bain, la nuit, sur le tapis…" style={{ ...inputStyle, marginBottom: 0 }} />
                        </div>
                      </div>
                      <label style={lblStyle}>Conséquences (fracture, hospitalisation, hématome…)</label>
                      <textarea value={chuteAvecCons} onChange={e => setChuteAvecCons(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />
                    </>
                  )}

                  <label style={lblStyle}>Peur de tomber (syndrome post-chute)</label>
                  <ChoixGroup options={['Nulle', 'Modérée', 'Majeure']} value={peurTomber} onChange={setPeurTomber} />

                  <p style={{ ...sectionTitleStyle, color: '#dc2626', marginTop: 14 }}>Red flags spécifiques gériatrie</p>
                  <OuiNon label="Perte de poids involontaire récente (dénutrition)"  value={rf.pertePoids ?? ''}        onChange={v => setRf(p => ({ ...p, pertePoids: v }))} />
                  <OuiNon label="Troubles cognitifs connus (Alzheimer, démence)"      value={rf.troublesCognitifs ?? ''} onChange={v => setRf(p => ({ ...p, troublesCognitifs: v }))} />
                  <OuiNon label="Incontinence récente (urinaire / fécale)"            value={rf.incontinence ?? ''}      onChange={v => setRf(p => ({ ...p, incontinence: v }))} />
                  <OuiNon label="Hospitalisation récente (< 3 mois)"                   value={rf.hospitalisation ?? ''}   onChange={v => setRf(p => ({ ...p, hospitalisation: v }))} />
                  <OuiNon label="Polymédication (> 5 médicaments / jour)"              value={rf.polymedication ?? ''}    onChange={v => setRf(p => ({ ...p, polymedication: v }))} />
                  <OuiNon label="Syncope ou malaise inexpliqué"                        value={rf.syncope ?? ''}           onChange={v => setRf(p => ({ ...p, syncope: v }))} />
                  <OuiNon label="Déshydratation / signe de fragilité globale"          value={rf.deshydratation ?? ''}    onChange={v => setRf(p => ({ ...p, deshydratation: v }))} />
                  <OuiNon label="Troubles visuels mal corrigés"                        value={rf.troublesVisuels ?? ''}   onChange={v => setRf(p => ({ ...p, troublesVisuels: v }))} />
                  <OuiNon label="Troubles auditifs mal corrigés"                       value={rf.troublesAuditifs ?? ''}  onChange={v => setRf(p => ({ ...p, troublesAuditifs: v }))} />
                </>
              )}

              {/* ── 3. Douleur ──────────────────────────────────── */}
              {sec.id === 'douleur' && (
                <>
                  <label style={lblStyle}>Localisation principale</label>
                  <input value={douleurLoc} onChange={e => setDouleurLoc(e.target.value)} placeholder="Ex : Hanche droite, rachis lombaire…" style={inputStyle} />

                  <label style={lblStyle}>Localisations secondaires</label>
                  <textarea value={douleurLocSecondaire} onChange={e => setDouleurLocSecondaire(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Autres zones douloureuses (genou gauche, épaule droite, nuque…)" />

                  <label style={lblStyle}>Échelle utilisée</label>
                  <ChoixGroup options={['EN', 'EVA', 'Algoplus', 'EVS', 'Doloplus-2']} value={echelle} onChange={setEchelle} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={lblStyle}>Au repos</label>
                      <input type="number" min="0" max="10" value={evnRepos} onChange={e => setEvnRepos(e.target.value)} style={{ ...inputStyle, textAlign: 'center', marginBottom: 0 }} placeholder="0-10" />
                    </div>
                    <div>
                      <label style={lblStyle}>Au mouvement</label>
                      <input type="number" min="0" max="10" value={evnMvt} onChange={e => setEvnMvt(e.target.value)} style={{ ...inputStyle, textAlign: 'center', marginBottom: 0 }} placeholder="0-10" />
                    </div>
                  </div>

                  <OuiNon label="Dérouillage matinal" value={derouillage} onChange={setDerouillage} />
                  {derouillage === 'oui' && (
                    <input value={derouillageDuree} onChange={e => setDerouillageDuree(e.target.value)} placeholder="Durée (ex: 30 min)" style={{ ...inputStyle, marginTop: 6 }} />
                  )}

                  <label style={lblStyle}>Retentissement de la douleur sur l'autonomie</label>
                  <textarea value={retentissement} onChange={e => setRetentissement(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Limite la marche, empêche le sommeil, gêne la toilette…" />
                </>
              )}

              {/* ── 4. Yellow Flags ────────────────────────────── */}
              {sec.id === 'yellow' && (
                <>
                  <OuiNon label="Isolement social" value={isolement} onChange={setIsolement} />
                  <label style={lblStyle}>Moral perçu</label>
                  <ChoixGroup options={['Bon', 'Variable', 'Bas', 'Préoccupant']} value={moral} onChange={setMoral} />

                  <p style={{ ...sectionTitleStyle, marginTop: 14 }}>Échelles psycho-sociales</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setOpenFesI(true)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: `1.5px solid ${fesI ? '#bfdbfe' : 'var(--border-color)'}`, background: fesI ? '#eff6ff' : 'var(--secondary)', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: fesI ? '#1e3a8a' : 'var(--text-main)' }}>FES-I — Peur de tomber</div>
                        {fesI ? (
                          <div style={{ fontSize: '0.7rem', color: interpretFesI(Number(fesI)).color, fontWeight: 600, marginTop: 1 }}>{interpretFesI(Number(fesI)).label}</div>
                        ) : (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>16 items · score /64</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {fesI ? (
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: interpretFesI(Number(fesI)).color }}>{fesI}<span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}> / 64</span></span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>Remplir</span>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpenMiniGds(true)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: `1.5px solid ${miniGds ? '#bfdbfe' : 'var(--border-color)'}`, background: miniGds ? '#eff6ff' : 'var(--secondary)', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: miniGds ? '#1e3a8a' : 'var(--text-main)' }}>Mini GDS — Dépression gériatrique</div>
                        {miniGds ? (
                          <div style={{ fontSize: '0.7rem', color: interpretMiniGds(Number(miniGds)).color, fontWeight: 600, marginTop: 1 }}>{interpretMiniGds(Number(miniGds)).label}</div>
                        ) : (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>4 items · ≥ 1 = forte probabilité</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {miniGds ? (
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: interpretMiniGds(Number(miniGds)).color }}>{miniGds}<span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}> / 4</span></span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>Remplir</span>
                        )}
                      </div>
                    </button>
                  </div>
                </>
              )}

              {/* ── 5. Examen clinique ────────────────────────── */}
              {sec.id === 'examClinique' && (
                <>
                  <p style={sectionTitleStyle}>Morphostatique</p>
                  <ChoixMulti options={['Hypercyphose dorsale', 'Flexum genoux', 'Flexum hanches', 'Camptocormie', 'Inégalité de longueur', 'Antéprojection tête']} values={morfho} onChange={setMorfho} />
                  <label style={lblStyle}>Notes posturales</label>
                  <textarea value={postureNotes} onChange={e => setPostureNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="—" />

                  <p style={{ ...sectionTitleStyle, marginTop: 14 }}>Mobilité — focus fonctionnel</p>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.1rem 0.75rem', marginBottom: 12 }}>
                    <MobInput label="Élévation épaules (habillage / placards)" value={mobEpaules} onChange={setMobEpaules} />
                    <MobInput label="Flexion hanches/genoux (chaussage)" value={mobHanchesGenoux} onChange={setMobHanchesGenoux} />
                    <MobInput label="Flexion dorsale chevilles (risque butée)" value={mobChevilles} onChange={setMobChevilles} />
                    <MobInput label="Mobilité du rachis (rotation, extension)" value={mobRachis} onChange={setMobRachis} />
                  </div>

                  <p style={subTitleStyle}>Force globale & trophicité</p>
                  <label style={lblStyle}>Force musculaire globale (impression clinique)</label>
                  <ChoixGroup options={['Conservée', 'Diminution modérée', 'Faiblesse marquée', 'Sarcopénie']} value={forceGlobale} onChange={setForceGlobale} />
                  <label style={lblStyle}>Trophicité musculaire / amyotrophie</label>
                  <input value={trophicite} onChange={e => setTrophicite(e.target.value)} placeholder="Localisation amyotrophie, œdèmes…" style={inputStyle} />
                </>
              )}

              {/* ── 6. Tests fonctionnels ─────────────────────── */}
              {sec.id === 'tests' && (
                <>
                  {/* TUG */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ ...lblStyle, marginBottom: 0 }}>Timed Up and Go (TUG)</label>
                      {tugRisk && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626' }}>Risque de chute</span>}
                    </div>
                    <Chrono value={tug} onChange={setTug} />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Patient assis → marche 3 m → demi-tour → revient s'asseoir. Norme : &gt; 12 sec = risque de chute.</div>
                  </div>

                  {/* SPPB */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ ...lblStyle, marginBottom: 6 }}>SPPB — Short Physical Performance Battery</label>
                    <button
                      type="button"
                      onClick={() => setOpenSppb(true)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: `1.5px solid ${sppbTotal !== null ? '#bfdbfe' : 'var(--border-color)'}`, background: sppbTotal !== null ? '#eff6ff' : 'var(--secondary)', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: sppbTotal !== null ? '#1e3a8a' : 'var(--text-main)' }}>
                          {sppbTotal !== null ? 'SPPB — score total' : 'Lancer le test SPPB interactif'}
                        </div>
                        {sppbTotal !== null && (
                          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: sppbTotal >= 10 ? '#16a34a' : sppbTotal >= 7 ? '#d97706' : '#dc2626', marginTop: 1 }}>
                            {sppbTotal >= 10 ? 'Performance normale' : sppbTotal >= 7 ? 'Limitations modérées' : 'Fragilité'}
                          </div>
                        )}
                      </div>
                      {sppbTotal !== null ? (
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: sppbTotal >= 10 ? '#16a34a' : sppbTotal >= 7 ? '#d97706' : '#dc2626' }}>{sppbTotal}<span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}> / 12</span></span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>Remplir</span>
                      )}
                    </button>
                    {sppbTotal !== null && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        <span>Équilibre <strong style={{ color: 'var(--text-main)' }}>{sppbEquilibre || '—'}/4</strong></span>
                        <span>·</span>
                        <span>Vitesse <strong style={{ color: 'var(--text-main)' }}>{sppbVitesse || '—'}/4</strong></span>
                        <span>·</span>
                        <span>Lever chaise <strong style={{ color: 'var(--text-main)' }}>{sppbLever || '—'}/4</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Tinetti */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ ...lblStyle, marginBottom: 6 }}>Test de Tinetti (équilibre + marche)</label>
                    <button
                      type="button"
                      onClick={() => setOpenTinetti(true)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: `1.5px solid ${tinetti ? '#bfdbfe' : 'var(--border-color)'}`, background: tinetti ? '#eff6ff' : 'var(--secondary)', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: tinetti ? '#1e3a8a' : 'var(--text-main)' }}>Score Tinetti</div>
                        {tinetti ? (
                          <div style={{ fontSize: '0.7rem', color: interpretTinetti(Number(tinetti)).color, fontWeight: 600, marginTop: 1 }}>{interpretTinetti(Number(tinetti)).label}</div>
                        ) : (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>16 items · 9 équilibre + 7 marche · score /28</div>
                        )}
                      </div>
                      {tinetti ? (
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: interpretTinetti(Number(tinetti)).color }}>{tinetti}<span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}> / 28</span></span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>Remplir</span>
                      )}
                    </button>
                  </div>

                  {/* Double tâche */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ ...lblStyle, marginBottom: 4 }}>Double tâche (Walking While Talking)</label>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>Le patient s'arrête de marcher pour parler ?</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className={`choix-btn${doubleTache === 'oui' ? ' active' : ''}`} onClick={() => setDoubleTache(doubleTache === 'oui' ? '' : 'oui')} style={doubleTache === 'oui' ? { background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' } : undefined}>Oui — haut risque</button>
                      <button className={`choix-btn${doubleTache === 'non' ? ' active' : ''}`} onClick={() => setDoubleTache(doubleTache === 'non' ? '' : 'non')}>Non</button>
                    </div>
                  </div>

                  {/* 5 Levers de chaise */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ ...lblStyle, marginBottom: 0 }}>5 Levers de chaise (chronométré)</label>
                      {cinqLeverRisk && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626' }}>Sarcopénie</span>}
                    </div>
                    <Chrono value={cinqLeverTime} onChange={setCinqLeverTime} />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Patient bras croisés. Seuil : &gt; 15 sec = sarcopénie / risque de chute.</div>
                  </div>

                  {/* Vitesse de marche 4m */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ ...lblStyle, marginBottom: 0 }}>Vitesse de marche (m/s) sur 4 mètres</label>
                      {vitesseLente && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626' }}>Lenteur (Fried)</span>}
                    </div>
                    <input type="number" step="0.01" min="0" value={vitesseMarche} onChange={e => setVitesseMarche(e.target.value)} placeholder="ex: 0.92" style={{ ...inputStyle, textAlign: 'center', marginBottom: 4 }} />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Seuils : &lt; 0,8 m/s = critère de fragilité (Fried) · &lt; 0,6 m/s = dépendance future probable.</div>
                  </div>

                  {/* Appui monopodal */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ ...lblStyle, marginBottom: 0 }}>Appui monopodal (secondes, meilleur côté)</label>
                      {monopodalRisk && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626' }}>Équilibre précaire</span>}
                    </div>
                    <input type="number" min="0" value={appuiMonopodal} onChange={e => setAppuiMonopodal(e.target.value)} placeholder="ex: 8" style={{ ...inputStyle, textAlign: 'center', marginBottom: 4 }} />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Norme : &gt; 5 sec. &lt; 5 sec = risque de chute multiplié par 2.</div>
                  </div>
                </>
              )}

              {/* ── 7. Scores gériatriques (Katz / Lawton / MNA-SF / Fried) ── */}
              {sec.id === 'scores' && (
                <>
                  {([
                    ['katzAdl',    'ADL — Katz (autonomie de base) / 6',           'katzAdl'],
                    ['lawtonIadl', 'IADL — Lawton (autonomie instrumentale) / 8',  'lawtonIadl'],
                    ['mnaSf',      'MNA-SF — Dépistage dénutrition / 14',          'mnaSf'],
                    ['fried',      'Critères de Fried — Fragilité / 5',            'fried'],
                  ] as [string, string, string][]).map(([k, lbl, qId]) => (
                    <ScoreRow key={k} label={lbl} value={scores[k] ?? ''} onChange={v => updScore(k, v)}
                      onOpenQuestionnaire={() => questionnaires.open(qId, k)}
                      result={questionnaires.getResult(k, qId)} />
                  ))}

                  <PSFSCards items={psfs} onChange={setPsfs} />

                  <label style={{ ...lblStyle, marginTop: 8 }}>Autres scores</label>
                  <textarea value={scores.autres ?? ''} onChange={e => updScore('autres', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="MMSE, Barthel, Norton, autres…" />
                </>
              )}

              {/* ── 8. Contrat kiné ────────────────────────── */}
              {sec.id === 'contrat' && (
                <ContratKineSection state={contrat} onChange={p => setContrat(s => ({ ...s, ...p }))} />
              )}

              {/* ── 9. Conseils ─────────────────────────── */}
              {sec.id === 'conseils' && (
                <ConseilsSection value={conseils} onChange={setConseils} />
              )}

            </div>
          )}
        </div>
      ))}

      {/* Modals questionnaires modernes (Katz/Lawton/MNA-SF/Fried) */}
      {questionnaires.modal}

      {/* Modals legacy (FES-I, Mini GDS, Tinetti, SPPB) */}
      {openFesI && (
        <QuestionnaireModal
          title="FES-I — Échelle internationale d'efficacité face aux chutes"
          subtitle="16 items · À quel point êtes-vous inquiet(e) de tomber en faisant…"
          questions={FES_I_QUESTIONS}
          maxScore={64}
          interpretation={interpretFesI}
          initialAnswers={fesIAnswers}
          onValidate={(score, answers) => { setFesI(String(score)); setFesIAnswers(answers); setOpenFesI(false) }}
          onClose={() => setOpenFesI(false)}
        />
      )}
      {openMiniGds && (
        <QuestionnaireModal
          title="Mini GDS — Échelle de dépression gériatrique"
          subtitle="4 items · ≥ 1 point = forte probabilité de dépression"
          questions={MINI_GDS_QUESTIONS}
          maxScore={4}
          interpretation={interpretMiniGds}
          initialAnswers={miniGdsAnswers}
          onValidate={(score, answers) => { setMiniGds(String(score)); setMiniGdsAnswers(answers); setOpenMiniGds(false) }}
          onClose={() => setOpenMiniGds(false)}
        />
      )}
      {openSppb && (
        <SPPBInteractiveModal
          initialData={sppbRawData as { piedsJoints10s?: boolean | null; semiTandem10s?: boolean | null; tandemSec?: string; gaitSec?: string; chairSec?: string; chairUnable?: boolean }}
          onValidate={(s) => {
            setSppbEquilibre(s.balance)
            setSppbVitesse(s.gait)
            setSppbLever(s.chair)
            setSppbRawData(s.data)
            setOpenSppb(false)
          }}
          onClose={() => setOpenSppb(false)}
        />
      )}
      {openTinetti && (
        <QuestionnaireModal
          title="Test de Tinetti (POMA)"
          subtitle="16 items · 9 équilibre + 7 marche · Score /28"
          questions={TINETTI_QUESTIONS}
          maxScore={28}
          interpretation={interpretTinetti}
          initialAnswers={tinettiAnswers}
          onValidate={(score, answers) => { setTinetti(String(score)); setTinettiAnswers(answers); setOpenTinetti(false) }}
          onClose={() => setOpenTinetti(false)}
        />
      )}
    </div>
  )
})

BilanGeriatrique.displayName = 'BilanGeriatrique'
