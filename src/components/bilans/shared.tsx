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
  background: active ? '#dcfce7' : 'transparent',
  color: active ? '#166534' : 'var(--text-muted)',
  borderRadius: '4px 0 0 4px',
})
const btnIncomplet = (active: boolean): React.CSSProperties => ({
  ...btnBase,
  background: active ? '#fff7ed' : 'transparent',
  color: active ? '#92400e' : 'var(--text-muted)',
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
// ─── OuiNon ────────────────────────────────────────────────────────────────
export function OuiNon({ label, value, onChange, detail, onDetailChange }: { label: string; value: string; onChange: (v: string) => void; detail?: string; onDetailChange?: (v: string) => void }) {
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

// ─── SectionHeader ─────────────────────────────────────────────────────────
export function SectionHeader({ title, open, onToggle, color = 'var(--primary)', badge }: { title: string; open: boolean; onToggle: () => void; color?: string; badge?: 'noyau' | 'approfondissement' }) {
  return (
    <button className="bilan-collapsible-header" onClick={onToggle}>
      <span className="bilan-collapsible-title" style={{ color }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
        {title}
        {badge === 'approfondissement' && (
          <span style={{ marginLeft: 8, fontSize: '0.62rem', fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: '#f1f5f9', color: '#64748b', letterSpacing: '0.03em', textTransform: 'uppercase' }}>Approfondir</span>
        )}
      </span>
      <svg className={`bilan-collapsible-chevron${open ? ' open' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
  )
}

// ─── BilanModeToggle ───────────────────────────────────────────────────────
// Toggle "Mode Noyau" (EBP minimum) / "Mode Complet" en haut du bilan.
// Le mode Noyau par défaut masque les sections/champs d'approfondissement
// pour un bilan rapide (~10-15 min) aligné sur les Clinical Practice Guidelines.
export function BilanModeToggle({ coreMode, onChange }: { coreMode: boolean; onChange: (core: boolean) => void }) {
  const btn = (active: boolean, side: 'left' | 'right'): React.CSSProperties => ({
    flex: 1,
    padding: '0.55rem 0.8rem',
    fontSize: '0.78rem',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--primary)' : 'transparent',
    color: active ? 'white' : 'var(--text-muted)',
    borderRadius: side === 'left' ? '8px 0 0 8px' : '0 8px 8px 0',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  })
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', border: '1.5px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
        <button onClick={() => onChange(true)} style={btn(coreMode, 'left')} title="Bilan minimum EBP (~10-15 min)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Noyau EBP
        </button>
        <button onClick={() => onChange(false)} style={btn(!coreMode, 'right')} title="Bilan détaillé complet">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Complet
        </button>
      </div>
      {coreMode && (
        <div style={{ marginTop: 6, fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
          Noyau minimum aligné EBP — les sections d'approfondissement sont masquées.
        </div>
      )}
    </div>
  )
}

// ─── ScoreRow ──────────────────────────────────────────────────────────────
export interface ScoreRowResult {
  display?: string
  interpretation?: string
  subscores?: Record<string, number | string>
  color?: 'green' | 'orange' | 'red' | 'gray'
}

export function ScoreRow({ label, value, onChange, onOpenQuestionnaire, result }: {
  label: string
  value: string
  onChange: (v: string) => void
  onOpenQuestionnaire?: () => void
  result?: ScoreRowResult
}) {
  const colorFor = (c?: string): string =>
    c === 'green' ? '#059669' : c === 'orange' ? '#d97706' : c === 'red' ? '#dc2626' : 'var(--text-muted)'

  const hasResult = result && (result.display || result.interpretation || result.subscores)

  return (
    <div style={{ borderBottom: hasResult ? '1px solid var(--border-color)' : undefined, paddingBottom: hasResult ? 8 : 0, marginBottom: hasResult ? 6 : 0 }}>
      <div className="oui-non-group" style={{ borderBottom: 'none', marginBottom: 0 }}>
        <span className="oui-non-label" style={{ fontSize: '0.85rem' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!hasResult && (
            <input value={value} onChange={e => onChange(e.target.value)}
              style={{ width: 80, textAlign: 'right', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', fontSize: '0.9rem', color: 'var(--text-main)', padding: '0.1rem 0.3rem' }} placeholder="—" />
          )}
          {onOpenQuestionnaire && (
            <button
              onClick={onOpenQuestionnaire}
              title="Remplir le questionnaire interactif"
              style={{
                background: hasResult ? 'var(--secondary)' : 'var(--primary)',
                color: hasResult ? 'var(--primary)' : 'white',
                border: hasResult ? '1px solid var(--primary)' : 'none',
                borderRadius: 6, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, lineHeight: 1,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
              </svg>
              {hasResult ? 'Modifier' : 'Remplir'}
            </button>
          )}
        </div>
      </div>
      {hasResult && (
        <div style={{ marginTop: 6, paddingLeft: 2 }}>
          {result?.display && (
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: colorFor(result.color), fontVariantNumeric: 'tabular-nums' }}>
              {result.display}
            </div>
          )}
          {result?.interpretation && (
            <div style={{ fontSize: '0.7rem', color: colorFor(result.color), marginTop: 1 }}>
              {result.interpretation}
            </div>
          )}
          {result?.subscores && Object.keys(result.subscores).length > 0 && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
              {Object.entries(result.subscores).map(([k, v]) => (
                <span key={k} style={{ display: 'inline-block', marginRight: 8 }}>
                  <strong style={{ fontWeight: 600 }}>{k}:</strong> {v}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── EVA Slider (0-10, always) ─────────────────────────────────────────────
// Single source of truth for pain intensity input everywhere in the app.
// Label defaults to "EVA"; compact mode for CompareRow-like grids.
export function EVASlider({
  label = 'EVA', value, onChange, compact = false, disabled = false,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  compact?: boolean
  disabled?: boolean
}) {
  const num = value === '' ? null : Number(value)
  const display = num == null || isNaN(num) ? '—' : String(num)
  const color = num == null || isNaN(num) ? 'var(--text-muted)'
    : num === 0 ? '#16a34a'
    : num <= 3 ? '#65a30d'
    : num <= 5 ? '#ca8a04'
    : num <= 7 ? '#ea580c'
    : '#dc2626'

  return (
    <div style={{ marginBottom: compact ? 0 : 10 }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? 2 : 4 }}>
          <span style={{ fontSize: compact ? '0.7rem' : '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
          <span style={{ fontSize: compact ? '0.85rem' : '1.05rem', fontWeight: 800, color, minWidth: 24, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {display}<span style={{ fontSize: '0.6em', fontWeight: 600, color: 'var(--text-muted)', marginLeft: 2 }}>/10</span>
          </span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={num == null || isNaN(num) ? 0 : num}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{ flex: 1, accentColor: color, cursor: disabled ? 'not-allowed' : 'pointer' }}
        />
        {value !== '' && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Effacer"
            style={{
              flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
              border: '1px solid var(--border-color)', background: 'white',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >×</button>
        )}
      </div>
    </div>
  )
}

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
