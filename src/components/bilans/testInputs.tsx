import { TestInfoButton } from './testInfo/TestInfoButton'
import { lblStyle } from './bilanSections'

// ─── Shared result parsing (backward-compatible with legacy free text) ───────
// Storage : JSON string { status: '+'|'-'|'', details: string }
// Legacy free text is parsed as { status: '', details: <text> }

export interface TestResult {
  status: '' | '+' | '-'
  details: string
}

export function parseTestResult(value: string | undefined): TestResult {
  if (!value) return { status: '', details: '' }
  if (value.startsWith('{')) {
    try {
      const obj = JSON.parse(value)
      if (obj && typeof obj === 'object') {
        const status = obj.status === '+' || obj.status === '-' ? obj.status : ''
        return { status, details: typeof obj.details === 'string' ? obj.details : '' }
      }
    } catch { /* fall through */ }
  }
  return { status: '', details: value }
}

export function stringifyTestResult(r: TestResult): string {
  if (!r.status && !r.details) return ''
  return JSON.stringify({ status: r.status, details: r.details })
}

// ─── TestResultInput ─────────────────────────────────────────────────────────
// Row with label (+ optional info button), +/- buttons and free-text details.
export function TestResultInput({
  label, testKey, value, onChange, placeholder,
}: {
  label: string
  testKey?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const parsed = parseTestResult(value)
  const setStatus = (s: '+' | '-') => {
    const next = parsed.status === s ? '' : s
    onChange(stringifyTestResult({ status: next, details: parsed.details }))
  }
  const setDetails = (d: string) => {
    onChange(stringifyTestResult({ status: parsed.status, details: d }))
  }
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={lblStyle}>
        {label}
        {testKey && <TestInfoButton testKey={testKey} />}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setStatus('+')}
            style={{
              padding: '5px 14px', fontSize: '0.78rem', fontWeight: 700,
              border: `1.5px solid ${parsed.status === '+' ? '#fca5a5' : 'var(--border-color)'}`,
              borderRadius: 6, cursor: 'pointer',
              background: parsed.status === '+' ? '#fee2e2' : 'transparent',
              color: parsed.status === '+' ? '#991b1b' : 'var(--text-muted)',
              minWidth: 44,
            }}
          >+</button>
          <button
            type="button"
            onClick={() => setStatus('-')}
            style={{
              padding: '5px 14px', fontSize: '0.78rem', fontWeight: 700,
              border: `1.5px solid ${parsed.status === '-' ? '#86efac' : 'var(--border-color)'}`,
              borderRadius: 6, cursor: 'pointer',
              background: parsed.status === '-' ? '#dcfce7' : 'transparent',
              color: parsed.status === '-' ? '#166534' : 'var(--text-muted)',
              minWidth: 44,
            }}
          >−</button>
        </div>
        <input
          type="text"
          value={parsed.details}
          onChange={e => setDetails(e.target.value)}
          placeholder={placeholder ?? 'Précisions (amplitude, reproduction, côté…)'}
          style={{
            flex: 1, minWidth: 140,
            padding: '0.5rem 0.7rem', fontSize: '0.82rem', color: 'var(--text-main)',
            background: 'var(--secondary)', border: '1px solid var(--border-color)',
            borderRadius: 8, boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}

// ─── Cluster Laslett ─────────────────────────────────────────────────────────
// Stored as JSON: { subtests: { [key]: '+'|'-'|'' }, notes?: string }
// Cluster positive = ≥ 3 sub-tests positive. 5/5 = suspect inflammatory component.

const LASLETT_SUBTESTS: { key: string; label: string }[] = [
  { key: 'distraction',  label: 'Distraction (gapping)' },
  { key: 'compression',  label: 'Compression' },
  { key: 'thighThrust',  label: 'Thigh Thrust (P4 — poussée fémorale)' },
  { key: 'sacralThrust', label: 'Sacral Thrust (poussée sacrée)' },
  { key: 'gaenslen',     label: 'Gaenslen' },
]

export interface ClusterState {
  subtests: Record<string, '' | '+' | '-'>
  notes: string
}

function parseCluster(value: string | undefined): ClusterState {
  if (!value) return { subtests: {}, notes: '' }
  if (value.startsWith('{')) {
    try {
      const obj = JSON.parse(value)
      if (obj && typeof obj === 'object') {
        return {
          subtests: (obj.subtests ?? {}) as Record<string, '' | '+' | '-'>,
          notes: typeof obj.notes === 'string' ? obj.notes : '',
        }
      }
    } catch { /* fall through */ }
  }
  return { subtests: {}, notes: value }
}

function stringifyCluster(s: ClusterState): string {
  const hasAny = Object.values(s.subtests).some(v => v === '+' || v === '-') || s.notes
  if (!hasAny) return ''
  return JSON.stringify(s)
}

export function ClusterLaslettInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const state = parseCluster(value)

  const setSub = (k: string, s: '+' | '-') => {
    const current = state.subtests[k] ?? ''
    const next = current === s ? '' : s
    onChange(stringifyCluster({ ...state, subtests: { ...state.subtests, [k]: next } }))
  }
  const setNotes = (n: string) => {
    onChange(stringifyCluster({ ...state, notes: n }))
  }

  const positives = LASLETT_SUBTESTS.filter(s => state.subtests[s.key] === '+').length
  const negatives = LASLETT_SUBTESTS.filter(s => state.subtests[s.key] === '-').length
  const evaluated = positives + negatives
  const allEvaluated = evaluated === LASLETT_SUBTESTS.length
  const isPositive = positives >= 3
  const isInflammatory = positives === 5

  const resultColor = isInflammatory ? '#991b1b' : isPositive ? '#92400e' : allEvaluated ? '#166534' : 'var(--text-muted)'
  const resultBg    = isInflammatory ? '#fef2f2' : isPositive ? '#fef3c7' : allEvaluated ? '#dcfce7' : 'var(--secondary)'
  const resultBorder = isInflammatory ? '#fca5a5' : isPositive ? '#fcd34d' : allEvaluated ? '#86efac' : 'var(--border-color)'

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={lblStyle}>
        Cluster de Laslett (SIJ)
        <TestInfoButton testKey="clusterLaslett" />
      </label>
      <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 12px', background: 'var(--surface)' }}>
        {LASLETT_SUBTESTS.map(st => {
          const v = state.subtests[st.key] ?? ''
          return (
            <div key={st.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', flex: 1 }}>{st.label}</span>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setSub(st.key, '+')}
                  style={{
                    padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700,
                    border: `1.5px solid ${v === '+' ? '#fca5a5' : 'var(--border-color)'}`,
                    borderRadius: 6, cursor: 'pointer',
                    background: v === '+' ? '#fee2e2' : 'transparent',
                    color: v === '+' ? '#991b1b' : 'var(--text-muted)',
                    minWidth: 36,
                  }}
                >+</button>
                <button
                  type="button"
                  onClick={() => setSub(st.key, '-')}
                  style={{
                    padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700,
                    border: `1.5px solid ${v === '-' ? '#86efac' : 'var(--border-color)'}`,
                    borderRadius: 6, cursor: 'pointer',
                    background: v === '-' ? '#dcfce7' : 'transparent',
                    color: v === '-' ? '#166534' : 'var(--text-muted)',
                    minWidth: 36,
                  }}
                >−</button>
              </div>
            </div>
          )
        })}

        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 8,
          background: resultBg, border: `1px solid ${resultBorder}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: resultColor }}>
              {positives}/5 sous-tests positifs
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: resultColor, letterSpacing: '0.02em' }}>
              {isInflammatory ? 'POSITIF (5/5)' : isPositive ? 'POSITIF' : allEvaluated ? 'NÉGATIF' : 'INCOMPLET'}
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: resultColor, marginTop: 3, lineHeight: 1.4 }}>
            {isInflammatory
              ? '⚠️ 5/5 positifs — suspecter une composante inflammatoire (spondylarthrite, sacro-iliite).'
              : isPositive
                ? 'Cluster positif (≥ 3/5) — orientation vers une origine sacro-iliaque.'
                : allEvaluated
                  ? 'Cluster non positif (< 3/5) — origine SIJ peu probable.'
                  : 'Seuil : ≥ 3/5 positifs = cluster positif · 5/5 = suspecter inflammatoire.'}
          </div>
        </div>

        <input
          type="text"
          value={state.notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (côté, reproduction précise…)"
          style={{
            marginTop: 8, width: '100%',
            padding: '0.45rem 0.7rem', fontSize: '0.78rem', color: 'var(--text-main)',
            background: 'var(--secondary)', border: '1px solid var(--border-color)',
            borderRadius: 8, boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  )
}
