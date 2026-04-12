import { useState } from 'react'
import { jsPDF } from 'jspdf'
import type { FicheExercice, AnalyseIA, AICallAuditEntry } from '../types'
import { buildFicheExercicePrompt } from '../utils/clinicalPrompt'
import type { BilanContext } from '../utils/clinicalPrompt'
import { callGeminiSecure } from '../utils/geminiSecure'

interface FicheExerciceIAProps {
  apiKey: string
  context: BilanContext
  patientKey: string
  analyseIA?: AnalyseIA | null
  cached?: FicheExercice | null
  onAudit?: (entry: AICallAuditEntry) => void
  onResult: (fiche: FicheExercice) => void
  onBack: () => void
  onClose?: () => void
  onGoToProfile: () => void
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return <>{parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}</>
}

function MarkdownFiche({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  return (
    <div>
      {lines.map((line, i) => {
        if (/^\s*#{1,2}\s*$/.test(line)) return null
        if (line.startsWith('### ')) {
          return (
            <div key={i} style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary-dark)', marginTop: 20, marginBottom: 10 }}>
              {renderBold(line.slice(4))}
            </div>
          )
        }
        if (line.startsWith('#### ')) {
          return (
            <div key={i} style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e3a8a', marginTop: 18, marginBottom: 8, padding: '7px 12px', background: '#eff6ff', borderRadius: 8, borderLeft: '3px solid #2563eb' }}>
              {renderBold(line.slice(5))}
            </div>
          )
        }
        if (line === '---') {
          return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '14px 0' }} />
        }
        if (line.startsWith('- **') || line.startsWith('- ** ')) {
          return (
            <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '5px 0', lineHeight: 1.6, paddingLeft: 4 }}>
              {renderBold(line.slice(2))}
            </div>
          )
        }
        if (line.startsWith('- ')) {
          return (
            <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '4px 0', lineHeight: 1.5, display: 'flex', gap: 7, paddingLeft: 4 }}>
              <span style={{ color: 'var(--primary)', fontWeight: 700, flexShrink: 0 }}>•</span>
              <span>{renderBold(line.slice(2))}</span>
            </div>
          )
        }
        if (/^\s*>\s/.test(line)) {
          return (
            <div key={i} style={{ fontSize: '0.82rem', color: '#374151', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', margin: '3px 0 3px 12px', lineHeight: 1.55 }}>
              {renderBold(line.replace(/^\s*>\s*/, ''))}
            </div>
          )
        }
        if (/^\s*\d+\.\s/.test(line)) {
          return (
            <div key={i} style={{ fontSize: '0.83rem', color: '#374151', padding: '2px 0 2px 4px', lineHeight: 1.55 }}>
              {renderBold(line.trim())}
            </div>
          )
        }
        if (line.trim() === '') {
          return <div key={i} style={{ height: 6 }} />
        }
        return (
          <p key={i} style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '5px 0', lineHeight: 1.55 }}>
            {renderBold(line)}
          </p>
        )
      })}
    </div>
  )
}

export function FicheExerciceIA({ apiKey, context, patientKey, analyseIA, cached, onAudit, onResult, onBack, onClose, onGoToProfile }: FicheExerciceIAProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fiche, setFiche] = useState<FicheExercice | null>(cached ?? null)
  const [notesSeance, setNotesSeance] = useState(cached?.notesSeance ?? '')
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)


  const generate = async () => {
    if (!apiKey) return
    setLoading(true)
    setError(null)
    try {
      const systemPrompt = `Tu es un physiothérapeute expert en biomécanique et en rééducation fonctionnelle. Ton rôle est de traduire un plan de traitement technique en une fiche d'exercices à domicile claire, professionnelle et sécurisée.

Tu vas recevoir en entrée l'état actuel du patient ainsi que la demande du thérapeute dans la balise <notes_seance_actuelle>.
Si un historique patient est fourni dans la balise <historique_patient>, tu DOIS l'analyser attentivement pour adapter les exercices : évolution de la douleur, tolérance aux exercices précédents, observance, interventions réalisées, progression globale. Propose des exercices qui s'inscrivent dans la continuité du parcours de soin.

<regles_strictes>
1. Rédige en français courant mais professionnel. Pas de jargon inaccessible (dis "couché sur le dos" plutôt que "décubitus dorsal"), mais utilise les vrais noms des exercices de kinésithérapie (ex: "Rotation externe en décubitus latéral", "Flexion isométrique contre résistance", "Proprioception unipode sur plan instable", "Étirement capsulaire postérieur en cross-body").
2. Limite-toi à un MAXIMUM STRICT de 4 exercices pour garantir l'observance.
3. La sécurité est absolue : chaque exercice doit avoir une limite de douleur claire.
4. Adresse-toi directement au patient (utilise le "vous").
5. NE COMMENCE PAS par un mot d'encouragement, de félicitations ou de "bravo". Va directement aux exercices.
</regles_strictes>

Voici la structure EXACTE que ta réponse doit suivre en format Markdown :

### Programme d'exercices à domicile

---

#### 1. [Nom professionnel de l'exercice]
- **Objectif :** [Pourquoi on fait ça, en 1 phrase].
- **Position de départ :** [Comment bien s'installer].
- **Mouvement :**
  > 1. [Étape 1]
  > 2. [Étape 2]
- **Dosage :** [Séries] x [Répétitions] — Repos [Temps]. Fréquence : [ex: 1x/jour].
- **Limite de sécurité :** [Ex: Arrêtez si la douleur dépasse 3/10 ou si vous ressentez des fourmillements].

[Répéter pour l'exercice 2, 3 et 4 maximum]`

      const markdown = await callGeminiSecure({
        apiKey,
        systemPrompt,
        userPrompt: buildFicheExercicePrompt(context, notesSeance, analyseIA),
        maxOutputTokens: 8192,
        jsonMode: false,
        preferredModel: 'gemini-3.1-pro-preview',
        patient: { nom: context.patient.nom, prenom: context.patient.prenom, patientKey },
        category: 'fiche_exercice',
        onAudit,
      })
      if (!markdown.trim()) throw new Error('Réponse vide reçue')

      const result: FicheExercice = {
        generatedAt: new Date().toISOString(),
        markdown,
        notesSeance,
      }
      setFiche(result)
      onResult(result)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      if (msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) setError('quota')
      else if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403') || msg.includes('API key')) setError('auth')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!fiche) return
    try {
      await navigator.clipboard.writeText(fiche.markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const sanitize = (text: string): string =>
    text.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201C\u201D]/g, '"')
      .replace(/\u2013/g, '-').replace(/\u2014/g, '-').replace(/\u2026/g, '...')
      .replace(/\u00A0/g, ' ').replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
      .replace(/\u00B2/g, '2').replace(/\u00B3/g, '3')
      .replace(/\u2265/g, '>=').replace(/\u2264/g, '<=')

  const buildPDF = (): jsPDF => {
    const doc = new jsPDF()
    const W = 210
    const ML = 18
    const MR = 18
    const MW = W - ML - MR
    let y = 20
    const check = (need = 10) => { if (y + need > 282) { doc.addPage(); y = 20 } }
    const split = (text: string, maxW: number) => doc.splitTextToSize(sanitize(text), maxW)

    // Header vert
    doc.setFillColor(5, 150, 105)
    doc.rect(0, 0, W, 30, 'F')
    doc.setFillColor(4, 120, 87)
    doc.rect(0, 30, W, 1.5, 'F')
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(sanitize("FICHE D'EXERCICES A DOMICILE"), ML, 13)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(sanitize(`${context.patient.prenom} ${context.patient.nom}  ·  ${context.zone}`), ML, 22)
    const dateStr = new Date(fiche!.generatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    doc.text(sanitize(dateStr), W - MR - doc.getTextWidth(sanitize(dateStr)), 22)
    doc.setTextColor(31, 41, 55)
    y = 40

    // Parse markdown
    const lines = fiche!.markdown.split('\n')
    for (const line of lines) {
      if (/^\s*#{1,2}\s*$/.test(line)) continue
      if (line.startsWith('### ')) {
        y += 3
        check(12)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.setTextColor(5, 150, 105)
        const tl = split(line.slice(4), MW)
        for (const t of tl) { check(7); doc.text(t, ML, y); y += 6 }
        doc.setTextColor(31, 41, 55)
        y += 2
      } else if (line.startsWith('#### ')) {
        y += 3
        check(12)
        doc.setFillColor(240, 253, 244)
        doc.roundedRect(ML - 1, y - 6, MW + 2, 9, 1, 1, 'F')
        doc.setFillColor(5, 150, 105)
        doc.rect(ML - 1, y - 6, 2.5, 9, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(4, 120, 87)
        doc.text(sanitize(line.slice(5)), ML + 4, y)
        doc.setTextColor(31, 41, 55)
        y += 8
      } else if (line.trim() === '---') {
        check(5)
        doc.setDrawColor(229, 231, 235)
        doc.setLineWidth(0.3)
        doc.line(ML, y, W - MR, y)
        y += 4
      } else if (line.match(/^- \*\*(.+?)\*\*(.*)$/)) {
        const m = line.match(/^- \*\*(.+?)\*\*(.*)$/)!
        check(7)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9.5)
        const bullet = sanitize(`• ${m[1]}`)
        const bw = doc.getTextWidth(bullet)
        doc.text(bullet, ML + 4, y)
        if (m[2].trim()) {
          doc.setFont('helvetica', 'normal')
          const rest = split(m[2].trimStart(), MW - 4 - bw - 2)
          doc.text(rest[0] ?? '', ML + 4 + bw + 1, y)
          y += 5
          for (let r = 1; r < rest.length; r++) { check(5); doc.text(rest[r], ML + 4 + bw + 1, y); y += 4.5 }
        } else {
          y += 5
        }
      } else if (/^\s*>\s/.test(line)) {
        const text = line.replace(/^\s*>\s*/, '').replace(/\*\*(.+?)\*\*/g, '$1')
        check(7)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(75, 85, 99)
        const bl = split(text, MW - 12)
        for (const b of bl) { check(5); doc.text(b, ML + 10, y); y += 4.5 }
        doc.setTextColor(31, 41, 55)
        y += 1
      } else if (line.startsWith('- ')) {
        const text = line.replace(/^- /, '').replace(/\*\*(.+?)\*\*/g, '$1')
        check(7)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const bl = split(`• ${text}`, MW - 6)
        for (const b of bl) { check(5); doc.text(b, ML + 4, y); y += 4.5 }
        y += 1
      } else if (line.trim() === '') {
        y += 3
      } else {
        const text = line.replace(/\*\*(.+?)\*\*/g, '$1')
        if (text.trim()) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          const tl = split(text, MW)
          for (const t of tl) { check(5); doc.text(t, ML, y); y += 4.5 }
          y += 1
        }
      }
    }

    // Footer sur chaque page
    const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p)
      doc.setDrawColor(229, 231, 235)
      doc.setLineWidth(0.3)
      doc.line(ML, 286, W - MR, 286)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(107, 114, 128)
      doc.text(sanitize('Arretez en cas de douleur intense et contactez votre therapeute'), ML, 291)
      doc.text(`Page ${p}/${totalPages}`, W - MR - 18, 291)
      doc.setTextColor(31, 41, 55)
    }

    return doc
  }

  const handleExportPDF = () => {
    if (!fiche) return
    const doc = buildPDF()
    const safeName = (context.patient.nom || 'Anonyme').replace(/\s+/g, '_')
    const safeFirst = (context.patient.prenom || '').replace(/\s+/g, '_')
    const dateFile = new Date(fiche.generatedAt).toISOString().split('T')[0]
    doc.save(`Exercices_${safeName}_${safeFirst}_${dateFile}.pdf`)
  }

  const handleShare = async () => {
    if (!fiche) return
    const doc = buildPDF()
    const safeName = (context.patient.nom || 'Anonyme').replace(/\s+/g, '_')
    const safeFirst = (context.patient.prenom || '').replace(/\s+/g, '_')
    const dateFile = new Date(fiche.generatedAt).toISOString().split('T')[0]
    const filename = `Exercices_${safeName}_${safeFirst}_${dateFile}.pdf`
    const pdfBlob = doc.output('blob')
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' })

    // Try Web Share API with file (mobile)
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({ title: `Exercices — ${context.zone}`, files: [pdfFile] })
        setShared(true)
        setTimeout(() => setShared(false), 2000)
        return
      } catch { /* user cancelled or not supported */ }
    }
    // Fallback: télécharge le PDF
    try {
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className="general-info-screen slide-in-left">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="title-section" style={{ marginBottom: 0 }}>Fiche d'exercices</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{context.zone} · {context.patient.prenom} {context.patient.nom}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#16a34a' }}>Fiche</div>
          {onClose && (
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="scroll-area" style={{ paddingBottom: '5.5rem' }}>

        {/* Hero */}
        <div className="ai-hero" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
          <div className="ai-hero-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div className="ai-hero-text">
            <h4>Fiche d'exercices personnalisée</h4>
            <p>Programme à domicile adapté au patient, en langage simple. Maximum 4 exercices pour une observance optimale.</p>
          </div>
        </div>

        {/* No API key */}
        {!apiKey && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 20, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem', marginBottom: 8 }}>Clé API Gemini requise</div>
            <p style={{ fontSize: '0.85rem', color: '#78350f', margin: '0 0 14px', lineHeight: 1.5 }}>
              Configurez votre clé API Gemini dans votre profil pour générer la fiche d'exercices.
            </p>
            <button onClick={onGoToProfile} style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}>
              Configurer dans le Profil
            </button>
          </div>
        )}

        {/* Errors */}
        {error === 'quota' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Quota dépassé</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>Vérifiez votre compte Google AI Studio.</p>
          </div>
        )}
        {error === 'auth' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Clé API Gemini invalide</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: '0 0 10px' }}>Clé Gemini absente ou incorrecte (AIza...).</p>
            <button onClick={onGoToProfile} style={{ fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Configurer ma clé Gemini</button>
          </div>
        )}
        {error && error !== 'quota' && error !== 'auth' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Erreur</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>{error}</p>
            <button onClick={generate} style={{ marginTop: 8, fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Réessayer</button>
          </div>
        )}

        {/* Notes du thérapeute (saisie) */}
        {!fiche && apiKey && (
          <div className="ai-section-card">
            <div className="ai-section-header">
              <div className="ai-section-icon" style={{ background: '#f0fdf4' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <h4 style={{ color: '#166534' }}>Notes de séance</h4>
            </div>
            <div className="ai-section-body">
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Décrivez ce que vous avez travaillé ou ce que vous souhaitez prescrire. Laissez vide pour un programme automatique basé sur le diagnostic.
              </p>
              <textarea
                value={notesSeance}
                onChange={e => setNotesSeance(e.target.value)}
                rows={5}
                placeholder="Ex : Travail mobilisation active épaule, patient a bien toléré les exercices pendulaires. Prescrire renforcement coiffe des rotateurs léger + étirements capsulaires. Patient sportif — football 3x/semaine…"
                style={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.85rem', color: 'var(--text-main)', background: 'var(--secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
              />
            </div>
          </div>
        )}

        {/* Résultat */}
        {fiche && (
          <div className="fade-in-up">
            <div className="ai-section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Générée le {new Date(fiche.generatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleCopy}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--border-color)', background: copied ? '#f0fdf4' : 'white', color: copied ? '#16a34a' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {copied ? (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copié</>
                    ) : (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copier</>
                    )}
                  </button>
                  <button
                    onClick={handleExportPDF}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    PDF
                  </button>
                  <button
                    onClick={handleShare}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: '1.5px solid #c4b5fd', background: shared ? '#f5f3ff' : 'white', color: shared ? '#6d28d9' : '#6d28d9', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                    {shared ? (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Envoyé</>
                    ) : (
                      <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Partager</>
                    )}
                  </button>
                </div>
              </div>
              <MarkdownFiche markdown={fiche.markdown} />
            </div>
            <div className="ai-footer">
              <div className="ai-dot" />
              <p>Ces exercices sont personnalisés selon les données du bilan. Arrêtez en cas de douleur intense ou de symptôme inhabituel et contactez votre thérapeute.</p>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!fiche && !loading && apiKey && (
            <button className="btn-primary-luxe" style={{ marginBottom: 0, background: 'linear-gradient(135deg, #059669, #047857)' }} onClick={generate}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Générer la fiche d'exercices
              </div>
            </button>
          )}
          {loading && (
            <button className="btn-primary-luxe" disabled style={{ marginBottom: 0, opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg, #059669, #047857)' }}>
              <div className="spinner" />
              Génération en cours…
            </button>
          )}
          {fiche && !loading && (
            <>
              <button
                onClick={handleShare}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: shared ? '#f5f3ff' : 'linear-gradient(135deg, #6d28d9, #7c3aed)', border: shared ? '1.5px solid #c4b5fd' : 'none', color: shared ? '#6d28d9' : 'white', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                {shared ? 'Copié — prêt à envoyer au patient' : 'Envoyer au patient'}
              </button>
              <button
                onClick={handleExportPDF}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                Exporter en PDF
              </button>
              <button
                onClick={() => { setFiche(null); setNotesSeance(fiche.notesSeance) }}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
                Modifier les notes et regénérer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
