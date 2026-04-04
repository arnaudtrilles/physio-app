import { useState, useImperativeHandle, forwardRef } from 'react'
import { SmartObjectifsInline } from './SmartObjectifsInline'

export interface BilanEpauleHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

function OuiNon({ label, value, onChange, detail, onDetailChange }: { label: string; value: string; onChange: (v: string) => void; detail?: string; onDetailChange?: (v: string) => void }) {
  return (
    <div className="oui-non-group" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="oui-non-label">{label}</span>
        <div className="oui-non-btns">
          {['Oui', 'Non'].map(v => (
            <button key={v} className={`oui-non-btn${value === v.toLowerCase() ? ' active' : ''}`} onClick={() => onChange(value === v.toLowerCase() ? '' : v.toLowerCase())}>{v}</button>
          ))}
        </div>
      </div>
      {value === 'oui' && onDetailChange && (
        <textarea value={detail ?? ''} onChange={e => onDetailChange(e.target.value)} placeholder="Préciser…" rows={2}
          style={{ marginTop: 6, width: '100%', padding: '0.45rem 0.7rem', fontSize: '0.82rem', color: 'var(--text-main)', background: 'var(--secondary)', border: '1px solid var(--border-color)', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box' }} />
      )}
    </div>
  )
}

function SectionHeader({ title, open, onToggle, color = 'var(--primary)' }: { title: string; open: boolean; onToggle: () => void; color?: string }) {
  return (
    <button className="bilan-collapsible-header" onClick={onToggle}>
      <span className="bilan-collapsible-title" style={{ color }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        {title}
      </span>
      <svg className={`bilan-collapsible-chevron${open ? ' open' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
  )
}

function ScoreRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="oui-non-group">
      <span className="oui-non-label" style={{ fontSize: '0.85rem' }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 80, textAlign: 'right', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', fontSize: '0.9rem', color: 'var(--text-main)', padding: '0.1rem 0.3rem' }} placeholder="—" />
    </div>
  )
}

const boolToStr = (v: unknown): string => v === true ? 'oui' : v === false ? 'non' : (v as string) ?? ''

export const BilanEpaule = forwardRef<BilanEpauleHandle, { initialData?: Record<string, unknown> }>(({ initialData }, ref) => {
  const _d  = (initialData?.douleur        as Record<string, unknown>) ?? {}
  const _rf = (initialData?.redFlags       as Record<string, unknown>) ?? {}
  const _yf = (initialData?.yellowFlags    as Record<string, unknown>) ?? {}
  const _bb = (initialData?.blueBlackFlags as Record<string, unknown>) ?? {}
  const _sc = (initialData?.scores        as Record<string, unknown>) ?? {}
  const _ck = (initialData?.contratKine   as Record<string, unknown>) ?? {}

  const [open, setOpen] = useState<Record<string, boolean>>({ douleur: true })
  const toggle = (id: string) => setOpen(p => ({ ...p, [id]: !p[id] }))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.92rem',
    color: 'var(--text-main)', background: 'var(--secondary)',
    border: '1px solid transparent', borderRadius: 'var(--radius-md)', marginBottom: 8,
  }

  // ── Douleur ──
  const [debutSymptomes, setDebutSymptomes]             = useState((_d.debutSymptomes as string) ?? '')
  const [facteurDeclenchant, setFacteurDeclenchant]     = useState((_d.facteurDeclenchant as string) ?? '')
  const [localisationInitiale, setLocalisationInitiale] = useState((_d.localisationInitiale as string) ?? '')
  const [localisationActuelle, setLocalisationActuelle] = useState((_d.localisationActuelle as string) ?? '')
  const [evnPire, setEvnPire]     = useState(String(_d.evnPire ?? ''))
  const [evnMieux, setEvnMieux]   = useState(String(_d.evnMieux ?? ''))
  const [evnMoy, setEvnMoy]       = useState(String(_d.evnMoy ?? ''))
  const [douleurType, setDouleurType]   = useState((_d.douleurType as string) ?? '')
  const [situation, setSituation]       = useState((_d.situation as string) ?? '')
  const [douleurNocturne, setDouleurNocturne]           = useState(boolToStr(_d.douleurNocturne))
  const [douleurNocturneType, setDouleurNocturneType]   = useState((_d.douleurNocturneType as string) ?? '')
  const [insomniante, setInsomniante]                   = useState(boolToStr(_d.insomniante))
  const [derouillageMatinal, setDerouillageMatinal]     = useState(boolToStr(_d.derouillageMatinal))
  const [derouillageTemps, setDerouillageTemps]         = useState((_d.derouillageTemps as string) ?? '')
  const [mouvementsEmpirent, setMouvementsEmpirent]     = useState((_d.mouvementsEmpirent as string) ?? '')
  const [mouvementsSoulagent, setMouvementsSoulagent]   = useState((_d.mouvementsSoulagent as string) ?? '')

  // ── Red Flags ──
  const [tttMedical, setTttMedical]         = useState((_rf.tttMedical as string) ?? '')
  const [antecedents, setAntecedents]       = useState((_rf.antecedents as string) ?? '')
  const [comorbidites, setComorbidites]     = useState((_rf.comorbidites as string) ?? '')
  const [sommeilQuantite, setSommeilQuantite] = useState((_rf.sommeilQuantite as string) ?? '')
  const [sommeilQualite, setSommeilQualite]   = useState((_rf.sommeilQualite as string) ?? '')
  const [cinqD3N, setCinqD3N]               = useState((_rf.cinqD3N as string) ?? '')
  const [imageries, setImageries]           = useState((_rf.imageries as string) ?? '')
  const [rf, setRf] = useState<Record<string, string>>({
    tabagisme: boolToStr(_rf.tabagisme), traumatismeRecent: boolToStr(_rf.traumatismeRecent),
    troublesMotricite: boolToStr(_rf.troublesMotricite), troublesMarche: boolToStr(_rf.troublesMarche),
    perteAppetit: boolToStr(_rf.perteAppetit), pertePoids: boolToStr(_rf.pertePoids),
    atcdCancer: boolToStr(_rf.atcdCancer), cephalees: boolToStr(_rf.cephalees),
    cephaleesIntenses: boolToStr(_rf.cephaleesIntenses), fievre: boolToStr(_rf.fievre),
    csIs: boolToStr(_rf.csIs), douleurThoracique: boolToStr(_rf.douleurThoracique),
    douleurDigestion: boolToStr(_rf.douleurDigestion), fatigueRF: boolToStr(_rf.fatigueRF),
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

  useImperativeHandle(ref, () => ({
    getData: () => ({
      douleur: { debutSymptomes, facteurDeclenchant, localisationInitiale, localisationActuelle, evnPire, evnMieux, evnMoy, douleurType, situation, douleurNocturne, douleurNocturneType, insomniante, derouillageMatinal, derouillageTemps, mouvementsEmpirent, mouvementsSoulagent },
      redFlags: { tttMedical, antecedents, comorbidites, sommeilQuantite, sommeilQualite, cinqD3N, imageries, ...rf },
      yellowFlags: { croyancesOrigine, croyancesTtt, attentes, autoEfficacite, flexibilitePsy, strategieCoping, peurEvitementMouvements, ...yf },
      blueBlackFlags: { stressNiveau, antecedentsAtDetails, ...bb },
      scores: { scoreOSS: scores.oss, scoreConstant: scores.constant, scoreDASH: scores.dash, scoreRowe: scores.rowe, psfs1: scores.psfs1, psfs2: scores.psfs2, psfs3: scores.psfs3, scoreHAD: scores.had, scoreDN4: scores.dn4, scoreSensibilisation: scores.sensibilisation, autresScores: scores.autres },
      contratKine: { objectifsSMART: objectifsSMART.map(o => o.titre + (o.cible ? ` — ${o.cible}` : '')).join('\n'), objectifsSMARTItems: objectifsSMART, autoReeducation, frequenceDuree },
    }),
    setData: (data: Record<string, unknown>) => {
      const d   = (data.douleur        as Record<string, unknown>) ?? {}
      const rfD = (data.redFlags       as Record<string, unknown>) ?? {}
      const yfD = (data.yellowFlags    as Record<string, unknown>) ?? {}
      const bbD = (data.blueBlackFlags as Record<string, unknown>) ?? {}
      const scD = (data.scores        as Record<string, unknown>) ?? {}
      const ckD = (data.contratKine   as Record<string, unknown>) ?? {}
      if (d.debutSymptomes !== undefined)      setDebutSymptomes(d.debutSymptomes as string)
      if (d.facteurDeclenchant !== undefined)  setFacteurDeclenchant(d.facteurDeclenchant as string)
      if (d.localisationInitiale !== undefined) setLocalisationInitiale(d.localisationInitiale as string)
      if (d.localisationActuelle !== undefined) setLocalisationActuelle(d.localisationActuelle as string)
      if (d.evnPire !== undefined)             setEvnPire(String(d.evnPire))
      if (d.evnMieux !== undefined)            setEvnMieux(String(d.evnMieux))
      if (d.evnMoy !== undefined)              setEvnMoy(String(d.evnMoy))
      if (d.douleurType !== undefined)         setDouleurType(d.douleurType as string)
      if (d.situation !== undefined)           setSituation(d.situation as string)
      if (d.douleurNocturne !== undefined)     setDouleurNocturne(boolToStr(d.douleurNocturne))
      if (d.douleurNocturneType !== undefined) setDouleurNocturneType(d.douleurNocturneType as string)
      if (d.insomniante !== undefined)         setInsomniante(boolToStr(d.insomniante))
      if (d.derouillageMatinal !== undefined)  setDerouillageMatinal(boolToStr(d.derouillageMatinal))
      if (d.derouillageTemps !== undefined)    setDerouillageTemps(d.derouillageTemps as string)
      if (d.mouvementsEmpirent !== undefined)  setMouvementsEmpirent(d.mouvementsEmpirent as string)
      if (d.mouvementsSoulagent !== undefined) setMouvementsSoulagent(d.mouvementsSoulagent as string)
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
        ...(scD.scoreHAD !== undefined            ? { had: scD.scoreHAD as string } : {}),
        ...(scD.scoreDN4 !== undefined            ? { dn4: scD.scoreDN4 as string } : {}),
        ...(scD.scoreSensibilisation !== undefined ? { sensibilisation: scD.scoreSensibilisation as string } : {}),
        ...(scD.autresScores !== undefined         ? { autres: scD.autresScores as string } : {}),
      }))
      if (ckD.objectifsSMARTItems !== undefined) setObjectifsSMART(ckD.objectifsSMARTItems as Array<{id: number; titre: string; cible: string; dateCible: string}>)
      else if (typeof ckD.objectifsSMART === 'string' && (ckD.objectifsSMART as string).trim()) setObjectifsSMART([{ id: Date.now(), titre: (ckD.objectifsSMART as string).trim(), cible: '', dateCible: '' }])
      if (ckD.autoReeducation !== undefined) setAutoReeducation(boolToStr(ckD.autoReeducation))
      if (ckD.frequenceDuree !== undefined)  setFrequenceDuree(ckD.frequenceDuree as string)
    },
  }))

  return (
    <div>
      {[
        { id: 'douleur',       title: 'Douleur',               color: 'var(--primary)' },
        { id: 'redFlags',      title: 'Red Flags 🚩',           color: '#dc2626' },
        { id: 'yellowFlags',   title: 'Yellow Flags 🟡',        color: '#d97706' },
        { id: 'blueBlackFlags',title: 'Blue / Black Flags',     color: '#7c3aed' },
        { id: 'scores',        title: 'Scores fonctionnels',    color: 'var(--primary)' },
        { id: 'contrat',       title: 'Contrat kiné',           color: '#059669' },
      ].map(sec => (
        <div key={sec.id} style={{ marginBottom: 4 }}>
          <SectionHeader title={sec.title} open={!!open[sec.id]} onToggle={() => toggle(sec.id)} color={sec.color} />
          {open[sec.id] && (
            <div style={{ paddingTop: 12, paddingBottom: 8 }}>

              {sec.id === 'douleur' && (
                <>
                  {([
                    ['Début des symptômes',                 debutSymptomes,    setDebutSymptomes,    'Date / circonstances…'],
                    ['Facteur déclenchant (ou aucun)',      facteurDeclenchant, setFacteurDeclenchant, 'Chute, effort, progressif…'],
                    ['Localisation des symptômes initiaux', localisationInitiale, setLocalisationInitiale, 'Zone concernée au départ…'],
                    ['Localisation des symptômes actuels',  localisationActuelle, setLocalisationActuelle, 'Zone actuelle…'],
                  ] as [string, string, (v: string) => void, string][]).map(([lbl, val, setter, ph]) => (
                    <div key={lbl} style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{lbl}</label>
                      <input value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={inputStyle} />
                    </div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {([['EVN Pire', evnPire, setEvnPire], ['EVN Mieux', evnMieux, setEvnMieux], ['EVN Moy.', evnMoy, setEvnMoy]] as [string, string, (v: string) => void][]).map(([lbl, val, setter]) => (
                      <div key={lbl}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{lbl}</label>
                        <input type="number" min="0" max="10" value={val} onChange={e => setter(e.target.value)}
                          style={{ ...inputStyle, textAlign: 'center', marginBottom: 0 }} placeholder="0-10" />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', width: '100%', marginBottom: 2 }}>Type de douleur</label>
                    {['Constante', 'Intermittente'].map(v => (
                      <button key={v} className={`choix-btn${douleurType === v.toLowerCase() ? ' active' : ''}`} onClick={() => setDouleurType(douleurType === v.toLowerCase() ? '' : v.toLowerCase())}>{v}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', width: '100%', marginBottom: 2 }}>Situation</label>
                    {([["↑ S'améliore", 'ameliore'], ['→ Stationnaire', 'stationnaire'], ['↓ Se dégrade', 'degrade']] as [string, string][]).map(([lbl, v]) => (
                      <button key={v} className={`choix-btn${situation === v ? ' active' : ''}`} onClick={() => setSituation(situation === v ? '' : v)}>{lbl}</button>
                    ))}
                  </div>
                  <OuiNon label="Douleur nocturne" value={douleurNocturne} onChange={setDouleurNocturne} />
                  {douleurNocturne === 'oui' && (
                    <>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
                        {([['Au mouvement', 'mouvement'], ['Sans bouger', 'sans_bouger']] as [string, string][]).map(([lbl, v]) => (
                          <button key={v} className={`choix-btn${douleurNocturneType === v ? ' active' : ''}`} onClick={() => setDouleurNocturneType(douleurNocturneType === v ? '' : v)}>{lbl}</button>
                        ))}
                      </div>
                      <OuiNon label="Insomniante" value={insomniante} onChange={setInsomniante} />
                    </>
                  )}
                  <OuiNon label="Dérouillage matinal" value={derouillageMatinal} onChange={setDerouillageMatinal} />
                  {derouillageMatinal === 'oui' && (
                    <input value={derouillageTemps} onChange={e => setDerouillageTemps(e.target.value)} placeholder="Durée du dérouillage…" style={{ ...inputStyle, marginTop: 6 }} />
                  )}
                  <div style={{ marginTop: 8, marginBottom: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Mouvements / situations qui EMPIRENT</label>
                    <textarea value={mouvementsEmpirent} onChange={e => setMouvementsEmpirent(e.target.value)} placeholder="Élévation, rotation…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Mouvements / situations qui SOULAGENT</label>
                    <textarea value={mouvementsSoulagent} onChange={e => setMouvementsSoulagent(e.target.value)} placeholder="Repos, chaleur…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                </>
              )}

              {sec.id === 'redFlags' && (
                <>
                  {([
                    ['tttMedical',    'TTT médical actuel',      tttMedical,    setTttMedical,    'Médicaments…'],
                    ['antecedents',   'Antécédents',             antecedents,   setAntecedents,   'Chirurgies, pathologies…'],
                    ['comorbidites',  'Comorbidités',            comorbidites,  setComorbidites,  'Diabète, HTA…'],
                    ['sommeilQ',      'Sommeil — Quantité',      sommeilQuantite, setSommeilQuantite, 'Nb heures…'],
                    ['sommeilQual',   'Sommeil — Qualité',       sommeilQualite,  setSommeilQualite,  'Perturbé, bon…'],
                    ['cinqD3N',       '5D 3N',                   cinqD3N,       setCinqD3N,       'Dizziness, Drop attacks, Diplopie, Dysarthrie, Dysphagie, Nystagmus…'],
                    ['imageries',     'Imagerie(s)',             imageries,     setImageries,     'Radio, IRM, écho…'],
                  ] as [string, string, string, (v: string) => void, string][]).map(([k, lbl, val, setter, ph]) => (
                    <div key={k} style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{lbl}</label>
                      <input value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={inputStyle} />
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
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Croyances — Origine de la douleur</label>
                    <input value={croyancesOrigine} onChange={e => setCroyancesOrigine(e.target.value)} placeholder="Ce que pense le patient…" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Croyances — TTT qui serait adapté</label>
                    <input value={croyancesTtt} onChange={e => setCroyancesTtt(e.target.value)} placeholder="Selon le patient…" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Attentes</label>
                    <textarea value={attentes} onChange={e => setAttentes(e.target.value)} placeholder="Objectifs du patient…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
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
                    <input value={peurEvitementMouvements} onChange={e => setPeurEvitementMouvements(e.target.value)}
                      placeholder="Quel(s) mouvement(s) évité(s)…" style={{ ...inputStyle, marginTop: 6 }} />
                  )}
                  <div style={{ marginTop: 8, marginBottom: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Stratégie(s) de Coping</label>
                    <textarea value={strategieCoping} onChange={e => setStrategieCoping(e.target.value)} placeholder="Repos, chaleur, médicaments…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', width: '100%', marginBottom: 2 }}>Flexibilité psychologique</label>
                    {['Faible', 'Moyenne', 'Forte'].map(v => (
                      <button key={v} className={`choix-btn${flexibilitePsy === v.toLowerCase() ? ' active' : ''}`} onClick={() => setFlexibilitePsy(flexibilitePsy === v.toLowerCase() ? '' : v.toLowerCase())}>{v}</button>
                    ))}
                  </div>
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
                  {([
                    ['oss',           "Score d'Oxford Épaule (OSS)"],
                    ['constant',      'Constant-Murley'],
                    ['dash',          'DASH'],
                    ['rowe',          'Rowe score'],
                    ['had',           'Échelle HAD'],
                    ['dn4',           'DN4'],
                    ['sensibilisation','Sensibilisation Centrale'],
                  ] as [string, string][]).map(([k, lbl]) => (
                    <ScoreRow key={k} label={lbl} value={scores[k]} onChange={v => updateScore(k, v)} />
                  ))}
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', margin: '10px 0 4px' }}>Patient Specific Functional Scale (PSFS)</label>
                  {([['psfs1','Activité 1'],['psfs2','Activité 2'],['psfs3','Activité 3']] as [string, string][]).map(([k, lbl]) => (
                    <ScoreRow key={k} label={lbl} value={scores[k]} onChange={v => updateScore(k, v)} />
                  ))}
                  <div style={{ marginTop: 8 }}>
                    <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Autre(s) Score(s)</label>
                    <textarea value={scores.autres} onChange={e => updateScore('autres', e.target.value)} placeholder="Nom et score…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                  </div>
                </>
              )}

              {sec.id === 'contrat' && (
                <>
                  <SmartObjectifsInline objectifs={objectifsSMART} onChange={setObjectifsSMART} />
                  <OuiNon label="S'engage à faire l'auto-rééducation" value={autoReeducation} onChange={setAutoReeducation} />
                  {autoReeducation === 'oui' && (
                    <input value={frequenceDuree} onChange={e => setFrequenceDuree(e.target.value)}
                      placeholder="Fréquence / Durée… Ex: 3x/semaine, 20 min" style={{ ...inputStyle, marginTop: 6 }} />
                  )}
                </>
              )}

            </div>
          )}
        </div>
      ))}
    </div>
  )
})

BilanEpaule.displayName = 'BilanEpaule'
