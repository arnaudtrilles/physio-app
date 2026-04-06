import { useState } from 'react'
import { Chrono } from './Chrono'

// ── SPPB scoring formulas ─────────────────────────────────────────────────
// Balance score (0-4):
// - pieds joints < 10s → 0
// - pieds joints 10s + semi-tandem < 10s → 1
// - pieds joints 10s + semi-tandem 10s + tandem 0-2s → 2
// - pieds joints 10s + semi-tandem 10s + tandem 3-9.99s → 3
// - pieds joints 10s + semi-tandem 10s + tandem ≥ 10s → 4
export function scoreBalance(piedsJoints10s: boolean | null, semiTandem10s: boolean | null, tandemSec: number | null): number | null {
  if (piedsJoints10s === null) return null
  if (!piedsJoints10s) return 0
  if (semiTandem10s === null) return null
  if (!semiTandem10s) return 1
  if (tandemSec === null) return null
  if (tandemSec < 3) return 2
  if (tandemSec < 10) return 3
  return 4
}

// Gait speed score on 4 meters (0-4, based on best of 2 trials in seconds)
export function scoreGait(seconds: number | null): number | null {
  if (seconds === null || seconds <= 0) return null
  if (seconds > 8.70) return 1
  if (seconds > 6.20) return 2
  if (seconds > 4.82) return 3
  return 4
}

// Chair rise score (0-4, based on time for 5 rises)
export function scoreChairRise(seconds: number | null, unable: boolean): number | null {
  if (unable) return 0
  if (seconds === null || seconds <= 0) return null
  if (seconds > 60) return 0
  if (seconds > 16.7) return 1
  if (seconds > 13.7) return 2
  if (seconds > 11.2) return 3
  return 4
}

interface SPPBInteractiveModalProps {
  initialBalance?: string
  initialGait?: string
  initialChair?: string
  // raw data storage
  initialData?: {
    piedsJoints10s?: boolean | null
    semiTandem10s?: boolean | null
    tandemSec?: string
    gaitSec?: string
    chairSec?: string
    chairUnable?: boolean
  }
  onValidate: (scores: { balance: string; gait: string; chair: string; data: Record<string, unknown> }) => void
  onClose: () => void
}

function Step({ num, title, children, active }: { num: number; title: string; children: React.ReactNode; active: boolean }) {
  return (
    <div style={{
      border: `1.5px solid ${active ? '#bfdbfe' : 'var(--border-color)'}`,
      borderRadius: 10,
      padding: '12px 12px 14px',
      background: active ? '#f8fafc' : 'white',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          background: active ? '#2563eb' : 'var(--secondary)',
          color: active ? 'white' : 'var(--text-muted)',
          fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{num}</span>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)' }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function YesNoTimed({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0.35rem 0' }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', flex: 1 }}>{label}</span>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        <button type="button" onClick={() => onChange(true)}
          style={{ padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${value === true ? '#86efac' : 'var(--border-color)'}`, background: value === true ? '#f0fdf4' : 'white', color: value === true ? '#16a34a' : 'var(--text-main)', fontSize: '0.78rem', fontWeight: value === true ? 700 : 500, cursor: 'pointer' }}>
          Tenu 10s
        </button>
        <button type="button" onClick={() => onChange(false)}
          style={{ padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${value === false ? '#fca5a5' : 'var(--border-color)'}`, background: value === false ? '#fef2f2' : 'white', color: value === false ? '#dc2626' : 'var(--text-main)', fontSize: '0.78rem', fontWeight: value === false ? 700 : 500, cursor: 'pointer' }}>
          Non / &lt; 10s
        </button>
      </div>
    </div>
  )
}

function ScorePill({ score, label }: { score: number | null; label: string }) {
  if (score === null) return (
    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
  )
  const color = score === 4 ? '#16a34a' : score >= 2 ? '#f59e0b' : '#dc2626'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', fontWeight: 700, color }}>
      {label} : {score}/4
    </span>
  )
}

export function SPPBInteractiveModal({ initialData = {}, onValidate, onClose }: SPPBInteractiveModalProps) {
  // Balance
  const [piedsJoints10s, setPiedsJoints10s] = useState<boolean | null>(initialData.piedsJoints10s ?? null)
  const [semiTandem10s, setSemiTandem10s] = useState<boolean | null>(initialData.semiTandem10s ?? null)
  const [tandemSec, setTandemSec] = useState<string>(initialData.tandemSec ?? '')
  // Gait (best of 2)
  const [gaitSec, setGaitSec] = useState<string>(initialData.gaitSec ?? '')
  // Chair
  const [chairSec, setChairSec] = useState<string>(initialData.chairSec ?? '')
  const [chairUnable, setChairUnable] = useState<boolean>(initialData.chairUnable ?? false)

  const balanceScore = scoreBalance(
    piedsJoints10s,
    semiTandem10s,
    tandemSec !== '' ? Number(tandemSec) : null
  )
  const gaitScore = scoreGait(gaitSec !== '' ? Number(gaitSec) : null)
  const chairScore = scoreChairRise(chairSec !== '' ? Number(chairSec) : null, chairUnable)

  const total = (balanceScore ?? 0) + (gaitScore ?? 0) + (chairScore ?? 0)
  const allSet = balanceScore !== null && gaitScore !== null && chairScore !== null
  const totalColor = allSet ? (total >= 10 ? '#16a34a' : total >= 7 ? '#f59e0b' : '#dc2626') : 'var(--text-muted)'

  const handleValidate = () => {
    onValidate({
      balance: balanceScore !== null ? String(balanceScore) : '',
      gait: gaitScore !== null ? String(gaitScore) : '',
      chair: chairScore !== null ? String(chairScore) : '',
      data: { piedsJoints10s, semiTandem10s, tandemSec, gaitSec, chairSec, chairUnable },
    })
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 12, boxSizing: 'border-box',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, maxHeight: '92vh',
          background: 'white', borderRadius: 14, boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>SPPB — Short Physical Performance Battery</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>3 tests · score /12 · calcul automatique</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"
            style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--secondary)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {/* 1. Balance */}
          <Step num={1} title="Équilibre (3 positions, 10s chacune)" active>
            <YesNoTimed label="Pieds joints" value={piedsJoints10s} onChange={setPiedsJoints10s} />
            {piedsJoints10s === true && (
              <YesNoTimed label="Semi-tandem" value={semiTandem10s} onChange={setSemiTandem10s} />
            )}
            {semiTandem10s === true && (
              <div style={{ padding: '0.35rem 0' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: 6 }}>Tandem — durée tenue</div>
                <Chrono value={tandemSec} onChange={setTandemSec} compact />
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>0-2s : 2pts · 3-9s : 3pts · ≥10s : 4pts</div>
              </div>
            )}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e2e8f0', textAlign: 'right' }}>
              <ScorePill score={balanceScore} label="Score équilibre" />
            </div>
          </Step>

          {/* 2. Gait */}
          <Step num={2} title="Vitesse de marche (4 mètres, meilleur de 2 essais)" active>
            <Chrono value={gaitSec} onChange={setGaitSec} compact />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>&lt;4,82s : 4pts · 4,82-6,20s : 3pts · 6,21-8,70s : 2pts · &gt;8,70s : 1pt</div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e2e8f0', textAlign: 'right' }}>
              <ScorePill score={gaitScore} label="Score vitesse" />
            </div>
          </Step>

          {/* 3. Chair rise */}
          <Step num={3} title="5 levers de chaise (sans les bras)" active>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input type="checkbox" checked={chairUnable} onChange={e => setChairUnable(e.target.checked)} style={{ accentColor: '#dc2626' }} />
                Incapable de se lever sans les bras
              </label>
            </div>
            {!chairUnable && (
              <>
                <Chrono value={chairSec} onChange={setChairSec} compact />
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>&lt;11,2s : 4pts · 11,2-13,6s : 3pts · 13,7-16,6s : 2pts · &gt;16,7s : 1pt · &gt;60s : 0pt</div>
              </>
            )}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e2e8f0', textAlign: 'right' }}>
              <ScorePill score={chairScore} label="Score lever chaise" />
            </div>
          </Step>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: 'white' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: totalColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {allSet ? total : '—'} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>/ 12</span>
            </div>
            {allSet && (
              <div style={{ fontSize: 10.5, fontWeight: 600, color: totalColor, marginTop: 2 }}>
                {total >= 10 ? 'Performance normale' : total >= 7 ? 'Limitations modérées' : 'Fragilité'}
              </div>
            )}
          </div>
          <button type="button" onClick={handleValidate} disabled={!allSet}
            style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: allSet ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : 'var(--secondary)', color: allSet ? 'white' : 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: allSet ? 'pointer' : 'not-allowed' }}>
            Valider
          </button>
        </div>
      </div>
    </div>
  )
}
