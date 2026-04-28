import { memo, useState } from 'react'
import { generateAIPDF, type AIReportPraticien } from '../utils/pdfGenerator'

interface PDFPreviewProps {
  patient: { nom: string; prenom: string; dateNaissance: string; sexe?: 'masculin' | 'feminin' }
  zone: string
  markdown: string
  pdfTitle?: string
  praticien?: AIReportPraticien
  /** Titre du bloc signature (défaut "10. Signature"). null = pas de titre. */
  signatureTitle?: string | null
  /** Préfixe nom de fichier PDF. Défaut "Bilan_Physiotherapie". */
  filenamePrefix?: string
  onBack: () => void
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return <>{parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}</>
}

const isTableRow = (l: string) => /^\s*\|(.+)\|\s*$/.test(l)
const isTableSep = (l: string) => /^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/.test(l)
const splitRow = (l: string): string[] =>
  l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())

function GFMTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const n = headers.length
  const chronoWeights = n === 4 ? [12, 22, 8, 58] : Array(n).fill(Math.round(100 / n))
  const centered = new Set<number>(n === 4 ? [0, 2] : [])
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', margin: '10px 0', fontSize: '0.8rem', tableLayout: 'fixed' }}>
      <thead>
        <tr style={{ background: '#eff6ff' }}>
          {headers.map((h, i) => (
            <th key={i} style={{ width: `${chronoWeights[i]}%`, padding: '6px 8px', textAlign: centered.has(i) ? 'center' : 'left', color: '#1e3a8a', fontWeight: 700, fontSize: '0.78rem', borderBottom: '1px solid #e0e0e0' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: ri % 2 === 0 ? '#fafafa' : 'transparent' }}>
            {row.map((cell, i) => (
              <td key={i} style={{ padding: '6px 8px', textAlign: centered.has(i) ? 'center' : 'left', color: 'var(--text-main)', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top', lineHeight: 1.4, wordBreak: 'break-word' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Table GFM : header + séparateur + rows
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headers = splitRow(line)
      const rows: string[][] = []
      let j = i + 2
      while (j < lines.length && isTableRow(lines[j])) {
        rows.push(splitRow(lines[j]))
        j++
      }
      nodes.push(<GFMTable key={`t-${i}`} headers={headers} rows={rows} />)
      i = j
      continue
    }

    if (/^\s*#{1,2}(\s|$)/.test(line) && !line.startsWith('### ')) { i++; continue }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { i++; continue }

    if (line.startsWith('### ')) {
      nodes.push(<div key={i} style={{ fontWeight: 800, fontSize: '1rem', color: '#1e3a8a', marginTop: 16, marginBottom: 8, padding: '6px 10px', background: '#eff6ff', borderRadius: 6, borderLeft: '3px solid #1e3a8a' }}>{renderBold(line.slice(4))}</div>)
    } else if (line.startsWith('## ')) {
      nodes.push(<div key={i} style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e3a8a', marginTop: 14, marginBottom: 6 }}>{renderBold(line.slice(3))}</div>)
    } else if (line.startsWith('- **')) {
      // Pattern "- **Titre** détail" : titre sur sa propre ligne, détail dessous
      // en paragraphe (miroir du rendu jsPDF, voir pdfGenerator.ts § Option A).
      const m = line.match(/^- \*\*(.+?)\*\*(.*)$/)
      if (m) {
        const title = m[1].trim()
        const detail = m[2].replace(/^\s*[—:–-]\s*/, '').trim()
        nodes.push(
          <div key={i} style={{ margin: '8px 0 6px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 700, lineHeight: 1.5 }}>{title}</div>
            {detail ? <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.55, marginTop: 2 }}>{renderBold(detail)}</div> : null}
          </div>
        )
      } else {
        nodes.push(<div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '4px 0', lineHeight: 1.6 }}>{renderBold(line.slice(2))}</div>)
      }
    } else if (line.startsWith('- ')) {
      // Puce simple avec hanging indent propre : la puce sort à gauche, le texte
      // s'aligne et toutes les lignes wrappées partagent la même marge gauche
      // (flex sans wrap explicite mais avec contraintes flexShrink/min-width).
      nodes.push(
        <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '3px 0', lineHeight: 1.55, display: 'flex', gap: 6, paddingLeft: 4 }}>
          <span style={{ color: '#1e3a8a', fontWeight: 700, flexShrink: 0, lineHeight: 1.55 }}>•</span>
          <span style={{ flex: 1, minWidth: 0 }}>{renderBold(line.slice(2))}</span>
        </div>
      )
    } else if (line.trim() === '') {
      nodes.push(<div key={i} style={{ height: 5 }} />)
    } else {
      nodes.push(<p key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '4px 0', lineHeight: 1.55 }}>{renderBold(line)}</p>)
    }
    i++
  }
  return <div>{nodes}</div>
}

export const PDFPreview = memo(function PDFPreview({ patient, zone, markdown: initialMarkdown, pdfTitle, praticien, signatureTitle, filenamePrefix, onBack }: PDFPreviewProps) {
  const [markdown, setMarkdown] = useState(initialMarkdown)
  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [exported, setExported] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    if (exporting) return
    setExporting(true)
    // setTimeout 0 : laisse React peindre le spinner avant le travail synchrone de jsPDF.
    setTimeout(() => {
      try {
        generateAIPDF(patient, markdown, pdfTitle, praticien, { signatureTitle, filenamePrefix })
        setExported(true)
        setTimeout(() => setExported(false), 3000)
      } finally {
        setExporting(false)
      }
    }, 0)
  }

  return (
    <div className="general-info-screen slide-in-left">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="title-section" style={{ marginBottom: 0 }}>Aperçu du rapport</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{patient.prenom} {patient.nom} · {zone}</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setMode(mode === 'preview' ? 'edit' : 'preview')}
            style={{ padding: '4px 10px', borderRadius: 8, border: '1.5px solid var(--border-color)', background: mode === 'edit' ? '#eff6ff' : 'white', color: mode === 'edit' ? '#1d4ed8' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
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
            {praticien && (praticien.nom || praticien.prenom || praticien.profession) ? (
              <div style={{ marginTop: 18 }}>
                {(signatureTitle === undefined ? '10. Signature' : signatureTitle) ? (
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e3a8a', marginTop: 16, marginBottom: 8, padding: '6px 10px', background: '#eff6ff', borderRadius: 6, borderLeft: '3px solid #1e3a8a' }}>
                    {signatureTitle === undefined ? '10. Signature' : signatureTitle}
                  </div>
                ) : null}
                <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6 }}>
                  <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    {(praticien.ville ?? '').toUpperCase()}{praticien.ville ? ', le ' : 'Le '}{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                  <div style={{ fontWeight: 700, color: '#1e3a8a', marginTop: 6 }}>{`${praticien.prenom ?? ''} ${praticien.nom ?? ''}`.trim() || '—'}</div>
                  {praticien.profession ? <div>{praticien.profession}</div> : null}
                  {(praticien.codePostal || praticien.ville) ? <div style={{ color: 'var(--text-muted)' }}>{`${praticien.codePostal ?? ''} ${praticien.ville ?? ''}`.trim()}</div> : null}
                  {praticien.telephone ? <div style={{ color: 'var(--text-muted)' }}>Tél : {praticien.telephone}</div> : null}
                </div>
              </div>
            ) : null}
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
            disabled={exporting}
            style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: exported ? '#f0fdf4' : 'linear-gradient(135deg, #1e3a8a, #2563eb)', border: exported ? '1.5px solid #bbf7d0' : 'none', color: exported ? '#15803d' : 'white', fontWeight: 700, fontSize: '0.95rem', cursor: exporting ? 'wait' : 'pointer', opacity: exporting ? 0.75 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.3s' }}>
            {exporting ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} />Génération en cours…</>
            ) : exported ? (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>PDF exporté</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Exporter en PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
})
