import { useEffect, useRef, useState } from 'react'

interface ChronoProps {
  value: string // stored as seconds string (ex: "12.5")
  onChange: (seconds: string) => void
  compact?: boolean
}

// ── Formatting helpers ────────────────────────────────────────────────────
function formatTime(ms: number): string {
  const totalS = ms / 1000
  if (totalS < 60) return totalS.toFixed(1).replace('.', ',') + 's'
  const m = Math.floor(totalS / 60)
  const s = (totalS % 60).toFixed(1)
  return `${m}:${s.padStart(4, '0')}`.replace('.', ',')
}

export function Chrono({ value, onChange, compact }: ChronoProps) {
  const [running, setRunning] = useState(false)
  const [ms, setMs] = useState(() => {
    const n = Number(value)
    return isNaN(n) ? 0 : n * 1000
  })
  const startRef = useRef<number>(0)
  const rafRef = useRef<number | null>(null)
  const baseRef = useRef<number>(0)

  useEffect(() => {
    // sync with external value when not running
    if (!running) {
      const n = Number(value)
      if (!isNaN(n)) setMs(n * 1000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (!running) return
    const tick = () => {
      setMs(baseRef.current + (performance.now() - startRef.current))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [running])

  const start = () => {
    baseRef.current = ms
    startRef.current = performance.now()
    setRunning(true)
  }

  const stop = () => {
    setRunning(false)
    const seconds = (ms / 1000).toFixed(1)
    onChange(seconds)
  }

  const reset = () => {
    setRunning(false)
    setMs(0)
    onChange('')
  }

  const handleManualEdit = (text: string) => {
    // Permettre la saisie manuelle quand le chrono est arrêté
    const cleaned = text.replace(',', '.')
    onChange(cleaned)
    const n = Number(cleaned)
    if (!isNaN(n)) setMs(n * 1000)
  }

  const display = formatTime(ms)
  const hasValue = ms > 0

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          flex: '0 0 auto', minWidth: 60,
          fontSize: '0.85rem', fontWeight: 700, color: running ? '#dc2626' : 'var(--primary-dark)',
          letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums',
          padding: '0.3rem 0.5rem', background: running ? '#fef2f2' : 'var(--secondary)',
          borderRadius: 6, textAlign: 'center', border: `1.5px solid ${running ? '#fca5a5' : 'transparent'}`,
        }}>
          {display}
        </div>
        {!running ? (
          <button
            type="button"
            onClick={start}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.45rem 0.8rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            {hasValue ? 'Reprendre' : 'Démarrer'}
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.45rem 0.8rem', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
            Arrêter
          </button>
        )}
        {hasValue && !running && (
          <button
            type="button"
            onClick={reset}
            title="Réinitialiser"
            style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Display + manual edit */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          fontSize: '1.4rem', fontWeight: 800, color: running ? '#dc2626' : 'var(--primary-dark)',
          letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', minWidth: 90,
          padding: '0.5rem 0.75rem', background: running ? '#fef2f2' : 'var(--secondary)',
          borderRadius: 10, textAlign: 'center',
          border: `2px solid ${running ? '#fca5a5' : 'transparent'}`,
        }}>
          {display}
        </div>
        {!running && (
          <input
            type="text"
            value={value}
            onChange={e => handleManualEdit(e.target.value)}
            placeholder="ou saisir…"
            style={{ width: 80, padding: '0.45rem 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'transparent', border: '1px dashed var(--border-color)', borderRadius: 6, textAlign: 'center' }}
          />
        )}
      </div>
      {/* Controls */}
      {!running ? (
        <button
          type="button"
          onClick={start}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(22,163,74,0.25)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          {hasValue ? 'Reprendre' : 'Démarrer'}
        </button>
      ) : (
        <button
          type="button"
          onClick={stop}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.6rem 1rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(220,38,38,0.25)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
          Arrêter
        </button>
      )}
      {hasValue && !running && (
        <button
          type="button"
          onClick={reset}
          title="Réinitialiser"
          style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
      )}
    </div>
  )
}
