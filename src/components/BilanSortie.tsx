import { useState, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react'
import type { BilanHandle } from '../types'
import { DictableInput, DictableTextarea } from './VoiceMic'
import { SectionHeader, ScoreRow as SharedScoreRow, EVASlider } from './bilans/shared'
import { useQuestionnaires, type StoredResult } from './bilans/questionnaires/useQuestionnaires'
import { SPPBInteractiveModal } from './bilans/SPPBInteractiveModal'
import { QuestionnaireModal, TINETTI_QUESTIONS, interpretTinetti } from './bilans/QuestionnaireModal'
import { Chrono } from './bilans/Chrono'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BilanSortieHandle = BilanHandle

interface NoteData {
  eva: string; evolution: string; tolerance: string; interventions: string[]
  detailDosage?: string; prochaineEtape?: string[]; noteSubjective?: string
  observance?: string
}
interface NoteRecord { numSeance: string; dateSeance: string; data: NoteData }
interface SmartObj { titre: string; status: 'en_cours' | 'atteint' | 'non_atteint' }

interface BilanSortieProps {
  initialData?: Record<string, unknown>
  patientName: string
  zone: string
  initialBilanData?: {
    evn?: number
    scores?: Record<string, unknown>
    dateBilan?: string
    bilanData?: Record<string, unknown>
  }
  currentEvn?: number
  noteCount: number
  bilanCount?: number  // nombre de bilans (initiaux + intermédiaires) à compter comme séances
  prescribedSessions?: number
  /** All session notes for prefill */
  notes?: NoteRecord[]
  /** SMART objectives for this patient */
  smartObjectifs?: SmartObj[]
  /** Latest intermediate bilan data */
  lastIntermediaire?: Record<string, unknown>
  /** Callback to navigate to letter generator */
  onGenerateLetter?: (type: 'fin_pec' | 'fin_anticipee') => void
  /** Callback to generate synthese via AI */
  onGenerateSynthese?: () => void | Promise<void>
  /** Callback to generate recommandations via AI */
  onGenerateRecommandations?: () => void | Promise<void>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MOTIFS_SORTIE = [
  'Objectifs atteints',
  'Amélioration suffisante',
  'Prescription terminée',
  'Orientation spécialiste',
  'Abandon patient',
  'Autre',
] as const

const STATUTS_OBJECTIF = [
  'Atteint',
  'Partiellement atteint',
  'Non atteint',
] as const

type MotifSortie = (typeof MOTIFS_SORTIE)[number]
type StatutObjectif = (typeof STATUTS_OBJECTIF)[number]

interface ObjectifSMART {
  label: string
  statut: StatutObjectif | ''
  commentaire: string
}

interface ScoreComparison {
  name: string
  initial: string
  final: string
}

/** Map score key (from bilanData.scores) to questionnaire ID in configs.ts */
/** Map score key → questionnaire ID in configs.ts */
const SCORE_TO_QUESTIONNAIRE: Record<string, string> = {
  ndi: 'ndi', had: 'had', dn4: 'dn4', painDetect: 'painDetect', sensibilisation: 'csi',
  koos: 'koos', fakps: 'fakps', ikdc: 'ikdc', aclRsi: 'aclRsi', sf36: 'sf36',
  hoos: 'hoos', oxfordHip: 'oxfordHip', hagos: 'hoos', efmi: 'hoos',
  oss: 'oss', constantMurley: 'constant', dash: 'dash', rowe: 'rowe',
  faam: 'ffaam', cumberland: 'cait',
  startBack: 'startBack', orebro: 'orebro', fabq: 'fabq', eifel: 'eifel',
  // Gériatrique
  katzAdl: 'katzAdl', lawtonIadl: 'lawtonIadl', mnaSf: 'mnaSf', fried: 'fried',
}

/** Labels lisibles pour les score keys */
const SCORE_LABELS: Record<string, string> = {
  ndi: 'NDI', had: 'Échelle HAD', dn4: 'DN4', painDetect: 'Pain Detect', sensibilisation: 'Sensibilisation centrale (CSI)',
  koos: 'KOOS', fakps: 'F-AKPS', ikdc: 'IKDC', aclRsi: 'ACL-RSI', sf36: 'SF-36',
  hoos: 'HOOS', oxfordHip: 'Oxford Hip Score', hagos: 'HAGOS', efmi: 'EFMI',
  oss: 'OSS', constantMurley: 'Constant-Murley', dash: 'DASH', rowe: 'Rowe Score',
  faam: 'FAAM', cumberland: 'Cumberland',
  startBack: 'Start Back', orebro: 'Örebro', fabq: 'FABQ', eifel: 'EIFEL / Roland Morris',
  // Gériatrique
  katzAdl: 'Katz ADL', lawtonIadl: 'Lawton IADL', mnaSf: 'MNA-SF (Nutrition)', fried: 'Critères de Fried',
  tug: 'TUG (sec)', sppbTotal: 'SPPB Total (/12)', sppbEquilibre: 'SPPB Équilibre',
  sppbVitesse: 'SPPB Vitesse', sppbLever: 'SPPB Lever de chaise',
  tinetti: 'Tinetti (/28)', cinqLeverTime: '5 levers de chaise (sec)',
  fesI: 'FES-I (Peur de tomber)', miniGds: 'Mini GDS',
  doubleTache: 'Double tâche', equilibreUnipodal: 'Équilibre unipodal (sec)',
  vitesseMarche: 'Vitesse de marche (m/s)',
}

/** Score keys to exclude from display (internal data, not real scores) */
const EXCLUDED_SCORE_KEYS = new Set([
  'sppbRawData', 'tinettiAnswers', 'questionnaireAnswers', 'questionnaireResults',
  'autres', 'morpho', 'zones', 'mobiliteCervical',
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcImprovement(initial: number | undefined, final: number): number | null {
  if (initial == null || initial === 0) return null
  return Math.round(((initial - final) / initial) * 100)
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.88rem',
  color: 'var(--text-main)', background: 'var(--secondary)',
  border: '1px solid transparent', borderRadius: 'var(--radius-md)', marginBottom: 8,
  boxSizing: 'border-box',
}

const taStyle: React.CSSProperties = {
  ...inputStyle, resize: 'vertical', minHeight: 72, lineHeight: 1.5,
}

const lblStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600,
  color: 'var(--text-main)', marginBottom: 4,
}

// ─── Component ────────────────────────────────────────────────────────────────

export const BilanSortie = forwardRef<BilanSortieHandle, BilanSortieProps>(function BilanSortie(props, ref) {
  const {
    initialData, patientName, zone, initialBilanData, currentEvn,
    noteCount, bilanCount, prescribedSessions, notes, smartObjectifs, lastIntermediaire,
    onGenerateLetter, onGenerateSynthese, onGenerateRecommandations,
  } = props

  // ── Collapsible state ──────────────────────────────────────────────────────
  const [open, setOpen] = useState<Record<string, boolean>>({
    motifSortie: true,
    bilanComparatif: true,
  })
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  // ── Prefill helpers ────────────────────────────────────────────────────────
  const prefill = useMemo(() => {
    if (initialData) return null // already loaded from saved data
    const allNotes = notes ?? []
    const interventionsSet = new Set<string>()
    let lastEva = ''
    let lastEvolution = ''
    const toleranceIssues: string[] = []
    for (const n of allNotes) {
      for (const i of n.data.interventions) interventionsSet.add(i)
      if (n.data.eva) lastEva = n.data.eva
      if (n.data.evolution) lastEvolution = n.data.evolution
      if (n.data.tolerance && n.data.tolerance !== 'Bonne') toleranceIssues.push(`Séance ${n.numSeance}: ${n.data.tolerance}`)
    }

    // Résumé PEC
    const resumeLines: string[] = []
    const totalSeances = noteCount + (bilanCount ?? 0)
    resumeLines.push(`Prise en charge de ${totalSeances} séance${totalSeances > 1 ? 's' : ''}${prescribedSessions ? ` sur ${prescribedSessions} prescrites` : ''}.`)
    if (interventionsSet.size > 0) resumeLines.push(`Interventions : ${Array.from(interventionsSet).join(', ')}.`)
    if (initialBilanData?.dateBilan) resumeLines.push(`Bilan initial du ${initialBilanData.dateBilan}.`)

    // Résultats
    const resultLines: string[] = []
    if (initialBilanData?.evn != null && currentEvn != null) {
      const pct = Math.round(((initialBilanData.evn - currentEvn) / initialBilanData.evn) * 100)
      resultLines.push(`EVN : ${initialBilanData.evn}/10 → ${currentEvn}/10 (${pct > 0 ? '+' : ''}${pct}% d'amélioration).`)
    }
    if (lastEvolution) resultLines.push(`Dernière évolution constatée : ${lastEvolution}.`)

    // Facteurs limitants
    const limitLines: string[] = []
    if (toleranceIssues.length > 0) limitLines.push(`Problèmes de tolérance : ${toleranceIssues.join(' ; ')}.`)
    const lastNote = allNotes[allNotes.length - 1]
    if (lastNote?.data.observance && lastNote.data.observance !== 'Bonne') limitLines.push(`Observance : ${lastNote.data.observance}.`)

    // Exercices from contrat/conseils
    const contrat = (initialBilanData?.bilanData?.contratKine ?? initialBilanData?.bilanData?.contrat) as Record<string, unknown> | undefined
    const conseils = (initialBilanData?.bilanData?.conseils as string) ?? ''
    const exoText = String(contrat?.exercices ?? contrat?.autoExercices ?? '')

    // Scores from last intermediaire
    const lastScores = (lastIntermediaire?.moduleSpecifique as Record<string, unknown>)?.scores as Record<string, string> | undefined

    return {
      resumePEC: resumeLines.join('\n'),
      resultats: resultLines.join('\n'),
      limitants: limitLines.join('\n'),
      exercices: exoText,
      conseils,
      lastEva,
      lastScores,
    }
  }, [initialData, notes, noteCount, prescribedSessions, initialBilanData, currentEvn, lastIntermediaire])

  // ── Section 1: Motif de sortie ─────────────────────────────────────────────
  const [motif, setMotif] = useState<MotifSortie | ''>((initialData?.motif as MotifSortie) ?? '')
  const [motifDetails, setMotifDetails] = useState<string>((initialData?.motifDetails as string) ?? '')
  const [dateFin, setDateFin] = useState<string>((initialData?.dateFin as string) ?? new Date().toISOString().slice(0, 10))

  // ── Section 2: Bilan comparatif ────────────────────────────────────────────
  const [evnFinal, setEvnFinal] = useState<string>((initialData?.evnFinal as string) ?? (currentEvn != null ? String(currentEvn) : (prefill?.lastEva ?? '')))

  const initialScores = useMemo<ScoreComparison[]>(() => {
    if (initialData?.scores && Array.isArray(initialData.scores)) {
      return initialData.scores as ScoreComparison[]
    }
    const entries = initialBilanData?.scores
    if (!entries || typeof entries !== 'object') return []
    const lastScores = prefill?.lastScores ?? {}
    return Object.entries(entries)
      .filter(([name, val]) => !EXCLUDED_SCORE_KEYS.has(name) && val != null && String(val).trim() !== '' && typeof val !== 'object')
      .map(([name, val]) => ({
        name,
        initial: val != null ? String(val) : '',
        final: lastScores[`${name}Act`] ?? '',
      }))
  }, [initialData?.scores, initialBilanData?.scores, prefill?.lastScores])

  const [scores, setScores] = useState<ScoreComparison[]>(initialScores)

  const updateScore = useCallback((idx: number, field: 'final', value: string) => {
    setScores(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }, [])

  // Questionnaire interactif
  const updateScoreByKey = useCallback((key: string, value: string) => {
    setScores(prev => prev.map(s => s.name === key ? { ...s, final: value } : s))
  }, [])
  const [qAnswers, setQAnswers] = useState<Record<string, Record<string, unknown>>>(
    (initialData?.questionnaireAnswers as Record<string, Record<string, unknown>>) ?? {}
  )
  const [qResults, setQResults] = useState<Record<string, StoredResult>>(
    (initialData?.questionnaireResults as Record<string, StoredResult>) ?? {}
  )
  const questionnaires = useQuestionnaires(updateScoreByKey, qAnswers, setQAnswers, qResults, setQResults)

  // SPPB & Tinetti interactive modals
  const [openSppb, setOpenSppb] = useState(false)
  const [openTinetti, setOpenTinetti] = useState(false)
  const [sppbRawData, setSppbRawData] = useState<Record<string, unknown>>(
    (initialData?.sppbRawData as Record<string, unknown>) ?? {}
  )
  const [tinettiAnswers, setTinettiAnswers] = useState<Record<string, number>>(
    (initialData?.tinettiAnswers as Record<string, number>) ?? {}
  )

  const evnInitial = initialBilanData?.evn
  const evnFinalNum = evnFinal !== '' ? Number(evnFinal) : undefined
  const evnImprovement = evnFinalNum != null ? calcImprovement(evnInitial, evnFinalNum) : null

  // ── Section 3: Objectifs SMART ─────────────────────────────────────────────
  const [objectifs, setObjectifs] = useState<ObjectifSMART[]>(() => {
    if (initialData?.objectifs && Array.isArray(initialData.objectifs)) {
      return initialData.objectifs as ObjectifSMART[]
    }
    if (smartObjectifs && smartObjectifs.length > 0) {
      return smartObjectifs.map(o => ({
        label: o.titre,
        statut: (o.status === 'atteint' ? 'Atteint' : o.status === 'non_atteint' ? 'Non atteint' : '') as StatutObjectif | '',
        commentaire: '',
      }))
    }
    return [{ label: '', statut: '', commentaire: '' }]
  })

  const addObjectif = useCallback(() => {
    setObjectifs(prev => [...prev, { label: '', statut: '', commentaire: '' }])
  }, [])

  const removeObjectif = useCallback((idx: number) => {
    setObjectifs(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const updateObjectif = useCallback((idx: number, field: keyof ObjectifSMART, value: string) => {
    setObjectifs(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o))
  }, [])

  // ── Section 4: Synthese clinique ───────────────────────────────────────────
  const [resumePEC, setResumePEC] = useState<string>((initialData?.resumePEC as string) ?? '')
  const [resultatsObtenus, setResultatsObtenus] = useState<string>((initialData?.resultatsObtenus as string) ?? '')
  const [facteursLimitants, setFacteursLimitants] = useState<string>((initialData?.facteursLimitants as string) ?? '')

  // ── Section 5: Recommandations post-traitement ─────────────────────────────
  const [autoExercices, setAutoExercices] = useState<string>((initialData?.autoExercices as string) ?? '')
  const [precautions, setPrecautions] = useState<string>((initialData?.precautions as string) ?? '')
  const [suiviUlterieur, setSuiviUlterieur] = useState<boolean>((initialData?.suiviUlterieur as boolean) ?? false)
  const [suiviDetails, setSuiviDetails] = useState<string>((initialData?.suiviDetails as string) ?? '')
  const [infoMedecin, setInfoMedecin] = useState<string>((initialData?.infoMedecin as string) ?? '')

  const [generatingSynthese, setGeneratingSynthese] = useState(false)
  const [generatingRecommandations, setGeneratingRecommandations] = useState(false)

  const runGenerate = async (fn: (() => void | Promise<void>) | undefined, setLoading: (b: boolean) => void) => {
    if (!fn) return
    setLoading(true)
    try { await Promise.resolve(fn()) } finally { setLoading(false) }
  }

  // ── Handle ─────────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getData: () => ({
      motif,
      motifDetails,
      dateFin,
      evnFinal,
      scores,
      objectifs,
      resumePEC,
      resultatsObtenus,
      facteursLimitants,
      autoExercices,
      precautions,
      suiviUlterieur,
      suiviDetails,
      infoMedecin,
      questionnaireAnswers: qAnswers,
      questionnaireResults: qResults,
      sppbRawData,
      tinettiAnswers,
    }),
    setData: (d: Record<string, unknown>) => {
      if (d.motif != null) setMotif(d.motif as MotifSortie)
      if (d.motifDetails != null) setMotifDetails(d.motifDetails as string)
      if (d.dateFin != null) setDateFin(d.dateFin as string)
      if (d.evnFinal != null) setEvnFinal(d.evnFinal as string)
      if (d.scores != null && Array.isArray(d.scores)) setScores(d.scores as ScoreComparison[])
      if (d.objectifs != null && Array.isArray(d.objectifs)) setObjectifs(d.objectifs as ObjectifSMART[])
      if (d.resumePEC != null) setResumePEC(d.resumePEC as string)
      if (d.resultatsObtenus != null) setResultatsObtenus(d.resultatsObtenus as string)
      if (d.facteursLimitants != null) setFacteursLimitants(d.facteursLimitants as string)
      if (d.autoExercices != null) setAutoExercices(d.autoExercices as string)
      if (d.precautions != null) setPrecautions(d.precautions as string)
      if (d.suiviUlterieur != null) setSuiviUlterieur(d.suiviUlterieur as boolean)
      if (d.suiviDetails != null) setSuiviDetails(d.suiviDetails as string)
      if (d.infoMedecin != null) setInfoMedecin(d.infoMedecin as string)
    },
  }))

  // ── Render ─────────────────────────────────────────────────────────────────
  const needsDetails = motif === 'Autre' || motif === 'Orientation spécialiste'

  const sections = [
    { id: 'motifSortie',      title: 'Motif de sortie',     color: 'var(--primary)' },
    { id: 'bilanComparatif',  title: 'Bilan comparatif',    color: '#ea580c' },
    { id: 'objectifsSmart',   title: 'Objectifs SMART',     color: '#7c3aed' },
    { id: 'syntheseClinique', title: 'Synthèse clinique',   color: '#059669' },
    { id: 'recommandations',  title: 'Recommandations',     color: '#b45309' },
  ]

  return (
    <div>
      {/* Header summary */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
        borderRadius: 'var(--radius-lg)', padding: '0.85rem 1rem', marginBottom: 12, color: 'white',
      }}>
        <div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: 2 }}>Bilan de sortie</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{patientName}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 8px' }}>
            {zone}
          </span>
          <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 8px' }}>
            {noteCount + (bilanCount ?? 0)} séance{(noteCount + (bilanCount ?? 0)) > 1 ? 's' : ''}
          </span>
          {prescribedSessions != null && (
            <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 8px' }}>
              {prescribedSessions} prescrites
            </span>
          )}
          {initialBilanData?.dateBilan && (
            <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 8px' }}>
              Depuis le {initialBilanData.dateBilan}
            </span>
          )}
        </div>
      </div>

      {/* ── Collapsible sections ──────────────────────────────────────────── */}
      {sections.map(sec => (
        <div key={sec.id} style={{ marginBottom: 4 }}>
          <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} color={sec.color} />
          {open[sec.id] && (
            <div style={{ paddingTop: 12, paddingBottom: 8 }}>

              {/* ── MOTIF DE SORTIE ──────────────────────────────── */}
              {sec.id === 'motifSortie' && (
                <>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>Motif</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {MOTIFS_SORTIE.map(m => (
                        <button
                          key={m}
                          className={`choix-btn${motif === m ? ' active' : ''}`}
                          onClick={() => setMotif(motif === m ? '' : m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {needsDetails && (
                    <div style={{ marginBottom: 10 }}>
                      <label style={lblStyle}>{motif === 'Orientation spécialiste' ? 'Orientation vers' : 'Préciser'}</label>
                      <DictableInput
                        value={motifDetails}
                        onChange={e => setMotifDetails(e.target.value)}
                        placeholder={motif === 'Orientation spécialiste' ? 'Ex: Chirurgien orthopédique, neurologue...' : 'Préciser le motif...'}
                        inputStyle={inputStyle}
                      />
                    </div>
                  )}

                  <label style={lblStyle}>Date de fin de prise en charge</label>
                  <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} style={{ ...inputStyle, maxWidth: 200 }} />
                </>
              )}

              {/* ── BILAN COMPARATIF ─────────────────────────────── */}
              {sec.id === 'bilanComparatif' && (
                <>
                  {/* EVA row */}
                  <div style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--secondary)', borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EVA — Initial vs Final</span>
                      {evnImprovement !== null && (
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: evnImprovement > 0 ? '#dcfce7' : evnImprovement < 0 ? '#fef2f2' : '#f1f5f9',
                          color: evnImprovement > 0 ? '#166534' : evnImprovement < 0 ? '#991b1b' : '#64748b',
                        }}>
                          {evnImprovement > 0 ? '+' : ''}{evnImprovement}%
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: 56 }}>INITIAL</span>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                        {evnInitial != null ? evnInitial : '—'}<span style={{ fontSize: '0.65em', fontWeight: 600, color: 'var(--text-muted)', marginLeft: 2 }}>/10</span>
                      </span>
                    </div>
                    <EVASlider label="FINAL" value={evnFinal} onChange={setEvnFinal} compact />
                  </div>

                  {/* Score comparisons with interactive questionnaires */}
                  {scores.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Scores fonctionnels (final)
                      </div>
                      {scores.filter(sc => !['sppbEquilibre', 'sppbVitesse', 'sppbLever'].includes(sc.name)).map((sc, idx) => {
                        const qId = SCORE_TO_QUESTIONNAIRE[sc.name]
                        const isSppb = sc.name === 'sppbTotal'
                        const isTinetti = sc.name === 'tinetti'
                        const isChrono = sc.name === 'tug' || sc.name === 'cinqLeverTime'
                        const isDoubleTache = sc.name === 'doubleTache'
                        const result = qId ? questionnaires.getResult(sc.name, qId) : undefined
                        const tinettiResult = isTinetti && sc.final ? interpretTinetti(Number(sc.final)) : undefined
                        const realIdx = scores.indexOf(sc)

                        // Chrono-based scores (TUG, 5 levers)
                        if (isChrono) return (
                          <div key={idx} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 8, marginBottom: 6 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>{SCORE_LABELS[sc.name] ?? sc.name}</div>
                            <Chrono value={sc.final} onChange={v => updateScore(realIdx, 'final', v)} compact />
                            {sc.initial && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                Initial : {sc.initial}s
                                {sc.final && Number(sc.initial) !== 0 && (() => {
                                  const delta = Math.round(((Number(sc.initial) - Number(sc.final)) / Number(sc.initial)) * 100)
                                  const color = delta > 0 ? '#166534' : delta < 0 ? '#881337' : '#64748b'
                                  return <span style={{ fontWeight: 700, color, marginLeft: 6 }}>({delta > 0 ? '+' : ''}{delta}%)</span>
                                })()}
                              </div>
                            )}
                          </div>
                        )

                        // Double tâche (Oui/Non)
                        if (isDoubleTache) return (
                          <div key={idx} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 8, marginBottom: 6 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>Double tâche</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6 }}>Le patient s'arrête de marcher pour parler ?</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button className={`choix-btn${sc.final === 'oui' ? ' active' : ''}`} onClick={() => updateScore(realIdx, 'final', sc.final === 'oui' ? '' : 'oui')} style={sc.final === 'oui' ? { background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' } : undefined}>Oui — haut risque</button>
                              <button className={`choix-btn${sc.final === 'non' ? ' active' : ''}`} onClick={() => updateScore(realIdx, 'final', sc.final === 'non' ? '' : 'non')}>Non</button>
                            </div>
                            {sc.initial && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>Initial : {sc.initial}</div>}
                          </div>
                        )

                        // Standard score row
                        return (
                          <div key={idx}>
                            <SharedScoreRow
                              label={SCORE_LABELS[sc.name] ?? sc.name}
                              value={sc.final}
                              onChange={v => updateScore(realIdx, 'final', v)}
                              onOpenQuestionnaire={
                                isSppb ? () => setOpenSppb(true) :
                                isTinetti ? () => setOpenTinetti(true) :
                                qId ? () => questionnaires.open(qId, sc.name) : undefined
                              }
                              result={isTinetti && tinettiResult ? { display: `${sc.final} / 28`, interpretation: tinettiResult.label, color: tinettiResult.color as 'green' | 'orange' | 'red' } : result}
                            />
                            {sc.initial && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', paddingLeft: 2, marginTop: -2, marginBottom: 6 }}>
                                Initial : {sc.initial}
                                {sc.final && sc.initial && Number(sc.initial) !== 0 && (() => {
                                  const delta = Math.round(((Number(sc.final) - Number(sc.initial)) / Math.abs(Number(sc.initial))) * 100)
                                  const color = delta > 0 ? '#166534' : delta < 0 ? '#881337' : '#64748b'
                                  return <span style={{ fontWeight: 700, color, marginLeft: 6 }}>({delta > 0 ? '+' : ''}{delta}%)</span>
                                })()}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {/* ── OBJECTIFS SMART ──────────────────────────────── */}
              {sec.id === 'objectifsSmart' && (
                <>
                  {objectifs.map((obj, idx) => (
                    <div key={idx} style={{
                      border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                      padding: '0.75rem', marginBottom: 8, background: 'var(--secondary)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                          color: 'white', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', flexShrink: 0,
                        }}>{idx + 1}</span>
                        <DictableInput
                          value={obj.label}
                          onChange={e => updateObjectif(idx, 'label', e.target.value)}
                          placeholder="Décrire l'objectif..."
                          inputStyle={{ ...inputStyle, border: 'none', borderBottom: '1px solid var(--border-color)', borderRadius: 0, padding: '0.3rem 0.4rem', flex: 1, marginBottom: 0 }}
                        />
                        {objectifs.length > 1 && (
                          <button
                            onClick={() => removeObjectif(idx)}
                            style={{
                              width: 24, height: 24, borderRadius: '50%', border: '1px solid #fca5a5',
                              background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem', fontWeight: 700,
                            }}
                            aria-label="Supprimer l'objectif"
                          >
                            &times;
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                        {STATUTS_OBJECTIF.map(s => {
                          const active = obj.statut === s
                          const colorMap: Record<StatutObjectif, { bg: string; border: string; text: string }> = {
                            'Atteint': { bg: '#dcfce7', border: '#86efac', text: '#166534' },
                            'Partiellement atteint': { bg: '#fff7ed', border: '#fed7aa', text: '#92400e' },
                            'Non atteint': { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
                          }
                          const c = colorMap[s]
                          return (
                            <button
                              key={s}
                              className={`choix-btn${active ? ' active' : ''}`}
                              onClick={() => updateObjectif(idx, 'statut', obj.statut === s ? '' : s)}
                              style={{
                                border: `1.5px solid ${active ? c.border : 'var(--border-color)'}`,
                                background: active ? c.bg : 'transparent',
                                color: active ? c.text : 'var(--text-muted)',
                              }}
                            >
                              {s}
                            </button>
                          )
                        })}
                      </div>

                      <DictableTextarea
                        value={obj.commentaire}
                        onChange={e => updateObjectif(idx, 'commentaire', e.target.value)}
                        placeholder="Commentaire sur l'objectif..."
                        rows={2}
                        textareaStyle={{ ...taStyle, minHeight: 48, fontSize: '0.8rem', marginBottom: 0 }}
                      />
                    </div>
                  ))}

                  {objectifs.length < 5 && (
                    <button
                      onClick={addObjectif}
                      style={{
                        width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)',
                        border: '1.5px dashed var(--border-color)', background: 'transparent',
                        color: '#7c3aed', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Ajouter un objectif
                    </button>
                  )}
                </>
              )}

              {/* ── SYNTHESE CLINIQUE ────────────────────────────── */}
              {sec.id === 'syntheseClinique' && (
                <>
                  <label style={lblStyle}>Résumé de la prise en charge</label>
                  <DictableTextarea
                    value={resumePEC}
                    onChange={e => setResumePEC(e.target.value)}
                    placeholder="Techniques utilisées, fréquence, progression..."
                    rows={3}
                    textareaStyle={taStyle}
                  />

                  <label style={lblStyle}>Résultats obtenus</label>
                  <DictableTextarea
                    value={resultatsObtenus}
                    onChange={e => setResultatsObtenus(e.target.value)}
                    placeholder="Gains fonctionnels, amélioration douleur, autonomie..."
                    rows={3}
                    textareaStyle={taStyle}
                  />

                  <label style={lblStyle}>Facteurs limitants rencontrés</label>
                  <DictableTextarea
                    value={facteursLimitants}
                    onChange={e => setFacteursLimitants(e.target.value)}
                    placeholder="Compliance, comorbidités, facteurs psychosociaux..."
                    rows={2}
                    textareaStyle={taStyle}
                  />

                  {onGenerateSynthese && (
                    <button
                      onClick={() => runGenerate(onGenerateSynthese, setGeneratingSynthese)}
                      disabled={generatingSynthese}
                      style={{
                        marginTop: 4, padding: '0.55rem 1rem', borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #059669, #047857)', border: 'none',
                        color: 'white', fontWeight: 700, fontSize: '0.78rem',
                        cursor: generatingSynthese ? 'not-allowed' : 'pointer',
                        opacity: generatingSynthese ? 0.75 : 1,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {generatingSynthese && (
                        <span style={{ width: 12, height: 12, border: '1.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                      )}
                      {generatingSynthese ? 'Génération…' : 'Créer la synthèse clinique'}
                    </button>
                  )}
                </>
              )}

              {/* ── RECOMMANDATIONS ──────────────────────────────── */}
              {sec.id === 'recommandations' && (
                <>
                  <label style={lblStyle}>Auto-exercices à poursuivre</label>
                  <DictableTextarea
                    value={autoExercices}
                    onChange={e => setAutoExercices(e.target.value)}
                    placeholder="Exercices à réaliser en autonomie, fréquence, durée..."
                    rows={3}
                    textareaStyle={taStyle}
                  />

                  <label style={lblStyle}>Précautions et conseils</label>
                  <DictableTextarea
                    value={precautions}
                    onChange={e => setPrecautions(e.target.value)}
                    placeholder="Activités à éviter, ergonomie, reprise sportive..."
                    rows={2}
                    textareaStyle={taStyle}
                  />

                  {/* Suivi ultérieur */}
                  <div style={{
                    padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${suiviUlterieur ? '#fde68a' : 'var(--border-color)'}`,
                    background: suiviUlterieur ? '#fffbeb' : 'var(--secondary)', marginBottom: 10,
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={suiviUlterieur}
                        onChange={e => setSuiviUlterieur(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        Nécessité d'un suivi ultérieur
                      </span>
                    </label>
                    {suiviUlterieur && (
                      <DictableTextarea
                        value={suiviDetails}
                        onChange={e => setSuiviDetails(e.target.value)}
                        placeholder="Motif du suivi, délai, fréquence suggérée..."
                        rows={2}
                        textareaStyle={{ ...taStyle, marginTop: 8, fontSize: '0.82rem' }}
                      />
                    )}
                  </div>

                  <label style={lblStyle}>Informations pour le médecin prescripteur</label>
                  <DictableTextarea
                    value={infoMedecin}
                    onChange={e => setInfoMedecin(e.target.value)}
                    placeholder="Éléments importants pour le compte-rendu au médecin..."
                    rows={3}
                    textareaStyle={taStyle}
                  />

                  {onGenerateRecommandations && (
                    <button
                      onClick={() => runGenerate(onGenerateRecommandations, setGeneratingRecommandations)}
                      disabled={generatingRecommandations}
                      style={{
                        marginTop: 4, padding: '0.55rem 1rem', borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #b45309, #92400e)', border: 'none',
                        color: 'white', fontWeight: 700, fontSize: '0.78rem',
                        cursor: generatingRecommandations ? 'not-allowed' : 'pointer',
                        opacity: generatingRecommandations ? 0.75 : 1,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {generatingRecommandations && (
                        <span style={{ width: 12, height: 12, border: '1.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                      )}
                      {generatingRecommandations ? 'Génération…' : 'Créer les recommandations'}
                    </button>
                  )}
                </>
              )}

            </div>
          )}
        </div>
      ))}

      {/* ── Section 6: Courrier (always visible, not collapsible) ─────────── */}
      {onGenerateLetter && (
        <div style={{ marginBottom: 14, marginTop: 8 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block', marginRight: 6 }} />
            Courrier
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--primary)', margin: '0 0 10px', lineHeight: 1.5 }}>
            Les informations de ce bilan de sortie seront reprises automatiquement dans le courrier.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => onGenerateLetter('fin_pec')}
              style={{ flex: 1, padding: '0.6rem 0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Courrier fin de PEC
            </button>
            <button type="button" onClick={() => onGenerateLetter('fin_anticipee')}
              style={{ flex: 1, padding: '0.6rem 0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1.5px solid var(--border-soft)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Fin anticipée
            </button>
          </div>
        </div>
      )}

      {/* Questionnaire modal */}
      {questionnaires.modal}

      {/* SPPB Interactive Modal */}
      {openSppb && (
        <SPPBInteractiveModal
          initialData={sppbRawData}
          onClose={() => setOpenSppb(false)}
          onValidate={(data: { balance: string; gait: string; chair: string; data: Record<string, unknown> }) => {
            setSppbRawData(data.data)
            const eq = data.balance
            const vit = data.gait
            const lev = data.chair
            const total = (Number(eq) || 0) + (Number(vit) || 0) + (Number(lev) || 0)
            // Update scores
            setScores(prev => prev.map(s => {
              if (s.name === 'sppbTotal') return { ...s, final: String(total) }
              if (s.name === 'sppbEquilibre') return { ...s, final: eq }
              if (s.name === 'sppbVitesse') return { ...s, final: vit }
              if (s.name === 'sppbLever') return { ...s, final: lev }
              return s
            }))
            setOpenSppb(false)
          }}
        />
      )}

      {/* Tinetti Interactive Modal */}
      {openTinetti && (
        <QuestionnaireModal
          title="Tinetti"
          questions={TINETTI_QUESTIONS}
          maxScore={28}
          interpretation={interpretTinetti}
          initialAnswers={tinettiAnswers}
          onClose={() => setOpenTinetti(false)}
          onValidate={(score: number, answers: Record<string, number>) => {
            setTinettiAnswers(answers)
            setScores(prev => prev.map(s => s.name === 'tinetti' ? { ...s, final: String(score) } : s))
            setOpenTinetti(false)
          }}
        />
      )}
    </div>
  )
})
