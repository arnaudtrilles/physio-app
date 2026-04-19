import { useState } from 'react'

// ─── MRC scale description ─────────────────────────────────────────────────
const MRC_DESCRIPTIONS = [
  { grade: '0',  desc: 'Aucune contraction musculaire' },
  { grade: '1',  desc: 'Trace de contraction, pas de mouvement' },
  { grade: '2',  desc: 'Mouvement possible sans gravité' },
  { grade: '3',  desc: 'Mouvement complet contre gravité' },
  { grade: '3+', desc: 'Contre gravité avec légère résistance' },
  { grade: '4-', desc: 'Résistance légère' },
  { grade: '4',  desc: 'Contre résistance modérée' },
  { grade: '4+', desc: 'Résistance modérée à forte' },
  { grade: '5',  desc: 'Force normale (complet)' },
]

export const MRC_GRADES = ['0', '1', '2', '3', '3+', '4-', '4', '4+']

// ─── MRC info tooltip ──────────────────────────────────────────────────────
export function MRCInfo() {
  const [visible, setVisible] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle', marginLeft: 6 }}>
      <button
        onClick={() => setVisible(v => !v)}
        style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--primary)', background: visible ? 'var(--primary)' : 'transparent', color: visible ? 'white' : 'var(--primary)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0, flexShrink: 0 }}
        aria-label="Échelle MRC"
      >
        i
      </button>
      {visible && (
        <div
          onClick={() => setVisible(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998, background: 'rgba(0,0,0,0.15)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(15,23,42,0.72)', borderRadius: 14, padding: '1rem 1.25rem', zIndex: 9999, minWidth: 260, maxWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            <div style={{ fontWeight: 700, color: 'white', fontSize: '0.82rem', marginBottom: '0.6rem', letterSpacing: '0.04em' }}>Échelle MRC</div>
            {MRC_DESCRIPTIONS.map(({ grade, desc }) => (
              <div key={grade} style={{ display: 'flex', gap: 8, marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, color: '#93c5fd', minWidth: 24, fontSize: '0.78rem' }}>{grade}</span>
                <span style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.78rem', lineHeight: 1.4 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  )
}

// ─── Toggle styles ─────────────────────────────────────────────────────────
const btnBase: React.CSSProperties = {
  padding: '2px 7px', fontSize: '0.68rem', fontWeight: 700, border: 'none', cursor: 'pointer', lineHeight: '16px',
}
const btnComplet = (active: boolean): React.CSSProperties => ({
  ...btnBase,
  background: active ? 'var(--color-success-bg2)' : 'transparent',
  color: active ? 'var(--color-success-dark)' : 'var(--text-muted)',
  borderRadius: '4px 0 0 4px',
})
const btnIncomplet = (active: boolean): React.CSSProperties => ({
  ...btnBase,
  background: active ? 'var(--color-orange-bg)' : 'transparent',
  color: active ? 'var(--color-warning-dark)' : 'var(--text-muted)',
  borderRadius: '0 4px 4px 0',
})

// ─── AmplitudeInput ────────────────────────────────────────────────────────
// value: '' = neutral, 'complet' = complet, anything else = incomplet + text
export function AmplitudeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isComplet = value === 'complet'
  const [iMode, setIMode] = useState(value !== '' && value !== 'complet')

  const clickC = () => {
    if (isComplet) { onChange(''); setIMode(false) }
    else { onChange('complet'); setIMode(false) }
  }
  const clickI = () => {
    if (iMode) { onChange(''); setIMode(false) }
    else { if (isComplet) onChange(''); setIMode(true) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
      <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
        <button onClick={clickC} style={btnComplet(isComplet)}>C</button>
        <button onClick={clickI} style={btnIncomplet(iMode)}>I</button>
      </div>
      {iMode && (
        <input
          value={isComplet ? '' : value}
          onChange={e => onChange(e.target.value)}
          placeholder="ex: 45°"
          style={{ width: 64, fontSize: '0.78rem', color: 'var(--text-main)', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', padding: '1px 4px', outline: 'none' }}
          autoFocus
        />
      )}
    </div>
  )
}

// ─── ForceInput ────────────────────────────────────────────────────────────
// value: '' = neutral, 'complet' = MRC 5, '0'/'1'/'2'/'3'/'3+'/'4-'/'4'/'4+' = grade
export function ForceInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isComplet = value === 'complet'
  const [iMode, setIMode] = useState(value !== '' && value !== 'complet')

  const clickC = () => {
    if (isComplet) { onChange(''); setIMode(false) }
    else { onChange('complet'); setIMode(false) }
  }
  const clickI = () => {
    if (iMode) { onChange(''); setIMode(false) }
    else { if (isComplet) onChange(''); setIMode(true) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap' }}>
      <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
        <button onClick={clickC} style={btnComplet(isComplet)}>C</button>
        <button onClick={clickI} style={btnIncomplet(iMode)}>I</button>
      </div>
      {iMode && (
        <select
          value={isComplet ? '' : value}
          onChange={e => onChange(e.target.value)}
          style={{ fontSize: '0.78rem', color: 'var(--text-main)', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', padding: '1px 2px', outline: 'none', cursor: 'pointer' }}
          autoFocus
        >
          <option value="">—</option>
          {MRC_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      )}
    </div>
  )
}
