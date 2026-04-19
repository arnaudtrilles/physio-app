import { useState } from 'react'
import { generateAIPDF } from '../utils/pdfGenerator'

interface PDFPreviewProps {
  patient: { nom: string; prenom: string; dateNaissance: string }
  zone: string
  markdown: string
  pdfTitle?: string
  onBack: () => void
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return <>{parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}</>
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  return (
    <div>
      {lines.map((line, i) => {
        if (/^\s*#{1,2}\s*$/.test(line)) return null
        if (line.startsWith('### '))
          return <div key={i} style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', marginTop: 16, marginBottom: 8, padding: '6px 10px', background: 'var(--color-info-bg)', borderRadius: 6, borderLeft: '3px solid var(--primary)' }}>{renderBold(line.slice(4))}</div>
        if (line.startsWith('## '))
          return <div key={i} style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)', marginTop: 14, marginBottom: 6 }}>{renderBold(line.slice(3))}</div>
        if (line === '---')
          return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '10px 0' }} />
        if (line.startsWith('- **'))
          return <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '4px 0', lineHeight: 1.6, paddingLeft: 4 }}>{renderBold(line.slice(2))}</div>
        if (line.startsWith('- '))
          return <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '3px 0', lineHeight: 1.5, display: 'flex', gap: 6, paddingLeft: 4 }}><span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>•</span><span>{renderBold(line.slice(2))}</span></div>
        if (line.trim() === '') return <div key={i} style={{ height: 5 }} />
        return <p key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '4px 0', lineHeight: 1.55 }}>{renderBold(line)}</p>
      })}
    </div>
  )
}

export function PDFPreview({ patient, zone, markdown: initialMarkdown, pdfTitle, onBack }: PDFPreviewProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown)
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [exported, setExported] = useState(false)

  const handleExport = () => {
    generateAIPDF(patient, markdown, pdfTitle)
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  return (
    <div className="general-info-screen slide-in-left">
      <header className="screen-header">
        <button className="btn-back" aria-label="Retour" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="title-section" style={{ marginBottom: 0 }}>Aperçu du rapport</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{patient.prenom} {patient.nom} · {zone}</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setMode(mode === 'preview' ? 'edit' : 'preview')}
            style={{ padding: '4px 10px', borderRadius: 8, border: '1.5px solid var(--border-color)', background: mode === 'edit' ? 'var(--color-info-bg)' : 'white', color: mode === 'edit' ? 'var(--color-info)' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            {mode === 'preview' ? (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Modifier</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Aperçu</>
            )}
          </button>
        </div>
      </header>

      <div className="scroll-area" style={{ paddingBottom: '5.5rem' }}>
        {mode === 'preview' ? (
          <div className="ai-section-card fade-in">
            <MarkdownPreview markdown={markdown} />
          </div>
        ) : (
          <div className="fade-in">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Modifiez le texte ci-dessous. Le format Markdown est conservé pour le PDF.
            </div>
            <textarea
              value={markdown}
              onChange={e => setMarkdown(e.target.value)}
              style={{
                width: '100%', minHeight: '60vh', padding: '0.85rem',
                fontSize: '0.82rem', fontFamily: 'monospace', lineHeight: 1.6,
                color: 'var(--text-main)', background: 'var(--secondary)',
                border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <button
            onClick={handleExport}
            style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: exported ? 'var(--color-success-bg)' : 'linear-gradient(135deg, var(--primary), var(--accent))', border: exported ? '1.5px solid var(--color-success-border)' : 'none', color: exported ? 'var(--color-success-deeper)' : 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.3s' }}>
            {exported ? (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>PDF exporté</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Exporter en PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
