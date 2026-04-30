import { useMemo, useState } from 'react'
import type { LetterType, LetterFormData, LetterRecord, ProfileData, BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord, LetterAuditEntry } from '../../types'
import { LETTER_TYPES, buildLetterPrompt, letterTitleFor, getLetterTypeMeta, buildPatientPrefill } from '../../utils/letterPrompts'
import { buildPatientDossier, buildZonePrompt, type ConfectableField } from '../../utils/letterZonePrompts'
import { callClaude, ClaudeAuthError } from '../../utils/claudeClient'
import { generateLetterPDF } from '../../utils/pdfGenerator'
import { pseudonymizeForm, rehydrateText } from '../../utils/pseudonymize'
import { scanFormForPII, type PIIMatch } from '../../utils/piiScanner'
import { LetterTypeIcon } from './LetterIcons'
import { ConfectionButton } from './ConfectionButton'
import { DictableInput, DictableTextarea } from '../VoiceMic'

interface LetterGeneratorProps {
  profile: ProfileData
  apiKey: string
  patientKey: string
  bilans: BilanRecord[]                      // Tous les bilans initiaux du patient
  intermediaires: BilanIntermediaireRecord[] // Bilans intermédiaires du patient
  notes: NoteSeanceRecord[]                  // Notes de séance du patient
  existingLetters: LetterRecord[]            // Courriers déjà rédigés
  onSave: (letter: LetterRecord) => void
  onDelete: (id: number) => void
  onAudit: (entry: LetterAuditEntry) => void
  onBack: () => void
  showToast: (msg: string, kind?: 'success' | 'error' | 'info') => void
  initialType?: LetterType | null
  bilanSortieData?: Record<string, unknown> | null
}

type Phase = 'select' | 'form' | 'preview'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-color)',
  background: 'var(--surface)',
  fontSize: '0.88rem',
  color: 'var(--text-main)',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 80,
  lineHeight: 1.5,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  color: 'var(--text-muted)',
  fontWeight: 600,
  marginBottom: 4,
  marginTop: 10,
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--primary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: '18px 0 6px',
  paddingBottom: 4,
  borderBottom: '1px solid var(--border-color)',
}

export function LetterGenerator(props: LetterGeneratorProps) {
  const { profile, apiKey, patientKey, bilans, intermediaires, notes, existingLetters, onSave, onDelete, onAudit, onBack, showToast, initialType, bilanSortieData } = props

  // Mémoïse le pré-remplissage pour ne pas le recalculer à chaque render
  const richPrefill = useMemo(
    () => {
      const base = buildPatientPrefill(patientKey, bilans, intermediaires, notes)
      if (bilanSortieData) {
        const sd = bilanSortieData
        if (sd.resumePEC) base.resumePec = String(sd.resumePEC)
        if (sd.resultatsObtenus) base.resultats = String(sd.resultatsObtenus)
        if (sd.autoExercices) base.recommandations = String(sd.autoExercices)
        if (sd.precautions) base.suite = String(sd.precautions)
        if (sd.infoMedecin) base.etatActuel = String(sd.infoMedecin)
        if (sd.dateFin) base.dateFinPec = String(sd.dateFin)
        if (sd.motif) base.raisonArret = String(sd.motif) + (sd.motifDetails ? ` — ${sd.motifDetails}` : '')
        if (sd.facteursLimitants) base.difficultes = String(sd.facteursLimitants)
      }
      return base
    },
    [patientKey, bilans, intermediaires, notes, bilanSortieData],
  )

  // Dossier patient compact — réutilisé pour chaque confection de zone (Haiku).
  const dossier = useMemo(
    () => buildPatientDossier(bilans, intermediaires, notes),
    [bilans, intermediaires, notes],
  )

  const [phase, setPhase] = useState<Phase>(() => initialType ? 'form' : 'select')
  const [type, setType] = useState<LetterType | null>(initialType ?? null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [createdAt, setCreatedAt] = useState<string>('')
  const [form, setForm] = useState<LetterFormData>(richPrefill)
  const [generatedText, setGeneratedText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [piiWarnings, setPiiWarnings] = useState<PIIMatch[] | null>(null)
  const [piiAcknowledged, setPiiAcknowledged] = useState(false)
  // Champ en cours de confection IA (Haiku) — pour afficher le spinner sur le bon bouton.
  const [confectingField, setConfectingField] = useState<ConfectableField | null>(null)

  const meta = type ? getLetterTypeMeta(type) : null

  const missingApiKey = !apiKey
  const missingPraticien = !profile.nom || !profile.ville

  const update = (field: keyof LetterFormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  // ── Confection IA d'UNE zone (Haiku) ─────────────────────────────────────
  // Si la zone est vide → confection pure depuis le dossier patient.
  // Si la zone contient déjà du texte → ce texte est utilisé comme brouillon
  // à améliorer (l'IA préserve les idées du praticien et les ancre aux données).
  // Pseudonymisation + audit RGPD identiques au flux global.
  const confectField = async (field: ConfectableField) => {
    if (confectingField || generating) return
    setConfectingField(field)
    setGenError('')
    try {
      const { placeholders, formSansPII } = pseudonymizeForm(form)
      const currentValue = (formSansPII[field] as string | undefined) ?? ''
      const { system, user } = buildZonePrompt(field, formSansPII, dossier, currentValue, profile.profession)
      const text = await callClaude(apiKey, system, user, 600, false, 'claude-haiku-4-5-20251001')
      const cleaned = rehydrateText(text.trim(), placeholders)
      // Si Haiku répond une chaîne vide (pas de donnée exploitable), on n'écrase pas.
      if (cleaned.trim()) {
        update(field, cleaned)
      } else {
        showToast('Aucune donnée exploitable dans le dossier pour cette zone', 'info')
      }
      // Audit RGPD léger pour les confections par zone.
      onAudit({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        letterId: editingId ?? 0,
        patientKey,
        type: type ?? 'fin_pec',
        pseudonymized: true,
        piiWarningsCount: 0,
        modelUsed: 'claude-haiku-4-5',
        resultLength: cleaned.length,
      })
    } catch (e) {
      if (e instanceof ClaudeAuthError) {
        setGenError("Authentification IA échouée. Réessayez dans quelques minutes.")
      } else {
        setGenError((e as Error).message || 'Erreur lors de la confection.')
      }
    } finally {
      setConfectingField(null)
    }
  }

  const handleSelectType = (t: LetterType) => {
    setType(t)
    setEditingId(null)
    setCreatedAt('')
    // Réinitialise le form avec le pré-remplissage riche à chaque nouvelle sélection
    setForm(richPrefill)
    setGeneratedText('')
    setPhase('form')
    setGenError('')
  }

  const handleOpenExisting = (l: LetterRecord) => {
    setType(l.type)
    setEditingId(l.id)
    setCreatedAt(l.createdAt)
    setForm(l.formData)
    setGeneratedText(l.contenu)
    setShowHistory(false)
    // Brouillon → retour au formulaire ; Final → aperçu
    setPhase(l.status === 'brouillon' ? 'form' : 'preview')
    setGenError('')
  }

  const handleGenerate = async () => {
    if (!type) return

    // ── Scan PII des champs texte libre avant génération ──────────────────
    // Détecte les noms/téléphones/NIR/etc. que le praticien aurait pu oublier
    // de pseudonymiser manuellement dans des champs "notes libres".
    if (!piiAcknowledged) {
      const warnings = scanFormForPII(form)
      if (warnings.length > 0) {
        setPiiWarnings(warnings)
        return
      }
    }

    setGenerating(true)
    setGenError('')
    const warningsCount = piiWarnings?.length ?? 0
    try {
      // ── Pseudonymisation : nom/prénom patient, destinataire, pro recommandé
      //    sont remplacés par des placeholders avant envoi à l'IA. Seule la
      //    data clinique (non identifiante) + âge + pathologie est transmise.
      const { placeholders, formSansPII } = pseudonymizeForm(form)
      const { system, user } = buildLetterPrompt(type, formSansPII, profile.profession)
      const text = await callClaude(apiKey, system, user, 2500, false)
      // ── Réhydratation côté client : les vraies valeurs sont réinjectées
      //    dans le texte avant qu'il soit affiché ou sauvegardé.
      const cleaned = rehydrateText(text.trim(), placeholders)
      setGeneratedText(cleaned)
      setPhase('preview')

      // ── Journal d'audit RGPD ─────────────────────────────────────────────
      // Enregistre la génération dans un registre traçable : date, type,
      // pseudonymisation active, nombre d'alertes PII vues. Ne contient
      // jamais le contenu du courrier lui-même.
      const auditId = Date.now()
      const letterId = editingId ?? auditId
      onAudit({
        id: auditId,
        timestamp: new Date().toISOString(),
        letterId,
        patientKey,
        type,
        pseudonymized: true,
        piiWarningsCount: warningsCount,
        modelUsed: 'claude-sonnet-4-6',
        resultLength: cleaned.length,
      })
      // Reset flags pour la prochaine génération
      setPiiAcknowledged(false)
      setPiiWarnings(null)
    } catch (e) {
      if (e instanceof ClaudeAuthError) {
        setGenError("Authentification IA échouée. Réessayez dans quelques minutes.")
      } else {
        setGenError((e as Error).message || 'Erreur lors de la génération.')
      }
    } finally {
      setGenerating(false)
    }
  }

  const buildRecord = (status: 'brouillon' | 'final'): LetterRecord | null => {
    if (!type) return null
    const now = new Date().toISOString()
    const id = editingId ?? Date.now()
    return {
      id,
      patientKey,
      type,
      createdAt: createdAt || now,
      updatedAt: now,
      formData: form,
      contenu: generatedText,
      titreAffichage: letterTitleFor(type, form),
      status,
    }
  }

  const handleSaveDraft = () => {
    const record = buildRecord('brouillon')
    if (!record) return
    onSave(record)
    // Mémorise l'id pour les prochaines sauvegardes
    setEditingId(record.id)
    if (!createdAt) setCreatedAt(record.createdAt)
    showToast('Brouillon enregistré', 'success')
  }

  const handleSaveFinal = () => {
    const record = buildRecord('final')
    if (!record) return
    onSave(record)
    setEditingId(record.id)
    if (!createdAt) setCreatedAt(record.createdAt)
  }

  const buildPraticienData = () => ({
    nom: profile.nom,
    prenom: profile.prenom,
    profession: profile.profession,
    specialisationsLibelle: profile.specialisationsLibelle,
    rcc: profile.rcc,
    adresse: profile.adresse,
    adresseComplement: profile.adresseComplement,
    codePostal: profile.codePostal,
    ville: profile.ville,
    telephone: profile.telephone,
    email: profile.email,
    signatureImage: profile.signatureImage ?? null,
  })

  const handleDownloadPDF = () => {
    if (!meta) return
    handleSaveFinal()
    try {
      generateLetterPDF({
        praticien: buildPraticienData(),
        patientNom: form.nomPatient,
        patientPrenom: form.prenomPatient,
        titreCourrier: meta.label,
        corps: generatedText,
      })
    } catch (e) {
      showToast(`Erreur PDF : ${(e as Error).message}`, 'error')
    }
  }

  const handlePrint = () => {
    if (!meta) return
    handleSaveFinal()
    let blob: Blob | undefined
    try {
      blob = generateLetterPDF({
        praticien: buildPraticienData(),
        patientNom: form.nomPatient,
        patientPrenom: form.prenomPatient,
        titreCourrier: meta.label,
        corps: generatedText,
        download: false,
      }) as Blob | undefined
    } catch (e) {
      showToast(`Erreur PDF : ${(e as Error).message}`, 'error')
      return
    }
    if (!blob) {
      showToast("Erreur : PDF non généré.", 'error')
      return
    }
    const url = URL.createObjectURL(blob)
    const w = window.open(url)
    if (!w) {
      URL.revokeObjectURL(url)
      showToast("Pop-up bloqué. Autorisez-le pour imprimer.", 'error')
      return
    }
    // Cleanup : libère l'object URL après ouverture (le navigateur garde le contenu)
    const onLoad = () => {
      try { w.print() } catch { /* ignore */ }
      // Révoque l'URL après quelques secondes (laisse le temps au print dialog)
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    }
    w.addEventListener('load', onLoad, { once: true })
  }

  const handleEmail = () => {
    if (!meta) return
    handleSaveFinal()
    try {
      generateLetterPDF({
        praticien: buildPraticienData(),
        patientNom: form.nomPatient,
        patientPrenom: form.prenomPatient,
        titreCourrier: meta.label,
        corps: generatedText,
        download: true,
      })
    } catch (e) {
      showToast(`Erreur PDF : ${(e as Error).message}`, 'error')
      return
    }
    // Mailto avec objet pré-rempli
    const subject = encodeURIComponent(`${meta.label} — ${form.prenomPatient} ${form.nomPatient}`)
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint le courrier concernant votre patient ${form.prenomPatient} ${form.nomPatient}.\n\nCordialement,\n${profile.prenom ?? ''} ${profile.nom ?? ''}`
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    showToast('PDF téléchargé. Joignez-le à votre mail.', 'info')
  }

  const handleWhatsApp = async () => {
    if (!meta) return
    handleSaveFinal()
    let blob: Blob | undefined
    try {
      blob = generateLetterPDF({
        praticien: buildPraticienData(),
        patientNom: form.nomPatient,
        patientPrenom: form.prenomPatient,
        titreCourrier: meta.label,
        corps: generatedText,
        download: false,
      }) as Blob | undefined
    } catch (e) {
      showToast(`Erreur PDF : ${(e as Error).message}`, 'error')
      return
    }
    if (!blob) {
      showToast("Erreur : PDF non généré.", 'error')
      return
    }
    // Si l'API Web Share est disponible et supporte les fichiers
    const file = new File([blob], `Courrier_${meta.label}.pdf`, { type: 'application/pdf' })
    const nav = navigator as Navigator & {
      canShare?: (d: { files?: File[] }) => boolean
      share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void>
    }
    if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
      try {
        await nav.share({ files: [file], title: meta.label, text: `Courrier concernant ${form.prenomPatient} ${form.nomPatient}` })
        return
      } catch {
        // Utilisateur a annulé ou erreur — fallback ci-dessous
      }
    }
    // Fallback : télécharge le PDF + ouvre WhatsApp Web sans fichier
    try {
      generateLetterPDF({
        praticien: buildPraticienData(),
        patientNom: form.nomPatient,
        patientPrenom: form.prenomPatient,
        titreCourrier: meta.label,
        corps: generatedText,
      })
    } catch (e) {
      showToast(`Erreur PDF : ${(e as Error).message}`, 'error')
      return
    }
    const text = encodeURIComponent(`${meta.label} — ${form.prenomPatient} ${form.nomPatient}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
    showToast('PDF téléchargé. Attachez-le dans WhatsApp.', 'info')
  }

  // ── Rendu ──────────────────────────────────────────────────────────────

  if (showHistory) {
    return (
      <LetterHistoryView
        letters={existingLetters}
        onBack={() => setShowHistory(false)}
        onOpen={handleOpenExisting}
        onAskDelete={(id) => setDeletingId(id)}
      />
    )
  }

  return (
    <div className="general-info-screen fade-in">
      <header className="screen-header">
        <button className="btn-back" onClick={() => {
          if (phase === 'select') onBack()
          else if (phase === 'form') setPhase('select')
          else setPhase('form')
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="title-section">
          {phase === 'select' && 'Nouveau courrier'}
          {phase === 'form' && meta?.label}
          {phase === 'preview' && 'Aperçu du courrier'}
        </h2>
        {phase === 'select' && existingLetters.length > 0 ? (
          <button
            onClick={() => setShowHistory(true)}
            style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Historique ({existingLetters.length})
          </button>
        ) : (
          <div style={{ width: 32 }} />
        )}
      </header>

      <div className="scroll-area" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>

        {/* ── Alerte config manquante ─── */}
        {phase === 'select' && (missingApiKey || missingPraticien) && (
          <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 'var(--radius-lg)', padding: '0.85rem 1rem', marginBottom: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#92400e', fontWeight: 600 }}>
              ⚠ Configuration incomplète
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#78350f', lineHeight: 1.5 }}>
              {missingApiKey && <>• Service IA indisponible — vérifiez votre connexion.<br/></>}
              {missingPraticien && <>• Vos informations praticien (nom, ville) sont incomplètes. Renseignez-les dans votre profil pour un en-tête correct.</>}
            </p>
          </div>
        )}

        {/* ── PHASE 1 : SÉLECTION DU TYPE ─── */}
        {phase === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
              Choisissez le type de courrier à rédiger. Les champs seront pré-remplis à partir des données patient.
            </p>
            {/* ── Bandeau confidentialité ─── */}
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              background: '#ecfdf5', border: '1px solid #86efac',
              borderRadius: 'var(--radius-lg)', padding: '0.8rem 0.95rem',
              marginBottom: 4,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <div style={{ fontSize: '0.76rem', color: '#065f46', lineHeight: 1.45 }}>
                <strong>Confidentialité patient préservée.</strong> Le nom, prénom et date de naissance du patient, ainsi que le nom du médecin destinataire, sont <strong>pseudonymisés localement</strong> avant l'envoi à l'IA. L'IA reçoit uniquement l'âge, la pathologie et les données cliniques — aucune donnée identifiante ne quitte votre appareil.
              </div>
            </div>
            {LETTER_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectType(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '0.95rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: t.color + '18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <LetterTypeIcon type={t.id} size={20} color={t.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 2 }}>{t.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{t.description}</div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>
        )}

        {/* ── PHASE 2 : FORMULAIRE ─── */}
        {phase === 'form' && type && (
          <LetterForm
            type={type}
            form={form}
            update={update}
            confectField={confectField}
            confectingField={confectingField}
            generating={generating}
          />
        )}

        {/* ── PHASE 3 : PREVIEW ─── */}
        {phase === 'preview' && (
          <div>
            {genError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)', fontSize: '0.84rem', marginBottom: 12 }}>
                {genError}
              </div>
            )}
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Vous pouvez modifier manuellement le texte avant d'exporter le PDF.
            </p>
            <textarea
              value={generatedText}
              onChange={e => setGeneratedText(e.target.value)}
              style={{
                width: '100%',
                minHeight: 420,
                padding: '1rem 1.1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                background: 'var(--surface)',
                fontSize: '0.9rem',
                fontFamily: 'Georgia, "Times New Roman", serif',
                lineHeight: 1.6,
                color: 'var(--text-main)',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
              <button
                onClick={handleDownloadPDF}
                style={{ padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                📄 Télécharger PDF
              </button>
              <button
                onClick={handlePrint}
                style={{ padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: 'var(--secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                🖨 Imprimer
              </button>
              <button
                onClick={handleEmail}
                style={{ padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: 'var(--secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                ✉ Email
              </button>
              <button
                onClick={handleWhatsApp}
                style={{ padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: '#25d366', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                💬 WhatsApp
              </button>
            </div>
            <button
              onClick={() => { handleGenerate() }}
              disabled={generating}
              style={{ width: '100%', marginTop: 8, padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'transparent', color: 'var(--primary)', border: '1.5px dashed var(--primary)', fontWeight: 600, fontSize: '0.84rem', cursor: generating ? 'wait' : 'pointer' }}>
              {generating ? 'Confection…' : '↻ Re-confectionner le courrier'}
            </button>
          </div>
        )}

      </div>

      {/* ── Footer fixe avec action principale ─── */}
      {phase === 'form' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border-color)', padding: '0.9rem 1.2rem calc(0.9rem + env(safe-area-inset-bottom)) 1.2rem', boxShadow: '0 -4px 20px rgba(0,0,0,0.08)', zIndex: 100 }}>
          {genError && (
            <div style={{ fontSize: '0.78rem', color: '#991b1b', marginBottom: 8 }}>{genError}</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 8 }}>
            <button
              onClick={handleSaveDraft}
              style={{
                padding: '0.95rem 0.5rem',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--secondary)',
                color: 'var(--primary)',
                border: '1.5px solid var(--primary)',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}>
              Brouillon
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || missingApiKey}
              style={{
                padding: '0.95rem',
                borderRadius: 'var(--radius-lg)',
                background: generating || missingApiKey ? 'var(--secondary)' : 'var(--primary)',
                color: generating || missingApiKey ? 'var(--text-muted)' : 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: generating || missingApiKey ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {generating ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Confection…
                </>
              ) : 'Confectionner le courrier'}
            </button>
          </div>
        </div>
      )}

      {/* ── Alerte PII détectée dans un champ texte libre ─── */}
      {piiWarnings && piiWarnings.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: '1rem' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-2xl)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.1rem 1.3rem 0.8rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Données potentiellement identifiantes détectées</h3>
              </div>
              <p style={{ margin: '6px 0 0 42px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Le système a détecté des éléments susceptibles d'identifier le patient ou un tiers dans les champs texte libre. La pseudonymisation automatique ne traite <strong>pas</strong> ces champs — vérifiez et modifiez avant de générer le courrier.
              </p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.9rem 1.3rem' }}>
              {piiWarnings.map((w, i) => (
                <div key={i} style={{ padding: '0.7rem 0.85rem', background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 3 }}>
                    {w.fieldLabel}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#78350f', marginBottom: 4 }}>
                    <strong>Détecté :</strong> {w.reason}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#92400e', fontFamily: 'Georgia, serif', fontStyle: 'italic', background: 'white', padding: '4px 8px', borderRadius: 4, border: '1px solid #fcd34d' }}>
                    « {w.snippet} »
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '0.9rem 1.3rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setPiiWarnings(null); setPiiAcknowledged(false) }}
                style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                Corriger
              </button>
              <button
                onClick={() => { setPiiAcknowledged(true); setPiiWarnings(null); handleGenerate() }}
                style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
                Ignorer et continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation suppression courrier ─── */}
      {deletingId !== null && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 360, boxShadow: 'var(--shadow-2xl)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Supprimer ce courrier ?</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5, margin: '0.6rem 0 1.25rem' }}>
              Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setDeletingId(null)}
                style={{ flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-lg)', background: 'var(--secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                Annuler
              </button>
              <button
                onClick={() => {
                  if (deletingId !== null) {
                    onDelete(deletingId)
                    // Si on supprime le courrier en cours d'édition, revenir à la sélection
                    if (editingId === deletingId) {
                      setEditingId(null)
                      setCreatedAt('')
                      setPhase('select')
                      setType(null)
                    }
                  }
                  setDeletingId(null)
                  showToast('Courrier supprimé', 'success')
                }}
                style={{ flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-lg)', background: '#dc2626', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sous-composant : LetterForm
// ─────────────────────────────────────────────────────────────────────────────

interface LetterFormProps {
  type: LetterType
  form: LetterFormData
  update: (field: keyof LetterFormData, value: string) => void
  confectField: (field: ConfectableField) => void
  confectingField: ConfectableField | null
  generating: boolean
}

// Label + bouton "Confectionner" inline. Réutilisé pour chaque zone éditable
// d'un courrier afin d'offrir une confection IA ciblée par zone (Haiku).
function ZoneLabel({
  text,
  field,
  confectField,
  confectingField,
  generating,
}: {
  text: string
  field: ConfectableField
  confectField: (f: ConfectableField) => void
  confectingField: ConfectableField | null
  generating: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      fontSize: '0.78rem',
      color: 'var(--text-muted)',
      fontWeight: 600,
      marginBottom: 4,
      marginTop: 10,
    }}>
      <span>{text}</span>
      <ConfectionButton
        onConfect={() => confectField(field)}
        busy={confectingField === field}
        disabled={(confectingField !== null && confectingField !== field) || generating}
      />
    </div>
  )
}

function LetterForm({ type, form, update, confectField, confectingField, generating }: LetterFormProps) {
  const field = (key: keyof LetterFormData) => ({
    value: form[key] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(key, e.target.value),
  })

  // Helper pour réduire la verbosité des appels à ZoneLabel.
  const zone = (text: string, f: ConfectableField) => (
    <ZoneLabel
      text={text}
      field={f}
      confectField={confectField}
      confectingField={confectingField}
      generating={generating}
    />
  )

  return (
    <div>
      {/* ── Informations communes ─── */}
      <div style={sectionTitleStyle}>Destinataire & patient</div>

      <label style={labelStyle}>Titre</label>
      <select {...field('titreDestinataire')} style={inputStyle}>
        <option value="Docteur">Docteur</option>
        <option value="Cher confrère">Cher confrère</option>
        <option value="Chère consœur">Chère consœur</option>
      </select>

      <label style={labelStyle}>Nom du destinataire</label>
      <DictableInput {...field('nomDestinataire')} placeholder="Ex : Dr DUPONT" inputStyle={inputStyle} />

      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: 8, marginTop: 10 }}>
        <div>
          <label style={labelStyle}>Civilité</label>
          <select {...field('civilitePatient')} style={inputStyle}>
            <option value="">—</option>
            <option value="M.">M.</option>
            <option value="Mme">Mme</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Prénom</label>
          <DictableInput {...field('prenomPatient')} inputStyle={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Nom</label>
          <DictableInput {...field('nomPatient')} inputStyle={inputStyle} />
        </div>
      </div>

      <label style={labelStyle}>Indication de PEC</label>
      <DictableInput {...field('indication')} inputStyle={inputStyle} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Début PEC</label>
          <DictableInput {...field('dateDebutPec')} placeholder="jj/mm/aaaa" inputStyle={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Fréquence</label>
          <DictableInput {...field('frequence')} placeholder="2x/semaine" inputStyle={inputStyle} />
        </div>
      </div>

      {/* ── Champs spécifiques par type ─── */}
      <div style={sectionTitleStyle}>Contenu du courrier</div>

      {(type === 'fin_pec' || type === 'fin_pec_anticipee' || type === 'echec_pec') && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Date de fin PEC</label>
              <DictableInput {...field('dateFinPec')} placeholder="jj/mm/aaaa" inputStyle={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Nombre de séances</label>
              <DictableInput {...field('nbSeances')} inputStyle={inputStyle} />
            </div>
          </div>
        </>
      )}

      {type !== 'demande_imagerie' && type !== 'demande_avis' && (
        <>
          {zone('Résumé du bilan initial', 'resumeBilanInitial')}
          <DictableTextarea {...field('resumeBilanInitial')} placeholder="Principales observations, tests positifs, déficits…" textareaStyle={textareaStyle} />
        </>
      )}

      {(type === 'fin_pec' || type === 'fin_pec_anticipee' || type === 'suivi') && (
        <>
          {zone('Traitement effectué', 'traitement')}
          <DictableTextarea {...field('traitement')} placeholder="Techniques, exercices, modalités…" textareaStyle={textareaStyle} />
        </>
      )}

      {type === 'fin_pec' && (
        <>
          {zone('Résultats / état actuel', 'resultats')}
          <DictableTextarea {...field('resultats')} placeholder="Amélioration EVN, gains articulaires, scores…" textareaStyle={textareaStyle} />
          {zone('Recommandations au patient', 'recommandations')}
          <DictableTextarea {...field('recommandations')} placeholder="Auto-rééducation, reprise sport…" textareaStyle={textareaStyle} />
          {zone('Suite proposée', 'suite')}
          <DictableInput {...field('suite')} placeholder="Aucune / suivi espacé / à revoir si besoin" inputStyle={inputStyle} />
        </>
      )}

      {type === 'fin_pec_anticipee' && (
        <>
          {zone("Raison de l'arrêt anticipé", 'raisonArret')}
          <DictableTextarea {...field('raisonArret')} placeholder="Objectifs atteints avant terme, patient autonome, etc." textareaStyle={textareaStyle} />
          {zone('État actuel du patient', 'etatActuel')}
          <DictableTextarea {...field('etatActuel')} textareaStyle={textareaStyle} />
          {zone('Recommandations', 'recommandations')}
          <DictableTextarea {...field('recommandations')} textareaStyle={textareaStyle} />
        </>
      )}

      {type === 'demande_avis' && (
        <>
          {zone('Résumé de la PEC kiné', 'resumePec')}
          <DictableTextarea {...field('resumePec')} placeholder="Ce qui a été fait, résultats obtenus, limites rencontrées…" textareaStyle={textareaStyle} />
          <label style={labelStyle}>Type de professionnel suggéré</label>
          <select {...field('typePro')} style={inputStyle}>
            <option value="">— Sélectionner —</option>
            <option value="Psychologue">Psychologue</option>
            <option value="Médecin de la douleur">Médecin de la douleur</option>
            <option value="Rhumatologue">Rhumatologue</option>
            <option value="Chirurgien orthopédique">Chirurgien orthopédique</option>
            <option value="Neurologue">Neurologue</option>
            <option value="Ostéopathe">Ostéopathe</option>
            <option value="Autre spécialiste">Autre spécialiste</option>
          </select>
          {zone("Raison de l'orientation", 'raisonOrientation')}
          <DictableTextarea {...field('raisonOrientation')} placeholder="Composante psychologique, douleur chronique non contrôlée…" textareaStyle={textareaStyle} />
          <label style={labelStyle}>Accord du patient</label>
          <select {...field('accordPatient')} style={inputStyle}>
            <option value="oui">Oui, discuté et accepté</option>
            <option value="non">Non, à discuter</option>
          </select>
          <label style={labelStyle}>Professionnel recommandé (optionnel)</label>
          <DictableInput {...field('nomProRecommande')} placeholder="Dr ... / structure" inputStyle={inputStyle} />
        </>
      )}

      {type === 'demande_imagerie' && (
        <>
          <label style={labelStyle}>Type d'imagerie demandée</label>
          <select {...field('typeImagerie')} style={inputStyle}>
            <option value="">— Sélectionner —</option>
            <option value="Échographie">Échographie</option>
            <option value="IRM">IRM</option>
            <option value="Radiographie">Radiographie</option>
            <option value="Scanner">Scanner</option>
            <option value="Autre">Autre</option>
          </select>
          <label style={labelStyle}>Zone anatomique</label>
          <DictableInput {...field('zoneAnatomique')} inputStyle={inputStyle} />
          {zone('Justification clinique', 'justification')}
          <DictableTextarea {...field('justification')} placeholder="Récidives multiples, absence d'imagerie préalable, guider la rééducation…" textareaStyle={textareaStyle} />
          {zone('Antécédents pertinents', 'antecedents')}
          <DictableTextarea {...field('antecedents')} textareaStyle={textareaStyle} />
        </>
      )}

      {type === 'demande_prescription' && (
        <>
          <label style={labelStyle}>Nature de la demande</label>
          <select {...field('natureDemande')} style={inputStyle}>
            <option value="Renouvellement d'ordonnance">Renouvellement d'ordonnance</option>
            <option value="Double prescription">Double prescription</option>
            <option value="Prescription spécifique">Prescription spécifique</option>
          </select>
          {zone('Justification', 'justification')}
          <DictableTextarea {...field('justification')} placeholder="Pourquoi cette demande, ce qu'il reste à traiter…" textareaStyle={textareaStyle} />
          <label style={labelStyle}>Si double prescription — Indication 1</label>
          <DictableTextarea {...field('indication1')} textareaStyle={textareaStyle} />
          <label style={labelStyle}>Si double prescription — Indication 2</label>
          <DictableTextarea {...field('indication2')} textareaStyle={textareaStyle} />
        </>
      )}

      {type === 'suivi' && (
        <>
          <label style={labelStyle}>Type de destinataire</label>
          <select {...field('typeDest')} style={inputStyle}>
            <option value="médecin">Médecin</option>
            <option value="confrère">Confrère kinésithérapeute</option>
          </select>
          <label style={labelStyle}>Date du bilan intermédiaire</label>
          <DictableInput {...field('dateBilanInterm')} placeholder="jj/mm/aaaa" inputStyle={inputStyle} />
          {zone('Évolution constatée', 'evolution')}
          <DictableTextarea {...field('evolution')} textareaStyle={textareaStyle} />
          {zone('Points positifs', 'pointsPositifs')}
          <DictableTextarea {...field('pointsPositifs')} textareaStyle={textareaStyle} />
          {zone('Difficultés / points en cours', 'difficultes')}
          <DictableTextarea {...field('difficultes')} textareaStyle={textareaStyle} />
          {zone('Suite prévue', 'suite')}
          <DictableTextarea {...field('suite')} textareaStyle={textareaStyle} />
        </>
      )}

      {type === 'echec_pec' && (
        <>
          {zone('Modalités de traitement essayées', 'traitementsEssayes')}
          <DictableTextarea {...field('traitementsEssayes')} placeholder="Techniques essayées, exercices, modalités…" textareaStyle={textareaStyle} />
          {zone('Constat actuel', 'constat')}
          <DictableTextarea {...field('constat')} placeholder="Pas d'amélioration / dégradation / stagnation…" textareaStyle={textareaStyle} />
          {zone('Scores fonctionnels (optionnel)', 'scoresFonctionnels')}
          <DictableTextarea {...field('scoresFonctionnels')} placeholder="Ex : EIFEL 18/24, DN4 5/10…" textareaStyle={textareaStyle} />
          {zone('Orientation proposée', 'orientation')}
          <DictableTextarea {...field('orientation')} placeholder="Médecin de la douleur, RFR, hospitalisation, autre…" textareaStyle={textareaStyle} />
          {zone('Avis / recommandations', 'avisPersonnel')}
          <DictableTextarea {...field('avisPersonnel')} textareaStyle={textareaStyle} />
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sous-composant : historique des courriers
// ─────────────────────────────────────────────────────────────────────────────

interface LetterHistoryViewProps {
  letters: LetterRecord[]
  onBack: () => void
  onOpen: (l: LetterRecord) => void
  onAskDelete: (id: number) => void
}

function LetterHistoryView({ letters, onBack, onOpen, onAskDelete }: LetterHistoryViewProps) {
  const sorted = useMemo(() => [...letters].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [letters])
  const brouillons = sorted.filter(l => l.status === 'brouillon')
  const finals = sorted.filter(l => l.status !== 'brouillon')
  return (
    <div className="general-info-screen fade-in">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="title-section">Historique des courriers</h2>
        <div style={{ width: 32 }} />
      </header>
      <div className="scroll-area" style={{ paddingBottom: '3rem' }}>
        {sorted.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem' }}>Aucun courrier enregistré.</p>
        )}

        {brouillons.length > 0 && (
          <>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0 10px' }}>
              Brouillons ({brouillons.length})
            </div>
            {brouillons.map(l => (
              <LetterHistoryRow key={l.id} letter={l} onOpen={onOpen} onAskDelete={onAskDelete} />
            ))}
          </>
        )}

        {finals.length > 0 && (
          <>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '18px 0 10px' }}>
              Finalisés ({finals.length})
            </div>
            {finals.map(l => (
              <LetterHistoryRow key={l.id} letter={l} onOpen={onOpen} onAskDelete={onAskDelete} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function LetterHistoryRow({ letter: l, onOpen, onAskDelete }: { letter: LetterRecord; onOpen: (l: LetterRecord) => void; onAskDelete: (id: number) => void }) {
  const meta = getLetterTypeMeta(l.type)
  const date = new Date(l.updatedAt).toLocaleDateString('fr-FR')
  const isDraft = l.status === 'brouillon'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0.9rem 1rem',
      borderRadius: 'var(--radius-lg)',
      border: isDraft ? '1.5px dashed #fbbf24' : '1px solid var(--border-color)',
      background: 'var(--surface)',
      marginBottom: 8,
    }}>
      <button
        onClick={() => onOpen(l)}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 12,
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
          minWidth: 0,
        }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: meta.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LetterTypeIcon type={l.type} size={18} color={meta.color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{meta.label}</span>
            {isDraft && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Brouillon
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {l.formData.nomDestinataire || '—'} · {date}
          </div>
        </div>
      </button>
      <button
        onClick={() => onAskDelete(l.id)}
        aria-label="Supprimer"
        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 6, flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      </button>
    </div>
  )
}
