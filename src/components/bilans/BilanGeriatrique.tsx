import { useState, useImperativeHandle, forwardRef } from 'react'
import { SmartObjectifsInline } from '../SmartObjectifsInline'
import {
  QuestionnaireModal,
  FES_I_QUESTIONS, interpretFesI,
  MINI_GDS_QUESTIONS, interpretMiniGds,
  TINETTI_QUESTIONS, interpretTinetti,
} from './QuestionnaireModal'
import { Chrono } from './Chrono'
import { SPPBInteractiveModal } from './SPPBInteractiveModal'

export interface BilanGeriatriqueHandle {
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

function ChoixGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(v => (
        <button key={v} className={`choix-btn${value === v ? ' active' : ''}`} onClick={() => onChange(value === v ? '' : v)}>{v}</button>
      ))}
    </div>
  )
}

function ChoixMulti({ options, values, onChange }: { options: string[]; values: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    onChange(values.includes(opt) ? values.filter(x => x !== opt) : [...values, opt])
  }
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(v => (
        <button key={v} className={`choix-btn${values.includes(v) ? ' active' : ''}`} onClick={() => toggle(v)}>{v}</button>
      ))}
    </div>
  )
}

// Mobilité : Complète / Limitée avec saisie degrés quand limitée
function MobInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  // value = '' | 'complet' | 'limité:45°' (ou juste 'limité' si pas précisé)
  const isComplet = value === 'complet'
  const isLimit = value.startsWith('limité')
  const limitDetail = isLimit ? value.replace(/^limité:?/, '').trim() : ''

  const clickComp = () => onChange(isComplet ? '' : 'complet')
  const clickLim = () => onChange(isLimit ? '' : 'limité')
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

// Bouton info "i" avec tooltip
function InfoTest({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: 6 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{ width: 16, height: 16, borderRadius: '50%', border: '1.5px solid var(--primary)', background: open ? 'var(--primary)' : 'transparent', color: open ? 'white' : 'var(--primary)', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, flexShrink: 0 }}
        aria-label="Info"
      >
        i
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.2)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(15,23,42,0.88)', borderRadius: 12, padding: '0.9rem 1.1rem', zIndex: 9999, maxWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)' }}>
            <div style={{ fontSize: '0.8rem', color: 'white', lineHeight: 1.5 }}>{text}</div>
          </div>
        </div>
      )}
    </span>
  )
}

function SectionTitle({ num, title, color = 'var(--primary-dark)' }: { num: string; title: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--secondary)', padding: '2px 7px', borderRadius: 6, letterSpacing: '0.02em' }}>{num}</span>
      <span style={{ fontWeight: 700, color, fontSize: '0.95rem' }}>{title}</span>
    </div>
  )
}

function ScoreButton({ label, score, maxScore, onClick, interpretation }: { label: string; score: string; maxScore: number; onClick: () => void; interpretation?: { label: string; color: string } }) {
  const hasScore = score !== ''
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${hasScore ? '#bfdbfe' : 'var(--border-color)'}`,
        background: hasScore ? '#eff6ff' : 'var(--secondary)',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: hasScore ? '#1e3a8a' : 'var(--text-main)' }}>
          {label}
        </div>
        {hasScore && interpretation ? (
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: interpretation.color, marginTop: 1 }}>{interpretation.label}</div>
        ) : (
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>Cliquer pour remplir le questionnaire</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {hasScore ? (
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: interpretation?.color ?? '#1e3a8a', letterSpacing: '-0.01em' }}>
            {score}<span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}> / {maxScore}</span>
          </span>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Remplir</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hasScore ? 'var(--primary)' : 'var(--text-muted)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </button>
  )
}

export const BilanGeriatrique = forwardRef<BilanGeriatriqueHandle, { initialData?: Record<string, unknown> }>(({ initialData }, ref) => {
  const _ctx    = (initialData?.contexte   as Record<string, unknown>) ?? {}
  const _chutes = (initialData?.chutes     as Record<string, unknown>) ?? {}
  const _rf     = (initialData?.redFlags   as Record<string, unknown>) ?? {}
  const _d      = (initialData?.douleur    as Record<string, unknown>) ?? {}
  const _yf     = (initialData?.yellowFlags as Record<string, unknown>) ?? {}
  const _ec     = (initialData?.examClinique as Record<string, unknown>) ?? {}
  const _mob    = (_ec.mobilite            as Record<string, unknown>) ?? {}
  const _t      = (initialData?.tests      as Record<string, unknown>) ?? {}
  const _ct     = (initialData?.contrat    as Record<string, unknown>) ?? {}

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.88rem',
    color: 'var(--text-main)', background: 'var(--secondary)',
    border: '1px solid transparent', borderRadius: 'var(--radius-md)', marginBottom: 0,
    boxSizing: 'border-box',
  }
  const numInputStyle: React.CSSProperties = { ...inputStyle, textAlign: 'center' }

  // ── Section 1 : Contexte ─────────────────────────────────────────────────
  const [lieuVie, setLieuVie] = useState((_ctx.lieuVie as string) ?? '')
  const [aidesTech, setAidesTech] = useState<string[]>(Array.isArray(_ctx.aidesTech) ? _ctx.aidesTech as string[] : [])
  const [aidesHum, setAidesHum] = useState<string[]>(Array.isArray(_ctx.aidesHum) ? _ctx.aidesHum as string[] : [])

  // ── Section 2 : Chutes + Red Flags ───────────────────────────────────────
  const [chutes12m, setChutes12m] = useState((_chutes.passees as string) ?? '')
  const [chutesNb, setChutesNb] = useState((_chutes.nombre as string) ?? '')
  const [chutesCirc, setChutesCirc] = useState((_chutes.circonstances as string) ?? '')
  const [peurTomber, setPeurTomber] = useState((_chutes.peurTomber as string) ?? '')

  const [rf, setRf] = useState<Record<string, string>>({
    pertePoids: '', troublesCognitifs: '', incontinence: '', hospitalisation: '', polymedication: '',
    ...(_rf as Record<string, string>),
  })

  // ── Section 3 : Douleur ──────────────────────────────────────────────────
  const [douleurLoc, setDouleurLoc] = useState((_d.localisation as string) ?? '')
  const [douleurLocSecondaire, setDouleurLocSecondaire] = useState((_d.localisationSecondaire as string) ?? '')
  const [evnRepos, setEvnRepos] = useState((_d.evnRepos as string) ?? '')
  const [evnMvt, setEvnMvt] = useState((_d.evnMvt as string) ?? '')
  const [echelle, setEchelle] = useState((_d.echelle as string) ?? 'EN')
  const [derouillage, setDerouillage] = useState((_d.derouillageMatinal as string) ?? '')
  const [derouillageDuree, setDerouillageDuree] = useState((_d.derouillageTemps as string) ?? '')

  // ── Section 4 : Yellow Flags + Scores psycho-sociaux ─────────────────────
  const [isolement, setIsolement] = useState((_yf.isolement as string) ?? '')
  const [fesI, setFesI] = useState((_yf.fesI as string) ?? '')
  const [fesIAnswers, setFesIAnswers] = useState<Record<string, number>>((_yf.fesIAnswers as Record<string, number>) ?? {})
  const [miniGds, setMiniGds] = useState((_yf.miniGds as string) ?? '')
  const [miniGdsAnswers, setMiniGdsAnswers] = useState<Record<string, number>>((_yf.miniGdsAnswers as Record<string, number>) ?? {})
  const [openFesI, setOpenFesI] = useState(false)
  const [openMiniGds, setOpenMiniGds] = useState(false)

  // ── Section 5 : Examen clinique ──────────────────────────────────────────
  const [morfho, setMorfho] = useState<string[]>(Array.isArray(_ec.morfho) ? _ec.morfho as string[] : [])
  const [mobEpaules, setMobEpaules] = useState((_mob.epaules as string) ?? '')
  const [mobHanchesGenoux, setMobHanchesGenoux] = useState((_mob.hanchesGenoux as string) ?? '')
  const [mobChevilles, setMobChevilles] = useState((_mob.chevilles as string) ?? '')

  // ── Section 6 : Tests fonctionnels gériatriques ──────────────────────────
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

  const sppbTotal = (() => {
    const e = Number(sppbEquilibre) || 0
    const v = Number(sppbVitesse) || 0
    const l = Number(sppbLever) || 0
    return (sppbEquilibre || sppbVitesse || sppbLever) ? e + v + l : null
  })()

  // ── Section 7 : Contrat kiné ─────────────────────────────────────────────
  const [objectifs, setObjectifs] = useState<Array<{id: number; titre: string; cible: string; dateCible: string}>>(
    Array.isArray(_ct.objectifs) ? _ct.objectifs as Array<{id: number; titre: string; cible: string; dateCible: string}>
    : typeof _ct.objectifs === 'string' && (_ct.objectifs as string).trim()
      ? [{ id: Date.now(), titre: (_ct.objectifs as string).trim(), cible: '', dateCible: '' }]
      : []
  )
  const [conseils, setConseils] = useState((_ct.conseils as string) ?? '')

  // ── Interpretation hints ─────────────────────────────────────────────────
  const tugRisk = tug !== '' && Number(tug) > 12
  const cinqLeverRisk = cinqLeverTime !== '' && Number(cinqLeverTime) > 15

  useImperativeHandle(ref, () => ({
    getData: () => ({
      contexte: { lieuVie, aidesTech, aidesHum },
      chutes: { passees: chutes12m, nombre: chutesNb, circonstances: chutesCirc, peurTomber },
      redFlags: rf,
      douleur: { localisation: douleurLoc, localisationSecondaire: douleurLocSecondaire, evnRepos, evnMvt, echelle, derouillageMatinal: derouillage, derouillageTemps: derouillageDuree },
      yellowFlags: { isolement, fesI, fesIAnswers, miniGds, miniGdsAnswers },
      examClinique: { morfho, mobilite: { epaules: mobEpaules, hanchesGenoux: mobHanchesGenoux, chevilles: mobChevilles } },
      tests: { tug, sppbEquilibre, sppbVitesse, sppbLever, sppbRawData, tinetti, tinettiAnswers, doubleTache, cinqLeverTime },
      scores: { sppbTotal: sppbTotal ?? '', fesI, miniGds, tinetti },
      contrat: { objectifs: objectifs.map(o => o.titre + (o.cible ? ` — ${o.cible}` : '')).join('\n'), objectifsItems: objectifs, conseils },
    }),
    setData: (data: Record<string, unknown>) => {
      const ctx   = (data.contexte     as Record<string, unknown>) ?? {}
      const chutes= (data.chutes       as Record<string, unknown>) ?? {}
      const rfd   = (data.redFlags     as Record<string, unknown>) ?? {}
      const d     = (data.douleur      as Record<string, unknown>) ?? {}
      const yfd   = (data.yellowFlags  as Record<string, unknown>) ?? {}
      const ec    = (data.examClinique as Record<string, unknown>) ?? {}
      const mob   = (ec.mobilite       as Record<string, unknown>) ?? {}
      const t     = (data.tests        as Record<string, unknown>) ?? {}
      const ct    = (data.contrat      as Record<string, unknown>) ?? {}
      if (ctx.lieuVie !== undefined)    setLieuVie(ctx.lieuVie as string)
      if (Array.isArray(ctx.aidesTech)) setAidesTech(ctx.aidesTech as string[])
      if (Array.isArray(ctx.aidesHum))  setAidesHum(ctx.aidesHum as string[])
      if (chutes.passees !== undefined)       setChutes12m(chutes.passees as string)
      if (chutes.nombre !== undefined)        setChutesNb(chutes.nombre as string)
      if (chutes.circonstances !== undefined) setChutesCirc(chutes.circonstances as string)
      if (chutes.peurTomber !== undefined)    setPeurTomber(chutes.peurTomber as string)
      if (Object.keys(rfd).length > 0) setRf(p => ({ ...p, ...rfd as Record<string, string> }))
      if (d.localisation !== undefined)           setDouleurLoc(d.localisation as string)
      if (d.localisationSecondaire !== undefined) setDouleurLocSecondaire(d.localisationSecondaire as string)
      if (d.evnRepos !== undefined)           setEvnRepos(d.evnRepos as string)
      if (d.evnMvt !== undefined)             setEvnMvt(d.evnMvt as string)
      if (d.echelle !== undefined)            setEchelle(d.echelle as string)
      if (d.derouillageMatinal !== undefined) setDerouillage(d.derouillageMatinal as string)
      if (d.derouillageTemps !== undefined)   setDerouillageDuree(d.derouillageTemps as string)
      if (yfd.isolement !== undefined) setIsolement(yfd.isolement as string)
      if (yfd.fesI !== undefined)      setFesI(yfd.fesI as string)
      if (yfd.fesIAnswers !== undefined) setFesIAnswers(yfd.fesIAnswers as Record<string, number>)
      if (yfd.miniGds !== undefined)   setMiniGds(yfd.miniGds as string)
      if (yfd.miniGdsAnswers !== undefined) setMiniGdsAnswers(yfd.miniGdsAnswers as Record<string, number>)
      if (Array.isArray(ec.morfho))    setMorfho(ec.morfho as string[])
      if (mob.epaules !== undefined)         setMobEpaules(mob.epaules as string)
      if (mob.hanchesGenoux !== undefined)   setMobHanchesGenoux(mob.hanchesGenoux as string)
      if (mob.chevilles !== undefined)       setMobChevilles(mob.chevilles as string)
      if (t.tug !== undefined)            setTug(t.tug as string)
      if (t.sppbEquilibre !== undefined)  setSppbEquilibre(t.sppbEquilibre as string)
      if (t.sppbVitesse !== undefined)    setSppbVitesse(t.sppbVitesse as string)
      if (t.sppbLever !== undefined)      setSppbLever(t.sppbLever as string)
      if (t.sppbRawData !== undefined)    setSppbRawData(t.sppbRawData as Record<string, unknown>)
      if (t.tinetti !== undefined)        setTinetti(t.tinetti as string)
      if (t.tinettiAnswers !== undefined) setTinettiAnswers(t.tinettiAnswers as Record<string, number>)
      if (t.doubleTache !== undefined)    setDoubleTache(t.doubleTache as string)
      if (t.cinqLeverTime !== undefined)  setCinqLeverTime(t.cinqLeverTime as string)
      if (ct.objectifsItems !== undefined) setObjectifs(ct.objectifsItems as Array<{id: number; titre: string; cible: string; dateCible: string}>)
      else if (typeof ct.objectifs === 'string' && (ct.objectifs as string).trim()) setObjectifs([{ id: Date.now(), titre: (ct.objectifs as string).trim(), cible: '', dateCible: '' }])
      if (ct.conseils !== undefined)   setConseils(ct.conseils as string)
    },
  }))

  const sublabel: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }
  const sectionGap = { marginBottom: 18 }

  return (
    <div>
      {/* Intro */}
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <p style={{ fontSize: '0.82rem', color: '#0369a1', margin: 0, fontWeight: 600 }}>
          Bilan Gériatrique — Évaluation de l'autonomie & risque de chute
        </p>
      </div>

      {/* ── 1. Contexte de vie ──────────────────────────────────────────── */}
      <div style={sectionGap}>
        <SectionTitle num="1" title="Contexte de vie" />
        <label style={sublabel}>Lieu de vie</label>
        <ChoixGroup options={['Domicile plain-pied', 'Domicile étages', 'Home Médicalisé', 'Résidence Autonomie']} value={lieuVie} onChange={setLieuVie} />
        <div style={{ marginTop: 10 }}>
          <label style={sublabel}>Aides techniques actuelles</label>
          <ChoixMulti options={['Aucune', 'Canne simple', 'Double canne', 'Déambulateur', 'Fauteuil']} values={aidesTech} onChange={setAidesTech} />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={sublabel}>Aides humaines</label>
          <ChoixMulti options={['Auxiliaire de vie', 'Famille', 'Infirmier(e)']} values={aidesHum} onChange={setAidesHum} />
        </div>
      </div>

      {/* ── 2. Chutes & Red Flags ───────────────────────────────────────── */}
      <div style={sectionGap}>
        <SectionTitle num="2" title="Chutes & Red Flags" color="#dc2626" />
        <OuiNon label="Chutes sur les 12 derniers mois ?" value={chutes12m} onChange={setChutes12m} />
        {chutes12m === 'oui' && (
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8, marginTop: 8 }}>
            <div>
              <label style={sublabel}>Nombre</label>
              <input type="number" min="0" value={chutesNb} onChange={e => setChutesNb(e.target.value)} style={numInputStyle} placeholder="ex: 2" />
            </div>
            <div>
              <label style={sublabel}>Circonstances</label>
              <input type="text" value={chutesCirc} onChange={e => setChutesCirc(e.target.value)} style={inputStyle} placeholder="Dans la salle de bain, la nuit…" />
            </div>
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <label style={sublabel}>Peur de tomber (syndrome post-chute)</label>
          <ChoixGroup options={['Nulle', 'Modérée', 'Majeure']} value={peurTomber} onChange={setPeurTomber} />
        </div>
        <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Red flags spécifiques gériatrie</div>
        <OuiNon label="Perte de poids involontaire récente (dénutrition)" value={rf.pertePoids} onChange={v => setRf(p => ({ ...p, pertePoids: v }))} />
        <OuiNon label="Troubles cognitifs connus (Alzheimer, démence)" value={rf.troublesCognitifs} onChange={v => setRf(p => ({ ...p, troublesCognitifs: v }))} />
        <OuiNon label="Incontinence récente" value={rf.incontinence} onChange={v => setRf(p => ({ ...p, incontinence: v }))} />
        <OuiNon label="Hospitalisation récente (< 3 mois)" value={rf.hospitalisation} onChange={v => setRf(p => ({ ...p, hospitalisation: v }))} />
        <OuiNon label="Polymédication (> 5 médicaments/jour)" value={rf.polymedication} onChange={v => setRf(p => ({ ...p, polymedication: v }))} />
      </div>

      {/* ── 3. Douleur ──────────────────────────────────────────────────── */}
      <div style={sectionGap}>
        <SectionTitle num="3" title="Douleur" />
        <label style={sublabel}>Localisation principale</label>
        <input type="text" value={douleurLoc} onChange={e => setDouleurLoc(e.target.value)} style={inputStyle} placeholder="Ex: Hanche droite, rachis lombaire…" />
        <div style={{ marginTop: 10 }}>
          <label style={sublabel}>Localisations secondaires</label>
          <textarea value={douleurLocSecondaire} onChange={e => setDouleurLocSecondaire(e.target.value)} rows={2}
            style={{ ...inputStyle, resize: 'vertical' }} placeholder="Autres zones douloureuses (genou gauche, épaule droite, nuque…)" />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={sublabel}>Échelle utilisée</label>
          <ChoixGroup options={['EN', 'EVA', 'Algoplus']} value={echelle} onChange={setEchelle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <div>
            <label style={sublabel}>Au repos</label>
            <input type="number" min="0" max="10" value={evnRepos} onChange={e => setEvnRepos(e.target.value)} style={numInputStyle} placeholder="0-10" />
          </div>
          <div>
            <label style={sublabel}>Au mouvement</label>
            <input type="number" min="0" max="10" value={evnMvt} onChange={e => setEvnMvt(e.target.value)} style={numInputStyle} placeholder="0-10" />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <OuiNon label="Dérouillage matinal" value={derouillage} onChange={setDerouillage} />
          {derouillage === 'oui' && (
            <input type="text" value={derouillageDuree} onChange={e => setDerouillageDuree(e.target.value)}
              style={{ ...inputStyle, marginTop: 6 }} placeholder="Durée (ex: 30 min)" />
          )}
        </div>
      </div>

      {/* ── 4. Yellow flags + scores psycho-sociaux ─────────────────────── */}
      <div style={sectionGap}>
        <SectionTitle num="4" title="Yellow flags & scores psycho-sociaux" color="#b45309" />
        <OuiNon label="Isolement social" value={isolement} onChange={setIsolement} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          <ScoreButton
            label="Échelle FES-I (peur de tomber) / 64"
            score={fesI}
            maxScore={64}
            onClick={() => setOpenFesI(true)}
            interpretation={fesI ? interpretFesI(Number(fesI)) : undefined}
          />
          <ScoreButton
            label="Mini GDS (dépression gériatrique) / 4"
            score={miniGds}
            maxScore={4}
            onClick={() => setOpenMiniGds(true)}
            interpretation={miniGds ? interpretMiniGds(Number(miniGds)) : undefined}
          />
        </div>
      </div>

      {/* ── 5. Examen clinique ──────────────────────────────────────────── */}
      <div style={sectionGap}>
        <SectionTitle num="5" title="Examen clinique & mobilité" />
        <label style={sublabel}>Morphostatique</label>
        <ChoixMulti options={['Hypercyphose dorsale', 'Flexum genoux', 'Flexum hanches']} values={morfho} onChange={setMorfho} />
        <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Mobilité articulaire — focus fonctionnel</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.1rem 0.75rem' }}>
          <MobInput label="Élévation épaules (habillage / placards)" value={mobEpaules} onChange={setMobEpaules} />
          <MobInput label="Flexion hanches/genoux (chaussage)" value={mobHanchesGenoux} onChange={setMobHanchesGenoux} />
          <MobInput label="Flexion dorsale chevilles (risque butée)" value={mobChevilles} onChange={setMobChevilles} />
        </div>
      </div>

      {/* ── 6. Tests fonctionnels gériatriques ──────────────────────────── */}
      <div style={sectionGap}>
        <SectionTitle num="6" title="Tests fonctionnels (5 piliers)" />

        {/* TUG */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ ...sublabel, marginBottom: 0, display: 'flex', alignItems: 'center' }}>
              Timed Up and Go (TUG)
              <InfoTest text="Le patient part assis sur une chaise avec accoudoirs, se lève, marche 3 mètres, tourne, revient et se rassoit. Chronométrer le temps total. > 12 sec = risque de chute significatif." />
            </label>
            {tugRisk && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626' }}>Risque de chute</span>}
          </div>
          <Chrono value={tug} onChange={setTug} />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Norme : &gt; 12 sec = risque de chute</div>
        </div>

        {/* SPPB */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ ...sublabel, marginBottom: 0, display: 'flex', alignItems: 'center' }}>
              SPPB — Short Physical Performance Battery
              <InfoTest text="Batterie de 3 tests : (1) équilibre debout (pieds joints, semi-tandem, tandem), (2) vitesse de marche 4 mètres, (3) 5 levers de chaise. Chaque sous-test est coté /4. Score total : &lt; 7 = fragilité, 7-9 = limité, ≥ 10 = bon." />
            </label>
          </div>
          <ScoreButton
            label={sppbTotal !== null ? 'SPPB — score total' : 'Lancer le test SPPB interactif'}
            score={sppbTotal !== null ? String(sppbTotal) : ''}
            maxScore={12}
            onClick={() => setOpenSppb(true)}
            interpretation={sppbTotal !== null ? (
              sppbTotal >= 10
                ? { label: 'Performance normale', color: '#16a34a' }
                : sppbTotal >= 7
                ? { label: 'Limitations modérées', color: '#f59e0b' }
                : { label: 'Fragilité', color: '#dc2626' }
            ) : undefined}
          />
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
        <div style={{ marginBottom: 12 }}>
          <label style={{ ...sublabel, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
            Test de Tinetti (équilibre + marche)
            <InfoTest text="Échelle d'équilibre et de marche en 16 items (9 équilibre + 7 marche), cotée /28. Évalue le risque de chute. ≥ 25 = faible risque, 20-24 = risque modéré, &lt; 20 = risque élevé." />
          </label>
          <ScoreButton
            label="Score Tinetti / 28"
            score={tinetti}
            maxScore={28}
            onClick={() => setOpenTinetti(true)}
            interpretation={tinetti ? interpretTinetti(Number(tinetti)) : undefined}
          />
        </div>

        {/* Double tâche */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ ...sublabel, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
            Double tâche (Walking While Talking)
            <InfoTest text="Demander au patient de marcher tout en menant une conversation (ex: compter à rebours depuis 20). Si le patient s'arrête de marcher pour parler → haut risque de chute (test « Stops walking when talking » positif)." />
          </label>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6 }}>Arrêt de la marche lors de la discussion ?</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className={`choix-btn${doubleTache === 'oui' ? ' active' : ''}`} onClick={() => setDoubleTache(doubleTache === 'oui' ? '' : 'oui')}
              style={doubleTache === 'oui' ? { background: '#fee2e2', color: '#991b1b', borderColor: '#fca5a5' } : undefined}>
              Oui — haut risque
            </button>
            <button className={`choix-btn${doubleTache === 'non' ? ' active' : ''}`} onClick={() => setDoubleTache(doubleTache === 'non' ? '' : 'non')}>
              Non
            </button>
          </div>
        </div>

        {/* 5 Lever de chaise */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ ...sublabel, marginBottom: 0, display: 'flex', alignItems: 'center' }}>
              5 Levers de chaise (chronométré)
              <InfoTest text="Patient assis bras croisés sur la poitrine. Chronométrer le temps pour effectuer 5 levers-assis consécutifs, le plus rapidement possible. Seuils : &lt; 12 sec = normal, 12-15 sec = limite, &gt; 15 sec = sarcopénie / risque de chute." />
            </label>
            {cinqLeverRisk && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626' }}>Sarcopénie</span>}
          </div>
          <Chrono value={cinqLeverTime} onChange={setCinqLeverTime} />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Seuil : &gt; 15 sec = risque de sarcopénie</div>
        </div>
      </div>

      {/* ── 7. Contrat kiné ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <SectionTitle num="7" title="Contrat kiné & objectifs SMART" />
        <SmartObjectifsInline objectifs={objectifs} onChange={setObjectifs} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary-dark)', display: 'block', marginBottom: 6 }}>Conseils au patient / aidants</label>
        <textarea
          value={conseils}
          onChange={e => setConseils(e.target.value)}
          style={{ ...inputStyle, resize: 'vertical' }}
          rows={3}
          placeholder="Aménagement du domicile, prévention chutes, nutrition…"
        />
      </div>

      {/* Questionnaire modals */}
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
          onValidate={(scores) => {
            setSppbEquilibre(scores.balance)
            setSppbVitesse(scores.gait)
            setSppbLever(scores.chair)
            setSppbRawData(scores.data)
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
