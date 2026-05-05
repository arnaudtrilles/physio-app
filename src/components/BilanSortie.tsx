import { useState, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react'
import type { BilanHandle } from '../types'
import { DictableInput, DictableTextarea } from './VoiceMic'
import { SectionHeader, ScoreRow as SharedScoreRow, EVASlider } from './bilans/shared'
import { useQuestionnaires, type StoredResult } from './bilans/questionnaires/useQuestionnaires'
import { SPPBInteractiveModal } from './bilans/SPPBInteractiveModal'
import { QuestionnaireModal, TINETTI_QUESTIONS, interpretTinetti } from './bilans/QuestionnaireModal'
import { Chrono } from './bilans/Chrono'
import { ConfectionButton } from './letters/ConfectionButton'
import { NoyauTestsFinal } from './bilans/NoyauTestsFinal'
import { getBilanType } from '../utils/bilanRouter'

type SyntheseField = 'resumePEC' | 'resultatsObtenus' | 'facteursLimitants'

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
  /** Callback to generate one synthèse field via AI — returns generated text */
  onGenerateSyntheseField?: (field: SyntheseField) => Promise<string>
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

/** Whitelist : seules les clés présentes dans SCORE_LABELS sont affichées dans
 *  la grille "Scores fonctionnels (final)". Évite que les clés de tests
 *  spécifiques (clusterLaslett, ta, proneInstability…) splatées dans
 *  bilanData.scores via App.tsx ne polluent la grille. */
const KNOWN_SCORE_KEYS = new Set<string>(Object.keys(SCORE_LABELS))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcImprovement(initial: number | undefined, final: number): number | null {
  if (initial == null || initial === 0) return null
  return Math.round(((initial - final) / initial) * 100)
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.88rem',
  color: 'var(--text-main)', background: 'var(--input-bg)',
  border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', marginBottom: 8,
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
    onGenerateLetter, onGenerateSyntheseField,
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
      .filter(([name, val]) => KNOWN_SCORE_KEYS.has(name) && val != null && String(val).trim() !== '' && typeof val !== 'object')
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

  // ── Tests spécifiques (final) — alignés sur le noyau EBP de la zone ───────
  const bilanType = useMemo(() => getBilanType(zone), [zone])
  const initialTests = useMemo<Record<string, string>>(() => {
    const raw = initialBilanData?.bilanData?.testsSpecifiques as Record<string, unknown> | undefined
    if (!raw) return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'string') out[k] = v
    }
    return out
  }, [initialBilanData?.bilanData])

  const [tests, setTests] = useState<Record<string, string>>(
    (initialData?.tests as Record<string, string>) ?? {}
  )
  const setT = useCallback((k: string, v: string) => {
    setTests(prev => ({ ...prev, [k]: v }))
  }, [])

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

  const [busySynthese, setBusySynthese] = useState<Record<SyntheseField, boolean>>({
    resumePEC: false, resultatsObtenus: false, facteursLimitants: false,
  })

  const runSyntheseField = async (
    field: SyntheseField,
    setter: (v: string) => void,
  ) => {
    if (!onGenerateSyntheseField) return
    setBusySynthese(p => ({ ...p, [field]: true }))
    try {
      const text = await onGenerateSyntheseField(field)
      if (text) setter(text)
    } finally {
      setBusySynthese(p => ({ ...p, [field]: false }))
    }
  }

  // ── Handle ─────────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getData: () => ({
      motif,
      motifDetails,
      dateFin,
      evnFinal,
      scores,
      tests,
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
      if (d.tests != null && typeof d.tests === 'object') setTests(d.tests as Record<string, string>)
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
    { id: 'motifSortie',      title: 'Motif de sortie' },
    { id: 'bilanComparatif',  title: 'Bilan comparatif' },
    { id: 'objectifsSmart',   title: 'Objectifs SMART' },
    { id: 'syntheseClinique', title: 'Synthèse clinique' },
    { id: 'recommandations',  title: 'Recommandations' },
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
          <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} />
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

                  {/* Tests spécifiques noyau EBP — alignés sur le bilan initial */}
                  {(() => {
                    const noyauZones = ['lombaire', 'epaule', 'genou', 'hanche', 'cervical', 'cheville'] as const
                    if (!noyauZones.includes(bilanType as typeof noyauZones[number])) return null
                    const hasInitial = Object.keys(initialTests).length > 0
                    return (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Tests spécifiques (final)
                        </div>
                        <NoyauTestsFinal
                          bilanType={bilanType}
                          tests={tests}
                          setT={setT}
                          initialTests={hasInitial ? initialTests : undefined}
                        />
                      </div>
                    )
                  })()}
                </>
              )}

              {/* ── OBJECTIFS SMART ──────────────────────────────── */}
              {sec.id === 'objectifsSmart' && (
                <>
                  {objectifs.map((obj, idx) => {
                    const statusStyle: Record<StatutObjectif, { activeBg: string; activeShadow: string }> = {
                      'Atteint':                { activeBg: '#166534', activeShadow: '0 1px 3px rgba(22,101,52,0.25)' },
                      'Partiellement atteint':  { activeBg: '#b45309', activeShadow: '0 1px 3px rgba(180,83,9,0.25)' },
                      'Non atteint':            { activeBg: '#881337', activeShadow: '0 1px 3px rgba(136,19,55,0.25)' },
                    }
                    return (
                      <div key={idx} style={{
                        background: 'var(--input-bg)', border: '1px solid var(--border-color)',
                        borderRadius: 12, padding: '0.75rem', marginBottom: 8,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <DictableInput
                              value={obj.label}
                              onChange={e => updateObjectif(idx, 'label', e.target.value)}
                              placeholder="Titre de l'objectif (ex: Récupérer la flexion complète)"
                              inputStyle={{
                                width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem',
                                border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)',
                                boxSizing: 'border-box', color: 'var(--text-main)', background: 'var(--input-bg)',
                                marginBottom: 0,
                              }}
                            />
                          </div>
                          {objectifs.length > 1 && (
                            <button
                              onClick={() => removeObjectif(idx)}
                              style={{
                                padding: '0.4rem 0.55rem', borderRadius: 8,
                                border: '1px solid var(--border-color)', background: 'var(--surface)',
                                color: 'var(--text-muted)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}
                              aria-label="Supprimer l'objectif"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              </svg>
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          {STATUTS_OBJECTIF.map(s => {
                            const active = obj.statut === s
                            const c = statusStyle[s]
                            return (
                              <button
                                key={s}
                                onClick={() => updateObjectif(idx, 'statut', obj.statut === s ? '' : s)}
                                style={{
                                  flex: 1, padding: '0.45rem', borderRadius: 8,
                                  border: active ? 'none' : '1px solid var(--border-color)',
                                  background: active ? c.activeBg : 'var(--surface)',
                                  color: active ? 'white' : 'var(--text-muted)',
                                  fontWeight: 700, fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  boxShadow: active ? c.activeShadow : 'none',
                                  transition: 'all 0.15s',
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
                          placeholder="Commentaire (optionnel)…"
                          rows={2}
                          textareaStyle={{
                            width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.82rem',
                            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)',
                            boxSizing: 'border-box', color: 'var(--text-main)', background: 'var(--input-bg)',
                            resize: 'vertical', minHeight: 48, lineHeight: 1.5, marginBottom: 0,
                          }}
                        />
                      </div>
                    )
                  })}

                  {objectifs.length < 5 && (
                    <button
                      onClick={addObjectif}
                      style={{
                        width: '100%', padding: '0.55rem', borderRadius: 10,
                        border: '1.5px solid var(--border-color)',
                        background: 'var(--input-bg)', color: 'var(--primary-dark)',
                        fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Ajouter un objectif
                    </button>
                  )}
                </>
              )}

              {/* ── SYNTHESE CLINIQUE ────────────────────────────── */}
              {sec.id === 'syntheseClinique' && (
                <>
                  <label style={{ ...lblStyle, display: 'flex', alignItems: 'center' }}>
                    <span>Résumé de la prise en charge</span>
                    {onGenerateSyntheseField && (
                      <ConfectionButton
                        onConfect={() => runSyntheseField('resumePEC', setResumePEC)}
                        busy={busySynthese.resumePEC}
                      />
                    )}
                  </label>
                  <DictableTextarea
                    value={resumePEC}
                    onChange={e => setResumePEC(e.target.value)}
                    placeholder="Techniques utilisées, fréquence, progression..."
                    rows={3}
                    textareaStyle={taStyle}
                  />

                  <label style={{ ...lblStyle, display: 'flex', alignItems: 'center' }}>
                    <span>Résultats obtenus</span>
                    {onGenerateSyntheseField && (
                      <ConfectionButton
                        onConfect={() => runSyntheseField('resultatsObtenus', setResultatsObtenus)}
                        busy={busySynthese.resultatsObtenus}
                      />
                    )}
                  </label>
                  <DictableTextarea
                    value={resultatsObtenus}
                    onChange={e => setResultatsObtenus(e.target.value)}
                    placeholder="Gains fonctionnels, amélioration douleur, autonomie..."
                    rows={3}
                    textareaStyle={taStyle}
                  />

                  <label style={{ ...lblStyle, display: 'flex', alignItems: 'center' }}>
                    <span>Facteurs limitants rencontrés</span>
                    {onGenerateSyntheseField && (
                      <ConfectionButton
                        onConfect={() => runSyntheseField('facteursLimitants', setFacteursLimitants)}
                        busy={busySynthese.facteursLimitants}
                      />
                    )}
                  </label>
                  <DictableTextarea
                    value={facteursLimitants}
                    onChange={e => setFacteursLimitants(e.target.value)}
                    placeholder="Compliance, comorbidités, facteurs psychosociaux..."
                    rows={2}
                    textareaStyle={taStyle}
                  />
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

                </>
              )}

            </div>
          )}
        </div>
      ))}

      {/* ── Section 6: Courrier (always visible, not collapsible) ─────────── */}
      {onGenerateLetter && (
        <div style={{
          marginTop: 16, marginBottom: 16, padding: '14px 14px 12px',
          background: 'var(--input-bg)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xl)',
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
            Courrier de sortie
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Les informations de ce bilan seront reprises automatiquement dans le courrier.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => onGenerateLetter('fin_pec')}
              style={{
                flex: 1, padding: '0.75rem 0.75rem', borderRadius: 'var(--radius-xl)',
                background: 'var(--primary)', border: '1px solid var(--primary)',
                color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Fin de prise en charge
            </button>
            <button type="button" onClick={() => onGenerateLetter('fin_anticipee')}
              style={{
                flex: 1, padding: '0.75rem 0.75rem', borderRadius: 'var(--radius-xl)',
                background: 'white', border: '1.5px solid var(--primary)',
                color: 'var(--primary)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
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
