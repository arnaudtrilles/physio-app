import { useState, useRef, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import { DictableTextarea } from './VoiceMic'
import type { FicheExercice, AICallAuditEntry } from '../types'
import { buildFicheExercicePrompt, roleTitle } from '../utils/clinicalPrompt'
import type { BilanContext } from '../utils/clinicalPrompt'
import { callClaudeSecure } from '../utils/claudeSecure'

interface FicheExerciceIAProps {
  apiKey: string
  context: BilanContext
  patientKey: string
  profession?: string
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

export function FicheExerciceIA({ apiKey, context, patientKey, profession, cached, onAudit, onResult, onBack, onClose, onGoToProfile }: FicheExerciceIAProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fiche, setFiche] = useState<FicheExercice | null>(cached ?? null)
  const [notesSeance, setNotesSeance] = useState(cached?.notesSeance ?? '')
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)

  // Cleanup : annule les setTimeout des feedbacks copied/shared après unmount
  const isMountedRef = useRef(true)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sharedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      if (sharedTimerRef.current) clearTimeout(sharedTimerRef.current)
    }
  }, [])


  const generate = async () => {
    if (!apiKey) return
    if (!notesSeance.trim()) return
    setLoading(true)
    setError(null)
    try {
      const isPhysio = /physio/i.test(profession ?? '')
      const role = roleTitle(profession)
      const metier = isPhysio ? 'physiothérapie' : 'kinésithérapie'
      const titreInterdit = isPhysio ? 'kinésithérapeute' : 'physiothérapeute'
      const metierInterdit = isPhysio ? 'kinésithérapie' : 'physiothérapie'
      // DM-pivot (2026-04-30) : assistant rédactionnel, pas expert clinique.
      // L'IA décrit techniquement les exercices listés par le ${role}. Elle
      // n'invente rien, ne recommande rien, ne juge rien, ne fait aucune
      // référence au patient (pathologie, diagnostic, antécédents, âge).
      const systemPrompt = `Tu es un assistant rédactionnel pour ${role}. Ton rôle est UNIQUEMENT de rédiger la description technique d'exercices que le ${role} a déjà choisis pour son patient. Tu ne crées AUCUN exercice, tu ne recommandes RIEN, tu ne juges RIEN.

Tu vas recevoir dans la balise <exercices_a_decrire> la liste des exercices que le ${role} a sélectionnés. Pour CHACUN des exercices listés, tu rédiges la fiche technique selon la structure ci-dessous, dans l'ordre fourni.

<regles_strictes>
1. Tu décris UNIQUEMENT les exercices listés. Tu n'en ajoutes pas, tu n'en remplaces pas, tu n'en supprimes pas. Si la formulation d'un exercice est ambiguë, tu le décris selon l'interprétation la plus standard sans proposer d'alternative.
2. Tu ne fais AUCUNE référence à : pathologie du patient, diagnostic, antécédents, âge, niveau, objectif thérapeutique individuel. Le ${role} a déjà fait ce raisonnement clinique en amont.
3. Tu n'utilises JAMAIS les formulations « je recommande », « il est conseillé », « selon votre pathologie », « vu votre cas », « adapté à votre situation ». Tu décris l'exercice de façon neutre et générique.
4. La rubrique « Objectif » décrit l'effet GÉNÉRIQUE du type d'exercice (ex : « renforcer la coiffe des rotateurs »), jamais une cible thérapeutique personnalisée pour le patient.
5. Français courant mais professionnel. Évite le jargon inaccessible (dis « couché sur le dos » plutôt que « décubitus dorsal »).
6. Adresse-toi directement au patient (utilise le « vous »). NE COMMENCE PAS par un mot d'encouragement, de félicitations ou de « bravo ». Va directement aux exercices.
7. Sécurité : chaque exercice doit comporter une limite de douleur générique (ex : « Arrêtez si la douleur dépasse 3/10 »).
8. VOCABULAIRE PROFESSION — Tu es ${role}. Tu emploies EXCLUSIVEMENT « ${role} » et « ${metier} ». INTERDICTION ABSOLUE des termes « ${titreInterdit} », « ${metierInterdit} », « kiné », « physio ». Aucune exception.
</regles_strictes>

Voici la structure EXACTE que ta réponse doit suivre en format Markdown :

### Programme d'exercices à domicile

---

#### 1. [Reprends le nom de l'exercice donné par le ${role}, formulé proprement]
- **Objectif :** [Effet générique du type d'exercice, en 1 phrase neutre].
- **Position de départ :** [Comment bien s'installer].
- **Mouvement :**
  > 1. [Étape 1]
  > 2. [Étape 2]
- **Dosage :** [Séries] x [Répétitions] — Repos [Temps]. Fréquence : [ex: 1x/jour].
- **Limite de sécurité :** [Ex: Arrêtez si la douleur dépasse 3/10 ou si vous ressentez des fourmillements].

[Répète la même structure pour chaque exercice listé par le ${role}, dans l'ordre fourni.]`

      const markdown = await callClaudeSecure({
        apiKey,
        systemPrompt,
        userPrompt: buildFicheExercicePrompt(notesSeance),
        maxOutputTokens: 8192,
        jsonMode: false,
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
      if (!isMountedRef.current) return
      setFiche(result)
      onResult(result)
    } catch (err: unknown) {
      if (!isMountedRef.current) return
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      if (msg.includes('quota') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) setError('quota')
      else if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403') || msg.includes('API key')) setError('auth')
      else setError(msg)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!fiche) return
    try {
      await navigator.clipboard.writeText(fiche.markdown)
      setCopied(true)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => {
        copiedTimerRef.current = null
        if (isMountedRef.current) setCopied(false)
      }, 2000)
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

  // Helper : extrait nom/prénom même si context.patient est partiel/manquant
  const safePatientNames = () => {
    const patient = context.patient ?? {}
    const nom = (patient.nom || 'Anonyme').replace(/\s+/g, '_')
    const prenom = (patient.prenom || '').replace(/\s+/g, '_')
    return { nom, prenom }
  }

  const handleExportPDF = () => {
    if (!fiche) return
    try {
      const doc = buildPDF()
      const { nom, prenom } = safePatientNames()
      const dateFile = new Date(fiche.generatedAt).toISOString().split('T')[0]
      doc.save(`Exercices_${nom}_${prenom}_${dateFile}.pdf`)
    } catch (e) {
      setError(`Erreur PDF : ${(e as Error).message}`)
    }
  }

  const handleShare = async () => {
    if (!fiche) return
    let doc: jsPDF
    try {
      doc = buildPDF()
    } catch (e) {
      setError(`Erreur PDF : ${(e as Error).message}`)
      return
    }
    const { nom, prenom } = safePatientNames()
    const dateFile = new Date(fiche.generatedAt).toISOString().split('T')[0]
    const filename = `Exercices_${nom}_${prenom}_${dateFile}.pdf`
    const pdfBlob = doc.output('blob')
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' })

    const triggerSharedFeedback = () => {
      if (!isMountedRef.current) return
      setShared(true)
      if (sharedTimerRef.current) clearTimeout(sharedTimerRef.current)
      sharedTimerRef.current = setTimeout(() => {
        sharedTimerRef.current = null
        if (isMountedRef.current) setShared(false)
      }, 2000)
    }

    // Try Web Share API with file (mobile)
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({ title: `Exercices — ${context.zone}`, files: [pdfFile] })
        triggerSharedFeedback()
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
      triggerSharedFeedback()
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
            <h4>Fiche d'exercices</h4>
            <p>Listez les exercices que vous prescrivez. L'IA rédige uniquement la description technique pour le patient — elle n'invente aucun exercice.</p>
          </div>
        </div>

        {/* No API key */}
        {!apiKey && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 20, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem', marginBottom: 8 }}>Service IA indisponible</div>
            <p style={{ fontSize: '0.85rem', color: '#78350f', margin: '0 0 14px', lineHeight: 1.5 }}>
              La fiche d'exercices n'est pas disponible actuellement. Vérifiez votre connexion.
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
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>Réessayez dans quelques minutes.</p>
          </div>
        )}
        {error === 'auth' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Authentification IA échouée</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: '0 0 10px' }}>Le service IA a refusé la requête. Réessayez plus tard.</p>
            <button onClick={onGoToProfile} style={{ fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Ouvrir le profil</button>
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
              <h4 style={{ color: '#166534' }}>Liste des exercices à prescrire</h4>
            </div>
            <div className="ai-section-body">
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Listez ou dictez les exercices à prescrire (un par ligne ou en phrase). L'IA rédigera la description technique pour le patient — elle n'invente, ne propose et ne juge aucun exercice.
              </p>
              <DictableTextarea
                value={notesSeance}
                onChange={e => setNotesSeance(e.target.value)}
                rows={5}
                placeholder="Ex : Pendulaire de Codman, Rotation externe avec élastique léger, Étirement capsulaire postérieur en cross-body, Renforcement isométrique des abducteurs…"
                textareaStyle={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.85rem', color: 'var(--text-main)', background: 'var(--secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
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
              <p>Vous avez prescrit ces exercices. Arrêtez en cas de douleur intense ou de symptôme inhabituel et contactez votre thérapeute.</p>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!fiche && !loading && apiKey && (
            <button
              className="btn-primary-luxe"
              style={{ marginBottom: 0, background: 'linear-gradient(135deg, #059669, #047857)', opacity: notesSeance.trim() ? 1 : 0.5, cursor: notesSeance.trim() ? 'pointer' : 'not-allowed' }}
              onClick={generate}
              disabled={!notesSeance.trim()}
              title={notesSeance.trim() ? '' : 'Listez au moins un exercice à prescrire avant de confectionner la fiche.'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Confectionner la fiche d'exercices
              </div>
            </button>
          )}
          {loading && (
            <button className="btn-primary-luxe" disabled style={{ marginBottom: 0, opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg, #059669, #047857)' }}>
              <div className="spinner" />
              Confection en cours…
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
