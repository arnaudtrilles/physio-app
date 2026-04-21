import { useState, useImperativeHandle, forwardRef, useMemo } from 'react'
import { DictableTextarea } from '../VoiceMic'
import { Chrono } from './Chrono'
import { SPPBInteractiveModal } from './SPPBInteractiveModal'
import { QuestionnaireModal, TINETTI_QUESTIONS, interpretTinetti } from './QuestionnaireModal'
import { OuiNon, EVASlider } from './shared'

export interface BilanIntermediaireGeriatriqueHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

// ── Baseline extraction ───────────────────────────────────────────────────
interface BaselineValues {
  tug: string
  sppbTotal: string
  sppbEquilibre: string
  sppbVitesse: string
  sppbLever: string
  tinetti: string
  cinqLeverTime: string
  evnRepos: string
  evnMvt: string
}

function extractBaseline(baseline?: Record<string, unknown>): BaselineValues {
  const tests = (baseline?.tests as Record<string, unknown>) ?? {}
  const scores = (baseline?.scores as Record<string, unknown>) ?? {}
  const douleur = (baseline?.douleur as Record<string, unknown>) ?? {}
  const s = (v: unknown): string => v != null ? String(v) : ''
  return {
    tug: s(tests.tug),
    sppbTotal: s(scores.sppbTotal),
    sppbEquilibre: s(tests.sppbEquilibre),
    sppbVitesse: s(tests.sppbVitesse),
    sppbLever: s(tests.sppbLever),
    tinetti: s(tests.tinetti),
    cinqLeverTime: s(tests.cinqLeverTime),
    evnRepos: s(douleur.evnRepos),
    evnMvt: s(douleur.evnMvt),
  }
}

// ── Small UI helpers ──────────────────────────────────────────────────────
function SectionTitle({ num, title, color = 'var(--primary-dark)' }: { num: string; title: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--secondary)', padding: '2px 7px', borderRadius: 6, letterSpacing: '0.02em' }}>{num}</span>
      <span style={{ fontWeight: 700, color, fontSize: '0.95rem' }}>{title}</span>
    </div>
  )
}

function ChoixGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(v => (
        <button key={v} className={`choix-btn${value === v ? ' active' : ''}`} onClick={() => onChange(value === v ? '' : v)}>{v}</button>
      ))}
    </div>
  )
}

function ScoreButton({ label, score, maxScore, onClick, interpretation }: { label: string; score: string; maxScore: number; onClick: () => void; interpretation?: { label: string; color: string } }) {
  const hasScore = score !== ''
  return (
    <button type="button" onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.55rem 0.8rem', borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${hasScore ? '#bfdbfe' : 'var(--border-color)'}`,
        background: hasScore ? '#eff6ff' : 'var(--secondary)', cursor: 'pointer', textAlign: 'left',
      }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: hasScore ? '#1e3a8a' : 'var(--text-main)' }}>{label}</div>
        {hasScore && interpretation && (
          <div style={{ fontSize: '0.66rem', fontWeight: 600, color: interpretation.color, marginTop: 1 }}>{interpretation.label}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {hasScore ? (
          <span style={{ fontSize: '0.92rem', fontWeight: 800, color: interpretation?.color ?? '#1e3a8a', letterSpacing: '-0.01em' }}>
            {score}<span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}> / {maxScore}</span>
          </span>
        ) : (
          <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>Remplir</span>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={hasScore ? 'var(--primary)' : 'var(--text-muted)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </button>
  )
}

// Comparative row : initial (read-only) vs actuel (editable)
function CompareRow({ label, unit, initial, actuel, onChangeActuel, children, higherIsBetter = false }: {
  label: string
  unit: string
  initial: string
  actuel: string
  onChangeActuel?: (v: string) => void
  children?: React.ReactNode // for custom input (chrono, score button)
  higherIsBetter?: boolean // true for SPPB, Tinetti (score higher = better) ; false for TUG, 5-levers, EVN (lower = better)
}) {
  const hasBoth = initial !== '' && actuel !== ''
  const iNum = Number(initial), aNum = Number(actuel)
  const delta = hasBoth && !isNaN(iNum) && !isNaN(aNum) && iNum !== 0
    ? higherIsBetter
      ? Math.round(((aNum - iNum) / iNum) * 100)
      : Math.round(((iNum - aNum) / iNum) * 100)
    : null
  const color = delta === null ? 'var(--text-muted)' : delta > 0 ? '#166534' : delta < 0 ? '#881337' : '#64748b'

  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{label}</span>
        {delta !== null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', fontWeight: 700, color, letterSpacing: '-0.01em' }}>
            {delta > 0 ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            ) : delta < 0 ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            )}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2, letterSpacing: '0.02em' }}>INITIAL</div>
          <div style={{ fontSize: '0.85rem', color: initial ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 600, padding: '0.35rem 0.5rem', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
            {initial || '—'}{initial && unit && ` ${unit}`}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.62rem', color: '#1e3a8a', fontWeight: 700, marginBottom: 2, letterSpacing: '0.02em' }}>ACTUEL</div>
          {children ? children : (
            <input
              type="text"
              value={actuel}
              onChange={e => onChangeActuel?.(e.target.value)}
              placeholder={unit ? `ex: ${unit}` : 'valeur'}
              style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 6, boxSizing: 'border-box' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export const BilanIntermediaireGeriatrique = forwardRef<BilanIntermediaireGeriatriqueHandle, { baseline?: Record<string, unknown>; initialData?: Record<string, unknown> }>(({ baseline, initialData }, ref) => {
  const _admin  = (initialData?.admin       as Record<string, unknown>) ?? {}
  const _evo    = (initialData?.evolution   as Record<string, unknown>) ?? {}
  const _t      = (initialData?.tests       as Record<string, unknown>) ?? {}
  const _plan   = (initialData?.plan        as Record<string, unknown>) ?? {}

  const base = useMemo(() => extractBaseline(baseline), [baseline])

  // ── Section 1 : Suivi administratif ──────────────────────────────────────
  const [seanceNum, setSeanceNum] = useState((_admin.seanceNum as string) ?? '')

  // ── Section 2 : Évolution clinique ───────────────────────────────────────
  const [nouvellesChutes, setNouvellesChutes] = useState((_evo.nouvellesChutes as string) ?? '')
  const [chutesDetail, setChutesDetail] = useState((_evo.chutesDetail as string) ?? '')
  const [tolerance, setTolerance] = useState((_evo.tolerance as string) ?? '')
  const [observance, setObservance] = useState((_evo.observance as string) ?? '')
  const [evnReposAct, setEvnReposAct] = useState((_evo.evnReposAct as string) ?? '')
  const [evnMvtAct, setEvnMvtAct] = useState((_evo.evnMvtAct as string) ?? '')
  const [autonomie, setAutonomie] = useState((_evo.autonomie as string) ?? '')
  // Yellow flags évolution
  const [isolement, setIsolement] = useState((_evo.isolement as string) ?? '')
  const [moral, setMoral] = useState((_evo.moral as string) ?? '')
  const [peurTomber, setPeurTomber] = useState((_evo.peurTomber as string) ?? '')
  // Contexte de vie
  const [aidesTechEvol, setAidesTechEvol] = useState((_evo.aidesTechEvol as string) ?? '')
  const [retentissementDouleur, setRetentissementDouleur] = useState((_evo.retentissementDouleur as string) ?? '')

  // ── Section 3 : Réévaluation tests fonctionnels ──────────────────────────
  const [tug, setTug] = useState((_t.tug as string) ?? '')
  const [sppbEquilibre, setSppbEquilibre] = useState((_t.sppbEquilibre as string) ?? '')
  const [sppbVitesse, setSppbVitesse] = useState((_t.sppbVitesse as string) ?? '')
  const [sppbLever, setSppbLever] = useState((_t.sppbLever as string) ?? '')
  const [sppbRawData, setSppbRawData] = useState<Record<string, unknown>>((_t.sppbRawData as Record<string, unknown>) ?? {})
  const [tinetti, setTinetti] = useState((_t.tinetti as string) ?? '')
  const [tinettiAnswers, setTinettiAnswers] = useState<Record<string, number>>((_t.tinettiAnswers as Record<string, number>) ?? {})
  const [cinqLeverTime, setCinqLeverTime] = useState((_t.cinqLeverTime as string) ?? '')
  const [openSppb, setOpenSppb] = useState(false)
  const [openTinetti, setOpenTinetti] = useState(false)
  // Examen clinique observations
  const [forceGlobale, setForceGlobale] = useState((_t.forceGlobale as string) ?? '')
  const [mobiliteEvol, setMobiliteEvol] = useState((_t.mobiliteEvol as string) ?? '')
  const [equilibreObs, setEquilibreObs] = useState((_t.equilibreObs as string) ?? '')

  const sppbTotal = (() => {
    const e = Number(sppbEquilibre) || 0
    const v = Number(sppbVitesse) || 0
    const l = Number(sppbLever) || 0
    return (sppbEquilibre || sppbVitesse || sppbLever) ? e + v + l : null
  })()

  // ── Section 4 : Analyse & ajustement ─────────────────────────────────────
  const [acquisitions, setAcquisitions] = useState((_plan.acquisitions as string) ?? '')
  const [freins, setFreins] = useState((_plan.freins as string) ?? '')

  // ── Comparatif global ────────────────────────────────────────────────────
  // EVA (lower better), TUG (lower better), 5-levers (lower better)
  // SPPB (higher better), Tinetti (higher better)
  const comparisons = useMemo(() => {
    const calc = (init: string, act: string, higherIsBetter: boolean) => {
      if (!init || !act) return null
      const i = Number(init), a = Number(act)
      if (isNaN(i) || isNaN(a) || i === 0) return null
      return higherIsBetter ? Math.round(((a - i) / i) * 100) : Math.round(((i - a) / i) * 100)
    }
    return {
      evnRepos: calc(base.evnRepos, evnReposAct, false),
      evnMvt: calc(base.evnMvt, evnMvtAct, false),
      tug: calc(base.tug, tug, false),
      sppb: sppbTotal !== null ? calc(base.sppbTotal, String(sppbTotal), true) : null,
      tinetti: calc(base.tinetti, tinetti, true),
      cinqLever: calc(base.cinqLeverTime, cinqLeverTime, false),
    }
  }, [base, evnReposAct, evnMvtAct, tug, sppbTotal, tinetti, cinqLeverTime])

  useImperativeHandle(ref, () => ({
    getData: () => ({
      admin: { seanceNum },
      evolution: { nouvellesChutes, chutesDetail, tolerance, observance, evnReposAct, evnMvtAct, autonomie, isolement, moral, peurTomber, aidesTechEvol, retentissementDouleur },
      tests: { tug, sppbEquilibre, sppbVitesse, sppbLever, sppbRawData, sppbTotal: sppbTotal ?? '', tinetti, tinettiAnswers, cinqLeverTime, forceGlobale, mobiliteEvol, equilibreObs },
      plan: { acquisitions, freins },
      comparatif: comparisons,
      // pour compatibilité historique
      troncCommun: { evn: { pireActuel: evnMvtAct, pireInitial: base.evnMvt, moyActuel: evnReposAct, moyInitial: base.evnRepos }, evolutionGlobale: autonomie },
    }),
    setData: (data: Record<string, unknown>) => {
      const admin = (data.admin as Record<string, unknown>) ?? {}
      const evo   = (data.evolution as Record<string, unknown>) ?? {}
      const t     = (data.tests as Record<string, unknown>) ?? {}
      const plan  = (data.plan as Record<string, unknown>) ?? {}
      if (admin.seanceNum !== undefined) setSeanceNum(admin.seanceNum as string)
      if (evo.nouvellesChutes !== undefined) setNouvellesChutes(evo.nouvellesChutes as string)
      if (evo.chutesDetail !== undefined)    setChutesDetail(evo.chutesDetail as string)
      if (evo.tolerance !== undefined)       setTolerance(evo.tolerance as string)
      if (evo.observance !== undefined)      setObservance(evo.observance as string)
      if (evo.evnReposAct !== undefined)     setEvnReposAct(evo.evnReposAct as string)
      if (evo.evnMvtAct !== undefined)       setEvnMvtAct(evo.evnMvtAct as string)
      if (evo.autonomie !== undefined)       setAutonomie(evo.autonomie as string)
      if (evo.isolement !== undefined)     setIsolement(evo.isolement as string)
      if (evo.moral !== undefined)         setMoral(evo.moral as string)
      if (evo.peurTomber !== undefined)    setPeurTomber(evo.peurTomber as string)
      if (evo.aidesTechEvol !== undefined) setAidesTechEvol(evo.aidesTechEvol as string)
      if (evo.retentissementDouleur !== undefined) setRetentissementDouleur(evo.retentissementDouleur as string)
      if (t.tug !== undefined)            setTug(t.tug as string)
      if (t.sppbEquilibre !== undefined)  setSppbEquilibre(t.sppbEquilibre as string)
      if (t.sppbVitesse !== undefined)    setSppbVitesse(t.sppbVitesse as string)
      if (t.sppbLever !== undefined)      setSppbLever(t.sppbLever as string)
      if (t.sppbRawData !== undefined)    setSppbRawData(t.sppbRawData as Record<string, unknown>)
      if (t.tinetti !== undefined)        setTinetti(t.tinetti as string)
      if (t.tinettiAnswers !== undefined) setTinettiAnswers(t.tinettiAnswers as Record<string, number>)
      if (t.cinqLeverTime !== undefined)  setCinqLeverTime(t.cinqLeverTime as string)
      if (t.forceGlobale !== undefined)    setForceGlobale(t.forceGlobale as string)
      if (t.mobiliteEvol !== undefined)   setMobiliteEvol(t.mobiliteEvol as string)
      if (t.equilibreObs !== undefined)   setEquilibreObs(t.equilibreObs as string)
      if (plan.acquisitions !== undefined) setAcquisitions(plan.acquisitions as string)
      if (plan.freins !== undefined)       setFreins(plan.freins as string)
    },
  }))

  const sublabel: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.88rem', color: 'var(--text-main)', background: '#FDFCFA', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', boxSizing: 'border-box' }

  const noBaseline = !baseline || Object.keys(baseline).length === 0

  return (
    <div>
      {/* Intro */}
      <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <p style={{ fontSize: '0.82rem', color: '#9a3412', margin: 0, fontWeight: 600 }}>
          Bilan Intermédiaire Gériatrique — Réévaluation
        </p>
        {noBaseline && (
          <p style={{ fontSize: '0.72rem', color: '#c2410c', margin: '4px 0 0' }}>
            Aucun bilan initial gériatrique trouvé pour ce patient — les valeurs initiales sont vides.
          </p>
        )}
      </div>

      {/* ── 1. Suivi administratif ────────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <SectionTitle num="1" title="Suivi administratif" />
        <label style={sublabel}>Numéro de la séance</label>
        <input type="number" min="1" value={seanceNum} onChange={e => setSeanceNum(e.target.value)} style={{ ...inputStyle, width: 120 }} placeholder="N° séance" />
      </div>

      {/* ── 2. Évolution clinique ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <SectionTitle num="2" title="Évolution clinique depuis le bilan initial" />
        <OuiNon label="Nouvelles chutes depuis le dernier bilan ?" value={nouvellesChutes} onChange={setNouvellesChutes} />
        {nouvellesChutes === 'oui' && (
          <DictableTextarea value={chutesDetail} onChange={e => setChutesDetail(e.target.value)} rows={2} placeholder="Décrire les circonstances…"
            textareaStyle={{ ...inputStyle, resize: 'vertical', marginTop: 6 }} />
        )}
        <div style={{ marginTop: 10 }}>
          <label style={sublabel}>Tolérance au traitement</label>
          <ChoixGroup options={['Excellente', 'Fatigue post-séance', 'Douleurs musculaires']} value={tolerance} onChange={setTolerance} />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={sublabel}>Observance (auto-exercices / marche journalière)</label>
          <ChoixGroup options={['Suivie', 'Partielle', 'Non suivie']} value={observance} onChange={setObservance} />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={sublabel}>Autonomie au domicile (ressenti patient / aidant)</label>
          <ChoixGroup options={['Pire', 'Pareil', 'Mieux']} value={autonomie} onChange={setAutonomie} />
        </div>
        {/* Contexte de vie */}
        <div style={{ marginTop: 10 }}>
          <label style={sublabel}>Aides techniques (évolution)</label>
          <ChoixGroup options={['Idem', 'Allégées', 'Renforcées']} value={aidesTechEvol} onChange={setAidesTechEvol} />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={sublabel}>Retentissement de la douleur sur l'autonomie</label>
          <DictableTextarea value={retentissementDouleur} onChange={e => setRetentissementDouleur(e.target.value)} rows={2} placeholder="Marche, toilette, escaliers, sommeil…"
            textareaStyle={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Yellow flags évolution */}
        <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Évolution psycho-sociale</div>
        <div style={{ marginTop: 6 }}>
          <label style={sublabel}>Isolement social</label>
          <ChoixGroup options={['Amélioré', 'Stable', 'Aggravé']} value={isolement} onChange={setIsolement} />
        </div>
        <div style={{ marginTop: 6 }}>
          <label style={sublabel}>Moral perçu</label>
          <ChoixGroup options={['Bon', 'Variable', 'Bas', 'Préoccupant']} value={moral} onChange={setMoral} />
        </div>
        <div style={{ marginTop: 6 }}>
          <label style={sublabel}>Peur de tomber</label>
          <ChoixGroup options={['Diminuée', 'Stable', 'Augmentée']} value={peurTomber} onChange={setPeurTomber} />
        </div>

        <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Évolution de la douleur (EVA 0-10)</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 0.75rem' }}>
          <CompareRow label="EVA au repos" unit="/10" initial={base.evnRepos} actuel={evnReposAct}>
            <EVASlider label="" value={evnReposAct} onChange={setEvnReposAct} compact />
          </CompareRow>
          <CompareRow label="EVA au mouvement" unit="/10" initial={base.evnMvt} actuel={evnMvtAct}>
            <EVASlider label="" value={evnMvtAct} onChange={setEvnMvtAct} compact />
          </CompareRow>
        </div>
      </div>

      {/* ── 3. Réévaluation tests fonctionnels ───────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <SectionTitle num="3" title="Réévaluation tests fonctionnels comparatifs" />
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 0.75rem' }}>
          <CompareRow label="TUG" unit="sec" initial={base.tug} actuel={tug}>
            <Chrono value={tug} onChange={setTug} compact />
          </CompareRow>
          <CompareRow label="SPPB (/12)" unit="/12" initial={base.sppbTotal} actuel={sppbTotal !== null ? String(sppbTotal) : ''} higherIsBetter>
            <ScoreButton
              label="Lancer SPPB interactif"
              score={sppbTotal !== null ? String(sppbTotal) : ''}
              maxScore={12}
              onClick={() => setOpenSppb(true)}
              interpretation={sppbTotal !== null ? (
                sppbTotal >= 10 ? { label: 'Normal', color: '#166534' }
                : sppbTotal >= 7 ? { label: 'Modéré', color: '#f59e0b' }
                : { label: 'Fragilité', color: '#881337' }
              ) : undefined}
            />
          </CompareRow>
          <CompareRow label="Tinetti (/28)" unit="/28" initial={base.tinetti} actuel={tinetti} higherIsBetter>
            <ScoreButton
              label="Lancer Tinetti"
              score={tinetti}
              maxScore={28}
              onClick={() => setOpenTinetti(true)}
              interpretation={tinetti ? interpretTinetti(Number(tinetti)) : undefined}
            />
          </CompareRow>
          <CompareRow label="5 levers de chaise" unit="sec" initial={base.cinqLeverTime} actuel={cinqLeverTime}>
            <Chrono value={cinqLeverTime} onChange={setCinqLeverTime} compact />
          </CompareRow>
        </div>

        {/* Observations cliniques */}
        <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Observations cliniques</div>
        <div style={{ marginTop: 6 }}>
          <label style={sublabel}>Force globale (évolution)</label>
          <ChoixGroup options={['Améliorée', 'Stable', 'Diminuée']} value={forceGlobale} onChange={setForceGlobale} />
        </div>
        <div style={{ marginTop: 6 }}>
          <label style={sublabel}>Mobilité fonctionnelle (évolution)</label>
          <ChoixGroup options={['Améliorée', 'Stable', 'Diminuée']} value={mobiliteEvol} onChange={setMobiliteEvol} />
        </div>
        <div style={{ marginTop: 6 }}>
          <label style={sublabel}>Observations équilibre / posture</label>
          <DictableTextarea value={equilibreObs} onChange={e => setEquilibreObs(e.target.value)} rows={2}
            placeholder="Appui monopodal, tandem, stabilité en double tâche…"
            textareaStyle={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      </div>

      {/* ── 4. Analyse & ajustement du plan ───────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <SectionTitle num="4" title="Analyse & ajustement du plan" color="#059669" />
        <label style={sublabel}>Acquisitions validées</label>
        <DictableTextarea value={acquisitions} onChange={e => setAcquisitions(e.target.value)} rows={3}
          placeholder="Ex : Marche sécurisée avec déambulateur, force quadriceps améliorée…"
          textareaStyle={{ ...inputStyle, resize: 'vertical' }} />
        <label style={{ ...sublabel, marginTop: 10 }}>Freins actuels</label>
        <DictableTextarea value={freins} onChange={e => setFreins(e.target.value)} rows={3}
          placeholder="Ex : Peur de tomber persistante à l'extérieur…"
          textareaStyle={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* ── Comparatif global (synthèse visuelle) ─────────────────────────── */}
      {Object.values(comparisons).some(v => v !== null) && (
        <div style={{ marginBottom: 16, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369a1', marginBottom: 8, letterSpacing: '0.02em' }}>
            Synthèse comparative (amélioration globale)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: 'Douleur au repos', value: comparisons.evnRepos },
              { label: 'Douleur au mouvement', value: comparisons.evnMvt },
              { label: 'TUG', value: comparisons.tug },
              { label: 'SPPB', value: comparisons.sppb },
              { label: 'Tinetti', value: comparisons.tinetti },
              { label: '5 levers de chaise', value: comparisons.cinqLever },
            ].filter(x => x.value !== null).map(x => {
              const v = x.value!
              const color = v > 0 ? '#166534' : v < 0 ? '#881337' : '#64748b'
              return (
                <div key={x.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>{x.label}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.82rem', fontWeight: 700, color }}>
                    {v > 0 ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                    ) : v < 0 ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    )}
                    {Math.abs(v)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {openSppb && (
        <SPPBInteractiveModal
          initialData={sppbRawData as { piedsJoints10s?: boolean | null; semiTandem10s?: boolean | null; tandemSec?: string; gaitSec?: string; chairSec?: string; chairUnable?: boolean }}
          onValidate={(scores) => {
            setSppbEquilibre(scores.balance); setSppbVitesse(scores.gait); setSppbLever(scores.chair); setSppbRawData(scores.data); setOpenSppb(false)
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

BilanIntermediaireGeriatrique.displayName = 'BilanIntermediaireGeriatrique'
