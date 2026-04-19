import { memo } from 'react'
import type { BilanRecord } from '../types'

// ---------------------------------------------------------------------------
// Deterministic extractor — reads fields from bilanData
// ---------------------------------------------------------------------------

function getObj(data: Record<string, unknown> | undefined, key: string): Record<string, unknown> | undefined {
  if (!data) return undefined
  const v = data[key]
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined
}

function isPositive(v: unknown): boolean {
  return v === 'oui' || v === true || v === 'Oui' || v === 'OUI'
}

function prettyFlag(key: string): string {
  return key
    .replace(/_detail$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim()
}

function positiveFlagsList(obj: Record<string, unknown> | undefined, max = 3): string[] {
  if (!obj) return []
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (k.endsWith('_detail')) continue
    if (isPositive(v)) out.push(prettyFlag(k))
    if (out.length >= max) break
  }
  return out
}

function positiveTests(obj: Record<string, unknown> | undefined, max = 3): string[] {
  if (!obj) return []
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (k.endsWith('_detail') || k === 'notes') continue
    const s = typeof v === 'string' ? v.toLowerCase() : ''
    if (s === 'positif' || s === 'oui' || s === '+' || v === true) {
      out.push(prettyFlag(k))
    }
    if (out.length >= max) break
  }
  return out
}

function scoresSummary(obj: Record<string, unknown> | undefined, max = 2): Array<{ label: string; value: string }> {
  if (!obj) return []
  const out: Array<{ label: string; value: string }> = []
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === '') continue
    if (typeof v === 'object') continue
    out.push({ label: prettyFlag(k), value: String(v) })
    if (out.length >= max) break
  }
  return out
}

interface ExtractedSummary {
  diagnostic: string | null
  zone: string | null
  evnPire: string | null
  evnMoy: string | null
  douleurType: string | null
  douleurNocturne: boolean
  redFlags: string[]
  yellowFlags: string[]
  testsPositifs: string[]
  scores: Array<{ label: string; value: string }>
  objectifs: string | null
  priseEnChargePhases: string[]
  alertes: string[]
}

function extractSummary(record: BilanRecord): ExtractedSummary {
  const data = record.bilanData
  const douleur = getObj(data, 'douleur')
  const tc = getObj(data, 'troncCommun')
  const evn = getObj(tc, 'evn')
  const redFlags = getObj(data, 'redFlags')
  const yellowFlags = getObj(data, 'yellowFlags')
  const tests = getObj(data, 'tests')
  const scores = getObj(data, 'scores')
  const contrat = getObj(data, 'contrat') ?? getObj(data, 'contratKine')

  const evnPire = (douleur?.evnPire ?? evn?.pireActuel) as string | number | undefined
  const evnMoy = (douleur?.evnMoy ?? evn?.moyActuel) as string | number | undefined

  const objectifs = (contrat?.objectifs ?? contrat?.objectifsSMART) as string | undefined

  return {
    diagnostic: record.analyseIA?.diagnostic?.titre ?? null,
    zone: record.zone ?? null,
    evnPire: evnPire != null && evnPire !== '' ? String(evnPire) : null,
    evnMoy: evnMoy != null && evnMoy !== '' ? String(evnMoy) : null,
    douleurType: (douleur?.douleurType as string) || null,
    douleurNocturne: isPositive(douleur?.douleurNocturne),
    redFlags: positiveFlagsList(redFlags),
    yellowFlags: positiveFlagsList(yellowFlags, 2),
    testsPositifs: positiveTests(tests),
    scores: scoresSummary(scores),
    objectifs: objectifs && objectifs.trim() ? objectifs.trim() : null,
    priseEnChargePhases: record.analyseIA?.priseEnCharge?.map(p => p.titre) ?? [],
    alertes: record.analyseIA?.alertes ?? [],
  }
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.45 }}>
      <div style={{ flexShrink: 0, width: 78, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, color: '#0f172a', minWidth: 0 }}>{children}</div>
    </div>
  )
}

interface BilanResumeModalProps {
  record: BilanRecord
  bilanNum: number
  onClose: () => void
}

export const BilanResumeModal = memo(function BilanResumeModal({ record, bilanNum, onClose }: BilanResumeModalProps) {
  const s = extractSummary(record)

  const hasContent = s.evnPire || s.evnMoy || s.douleurType || s.redFlags.length > 0 ||
    s.yellowFlags.length > 0 || s.testsPositifs.length > 0 || s.scores.length > 0 ||
    s.objectifs || s.priseEnChargePhases.length > 0 || s.alertes.length > 0

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, boxSizing: 'border-box',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400, maxHeight: '85vh', overflowY: 'auto',
          background: 'white', borderRadius: 14, boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', borderBottom: '1px solid #f1f5f9',
          position: 'sticky', top: 0, background: 'white', zIndex: 1,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: '#eff6ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Résumé · Bilan N°{bilanNum}
              {record.customLabel ? ` — ${record.customLabel}` : ''}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              {record.dateBilan}{s.zone ? ` · ${s.zone}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: 'var(--secondary)', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {s.diagnostic && (
            <div style={{
              background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
              padding: '8px 10px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                Diagnostic
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.35 }}>
                {s.diagnostic}
              </div>
            </div>
          )}

          {!hasContent && !s.diagnostic && (
            <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Aucune donnée clinique à afficher.
            </div>
          )}

          {(s.evnPire || s.evnMoy || s.douleurType || s.douleurNocturne) && (
            <Row label="Douleur">
              <span>
                {s.evnPire && <>EVN pire <strong>{s.evnPire}</strong></>}
                {s.evnMoy && <> · moy <strong>{s.evnMoy}</strong></>}
                {s.douleurType && <> · {s.douleurType}</>}
                {s.douleurNocturne && <> · nocturne</>}
              </span>
            </Row>
          )}

          {s.redFlags.length > 0 && (
            <Row label="Red flags">
              <span style={{ color: '#be123c', fontWeight: 600 }}>{s.redFlags.join(', ')}</span>
            </Row>
          )}

          {s.yellowFlags.length > 0 && (
            <Row label="Yellow flags">
              <span style={{ color: '#b45309', fontWeight: 600 }}>{s.yellowFlags.join(', ')}</span>
            </Row>
          )}

          {s.testsPositifs.length > 0 && (
            <Row label="Tests +">
              {s.testsPositifs.join(', ')}
            </Row>
          )}

          {s.scores.length > 0 && (
            <Row label="Scores">
              {s.scores.map((sc, i) => (
                <span key={i}>
                  {i > 0 && ' · '}
                  {sc.label} <strong>{sc.value}</strong>
                </span>
              ))}
            </Row>
          )}

          {s.objectifs && (
            <Row label="Objectifs">
              {s.objectifs}
            </Row>
          )}

          {s.priseEnChargePhases.length > 0 && (
            <Row label="Plan PEC">
              <ul style={{ margin: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {s.priseEnChargePhases.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </Row>
          )}

          {s.alertes.length > 0 && (
            <div style={{
              background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8,
              padding: '6px 10px', marginTop: 2,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#be123c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                Alertes
              </div>
              {s.alertes.map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: '#9f1239', lineHeight: 1.4 }}>• {a}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
