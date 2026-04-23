import { useState, useImperativeHandle, forwardRef } from 'react'
import type { BilanMode, NarrativeReport } from '../../types'
import { BilanVocalMode } from './BilanVocalMode'
import { DictableInput, DictableTextarea } from '../VoiceMic'
import { SectionHeader, ScoreRow, BilanModeToggle } from './shared'
import { useQuestionnaires } from './questionnaires/useQuestionnaires'
import {
  DouleurSection, RedFlagsSection, YellowFlagsSection, BlueBlackFlagsSection,
  ContratKineSection, ConseilsSection, PSFSCards,
  mergeDouleur,
  initRedFlags,
  mergeYellow,
  mergeBlueBlack,
  mergeContrat,
  emptyPsfs, mergePsfs,
  inputStyle, lblStyle, sectionTitleStyle,
  type DouleurState, type RedFlagsState, type YellowFlagsState, type BlueBlackState,
  type ContratState, type PsfsItem,
} from './bilanSections'

export interface BilanGeneriqueHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

export const BilanGenerique = forwardRef<BilanGeneriqueHandle, { initialData?: Record<string, unknown> }>(({ initialData }, ref) => {
  const init = initialData ?? {}

  const [mode, setMode] = useState<BilanMode>('noyau')
  const coreMode = mode === 'noyau'
  const [vocalReport, setVocalReport] = useState<NarrativeReport | null>(null)

  // ── Sections partagées V2 ────────────────────────────────────────────────
  const [douleur, setDouleur]   = useState<DouleurState>(()   => mergeDouleur((init.douleur as Record<string, unknown>) ?? {}))
  const [redFlags, setRedFlags] = useState<RedFlagsState>(()  => initRedFlags(init.redFlags as Record<string, unknown> | undefined))
  const [yellow, setYellow]     = useState<YellowFlagsState>(() => mergeYellow((init.yellowFlags as Record<string, unknown>) ?? {}))
  const [blueBlack, setBlueBlack] = useState<BlueBlackState>(() => mergeBlueBlack((init.blueBlackFlags as Record<string, unknown>) ?? {}))
  const [contrat, setContrat]   = useState<ContratState>(()   => mergeContrat((init.contrat as Record<string, unknown>) ?? {}))
  const [psfs, setPsfs]         = useState<PsfsItem[]>(()     => mergePsfs((init.psfs as unknown) ?? emptyPsfs()))

  // ── Examen clinique libre ────────────────────────────────────────────────
  const _ec = (init.examClinique as Record<string, unknown>) ?? {}
  const [zoneConcernee, setZoneConcernee] = useState((_ec.zoneConcernee as string) ?? '')
  const [observation, setObservation] = useState((_ec.observation as string) ?? '')
  const [palpation, setPalpation] = useState((_ec.palpation as string) ?? '')
  const [mobiliteNotes, setMobiliteNotes] = useState((_ec.mobiliteNotes as string) ?? '')
  const [forceNotes, setForceNotes] = useState((_ec.forceNotes as string) ?? '')

  // ── Tests cliniques libres ───────────────────────────────────────────────
  const _t = (init.testsSpecifiques as Record<string, unknown>) ?? {}
  const [testsNotes, setTestsNotes] = useState((_t.notes as string) ?? '')

  // ── Scores ── chacun avec son questionnaire interactif si dispo ──────────
  const _sc = (init.scores as Record<string, unknown>) ?? {}
  const [scores, setScores] = useState<Record<string, string>>({
    had: '', dn4: '', painDetect: '', sensibilisation: '', sf36: '', autres: '',
    ...((_sc as Record<string, string>) ?? {}),
  })
  const updScore = (k: string, v: string) => setScores(p => ({ ...p, [k]: v }))

  // ── Conseils ─────────────────────────────────────────────────────────────
  const [conseils, setConseils] = useState((init.conseils as { recos?: string })?.recos ?? '')

  // ── Questionnaires interactifs (HAD, DN4, etc.) ──────────────────────────
  const [qAnswers, setQAnswers] = useState<Record<string, Record<string, unknown>>>(
    (init.questionnaireAnswers as Record<string, Record<string, unknown>>) ?? {}
  )
  const [qResults, setQResults] = useState<Record<string, import('./questionnaires/useQuestionnaires').StoredResult>>(
    (init.questionnaireResults as Record<string, import('./questionnaires/useQuestionnaires').StoredResult>) ?? {}
  )
  const questionnaires = useQuestionnaires(updScore, qAnswers, setQAnswers, qResults, setQResults)

  // ── Sections collapsibles ────────────────────────────────────────────────
  const [open, setOpen] = useState<Record<string, boolean>>({ intro: true, douleur: true })
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  useImperativeHandle(ref, () => ({
    getData: () => ({
      douleur, redFlags, yellowFlags: yellow, blueBlackFlags: blueBlack,
      examClinique: { zoneConcernee, observation, palpation, mobiliteNotes, forceNotes },
      testsSpecifiques: { notes: testsNotes },
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
      if (ec.zoneConcernee !== undefined) setZoneConcernee(ec.zoneConcernee as string)
      if (ec.observation !== undefined)   setObservation(ec.observation as string)
      if (ec.palpation !== undefined)     setPalpation(ec.palpation as string)
      if (ec.mobiliteNotes !== undefined) setMobiliteNotes(ec.mobiliteNotes as string)
      if (ec.forceNotes !== undefined)    setForceNotes(ec.forceNotes as string)
      const t = (d.testsSpecifiques as Record<string, unknown>) ?? {}
      if (t.notes !== undefined) setTestsNotes(t.notes as string)
      if (d.scores) setScores(p => ({ ...p, ...(d.scores as Record<string, string>) }))
      const cn = (d.conseils as Record<string, unknown>) ?? {}
      if (cn.recos !== undefined) setConseils(cn.recos as string)
      if (d.questionnaireAnswers) setQAnswers(d.questionnaireAnswers as Record<string, Record<string, unknown>>)
      if (d.questionnaireResults) setQResults(d.questionnaireResults as Record<string, import('./questionnaires/useQuestionnaires').StoredResult>)
    },
  }))

  // Bilan générique : déjà court (~17 champs). Noyau EBP minimal.
  type Priority = 'noyau' | 'approfondissement'
  const allSections: { id: string; title: string; color: string; priority: Priority }[] = [
    { id: 'douleur',        title: 'Douleur',                          color: '#1A1A1A', priority: 'noyau' },
    { id: 'redFlags',       title: 'Red Flags 🚩',                      color: '#991b1b',        priority: 'noyau' },
    { id: 'yellowFlags',    title: 'Yellow Flags 🟡',                   color: '#d97706',        priority: 'noyau' },
    { id: 'blueBlackFlags', title: 'Blue / Black Flags',                color: '#7c3aed',        priority: 'approfondissement' },
    { id: 'examClinique',   title: 'Examen clinique',                   color: '#1A1A1A', priority: 'noyau' },
    { id: 'testsSpec',      title: 'Tests cliniques',                   color: '#1A1A1A', priority: 'noyau' },
    { id: 'scores',         title: 'Scores fonctionnels',               color: '#1A1A1A', priority: 'noyau' },
    { id: 'contrat',        title: 'Contrat kiné',                      color: '#059669',        priority: 'noyau' },
    { id: 'conseils',       title: 'Conseils & recommandations',        color: '#059669',        priority: 'noyau' },
  ]
  const sections = coreMode ? allSections.filter(s => s.priority === 'noyau') : allSections

  return (
    <div>
      {/* Bandeau d'intro */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <p style={{ fontSize: '0.82rem', color: '#1d4ed8', margin: 0, fontWeight: 600 }}>
          Bilan générique — Zone non spécialisée
        </p>
        <p style={{ fontSize: '0.78rem', color: '#3b82f6', margin: '4px 0 0', lineHeight: 1.5 }}>
          Structure complète V2 (douleur, flags, examen, tests, scores). Utilisez les champs libres pour les zones non couvertes par les bilans spécialisés (sacro-iliaque, costale, ATM, périnée, main, poignet…).
        </p>
      </div>

      <BilanModeToggle mode={mode} onChange={setMode} />
      {mode === 'vocal' && <BilanVocalMode zone="Générique" initialReport={vocalReport} onChange={setVocalReport} />}
      {mode !== 'vocal' && sections.map(sec => (
        <div key={sec.id} style={{ marginBottom: 4 }}>
          <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} color={sec.color} badge={sec.priority === 'approfondissement' ? 'approfondissement' : undefined} />
          {open[sec.id] && (
            <div style={{ paddingTop: 12, paddingBottom: 8 }}>

              {sec.id === 'douleur' && (
                <DouleurSection state={douleur} onChange={p => setDouleur(s => ({ ...s, ...p }))} options={{ hasFacteurDeclenchant: true, hasMecanismeLesionnel: true }} coreMode={coreMode} />
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
                  <label style={lblStyle}>Zone concernée (précision)</label>
                  <DictableInput value={zoneConcernee} onChange={e => setZoneConcernee(e.target.value)} placeholder="Ex : Sacro-iliaque droite, ATM gauche, poignet droit…" inputStyle={inputStyle} />

                  <p style={sectionTitleStyle}>Observation</p>
                  <DictableTextarea value={observation} onChange={e => setObservation(e.target.value)} rows={3} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Morphostatique, posture, déformations, œdème, rougeur, asymétries…" />

                  <p style={sectionTitleStyle}>Palpation</p>
                  <DictableTextarea value={palpation} onChange={e => setPalpation(e.target.value)} rows={3} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Points douloureux, tonus, trophicité, chaleur locale…" />

                  <p style={sectionTitleStyle}>Mobilité</p>
                  <DictableTextarea value={mobiliteNotes} onChange={e => setMobiliteNotes(e.target.value)} rows={3} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Mobilités actives / passives, amplitudes, end-feel…" />

                  <p style={sectionTitleStyle}>Force / déficit moteur</p>
                  <DictableTextarea value={forceNotes} onChange={e => setForceNotes(e.target.value)} rows={3} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Testing musculaire MRC, déficits par groupes…" />
                </>
              )}

              {sec.id === 'testsSpec' && (
                <>
                  <label style={lblStyle}>Tests cliniques effectués et résultats</label>
                  <DictableTextarea value={testsNotes} onChange={e => setTestsNotes(e.target.value)} rows={5} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Listez les tests réalisés et leurs résultats (positif / négatif / reproduction des symptômes…)" />
                </>
              )}

              {sec.id === 'scores' && (
                <>
                  {/* Noyau : PSFS seul. HAD, DN4, PainDetect, CSI, SF-36 → approfondissement. */}
                  {!coreMode && ([
                    ['had',             'HAD — Anxiété / Dépression',           'had'],
                    ['dn4',             'DN4 — Douleur neuropathique',          'dn4'],
                    ['painDetect',      'Pain DETECT',                          'painDetect'],
                    ['sensibilisation', 'Sensibilisation centrale (CSI)',       'csi'],
                    ['sf36',            'SF-36 — Qualité de vie',               'sf36'],
                  ] as [string, string, string][]).map(([k, lbl, qId]) => (
                    <ScoreRow key={k} label={lbl} value={scores[k] ?? ''} onChange={v => updScore(k, v)}
                      onOpenQuestionnaire={() => questionnaires.open(qId, k)}
                      result={questionnaires.getResult(k, qId)} />
                  ))}

                  <PSFSCards items={psfs} onChange={setPsfs} />

                  {!coreMode && (
                    <>
                      <label style={{ ...lblStyle, marginTop: 8 }}>Autres scores</label>
                      <DictableTextarea value={scores.autres ?? ''} onChange={e => updScore('autres', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Nom du score et résultat…" />
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

BilanGenerique.displayName = 'BilanGenerique'
