import { memo } from 'react'
import type { BilanRecord } from '../types'

// ---------------------------------------------------------------------------
// Extraction strictement déterministe — uniquement ce que le thérapeute a saisi.
// Aucune lecture de `record.analyseIA` (qui contient des inférences IA).
// Source : record.compteRendu.data (reformulation des champs sans inférence)
// + record.diagnosticPhysio (diagnostic libre du thérapeute).
// ---------------------------------------------------------------------------

interface ResumeData {
  hypothese: string | null
  plan: string[]
  conseils: string[]
}

// Tronque à ~ 2 lignes (≈ 110 caractères pour un item de puce) avec ellipse propre.
function trim2lines(text: string, max = 110): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
}

function extractResume(record: BilanRecord): ResumeData {
  const data = record.compteRendu?.data
  const hypothesesPraticien = data?.projetTherapeutique?.hypothesesPraticien?.trim() || ''
  const diagnosticPhysio = record.diagnosticPhysio?.trim() || ''
  const hypothese = diagnosticPhysio || hypothesesPraticien

  const plan = (data?.projetTherapeutique?.techniquesRealisees ?? [])
    .map(s => (typeof s === 'string' ? trim2lines(s) : ''))
    .filter(Boolean)

  const conseils: string[] = []
  for (const c of data?.conseilsPatient?.educationTherapeutique ?? []) {
    if (typeof c === 'string' && c.trim()) conseils.push(trim2lines(c))
  }
  for (const ex of data?.conseilsPatient?.exercicesEnseignes ?? []) {
    if (!ex || typeof ex !== 'object') continue
    const nom = typeof ex.nom === 'string' ? ex.nom.trim() : ''
    if (nom) conseils.push(trim2lines(nom))
  }

  return {
    hypothese: hypothese ? trim2lines(hypothese, 140) : null,
    plan,
    conseils,
  }
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

interface BilanResumeModalProps {
  record: BilanRecord
  bilanNum: number
  onClose: () => void
}

export const BilanResumeModal = memo(function BilanResumeModal({ record, bilanNum, onClose }: BilanResumeModalProps) {
  const r = extractResume(record)
  const hasContent = !!(r.hypothese || r.plan.length > 0 || r.conseils.length > 0)

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
          width: '100%', maxWidth: 380, maxHeight: '85vh', overflowY: 'auto',
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
            width: 30, height: 30, borderRadius: 8, background: 'var(--info-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              {record.dateBilan}{record.zone ? ` · ${record.zone}` : ''}
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
        <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!hasContent && (
            <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>
              Rien n'a été renseigné dans le bilan pour ces sections (hypothèse, plan, conseils).
            </div>
          )}

          {r.hypothese && (
            <Section title="Hypothèse">
              <p style={{ margin: 0 }}>{r.hypothese}</p>
            </Section>
          )}
          {r.plan.length > 0 && (
            <Section title="Plan de prise en charge">
              <BulletList items={r.plan} />
            </Section>
          )}
          {r.conseils.length > 0 && (
            <Section title="Conseils donnés">
              <BulletList items={r.conseils} />
            </Section>
          )}
        </div>
      </div>
    </div>
  )
})

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--primary)',
        textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3,
      }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: '#0f172a', lineHeight: 1.4 }}>
        {children}
      </div>
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {items.map((t, i) => (
        <li key={i} style={{ lineHeight: 1.4 }}>{t}</li>
      ))}
    </ul>
  )
}
