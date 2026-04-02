import { useState, useImperativeHandle, forwardRef } from 'react'

export interface BilanGeneriqueHandle {
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

export const BilanGenerique = forwardRef<BilanGeneriqueHandle, { initialData?: Record<string, unknown> }>(({ initialData }, ref) => {
  const _d  = (initialData?.douleur     as Record<string, unknown>) ?? {}
  const _rf = (initialData?.redFlags    as Record<string, unknown>) ?? {}
  const _ec = (initialData?.examClinique as Record<string, unknown>) ?? {}
  const _t  = (initialData?.tests      as Record<string, unknown>) ?? {}
  const _sc = (initialData?.scores     as Record<string, unknown>) ?? {}
  const _ct = (initialData?.contrat    as Record<string, unknown>) ?? {}

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.92rem',
    color: 'var(--text-main)', background: 'var(--secondary)',
    border: '1px solid transparent', borderRadius: 'var(--radius-md)', marginBottom: 8,
  }

  const [evnPire, setEvnPire] = useState((_d.evnPire as string) ?? '')
  const [evnMieux, setEvnMieux] = useState((_d.evnMieux as string) ?? '')
  const [evnMoy, setEvnMoy] = useState((_d.evnMoy as string) ?? '')
  const [douleurType, setDouleurType] = useState((_d.douleurType as string) ?? '')
  const [nocturne, setNocturne] = useState((_d.nocturne as string) ?? '')

  const [rf, setRf] = useState<Record<string, string>>({
    tttMedical: '', antecedents: '', comorbidites: '', imageries: '', traumatisme: '', fievre: '', pertePoids: '', atcdCancer: '',
    ...(_rf as Record<string, string>),
  })

  const [examNotes, setExamNotes] = useState((_ec.notes as string) ?? '')
  const [testsNotes, setTestsNotes] = useState((_t.notes as string) ?? '')
  const [scoresNotes, setScoresNotes] = useState((_sc.notes as string) ?? '')
  const [objectifs, setObjectifs] = useState((_ct.objectifs as string) ?? '')
  const [conseils, setConseils] = useState((_ct.conseils as string) ?? '')

  useImperativeHandle(ref, () => ({
    getData: () => ({
      douleur: { evnPire, evnMieux, evnMoy, douleurType, nocturne },
      redFlags: rf,
      examClinique: { notes: examNotes },
      tests: { notes: testsNotes },
      scores: { notes: scoresNotes },
      contrat: { objectifs, conseils },
    }),
    setData: (data: Record<string, unknown>) => {
      const d  = (data.douleur      as Record<string, unknown>) ?? {}
      const rf = (data.redFlags     as Record<string, unknown>) ?? {}
      const ec = (data.examClinique as Record<string, unknown>) ?? {}
      const t  = (data.tests       as Record<string, unknown>) ?? {}
      const sc = (data.scores      as Record<string, unknown>) ?? {}
      const ct = (data.contrat     as Record<string, unknown>) ?? {}
      if (d.evnPire !== undefined)     setEvnPire(d.evnPire as string)
      if (d.evnMieux !== undefined)    setEvnMieux(d.evnMieux as string)
      if (d.evnMoy !== undefined)      setEvnMoy(d.evnMoy as string)
      if (d.douleurType !== undefined) setDouleurType(d.douleurType as string)
      if (d.nocturne !== undefined)    setNocturne(d.nocturne as string)
      if (Object.keys(rf).length > 0)  setRf(p => ({ ...p, ...rf as Record<string, string> }))
      if (ec.notes !== undefined)      setExamNotes(ec.notes as string)
      if (t.notes !== undefined)       setTestsNotes(t.notes as string)
      if (sc.notes !== undefined)      setScoresNotes(sc.notes as string)
      if (ct.objectifs !== undefined)  setObjectifs(ct.objectifs as string)
      if (ct.conseils !== undefined)   setConseils(ct.conseils as string)
    },
  }))

  return (
    <div>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <p style={{ fontSize: '0.82rem', color: '#1d4ed8', margin: 0, fontWeight: 600 }}>
          Bilan générique — Zone non spécialisée
        </p>
        <p style={{ fontSize: '0.78rem', color: '#3b82f6', margin: '4px 0 0' }}>
          Utilisez les champs libres pour documenter l'examen clinique.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 10, fontSize: '0.95rem' }}>Douleur</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[['EVN Pire', evnPire, setEvnPire], ['EVN Mieux', evnMieux, setEvnMieux], ['EVN Moy.', evnMoy, setEvnMoy]].map(([lbl, val, setter]) => (
            <div key={lbl as string}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{lbl as string}</label>
              <input type="number" min="0" max="10" value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)}
                style={{ ...inputStyle, textAlign: 'center', marginBottom: 0 }} placeholder="0-10" />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {['Constante', 'Intermittente'].map(v => (
            <button key={v} className={`choix-btn${douleurType === v ? ' active' : ''}`} onClick={() => setDouleurType(douleurType === v ? '' : v)}>{v}</button>
          ))}
        </div>
        <OuiNon label="Douleur nocturne" value={nocturne} onChange={setNocturne} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 8, fontSize: '0.95rem' }}>Red Flags</div>
        {[['tttMedical','TTT médical actuel'],['antecedents','Antécédents'],['comorbidites','Comorbidités'],
          ['imageries','Imagerie(s)'],['traumatisme','Traumatisme récent'],['fievre','Fièvre inexpliquée'],
          ['pertePoids','Perte de poids inexpliquée'],['atcdCancer','ATCD de cancer']].map(([k, lbl]) => (
          <OuiNon key={k} label={lbl} value={rf[k]} onChange={v => setRf(p => ({ ...p, [k]: v }))} />
        ))}
      </div>

      {[
        ['Examen clinique', examNotes, setExamNotes, 'Morphostatique, mobilités, palpation…'],
        ['Tests spécifiques', testsNotes, setTestsNotes, 'Tests effectués et résultats…'],
        ['Scores / mesures', scoresNotes, setScoresNotes, 'PSFS, HAD, DN4, autres…'],
        ['Objectifs & contrat', objectifs, setObjectifs, 'Objectifs SMART, auto-rééducation…'],
        ['Conseils', conseils, setConseils, 'Recommandations au patient…'],
      ].map(([lbl, val, setter, placeholder]) => (
        <div key={lbl as string} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary-dark)', display: 'block', marginBottom: 6 }}>{lbl as string}</label>
          <textarea
            value={val as string}
            onChange={e => (setter as (v: string) => void)(e.target.value)}
            style={{ ...inputStyle, resize: 'vertical', marginBottom: 0 }}
            rows={3}
            placeholder={placeholder as string}
          />
        </div>
      ))}
    </div>
  )
})

BilanGenerique.displayName = 'BilanGenerique'
