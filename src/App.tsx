import { useState, useRef, useCallback, useEffect, lazy, Suspense, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { useIndexedDB } from './hooks/useIndexedDB'
import { useTheme } from './hooks/useTheme'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useToast } from './hooks/useToast'
import { ToastContainer } from './components/ui/Toast'
import { BilanEpaule } from './components/bilans/BilanEpaule'
import type { BilanEpauleHandle } from './components/bilans/BilanEpaule'
import { BilanCheville } from './components/bilans/BilanCheville'
import type { BilanChevilleHandle } from './components/bilans/BilanCheville'
import { BilanGenou } from './components/bilans/BilanGenou'
import type { BilanGenouHandle } from './components/bilans/BilanGenou'
import { BilanHanche } from './components/bilans/BilanHanche'
import type { BilanHancheHandle } from './components/bilans/BilanHanche'
import { BilanCervical } from './components/bilans/BilanCervical'
import type { BilanCervicalHandle } from './components/bilans/BilanCervical'
import { BilanLombaire } from './components/bilans/BilanLombaire'
import type { BilanLombaireHandle } from './components/bilans/BilanLombaire'
import { BilanGenerique } from './components/bilans/BilanGenerique'
import type { BilanGeneriqueHandle } from './components/bilans/BilanGenerique'
import { BilanGeriatrique } from './components/bilans/BilanGeriatrique'
import type { BilanGeriatriqueHandle } from './components/bilans/BilanGeriatrique'
import { BilanIntermediaire } from './components/bilans/BilanIntermediaire'
import type { BilanIntermediaireHandle } from './components/bilans/BilanIntermediaire'
import { BilanIntermediaireGeriatrique } from './components/bilans/BilanIntermediaireGeriatrique'
import type { BilanIntermediaireGeriatriqueHandle } from './components/bilans/BilanIntermediaireGeriatrique'
const BilanAnalyseIA = lazy(() => import('./components/BilanAnalyseIA').then(m => ({ default: m.BilanAnalyseIA })))
const BilanNoteIntermediaire = lazy(() => import('./components/BilanNoteIntermediaire').then(m => ({ default: m.BilanNoteIntermediaire })))
const BilanEvolutionIA = lazy(() => import('./components/BilanEvolutionIA').then(m => ({ default: m.BilanEvolutionIA })))
const LetterGenerator = lazy(() => import('./components/letters/LetterGenerator').then(m => ({ default: m.LetterGenerator })))
import { generatePDF } from './utils/pdfGenerator'
import type { ImprovementEntry } from './utils/pdfGenerator'
import { getBilanType, BODY_ZONES, BILAN_ZONE_LABELS, DEFAULT_ZONE_FOR_BILAN } from './utils/bilanRouter'
import { buildPDFReportPrompt, computeAge } from './utils/clinicalPrompt'
import { hashInputs, documentFingerprint, getCachedBilanPDF, setCachedBilanPDF, getCachedAnalysePDF, setCachedAnalysePDF } from './utils/pdfCache'
import { buildGeneratedPatientDoc } from './utils/pdfPersistence'
import type { PatientDocumentSource } from './types'
import type { BilanIntermediaireEntry } from './utils/clinicalPrompt'
import type { BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord, SmartObjectif, ExerciceBankEntry, ProfileData, AnalyseIA, FicheExercice, BilanDocument, PatientDocument, PatientPrescription, LetterRecord, LetterAuditEntry, AICallAuditEntry, ClosedTreatment, BilanType } from './types'
import { callClaudeSecure, UnmaskedDocumentsError } from './utils/claudeSecure'
import { parseExercicesFromMarkdown, addExercicesToBank } from './utils/parseExercices'
import { downloadExercicesPDF } from './utils/exercicesDomicilePdf'
import { backupSchema, analyseSeanceMiniSchema } from './utils/validation'
const FicheExerciceIA = lazy(() => import('./components/FicheExerciceIA').then(m => ({ default: m.FicheExerciceIA })))
const DocumentMasker = lazy(() => import('./components/DocumentMasker').then(m => ({ default: m.DocumentMasker })))
const BilanSortie = lazy(() => import('./components/BilanSortie').then(m => ({ default: m.BilanSortie })))
import { pdfToImages } from './utils/pdfToImages'
import { NoteSeance } from './components/NoteSeance'
import type { NoteSeanceHandle, NoteSeanceData, ExerciceDomicile } from './components/NoteSeance'
import { DictableInput, DictableTextarea } from './components/VoiceMic'
import { PDFPreview } from './components/PDFPreview'
import { DashboardStats } from './components/DashboardStats'
import { EvolutionChart, type EvolutionPoint } from './components/EvolutionChart'
import { ScoreEvolutionChart } from './components/ScoreEvolutionChart'
import { TreatmentBodyChart } from './components/TreatmentBodyChart'
import { DossierDocuments } from './components/DossierDocuments'
import { BilanResumeModal } from './components/BilanResumeModal'
import { SmartObjectifs } from './components/SmartObjectifs'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useAuth } from './hooks/useAuth'
import { useSync } from './hooks/useSync'
import { AuthScreen } from './components/AuthScreen'
import { OnboardingScreen } from './components/OnboardingScreen'
import { Tutorial, type TutorialStep } from './components/Tutorial'
import { SplashScreen } from './components/SplashScreen'
// ── Design system + patient command center ────────────────────────────────
import { colors as c } from './design/tokens'
import { PatientHeader } from './components/patient/PatientHeader'
import { PatientHeroCard } from './components/patient/PatientHeroCard'
import { ConsultationChooser } from './components/patient/ConsultationChooser'
import './App.css'

type Step = 'dashboard' | 'database' | 'profile' | 'settings' | 'identity' | 'general_info' | 'bilan_zone' | 'bilan_intermediaire' | 'note_intermediaire' | 'note_seance' | 'pdf_preview' | 'analyse_ia' | 'evolution_ia' | 'fiche_exercice' | 'letter' | 'bilan_sortie'

const LazyFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
    <div className="spinner" style={{ width: 28, height: 28 }} />
  </div>
)

class ErrorBoundary extends Component<{ children: ReactNode; onReset?: () => void }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[ErrorBoundary]', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>Une erreur est survenue</p>
          <p style={{ fontSize: '0.82rem', color: '#78716c', marginBottom: 16 }}>{this.state.error.message}</p>
          <button onClick={() => { this.setState({ error: null }); this.props.onReset?.() }}
            style={{ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
            Revenir
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Zone picker : liste design avec icônes SVG anatomiques ───────────────
function ZoneIcon({ zone, size = 22, color = 'currentColor' }: { zone: string; size?: number; color?: string }) {
  const s = { width: size, height: size, fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (zone) {
    case 'Épaule': return (
      <svg viewBox="0 0 24 24" {...s}><path d="M12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/><path d="M12 8v4"/><path d="M8 9c-3 1-5 3.5-5 6"/><path d="M16 9c3 1 5 3.5 5 6"/><path d="M8 9l-2 7"/><path d="M16 9l2 7"/></svg>
    )
    case 'Genou': return (
      <svg viewBox="0 0 24 24" {...s}><path d="M12 2v6"/><ellipse cx="12" cy="11" rx="4" ry="3"/><path d="M12 14v8"/><path d="M9 11c-1.5.5-2 2-1.5 3.5"/><path d="M15 11c1.5.5 2 2 1.5 3.5"/></svg>
    )
    case 'Hanche': return (
      <svg viewBox="0 0 24 24" {...s}><path d="M12 3v5"/><ellipse cx="12" cy="11" rx="6" ry="4"/><path d="M8 14l-3 8"/><path d="M16 14l3 8"/><circle cx="12" cy="11" r="1.5"/></svg>
    )
    case 'Cheville': return (
      <svg viewBox="0 0 24 24" {...s}><path d="M12 2v12"/><path d="M10 14c-2 1-3 3-3 5h10c0-2-1-4-3-5"/><path d="M7 19c-1 0-2 .5-2 2h14c0-1.5-1-2-2-2"/></svg>
    )
    case 'Cervicales': return (
      <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="5" r="3"/><path d="M12 8v14"/><path d="M9 10h6"/><path d="M8 13h8"/><path d="M9 16h6"/></svg>
    )
    case 'Rachis Lombaire': return (
      <svg viewBox="0 0 24 24" {...s}><path d="M12 2v20"/><path d="M8 5h8"/><path d="M7 8h10"/><path d="M6 11h12"/><path d="M7 14h10"/><path d="M8 17h8"/><path d="M9 20h6"/></svg>
    )
    case 'Gériatrie': return (
      <svg viewBox="0 0 24 24" {...s}><circle cx="11" cy="4" r="2.5"/><path d="M11 6.5v6"/><path d="M8 9l-2 5"/><path d="M14 9l2 3"/><path d="M11 12.5l-3 9"/><path d="M11 12.5l2 5"/><path d="M16 12l4 3"/><line x1="20" y1="15" x2="20" y2="22"/></svg>
    )
    default: return (
      <svg viewBox="0 0 24 24" {...s}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>
    )
  }
}

const ZONE_PICKER_ITEMS: Array<{ zone: string; label: string }> = [
  { zone: 'Épaule',          label: 'Épaule' },
  { zone: 'Genou',           label: 'Genou' },
  { zone: 'Hanche',          label: 'Hanche' },
  { zone: 'Cheville',        label: 'Cheville' },
  { zone: 'Cervicales',      label: 'Rachis Cervical' },
  { zone: 'Rachis Lombaire', label: 'Rachis Lombaire' },
  { zone: 'Gériatrie',       label: 'Gériatrie' },
  { zone: 'Autre',           label: 'Bilan général' },
]

interface ZonePickerSheetProps {
  title: string
  accent: string
  accentBg: string
  accentBorder: string
  selectedZone?: string | null
  onSelect: (zone: string) => void
  onClose: () => void
}

function ZonePickerSheet({ title, selectedZone, onSelect, onClose }: ZonePickerSheetProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--base-bg)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 430, boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', padding: '0.5rem 1.1rem 2rem', maxHeight: '85vh', overflow: 'auto', animation: 'slideUp 0.32s cubic-bezier(0.32, 0.72, 0, 1)' }}>
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-color)' }} />
        </div>
        <div style={{ marginBottom: '1.1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)', letterSpacing: '-0.01em' }}>{title}</h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Choisissez la zone anatomique du bilan</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ZONE_PICKER_ITEMS.map(({ zone, label }) => {
            const active = selectedZone === zone
            return (
              <button
                key={zone}
                onClick={() => onSelect(zone)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '0.85rem 1rem',
                  borderRadius: 14,
                  border: active ? '2px solid var(--primary)' : '1.5px solid transparent',
                  background: active ? 'var(--info-soft)' : 'var(--input-bg)',
                  color: active ? 'var(--primary-dark)' : 'var(--text-main)',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  boxShadow: active ? '0 2px 10px rgba(45,90,75,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: active ? 'var(--primary)' : 'var(--secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.18s',
                }}>
                  <ZoneIcon zone={zone} size={22} color={active ? 'white' : 'var(--primary)'} />
                </div>
                <span style={{ flex: 1 }}>{label}</span>
                {active && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const DEMO_DB: BilanRecord[] = [
  { id:1,  nom:'BERGER',   prenom:'Thomas', dateNaissance:'12/05/1982', dateBilan:'15/10/2025', zoneCount:1, evn:8, zone:'Épaule Droite', pathologie:'Tendinite de la coiffe des rotateurs', avatarBg:'var(--primary-light)', bilanType:'epaule', status:'complet' },
  { id:2,  nom:'BERGER',   prenom:'Thomas', dateNaissance:'12/05/1982', dateBilan:'29/10/2025', zoneCount:1, evn:7, zone:'Épaule Droite', pathologie:'Tendinite de la coiffe des rotateurs', avatarBg:'var(--primary-light)', bilanType:'epaule', status:'complet' },
  { id:3,  nom:'BERGER',   prenom:'Thomas', dateNaissance:'12/05/1982', dateBilan:'12/11/2025', zoneCount:1, evn:5, zone:'Épaule Droite', pathologie:'Tendinite de la coiffe des rotateurs', avatarBg:'var(--primary-light)', bilanType:'epaule', status:'complet' },
  { id:4,  nom:'BERGER',   prenom:'Thomas', dateNaissance:'12/05/1982', dateBilan:'26/11/2025', zoneCount:1, evn:4, zone:'Épaule Droite', pathologie:'Tendinite de la coiffe des rotateurs', avatarBg:'var(--primary-light)', bilanType:'epaule', status:'complet' },
  { id:5,  nom:'BERGER',   prenom:'Thomas', dateNaissance:'12/05/1982', dateBilan:'10/12/2025', zoneCount:1, evn:3, zone:'Épaule Droite', pathologie:'Tendinite de la coiffe des rotateurs', avatarBg:'var(--primary-light)', bilanType:'epaule', status:'complet' },
  { id:6,  nom:'MARCHAND', prenom:'Sophie', dateNaissance:'03/08/1990', dateBilan:'01/10/2025', zoneCount:1, evn:7, zone:'Genou Droit',   pathologie:'Syndrome fémoro-patellaire',           avatarBg:'#8b5cf6', bilanType:'genou',  status:'complet' },
  { id:7,  nom:'MARCHAND', prenom:'Sophie', dateNaissance:'03/08/1990', dateBilan:'15/10/2025', zoneCount:1, evn:5, zone:'Genou Droit',   pathologie:'Syndrome fémoro-patellaire',           avatarBg:'#8b5cf6', bilanType:'genou',  status:'complet' },
  { id:8,  nom:'MARCHAND', prenom:'Sophie', dateNaissance:'03/08/1990', dateBilan:'29/10/2025', zoneCount:1, evn:6, zone:'Genou Droit',   pathologie:'Syndrome fémoro-patellaire',           avatarBg:'#8b5cf6', bilanType:'genou',  status:'complet' },
  { id:9,  nom:'MARCHAND', prenom:'Sophie', dateNaissance:'03/08/1990', dateBilan:'12/11/2025', zoneCount:1, evn:4, zone:'Genou Droit',   pathologie:'Syndrome fémoro-patellaire',           avatarBg:'#8b5cf6', bilanType:'genou',  status:'complet' },
  { id:10, nom:'MARCHAND', prenom:'Sophie', dateNaissance:'03/08/1990', dateBilan:'26/11/2025', zoneCount:1, evn:3, zone:'Genou Droit',   pathologie:'Syndrome fémoro-patellaire',           avatarBg:'#8b5cf6', bilanType:'genou',  status:'complet' },
  { id:11, nom:'MARCHAND', prenom:'Sophie', dateNaissance:'03/08/1990', dateBilan:'10/12/2025', zoneCount:1, evn:2, zone:'Genou Droit',   pathologie:'Syndrome fémoro-patellaire',           avatarBg:'#8b5cf6', bilanType:'genou',  status:'complet' },
  { id:12, nom:'PETIT',    prenom:'Lucas',  dateNaissance:'22/11/1975', dateBilan:'05/11/2025', zoneCount:2, evn:9, zone:'Rachis Lombaire',pathologie:'Lombalgie chronique commune',          avatarBg:'#f97316', bilanType:'lombaire',status:'complet' },
  { id:13, nom:'PETIT',    prenom:'Lucas',  dateNaissance:'22/11/1975', dateBilan:'19/11/2025', zoneCount:2, evn:7, zone:'Rachis Lombaire',pathologie:'Lombalgie chronique commune',          avatarBg:'#f97316', bilanType:'lombaire',status:'complet' },
  { id:14, nom:'PETIT',    prenom:'Lucas',  dateNaissance:'22/11/1975', dateBilan:'03/12/2025', zoneCount:2, evn:8, zone:'Rachis Lombaire',pathologie:'Lombalgie chronique commune',          avatarBg:'#f97316', bilanType:'lombaire',status:'complet' },
  { id:15, nom:'PETIT',    prenom:'Lucas',  dateNaissance:'22/11/1975', dateBilan:'17/12/2025', zoneCount:2, evn:6, zone:'Rachis Lombaire',pathologie:'Lombalgie chronique commune',          avatarBg:'#f97316', bilanType:'lombaire',status:'complet' },
]

const DEFAULT_PROFILE: ProfileData = { nom: '', prenom: '', profession: 'Kinésithérapeute', photo: null }

/** Glissement horizontal gauche révélant un bouton X rouge pour supprimer.
 *  Utilisé sur les cartes d'épisode clôturé — pas de bouton visible par défaut,
 *  le geste reste la seule affordance (mobile-first, pas de boutons partout).
 *  Pointer events pour supporter mouse + touch + pen ; touch-action: pan-y pour
 *  laisser le scroll vertical au navigateur tout en captant l'horizontal. */
function SwipeToDelete({ children, onDelete, disabled = false }: {
  children: React.ReactNode
  onDelete: () => void
  disabled?: boolean
}) {
  const REVEAL = 68
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const baselineRef = useRef(0)
  const lockedRef = useRef<'none' | 'h' | 'v'>('none')
  const pointerIdRef = useRef<number | null>(null)
  if (disabled) return <>{children}</>
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pointerIdRef.current = e.pointerId
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    baselineRef.current = dx
    lockedRef.current = 'none'
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (startXRef.current === null || startYRef.current === null) return
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return
    const rawX = e.clientX - startXRef.current
    const rawY = e.clientY - startYRef.current
    if (lockedRef.current === 'none') {
      if (Math.abs(rawX) < 6 && Math.abs(rawY) < 6) return
      lockedRef.current = Math.abs(rawX) > Math.abs(rawY) ? 'h' : 'v'
      if (lockedRef.current === 'h') {
        setDragging(true)
        try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch { /* noop */ }
      }
    }
    if (lockedRef.current !== 'h') return
    const next = Math.max(-REVEAL, Math.min(0, baselineRef.current + rawX))
    setDx(next)
  }
  const finishGesture = () => {
    startXRef.current = null
    startYRef.current = null
    pointerIdRef.current = null
    if (lockedRef.current === 'h') {
      setDx(dx < -REVEAL / 2 ? -REVEAL : 0)
    }
    lockedRef.current = 'none'
    setDragging(false)
  }
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 10 }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        aria-label="Supprimer"
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: REVEAL,
          background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 0.2s',
          position: 'relative',
          background: 'var(--surface)',
          touchAction: 'pan-y',
          cursor: dx < 0 ? 'grabbing' : 'auto',
        }}>
        {children}
      </div>
    </div>
  )
}

const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'welcome', emoji: '🏥', title: 'Créons votre premier bilan', description: 'Je vous guide pas à pas dans la création d\'un dossier patient complet. Ça prend 2 minutes !', selector: null, tooltip: 'center' },
  { id: 'new-patient', emoji: '➕', title: 'Nouveau patient', description: 'Appuyez sur ce bouton pour créer votre premier dossier et démarrer le bilan initial.', selector: '[data-tutorial="new-patient-btn"]', tooltip: 'top', padding: 10 },
  { id: 'identity', emoji: '👤', title: 'Identité', description: 'À cette étape, renseignez les informations d\'identité de votre patient.', selector: null, tooltip: 'center' },
  { id: 'general-info', emoji: '📋', title: 'Bilan clinique', description: 'C\'est ici que vous devrez saisir les informations cliniques. Quand vous avez fini, enregistrez votre bilan.', selector: null, tooltip: 'center' },
  { id: 'bilan', emoji: '🔍', title: 'Bilan clinique 2/2', description: 'Ici vous trouverez votre bilan clinique optimisé pour la zone concernée.', selector: null, tooltip: 'center' },
  { id: 'done', emoji: '🎉', title: 'Bilan créé avec succès !', description: 'Excellent travail. Que souhaitez-vous faire avec ce bilan ?', selector: null, tooltip: 'center', isActionStep: true },
]

function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [theme, setTheme] = useTheme()
  const [language, setLanguage] = useLocalStorage<'fr' | 'de' | 'en'>('physio_lang', 'fr')
  const [notificationsEnabled, setNotificationsEnabled] = useLocalStorage<boolean>('physio_notif', true)
  const [billingType] = useLocalStorage<'monthly' | 'annual'>('physio_billing', 'monthly')
  const appContainerRef = useRef<HTMLDivElement | null>(null)
  const [showSplash, setShowSplash] = useState(() => {
    const last = sessionStorage.getItem('splash_ts')
    return !last || Date.now() - parseInt(last) > 60000
  })
  const [tutorialActive, setTutorialActive] = useState(() => localStorage.getItem('physio_tutorial_done') !== 'true')
  const [tutorialIdx, setTutorialIdx] = useState(0)

  const [step, setStep] = useState<Step>('dashboard')
  // ── iOS-style swipe navigation ──────────────────────────────────────────────
  const swipeRef = useRef<{ x: number; y: number; dir: 'h' | 'v' | null } | null>(null)
  const [swipeDragX, setSwipeDragX] = useState(0)
  const [slideEntry, setSlideEntry] = useState<'from-left' | 'from-right' | null>(null)
  const [slideReady, setSlideReady] = useState(false)
  const swipedNav = useRef(false) // prevents fade-in after swipe

  const onTouchStart = (e: React.TouchEvent) => {
    if (slideEntry) return
    swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dir: null }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!swipeRef.current || slideEntry) return
    const dx = e.touches[0].clientX - swipeRef.current.x
    const dy = e.touches[0].clientY - swipeRef.current.y
    if (!swipeRef.current.dir) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        swipeRef.current.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      }
      return
    }
    if (swipeRef.current.dir !== 'h') return
    if (step === 'dashboard' && dx > 0) setSwipeDragX(dx)
    else if (step === 'database' && !selectedPatient && dx < 0) setSwipeDragX(dx)
    else if (step === 'database' && selectedPatient && dx > 0) setSwipeDragX(dx)
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!swipeRef.current || swipeRef.current.dir !== 'h' || slideEntry) {
      swipeRef.current = null
      setSwipeDragX(0)
      return
    }
    const dx = e.changedTouches[0].clientX - swipeRef.current.x
    swipeRef.current = null

    if (step === 'dashboard' && dx > 80) {
      setSwipeDragX(0)
      swipedNav.current = true
      setSlideEntry('from-left'); setSlideReady(false)
      setSelectedPatient(null); setSearchQuery(''); setStep('database')
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setSlideReady(true)
        setTimeout(() => { setSlideEntry(null); setSlideReady(false) }, 420)
      }))
    } else if (step === 'database' && selectedPatient && dx > 80) {
      setSwipeDragX(0)
      swipedNav.current = true
      setSlideEntry('from-left'); setSlideReady(false)
      setSelectedPatient(null)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setSlideReady(true)
        setTimeout(() => { setSlideEntry(null); setSlideReady(false) }, 420)
      }))
    } else if (step === 'database' && !selectedPatient && dx < -80) {
      setSwipeDragX(0)
      swipedNav.current = true
      setSlideEntry('from-right'); setSlideReady(false)
      setStep('dashboard')
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setSlideReady(true)
        setTimeout(() => { setSlideEntry(null); setSlideReady(false) }, 420)
      }))
    } else {
      setSwipeDragX(0)
    }
  }
  const swipeDragStyle: React.CSSProperties = swipeDragX ? {
    transform: `translateX(${swipeDragX}px)`,
    opacity: Math.max(0.3, 1 - Math.abs(swipeDragX) / 400),
  } : {}
  const slideEntryStyle: React.CSSProperties = slideEntry ? {
    transform: slideReady ? 'translateX(0)' : `translateX(${slideEntry === 'from-left' ? '-100%' : '100%'})`,
    transition: slideReady ? 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1)' : 'none',
  } : {}
  const [initialLetterType, setInitialLetterType] = useState<string | null>(null)
  const [bilanSortieForLetter, setBilanSortieForLetter] = useState<Record<string, unknown> | null>(null)
  const { toasts, showToast, removeToast } = useToast()
  // ── Persistent state (IndexedDB — no size limit) ───────────────────────────
  const [db, setDb, dbLoaded] = useIndexedDB<BilanRecord[]>('physio_db', DEMO_DB)
  const [dbIntermediaires, setDbIntermediaires, intLoaded] = useIndexedDB<BilanIntermediaireRecord[]>('physio_intermediaires_db', [])
  const [dbNotes, setDbNotes, notesLoaded] = useIndexedDB<NoteSeanceRecord[]>('physio_notes_seance_db', [])
  const [dbObjectifs, setDbObjectifs, objLoaded] = useIndexedDB<SmartObjectif[]>('physio_objectifs_db', [])
  const [dbExerciceBank, setDbExerciceBank, exLoaded] = useIndexedDB<ExerciceBankEntry[]>('physio_exercice_bank', [])
  const [dbPatientDocs, setDbPatientDocs, docsLoaded] = useIndexedDB<PatientDocument[]>('physio_patient_docs', [])
  const [dbLetters, setDbLetters, lettersLoaded] = useIndexedDB<LetterRecord[]>('physio_letters', [])
  const [dbLetterAudit, setDbLetterAudit, auditLoaded] = useIndexedDB<LetterAuditEntry[]>('physio_letter_audit', [])
  const [dbAICallAudit, setDbAICallAudit, aiAuditLoaded] = useIndexedDB<AICallAuditEntry[]>('physio_ai_call_audit', [])
  const [dbPrescriptions, setDbPrescriptions] = useIndexedDB<PatientPrescription[]>('physio_prescriptions', [])
  const [dbClosedTreatments, setDbClosedTreatments, closedLoaded] = useIndexedDB<ClosedTreatment[]>('physio_closed_treatments', [])
  // Accordéon : zones repliées par patient (clé = `${patientKey}::${bilanType}`)
  const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set())
  // Épisodes clôturés dépliés (clé = `${patientKey}::${bilanType}::${closureId}`) — état UI volatile.
  const [expandedClosedEpisodes, setExpandedClosedEpisodes] = useState<Set<string>>(new Set())
  // Zone courante pour le rapport d'évolution IA (quand plusieurs PEC parallèles)
  const [evolutionZoneType, setEvolutionZoneType] = useState<BilanType | null>(null)
  // Modal de choix de zone pour les 4 actions du ConsultationChooser (séance, bilan intermédiaire, bilan de sortie, courrier).
  const [letterZonePicker, setLetterZonePicker] = useState<{ action: 'letter' | 'bilan_sortie' | 'seance' | 'intermediaire' } | null>(null)
  const isOnline = useOnlineStatus()
  const [profile, setProfile, profLoaded] = useIndexedDB<ProfileData>('physio_profile', DEFAULT_PROFILE)
  const [_apiKeyStored, _setApiKey, keyLoaded] = useIndexedDB<string>('physio_api_key', '')
  const [onboarded, setOnboarded] = useIndexedDB<boolean>('physio_onboarded_v3', false)
  // Vertex AI: auth is server-side, no client key needed — always truthy
  const apiKey = 'vertex'
  const allDataLoaded = dbLoaded && intLoaded && notesLoaded && objLoaded && exLoaded && docsLoaded && lettersLoaded && auditLoaded && aiAuditLoaded && profLoaded && keyLoaded && closedLoaded

  // ── Sync IndexedDB ↔ Supabase ──────────────────────────────────────────────
  const { syncStatus } = useSync({
    user, allDataLoaded,
    db, setDb, dbIntermediaires, setDbIntermediaires,
    dbNotes, setDbNotes, dbObjectifs, setDbObjectifs,
    dbExerciceBank, setDbExerciceBank, dbPatientDocs, setDbPatientDocs,
    dbLetters, setDbLetters, dbLetterAudit, setDbLetterAudit,
    dbAICallAudit, setDbAICallAudit, dbPrescriptions, setDbPrescriptions,
    dbClosedTreatments, setDbClosedTreatments, profile, setProfile,
  })

  /**
   * Attache un PDF auto-généré (bilan, analyse IA, évolution) au dossier patient.
   * Stocke le blob en base64 dans IndexedDB via setDbPatientDocs.
   * Échec silencieux pour ne pas casser l'export — l'utilisateur a déjà son
   * téléchargement local, l'auto-save est un bonus.
   */
  const attachPdfToPatient = useCallback(async (
    blob: Blob,
    fileName: string,
    patientKey: string,
    source: Exclude<PatientDocumentSource, 'upload'>,
  ) => {
    if (!patientKey) return
    try {
      const doc = await buildGeneratedPatientDoc(blob, patientKey, fileName, source)
      setDbPatientDocs(prev => [...prev, doc])
    } catch (err) {
      console.warn('[attachPdfToPatient] failed to persist generated PDF', err)
    }
  }, [setDbPatientDocs])

  // Si un profil existe déjà dans le cloud (nom rempli après sync), considérer
  // l'utilisateur comme onboardé — évite de refaire le wizard quand on se
  // reconnecte depuis un nouvel appareil ou un nouveau domaine (IndexedDB neuve).
  useEffect(() => {
    if (!onboarded && syncStatus === 'done' && profile.nom && profile.nom.trim() !== '') {
      setOnboarded(true)
    }
  }, [onboarded, syncStatus, profile.nom, setOnboarded])

  // Helper pour enregistrer une entrée d'audit AI (cap à 2000 entrées récentes pour éviter la saturation)
  const recordAIAudit = useCallback((entry: AICallAuditEntry) => {
    setDbAICallAudit(prev => {
      const next = [...prev, entry]
      return next.length > 2000 ? next.slice(next.length - 2000) : next
    })
  }, [setDbAICallAudit])

  // ── Modal globale de confirmation pour l'envoi de documents non masqués ─
  const [unmaskedPrompt, setUnmaskedPrompt] = useState<{
    docs: BilanDocument[]
    resolve: (ok: boolean) => void
  } | null>(null)

  /**
   * Affiche une modal demandant à l'utilisateur s'il accepte d'envoyer des
   * documents non masqués à l'IA. Renvoie une Promise<boolean> — true =
   * accepté, false = refusé. Usage dans les sites appelants :
   *
   *   try {
   *     await callClaudeSecure({...})
   *   } catch (e) {
   *     if (e instanceof UnmaskedDocumentsError) {
   *       const ok = await askUnmaskedDocsConfirm(e.unmaskedDocs)
   *       if (ok) await callClaudeSecure({..., userAcknowledgedUnmasked: true})
   *     }
   *   }
   */
  const askUnmaskedDocsConfirm = useCallback((docs: BilanDocument[]): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      setUnmaskedPrompt({ docs, resolve })
    })
  }, [])

  /**
   * Wrapper autour de callClaudeSecure qui gère automatiquement la confirmation
   * utilisateur en cas de documents non masqués. Rejoue l'appel avec
   * userAcknowledgedUnmasked=true si le praticien accepte, ou lève une erreur
   * silencieuse sinon (pour que l'appelant puisse abandonner proprement).
   */
  const callClaudeWithDocGuard = useCallback(async (
    opts: Parameters<typeof callClaudeSecure>[0]
  ): Promise<string> => {
    try {
      return await callClaudeSecure(opts)
    } catch (err) {
      if (err instanceof UnmaskedDocumentsError) {
        const ok = await askUnmaskedDocsConfirm(err.unmaskedDocs)
        if (!ok) throw new Error('UNMASKED_DOCS_CANCELLED')
        return await callClaudeSecure({ ...opts, userAcknowledgedUnmasked: true })
      }
      throw err
    }
  }, [askUnmaskedDocsConfirm])

  // ── Transient UI state ────────────────────────────────────────────────────────
  const [currentBilanId, setCurrentBilanId] = useState<number | null>(null)
  const [currentAnalyseIA, setCurrentAnalyseIA] = useState<AnalyseIA | null>(null)
  const [currentBilanDataOverride, setCurrentBilanDataOverride] = useState<Record<string, unknown> | null>(null)
  const [ficheBackStep, setFicheBackStep] = useState<'analyse_ia' | 'database'>('analyse_ia')
  const [ficheExerciceContextOverride, setFicheExerciceContextOverride] = useState<{ notesLibres: string; bilanData: Record<string, unknown>; zone: string } | null>(null)
  const [ficheExerciceSource, setFicheExerciceSource] = useState<{ type: 'note' | 'intermediaire'; id: number } | null>(null)
  const [bilanZoneBackStep, setBilanZoneBackStep] = useState<'identity' | 'general_info' | 'database'>('general_info')
  const [deletingBilanId, setDeletingBilanId] = useState<number | null>(null)
  const [editingLabelBilanId, setEditingLabelBilanId] = useState<number | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [resumeBilan, setResumeBilan] = useState<{ record: BilanRecord; bilanNum: number } | null>(null)
  // testingApiKey / apiKeyStatus removed — Vertex AI, no client key needed
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [patientMode, setPatientMode] = useState<'new' | 'existing'>('new')
  const [silhouetteData, setSilhouetteData] = useState<Record<string, unknown>>({})
  const [bilanDocuments, setBilanDocuments] = useState<BilanDocument[]>([])
  const [showDocSourceMenu, setShowDocSourceMenu] = useState(false)
  const [rxEditPopup, setRxEditPopup] = useState<{ mode: 'add' | 'edit'; entry?: import('./types').PrescriptionEntry } | null>(null)
  const [rxEditForm, setRxEditForm] = useState<{ nbSeances: string; prescripteur: string; datePrescription: string; seancesAnterieures: string; bilanType: BilanType | ''; customLabel: string }>({ nbSeances: '', prescripteur: '', datePrescription: '', seancesAnterieures: '', bilanType: '', customLabel: '' })
  const [orphanPopupOpen, setOrphanPopupOpen] = useState(false)
  const [rxGroupPicker, setRxGroupPicker] = useState<(import('./types').PrescriptionEntry & { done: number })[] | null>(null)
  const [rxEditDoc, setRxEditDoc] = useState<{ data: string; mimeType: string; name: string } | null>(null)
  const [rxDocViewer, setRxDocViewer] = useState<{ data: string; mimeType: string; name: string } | null>(null)
  const [rxMaskingItem, setRxMaskingItem] = useState<{ dataUrl: string; name: string; mimeType: string } | null>(null)
  const [maskingQueue, setMaskingQueue] = useState<Array<{ dataUrl: string; name: string; mimeType: string }>>([])
  const [patientDocMaskingQueue, setPatientDocMaskingQueue] = useState<Array<{ dataUrl: string; name: string; mimeType: string }>>([])
  const [selectedBodyZone, setSelectedBodyZone] = useState<string | null>(null)
  const [showZonePopup, setShowZonePopup] = useState(false)
  const [currentBilanIntermediaireId, setCurrentBilanIntermediaireId] = useState<number | null>(null)
  const [currentBilanIntermediaireData, setCurrentBilanIntermediaireData] = useState<Record<string, unknown> | null>(null)
  const [bilanIntermediaireZone, setBilanIntermediaireZone] = useState<string | null>(null)
  const [showIntermediaireZoneSelector, setShowIntermediaireZoneSelector] = useState(false)
  const [deletingIntermediaireId, setDeletingIntermediaireId] = useState<number | null>(null)
  const [currentIntermediaireForNote, setCurrentIntermediaireForNote] = useState<BilanIntermediaireRecord | null>(null)
  const [currentIntermediaireHistorique, setCurrentIntermediaireHistorique] = useState<BilanIntermediaireEntry[]>([])
  const [currentNoteSeanceId, setCurrentNoteSeanceId] = useState<number | null>(null)
  const [currentNoteSeanceData, setCurrentNoteSeanceData] = useState<NoteSeanceData | null>(null)
  const [noteSeanceZone, setNoteSeanceZone] = useState<string | null>(null)
  const [showNoteSeanceZoneSelector, setShowNoteSeanceZoneSelector] = useState(false)
  const [deletingNoteSeanceId, setDeletingNoteSeanceId] = useState<number | null>(null)
  const [openAnalyseNoteIds, setOpenAnalyseNoteIds] = useState<Set<number>>(new Set())
  const [openNoteDetailIds, setOpenNoteDetailIds] = useState<Set<number>>(new Set())
  // Timeline compacte : une seule ligne dépliée à la fois (clé = `bilan-${id}` | `note-${id}` | `interm-${id}`).
  // Ouvrir une autre ligne replie la courante — évite le scroll infini quand le patient a beaucoup d'éléments.
  const [openTimelineKey, setOpenTimelineKey] = useState<string | null>(null)
  const toggleTimeline = (key: string) => setOpenTimelineKey(k => k === key ? null : key)
  const [showAddPatientChoice, setShowAddPatientChoice] = useState(false)
  const [deletingPatientKey, setDeletingPatientKey] = useState<string | null>(null)
  // Migration sexe : popup bloquante déclenchée à l'ouverture d'une fiche patient
  // créée avant l'introduction du champ sexe (aucun BilanRecord du patient ne le porte).
  // Une seule complétion par patient → data propagée à tous ses bilans (update batch).
  const [sexeMigrationTarget, setSexeMigrationTarget] = useState<{ patKey: string; nom: string; prenom: string } | null>(null)
  const [sexeMigrationChoice, setSexeMigrationChoice] = useState<'' | 'masculin' | 'feminin'>('')
  // ── UI state for Command Center refonte ───────────────────────────────────
  const [consultationChooserOpen, setConsultationChooserOpen] = useState(false)
  const [showQuickAddPatient, setShowQuickAddPatient] = useState(false)
  const [quickAddData, setQuickAddData] = useState({ nom: '', prenom: '', dateNaissance: '', sexe: '' as '' | 'masculin' | 'feminin', zone: '', evn: '', pathologie: '', notes: '' })
  const [pdfPreviewMarkdown, setPdfPreviewMarkdown] = useState('')
  const [pdfPreviewZone, setPdfPreviewZone] = useState('')
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('')
  // undefined = comportement par défaut (10. Signature + Bilan_Physiotherapie).
  // Le rapport d'évolution surcharge : signatureTitle=null, filenamePrefix='Rapport_Evolution'.
  const [pdfPreviewSignatureTitle, setPdfPreviewSignatureTitle] = useState<string | null | undefined>(undefined)
  const [pdfPreviewFilenamePrefix, setPdfPreviewFilenamePrefix] = useState<string | undefined>(undefined)
  // Origine attachée au PDF auto-sauvegardé dans le dossier patient.
  const [pdfPreviewSource, setPdfPreviewSource] = useState<Exclude<PatientDocumentSource, 'upload'>>('analyse-ia')
  const [pdfPreviewPatientKey, setPdfPreviewPatientKey] = useState<string>('')
  const [profileEditDraft, setProfileEditDraft] = useState<ProfileData>(profile)
  // apiKeyDraft removed — Vertex AI, no client key needed

  const [formData, setFormData] = useState({
    nom: '', prenom: '', dateNaissance: '', sexe: '' as '' | 'masculin' | 'feminin',
    profession: '', sport: '', famille: '', chirurgie: '', notes: ''
  })
  const [bilanNotes, setBilanNotes] = useState('')

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const bilanEpauleRef   = useRef<BilanEpauleHandle>(null)
  const bilanChevilleRef = useRef<BilanChevilleHandle>(null)
  const bilanGenouRef    = useRef<BilanGenouHandle>(null)
  const bilanHancheRef   = useRef<BilanHancheHandle>(null)
  const bilanCervicalRef = useRef<BilanCervicalHandle>(null)
  const bilanLombaireRef = useRef<BilanLombaireHandle>(null)
  const bilanGeneriqueRef     = useRef<BilanGeneriqueHandle>(null)
  const bilanGeriatriqueRef   = useRef<BilanGeriatriqueHandle>(null)
  const bilanIntermediaireRef = useRef<BilanIntermediaireHandle>(null)
  const bilanIntermediaireGeriatriqueRef = useRef<BilanIntermediaireGeriatriqueHandle>(null)
  const noteSeanceRef         = useRef<NoteSeanceHandle>(null)
  const photoInputRef         = useRef<HTMLInputElement>(null)
  const importDataRef         = useRef<HTMLInputElement>(null)

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const updateField = useCallback((field: keyof typeof formData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value })), [])

  const goToPatientRecord = useCallback(() => {
    const key = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
    setSelectedPatient(key)
    setStep('database')
  }, [formData.nom, formData.prenom])

  const handleQuitBilan = () => {
    if ((formData.nom || currentBilanId !== null) && selectedBodyZone) {
      // Si le bilan existe déjà et est complet, ne pas le repasser en brouillon
      const existing = currentBilanId !== null ? db.find(r => r.id === currentBilanId) : null
      if (!existing || existing.status !== 'complet') {
        saveBilan('incomplet')
      }
    }
    const key = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
    resetForm()
    setSelectedBodyZone(null)
    setSelectedPatient(key)
    setStep('database')
  }

  const resetForm = useCallback(() => {
    setFormData({ nom: '', prenom: '', dateNaissance: '', sexe: '', profession: '', sport: '', famille: '', chirurgie: '', notes: '' })
    setSilhouetteData({})
    setBilanDocuments([])
    setPatientMode('new')
    setCurrentAnalyseIA(null)
    setBilanNotes('')
    setCurrentBilanId(null)
    setCurrentBilanDataOverride(null)
    setBilanZoneBackStep('general_info')
  }, [])

  const getIntermediairePreFill = (patKey: string, zone: string): Record<string, unknown> => {
    const bilanType = getBilanType(zone)
    const first = getPatientBilans(patKey).find(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === bilanType)
    if (!first) return {}
    const douleur = (first.bilanData?.douleur as Record<string, unknown>) ?? {}
    const initScores = (first.bilanData?.scores as Record<string, string>) ?? {}

    // Récupérer noms d'activités PSFS depuis le dernier bilan intermédiaire de la même zone
    const lastInter = dbIntermediaires
      .filter(r => r.patientKey === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === bilanType)
      .sort((a, b) => b.id - a.id)[0]
    const lastPs = ((lastInter?.data as Record<string, unknown>)?.troncCommun as Record<string, unknown>)?.psfs as Record<string, unknown> ?? {}

    // Scores fonctionnels module spécifique — initial depuis le bilan initial
    const modScores: Record<string, string> = {}
    if (bilanType === 'cheville') {
      if (initScores.faam) modScores.faamInit = initScores.faam
      if (initScores.ffaam) modScores.faamInit = initScores.ffaam
      if (initScores.cait) modScores.cumberlandInit = initScores.cait
      if (initScores.had) modScores.hadInit = initScores.had
      if (initScores.dn4) modScores.dn4Init = initScores.dn4
    } else if (bilanType === 'epaule') {
      if (initScores.scoreOSS) modScores.ossInit = initScores.scoreOSS
      if (initScores.scoreConstant) modScores.constantInit = initScores.scoreConstant
      if (initScores.scoreDASH) modScores.dashInit = initScores.scoreDASH
      if (initScores.scoreRowe) modScores.roweInit = initScores.scoreRowe
      if (initScores.scoreHAD) modScores.hadInit = initScores.scoreHAD
      if (initScores.scoreDN4) modScores.dn4Init = initScores.scoreDN4
      if (initScores.scoreSensibilisation) modScores.sensiCInit = initScores.scoreSensibilisation
    } else if (bilanType === 'genou') {
      if (initScores.koos) modScores.koosInit = initScores.koos
      if (initScores.fakps) modScores.fakpsInit = initScores.fakps
      if (initScores.ikdc) modScores.ikdcInit = initScores.ikdc
      if (initScores.aclRsi) modScores.aclRsiInit = initScores.aclRsi
      if (initScores.sf36) modScores.sf36Init = initScores.sf36
      if (initScores.had) modScores.hadInit = initScores.had
      if (initScores.dn4) modScores.dn4Init = initScores.dn4
    } else if (bilanType === 'hanche') {
      if (initScores.hoos) modScores.hoosInit = initScores.hoos
      if (initScores.oxfordHip) modScores.oxfordHipInit = initScores.oxfordHip
      if (initScores.hagos) modScores.hagosInit = initScores.hagos
      if (initScores.efmi) modScores.efmiInit = initScores.efmi
      if (initScores.had) modScores.hadInit = initScores.had
      if (initScores.dn4) modScores.dn4Init = initScores.dn4
      if (initScores.sensibilisation) modScores.sensiCInit = initScores.sensibilisation
    } else if (bilanType === 'cervical') {
      if (initScores.ndi) modScores.ndiInit = initScores.ndi
      if (initScores.had) modScores.hadInit = initScores.had
      if (initScores.dn4) modScores.dn4Init = initScores.dn4
      if (initScores.painDetect) modScores.painDetectInit = initScores.painDetect
      if (initScores.sensibilisation) modScores.sensiCInit = initScores.sensibilisation
    } else if (bilanType === 'lombaire') {
      if (initScores.startBack) modScores.startBackInit = initScores.startBack
      if (initScores.orebro) modScores.orebroInit = initScores.orebro
      if (initScores.fabq) modScores.fabqInit = initScores.fabq
      if (initScores.eifel) modScores.eifelInit = initScores.eifel
      if (initScores.had) modScores.hadInit = initScores.had
      if (initScores.dn4) modScores.dn4Init = initScores.dn4
      if (initScores.painDetect) modScores.painDetectInit = initScores.painDetect
      if (initScores.sensibilisation) modScores.sensiCInit = initScores.sensibilisation
    }

    // PSFS initial — nouvelle structure (array d'items) si présente, sinon legacy
    const psfsArray = first.bilanData?.psfs as Array<{ label?: string; score?: string; notes?: string }> | undefined
    const psfsInit1 = Array.isArray(psfsArray) && psfsArray[0]?.score ? String(psfsArray[0].score)
      : bilanType === 'epaule' ? String(initScores.psfs1 ?? '') : String(initScores.psfs ?? '')
    const psfsInit2 = Array.isArray(psfsArray) && psfsArray[1]?.score ? String(psfsArray[1].score)
      : bilanType === 'epaule' ? String(initScores.psfs2 ?? '') : ''
    const psfsInit3 = Array.isArray(psfsArray) && psfsArray[2]?.score ? String(psfsArray[2].score)
      : bilanType === 'epaule' ? String(initScores.psfs3 ?? '') : ''
    const psfsLabel1 = Array.isArray(psfsArray) && psfsArray[0]?.label ? String(psfsArray[0].label) : String(initScores.psfs1Label ?? '')
    const psfsLabel2 = Array.isArray(psfsArray) && psfsArray[1]?.label ? String(psfsArray[1].label) : String(initScores.psfs2Label ?? '')
    const psfsLabel3 = Array.isArray(psfsArray) && psfsArray[2]?.label ? String(psfsArray[2].label) : String(initScores.psfs3Label ?? '')

    return {
      troncCommun: {
        evn: {
          pireInitial:  String(douleur.evnPire  ?? first.evn ?? ''),
          mieuxInitial: String(douleur.evnMieux ?? first.evn ?? ''),
          moyInitial:   String(douleur.evnMoy   ?? first.evn ?? ''),
        },
        douleurNocturne: {
          initiale: String(douleur.nocturne ?? ''),
        },
        flags: {
          autoEfficaciteInitiale: String((first.bilanData?.yellowFlags as Record<string, unknown>)?.autoEfficacite ?? ''),
        },
        psfs: {
          init1: psfsInit1,
          init2: psfsInit2,
          init3: psfsInit3,
          nom1: String(lastPs.nom1 ?? psfsLabel1 ?? ''),
          nom2: String(lastPs.nom2 ?? psfsLabel2 ?? ''),
          nom3: String(lastPs.nom3 ?? psfsLabel3 ?? ''),
        },
      },
      moduleSpecifique: {
        scores: modScores,
      },
    }
  }

  const getPatientIntermediaires = (key: string) =>
    dbIntermediaires.filter(r => r.patientKey === key).sort((a, b) => {
      const ta = parseFrDate(a.dateBilan)
      const tb = parseFrDate(b.dateBilan)
      if (ta !== tb) return ta - tb
      return a.id - b.id
    })

  const handleSaveIntermediaire = (status: 'incomplet' | 'complet') => {
    const isGeriatric = getBilanType(bilanIntermediaireZone ?? '') === 'geriatrique'
    const data = (isGeriatric
      ? bilanIntermediaireGeriatriqueRef.current?.getData()
      : bilanIntermediaireRef.current?.getData()
    ) ?? {}
    const now = new Date().toLocaleDateString('fr-FR')
    const patKey = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
    const avatarBg = db.find(r => `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim() === patKey)?.avatarBg
    if (currentBilanIntermediaireId !== null) {
      setDbIntermediaires(prev => prev.map(r =>
        r.id === currentBilanIntermediaireId ? { ...r, data, status } : r
      ))
    } else {
      setDbIntermediaires(prev => [...prev, {
        id: Date.now(),
        patientKey: patKey,
        nom: formData.nom,
        prenom: formData.prenom,
        dateNaissance: formData.dateNaissance,
        dateBilan: now,
        zone: bilanIntermediaireZone ?? undefined,
        bilanType: getBilanType(bilanIntermediaireZone ?? ''),
        avatarBg,
        data,
        status,
      }])
    }
    setCurrentBilanIntermediaireId(null)
    setCurrentBilanIntermediaireData(null)
    setBilanIntermediaireZone(null)
    const key = patKey
    setSelectedPatient(key)
    setStep('database')
    showToast(status === 'complet' ? 'Bilan intermédiaire enregistré ✓' : 'Bilan intermédiaire sauvegardé (incomplet)', status === 'complet' ? 'success' : 'info')
  }

  // Notes de séance triées par date chronologique croissante puis par id (n°1 avant n°2)
  const getPatientNotes = (key: string) =>
    dbNotes.filter(r => r.patientKey === key).sort((a, b) => {
      const ta = parseFrDate(a.dateSeance)
      const tb = parseFrDate(b.dateSeance)
      if (ta !== tb) return ta - tb
      return a.id - b.id
    })

  const handleGenerateExercices = useCallback(async (prompt: string): Promise<ExerciceDomicile[]> => {
    const systemPrompt = `Tu es un kinésithérapeute expert. À partir de la dictée du thérapeute, génère la liste des exercices à domicile structurés en JSON.

Le thérapeute peut dicter :
- plusieurs exercices d'un coup ("squat mural 3×15, pont fessier 3×12…") → tu renvoies TOUS les exercices
- un seul exercice décrit librement → tu renvoies un array à 1 élément

Réponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de commentaire) avec cette structure exacte :
{
  "exercices": [
    {
      "nom": "Nom professionnel de l'exercice",
      "categorie": "Catégorie · Contexte (ex: Renforcement quadriceps · Phase 2 post-LCA)",
      "protocole": {
        "series": "3",
        "tempsOuReps": "15" ou "30 sec",
        "recuperation": "45 sec",
        "frequence": "2× par jour"
      },
      "description": "Consignes brèves : position de départ, mouvement clé, limite de sécurité. Langage accessible au patient."
    }
  ]
}

Règles :
- Si le thérapeute donne un dosage explicite (ex: "3×15"), utilise-le tel quel.
- Si aucun dosage n'est donné, propose un dosage adapté au contexte clinique.
- Maximum 6 exercices.
- Sois précis et professionnel.`

    const result = await callClaudeSecure({
      apiKey,
      systemPrompt,
      userPrompt: prompt,
      maxOutputTokens: 4096,
      jsonMode: true,
      patient: { nom: formData.nom || '', prenom: formData.prenom || '', patientKey: `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim() },
      category: 'fiche_exercice',
    })

    const parsed = JSON.parse(result)
    const list = Array.isArray(parsed?.exercices) ? parsed.exercices : []
    return list.map((ex: { nom?: string; categorie?: string; protocole?: ExerciceDomicile['protocole']; description?: string }) => ({
      nom: ex.nom || prompt,
      fait: false,
      categorie: ex.categorie || '',
      protocole: ex.protocole || undefined,
      description: ex.description || '',
      source: 'ia' as const,
    }))
  }, [apiKey, formData.nom, formData.prenom])

  const handleExportExercicesPDF = useCallback((exercices: ExerciceDomicile[]) => {
    if (exercices.length === 0) return
    downloadExercicesPDF(exercices, {
      patient: { nom: formData.nom, prenom: formData.prenom },
      zone: noteSeanceZone ?? undefined,
    })
  }, [formData.nom, formData.prenom, noteSeanceZone])

  const handleSaveNote = () => {
    const data = noteSeanceRef.current?.getData()
    if (!data) return
    const now = new Date().toLocaleDateString('fr-FR')
    const patKey = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
    const avatarBg = db.find(r => `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim() === patKey)?.avatarBg
    const bilanType = getBilanType(noteSeanceZone ?? '')
    const numSeance = currentNoteSeanceId !== null
      ? (dbNotes.find(r => r.id === currentNoteSeanceId)?.numSeance ?? '')
      : String(getPatientNotes(patKey).filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === bilanType).length + 1)
    if (currentNoteSeanceId !== null) {
      setDbNotes(prev => prev.map(r =>
        r.id === currentNoteSeanceId ? { ...r, data, dateSeance: now, numSeance } : r
      ))
    } else {
      setDbNotes(prev => [...prev, {
        id: Date.now(),
        patientKey: patKey,
        nom: formData.nom,
        prenom: formData.prenom,
        dateNaissance: formData.dateNaissance,
        dateSeance: now,
        numSeance,
        zone: noteSeanceZone ?? '',
        bilanType,
        avatarBg,
        data,
      }])
    }
    setCurrentNoteSeanceId(null)
    setCurrentNoteSeanceData(null)
    setNoteSeanceZone(null)
    setSelectedPatient(patKey)
    setStep('database')
    showToast('Note de séance enregistrée ✓', 'success')
  }

  const openNoteIntermediaire = (rec: BilanIntermediaireRecord) => {
    const patKey = rec.patientKey
    const bilanType = rec.bilanType ?? getBilanType(rec.zone ?? '')
    const initiaux = db
      .filter(r => `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim() === patKey)
      .filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === bilanType)
      .sort((a, b) => a.id - b.id)
    const interms = dbIntermediaires
      .filter(r => r.patientKey === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === bilanType)
      .filter(r => r.id !== rec.id)
      .sort((a, b) => a.id - b.id)
    const historique: BilanIntermediaireEntry[] = [
      ...initiaux.map((r, i) => ({ type: 'initial' as const, num: i + 1, date: r.dateBilan, evn: r.evn ?? null, bilanData: r.bilanData ?? {}, analyseIA: r.analyseIA ? { titre: r.analyseIA.diagnostic.titre, description: r.analyseIA.diagnostic.description } : null, ficheExercice: r.ficheExercice })),
      ...interms.map((r, i) => ({ type: 'intermediaire' as const, num: i + 1, date: r.dateBilan, evn: null, bilanData: r.data ?? {}, analyseIA: r.analyseIA ? { titre: r.analyseIA.noteDiagnostique.titre, description: r.analyseIA.noteDiagnostique.description, evolution: r.analyseIA.noteDiagnostique.evolution } : null, ficheExercice: r.ficheExercice })),
    ]
    setFormData(prev => ({ ...prev, nom: rec.nom, prenom: rec.prenom, dateNaissance: rec.dateNaissance }))
    setCurrentIntermediaireForNote(rec)
    setCurrentIntermediaireHistorique(historique)
    setStep('note_intermediaire')
  }

  const getPatientBilans = (key: string) =>
    db.filter(r => `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim() === key)
      .sort((a, b) => a.id - b.id)

  // Sexe = source de vérité unique au niveau du patient. On le stocke sur chaque
  // BilanRecord mais on le lit en remontant le premier record qui le porte pour
  // un patKey donné. Renvoie undefined si aucun bilan ne l'a encore renseigné.
  const getPatientSexe = (key: string): 'masculin' | 'feminin' | undefined => {
    for (const r of getPatientBilans(key)) {
      if (r.sexe === 'masculin' || r.sexe === 'feminin') return r.sexe
    }
    return undefined
  }

  // Hydrate formData.sexe quand on change de patient (nom/prenom). Si le patient
  // a déjà un sexe enregistré dans la base, on le récupère. Sinon on garde la
  // valeur courante (permet à l'utilisateur de choisir pour un nouveau patient).
  useEffect(() => {
    const key = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
    const saved = getPatientSexe(key)
    if (saved && formData.sexe !== saved) {
      setFormData(prev => ({ ...prev, sexe: saved }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.nom, formData.prenom, db])

  // Migration sexe : à l'ouverture d'une fiche patient existante, si aucun bilan
  // ne porte le sexe du patient, déclencher la popup bloquante. Pour un patient
  // nouvellement créé (formData.sexe rempli), on ne l'affiche pas.
  useEffect(() => {
    if (!selectedPatient) {
      if (sexeMigrationTarget) { setSexeMigrationTarget(null); setSexeMigrationChoice('') }
      return
    }
    const saved = getPatientSexe(selectedPatient)
    if (saved) {
      if (sexeMigrationTarget) { setSexeMigrationTarget(null); setSexeMigrationChoice('') }
      return
    }
    // Pas de sexe → déclencher popup. Chercher un bilan pour récupérer nom/prénom affichables.
    const first = db.find(r => `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim() === selectedPatient)
    if (!first) return
    if (!sexeMigrationTarget || sexeMigrationTarget.patKey !== selectedPatient) {
      setSexeMigrationTarget({ patKey: selectedPatient, nom: first.nom, prenom: first.prenom })
      setSexeMigrationChoice('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient, db])

  // ── Clôture de prise en charge ───────────────────────────────────────────
  /** Timestamps (ms) des clôtures pour un (patient, bilanType), triés ASC. */
  const getClosureTimes = (patientKey: string, bilanType: BilanType): number[] =>
    dbClosedTreatments
      .filter(c => c.patientKey === patientKey && c.bilanType === bilanType)
      .map(c => new Date(c.closedAt).getTime())
      .sort((a, b) => a - b)

  /**
   * Un traitement est "clôturé" (au sens de l'épisode courant) SEULEMENT si la
   * dernière clôture n'a été suivie d'aucun nouveau record (bilan, interm, séance
   * ou prescription). Dès qu'un nouvel enregistrement arrive après la clôture,
   * on considère qu'un nouvel épisode est ouvert — le traitement redevient actif.
   */
  const isTreatmentClosed = (patientKey: string, bilanType: BilanType): boolean => {
    const closureTimes = getClosureTimes(patientKey, bilanType)
    if (closureTimes.length === 0) return false
    const latest = closureTimes[closureTimes.length - 1]
    const hasBilanAfter = db.some(r =>
      `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim() === patientKey
      && (r.bilanType ?? getBilanType(r.zone ?? '')) === bilanType
      && r.id > latest
    )
    if (hasBilanAfter) return false
    const hasInterAfter = dbIntermediaires.some(r =>
      r.patientKey === patientKey
      && (r.bilanType ?? getBilanType(r.zone ?? '')) === bilanType
      && r.id > latest
    )
    if (hasInterAfter) return false
    const hasNoteAfter = dbNotes.some(n =>
      n.patientKey === patientKey
      && (n.bilanType ?? getBilanType(n.zone ?? '')) === bilanType
      && n.id > latest
    )
    if (hasNoteAfter) return false
    const rxEntry = dbPrescriptions.find(p => p.patientKey === patientKey)
    const hasRxAfter = (rxEntry?.prescriptions ?? []).some(pr =>
      pr.bilanType === bilanType && pr.id > latest
    )
    if (hasRxAfter) return false
    return true
  }

  /** Une prescription appartient à l'épisode courant si aucune clôture n'a été
   *  enregistrée depuis sa création (pr.id > dernière clôture). Utilisé pour
   *  séparer prescriptions actives (épisode courant) et archivées (anciens
   *  épisodes) — sans dépendre de isTreatmentClosed qui retourne false dès
   *  qu'un nouvel épisode démarre. */
  const isPrescriptionCurrent = (patientKey: string, pr: import('./types').PrescriptionEntry): boolean => {
    if (!pr.bilanType) return true
    const closureTimes = getClosureTimes(patientKey, pr.bilanType)
    if (closureTimes.length === 0) return true
    return pr.id > closureTimes[closureTimes.length - 1]
  }

  /** Épisode de prise en charge pour un (patient, bilanType).
   *  Un épisode correspond à une "vie" d'une PEC : début à la création, fin à
   *  la clôture (ou +∞ si toujours actif). Les records (bilans, interms, notes,
   *  prescriptions) appartiennent à l'épisode dont l'intervalle contient leur id.
   *  startExclusive : id > startExclusive — endInclusive : id <= endInclusive.
   *  Le dernier épisode est actif ssi une clôture n'a PAS été suivie par d'autres
   *  clôtures (id dans [lastClosure, +∞)). */
  type TreatmentEpisode = {
    idx: number
    startExclusive: number
    endInclusive: number
    isActive: boolean
    closure?: ClosedTreatment
  }
  const getTreatmentEpisodes = (patientKey: string, bilanType: BilanType): TreatmentEpisode[] => {
    const closures = dbClosedTreatments
      .filter(c => c.patientKey === patientKey && c.bilanType === bilanType)
      .slice()
      .sort((a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime())
    const eps: TreatmentEpisode[] = []
    let prev = Number.NEGATIVE_INFINITY
    closures.forEach((c, i) => {
      const end = new Date(c.closedAt).getTime()
      eps.push({ idx: i, startExclusive: prev, endInclusive: end, isActive: false, closure: c })
      prev = end
    })
    // Épisode actif final : uniquement s'il y a au moins un record après la dernière clôture
    // (ou aucune clôture du tout). Sinon on ne crée pas de carte "active" vide.
    const hasRecordAfter = (cutoff: number): boolean => {
      const hitBilan = db.some(r =>
        `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim() === patientKey
        && (r.bilanType ?? getBilanType(r.zone ?? '')) === bilanType
        && r.id > cutoff
      )
      if (hitBilan) return true
      const hitInter = dbIntermediaires.some(r =>
        r.patientKey === patientKey
        && (r.bilanType ?? getBilanType(r.zone ?? '')) === bilanType
        && r.id > cutoff
      )
      if (hitInter) return true
      const hitNote = dbNotes.some(n =>
        n.patientKey === patientKey
        && (n.bilanType ?? getBilanType(n.zone ?? '')) === bilanType
        && n.id > cutoff
      )
      if (hitNote) return true
      const rx = dbPrescriptions.find(p => p.patientKey === patientKey)
      return (rx?.prescriptions ?? []).some(pr => pr.bilanType === bilanType && pr.id > cutoff)
    }
    const cutoff = closures.length > 0 ? new Date(closures[closures.length - 1].closedAt).getTime() : Number.NEGATIVE_INFINITY
    if (closures.length === 0 || hasRecordAfter(cutoff)) {
      eps.push({ idx: eps.length, startExclusive: cutoff, endInclusive: Number.POSITIVE_INFINITY, isActive: true })
    }
    return eps
  }

  const getLastClosure = (patientKey: string, bilanType: BilanType): ClosedTreatment | undefined =>
    dbClosedTreatments.filter(c => c.patientKey === patientKey && c.bilanType === bilanType).pop()

  const closeTreatment = (patientKey: string, bilanType: BilanType, zone?: string) => {
    if (isTreatmentClosed(patientKey, bilanType)) return
    setDbClosedTreatments(prev => [...prev, {
      id: Date.now(),
      patientKey,
      bilanType,
      zone,
      closedAt: new Date().toISOString(),
    }])
  }

  const reopenTreatment = (_patientKey: string, _bilanType: BilanType, ep: TreatmentEpisode) => {
    if (!ep.closure) return
    setDbClosedTreatments(prev => prev.filter(c => c.id !== ep.closure!.id))
  }

  /** Suppression définitive d'un épisode clôturé : retire tous les bilans, interms, notes,
   *  prescriptions de l'épisode + la clôture elle-même. Utilisé quand l'utilisateur a ajouté
   *  une PEC par erreur (ex. patient "anonyme") et veut s'en débarrasser complètement. */
  const deleteClosedEpisode = (patientKey: string, bilanType: BilanType, ep: TreatmentEpisode) => {
    if (!ep.closure) return
    const inWin = (id: number) => id > ep.startExclusive && id <= ep.endInclusive
    const matchZone = (bt: BilanType | undefined, zone: string | undefined) =>
      (bt ?? getBilanType(zone ?? '')) === bilanType
    setDb(prev => prev.filter(r => !(
      `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim() === patientKey
      && matchZone(r.bilanType, r.zone)
      && inWin(r.id)
    )))
    setDbIntermediaires(prev => prev.filter(r => !(
      r.patientKey === patientKey && matchZone(r.bilanType, r.zone) && inWin(r.id)
    )))
    setDbNotes(prev => prev.filter(n => !(
      n.patientKey === patientKey && matchZone(n.bilanType, n.zone) && inWin(n.id)
    )))
    setDbPrescriptions(prev => prev.map(p => {
      if (p.patientKey !== patientKey) return p
      return { ...p, prescriptions: (p.prescriptions ?? []).filter(pr => !(pr.bilanType === bilanType && inWin(pr.id))) }
    }))
    setDbClosedTreatments(prev => prev.filter(c => c.id !== ep.closure!.id))
    setExpandedClosedEpisodes(prev => {
      const next = new Set(prev)
      next.delete(`${patientKey}::${bilanType}::${ep.closure!.id}`)
      return next
    })
  }

  const toggleZoneCollapsed = (patientKey: string, bilanType: BilanType) => {
    const key = `${patientKey}::${bilanType}`
    setCollapsedZones(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const isZoneCollapsed = (patientKey: string, bilanType: BilanType): boolean =>
    collapsedZones.has(`${patientKey}::${bilanType}`)

  /** Retourne les bilanTypes pour lesquels le patient a au moins un enregistrement. */
  const getPatientBilanTypes = (patientKey: string): BilanType[] => {
    const set = new Set<BilanType>()
    for (const b of getPatientBilans(patientKey)) set.add(b.bilanType ?? getBilanType(b.zone ?? ''))
    for (const i of getPatientIntermediaires(patientKey)) set.add(i.bilanType ?? getBilanType(i.zone ?? ''))
    for (const n of getPatientNotes(patientKey)) set.add(n.bilanType ?? getBilanType(n.zone ?? ''))
    return Array.from(set)
  }

  /** Construit un antécédent 1-ligne par PEC clôturée dans une AUTRE zone (contexte général pour une nouvelle analyse). */
  const getClosedAntecedents = (patientKey: string, currentBilanType: BilanType): string[] => {
    const types = getPatientBilanTypes(patientKey).filter(t => t !== currentBilanType && isTreatmentClosed(patientKey, t))
    return types.map(t => {
      const bilans = getPatientBilans(patientKey).filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === t)
      const notes = getPatientNotes(patientKey).filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === t)
      const inters = getPatientIntermediaires(patientKey).filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === t)
      const closure = getLastClosure(patientKey, t)
      const closedDate = closure ? new Date(closure.closedAt).toLocaleDateString('fr-FR') : ''
      return `PEC ${BILAN_ZONE_LABELS[t]} — terminée${closedDate ? ` le ${closedDate}` : ''} (${bilans.length} bilan(s), ${inters.length} interm., ${notes.length} séance(s))`
    })
  }

  const improvDelta = (prev: number, curr: number) => Math.round(((prev - curr) / prev) * 100)

  const isBirthday = (dateNaissance?: string): boolean => {
    if (!dateNaissance) return false
    const today = new Date()
    const d = today.getDate()
    const m = today.getMonth() + 1
    // Format JJ/MM/AAAA
    if (dateNaissance.includes('/')) {
      const parts = dateNaissance.split('/')
      return Number(parts[0]) === d && Number(parts[1]) === m
    }
    // Format AAAA-MM-JJ
    if (dateNaissance.includes('-')) {
      const parts = dateNaissance.split('-')
      return Number(parts[2]) === d && Number(parts[1]) === m
    }
    return false
  }

  /** Supprime le formatage Markdown pour un texte lisible brut */
  const stripMd = (s: string): string =>
    s.replace(/\*\*(.+?)\*\*/g, '$1')
     .replace(/\*(.+?)\*/g, '$1')
     .replace(/__(.+?)__/g, '$1')
     .replace(/_(.+?)_/g, '$1')
     .replace(/^#{1,6}\s+/gm, '')
     .replace(/^[\-\*]\s+/gm, '- ')
     .replace(/`(.+?)`/g, '$1')
     .replace(/\[(.+?)\]\(.+?\)/g, '$1')

  // Parse dd/mm/yyyy → Date (fallback: id-based ordering handled separately)
  const parseFrDate = (raw: string | undefined): number => {
    if (!raw) return 0
    const parts = raw.split('/')
    if (parts.length !== 3) return 0
    const [d, m, y] = parts.map(Number)
    const t = new Date(y, m - 1, d).getTime()
    return isNaN(t) ? 0 : t
  }

  const patientGeneralScore = (key: string): number | null => {
    // Collecte chronologique de TOUS les points EVN/EVA du patient
    const points: Array<{ time: number; id: number; evn: number }> = []

    // Bilans initiaux
    for (const b of getPatientBilans(key)) {
      if (b.evn != null) points.push({ time: parseFrDate(b.dateBilan), id: b.id, evn: b.evn })
    }
    // Bilans intermédiaires (EVN dans troncCommun.evn.pireActuel)
    for (const r of dbIntermediaires.filter(r => r.patientKey === key)) {
      const tc = (r.data as Record<string, Record<string, Record<string, unknown>>> | undefined)?.troncCommun
      const v = tc?.evn?.pireActuel
      const n = typeof v === 'number' ? v : typeof v === 'string' && v !== '' ? Number(v) : NaN
      if (!isNaN(n)) points.push({ time: parseFrDate(r.dateBilan), id: r.id, evn: n })
    }
    // Notes de séance (EVA)
    for (const n of dbNotes.filter(r => r.patientKey === key)) {
      const v = n.data?.eva
      const num = typeof v === 'string' && v !== '' ? Number(v) : typeof v === 'number' ? v : NaN
      if (!isNaN(num)) points.push({ time: parseFrDate(n.dateSeance), id: n.id, evn: num })
    }

    if (points.length < 2) return null
    // Tri chronologique (par date, puis id pour départager en cas d'égalité)
    points.sort((a, b) => a.time - b.time || a.id - b.id)
    const first = points[0].evn, last = points[points.length - 1].evn
    if (first === 0) return null // évite division par zéro
    return improvDelta(first, last)
  }

  const getBilanData = (): Record<string, unknown> | null => {
    const zone = selectedBodyZone ?? ''
    const t = getBilanType(zone)
    switch (t) {
      case 'epaule':   return bilanEpauleRef.current?.getData() ?? null
      case 'cheville': return bilanChevilleRef.current?.getData() ?? null
      case 'genou':    return bilanGenouRef.current?.getData() ?? null
      case 'hanche':   return bilanHancheRef.current?.getData() ?? null
      case 'cervical': return bilanCervicalRef.current?.getData() ?? null
      case 'lombaire': return bilanLombaireRef.current?.getData() ?? null
      case 'geriatrique': return bilanGeriatriqueRef.current?.getData() ?? null
      default:         return bilanGeneriqueRef.current?.getData() ?? null
    }
  }

  const saveBilan = (status: 'complet' | 'incomplet') => {
    const bilanData = getBilanData()
    const bilanType = getBilanType(selectedBodyZone ?? '')
    const douleur = bilanData?.douleur as Record<string, unknown> | undefined
    const evnValue = douleur?.evnPire ? Number(douleur.evnPire) : undefined

    const sexeValue = (formData.sexe === 'masculin' || formData.sexe === 'feminin') ? formData.sexe : undefined

    if (currentBilanId !== null) {
      setDb(prev => prev.map(r => r.id === currentBilanId
        ? { ...r, status, bilanData: bilanData ?? undefined, bilanType, evn: evnValue ?? r.evn, notes: bilanNotes || r.notes, silhouetteData: Object.keys(silhouetteData).length > 0 ? silhouetteData : r.silhouetteData, documents: bilanDocuments.length > 0 ? bilanDocuments : r.documents, sexe: sexeValue ?? r.sexe }
        : r))
      showToast(status === 'complet' ? 'Bilan complété' : 'Brouillon enregistré', 'success')
    } else {
      const newId = Math.max(0, ...db.map(r => r.id)) + 1
      const record: BilanRecord = {
        id: newId,
        nom: formData.nom || 'Anonyme',
        prenom: formData.prenom,
        dateBilan: new Date().toLocaleDateString('fr-FR'),
        dateNaissance: formData.dateNaissance,
        sexe: sexeValue,
        zoneCount: 1,
        zone: selectedBodyZone ?? undefined,
        pathologie: bilanData ? '' : undefined,
        avatarBg: 'var(--primary-light)',
        status,
        bilanType,
        bilanData: bilanData ?? undefined,
        evn: evnValue,
        notes: bilanNotes || undefined,
        silhouetteData: Object.keys(silhouetteData).length > 0 ? silhouetteData : undefined,
        documents: bilanDocuments.length > 0 ? bilanDocuments : undefined,
      }
      setDb(prev => [...prev, record])
      setCurrentBilanId(newId)
      showToast(status === 'complet' ? 'Bilan enregistré' : 'Brouillon sauvegardé', 'success')
      if (status === 'complet') return newId
    }

    // Auto-créer des objectifs SMART depuis le contrat kiné du bilan
    if (status === 'complet' && bilanData) {
      const contrat = (bilanData.contratKine ?? bilanData.contrat) as Record<string, unknown> | undefined
      const objText = String(contrat?.objectifsSMART ?? contrat?.objectifs ?? '').trim()
      if (objText) {
        const patKey = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
        const zoneName = selectedBodyZone ?? 'Général'
        // Séparer les objectifs par ligne ou point-virgule
        const lines = objText.split(/[\n;]+/).map(l => l.trim()).filter(l => l.length > 3)
        const newObjectifs: SmartObjectif[] = lines.map(line => ({
          id: Date.now() + Math.random() * 1000,
          patientKey: patKey,
          zone: zoneName,
          titre: line,
          cible: line,
          dateCible: '',
          status: 'en_cours' as const,
          createdAt: new Date().toLocaleDateString('fr-FR'),
        }))
        if (newObjectifs.length > 0) {
          setDbObjectifs(prev => {
            const existingTitres = new Set(prev.filter(o => o.patientKey === patKey && o.zone === zoneName).map(o => o.titre))
            const deduplicated = newObjectifs.filter(o => !existingTitres.has(o.titre))
            return deduplicated.length > 0 ? [...prev, ...deduplicated] : prev
          })
        }
      }
    }

    return currentBilanId
  }

  const handleSaveAndAnalyse = () => {
    saveBilan('complet')
    setCurrentBilanDataOverride(null)
    setStep('analyse_ia')
  }

  const [exportingPDF, setExportingPDF] = useState(false)
  const [exportingRecordId, setExportingRecordId] = useState<number | null>(null)

  // Passe formData à generatePDF en normalisant sexe (chaîne vide → undefined, comme attendu par PatientInfo).
  const formDataAsPatientInfo = (f: typeof formData) => ({
    ...f,
    sexe: (f.sexe === 'masculin' || f.sexe === 'feminin') ? f.sexe : undefined,
  })

  const handleExportPDF = async () => {
    const bilanData = getBilanData()
    setPdfPreviewZone(selectedBodyZone ?? '')
    setPdfPreviewTitle('BILAN EN PHYSIOTHÉRAPIE')

    if (apiKey && bilanData) {
      // Cache hit : même bilan + analyse + patient + sexe + documents → on resert le
      // markdown précédent sans appel IA. Invalidation automatique dès qu'un champ change.
      const cacheHash = hashInputs({
        flow: 'pdf_analyse',
        bilanId: currentBilanId,
        zone: selectedBodyZone ?? '',
        bilanType: getBilanType(selectedBodyZone ?? '') ?? '',
        bilanData,
        notesLibres: bilanNotes || '',
        analyseIA: currentAnalyseIA ?? null,
        patient: {
          nom: formData.nom,
          prenom: formData.prenom,
          dateNaissance: formData.dateNaissance,
          sexe: formData.sexe || null,
          profession: formData.profession || '',
          sport: formData.sport || '',
          famille: formData.famille || '',
          chirurgie: formData.chirurgie || '',
          notes: formData.notes || '',
        },
        documents: bilanDocuments.map(documentFingerprint),
      })
      const cached = getCachedAnalysePDF(cacheHash)
      if (cached) {
        setPdfPreviewMarkdown(cached)
        setPdfPreviewSource('analyse-ia')
        setPdfPreviewPatientKey(`${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim())
        setStep('pdf_preview')
        return
      }
      setExportingPDF(true)
      showToast('Génération du rapport en cours…', 'success')
      try {
        const userPrompt = buildPDFReportPrompt({
          patient: formData,
          zone: selectedBodyZone ?? '',
          bilanType: getBilanType(selectedBodyZone ?? '') ?? '',
          bilanData,
          notesLibres: bilanNotes || undefined,
          analyseIA: currentAnalyseIA ?? null,
        })
        const report = await callClaudeWithDocGuard({
          apiKey,
          systemPrompt: PDF_ANALYSE_SYSTEM_PROMPT,
          userPrompt,
          maxOutputTokens: 8192,
          jsonMode: false,
          documents: bilanDocuments.length > 0 ? bilanDocuments : undefined,
          patient: {
            nom: formData.nom,
            prenom: formData.prenom,
            patientKey: `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim(),
          },
          category: 'pdf_analyse',
          onAudit: recordAIAudit,
        })
        setCachedAnalysePDF(cacheHash, report)
        setPdfPreviewMarkdown(report)
        setPdfPreviewSource('analyse-ia')
        setPdfPreviewPatientKey(`${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim())
        setStep('pdf_preview')
      } catch (err) {
        // Annulation volontaire utilisateur (docs non masqués) → rien à faire
        if (err instanceof Error && err.message === 'UNMASKED_DOCS_CANCELLED') {
          showToast('Export annulé', 'info')
          setExportingPDF(false)
          return
        }
        showToast('Erreur analyse — export classique', 'error')
        const patKey = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
        const patBilans = getPatientBilans(patKey).filter(r => r.evn != null)
        const entries: ImprovementEntry[] = patBilans.map((r, i) => ({
          num: i + 1, date: r.dateBilan, evn: r.evn ?? null,
          delta: i === 0 ? null : improvDelta(patBilans[i - 1].evn!, r.evn!),
        }))
        const out = await generatePDF(formDataAsPatientInfo(formData), formDataAsPatientInfo(formData), silhouetteData,
          bilanData ? { sectionTitle: selectedBodyZone ?? '', data: bilanData } : null,
          entries.length > 0 ? { generalScore: patientGeneralScore(patKey), bilans: entries } : null,
          currentAnalyseIA ?? undefined, bilanNotes || undefined)
        attachPdfToPatient(out.blob, out.fileName, patKey, 'bilan')
      } finally {
        setExportingPDF(false)
      }
      return
    }

    // No API key — classic PDF direct
    const patKey = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
    const patBilans = getPatientBilans(patKey).filter(r => r.evn != null)
    const entries: ImprovementEntry[] = patBilans.map((r, i) => ({
      num: i + 1, date: r.dateBilan, evn: r.evn ?? null,
      delta: i === 0 ? null : improvDelta(patBilans[i - 1].evn!, r.evn!),
    }))
    const out = await generatePDF(formDataAsPatientInfo(formData), formDataAsPatientInfo(formData), silhouetteData,
      bilanData ? { sectionTitle: selectedBodyZone ?? '', data: bilanData } : null,
      entries.length > 0 ? { generalScore: patientGeneralScore(patKey), bilans: entries } : null,
      currentAnalyseIA ?? undefined, bilanNotes || undefined)
    attachPdfToPatient(out.blob, out.fileName, patKey, 'bilan')
  }

  // Prompt pour "Bilan PDF" — mise au propre rédigée, fidèle aux données, sans diagnostic ni ajout
  const PDF_BILAN_SYSTEM_PROMPT = `Tu es un kinésithérapeute expérimenté chargé de rédiger la mise au propre d'un bilan de kinésithérapie pour le dossier patient.

TON RÔLE : transformer des données brutes en un document fluide, professionnel et agréable à lire — comme un bilan que tu écrirais toi-même après ta séance. Tu peux reformuler, structurer des phrases, utiliser un vocabulaire clinique approprié pour rendre le document présentable à un médecin.

RÈGLES ABSOLUES :
- Tu n'AJOUTES aucune information qui n'est pas dans les données. Zéro invention, zéro supposition.
- Tu ne fais AUCUN diagnostic, AUCUNE hypothèse diagnostique, AUCUN plan de traitement, AUCUNE recommandation thérapeutique.
- Si une donnée est absente (champ vide, non fourni), tu ne la mentionnes PAS.
- IMPORTANT : un test "négatif" ou "non" N'EST PAS une donnée absente. C'est un résultat clinique qui DOIT figurer dans le rapport. Un Lachman négatif est une information aussi importante qu'un Lachman positif. Tu dois INCLURE tous les tests renseignés, qu'ils soient positifs OU négatifs.
- Tu peux reformuler les données pour les rendre plus fluides (ex: "EVN pire : 8" → "La douleur maximale est évaluée à 8/10 sur l'EVN", "lachman : non" → "Lachman : négatif"), mais le fond doit rester strictement identique.
- Tu ne mentionnes jamais que ce texte a été mis en forme par une IA.
- Tu n'utilises JAMAIS le nom ou prénom du patient. Tu le désignes par "le patient" ou "la patiente" selon la valeur SEXE_PATIENT fournie dans le prompt utilisateur (voir règle ACCORD GRAMMATICAL).
- PAS de section "Diagnostic", PAS de "Plan de traitement", PAS de "Conclusion" ou "Synthèse diagnostique".

ACCORD GRAMMATICAL SELON LE SEXE DU PATIENT (règle absolue) :
Le prompt utilisateur contient une ligne \`SEXE_PATIENT : masculin | feminin | inconnu\`. C'est la seule source de vérité pour tous les accords (nom, adjectifs, participes, pronoms). Tu n'infères JAMAIS le sexe depuis le prénom.
- Si feminin : « La patiente », « âgée », « née le », « Elle », accords au féminin.
- Si masculin : « Le patient », « âgé », « né le », « Il », accords au masculin.
- Si inconnu (repli uniquement) : masculin singulier par défaut.
INTERDICTIONS ABSOLUES : \`(e)\`, \`·e\`, \`·es\`, \`·ée\`, slashs inclusifs (\`Le/la\`, \`il/elle\`, \`né(e)\`), parenthèses d'ajout féminin, circonlocutions (\`cette personne\`, \`l'intéressé·e\`).

STYLE :
- Professionnel, concis, clinique
- Mélange de prose courte et de puces pour la lisibilité
- Les données objectives (EVN, scores, tests) restent en puces "- **Label :** valeur"
- Les éléments narratifs (anamnèse, profil, drapeaux) peuvent être rédigés en phrases fluides
- Aère bien le document

MISE EN PAGE MARKDOWN :
- Titres de section : ### (ex: ### 2. Bilan algique)
- Sous-titres : **Titre**
- Données : puces "- **Label :** valeur"

STRUCTURE (n'inclure une section QUE si elle a des données) :
### 1. Profil du Patient
### 2. Bilan Algique
### 3. Drapeaux Cliniques
### 4. Examen Clinique
### 5. Tests Spécifiques
### 6. Scores Fonctionnels
### 7. Projet Thérapeutique du Patient
### 8. Notes Complémentaires`

  // Prompt pour export depuis la page Analyse IA — bilan diagnostic physiothérapique rédigé pour un médecin prescripteur
  const PDF_ANALYSE_SYSTEM_PROMPT = `Tu es un physiothérapeute / kinésithérapeute expérimenté chargé de rédiger un **Bilan de Physiothérapie** destiné au médecin prescripteur.

Le document se lit comme un **courrier médical dense, rédigé en prose clinique**, équivalent à ce qu'un confrère expérimenté remettrait à son correspondant. Objectif : le prescripteur saisit le tableau clinique, les éléments saillants (positifs ET écartements rassurants) et la démarche thérapeutique proposée. Ce n'est **pas** un rapport à visée assurantielle : pas de projections chiffrées à court/moyen/long terme, pas de justification de poursuite des soins, pas d'objectifs aux échéances multiples, pas de conséquences d'une interruption.

══════════════════════════════════════════
RÈGLE DE SÉCURITÉ CLINIQUE ABSOLUE — INTERPRÉTATION DES RÉFLEXES OSTÉOTENDINEUX
══════════════════════════════════════════
CECI EST LA RÈGLE LA PLUS IMPORTANTE DU PROMPT. UNE ERREUR DE TRANSCRIPTION SUR LES RÉFLEXES EXPOSE À UN RISQUE DIAGNOSTIQUE MAJEUR POUR LE PATIENT.

Dans les données d'entrée, un réflexe ostéotendineux (achilléen, rotulien, quadricipital, bicipital, tricipital, stylo-radial, cutané plantaire, etc.) renseigné avec la valeur « négatif », « non », « n », « normal », « RAS », « 0 », « sp » ou toute formulation équivalente signifie UN RÉFLEXE NORMAL ET SYMÉTRIQUE.

Tu DOIS OBLIGATOIREMENT le rendre avec un vocabulaire de normalité :
- « Les réflexes achilléens sont normaux et symétriques »
- « Le réflexe rotulien est vif et symétrique »
- « L'examen des réflexes ostéotendineux est normal et symétrique »

Cas particulier du signe de Babinski (réflexe cutané plantaire) : « Babinski négatif » signifie pied en flexion plantaire — c'est le résultat NORMAL. Tu le rends donc en prose comme « signe de Babinski négatif » (formulation standard équivalente à « cutané plantaire en flexion »).

INTERDICTION ABSOLUE d'utiliser les termes « aboli », « abolis », « aréflexie », « aréflexique », « hyporéflexie », « absent », « abolition » lorsque la donnée d'entrée porte « négatif », « non », « normal » ou équivalent. Ces termes décrivent une pathologie neurologique grave (atteinte radiculaire, neuropathie périphérique) — les employer à tort expose le patient à des investigations injustifiées et à une anxiété iatrogène. Tu n'emploies ces termes QUE si la donnée d'entrée le dit EXPLICITEMENT en toutes lettres (« aboli », « aréflexie », « 0+ », « absent »).

══════════════════════════════════════════
RÈGLE SÉMANTIQUE GLOBALE — « NÉGATIF » = RASSURANT POUR TOUS LES ITEMS CLINIQUES
══════════════════════════════════════════
Dans les données Knode, la valeur « négatif » (ou « non », « n », « normal », « RAS », « 0 », « sp ») signifie UNIFORMÉMENT **« aucune anomalie détectée / rassurant / absent / normal »**, pour **tous les items cliniques sans exception** :
- Drapeaux rouges, jaunes, bleus et noirs
- Réflexes ostéotendineux (voir règle dédiée ci-dessus)
- Tests neurodynamiques / mécanosensibilité
- Tests de provocation et tests orthopédiques
- Tests spécifiques

Formulations AUTORISÉES à la rédaction (choisir selon le contexte syntaxique) : *« négatif »*, *« absent »*, *« normal »*, *« rassurant »*, *« non retrouvé »*, *« sans particularité »*, *« non évocateur »*.

Formulations INTERDITES pour rendre une donnée « négatif » :
- *« non renseigné »*, *« non renseigné comme préoccupant »*, *« non documenté »* → ces termes désignent une **absence de données**, pas un résultat rassurant. Or un « négatif » Knode est bien un résultat clinique consigné.
- *« aboli »*, *« disparu »* → désignent un **état pathologique**, pas un résultat rassurant.

Exemple correct pour les drapeaux jaunes : *« Les drapeaux jaunes sont rassurants : le HAD, les stratégies de coping, les croyances, l'évitement par la peur et le catastrophisme ne mettent pas en évidence de facteur de chronicisation psychosociale. »* — pas *« ne sont pas renseignés comme préoccupants »*.

══════════════════════════════════════════
RÈGLES DE FIDÉLITÉ (non négociables)
══════════════════════════════════════════
- Tu n'utilises QUE les informations du message utilisateur. Zéro invention, zéro extrapolation, zéro supposition.
- Un test « négatif » / « non » / « n » N'EST PAS une donnée absente — c'est un résultat clinique qui DOIT figurer, formulé selon les règles de filtrage ci-dessous (et, pour les réflexes, selon la règle de sécurité ci-dessus).
- Tu n'utilises JAMAIS le nom ou prénom du patient. Tu désignes le sujet par « le patient » / « la patiente » selon la valeur SEXE_PATIENT fournie dans le prompt utilisateur (voir règle dédiée « ACCORD GRAMMATICAL » ci-dessous), ou tu omets le sujet. L'en-tête du PDF (identité patient + coordonnées thérapeute) et la **section 10 Signature** sont rendus par le template — ne les reproduis pas dans le markdown.
- Tu ne mentionnes jamais qu'un outil d'IA a participé à la rédaction.

══════════════════════════════════════════
RÈGLE ABSOLUE — ACCORD GRAMMATICAL SELON LE SEXE DU PATIENT
══════════════════════════════════════════
Le prompt utilisateur contient une ligne \`SEXE_PATIENT : masculin | feminin | inconnu\`. **C'est la seule source de vérité** pour tous les accords — nom, adjectifs, participes, pronoms. Tu n'infères JAMAIS le sexe depuis le prénom, le contexte ou la pathologie.

- Si \`SEXE_PATIENT : feminin\` — emploi systématique de : « La patiente », « âgée », « née le », « Elle rapporte », « active », « sportive », « opérée », « kinésithérapeute traitante ». Tous les adjectifs et participes s'accordent au féminin singulier.
- Si \`SEXE_PATIENT : masculin\` — emploi systématique de : « Le patient », « âgé », « né le », « Il rapporte », « actif », « sportif », « opéré », « kinésithérapeute traitant ». Tous les adjectifs et participes s'accordent au masculin singulier.
- Si \`SEXE_PATIENT : inconnu\` (cas de repli uniquement) — rédaction au **masculin singulier par défaut**, toujours sans formulation inclusive.

**FORMULATIONS STRICTEMENT INTERDITES** (toutes) :
- Graphies inclusives : \`(e)\`, \`·e\`, \`·es\`, \`·ée\`, point médian, parenthèse d'ajout féminin.
- Slashs inclusifs : \`Le/la\`, \`il/elle\`, \`né/née\`, \`patient/patiente\`, \`né(e)\`.
- Circonlocutions pour contourner l'accord : « cette personne », « l'intéressé·e », « le/la patient·e », « l'individu ».
- Exemples à proscrire absolument :
  - « Le/la patient·e est âgé(e) de 32 ans. Né·e le 24/11/1993. Il/elle rapporte… » → INTERDIT
  - « Cette personne âgée de 32 ans rapporte… » → INTERDIT (circonlocution)
- Exemples corrects :
  - Féminin : « La patiente est âgée de 32 ans. Née le 24/11/1993. Elle rapporte une douleur… »
  - Masculin : « Le patient est âgé de 32 ans. Né le 24/11/1993. Il rapporte une douleur… »

L'accord doit être **cohérent sur tout le document** — il est inacceptable qu'une même rédaction mélange masculin et féminin ou alterne entre formes accordées et formes inclusives.

══════════════════════════════════════════
RÈGLE ABSOLUE — PAS DE POURCENTAGES DANS LA SYNTHÈSE DIAGNOSTIQUE
══════════════════════════════════════════
La section 7 (Synthèse diagnostique) et l'ensemble du rendu sont rédigés en **langage médical argumenté**, JAMAIS en statistiques chiffrées. Une hypothèse diagnostique se défend par la présence / absence de signes cliniques, la cohérence du tableau, la négativité des diagnostics différentiels — pas par une probabilité numérique.

INTERDIT ABSOLU — n'utilise JAMAIS, dans aucune section du rendu :
- *« retenu à 60 % »*, *« hypothèse principale à 60% »*, *« probabilité de 25% »*, *« (15 %) »*, *« likelihood 70 % »*
- Toute formulation de type \`X%\`, \`X pour cent\`, \`probabilité de X\`, \`p = X\` accolée à une hypothèse diagnostique
- Toute reprise de la valeur \`probabilite\` qui pourrait apparaître dans les données d'analyse IA fournies en input

Même si les données d'input contiennent des pourcentages d'hypothèses (legacy), tu les CONVERTIS en langage qualitatif lors de la rédaction. Un rang 1 devient « hypothèse principale », un rang 2 devient « hypothèse de second plan / différentiel à évoquer », etc.

Formulations AUTORISÉES et attendues :
- *« L'hypothèse principale retenue est celle d'une [diagnostic], étayée par [arguments cliniques]. »*
- *« Les différentiels évoqués — [hypothèse B], [hypothèse C] — sont moins probables au regard de [argument clinique d'écartement]. »*
- *« Le tableau clinique est évocateur d'une [diagnostic], sans argument pour retenir [différentiel écarté]. »*

══════════════════════════════════════════
RÈGLE — INTERDICTION D'EXPANSION D'ACRONYMES INCONNUS (référentiel Knode)
══════════════════════════════════════════
Un acronyme présent dans les données d'entrée ne doit JAMAIS être « développé » par invention d'une signification plausible. Tu conserves l'acronyme verbatim, sans expansion, sauf s'il figure dans le référentiel Knode ci-dessous.

**Référentiel Knode des acronymes autorisés à l'expansion** (forme « ACRONYME (expansion) » à la première occurrence, puis acronyme seul) :

| Acronyme | Expansion autorisée                               |
|----------|---------------------------------------------------|
| Test TA  | Test d'Adam (dépistage scoliose)                  |
| SLR      | Straight Leg Raise (Lasègue)                      |
| PKB      | Prone Knee Bend (test de Léri)                    |
| HAD      | Hospital Anxiety and Depression scale             |
| EVN      | Échelle Visuelle Numérique                        |
| EVA      | Échelle Visuelle Analogique                       |
| RAS      | Rien À Signaler                                   |

INTERDIT — exemples d'expansions fausses observées :
- *« Test TA »* développé en *« articulation temporo-auriculaire »* → erreur grave : TA désigne ici le **Test d'Adam** (dépistage de scoliose).
- *« PKB »* développé en *« Posterior Knee Bend »* → inventé ; l'entrée voulait dire **Prone Knee Bend**.
- *« HAD »* développé en *« Handicap Activity Disability »* → inventé ; **Hospital Anxiety and Depression scale**.

Si un acronyme de l'entrée n'est PAS dans le référentiel ci-dessus, tu le reproduis **verbatim sans expansion**. Il vaut mieux un acronyme non explicité qu'une expansion fausse.

══════════════════════════════════════════
RÈGLE ABSOLUE — ANCRAGE FACTUEL STRICT (anti-hallucination renforcée)
══════════════════════════════════════════
Tu n'inventes JAMAIS d'élément clinique, contextuel ou anatomique qui ne figure pas explicitement dans les données d'entrée. Trois pièges récurrents à éviter :

1. **Contexte socio-professionnel inventé** — Tu n'attribues pas au patient un métier, un sport, une situation familiale, un niveau d'activité, un mode de vie si ces éléments ne sont pas présents dans les données. Pas de *« patient sédentaire »*, *« actif »*, *« travailleur manuel »*, *« sportif de loisir »* sans source explicite.

2. **Segments vertébraux chiffrés inventés** — Tu n'écris JAMAIS *« T12-L2 »*, *« L4-S1 »*, *« C5-C6 »*, *« L5-S1 »* si le niveau vertébral n'est pas **explicitement** nommé dans les données d'entrée. Une douleur lombaire sans précision de niveau reste une *« douleur lombaire »* ou *« douleur du rachis lombaire »* — pas *« lombalgie L4-L5 »*.

3. **Facteurs contributifs inventés** — Pas de *« suite à un effort en flexion »*, *« dans un contexte de stress »*, *« après port de charges »* si cela ne figure pas dans l'anamnèse fournie.

En cas de doute ou de donnée partielle, tu utilises des formulations prudentes et non engageantes : *« évocateur d'un pattern de référence du rachis lombaire »*, *« compatible avec une atteinte de la région [anatomique générique] »*, *« à préciser au terme de l'évaluation initiale complète »*.

══════════════════════════════════════════
RÈGLE ARCHITECTURALE — SÉPARATION STRICTE STRUCTURE D'ENTRÉE / STRUCTURE DE SORTIE
══════════════════════════════════════════
Le message utilisateur arrive structuré selon les rubriques du formulaire de saisie Knode (« Scores Fonctionnels », « Notes Complémentaires », « Mécanosensibilité », « Drapeaux », etc.). **Cette structure d'entrée est un simple véhicule de données — elle N'EST PAS la structure du document final.**

Tu IGNORES systématiquement les intitulés de rubriques de l'entrée et tu REDISTRIBUES chaque donnée dans la section de sortie appropriée selon son contenu clinique, conformément à la table 1→9 imposée ci-dessous.

Règles de redistribution à appliquer systématiquement :
- **« Scores Fonctionnels »** (Oswestry, QuickDASH, ODI, NDI, LEFS, WOMAC, FABQ, Tampa, HAD, EIFEL, PSFS…) → intégrés dans l'Anamnèse (section 2) OU dans la Symptomatologie (section 3) selon pertinence, en prose.
- **« Notes Complémentaires »** saisies par le thérapeute → DISSÉQUÉES par contenu clinique : palpation / provocation → section 5 ; localisation / irradiation / facteur positionnel → section 3 ; contexte de vie / ATCD / mode de survenue → section 2 ; éléments de raisonnement → section 7.
- **« Mécanosensibilité »** / **« Examen neurologique »** / **« Testing musculaire »** / **« Mobilité »** → section 5, en sous-blocs rédigés.
- **« Tests spécifiques »** → section 6.
- **« Drapeaux »** (rouges, jaunes, bleus, noirs) → section 4.
- **« Anamnèse »** / données contextuelles → section 2.
- **« Douleur »** / **« EVN »** / **« Topographie »** → section 3.

Aucune section intitulée « Scores Fonctionnels », « Notes Complémentaires » ou reprenant un libellé quelconque du formulaire d'entrée ne doit apparaître dans le rendu final. Les seuls titres autorisés sont ceux de la table figée ci-dessous.

══════════════════════════════════════════
STRUCTURE OBLIGATOIRE — 9 SECTIONS NUMÉROTÉES EN CONTINU
══════════════════════════════════════════

**Le bilan contient OBLIGATOIREMENT les 9 sections suivantes dans cet ordre exact, numérotées de 1 à 9, sans saut. La section 10 (« 10. Signature ») est une section numérotée à part entière, mais son titre ET son contenu (date, nom, titre, cabinet, téléphone) sont rendus par le template PDF — tu n'écris ABSOLUMENT RIEN pour la section 10 dans ton markdown.**

**Pour les sections 1 à 6 (sections factuelles) :** si une section n'a réellement aucune donnée source, tu écris le titre puis la phrase *« Non renseigné lors de ce bilan. »* — mais tu vérifies d'abord que des données ne sont pas présentes sous un autre libellé d'entrée (voir règle architecturale ci-dessus).

**Pour les sections 7, 8 et 9 (sections de raisonnement clinique) :** elles ne sont JAMAIS rendues avec « Non renseigné ». Elles sont GÉNÉRÉES par ton raisonnement clinique à partir des éléments exposés dans les sections 1 à 6, même si ces éléments sont partiels. Si les données sont franchement insuffisantes pour conclure, tu formules une hypothèse prudente et/ou tu écris « à préciser au terme de l'évaluation initiale complète » — mais tu PRODUIS toujours du texte clinique dans ces trois sections.

**Tu ne casses JAMAIS la numérotation. Tu n'omets JAMAIS une section.**

**RÈGLE VERBATIM — Les 9 titres de sections ci-dessous sont imposés MOT POUR MOT, casse comprise, ponctuation comprise.** Aucune variation, aucun ajout, aucun retrait, aucune reformulation n'est autorisée. L'IA ne doit JAMAIS enrichir un titre (« Anamnèse » ≠ « Anamnèse et Motif de Consultation »), JAMAIS le renommer (« Synthèse diagnostique » ≠ « Profil de la Présentation Clinique » ; « Conclusion » ≠ « Éléments de Vigilance et de Suivi »), JAMAIS le reformuler selon sa propre logique. La seule forme autorisée est la forme exacte de la table ci-dessous.

Table de nommage strictement figée (aucune variation autorisée) :

| N° | Titre exact à utiliser dans le markdown          |
|----|--------------------------------------------------|
| 1  | ### 1. Profil du patient et contexte             |
| 2  | ### 2. Anamnèse                                  |
| 3  | ### 3. Symptomatologie douloureuse               |
| 4  | ### 4. Drapeaux cliniques                        |
| 5  | ### 5. Examen clinique                           |
| 6  | ### 6. Tests spécifiques                         |
| 7  | ### 7. Synthèse diagnostique                     |
| 8  | ### 8. Projet thérapeutique                      |
| 9  | ### 9. Conclusion                                |
| 10 | (Signature — rendue par le template PDF sous le titre « 10. Signature »)  |

**Contenu attendu de chaque section :**

**1. Profil du patient et contexte** — Une à deux lignes de prose dense strictement limitées au cadrage : âge, sexe ou profession si cliniquement utile, zone anatomique concernée, motif de consultation / prescription médicale, phrase synthétique posant le tableau. **N'apparaissent JAMAIS ici** : ATCD médico-chirurgicaux, traitements en cours, mode de survenue, facteurs psychosociaux, détails de l'histoire de la plainte — ces éléments sont du ressort EXCLUSIF de la section 2 (Anamnèse). Pas de puces.

**2. Anamnèse** — Un à deux paragraphes rédigés retraçant le mode de survenue, les circonstances d'apparition, l'évolution, les antécédents médico-chirurgicaux pertinents, les traitements en cours et le contexte de vie. Prose uniquement — pas de liste d'ATCD en puces.

**3. Symptomatologie douloureuse** — Paragraphe RÉDIGÉ EN PROSE, sans aucune puce (cf. règle absolue ci-dessous), intégrant dans le fil du texte l'EVN (moyenne / pire / meilleure), la **topographie**, l'irradiation éventuelle, le caractère de la douleur, les facteurs aggravants et soulageants, le rythme (nocturne, dérouillage matinal). Les valeurs EVN s'écrivent dans la phrase (« une douleur cotée en moyenne à 5/10 sur l'EVN, pouvant atteindre 8/10 »), JAMAIS en puces ni en listes clé/valeur. Toute description de localisation, d'irradiation ou de facteur positionnel (ex : « douleur inguinale aux positions assises prolongées ») appartient à cette section.

**4. Drapeaux cliniques** — Voir règle A ci-dessous. Prose regroupée par système, jamais de liste verticale.

**5. Examen clinique** — Voir règle C ci-dessous. Prose exclusive, pas une seule puce, quel que soit le nombre de domaines testés. Toute donnée de **palpation, provocation douloureuse** ou manœuvre physique (reproduction, test de longueur musculaire, appui segmentaire) appartient à cette section. Organisation possible en sous-blocs \`**Inspection**\` / \`**Palpation**\` / \`**Mobilité articulaire**\` / \`**Testing musculaire**\` / \`**Examen neurologique**\` / \`**Mécanosensibilité**\` / \`**Examen fonctionnel**\` — chaque sous-bloc en **paragraphe court rédigé**.

**6. Tests spécifiques** — Voir règle B ci-dessous. Prose exclusive, pas une seule puce, même pour des tests positifs.

**7. Synthèse diagnostique** — Paragraphe rédigé structuré : hypothèse physiothérapique principale en tête, raisonnement appuyé sur les éléments anamnestiques et cliniques qui la soutiennent, puis éventuels diagnostics différentiels évoqués et écartés avec leur argument principal. **C'est un raisonnement clinique, qui assemble les éléments** déjà exposés dans les sections 2–6 — cette section ne doit pas introduire pour la première fois une donnée clinique ; elle l'interprète.

**8. Projet thérapeutique** — Paragraphe rédigé structuré par **axes thérapeutiques** (3 à 5 axes pertinents au tableau clinique, choisis parmi : contrôle antalgique, récupération de la mobilité articulaire, renforcement / travail neuromusculaire, éducation thérapeutique et auto-gestion, reprise progressive des activités / retour fonctionnel). Pour chaque axe retenu, tu cites en prose les techniques **potentiellement** mobilisables (thérapie manuelle, exercices actifs, travail neurodynamique, travail proprioceptif, rééducation fonctionnelle, conseils posturaux…) en introduisant les techniques par des **formulations conditionnelles** : *« pourront être mobilisés selon l'évolution »*, *« en fonction de la réponse clinique »*, *« selon la tolérance »*, *« le cas échéant »*. Tu mentionnes si utile une fréquence indicative générale (sans jalon daté) et les objectifs fonctionnels attendus. **INTERDIT** : projections chiffrées à 4 / 8 / 12 semaines ou à 6 / 12 mois, jalons datés, critères de sortie quantifiés, justification de la nécessité médicale des séances. Les éventuels signes devant motiver une réévaluation médicale peuvent être mentionnés en fin de section, en une phrase. On reste sur un cadrage clinique raisonné du bilan initial.

**9. Conclusion** — **Conclusion courte adressée au médecin prescripteur, 2 à 3 phrases maximum**. Elle synthétise le tableau clinique (diagnostic de travail + éléments saillants) et mentionne l'orientation thérapeutique engagée, ainsi qu'une éventuelle demande ponctuelle (imagerie complémentaire, avis spécialisé, renouvellement d'ordonnance). Phrases directes, pas de formule d'appel. **INTERDIT** : liste d'éléments de vigilance, liste de red flags à surveiller, rappel détaillé des drapeaux cliniques, section de pronostic ou de suivi détaillé, titre reformulé (« Éléments de Vigilance », « Suivi », « Pronostic »…). Les éventuels signes devant motiver une réévaluation médicale sont à intégrer en fin de **section 8 (Projet thérapeutique)**, pas ici.

══════════════════════════════════════════
RÈGLE ABSOLUE — AUCUNE PUCE DANS LES SECTIONS 3, 5 ET 6
══════════════════════════════════════════
**Quelle que soit la forme des données d'entrée (JSON, clé/valeur, tableau, liste), la restitution dans les sections 3 (Symptomatologie douloureuse), 5 (Examen clinique) et 6 (Tests spécifiques) se fait EXCLUSIVEMENT en phrases rédigées.**

- Les valeurs d'EVN (moyen / pire / meilleur), la topographie et les facteurs positionnels s'intègrent dans une phrase, JAMAIS en puces « - EVN pire : 8 ».
- Une mobilité articulaire complète dans toutes les directions se résume en **UNE SEULE phrase** énumérant les amplitudes dans la phrase.
- Une série de tests tous négatifs se résume en **UNE SEULE phrase** listant les tests et leur signification clinique collective.
- Un test positif se rédige en **une phrase** : nom du test, résultat, interprétation clinique.
- L'utilisation de la moindre puce (\`- \` ou \`• \`) dans les sections 3, 5 et 6 est une erreur à corriger systématiquement.

Cette règle s'applique même quand les données arrivent sous forme tabulaire. **La transformation tableau → prose est attendue et obligatoire.**

══════════════════════════════════════════
RÈGLE DE DÉDUPLICATION SÉMANTIQUE — PRE-PASS OBLIGATOIRE AVANT RÉDACTION
══════════════════════════════════════════
**Avant d'écrire la moindre phrase**, tu exécutes mentalement une **passe de fusion** sur toutes les données d'entrée : repère les paires de libellés qui désignent la même entité clinique et **choisis un libellé unique** pour chacune. Cette passe est faite **une seule fois, en amont**, pour l'ensemble du document — pas séparément par section.

Résultat attendu de la pre-pass : un même mouvement articulaire, un même test, une même amplitude n'apparaît **qu'une seule fois** dans tout le rendu, sous un seul nom. Il est INTERDIT qu'une phrase de mobilité énumère *« flexion, extension, rotations, inclinaisons latérales, ainsi que les latéralisations »* (latéroflexion = inclinaison latérale = latéralisation).

Synonymes fréquents à fusionner :
- **Latéroflexion = inclinaison latérale = flexion latérale = latéralisation** (rachis) → UN SEUL terme (préférer « inclinaisons latérales droite et gauche »)
- **Flexion antérieure = flexion** → un seul terme
- **Extension postérieure = extension** → un seul terme
- **Rotation axiale = rotation** → un seul terme
- **SLR = Lasègue** → un seul terme avec la précision entre parenthèses si utile
- **PKB = Prone Knee Bend = test de Léri** → un seul terme

Libellés préférés pour la phrase de mobilité rachis : *flexion, extension, rotations droite et gauche, inclinaisons latérales droite et gauche*. Un même mouvement articulaire ne doit JAMAIS apparaître deux fois dans la même phrase sous deux noms différents.

══════════════════════════════════════════
RÈGLE DE PRÉSERVATION TERMINOLOGIQUE STRICTE
══════════════════════════════════════════
Les noms de tests, d'articulations, de structures anatomiques, d'échelles, de scores et d'acronymes cliniques présents dans les données d'entrée doivent être REPRODUITS VERBATIM. Tu n'inventes JAMAIS une variation, tu ne « corriges » JAMAIS ce que tu pourrais croire être une coquille, tu ne remplaces JAMAIS un terme par un synonyme approximatif.

Exemples d'erreurs à ne JAMAIS commettre (terminologie inventée) :
- « articulation temporo-auriculaire » transformée en « articulation temporo-acromiale » (pathologies et localisations différentes)
- « Cluster de Laslett » transformé en « Cluster de Lasègue » (tests radicalement différents)
- « ASLR » traduit en « test d'élévation jambe tendue » (si l'entrée dit « ASLR », tu écris « ASLR », éventuellement avec le développé entre parenthèses la première fois)
- « Oswestry » devenu « Owestry » ou « Oswestri »
- « Jobe » devenu « Job »

Si un terme paraît inhabituel, méconnu ou atypique, il DOIT être conservé tel quel. La fidélité terminologique prime sur l'élégance stylistique. En cas de doute, tu reproduis exactement ce qui figure dans les données d'entrée.

══════════════════════════════════════════
RÈGLE A — DRAPEAUX CLINIQUES (rouges, jaunes, bleus, noirs)
══════════════════════════════════════════
**Tous négatifs** → UN paragraphe rédigé, regroupement par thème (général / neurologique / viscéral / psychosocial / professionnel). Pas de liste, pas de puces.

**Au moins un positif** → détailler cliniquement les positifs d'abord en prose (avec leur implication), puis une phrase synthétique pour les autres drapeaux recherchés et explicitement écartés, regroupés par système.

**INTERDIT** : liste à puces verticale de drapeaux (« - Pas de fièvre », « - Pas de cancer »…), énumération plate non regroupée.

══════════════════════════════════════════
RÈGLE B — TESTS SPÉCIFIQUES (section 6)
══════════════════════════════════════════
**Tous négatifs** → UNE phrase rédigée intégrant les tests réalisés ET leur signification clinique collective.
Ex : *« Les tests de Léri, Lasègue (SLR), Laslett, thigh thrust et Gaenslen sont négatifs, écartant une composante radiculaire et une implication sacro-iliaque significative. »*

**Positifs + négatifs mélangés** → phrase(s) détaillant chaque test positif (nom, résultat, signification clinique) suivie(s) d'une phrase synthétique pour les négatifs.
Ex : *« Le test ASLR est positif, avec un soulagement net de la symptomatologie à la compression iliaque, orientant vers une insuffisance de transfert de charge au niveau de la ceinture pelvienne. Les tests de Léri, Lasègue, Laslett et thigh thrust sont en revanche négatifs, écartant une composante radiculaire et une implication sacro-iliaque directe. »*

**INTERDIT ABSOLU** : puce par test avec « négatif » ou « positif » à côté (\`- Jobe — négatif\`, \`- Yocum — négatif\`, \`- Neer — positif\`…). AUCUNE puce dans cette section, sans exception.

══════════════════════════════════════════
RÈGLE C — EXAMEN CLINIQUE (section 5)
══════════════════════════════════════════
Prose condensée, pas de puces ligne par ligne. **Aucune puce autorisée dans la section 5, quelle que soit la forme des données d'entrée.**

**Mobilité complète / testing normal** → UNE phrase synthétique listant les amplitudes testées dans la phrase.
Ex : *« La mobilité lombaire est complète, symétrique et indolore dans l'ensemble des amplitudes testées (flexion, extension, rotations et inclinaisons latérales droite et gauche). »*

**Limitation ou reproduction douloureuse** → prose détaillée : amplitude limitée, plan concerné, reproduction de la symptomatologie, comparaison côté sain, valeurs objectives intégrées dans la phrase.
Ex : *« La flexion de hanche droite est limitée à 110° (contre 130° à gauche) et reproduit la douleur habituelle cotée à 7/10 en fin d'amplitude. La force des moyens fessiers droits est cotée à 4/5 (MRC). »*

**INTERDIT ABSOLU** : liste verticale \`- Flexion : complète / - Extension : complète / - Rotation droite : complète…\`. Même pour 2 items, on écrit une phrase.

══════════════════════════════════════════
RÈGLE D — PLACEMENT DES INFORMATIONS CLINIQUES
══════════════════════════════════════════
Avant de rédiger, **classe chaque donnée d'entrée dans sa section de destination** selon cette logique :

- **Palpation, provocation douloureuse, test physique segmentaire** (ex : « douleur palpatoire bilatérale du moyen fessier 8/10 ») → **section 5 (Examen clinique)**, sous-bloc Palpation.
- **Localisation de la douleur, irradiation, facteur aggravant / soulageant positionnel** (ex : « douleur inguinale gauche en position assise prolongée ») → **section 3 (Symptomatologie douloureuse)**.
- **Raisonnement diagnostique, interprétation croisée** → **section 7 (Synthèse diagnostique)**.

La section 7 **ne doit pas être le dépotoir des informations mal placées**. Si une donnée de palpation ou de localisation atterrit en section 7 ou dans une section "Notes complémentaires", c'est une erreur de classement à corriger.

══════════════════════════════════════════
RÈGLE E — PRINCIPE GÉNÉRAL DE RÉDACTION
══════════════════════════════════════════
Toutes les informations cliniquement pertinentes apparaissent, y compris les éléments négatifs rassurants, mais formulées en **prose rédigée et regroupée intelligemment**. L'objectif est un courrier médical dense et lisible — pas une checklist, pas un formulaire d'audit. Un bilan court tient sur 1 page, un bilan riche sur 2 pages maximum. Pas de pages à moitié vides.

**Proscrits** — formules mécaniques passe-partout en tête de paragraphe : « En effet », « En conclusion », « Par ailleurs », « De plus », « Il convient de noter que », « Il est à noter que ». Attaquer directement sur le contenu clinique.

**Terminologie** — rigoureuse, professionnelle, sans vulgarisation. Abréviations standard conservées (EVN, ROM, MRC, Borg, SpO₂, ASLR, SLR, …). Hypothèses **physiothérapiques**, pas de diagnostic médical.

══════════════════════════════════════════
RÈGLE — TITRE UNIQUE DU DOCUMENT
══════════════════════════════════════════
Le bilan contient **un seul titre principal**, inscrit dans l'en-tête du PDF (« BILAN EN PHYSIOTHÉRAPIE » en majuscules centrées) — rendu par le template, pas par toi. Tu N'AJOUTES JAMAIS un second titre, un sous-titre, un surtitre ou une mention du type « Bilan de Physiothérapie — Zone Lombaire » en tête de markdown. Tu n'utilises JAMAIS la syntaxe markdown \`#\` ou \`##\` dans ta sortie, qu'elle soit remplie ou vide. Ta sortie commence directement par \`### 1. Profil du patient et contexte\`. Si tu souhaites indiquer la zone concernée, tu le fais dans le corps de la section 1, en prose.

══════════════════════════════════════════
RÈGLE — UNE INFORMATION = UNE PLACE DÉTAILLÉE
══════════════════════════════════════════
Chaque élément clinique (douleur localisée, facteur aggravant, test positif, drapeau notable, ATCD pertinent) est **décrit en détail UNE SEULE FOIS**, dans sa section de rattachement principale (selon les règles de placement). La **section 7 (Synthèse diagnostique)** peut reprendre l'élément, mais de manière **synthétique et articulée au raisonnement clinique**, sans redétailler.

INTERDIT : répéter la même information de manière aussi détaillée dans deux sections différentes.

Exemple :
- Section 3 (détaillée) : *« Une douleur inguinale gauche apparaît lors des positions assises prolongées. »*
- Section 7 (reprise synthétique) : *« …la douleur inguinale gauche positionnelle évoquant une participation de la hanche… »*

══════════════════════════════════════════
RÈGLE — MAPPING DE RATTACHEMENT DES INFORMATIONS (section principale unique)
══════════════════════════════════════════
Avant de rédiger, tu **classes chaque donnée d'entrée dans sa section de rattachement principale et UNIQUE**, selon la table ci-dessous. Une information n'apparaît en détail QUE dans sa section principale ; les autres sections peuvent s'y référer brièvement (sans redétailler).

| Type d'information                                                             | Section principale de rattachement |
|--------------------------------------------------------------------------------|------------------------------------|
| Âge / sexe / motif de consultation / zone anatomique concernée                 | §1 Profil et contexte              |
| ATCD médico-chirurgicaux / traitements en cours                                | §2 Anamnèse                        |
| Imagerie récente disponible                                                    | §2 Anamnèse                        |
| Mode de survenue / circonstances d'apparition / évolution / contexte de vie    | §2 Anamnèse                        |
| EVN (moyen / pire / meilleur) / rythme nocturne / dérouillage matinal          | §3 Symptomatologie douloureuse     |
| Topographie / irradiation / facteurs aggravants et soulageants positionnels   | §3 Symptomatologie douloureuse     |
| Drapeaux rouges / jaunes / bleus / noirs                                       | §4 Drapeaux cliniques              |
| Inspection / palpation / provocation / mobilité / testing / neuro / mécanosens.| §5 Examen clinique                 |
| Scores fonctionnels (Oswestry, QuickDASH, HAD, PSFS, EIFEL, WOMAC…)             | §3 OU §2 selon pertinence, en prose |
| Tests spécifiques / cluster / tests orthopédiques                              | §6 Tests spécifiques               |
| Raisonnement diagnostique / diagnostics différentiels / articulation clinique | §7 Synthèse diagnostique           |

**La section 7 n'est JAMAIS le dépotoir des informations mal placées.** Une donnée de palpation rattachée à §7 est une erreur de classement. De même, un ATCD détaillé en §1 au lieu de §2 est une erreur.

══════════════════════════════════════════
RÈGLE — PAS DE SÉPARATEURS HORIZONTAUX ENTRE SECTIONS
══════════════════════════════════════════
Tu n'insères JAMAIS de séparateur horizontal markdown entre les sections ni à l'intérieur des sections. Les caractères de séparation \`---\`, \`***\`, \`___\` sur une ligne dédiée sont INTERDITS dans ta sortie. La séparation entre sections est matérialisée uniquement par les titres \`### N. Titre\` et les lignes vides entre paragraphes.

══════════════════════════════════════════
SYNTAXE MARKDOWN À UTILISER
══════════════════════════════════════════
- \`### N. Titre\` pour chaque section (numérotation comprise dans le titre, selon la table figée, VERBATIM)
- \`**Sous-titre**\` sur ligne dédiée pour les sous-blocs optionnels d'examen clinique (section 5 uniquement)
- Paragraphes normaux pour tout le reste, séparés par une ligne vide
- Pas de titres de niveau \`#\` ni \`##\` — AUCUN, même pas comme surtitre de document
- **Aucune puce dans les sections 3, 5 et 6, aucune liste verticale dans la section 4**

══════════════════════════════════════════
EXEMPLE DE RÉFÉRENCE — Bilan lombaire type (à reproduire comme modèle)
══════════════════════════════════════════

Données brutes d'entrée (format type, simplifié) :
- Patiente 32 ans, région lombaire, douleur intermittente
- EVN moyen 5/10, pire 9,5/10, meilleur 0,5/10, pas nocturne
- Douleur inguinale gauche en position assise prolongée
- Tous drapeaux (rouges, jaunes, bleus, noirs) négatifs ; traitement antidépresseur + mélatonine en cours pour troubles du sommeil
- Examen morphostatique : RAS
- Mobilité lombaire : flexion / extension / latéroflexion D / latéroflexion G / rotation D / rotation G / inclinaison D / inclinaison G = toutes complètes
- Examen neurologique : Babinski / réflexe achilléen / réflexe quadricipital = négatifs
- Mécanosensibilité : Prone Knee Bend / Slump / Lasègue = négatifs
- Palpation : douleur bilatérale du moyen fessier 8/10, reproductible
- Tests spécifiques : TA / Cluster Laslett / Prone Instability Test / extension-rotation = négatifs

**Rendu attendu (à reproduire comme référence) :**

### 1. Profil du patient et contexte
Patiente de 32 ans consultant pour une lombalgie intermittente, sans drapeau d'alerte associé. Tableau clinique compatible avec une lombalgie non spécifique à préciser.

### 2. Anamnèse
[Paragraphe rédigé reprenant mode de survenue, évolution, ATCD pertinents, traitements en cours, contexte de vie. Si peu d'éléments disponibles, rester sobre et factuel.]

### 3. Symptomatologie douloureuse
La patiente décrit une douleur lombaire de caractère intermittent, cotée en moyenne à 5/10 sur l'échelle visuelle numérique, pouvant atteindre 9,5/10 dans ses pires épisodes et redescendre à 0,5/10 dans ses meilleurs moments. Aucune douleur nocturne n'est rapportée. Une douleur inguinale gauche apparaît lors des positions assises prolongées.

### 4. Drapeaux cliniques
L'interrogatoire systématique des drapeaux rouges est négatif : pas de fièvre, de perte de poids inexpliquée, d'antécédent de cancer, de traumatisme récent, de comorbidité pertinente ni d'antécédent lombaire. Les signes évocateurs d'un syndrome de la queue de cheval sont également écartés (pas de trouble de la fonction anale, d'anesthésie en selle ni de trouble vésical). Aucune imagerie récente n'est disponible. À noter, un traitement par antidépresseur et mélatonine est en cours dans le cadre de troubles du sommeil.

Les drapeaux jaunes sont négatifs : l'échelle HAD, les stratégies de coping, les croyances, le fear-avoidance et le catastrophisme ne mettent en évidence aucun facteur de chronicisation psychosociale. Les drapeaux bleus et noirs sont également négatifs, sans accident du travail, stress professionnel ni conditions socio-économiques défavorables rapportés.

### 5. Examen clinique
L'examen morphostatique est sans particularité. La mobilité articulaire lombaire est complète, symétrique et indolore dans l'ensemble des amplitudes testées (flexion, extension, rotations et inclinaisons latérales droite et gauche). L'examen neurologique est rassurant, avec un signe de Babinski négatif et des réflexes achilléen et quadricipital normaux. Les tests de mécanosensibilité neuroméningée (Prone Knee Bend, Slump test et Lasègue) sont tous négatifs, écartant une composante radiculaire.

À la palpation, la patiente présente une douleur bilatérale du moyen fessier, cotée à 8/10, reproduite sur l'ensemble de la zone fessière.

### 6. Tests spécifiques
Le test TA (Test d'Adam) est négatif, écartant une scoliose structurelle. Le cluster de Laslett, le Prone Instability Test et le test extension-rotation sont également négatifs, écartant respectivement une implication sacro-iliaque significative, une instabilité lombaire segmentaire et une atteinte zygapophysaire directe.

### 7. Synthèse diagnostique
Le tableau clinique est celui d'une douleur lombaire intermittente chez une patiente de 32 ans, sans drapeau d'alerte, avec une mobilité articulaire préservée et un examen neurologique normal. La négativité des tests de mécanosensibilité et des tests spécifiques sacro-iliaques, d'instabilité segmentaire et zygapophysaires oriente vers une douleur d'origine non spécifique. La douleur palpatoire bilatérale du moyen fessier ainsi que la douleur inguinale gauche aux positions assises prolongées évoquent une participation myofasciale et une possible composante de la hanche, qui mériteront d'être précisées lors du suivi.

### 8. Projet thérapeutique
La prise en charge s'organise autour de trois axes principaux. Un **axe de récupération de la mobilité et de contrôle myofascial** pourra mobiliser, selon l'évolution, un travail manuel ciblé sur le moyen fessier et la région lombo-pelvienne ainsi que des exercices actifs de réintégration segmentaire. Un **axe de renforcement et de travail neuromusculaire** pourra être engagé progressivement sur la stabilité lombo-pelvienne et la chaîne postérieure, en fonction de la tolérance de la patiente. Enfin, un **axe d'éducation thérapeutique et de reprise des activités** accompagnera la patiente dans la gestion de ses positions assises prolongées et la reprise de son activité habituelle. Une évaluation complémentaire de la hanche gauche pourra être envisagée en cas de persistance de la symptomatologie inguinale.

### 9. Conclusion
Patiente de 32 ans présentant une lombalgie non spécifique sans drapeau d'alerte, avec une composante myofasciale fessière bilatérale et une douleur inguinale gauche positionnelle à surveiller. Prise en charge en physiothérapie initiée ce jour.

══════════════════════════════════════════
ANTI-PATTERNS À PROSCRIRE (exemples d'erreurs observées)
══════════════════════════════════════════

**Réflexes rendus « abolis » alors que l'entrée disait « négatif »** (erreur de sécurité clinique) :
Entrée : \`réflexe achilléen : négatif\`, \`réflexe rotulien : négatif\`
Rendu fautif : *« Les réflexes achilléens et rotuliens sont abolis. »* → évoque une atteinte radiculaire bilatérale inexistante.
Rendu correct : *« Les réflexes achilléens et rotuliens sont normaux et symétriques. »*

**EVN en puces dans la section 3** :
\`\`\`
- EVN moyenne : 5/10
- EVN pire : 9,5/10
- EVN meilleure : 0,5/10
\`\`\`
→ **À remplacer par** : *« La douleur est cotée en moyenne à 5/10 sur l'EVN, pouvant atteindre 9,5/10 dans ses pires épisodes et redescendre à 0,5/10 dans ses meilleurs moments. »*

**Mobilité lombaire en puces** :
\`\`\`
Mobilité articulaire lombaire
- Flexion : complète
- Extension : complète
- Latéroflexion droite : complète
- Latéroflexion gauche : complète
- Rotation droite : complète
- Rotation gauche : complète
- Inclinaison droite : complète      ← DOUBLON avec latéroflexion
- Inclinaison gauche : complète      ← DOUBLON avec latéroflexion
\`\`\`
→ **À remplacer par** : *« La mobilité articulaire lombaire est complète, symétrique et indolore dans l'ensemble des amplitudes testées (flexion, extension, rotations et inclinaisons latérales droite et gauche). »*

**Examen neurologique en puces** :
\`\`\`
- Signe de Babinski : négatif
- Réflexe achilléen : négatif
- Réflexe quadricipital : négatif
\`\`\`
→ **À remplacer par** : *« L'examen neurologique est rassurant, avec un signe de Babinski négatif et des réflexes achilléen et quadricipital normaux et symétriques. »*

**Tests spécifiques en puces** :
\`\`\`
- Cluster de Laslett : négatif
- Prone Instability Test : négatif
- Test extension-rotation : négatif
\`\`\`
→ **À remplacer par** : *« Le cluster de Laslett, le Prone Instability Test et le test extension-rotation sont négatifs, écartant une implication sacro-iliaque significative, une instabilité segmentaire et une atteinte zygapophysaire. »*

**Numérotation cassée** (sections 1, 2, 3, 4, 5 puis saut à 8) : on rend TOUJOURS les 9 sections dans l'ordre 1→9. « Non renseigné lors de ce bilan. » uniquement pour les sections 1 à 6 sans données ; production rédactionnelle OBLIGATOIRE pour les sections 7, 8 et 9.

**Sections 7, 8 ou 9 avec « Non renseigné lors de ce bilan. »** → INTERDIT. Ces sections sont générées par raisonnement clinique à partir des sections 1 à 6. Si les éléments sont partiels, tu formules une hypothèse prudente ou tu écris « à préciser au terme de l'évaluation initiale complète ».

**Donnée de palpation placée dans "Notes complémentaires" en fin de document** → elle doit être dans la **section 5 (Examen clinique), sous-bloc Palpation**.

**Libellés calqués sur l'entrée** (« Bilan Algique », « Notes Complémentaires », « Scores Fonctionnels ») → utiliser EXCLUSIVEMENT les 9 titres de la table figée ci-dessus.

**Terminologie inventée** : « temporo-acromiale » à la place de « temporo-auriculaire », « Lasègue » à la place de « Laslett », « élévation jambe tendue » à la place de « ASLR ». INTERDIT — reproduction verbatim obligatoire.

**Titre de section reformulé** : « Anamnèse et Motif de Consultation » au lieu de « Anamnèse », « Profil de la Présentation Clinique » au lieu de « Synthèse diagnostique », « Éléments de Vigilance et de Suivi » au lieu de « Conclusion », « Objectifs Fonctionnels » au lieu de « Projet thérapeutique ». INTERDIT — les titres sont verbatim, strictement tels que la table figée.

**Surtitre \`# Bilan de Physiothérapie - Zone Lombaire\` en tête de markdown** : INTERDIT. Le titre est dans l'en-tête du PDF (rendu par le template). Ta sortie commence directement par « ### 1. Profil du patient et contexte ». Ne JAMAIS utiliser \`#\` ni \`##\`.

**Drapeaux jaunes rendus comme « non renseignés comme préoccupants »** alors que les items sont « négatifs » (= rassurants). Rendu fautif : *« le HAD, les stratégies de coping, les croyances... sont tous non renseignés comme préoccupants »*. Rendu correct : *« Les drapeaux jaunes sont rassurants : le HAD, les stratégies de coping, les croyances, l'évitement par la peur et le catastrophisme ne mettent pas en évidence de facteur de chronicisation psychosociale. »*

**Doublon latéroflexion / latéralisation** dans la phrase de mobilité : *« flexion, extension, rotations droite et gauche, inclinaisons latérales droite et gauche, ainsi que les latéralisations droite et gauche »*. INTERDIT — ce sont des synonymes. Rendu correct : *« flexion, extension, rotations droite et gauche, inclinaisons latérales droite et gauche »*.

**Section 1 contenant traitement médicamenteux ou ATCD** : INTERDIT. La section 1 est un cadrage pur (âge, zone, motif). Traitements et ATCD appartiennent à la section 2 (Anamnèse).

**Section 9 renommée « Éléments de Vigilance » avec liste de red flags** : INTERDIT. La section 9 est une Conclusion courte (2-3 phrases) adressée au prescripteur : synthèse du tableau + orientation. Les signes de vigilance éventuels s'intègrent en fin de section 8.

**Même information détaillée en section 3 ET en section 7** : INTERDIT. Information clinique détaillée une seule fois dans sa section principale ; la section 7 la reprend en synthèse articulée au raisonnement, sans redétailler.

**Pourcentages dans la synthèse diagnostique** (section 7) : *« L'hypothèse de syndrome facettaire est retenue à 60 % »*, *« différentiel discopathique (25 %) »*, *« hypothèse principale : 70 % »*. INTERDIT. Reformulation en langage médical argumenté : *« L'hypothèse principale retenue est celle d'un syndrome facettaire, étayée par [arguments]. Un différentiel discopathique est évoqué mais moins probable au regard de [argument d'écartement]. »*

**Acronymes développés par invention** — *« Test TA »* rendu *« articulation temporo-auriculaire »* → erreur grave, TA = **Test d'Adam** (dépistage de scoliose) selon référentiel Knode. *« PKB »* rendu *« Posterior Knee Bend »* → **Prone Knee Bend (test de Léri)**. *« HAD »* inventé en *« Handicap Activity Disability »* → **Hospital Anxiety and Depression scale**. Acronyme inconnu du référentiel → conservé verbatim, SANS expansion inventée.

**Segments vertébraux chiffrés inventés** — *« lombalgie L4-L5 »*, *« atteinte T12-L2 »*, *« discopathie C5-C6 »* écrits sans que le niveau figure dans les données d'entrée. INTERDIT. En l'absence de niveau explicite, rester générique : *« douleur du rachis lombaire »*, *« évocateur d'un pattern de référence du rachis lombaire »*.

**Contexte socio-professionnel inventé** — *« patient sédentaire »*, *« dans un contexte de stress professionnel »*, *« suite à un effort en flexion »*, *« travailleur manuel »* ajoutés sans source explicite dans les données. INTERDIT.

**Séparateurs horizontaux markdown** (\`---\`, \`***\`, \`___\`) insérés entre sections ou à l'intérieur d'une section. INTERDIT. La séparation est assurée par les titres \`### N. Titre\` et les lignes vides.

**Projet thérapeutique en liste plate non structurée** — paragraphe unique énumérant *« thérapie manuelle, exercices actifs, éducation, conseils »* sans structure par axes ni formulations conditionnelles. INTERDIT. Structurer par 3 à 5 axes pertinents (contrôle antalgique, mobilité, renforcement, éducation, reprise activités) avec formulations conditionnelles (*« pourront être mobilisés »*, *« selon l'évolution »*, *« en fonction de la réponse clinique »*).`

  // Export un bilan depuis le dossier patient — génère avec IA puis ouvre l'aperçu modifiable
  const exportBilanFromRecord = async (record: BilanRecord, isIntermediaire = false) => {
    const recSexe = record.sexe ?? getPatientSexe(`${(record.nom || 'Anonyme').toUpperCase()} ${record.prenom}`.trim())
    setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance, sexe: recSexe ?? prev.sexe }))
    setPdfPreviewZone(record.zone ?? '')
    setPdfPreviewTitle(isIntermediaire ? 'BILAN INTERMÉDIAIRE EN PHYSIOTHÉRAPIE' : 'BILAN EN PHYSIOTHÉRAPIE')

    if (apiKey && record.bilanData) {
      const cacheHash = hashInputs({
        flow: 'pdf_bilan',
        bilanId: record.id,
        isIntermediaire,
        zone: record.zone ?? '',
        bilanType: getBilanType(record.zone ?? '') ?? '',
        bilanData: record.bilanData,
        notesLibres: record.notes || '',
        patient: {
          nom: record.nom,
          prenom: record.prenom,
          dateNaissance: record.dateNaissance,
          sexe: recSexe ?? null,
        },
        documents: (record.documents ?? []).map(documentFingerprint),
      })
      const cached = getCachedBilanPDF(cacheHash)
      if (cached) {
        setPdfPreviewMarkdown(cached)
        setPdfPreviewSource('bilan')
        setPdfPreviewPatientKey(`${(record.nom || 'Anonyme').toUpperCase()} ${record.prenom}`.trim())
        setStep('pdf_preview')
        return
      }
      setExportingRecordId(record.id)
      showToast('Mise en forme du bilan en cours…', 'success')
      try {
        const userPrompt = buildPDFReportPrompt({
          patient: { nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance, sexe: recSexe },
          zone: record.zone ?? '',
          bilanType: getBilanType(record.zone ?? '') ?? '',
          bilanData: record.bilanData,
          notesLibres: record.notes || undefined,
          analyseIA: null, // Bilan PDF = pas d'analyse IA
        })
        const report = await callClaudeWithDocGuard({
          apiKey,
          systemPrompt: PDF_BILAN_SYSTEM_PROMPT,
          userPrompt,
          maxOutputTokens: 8192,
          jsonMode: false,
          documents: record.documents?.length ? record.documents : undefined,
          patient: {
            nom: record.nom,
            prenom: record.prenom,
            patientKey: `${(record.nom || 'Anonyme').toUpperCase()} ${record.prenom}`.trim(),
          },
          category: 'pdf_bilan',
          onAudit: recordAIAudit,
        })
        setCachedBilanPDF(cacheHash, report)
        setPdfPreviewMarkdown(report)
        setPdfPreviewSource('bilan')
        setPdfPreviewPatientKey(`${(record.nom || 'Anonyme').toUpperCase()} ${record.prenom}`.trim())
        setStep('pdf_preview')
      } catch (err) {
        if (err instanceof Error && err.message === 'UNMASKED_DOCS_CANCELLED') {
          showToast('Export annulé', 'info')
          return
        }
        showToast('Erreur analyse — export classique', 'error')
        const patKey = `${(record.nom || 'Anonyme').toUpperCase()} ${record.prenom}`.trim()
        const patBilans = getPatientBilans(patKey).filter(r => r.evn != null)
        const entries: ImprovementEntry[] = patBilans.map((r, i) => ({
          num: i + 1, date: r.dateBilan, evn: r.evn ?? null,
          delta: i === 0 ? null : improvDelta(patBilans[i - 1].evn!, r.evn!),
        }))
        const pi = { nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance, sexe: recSexe, profession: '', sport: '', famille: '', chirurgie: '', notes: '' }
        const out = await generatePDF(pi, pi, record.silhouetteData ?? {},
          record.bilanData ? { sectionTitle: record.zone ?? '', data: record.bilanData } : null,
          entries.length > 0 ? { generalScore: patientGeneralScore(patKey), bilans: entries } : null,
          undefined, record.notes || undefined)
        attachPdfToPatient(out.blob, out.fileName, patKey, 'bilan')
      } finally {
        setExportingRecordId(null)
      }
    } else {
      // Sans clé API — fallback PDF classique direct
      const patKey = `${(record.nom || 'Anonyme').toUpperCase()} ${record.prenom}`.trim()
      const patBilans = getPatientBilans(patKey).filter(r => r.evn != null)
      const entries: ImprovementEntry[] = patBilans.map((r, i) => ({
        num: i + 1, date: r.dateBilan, evn: r.evn ?? null,
        delta: i === 0 ? null : improvDelta(patBilans[i - 1].evn!, r.evn!),
      }))
      const pi = { nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance, sexe: recSexe, profession: '', sport: '', famille: '', chirurgie: '', notes: '' }
      const out = await generatePDF(pi, pi, record.silhouetteData ?? {},
        record.bilanData ? { sectionTitle: record.zone ?? '', data: record.bilanData } : null,
        entries.length > 0 ? { generalScore: patientGeneralScore(patKey), bilans: entries } : null,
        undefined, record.notes || undefined)
      attachPdfToPatient(out.blob, out.fileName, patKey, 'bilan')
    }
  }

  const handleExportData = () => {
    if (!allDataLoaded) { showToast('Chargement en cours, réessayez dans un instant', 'error'); return }
    const payload = JSON.stringify({ db, dbIntermediaires, dbNotes, dbObjectifs, dbExerciceBank, dbPatientDocs, dbPrescriptions, profile, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `physio-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Données exportées', 'success')
  }

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string)
        const parsed = backupSchema.parse(raw)
        setDb(parsed.db)
        if (parsed.dbIntermediaires) setDbIntermediaires(parsed.dbIntermediaires as unknown as BilanIntermediaireRecord[])
        if (parsed.dbNotes) setDbNotes(parsed.dbNotes as unknown as NoteSeanceRecord[])
        if (parsed.dbObjectifs) setDbObjectifs(parsed.dbObjectifs as unknown as SmartObjectif[])
        if (parsed.dbExerciceBank) setDbExerciceBank(parsed.dbExerciceBank as unknown as ExerciceBankEntry[])
        if (parsed.dbPatientDocs) setDbPatientDocs(parsed.dbPatientDocs as unknown as PatientDocument[])
        if (parsed.dbPrescriptions) setDbPrescriptions(parsed.dbPrescriptions as unknown as PatientPrescription[])
        if (parsed.profile) setProfile(parsed.profile as unknown as ProfileData)
        const noteKeys = (parsed.dbNotes as Array<{ patientKey: string }> | undefined)?.map(n => n.patientKey) ?? []
        const uniqueNoteKeys = [...new Set(noteKeys)]
        const counts = [
          `${parsed.db.length} bilans`,
          parsed.dbIntermediaires?.length ? `${parsed.dbIntermediaires.length} intermédiaires` : '',
          parsed.dbNotes?.length ? `${parsed.dbNotes.length} séances [${uniqueNoteKeys.join(', ')}]` : '⚠️ 0 séances dans le fichier',
        ].filter(Boolean).join(', ')
        showToast(`Importé : ${counts}`, 'success')
      } catch {
        showToast('Fichier invalide', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setProfileEditDraft(p => ({ ...p, photo: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  // testApiKey function removed — Vertex AI, no client key needed

  // ── Input with mic helper ─────────────────────────────────────────────────────

  // ── Step progress ─────────────────────────────────────────────────────────────
  const STEP_ORDER: Step[] = ['identity', 'general_info', 'bilan_zone', 'analyse_ia']
  const stepProgress = STEP_ORDER.indexOf(step) >= 0 ? ((STEP_ORDER.indexOf(step) + 1) / STEP_ORDER.length) * 100 : 0

  // ── Tutorial ──────────────────────────────────────────────────────────────────
  const handleTutorialDone = () => {
    localStorage.setItem('physio_tutorial_done', 'true')
    setTutorialActive(false)
  }

  const handleTutorialNext = () => {
    const next = tutorialIdx + 1
    if (next >= TUTORIAL_STEPS.length) { handleTutorialDone(); return }
    if (tutorialIdx === 0) setStep('dashboard')
    else if (tutorialIdx === 1) {
      resetForm()
      setFormData({ nom: 'DUPONT', prenom: 'Jean', dateNaissance: '15/06/1985', sexe: 'masculin', profession: 'Employé de bureau', sport: 'Tennis (2x/semaine)', famille: 'Pas d\'antécédents familiaux connus', chirurgie: 'Appendicectomie (2015)', notes: 'Patient motivé, douleur depuis 3 semaines suite à un effort au sport' })
      setSelectedBodyZone('Épaule')
      setCurrentBilanDataOverride({ douleur: { debutSymptomes: 'Il y a 3 semaines, lors d\'un match de tennis', localisationActuelle: 'Face antérieure de l\'épaule droite avec irradiation vers le cou', evnPire: '7', evnMieux: '2', evnMoy: '4', douleurType: 'Mécanique, sharp lors des mouvements', mouvementsEmpirent: 'Élévation du bras au-dessus de la tête, rotation interne', mouvementsSoulagent: 'Repos, antalgiques, application de froid', douleurNocturne: 'oui', douleurNocturneType: 'Douleur en décubitus latéral', insomniante: 'non' } })
      setPatientMode('new')
      setStep('identity')
    }
    else if (tutorialIdx === 2) setStep('general_info')
    else if (tutorialIdx === 3) { setBilanZoneBackStep('general_info'); setStep('bilan_zone') }
    else if (tutorialIdx === 4) setStep('database')
    setTutorialIdx(next)
  }

  const handleTutorialIA = () => {
    const patBilans = selectedPatient ? db.filter(r => `${r.nom.toUpperCase()} ${r.prenom}`.trim() === selectedPatient) : []
    const last = patBilans[patBilans.length - 1]
    if (last) { setCurrentBilanId(last.id); setStep('analyse_ia') }
    handleTutorialDone()
  }

  const handleTutorialExercices = () => {
    setFicheBackStep('database')
    setStep('fiche_exercice')
    handleTutorialDone()
  }

  const handleTutorialPDF = () => {
    setStep('database')
    handleTutorialDone()
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  // Auth gate: loading → login → app
  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.surfaceMuted }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  const supabaseConfigured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

  if (supabaseConfigured && !user) {
    return <AuthScreen />
  }

  if (supabaseConfigured && !onboarded && allDataLoaded) {
    return (
      <OnboardingScreen
        initialProfile={profile}
        onComplete={(completed) => {
          setProfile(completed)
          setOnboarded(true)
        }}
      />
    )
  }

  return (
    <div className="app-container" ref={appContainerRef}>
      {showSplash && <SplashScreen onDone={() => { sessionStorage.setItem('splash_ts', Date.now().toString()); setShowSplash(false) }} />}
      {tutorialActive && !showSplash && (
        <Tutorial
          steps={TUTORIAL_STEPS}
          currentIdx={tutorialIdx}
          containerEl={appContainerRef.current}
          onNext={handleTutorialNext}
          onSkip={handleTutorialDone}
          onDone={handleTutorialDone}
          onActionIA={handleTutorialIA}
          onActionExercices={handleTutorialExercices}
          onActionPDF={handleTutorialPDF}
        />
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── Dashboard ──────────────────────────────────────────────────────────── */}
      {step === 'dashboard' && (() => {
        const now = new Date()
        const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        const initials = `${(profile.nom || 'W')[0]}${(profile.prenom || '')[0] || ''}`.toUpperCase()
        return (
          <div className={slideEntry || swipedNav.current ? '' : 'fade-in'} style={{ ...swipeDragStyle, ...slideEntryStyle, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            <div className="scroll-area" style={{ flex: 1, padding: '0.5rem 0.35rem 0' }}>
              {/* Header — centered with settings */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem', paddingTop: '0.3rem' }}>
                <button onClick={() => setStep('settings')} style={{ position: 'absolute', top: '0.3rem', right: 0, width: 30, height: 30, borderRadius: 'var(--radius-full)', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-full)', overflow: 'hidden', flexShrink: 0, background: profile.photo ? 'transparent' : 'color-mix(in srgb, var(--primary) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                  {profile.photo
                    ? <img src={profile.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profil" />
                    : <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)' }}>{initials}</span>}
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>{dateStr}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-dark)', letterSpacing: '-0.02em' }}>Bonjour, {profile.nom || profile.prenom}</div>
              </div>

              {/* Hero card — dernière activité */}
              {(() => {
                const parseFR = (d: string) => { const [dd, mm, yy] = d.split('/'); return new Date(`${yy}-${mm}-${dd}`).getTime() || 0 }
                const activities: { patientKey: string; date: number; dateStr: string; type: string; zone?: string }[] = [
                  ...db.filter(r => r.status === 'complet' || r.bilanData).map(r => ({ patientKey: `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim(), date: parseFR(r.dateBilan), dateStr: r.dateBilan, type: 'Bilan initial', zone: r.zone })),
                  ...dbIntermediaires.map(r => ({ patientKey: r.patientKey, date: parseFR(r.dateBilan), dateStr: r.dateBilan, type: 'Bilan intermédiaire', zone: r.zone })),
                  ...dbNotes.map(r => ({ patientKey: r.patientKey, date: parseFR(r.dateSeance), dateStr: r.dateSeance, type: 'Séance', zone: r.zone })),
                ]
                const last = activities.sort((a, b) => b.date - a.date)[0]
                if (!last) return null
                const diff = Math.floor((Date.now() - last.date) / 86400000)
                const ago = diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Hier' : `Il y a ${diff}j`
                const totalThisWeek = activities.filter(a => Date.now() - a.date < 7 * 86400000).length
                return (
                  <div
                    onClick={() => { setSelectedPatient(last.patientKey); setStep('database') }}
                    style={{ background: 'var(--primary-dark)', borderRadius: 'var(--radius-xl)', padding: '1.1rem 1.15rem', marginBottom: '1rem', cursor: 'pointer', color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 16px rgba(15,23,42,0.18)' }}
                  >
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                    <div style={{ position: 'absolute', bottom: -30, right: 40, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
                    <div style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6, marginBottom: '0.6rem' }}>Dernière activité</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.2rem', letterSpacing: '-0.01em' }}>{last.patientKey}</div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.7, marginBottom: '0.75rem' }}>
                      {last.type}{last.zone ? ` · ${last.zone}` : ''} · {ago}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: 0.85 }}>
                        Ouvrir le dossier
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      </span>
                      {totalThisWeek > 0 && (
                        <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>{totalThisWeek} activité{totalThisWeek > 1 ? 's' : ''} cette semaine</span>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Stats */}
              <DashboardStats bilans={db} intermediaires={dbIntermediaires} notesSeance={dbNotes} closedTreatments={dbClosedTreatments} onSelectPatient={(key) => { setSelectedPatient(key); setStep('database') }} />

            </div>
            {/* Action buttons — sticky bottom */}
            <div style={{ flexShrink: 0, padding: '0.6rem 0.75rem', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, var(--base-bg) 70%, transparent)', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { swipedNav.current = false; setSelectedPatient(null); setSearchQuery(''); setStep('database') }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'var(--surface)', border: '1px solid var(--border-color)', color: 'var(--primary-dark)', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'transform 0.15s', whiteSpace: 'nowrap' }}
                onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
                onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                Mes patients
              </button>
              <button
                data-tutorial="new-patient-btn"
                onClick={() => { resetForm(); setSelectedBodyZone(null); setPatientMode('new'); setStep('identity') }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.75rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(15,23,138,0.15)', transition: 'transform 0.15s', whiteSpace: 'nowrap' }}
                onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
                onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nouveau patient
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Database ───────────────────────────────────────────────────────────── */}
      {step === 'database' && (
        <div className={`general-info-screen ${slideEntry || swipedNav.current ? '' : 'fade-in'}`} style={{ ...swipeDragStyle, ...slideEntryStyle, padding: '0 0.35rem' }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          {selectedPatient ? null : (
            <header className="screen-header">
              <button className="btn-back" onClick={() => setStep('dashboard')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <h2 className="title-section">Patients</h2>
              <button
                onClick={() => setShowAddPatientChoice(true)}
                aria-label="Ajouter un patient"
                style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--input-bg)', color: 'var(--primary)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </header>
          )}
          <div className="scroll-area">
            {!selectedPatient ? (
              <>
                <div style={{marginBottom: '1rem'}}>
                  <div style={{ position: 'relative' }}>
                    <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: c.textMuted }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input type="text" placeholder="Rechercher un nom…"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.4rem', fontSize: '0.92rem', borderRadius: 999, border: `1px solid ${c.borderSoft}`, background: 'var(--input-bg)', color: c.text, outline: 'none', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)' }} />
                  </div>
                </div>
                {(() => {
                  const patientsMap = new Map<string, { key: string; nom: string; prenom: string; dateNaissance: string; pathologie?: string; avatarBg?: string; records: BilanRecord[] }>()
                  db.forEach(r => {
                    const key = `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim()
                    if (!patientsMap.has(key)) patientsMap.set(key, { key, nom: r.nom, prenom: r.prenom, dateNaissance: r.dateNaissance, pathologie: r.pathologie, avatarBg: r.avatarBg, records: [] })
                    patientsMap.get(key)!.records.push(r)
                  })
                  const patients = Array.from(patientsMap.values()).filter(p => p.key.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => a.key.localeCompare(b.key, 'fr'))
                  if (patients.length === 0) return <div className="empty-state"><p>Aucun dossier trouvé.</p></div>

                  // Group patients by first letter
                  const grouped = new Map<string, typeof patients>()
                  patients.forEach(p => {
                    const letter = (p.nom[0] || '?').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').charAt(0)
                    const key = /[A-Z]/.test(letter) ? letter : '#'
                    if (!grouped.has(key)) grouped.set(key, [])
                    grouped.get(key)!.push(p)
                  })
                  const letters = Array.from(grouped.keys()).sort((a, b) => a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b))

                  return (
                    <div style={{ display: 'flex', position: 'relative' }}>
                      {/* Patient list */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0, paddingBottom: '5rem' }}>
                        {/* Patient count */}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.75rem', letterSpacing: '0.02em' }}>
                          {patients.length} patient{patients.length > 1 ? 's' : ''}
                        </div>
                        {letters.map(letter => (
                          <div key={letter} id={`patient-section-${letter}`}>
                            {/* Letter header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', marginBottom: '0.15rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.03em' }}>{letter}</span>
                              <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                            </div>
                            {/* Patients in this letter group */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                              {grouped.get(letter)!.map(p => {
                                const score = patientGeneralScore(p.key)
                                const scoreColor = score === null ? '#94a3b8' : score > 0 ? '#166534' : score < 0 ? '#881337' : '#94a3b8'
                                const age = computeAge(p.dateNaissance)
                                const lastBilan = [...p.records].sort((a, b) => b.id - a.id)[0]
                                const firstBilanLabel = [...p.records].sort((a, b) => a.id - b.id).find(r => r.customLabel)?.customLabel
                                const pathoLabel = firstBilanLabel || lastBilan?.pathologie || lastBilan?.zone || ''
                                // Count total séances (bilans + intermédiaires + notes)
                                const nBilans = p.records.filter(r => r.status === 'complet' || r.bilanData).length
                                const nInter = dbIntermediaires.filter(r => r.patientKey === p.key).length
                                const nNotes = dbNotes.filter(r => r.patientKey === p.key).length
                                const totalSeances = nBilans + nInter + nNotes
                                // Last activity date across all record types
                                const parseFR = (d: string) => { const [dd, mm, yy] = d.split('/'); return new Date(`${yy}-${mm}-${dd}`).getTime() || 0 }
                                const allDates = [
                                  ...p.records.map(r => parseFR(r.dateBilan)),
                                  ...dbIntermediaires.filter(r => r.patientKey === p.key).map(r => parseFR(r.dateBilan)),
                                  ...dbNotes.filter(r => r.patientKey === p.key).map(r => parseFR(r.dateSeance)),
                                ].filter(d => d > 0)
                                const lastDate = allDates.length ? new Date(Math.max(...allDates)) : null
                                const timeAgo = (() => {
                                  if (!lastDate) return ''
                                  const diff = Date.now() - lastDate.getTime()
                                  const days = Math.floor(diff / 86400000)
                                  if (days === 0) return "Aujourd'hui"
                                  if (days === 1) return 'Hier'
                                  if (days < 7) return `Il y a ${days}j`
                                  if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`
                                  if (days < 365) return `Il y a ${Math.floor(days / 30)} mois`
                                  return `Il y a ${Math.floor(days / 365)} an(s)`
                                })()
                                return (
                                  <div key={p.key} onClick={() => setSelectedPatient(p.key)}
                                    style={{ background: 'var(--surface)', padding: '0.7rem 0.85rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }}
                                    onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
                                    onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                                    onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                                    <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.65rem', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
                                      {(p.nom[0] || '?')}{(p.prenom[0] || '?')}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem', marginBottom: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        {p.key}
                                        {isBirthday(p.dateNaissance) && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="14" width="18" height="8" rx="2"/><rect x="6" y="11" width="12" height="3" rx="1"/><line x1="8.5" y1="11" x2="8.5" y2="7"/><line x1="12" y1="11" x2="12" y2="7"/><line x1="15.5" y1="11" x2="15.5" y2="7"/><path d="M7.5 5.5c1-1.5 1-1.5 2 0M11 5.5c1-1.5 1-1.5 2 0M14.5 5.5c1-1.5 1-1.5 2 0"/></svg>}
                                      </div>
                                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {age !== null && <>{age} ans</>}{age !== null && pathoLabel ? ' · ' : ''}{pathoLabel}
                                      </div>
                                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        {totalSeances > 0 && <span>{totalSeances} séance{totalSeances > 1 ? 's' : ''}</span>}
                                        {totalSeances > 0 && timeAgo && <span>·</span>}
                                        {timeAgo && <span>{timeAgo}</span>}
                                        {totalSeances === 0 && !timeAgo && <span style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)', fontSize: '0.62rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)' }}>Nouveau</span>}
                                      </div>
                                    </div>
                                    {score !== null
                                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, fontSize: '0.78rem', color: scoreColor, flexShrink: 0 }}>
                                          {score > 0 ? (
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                          ) : score < 0 ? (
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                          ) : (
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                          )}
                                          {Math.abs(score)}%
                                        </span>
                                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                                    }
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Alphabet sidebar */}
                      {!searchQuery && letters.length > 1 && (
                        <div
                          style={{ position: 'sticky', top: 0, right: 0, height: 'fit-content', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '0.35rem 0.15rem', marginLeft: '0.85rem', zIndex: 20, alignSelf: 'flex-start', flexShrink: 0, width: 22 }}
                          onTouchMove={e => {
                            const touch = e.touches[0]
                            const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
                            if (el?.dataset?.letter) {
                              const section = document.getElementById(`patient-section-${el.dataset.letter}`)
                              section?.scrollIntoView({ behavior: 'auto', block: 'start' })
                            }
                          }}
                        >
                          {letters.map(l => (
                            <button key={l} data-letter={l}
                              onClick={() => {
                                const section = document.getElementById(`patient-section-${l}`)
                                section?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              }}
                              style={{ width: 20, height: 20, borderRadius: 'var(--radius-full)', border: 'none', background: 'transparent', color: 'var(--primary)', fontWeight: 600, fontSize: '0.62rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'background 0.15s, color 0.15s' }}
                              onPointerEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white' }}
                              onPointerLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)' }}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const allPatientRecords = getPatientBilans(selectedPatient)
                  const firstR = allPatientRecords[0]
                  const isPlaceholder = (r: BilanRecord) => r.status === 'incomplet' && !r.bilanData
                  const bilans = allPatientRecords.filter(r => !isPlaceholder(r))
                  // Hero card derivations
                  const rxForHero = dbPrescriptions.find(p => p.patientKey === selectedPatient)
                  const lastBilanForHero = bilans[bilans.length - 1]
                  const notesSortedForHero = [...getPatientNotes(selectedPatient ?? '')].sort((a, b) => (a.dateSeance || '').localeCompare(b.dateSeance || ''))
                  const lastNoteForHero = notesSortedForHero[notesSortedForHero.length - 1]
                  // Zones available for the consultation chooser (excludes closed PECs)
                  const ZONE_LABELS_SHORT: Record<string, string> = {
                    epaule: 'Épaule',
                    cheville: 'Cheville',
                    genou: 'Genou',
                    hanche: 'Hanche',
                    cervical: 'Rachis Cervical',
                    lombaire: 'Rachis Lombaire',
                    generique: 'Autres bilans',
                    geriatrique: 'Gériatrie',
                  }
                  const zoneHasBilans = new Map<string, boolean>()
                  bilans.forEach(b => {
                    const key = b.bilanType ?? getBilanType(b.zone ?? '')
                    zoneHasBilans.set(key, true)
                  })
                  getPatientIntermediaires(selectedPatient ?? '').forEach(r => {
                    const key = r.bilanType ?? getBilanType(r.zone ?? '')
                    if (!zoneHasBilans.has(key)) zoneHasBilans.set(key, false)
                  })
                  getPatientNotes(selectedPatient ?? '').forEach(n => {
                    const key = n.bilanType ?? getBilanType(n.zone ?? '')
                    if (!zoneHasBilans.has(key)) zoneHasBilans.set(key, false)
                  })
                  // Zones créées depuis une prescription (même sans aucun bilan/séance)
                  ;(rxForHero?.prescriptions ?? []).forEach(pr => {
                    if (pr.bilanType && !zoneHasBilans.has(pr.bilanType)) zoneHasBilans.set(pr.bilanType, false)
                  })
                  const genericCustomLabel = (rxForHero?.prescriptions ?? []).find(pr => pr.bilanType === 'generique')?.customLabel
                  const zonesForPicker = Array.from(zoneHasBilans.entries())
                    .filter(([bt]) => !isTreatmentClosed(selectedPatient ?? '', bt as BilanType))
                    .map(([bt, hasBilans]) => ({
                      bilanType: bt,
                      label: bt === 'generique' && genericCustomLabel ? genericCustomLabel : (ZONE_LABELS_SHORT[bt] ?? bt),
                      accent: c.primary,
                      hasBilans,
                    }))
                  const hasAnyBilanForPicker = bilans.length > 0
                  return (
                    <>
                      <PatientHeader
                        name={selectedPatient ?? ''}
                        initials={`${firstR?.nom[0] || '?'}${firstR?.prenom[0] || '?'}`}
                        avatarBg={firstR?.avatarBg}
                        birthday={isBirthday(firstR?.dateNaissance)}
                        infoLine={(() => {
                          const parts: string[] = []
                          if (firstR?.dateNaissance) {
                            const age = computeAge(firstR.dateNaissance)
                            if (age !== null) parts.push(`${age} ans`)
                          }
                          return parts.length > 0 ? parts.join(' · ') : undefined
                        })()}
                        stats={[
                          { label: 'Depuis', value: (() => {
                            const d = firstR?.dateBilan
                            if (!d) return '—'
                            const parts = d.includes('-') ? d.split('-') : d.split('/')
                            const months = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']
                            const day = d.includes('-') ? parts[2] : parts[0]
                            const monthIdx = parseInt(d.includes('-') ? parts[1] : parts[1], 10) - 1
                            return `${parseInt(day, 10)} ${months[monthIdx] ?? ''}`
                          })() },
                          { label: 'Bilans', value: String(bilans.length) },
                          { label: 'Séances', value: String(getPatientNotes(selectedPatient ?? '').length + bilans.length + getPatientIntermediaires(selectedPatient ?? '').length) },
                        ]}
                        onBack={() => setSelectedPatient(null)}
                      />
                      <PatientHeroCard
                        activeZones={(() => {
                          const zoneMap = new Map<string, number>()
                          const allNotes = getPatientNotes(selectedPatient ?? '')
                          const allInterms = getPatientIntermediaires(selectedPatient ?? '')
                          for (const b of bilans) {
                            const bt = b.bilanType ?? getBilanType(b.zone ?? '')
                            if (isTreatmentClosed(selectedPatient ?? '', bt as BilanType)) continue
                            zoneMap.set(bt, (zoneMap.get(bt) ?? 0) + 1)
                          }
                          for (const n of allNotes) {
                            const bt = n.bilanType ?? getBilanType(n.zone ?? '')
                            if (isTreatmentClosed(selectedPatient ?? '', bt as BilanType)) continue
                            zoneMap.set(bt, (zoneMap.get(bt) ?? 0) + 1)
                          }
                          for (const i of allInterms) {
                            const bt = i.bilanType ?? getBilanType(i.zone ?? '')
                            if (isTreatmentClosed(selectedPatient ?? '', bt as BilanType)) continue
                            zoneMap.set(bt, (zoneMap.get(bt) ?? 0) + 1)
                          }
                          return Array.from(zoneMap.entries()).map(([bt, count]) => ({
                            label: bt === 'generique' && genericCustomLabel ? genericCustomLabel : (ZONE_LABELS_SHORT[bt] ?? bt),
                            count,
                          }))
                        })()}
                        lastConsultation={lastNoteForHero?.dateSeance ?? lastBilanForHero?.dateBilan ?? null}
                        lastConsultationZone={(() => {
                          const lastNote = lastNoteForHero
                          const lastBilan = lastBilanForHero
                          const noteDate = lastNote?.dateSeance ?? ''
                          const bilanDate = lastBilan?.dateBilan ?? ''
                          const lastRecord = noteDate >= bilanDate ? lastNote : lastBilan
                          if (!lastRecord) return null
                          const bt = ('bilanType' in lastRecord ? lastRecord.bilanType : undefined) ?? getBilanType(lastRecord.zone ?? '')
                          return bt === 'generique' && genericCustomLabel ? genericCustomLabel : (ZONE_LABELS_SHORT[bt] ?? bt)
                        })()}
                        onAddConsultation={() => setConsultationChooserOpen(true)}
                      />

                      {/* ── Prescription tracking (hidden for v1 launch) ── */}
                      {false && (() => {
                        const rx = dbPrescriptions.find(p => p.patientKey === selectedPatient)
                        const noteCount = getPatientNotes(selectedPatient ?? '').length
                        const bilanCount = bilans.length
                        const intermCount = getPatientIntermediaires(selectedPatient ?? '').length
                        const anterieures = rx?.seancesAnterieures ?? 0
                        const totalSeances = noteCount + bilanCount + intermCount + anterieures
                        const rxListRaw: import('./types').PrescriptionEntry[] = rx?.prescriptions ?? (rx?.nbSeancesPrescrites ? [{ id: 1, nbSeances: rx!.nbSeancesPrescrites!, datePrescription: rx!.datePrescription ?? '', prescripteur: rx!.prescripteur ?? '' }] : [])
                        // Ne garder que les prescriptions de l'épisode courant (après la dernière clôture)
                        const rxList = rxListRaw.filter(pr => isPrescriptionCurrent(selectedPatient ?? '', pr))
                        const totalPrescribed = rxList.reduce((s, r) => s + r.nbSeances, 0)
                        const overLimit = totalPrescribed > 0 && totalSeances > totalPrescribed

                        // Pool of completed sessions per bilanType (for zone-scoped prescriptions)
                        const poolFor = (bt: BilanType) => {
                          // Ne compter que les records de l'épisode courant (après la dernière clôture)
                          const closureTimes = getClosureTimes(selectedPatient ?? '', bt)
                          const cutoff = closureTimes.length > 0 ? closureTimes[closureTimes.length - 1] : 0
                          const zNotes = getPatientNotes(selectedPatient ?? '').filter(n => (n.bilanType ?? getBilanType(n.zone ?? '')) === bt && n.id > cutoff).length
                          const zBilans = bilans.filter(b => (b.bilanType ?? getBilanType(b.zone ?? '')) === bt && b.id > cutoff).length
                          const zInterms = getPatientIntermediaires(selectedPatient ?? '').filter(i => (i.bilanType ?? getBilanType(i.zone ?? '')) === bt && i.id > cutoff).length
                          return zNotes + zBilans + zInterms
                        }
                        const consumedByBt = new Map<string, number>()
                        const rxProgress = rxList.map(r => {
                          const key = r.bilanType ?? '__global__'
                          const pool = r.bilanType ? poolFor(r.bilanType) : totalSeances
                          const consumed = consumedByBt.get(key) ?? 0
                          const start = consumed
                          const done = Math.min(r.nbSeances, Math.max(0, pool - consumed))
                          consumedByBt.set(key, consumed + r.nbSeances)
                          return { ...r, done, start }
                        })

                        // Sessions hors prescription (only relevant si aucune prescription globale)
                        const hasGlobalRx = rxList.some(r => !r.bilanType)
                        const coveredBts = new Set<string>(rxList.map(r => r.bilanType).filter((x): x is BilanType => !!x))
                        const orphanSessions = hasGlobalRx
                          ? []
                          : (() => {
                              const out: { kind: 'bilan' | 'note' | 'interm'; bilanType: BilanType; date: string }[] = []
                              bilans.forEach(b => {
                                const bt = b.bilanType ?? getBilanType(b.zone ?? '')
                                if (!coveredBts.has(bt)) out.push({ kind: 'bilan', bilanType: bt, date: b.dateBilan ?? '' })
                              })
                              getPatientNotes(selectedPatient ?? '').forEach(n => {
                                const bt = n.bilanType ?? getBilanType(n.zone ?? '')
                                if (!coveredBts.has(bt)) out.push({ kind: 'note', bilanType: bt, date: n.dateSeance ?? '' })
                              })
                              getPatientIntermediaires(selectedPatient ?? '').forEach(i => {
                                const bt = i.bilanType ?? getBilanType(i.zone ?? '')
                                if (!coveredBts.has(bt)) out.push({ kind: 'interm', bilanType: bt, date: i.dateBilan ?? '' })
                              })
                              return out
                            })()

                        const saveRx = (activePrescriptions: import('./types').PrescriptionEntry[], seancesAnt?: number) => {
                          // Préserver les prescriptions des épisodes antérieurs (avant la dernière clôture) —
                          // elles ne sont pas visibles dans rxList mais doivent rester en base pour l'historique.
                          const archived = rxListRaw.filter(pr => !isPrescriptionCurrent(selectedPatient ?? '', pr))
                          const prescriptions = [...archived, ...activePrescriptions]
                          setDbPrescriptions(prev => {
                            const idx = prev.findIndex(p => p.patientKey === selectedPatient)
                            const base = idx >= 0 ? prev[idx] : { patientKey: selectedPatient ?? '', prescriptions: [] }
                            const updated = { ...base, prescriptions, ...(seancesAnt !== undefined ? { seancesAnterieures: seancesAnt } : {}) }
                            return idx >= 0 ? prev.map((p, i) => i === idx ? updated : p) : [...prev, updated]
                          })
                        }

                        return (
                          <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {`${totalSeances} séance${totalSeances > 1 ? 's' : ''}`}
                                {orphanSessions.length > 0 && (
                                  <span
                                    onClick={() => setOrphanPopupOpen(true)}
                                    title="Voir les séances hors prescription"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', fontWeight: 700, color: '#d97706', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 999, padding: '2px 7px', cursor: 'pointer' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                    {orphanSessions.length} hors prescription
                                  </span>
                                )}
                                {overLimit && (
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                  </svg>
                                )}
                              </span>
                              <button type="button" onClick={() => {
                                setRxEditForm({ nbSeances: '', prescripteur: rxList[rxList.length - 1]?.prescripteur ?? '', datePrescription: new Date().toLocaleDateString('fr-FR'), seancesAnterieures: String(anterieures), bilanType: '', customLabel: '' })
                                setRxEditDoc(null)
                                setRxEditPopup({ mode: 'add' })
                              }} style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                + Prescription
                              </button>
                            </div>

                            {rxList.length > 0 && (() => {
                              // Group by bilanType: 2 ordonnances for the same zone merge into one combined bar
                              const groupOrder: string[] = []
                              const groupsMap = new Map<string, typeof rxProgress>()
                              rxProgress.forEach(r => {
                                const key = r.bilanType ?? '__global__'
                                if (!groupsMap.has(key)) { groupsMap.set(key, []); groupOrder.push(key) }
                                groupsMap.get(key)!.push(r)
                              })
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {groupOrder.map(key => {
                                    const entries = groupsMap.get(key)!
                                    const combinedDone = entries.reduce((s, e) => s + e.done, 0)
                                    const combinedTotal = entries.reduce((s, e) => s + e.nbSeances, 0)
                                    const pct = combinedTotal > 0 ? Math.min(100, Math.round((combinedDone / combinedTotal) * 100)) : 0
                                    const latest = entries[entries.length - 1]
                                    const defaultZoneLabel = key === '__global__' ? 'Prescription' : (ZONE_LABELS_SHORT[key] ?? key)
                                    const label = key === 'generique' && latest.customLabel ? latest.customLabel : defaultZoneLabel
                                    const hasMultiple = entries.length > 1
                                    const anyDoc = entries.find(e => e.document)
                                    return (
                                      <div key={key} style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                          if (entries.length === 1) {
                                            const r = entries[0]
                                            setRxEditForm({ nbSeances: String(r.nbSeances), prescripteur: r.prescripteur, datePrescription: r.datePrescription, seancesAnterieures: String(anterieures), bilanType: r.bilanType ?? '', customLabel: r.customLabel ?? '' })
                                            setRxEditDoc(r.document ?? null)
                                            setRxEditPopup({ mode: 'edit', entry: r })
                                          } else {
                                            setRxGroupPicker(entries)
                                          }
                                        }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                            {label} — {combinedDone}/{combinedTotal}
                                            {latest.prescripteur ? ` · Dr ${latest.prescripteur}` : ''}
                                            {hasMultiple && <span style={{ marginLeft: 4, fontWeight: 700, color: 'var(--primary)' }}>· {entries.length} ord.</span>}
                                          </span>
                                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                                            {latest.datePrescription}
                                            {anyDoc && (
                                              <button type="button" onClick={e => { e.stopPropagation(); setRxDocViewer(anyDoc.document!) }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, display: 'flex', alignItems: 'center' }}
                                                title="Voir l'ordonnance">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                              </button>
                                            )}
                                          </span>
                                        </div>
                                        <div style={{ height: 4, background: 'var(--secondary)', borderRadius: 2, overflow: 'hidden' }}>
                                          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#16a34a' : pct >= 67 ? '#f59e0b' : 'var(--primary)', borderRadius: 2, transition: 'width 0.3s' }} />
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )
                            })()}

                            {/* Popup prescription */}
                            {rxEditPopup && (
                              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                                onClick={() => setRxEditPopup(null)}>
                                <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', width: '100%', maxWidth: 340, boxShadow: 'var(--shadow-2xl)' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)', marginBottom: 12 }}>
                                    {rxEditPopup!.mode === 'add' ? 'Nouvelle prescription' : 'Modifier la prescription'}
                                  </div>

                                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Nombre de séances</label>
                                  <input type="number" min="1" value={rxEditForm.nbSeances} onChange={e => setRxEditForm(f => ({ ...f, nbSeances: e.target.value }))}
                                    placeholder="9" style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 10, boxSizing: 'border-box', background: 'var(--secondary)' }} />

                                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Traitement concerné</label>
                                  <select value={rxEditForm.bilanType} onChange={e => setRxEditForm(f => ({ ...f, bilanType: e.target.value as BilanType | '' }))}
                                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 10, boxSizing: 'border-box', background: 'var(--secondary)' }}>
                                    <option value="">Toutes zones (global)</option>
                                    {(Object.keys(ZONE_LABELS_SHORT) as BilanType[]).map(bt => (
                                      <option key={bt} value={bt}>{ZONE_LABELS_SHORT[bt]}</option>
                                    ))}
                                  </select>

                                  {rxEditForm.bilanType === 'generique' && (
                                    <>
                                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Nom du traitement</label>
                                      <input value={rxEditForm.customLabel} onChange={e => setRxEditForm(f => ({ ...f, customLabel: e.target.value }))}
                                        placeholder="Ex : ATM, poignet, coude…" style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 10, boxSizing: 'border-box', background: 'var(--secondary)' }} />
                                    </>
                                  )}

                                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Prescripteur</label>
                                  <input value={rxEditForm.prescripteur} onChange={e => setRxEditForm(f => ({ ...f, prescripteur: e.target.value }))}
                                    placeholder="Dr Dupont" style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 10, boxSizing: 'border-box', background: 'var(--secondary)' }} />

                                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Date de prescription</label>
                                  <input value={rxEditForm.datePrescription} onChange={e => setRxEditForm(f => ({ ...f, datePrescription: e.target.value }))}
                                    placeholder="12/04/2026" style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 10, boxSizing: 'border-box', background: 'var(--secondary)' }} />

                                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Séances déjà effectuées</label>
                                  <input type="number" min="0" value={rxEditForm.seancesAnterieures} onChange={e => setRxEditForm(f => ({ ...f, seancesAnterieures: e.target.value }))}
                                    placeholder="0" style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.88rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginBottom: 10, boxSizing: 'border-box', background: 'var(--secondary)' }} />

                                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Ordonnance</label>
                                  {rxEditDoc ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 10px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 'var(--radius-md)' }}>
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                      <span style={{ flex: 1, fontSize: '0.78rem', color: '#15803d', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rxEditDoc!.name}</span>
                                      <button type="button" onClick={() => setRxDocViewer(rxEditDoc)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                      </button>
                                      <button type="button" onClick={() => setRxEditDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                                      {[
                                        { label: 'Photo', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>, accept: 'image/*', capture: 'environment' as const },
                                        { label: 'Galerie', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>, accept: 'image/*', capture: undefined },
                                        { label: 'Fichier', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, accept: 'image/*,application/pdf', capture: undefined },
                                      ].map(opt => (
                                        <label key={opt.label} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 4px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--secondary)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                                          {opt.icon}
                                          {opt.label}
                                          <input type="file" accept={opt.accept} capture={opt.capture} hidden onChange={e => {
                                            const file = e.target.files?.[0]
                                            if (!file) return
                                            const reader = new FileReader()
                                            reader.onload = () => {
                                              const dataUrl = reader.result as string
                                              if (file.type.startsWith('image/')) {
                                                setRxMaskingItem({ dataUrl, name: file.name, mimeType: file.type })
                                              } else {
                                                const base64 = dataUrl.split(',')[1]
                                                setRxEditDoc({ data: base64, mimeType: file.type, name: file.name })
                                              }
                                            }
                                            reader.readAsDataURL(file)
                                            e.target.value = ''
                                          }} />
                                        </label>
                                      ))}
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => {
                                      const nb = parseInt(rxEditForm.nbSeances, 10)
                                      if (isNaN(nb) || nb <= 0) { showToast('Nombre de séances invalide', 'error'); return }
                                      const ant = parseInt(rxEditForm.seancesAnterieures, 10) || 0
                                      const bt = rxEditForm.bilanType || undefined
                                      const cl = bt === 'generique' ? (rxEditForm.customLabel.trim() || undefined) : undefined
                                      if (rxEditPopup!.mode === 'add') {
                                        const newEntry: import('./types').PrescriptionEntry = { id: Date.now(), nbSeances: nb, prescripteur: rxEditForm.prescripteur.trim(), datePrescription: rxEditForm.datePrescription, ...(rxEditDoc ? { document: rxEditDoc } : {}), ...(bt ? { bilanType: bt } : {}), ...(cl ? { customLabel: cl } : {}) }
                                        // Propager le customLabel à TOUTES les prescriptions générique du patient (un seul label par patient pour cette zone)
                                        const nextList = cl
                                          ? [...rxList.map(pr => pr.bilanType === 'generique' ? { ...pr, customLabel: cl } : pr), newEntry]
                                          : [...rxList, newEntry]
                                        saveRx(nextList, ant)
                                      } else if (rxEditPopup!.entry) {
                                        saveRx(rxList.map(pr => {
                                          if (pr.id === rxEditPopup!.entry!.id) {
                                            return { ...pr, nbSeances: nb, prescripteur: rxEditForm.prescripteur.trim(), datePrescription: rxEditForm.datePrescription, document: rxEditDoc ?? undefined, bilanType: bt, customLabel: cl }
                                          }
                                          // Synchroniser le customLabel sur les autres prescriptions générique
                                          if (bt === 'generique' && pr.bilanType === 'generique') {
                                            return { ...pr, customLabel: cl }
                                          }
                                          return pr
                                        }), ant)
                                      }
                                      setRxEditPopup(null)
                                    }} style={{ flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                      {rxEditPopup!.mode === 'add' ? 'Ajouter' : 'Enregistrer'}
                                    </button>
                                    {rxEditPopup!.mode === 'edit' && (
                                      <button onClick={() => {
                                        const ant = parseInt(rxEditForm.seancesAnterieures, 10) || 0
                                        saveRx(rxList.filter(pr => pr.id !== rxEditPopup!.entry!.id), ant)
                                        setRxEditPopup(null)
                                      }} style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                        Supprimer
                                      </button>
                                    )}
                                    <button onClick={() => setRxEditPopup(null)}
                                      style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                      Annuler
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Popup séances hors prescription */}
                            {orphanPopupOpen && (
                              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                                onClick={() => setOrphanPopupOpen(false)}>
                                <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', width: '100%', maxWidth: 360, boxShadow: 'var(--shadow-2xl)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)' }}>Séances hors prescription</div>
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                                    Ces séances ne sont rattachées à aucune prescription. Ajoute une prescription pour la zone concernée.
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '40vh', overflowY: 'auto', marginBottom: 12 }}>
                                    {orphanSessions.map((o, i) => (
                                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.55rem 0.7rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 'var(--radius-md)' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 56 }}>
                                          {o.kind === 'bilan' ? 'Bilan' : o.kind === 'interm' ? 'Interm.' : 'Séance'}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{o.bilanType === 'generique' && rxList.find(pr => pr.bilanType === 'generique')?.customLabel ? rxList.find(pr => pr.bilanType === 'generique')!.customLabel : (ZONE_LABELS_SHORT[o.bilanType] ?? o.bilanType)}</div>
                                          {o.date && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{o.date.includes('-') ? o.date.split('-').reverse().join('/') : o.date}</div>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => {
                                      const firstBt = orphanSessions[0]?.bilanType
                                      setOrphanPopupOpen(false)
                                      setRxEditForm({ nbSeances: '', prescripteur: rxList[rxList.length - 1]?.prescripteur ?? '', datePrescription: new Date().toLocaleDateString('fr-FR'), seancesAnterieures: String(anterieures), bilanType: firstBt ?? '', customLabel: '' })
                                      setRxEditDoc(null)
                                      setRxEditPopup({ mode: 'add' })
                                    }} style={{ flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                      Ajouter une prescription
                                    </button>
                                    <button onClick={() => setOrphanPopupOpen(false)}
                                      style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                      Fermer
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Popup choix d'ordonnance dans un groupe */}
                            {rxGroupPicker && (
                              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                                onClick={() => setRxGroupPicker(null)}>
                                <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', width: '100%', maxWidth: 340, boxShadow: 'var(--shadow-2xl)' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)', marginBottom: 4 }}>
                                    {rxGroupPicker![0].bilanType === 'generique' && rxGroupPicker![0].customLabel ? rxGroupPicker![0].customLabel : (rxGroupPicker![0].bilanType ? (ZONE_LABELS_SHORT[rxGroupPicker![0].bilanType!] ?? rxGroupPicker![0].bilanType) : 'Prescription')}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                                    {rxGroupPicker!.length} ordonnance{rxGroupPicker!.length > 1 ? 's' : ''} — sélectionne celle à modifier
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                                    {rxGroupPicker!.map((r, i) => (
                                      <button key={r.id} type="button" onClick={() => {
                                        setRxEditForm({ nbSeances: String(r.nbSeances), prescripteur: r.prescripteur, datePrescription: r.datePrescription, seancesAnterieures: String(anterieures), bilanType: r.bilanType ?? '', customLabel: r.customLabel ?? '' })
                                        setRxEditDoc(r.document ?? null)
                                        setRxGroupPicker(null)
                                        setRxEditPopup({ mode: 'edit', entry: r })
                                      }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 0.85rem', background: 'var(--secondary)', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left' }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.78rem', flexShrink: 0 }}>{i + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                            {r.done}/{r.nbSeances} séances
                                          </div>
                                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                            {r.datePrescription}{r.prescripteur ? ` · Dr ${r.prescripteur}` : ''}
                                          </div>
                                        </div>
                                        {r.document && (
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                  <button onClick={() => setRxGroupPicker(null)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                    Fermer
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Viewer ordonnance */}
                            {rxDocViewer && (
                              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                                onClick={() => setRxDocViewer(null)}>
                                <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '1rem', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-2xl)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary-dark)' }}>Ordonnance</span>
                                    <button onClick={() => setRxDocViewer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                  </div>
                                  {rxDocViewer!.mimeType === 'application/pdf' ? (
                                    <iframe src={`data:application/pdf;base64,${rxDocViewer!.data}`} style={{ width: '80vw', height: '75vh', border: 'none', borderRadius: 8 }} />
                                  ) : (
                                    <img src={`data:${rxDocViewer!.mimeType};base64,${rxDocViewer!.data}`} alt="Ordonnance" style={{ maxWidth: '80vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }} />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* ── Banner sans bilan ────────────────── */}
                      {bilans.length === 0 && (
                        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 'var(--radius-lg)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', color: '#92400e' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          <span>Aucun bilan initial — vous pouvez en créer un à tout moment via le bouton ci-dessous.</span>
                        </div>
                      )}

                      {/* ── Objectifs SMART ────────────────── */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>OBJECTIFS SMART</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                        </div>
                        <SmartObjectifs objectifs={dbObjectifs} patientKey={selectedPatient ?? ''} onUpdate={setDbObjectifs} maxObjectifs={zonesForPicker.length} />
                      </div>

                      {/* Amélioration globale supprimée — pourcentage intégré dans le graphique */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingBottom: '5rem' }}>
                        {(() => {
                          const ZONE_SECTION_LABELS: Record<string, string> = {
                            epaule: 'Épaule',
                            cheville: 'Cheville',
                            genou: 'Genou',
                            hanche: 'Hanche',
                            cervical: 'Rachis Cervical',
                            lombaire: 'Rachis Lombaire',
                            generique: 'Autres bilans',
                            geriatrique: 'Gériatrie',
                          }
                          const groupMap = new Map<string, typeof bilans>()
                          bilans.forEach(record => {
                            const key = record.bilanType ?? getBilanType(record.zone ?? '')
                            if (!groupMap.has(key)) groupMap.set(key, [])
                            groupMap.get(key)!.push(record)
                          })
                          // Zones qui n'ont pas de bilan initial mais ont des intermédiaires ou des séances :
                          // créer un groupe vide pour qu'elles apparaissent dans le rendu zone-scoped (avec boutons).
                          getPatientIntermediaires(selectedPatient ?? '').forEach(r => {
                            const key = r.bilanType ?? getBilanType(r.zone ?? '')
                            if (!groupMap.has(key)) groupMap.set(key, [])
                          })
                          getPatientNotes(selectedPatient ?? '').forEach(n => {
                            const key = n.bilanType ?? getBilanType(n.zone ?? '')
                            if (!groupMap.has(key)) groupMap.set(key, [])
                          })
                          // Zones créées depuis une prescription (même sans bilan/séance) : section vide.
                          // Inclut les zones clôturées avec seulement des prescriptions archivées
                          // (pour afficher la barre verte "Prescription clôturée" sans avoir besoin d'un bilan).
                          ;(dbPrescriptions.find(p => p.patientKey === selectedPatient)?.prescriptions ?? []).forEach(pr => {
                            if (pr.bilanType && !groupMap.has(pr.bilanType)) {
                              groupMap.set(pr.bilanType, [])
                            }
                          })
                          const groups = Array.from(groupMap.entries())
                          const showSections = groups.length > 1
                          // Expansion en (zoneType × épisode) — chaque épisode rend sa propre carte.
                          // Une PEC clôturée puis reprise (nouvelle ordo) donne 2 cartes distinctes :
                          // une verte "PEC terminée" (ancien épisode) + une active (nouvel épisode).
                          type ZoneEp = { zoneType: BilanType; zoneBilansAll: BilanRecord[]; episode: TreatmentEpisode; totalEpisodes: number }
                          const zoneEps: ZoneEp[] = groups.flatMap(([zoneType, zoneBilansAll]) => {
                            const eps = getTreatmentEpisodes(selectedPatient ?? '', zoneType as BilanType)
                            if (eps.length === 0) return [{ zoneType: zoneType as BilanType, zoneBilansAll, episode: { idx: 0, startExclusive: Number.NEGATIVE_INFINITY, endInclusive: Number.POSITIVE_INFINITY, isActive: true } as TreatmentEpisode, totalEpisodes: 1 }]
                            return eps.map(ep => ({ zoneType: zoneType as BilanType, zoneBilansAll, episode: ep, totalEpisodes: eps.length }))
                          })
                          zoneEps.sort((a, b) => (a.episode.isActive === b.episode.isActive ? 0 : a.episode.isActive ? -1 : 1))
                          return zoneEps.map(({ zoneType, zoneBilansAll, episode, totalEpisodes }) => {
                            const inEp = (id: number) => id > episode.startExclusive && id <= episode.endInclusive
                            const zoneBilans = zoneBilansAll.filter(b => inEp(b.id))
                            // ── Graphique d'évolution EVN/EVA pour cette zone ──
                            const evolutionPoints: EvolutionPoint[] = (() => {
                              const pts: EvolutionPoint[] = []
                              // 1) Bilans initiaux
                              for (const b of zoneBilans) {
                                // evn peut être number, string-number, ou absent
                                // Cascade : evn direct → douleur.evnPire → douleur.evnMoy → douleur.evnMvt → douleur.evnRepos → douleur.evnMieux
                                const directEvn = b.evn != null ? parseFloat(String(b.evn)) : NaN
                                const d = b.bilanData?.douleur as Record<string, unknown> | undefined
                                const tryParse = (...keys: string[]) => {
                                  for (const k of keys) {
                                    const v = parseFloat(String(d?.[k] ?? ''))
                                    if (!isNaN(v)) return v
                                  }
                                  return NaN
                                }
                                const fallbackEvn = tryParse('evnPire', 'evnMoy', 'evnMvt', 'evnRepos', 'evnMieux')
                                const evnNum = !isNaN(directEvn) ? directEvn : (!isNaN(fallbackEvn) ? fallbackEvn : null)
                                if (evnNum == null) continue
                                pts.push({
                                  date: b.dateBilan,
                                  value: evnNum,
                                  kind: 'bilan',
                                  label: `Bilan initial · ${b.dateBilan}`,
                                })
                              }
                              // 2) Intermédiaires de cette zone (épisode courant)
                              const zoneInters = getPatientIntermediaires(selectedPatient ?? '')
                                .filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType && inEp(r.id))
                              for (const r of zoneInters) {
                                const tc = (r.data?.troncCommun as Record<string, unknown>) ?? {}
                                const evnObj = (tc.evn as Record<string, unknown>) ?? {}
                                const v = parseFloat(String(evnObj.pireActuel ?? evnObj.moyActuel ?? ''))
                                if (isNaN(v)) continue
                                pts.push({
                                  date: r.dateBilan,
                                  value: v,
                                  kind: 'intermediaire',
                                  label: `Bilan intermédiaire · ${r.dateBilan}`,
                                })
                              }
                              // 3) Notes de séance de cette zone (épisode courant)
                              const zoneNotes = dbNotes
                                .filter(n => n.patientKey === selectedPatient && (n.bilanType ?? getBilanType(n.zone ?? '')) === zoneType && inEp(n.id))
                              for (const n of zoneNotes) {
                                const v = parseFloat(String(n.data.eva ?? ''))
                                if (isNaN(v)) continue
                                pts.push({
                                  date: n.dateSeance,
                                  value: v,
                                  kind: 'note',
                                  label: `Séance n°${n.numSeance} · ${n.dateSeance}`,
                                })
                              }
                              return pts
                            })()
                            const zoneClosed = !episode.isActive
                            // Épisodes clôturés : repliés par défaut, mais dépliables via tap sur le header.
                            // Épisodes actifs : dépliés par défaut, repliables via tap.
                            const closedEpKey = episode.closure ? `${selectedPatient ?? ''}::${zoneType}::${episode.closure.id}` : ''
                            const zoneCollapsed = zoneClosed
                              ? !expandedClosedEpisodes.has(closedEpKey)
                              : isZoneCollapsed(selectedPatient ?? '', zoneType as BilanType)
                            const toggleThisEpisode = () => {
                              if (zoneClosed) {
                                setExpandedClosedEpisodes(prev => {
                                  const next = new Set(prev)
                                  if (next.has(closedEpKey)) next.delete(closedEpKey); else next.add(closedEpKey)
                                  return next
                                })
                              } else {
                                toggleZoneCollapsed(selectedPatient ?? '', zoneType as BilanType)
                              }
                            }
                            const zoneIntermCount = getPatientIntermediaires(selectedPatient ?? '').filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType && inEp(r.id)).length
                            const zoneNotesCount = getPatientNotes(selectedPatient ?? '').filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType && inEp(r.id)).length
                            // Prescriptions de CET épisode uniquement (id dans la fenêtre)
                            const rxListForZone = (dbPrescriptions.find(p => p.patientKey === selectedPatient)?.prescriptions ?? []).filter(pr => pr.bilanType === zoneType && inEp(pr.id))
                            // Le libellé "ATM"/custom vient d'une prescription de l'épisode
                            const rxForZone = rxListForZone[0]
                            const customZoneLabel = zoneType === 'generique' ? rxForZone?.customLabel : undefined
                            const zoneLabel = customZoneLabel ?? (ZONE_SECTION_LABELS[zoneType] ?? zoneType)
                            const closure = episode.closure
                            // Pool de l'épisode = tous les records de l'épisode (pas seulement ≤ closure, puisqu'ils sont déjà filtrés)
                            const zonePoolSize = zoneBilans.length + zoneIntermCount + zoneNotesCount
                            let consumedZone = 0
                            const rxZoneProgress = rxListForZone.map(r => {
                              const done = Math.min(r.nbSeances, Math.max(0, zonePoolSize - consumedZone))
                              consumedZone += r.nbSeances
                              return { ...r, done }
                            })
                            const zoneTotalDone = rxZoneProgress.reduce((s, r) => s + r.done, 0)
                            const zoneTotalPrescribed = rxZoneProgress.reduce((s, r) => s + r.nbSeances, 0)
                            const latestRxForZone = rxListForZone[rxListForZone.length - 1]
                            const isZoneEmpty = zoneBilans.length === 0 && zoneNotesCount === 0 && zoneIntermCount === 0
                            // Suffixe d'épisode quand plusieurs épisodes coexistent pour une même zone
                            const episodeSuffix = totalEpisodes > 1 ? ` · Épisode ${episode.idx + 1}` : ''
                            return (
                            <div key={`${zoneType}-ep${episode.idx}`} style={{ marginTop: '0.75rem' }}>
                            <SwipeToDelete
                              disabled={!zoneClosed}
                              onDelete={() => {
                                if (confirm(`Supprimer définitivement cet épisode clôturé de ${zoneLabel} ? Tous les bilans, séances, interm. et ordonnances de cet épisode seront perdus.`)) {
                                  deleteClosedEpisode(selectedPatient ?? '', zoneType as BilanType, episode)
                                }
                              }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.5rem 0.75rem 0.85rem', borderRadius: 12, border: `1px solid ${zoneClosed ? c.borderSoft : `${c.primary}18`}`, background: zoneClosed ? '#f4f6f8' : 'var(--input-bg)', boxShadow: zoneClosed ? 'none' : '0 1px 6px rgba(0,0,0,0.05)' }}>
                              <div
                                onClick={toggleThisEpisode}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.4rem 0 0.4rem', cursor: 'pointer', userSelect: 'none' }}>
                                <div style={{ width: 26, height: 26, borderRadius: 7, background: zoneClosed ? c.surfaceMuted : 'var(--secondary)', color: zoneClosed ? c.textFaint : c.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {zoneClosed ? (
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                  ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6m11-11h-6M7 12H1"/></svg>
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: c.text, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {zoneLabel}{episodeSuffix && <span style={{ fontWeight: 500, color: c.textMuted, fontSize: '0.78rem' }}>{episodeSuffix}</span>}
                                    {zoneClosed && (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0.15rem 0.5rem', borderRadius: 9999, background: c.successBg, color: c.success, fontSize: '0.68rem', fontWeight: 700 }}>
                                        PEC terminée
                                      </span>
                                    )}
                                    {zoneClosed && (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation()
                                          if (confirm(`Reprendre la prise en charge ${zoneLabel} ? L'épisode sera rouvert avec tout son historique.`)) {
                                            reopenTreatment(selectedPatient ?? '', zoneType as BilanType, episode)
                                          }
                                        }}
                                        style={{ padding: '0.15rem 0.55rem', borderRadius: 9999, background: c.infoSoft, border: `1px solid ${c.infoBg}`, color: c.primaryLight, fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
                                      >
                                        Reprendre
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: c.textMuted, marginTop: 2, display: 'flex', gap: 12 }}>
                                    {zoneBilans.length > 0 && <span>{zoneBilans.length} bilan{zoneBilans.length > 1 ? 's' : ''}</span>}
                                    {zoneNotesCount > 0 && <span>{zoneNotesCount} séance{zoneNotesCount > 1 ? 's' : ''}</span>}
                                    {zoneIntermCount > 0 && <span>{zoneIntermCount} interm.</span>}
                                    {zoneBilans.length === 0 && zoneNotesCount === 0 && zoneIntermCount === 0 && <span>Aucune activité</span>}
                                  </div>
                                </div>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: zoneCollapsed ? 'rotate(0)' : 'rotate(180deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
                                  <polyline points="6 9 12 15 18 9"/>
                                </svg>
                              </div>
                              {zoneClosed && zoneTotalPrescribed > 0 && (
                                <div style={{ padding: '0.55rem 0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', margin: '0.2rem 0' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                      Prescription clôturée — {zoneTotalDone}/{zoneTotalPrescribed}
                                      {latestRxForZone?.prescripteur ? ` · Dr ${latestRxForZone.prescripteur}` : ''}
                                    </span>
                                    <span style={{ fontSize: '0.62rem', color: '#166534' }}>{latestRxForZone?.datePrescription}</span>
                                  </div>
                                  <div style={{ height: 4, background: '#dcfce7', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${zoneTotalPrescribed > 0 ? Math.min(100, Math.round((zoneTotalDone / zoneTotalPrescribed) * 100)) : 0}%`, background: '#16a34a', borderRadius: 2 }} />
                                  </div>
                                </div>
                              )}
                              {zoneClosed && closure && (
                                <div style={{ fontSize: '0.72rem', color: '#166534', padding: '0 0.4rem', fontStyle: 'italic' }}>
                                  Clôturée le {new Date(closure.closedAt).toLocaleDateString('fr-FR')} — cette PEC est ignorée par les analyses IA des autres zones (résumée en antécédent seulement).
                                </div>
                              )}
                              {!zoneCollapsed && (<>
                              {(() => {
                                const initialBodyChart = (zoneBilans[0]?.bilanData?.douleur as Record<string, unknown> | undefined)?.bodyChart as string | undefined
                                return initialBodyChart ? <TreatmentBodyChart drawing={initialBodyChart} /> : null
                              })()}
                              <EvolutionChart
                                points={evolutionPoints}
                                title={`Évolution EVN — ${zoneLabel}`}
                                improvementPct={(() => {
                                  if (evolutionPoints.length < 2) return null
                                  const first = evolutionPoints[0].value
                                  const last = evolutionPoints[evolutionPoints.length - 1].value
                                  if (first === 0) return null
                                  return Math.round(((first - last) / first) * 100)
                                })()}
                              />
                              <ScoreEvolutionChart
                                bilans={zoneBilans}
                                intermediaires={dbIntermediaires.filter(r => r.patientKey === selectedPatient && (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType && inEp(r.id))}
                              />
                              {zoneBilans.map((record, index) => {
                          const prevEvn = index > 0 ? zoneBilans[index - 1].evn : null
                          const currEvn = record.evn
                          const delta   = (prevEvn != null && currEvn != null) ? improvDelta(prevEvn, currEvn) : null
                          const dColor  = delta === null ? '' : delta > 0 ? '#166534' : delta < 0 ? '#881337' : '#94a3b8'

                          const incomplet = record.status === 'incomplet'
                          const bilanKey = `bilan-${record.id}`
                          const bilanOpen = openTimelineKey === bilanKey
                          return (
                            <div key={record.id} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: `1.5px solid ${bilanOpen ? 'var(--border-soft)' : 'var(--info-bg)'}`, boxShadow: bilanOpen ? 'var(--shadow-sm)' : 'none', overflow: 'hidden' }}>
                              <div
                                role="button"
                                onClick={() => toggleTimeline(bilanKey)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '0.55rem 0.9rem', cursor: 'pointer' }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.88rem', lineHeight: 1.35 }}>
                                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Bilan n°{index + 1}</span>
                                    {editingLabelBilanId === record.id ? (
                                      <input
                                        autoFocus
                                        value={labelDraft}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => setLabelDraft(e.target.value)}
                                        onBlur={() => {
                                          const trimmed = labelDraft.trim()
                                          setDb(prev => prev.map(r => r.id === record.id ? { ...r, customLabel: trimmed || undefined } : r))
                                          setEditingLabelBilanId(null)
                                        }}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') { (e.target as HTMLInputElement).blur() }
                                          if (e.key === 'Escape') { setEditingLabelBilanId(null) }
                                        }}
                                        placeholder="Ex : tendinopathie coiffe des rotateurs"
                                        style={{ display: 'inline', marginLeft: 4, fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-main)', padding: '2px 6px', border: '1.5px solid var(--primary)', borderRadius: 6, outline: 'none', background: 'var(--surface)', width: 'calc(100% - 90px)' }}
                                      />
                                    ) : (
                                      <span
                                        onClick={e => { e.stopPropagation(); setEditingLabelBilanId(record.id); setLabelDraft(record.customLabel ?? '') }}
                                        title={record.customLabel ? 'Cliquer pour modifier' : 'Cliquer pour ajouter un titre'}
                                        style={{ fontSize: '0.78rem', fontWeight: 500, color: record.customLabel ? 'var(--text-main)' : 'var(--text-muted)', fontStyle: record.customLabel ? 'normal' : 'italic', cursor: 'pointer' }}
                                      >
                                        {record.customLabel ? <>&nbsp;: {record.customLabel}</> : (
                                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 4, verticalAlign: 'middle' }}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            titre
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--primary-light)', marginTop: 1 }}>
                                    {record.dateBilan}{currEvn != null ? ` · EVN ${currEvn}` : ''}{!showSections && record.zone ? ` · ${record.zone}` : ''}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                  {incomplet ? (
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#991b1b' }}>Incomplet</span>
                                  ) : delta !== null ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, fontSize: '0.76rem', color: dColor, letterSpacing: '-0.01em' }}>
                                      {delta > 0 ? (
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                      ) : delta < 0 ? (
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                      ) : (
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                      )}
                                      {Math.abs(delta)}%
                                    </span>
                                  ) : null}
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--info-border-strong)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: bilanOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                              </div>
                              {bilanOpen && (incomplet ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 0.9rem 0.75rem' }}>
                                  <button
                                    style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance }))
                                      setSelectedBodyZone(record.zone ?? null)
                                      setCurrentBilanId(record.id)
                                      setCurrentBilanDataOverride(record.bilanData ?? null)
                                      setBilanNotes(record.notes ?? '')
                                      setSilhouetteData(record.silhouetteData ?? {})
                                      setBilanDocuments(record.documents ?? [])
                                      setBilanZoneBackStep('database')
                                      setStep('bilan_zone')
                                    }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 13 20 8 15 3"/><path d="M4 20v-3a5 5 0 0 1 5-5h11"/></svg>
                                    Reprendre le bilan
                                  </button>
                                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 2 }}>
                                    <button onClick={() => setDeletingBilanId(record.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                      Supprimer
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 0.9rem 0.75rem' }}>
                                  {record.analyseIA && (
                                    <div style={{ marginBottom: 2 }}>
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-full)', background: 'var(--info-soft)', color: 'var(--primary)', border: '1px solid var(--border-soft)' }}>Analysé</span>
                                    </div>
                                  )}
                                  {/* Rangée 1 : Bilan PDF + Analyse */}
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      style={{ flex: 1, padding: '0.6rem 0.5rem', borderRadius: 10, background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.82rem', cursor: exportingRecordId === record.id ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: exportingRecordId === record.id ? 0.75 : 1 }}
                                      onClick={() => exportBilanFromRecord(record)}
                                      disabled={exportingRecordId === record.id}>
                                      {exportingRecordId === record.id ? (
                                        <span className="spinner-sm" />
                                      ) : (
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                        </svg>
                                      )}
                                      Bilan PDF
                                    </button>
                                    <button
                                      style={{ flex: 1, padding: '0.6rem 0.5rem', borderRadius: 10, background: 'var(--info-soft)', border: '1.5px solid var(--border-soft)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance }))
                                        setSelectedBodyZone(record.zone ?? null)
                                        setCurrentBilanId(record.id)
                                        setCurrentAnalyseIA(record.analyseIA ?? null)
                                        setCurrentBilanDataOverride(record.bilanData ?? null)
                                        setBilanDocuments(record.documents ?? [])
                                        setStep('analyse_ia')
                                      }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/><path d="M14.5 3.5C17 4 19 6.5 19 9.5c0 1-.2 2-.6 2.8"/><path d="M9.5 3.5C7 4 5 6.5 5 9.5c0 1 .2 2 .6 2.8"/><path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/><path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/><path d="M9 20v-6"/><path d="M15 20v-6"/><path d="M9 14h6"/>
                                      </svg>
                                      Analyser
                                    </button>
                                  </div>
                                  {/* Rangée 2 : Fiche d'exercices */}
                                  <button
                                    style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance }))
                                      setSelectedBodyZone(record.zone ?? null)
                                      setCurrentBilanId(record.id)
                                      setCurrentAnalyseIA(record.analyseIA ?? null)
                                      setCurrentBilanDataOverride(record.bilanData ?? null)
                                      setFicheBackStep('database')
                                      setStep('fiche_exercice')
                                    }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                    </svg>
                                    Fiche d'exercices
                                  </button>
                                  {/* Rangée 3 : Résumé / Modifier / Supprimer — liens discrets */}
                                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 2 }}>
                                    <button
                                      onClick={() => setResumeBilan({ record, bilanNum: index + 1 })}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                      Résumé
                                    </button>
                                    <button
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance }))
                                        setSelectedBodyZone(record.zone ?? null)
                                        setCurrentBilanId(record.id)
                                        setCurrentBilanDataOverride(record.bilanData ?? null)
                                        setBilanNotes(record.notes ?? '')
                                        setSilhouetteData(record.silhouetteData ?? {})
                                        setBilanDocuments(record.documents ?? [])
                                        setBilanZoneBackStep('database')
                                        setStep('bilan_zone')
                                      }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                      Modifier
                                    </button>
                                    <button onClick={() => setDeletingBilanId(record.id)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                      Supprimer
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                              {(() => {
                                // ── Timeline chronologique (bilans intermédiaires + notes de séance de cet épisode) ──
                                const zoneInters = getPatientIntermediaires(selectedPatient ?? '').filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType && inEp(r.id))
                                const zoneNotes = dbNotes.filter(n => n.patientKey === selectedPatient && (n.bilanType ?? getBilanType(n.zone ?? '')) === zoneType && inEp(n.id)).sort((a, b) => {
                                  const ta = parseFrDate(a.dateSeance), tb = parseFrDate(b.dateSeance)
                                  if (ta !== tb) return ta - tb
                                  return a.id - b.id
                                })
                                if (zoneInters.length === 0 && zoneNotes.length === 0) return null
                                // Index par id pour afficher "Intermédiaire N°X" (position chronologique)
                                const intermIndexById = new Map<number, number>()
                                zoneInters.forEach((r, i) => intermIndexById.set(r.id, i))
                                // Timeline mêlée triée par date croissante
                                type InterItem = { kind: 'interm'; d: number; rec: BilanIntermediaireRecord }
                                type NoteItem = { kind: 'note'; d: number; rec: NoteSeanceRecord }
                                const timeline: Array<InterItem | NoteItem> = [
                                  ...zoneInters.map(r => ({ kind: 'interm' as const, d: parseFrDate(r.dateBilan), rec: r })),
                                  ...zoneNotes.map(n => ({ kind: 'note' as const, d: parseFrDate(n.dateSeance), rec: n })),
                                ].sort((a, b) => a.d - b.d)
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {timeline.map(item => {
                                      if (item.kind === 'note') {
                                        const note = item.rec
                                        const ZONE_LABELS: Record<string, string> = { epaule: 'Épaule', cheville: 'Cheville', genou: 'Genou', hanche: 'Hanche', cervical: 'Cervical', lombaire: 'Lombaire', generique: 'Général', geriatrique: 'Gériatrie' }
                                        const zt = note.bilanType ?? getBilanType(note.zone ?? '')
                                        const noteKey = `note-${note.id}`
                                        const noteOpen = openTimelineKey === noteKey
                                        return (
                                          <div key={`note-${note.id}`} style={{ background: 'var(--surface)', borderRadius: 12, border: `1.5px solid ${noteOpen ? '#ddd6fe' : '#ede9fe'}`, boxShadow: noteOpen ? '0 1px 3px rgba(109,40,217,0.06)' : 'none', overflow: 'hidden' }}>
                                            <div
                                              role="button"
                                              onClick={() => toggleTimeline(noteKey)}
                                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0.55rem 0.75rem', cursor: 'pointer' }}
                                            >
                                              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#5b21b6' }}>Séance n°{note.numSeance}</span>
                                                <span style={{ fontSize: '0.72rem', color: '#6d28d9' }}>{note.dateSeance}</span>
                                              </div>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                                {note.data.eva != null && note.data.eva !== '' && <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', background: '#ede9fe', color: '#6d28d9' }}>EVA {note.data.eva}</span>}
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: noteOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                                              </div>
                                            </div>
                                            {noteOpen && (
                                            <div style={{ padding: '0 0.75rem 0.75rem' }}>
                                            {(note.data.evolution || note.data.tolerance) && (
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                                              {note.data.evolution && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-full)', background: note.data.evolution === 'Amélioré' ? '#dcfce7' : note.data.evolution === 'Aggravé' ? '#fef2f2' : '#f3f4f6', color: note.data.evolution === 'Amélioré' ? '#166534' : note.data.evolution === 'Aggravé' ? '#881337' : '#6b7280' }}>{note.data.evolution}</span>}
                                              {note.data.tolerance && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-full)', background: note.data.tolerance === 'Bien toléré' ? '#dcfce7' : '#fffbeb', color: note.data.tolerance === 'Bien toléré' ? '#166534' : '#d97706' }}>{note.data.tolerance}</span>}
                                            </div>
                                            )}
                                            {(() => {
                                              const hasDetail = note.data.interventions.length > 0 || note.data.detailDosage || note.data.noteSubjective || note.data.toleranceDetail || note.data.prochaineEtape.length > 0 || note.data.notePlan
                                              if (!hasDetail) return null
                                              const isDetailOpen = openNoteDetailIds.has(note.id)
                                              return (
                                                <div style={{ marginBottom: 8 }}>
                                                  <button
                                                    onClick={() => setOpenNoteDetailIds(prev => { const next = new Set(prev); if (next.has(note.id)) next.delete(note.id); else next.add(note.id); return next })}
                                                    style={{ width: '100%', padding: '0.3rem 0.7rem', borderRadius: isDetailOpen ? '8px 8px 0 0' : 8, background: '#f5f3ff', border: '1px solid #ede9fe', color: '#7c3aed', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span>Détails séance</span>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isDetailOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
                                                  </button>
                                                  {isDetailOpen && (
                                                    <div style={{ background: '#f5f3ff', borderRadius: '0 0 8px 8px', padding: '0.55rem 0.7rem', fontSize: '0.75rem', color: '#5b21b6', lineHeight: 1.5, borderTop: '1px solid #ede9fe' }}>
                                                      {note.data.interventions.length > 0 && (<div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Traitement :</span> {note.data.interventions.join(', ')}</div>)}
                                                      {note.data.detailDosage && <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Dosage :</span> {note.data.detailDosage}</div>}
                                                      {note.data.noteSubjective && <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Ressenti :</span> {note.data.noteSubjective}</div>}
                                                      {note.data.toleranceDetail && <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Tolérance :</span> {note.data.toleranceDetail}</div>}
                                                      {note.data.prochaineEtape.length > 0 && (<div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Prochaine étape :</span> {note.data.prochaineEtape.join(', ')}</div>)}
                                                      {note.data.notePlan && <div><span style={{ fontWeight: 700 }}>Note :</span> {note.data.notePlan}</div>}
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })()}
                                            {note.analyseIA && (() => {
                                              const isOpen = openAnalyseNoteIds.has(note.id)
                                              return (
                                                <div style={{ marginBottom: 8 }}>
                                                  <button
                                                    onClick={() => setOpenAnalyseNoteIds(prev => { const next = new Set(prev); if (next.has(note.id)) next.delete(note.id); else next.add(note.id); return next })}
                                                    style={{ width: '100%', padding: '0.4rem 0.7rem', borderRadius: isOpen ? '8px 8px 0 0' : 8, background: 'var(--info-soft)', border: '1px solid var(--border-soft)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <span>Analyse</span>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
                                                  </button>
                                                  {isOpen && (
                                                    <div style={{ background: 'var(--info-soft)', borderRadius: '0 0 8px 8px', padding: '0.55rem 0.7rem', fontSize: '0.75rem', color: 'var(--primary)', lineHeight: 1.5, borderLeft: '3px solid var(--primary-light)', borderTop: 'none' }}>
                                                      <div style={{ marginBottom: 3 }}>{note.analyseIA.resume}</div>
                                                      <div style={{ marginBottom: 3, fontSize: '0.72rem' }}>{note.analyseIA.evolution}</div>
                                                      {note.analyseIA.vigilance.length > 0 && (<div style={{ color: '#dc2626', fontSize: '0.72rem', marginBottom: 3 }}>Vigilance : {note.analyseIA.vigilance.join(' / ')}</div>)}
                                                      <div style={{ fontWeight: 600, fontSize: '0.72rem' }}>Focus : {note.analyseIA.focus}</div>
                                                      {note.analyseIA.conseil && (<div style={{ marginTop: 4, padding: '0.4rem 0.55rem', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', color: '#15803d', fontSize: '0.72rem' }}><span style={{ fontWeight: 700 }}>Conseil :</span> {note.analyseIA.conseil}</div>)}
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            })()}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                              <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                  style={{ flex: 1, padding: '0.5rem 0.5rem', borderRadius: 10, background: 'var(--info-soft)', border: '1.5px solid var(--border-soft)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                                  onClick={async () => {
                                                    if (!apiKey) { showToast('Clé API requise', 'error'); return }
                                                    showToast('Analyse en cours...', 'success')
                                                    try {
                                                      const patKey = note.patientKey
                                                      const allNotes = dbNotes.filter(n => n.patientKey === patKey && (n.bilanType ?? getBilanType(n.zone ?? '')) === zt).sort((a, b) => a.id - b.id)
                                                      const allBilans = db.filter(r => `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim() === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === zt)
                                                      const allInters = dbIntermediaires.filter(r => r.patientKey === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === zt)
                                                      const bilansStr = allBilans.map(b => {
                                                        const d = b.bilanData?.douleur as Record<string, unknown> | undefined
                                                        const sc = b.bilanData?.scores as Record<string, unknown> | undefined
                                                        const lines = [`--- Bilan initial ${b.dateBilan} ---`, `EVN : ${b.evn ?? '?'}/10`]
                                                        if (d?.douleurType) lines.push(`Type douleur : ${d.douleurType} | Évolution : ${d.situation ?? 'N/R'} | Nocturne : ${d.douleurNocturne ?? 'N/R'}`)
                                                        if (sc && Object.keys(sc).length > 0) lines.push(`Scores : ${JSON.stringify(sc)}`)
                                                        if (b.analyseIA) lines.push(`Diagnostic IA : ${b.analyseIA.diagnostic.titre} — ${b.analyseIA.diagnostic.description}`)
                                                        if (b.ficheExercice?.markdown) { const md = b.ficheExercice.markdown; lines.push(`Exercices prescrits : ${md.length > 300 ? md.slice(0, 300) + '...' : md}`) }
                                                        return lines.join('\n')
                                                      }).join('\n\n')
                                                      const intersStr = allInters.map(r => {
                                                        const tc2 = (r.data?.troncCommun as Record<string, unknown>) ?? {}
                                                        const evn2 = (tc2.evn as Record<string, unknown>) ?? {}
                                                        const lines = [`--- Bilan intermédiaire ${r.dateBilan} ---`, `EVN pire : ${evn2.pireActuel ?? '?'}/10 (initial: ${evn2.pireInitial ?? '?'}) | Évolution globale : ${tc2.evolutionGlobale ?? 'N/R'}`]
                                                        if (r.analyseIA) lines.push(`Diagnostic IA : ${r.analyseIA.noteDiagnostique.titre} — ${r.analyseIA.noteDiagnostique.evolution}`)
                                                        if (r.ficheExercice?.markdown) { const md = r.ficheExercice.markdown; lines.push(`Exercices prescrits : ${md.length > 300 ? md.slice(0, 300) + '...' : md}`) }
                                                        return lines.join('\n')
                                                      }).join('\n\n')
                                                      const notesStr = allNotes.map(n => {
                                                        const lines = [`--- Séance n°${n.numSeance} (${n.dateSeance}) ---`,
                                                          `EVA : ${n.data.eva}/10 | Observance : ${n.data.observance} | Tolérance : ${n.data.tolerance}${n.data.toleranceDetail ? ` (${n.data.toleranceDetail})` : ''}`,
                                                          `Évolution : ${n.data.evolution}`,
                                                          `Interventions : ${n.data.interventions.join(', ')}`]
                                                        if (n.data.prochaineEtape?.length) lines.push(`Prochaines étapes : ${n.data.prochaineEtape.join(', ')}`)
                                                        if (n.data.noteSubjective) lines.push(`Ressenti patient : ${n.data.noteSubjective}`)
                                                        if (n.analyseIA) {
                                                          if (n.analyseIA.resume) lines.push(`Analyse : ${n.analyseIA.resume}`)
                                                          if (n.analyseIA.focus) lines.push(`Focus : ${n.analyseIA.focus}`)
                                                          if (n.analyseIA.conseil) lines.push(`Conseil : ${n.analyseIA.conseil}`)
                                                        }
                                                        if (n.ficheExercice?.markdown) { const md = n.ficheExercice.markdown; lines.push(`Exercices prescrits : ${md.length > 300 ? md.slice(0, 300) + '...' : md}`) }
                                                        return lines.join('\n')
                                                      }).join('\n\n')
                                                      const historiqueStr = [bilansStr, intersStr, notesStr].filter(Boolean).join('\n\n')
                                                      const raw = await callClaudeSecure({
                                                        apiKey,
                                                        systemPrompt: 'Tu es un kinésithérapeute expert. Analyse la séance actuelle dans le contexte de tout l\'historique COMPLET du patient (bilans, bilans intermédiaires, séances précédentes, analyses IA, exercices prescrits). Sois concis. Réponds UNIQUEMENT en JSON valide.',
                                                        userPrompt: `HISTORIQUE COMPLET DU PATIENT (${ZONE_LABELS[zt] ?? zt}) :\n${historiqueStr}\n\nSÉANCE ACTUELLE (n°${note.numSeance}) :\nEVA : ${note.data.eva}/10\nÉvolution : ${note.data.evolution}\nObservance : ${note.data.observance}\nInterventions : ${note.data.interventions.join(', ')}\nDosage : ${note.data.detailDosage}\nTolérance : ${note.data.tolerance} ${note.data.toleranceDetail}\nRessenti : ${note.data.noteSubjective}\nProchaine étape : ${note.data.prochaineEtape.join(', ')}\nNote : ${note.data.notePlan}\n\nRéponds en JSON :\n{"resume":"1-2 phrases résumant la séance","evolution":"1 phrase sur la tendance globale de l\'évolution","vigilance":["point de vigilance 1","point 2 si pertinent"],"focus":"1 phrase sur quoi se focaliser à la prochaine séance","conseil":"1-2 phrases de conseil IA basé sur la direction de la symptomatologie et l\'historique — concret et actionnable"}`,
                                                        maxOutputTokens: 2048,
                                                        jsonMode: true,
                                                        patient: { nom: note.nom, prenom: note.prenom, patientKey: note.patientKey },
                                                        category: 'note_seance_mini',
                                                        onAudit: recordAIAudit,
                                                      })
                                                      const parsed = analyseSeanceMiniSchema.parse(JSON.parse(raw))
                                                      const mini = { generatedAt: new Date().toISOString(), resume: stripMd(parsed.resume), evolution: stripMd(parsed.evolution), vigilance: parsed.vigilance.map(stripMd), focus: stripMd(parsed.focus), conseil: stripMd(parsed.conseil ?? '') }
                                                      setDbNotes(prev => prev.map(n => n.id === note.id ? { ...n, analyseIA: mini } : n))
                                                      showToast('Analyse générée', 'success')
                                                    } catch { showToast('Erreur analyse', 'error') }
                                                  }}>
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/><path d="M14.5 3.5C17 4 19 6.5 19 9.5c0 1-.2 2-.6 2.8"/><path d="M9.5 3.5C7 4 5 6.5 5 9.5c0 1 .2 2 .6 2.8"/><path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/><path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/><path d="M9 20v-6"/><path d="M15 20v-6"/><path d="M9 14h6"/>
                                                  </svg>
                                                  {note.analyseIA ? 'Relancer' : 'Analyser'}
                                                </button>
                                                <button
                                                  style={{ flex: 1, padding: '0.5rem 0.5rem', borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                                  onClick={() => {
                                                    setFormData(prev => ({ ...prev, nom: note.nom, prenom: note.prenom, dateNaissance: note.dateNaissance }))
                                                    const patKey = note.patientKey
                                                    const bt = note.bilanType ?? getBilanType(note.zone ?? '')
                                                    const allNotesForZone = dbNotes.filter(n => n.patientKey === patKey && (n.bilanType ?? getBilanType(n.zone ?? '')) === bt).sort((a, b) => a.id - b.id)
                                                    const allBilansForZone = db.filter(r => `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim() === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === bt)
                                                    const allIntersForZone = dbIntermediaires.filter(r => r.patientKey === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === bt)
                                                    const historiqueStr = [
                                                      ...allBilansForZone.map(b => `Bilan initial ${b.dateBilan} — EVN ${b.evn ?? '?'}/10`),
                                                      ...allIntersForZone.map(r => { const tc = (r.data?.troncCommun as Record<string, unknown>)?.evn as Record<string, unknown> ?? {}; return `Bilan intermédiaire ${r.dateBilan} — EVN ${tc.pireActuel ?? '?'}/10` }),
                                                      ...allNotesForZone.map(n => `Séance n°${n.numSeance} ${n.dateSeance} — EVA ${n.data.eva}/10 — ${n.data.evolution} — ${n.data.interventions.join(', ')}`),
                                                    ].join('\n')
                                                    setFicheExerciceContextOverride({
                                                      zone: note.zone ?? '',
                                                      bilanData: {},
                                                      notesLibres: `SÉANCE n°${note.numSeance} du ${note.dateSeance}\nEVA: ${note.data.eva}/10 — ${note.data.evolution}\nInterventions: ${note.data.interventions.join(', ')}\nDosage: ${note.data.detailDosage}\nTolérance: ${note.data.tolerance} ${note.data.toleranceDetail}\nRessenti: ${note.data.noteSubjective}\n\nHistorique complet du patient:\n${historiqueStr}`,
                                                    })
                                                    setFicheExerciceSource({ type: 'note', id: note.id })
                                                    setSelectedBodyZone(note.zone ?? null)
                                                    setFicheBackStep('database')
                                                    setStep('fiche_exercice')
                                                  }}>
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                                  </svg>
                                                  Fiche exercices
                                                </button>
                                              </div>
                                              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 2 }}>
                                                <button
                                                  onClick={() => {
                                                    setFormData(prev => ({ ...prev, nom: note.nom, prenom: note.prenom, dateNaissance: note.dateNaissance }))
                                                    setNoteSeanceZone(note.zone ?? null)
                                                    setCurrentNoteSeanceId(note.id)
                                                    setCurrentNoteSeanceData(note.data)
                                                    setStep('note_seance')
                                                  }}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                  Modifier
                                                </button>
                                                <button onClick={() => setDeletingNoteSeanceId(note.id)}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                                  Supprimer
                                                </button>
                                              </div>
                                            </div>
                                            </div>
                                            )}
                                          </div>
                                        )
                                      }
                                      // kind === 'interm'
                                      const rec = item.rec
                                      const idx = intermIndexById.get(rec.id) ?? 0
                                      return (() => {
                                      // Score d'amélioration : EVN pireActuel vs pireInitial dans troncCommun
                                      const tc = (rec.data?.troncCommun as Record<string, unknown>) ?? {}
                                      const evnInter = (tc.evn as Record<string, unknown>) ?? {}
                                      const evnActNum  = parseFloat(String(evnInter.pireActuel  ?? ''))
                                      const evnInitNum = parseFloat(String(evnInter.pireInitial ?? ''))
                                      // Fallback : comparer avec EVN du premier bilan initial de la zone
                                      const firstInitial = zoneBilans.find(b => b.evn != null)
                                      const baseEvn = !isNaN(evnInitNum) ? evnInitNum : (firstInitial?.evn ?? null)
                                      const score = (!isNaN(evnActNum) && baseEvn != null && baseEvn > 0)
                                        ? improvDelta(baseEvn, evnActNum) : null
                                      const sColor = score === null ? '#94a3b8' : score > 0 ? '#166534' : score < 0 ? '#881337' : '#94a3b8'

                                      const intermKey = `interm-${rec.id}`
                                      const intermOpen = openTimelineKey === intermKey
                                      return (
                                      <div key={rec.id} style={{ background: 'var(--surface)', border: `1.5px solid ${intermOpen ? '#fdba74' : '#fed7aa'}`, borderRadius: 'var(--radius-lg)', boxShadow: intermOpen ? 'var(--shadow-sm)' : 'none', overflow: 'hidden' }}>
                                        <div
                                          role="button"
                                          onClick={() => toggleTimeline(intermKey)}
                                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '0.55rem 0.9rem', cursor: 'pointer' }}
                                        >
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                              <span style={{ fontWeight: 700, color: '#92400e', fontSize: '0.85rem' }}>Intermédiaire n°{idx + 1}</span>
                                              {rec.status === 'incomplet' && <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#991b1b' }}>Incomplet</span>}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: '#c2410c', marginTop: 1 }}>{rec.dateBilan}</div>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            {score !== null && (
                                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700, fontSize: '0.76rem', color: sColor, letterSpacing: '-0.01em' }}>
                                                {score > 0 ? (
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                                ) : score < 0 ? (
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                                ) : (
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                                )}
                                                {Math.abs(score)}%
                                              </span>
                                            )}
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fdba74" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: intermOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                                          </div>
                                        </div>
                                        {intermOpen && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 0.9rem 0.75rem' }}>
                                          {rec.status === 'incomplet' ? (
                                            <>
                                              <button
                                                style={{ width: '100%', padding: '0.55rem 1rem', borderRadius: 10, background: 'linear-gradient(135deg, #ea580c, #c2410c)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                                onClick={() => {
                                                  setFormData(prev => ({ ...prev, nom: rec.nom, prenom: rec.prenom, dateNaissance: rec.dateNaissance }))
                                                  setBilanIntermediaireZone(rec.zone ?? null)
                                                  setCurrentBilanIntermediaireId(rec.id)
                                                  setCurrentBilanIntermediaireData(rec.data ?? null)
                                                  setStep('bilan_intermediaire')
                                                }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 13 20 8 15 3"/><path d="M4 20v-3a5 5 0 0 1 5-5h11"/></svg>
                                                Reprendre le bilan intermédiaire
                                              </button>
                                              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 2 }}>
                                                <button onClick={() => setDeletingIntermediaireId(rec.id)}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                                  Supprimer
                                                </button>
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              {/* Rangée 1 : Bilan PDF + Note diag */}
                                              <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                  style={{ flex: 1, padding: '0.55rem 0.5rem', borderRadius: 10, background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.78rem', cursor: exportingRecordId === rec.id ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: exportingRecordId === rec.id ? 0.75 : 1 }}
                                                  onClick={() => {
                                                    // Exporte le bilan intermédiaire comme un BilanRecord pour réutiliser exportBilanFromRecord
                                                    exportBilanFromRecord({
                                                      id: rec.id, nom: rec.nom, prenom: rec.prenom,
                                                      dateNaissance: rec.dateNaissance, dateBilan: rec.dateBilan,
                                                      zoneCount: 1, zone: rec.zone, bilanType: rec.bilanType,
                                                      bilanData: rec.data, notes: rec.notes, status: rec.status,
                                                      avatarBg: rec.avatarBg,
                                                    } as BilanRecord, true)
                                                  }}
                                                  disabled={exportingRecordId === rec.id}>
                                                  {exportingRecordId === rec.id ? (
                                                    <span className="spinner-sm" />
                                                  ) : (
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                                    </svg>
                                                  )}
                                                  Bilan PDF
                                                </button>
                                                <button
                                                  style={{ flex: 1, padding: '0.55rem 0.5rem', borderRadius: 10, background: '#fff7ed', border: '1.5px solid #fed7aa', color: '#92400e', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                                  onClick={() => openNoteIntermediaire(rec)}>
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/><path d="M14.5 3.5C17 4 19 6.5 19 9.5c0 1-.2 2-.6 2.8"/><path d="M9.5 3.5C7 4 5 6.5 5 9.5c0 1 .2 2 .6 2.8"/><path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/><path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/><path d="M9 20v-6"/><path d="M15 20v-6"/><path d="M9 14h6"/>
                                                  </svg>
                                                  Note diag. IA
                                                </button>
                                              </div>
                                              {/* Rangée 2 : Fiche d'exercices */}
                                              <button
                                                style={{ width: '100%', padding: '0.55rem 1rem', borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                                onClick={() => {
                                                  setFormData(prev => ({ ...prev, nom: rec.nom, prenom: rec.prenom, dateNaissance: rec.dateNaissance }))
                                                  // Build context from intermediaire + historique
                                                  const patKey = rec.patientKey
                                                  const bt = rec.bilanType ?? getBilanType(rec.zone ?? '')
                                                  const allNotes = dbNotes.filter(n => n.patientKey === patKey && (n.bilanType ?? getBilanType(n.zone ?? '')) === bt)
                                                  const allBilans = db.filter(r => `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim() === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === bt)
                                                  const historiqueStr = [
                                                    ...allBilans.map(b => `Bilan initial ${b.dateBilan} — EVN ${b.evn ?? '?'}/10`),
                                                    ...allNotes.map(n => `Séance n°${n.numSeance} — EVA ${n.data.eva}/10 — ${n.data.evolution} — ${n.data.interventions.join(', ')}`),
                                                  ].join('\n')
                                                  const tc = (rec.data?.troncCommun as Record<string, unknown>) ?? {}
                                                  const evnData = (tc.evn as Record<string, unknown>) ?? {}
                                                  setFicheExerciceContextOverride({
                                                    zone: rec.zone ?? '',
                                                    bilanData: rec.data ?? {},
                                                    notesLibres: `BILAN INTERMÉDIAIRE — EVN actuelle: ${evnData.pireActuel ?? '?'}/10 (initiale: ${evnData.pireInitial ?? '?'}/10)\nHistorique du patient:\n${historiqueStr}`,
                                                  })
                                                  setFicheExerciceSource({ type: 'intermediaire', id: rec.id })
                                                  setSelectedBodyZone(rec.zone ?? null)
                                                  setFicheBackStep('database')
                                                  setStep('fiche_exercice')
                                                }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                                </svg>
                                                Fiche d'exercices
                                              </button>
                                              {/* Rangée 3 : Modifier / Supprimer — liens discrets */}
                                              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, paddingTop: 2 }}>
                                                <button
                                                  onClick={() => {
                                                    setFormData(prev => ({ ...prev, nom: rec.nom, prenom: rec.prenom, dateNaissance: rec.dateNaissance }))
                                                    setBilanIntermediaireZone(rec.zone ?? null)
                                                    setCurrentBilanIntermediaireId(rec.id)
                                                    setCurrentBilanIntermediaireData(rec.data ?? null)
                                                    setStep('bilan_intermediaire')
                                                  }}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                  Modifier
                                                </button>
                                                <button onClick={() => setDeletingIntermediaireId(rec.id)}
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                                  Supprimer
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                        )}
                                      </div>
                                      )
                                      })()
                                    })}
                                  </div>
                                )
                              })()}
                              {/* ── Actions par zone ────────────────────── */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: '0.35rem' }}>
                                {(zoneBilans.filter(r => r.status === 'complet').length + zoneIntermCount + zoneNotesCount) >= 2 && (
                                  <button
                                    onClick={() => {
                                      const firstRec = zoneBilans[0] ?? allPatientRecords.find(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType) ?? allPatientRecords[0]
                                      setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                                      setEvolutionZoneType(zoneType as BilanType)
                                      setStep('evolution_ia')
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(30,58,138,0.2)' }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                    Rapport d'évolution — {zoneLabel}
                                  </button>
                                )}
                                {isZoneEmpty ? (
                                  <button
                                    onClick={() => {
                                      const firstRec = allPatientRecords[0]
                                      setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                                      setPatientMode('existing')
                                      setSelectedBodyZone(DEFAULT_ZONE_FOR_BILAN[zoneType as BilanType] ?? null)
                                      setBilanZoneBackStep('identity')
                                      setStep('identity')
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--primary)', background: 'transparent', color: 'var(--primary)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Nouveau bilan {zoneLabel}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Clôturer la prise en charge ${zoneLabel} ? Les futures analyses d'autres zones ne verront cette PEC que comme un antécédent résumé.`)) {
                                        closeTreatment(selectedPatient ?? '', zoneType as BilanType, zoneBilans[0]?.zone)
                                      }
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-lg)', border: '1.5px dashed var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    Clôturer la PEC {zoneLabel}
                                  </button>
                                )}
                              </div>
                              </>)}
                            </div>
                            </SwipeToDelete>
                            </div>
                          )
                          })
                        })()}
                        {/* ── Documents ────────────────────── */}
                        <DossierDocuments
                          patientKey={selectedPatient ?? ''}
                          bilans={bilans}
                          standaloneDocs={dbPatientDocs.filter(d => d.patientKey === selectedPatient)}
                          onRename={(target, newName) => {
                            if (target.kind === 'bilan') {
                              setDb(prev => prev.map(r => {
                                if (r.id !== target.bilanId || !r.documents) return r
                                const docs = r.documents.map((d, i) => i === target.docIndex ? { ...d, name: newName } : d)
                                return { ...r, documents: docs }
                              }))
                            } else {
                              setDbPatientDocs(prev => prev.map(d => d.id === target.docId ? { ...d, name: newName } : d))
                            }
                          }}
                          onDelete={(docId) => {
                            setDbPatientDocs(prev => prev.filter(d => d.id !== docId))
                          }}
                          onAddRaw={async (dataUrl, name, mimeType) => {
                            if (mimeType.startsWith('image/')) {
                              setPatientDocMaskingQueue(prev => [...prev, { dataUrl, name, mimeType }])
                            } else if (mimeType === 'application/pdf') {
                              try {
                                const pages = await pdfToImages(dataUrl)
                                const baseName = name.replace(/\.pdf$/i, '')
                                for (let i = 0; i < pages.length; i++) {
                                  setPatientDocMaskingQueue(prev => [...prev, {
                                    dataUrl: pages[i],
                                    name: pages.length === 1 ? `${baseName}.png` : `${baseName} (p${i + 1}).png`,
                                    mimeType: 'image/png',
                                  }])
                                }
                              } catch {
                                const base64 = dataUrl.split(',')[1] ?? dataUrl
                                const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
                                setDbPatientDocs(prev => [...prev, { id, patientKey: selectedPatient ?? '', name, mimeType, data: base64, addedAt: new Date().toISOString() }])
                              }
                            } else {
                              const base64 = dataUrl.split(',')[1] ?? dataUrl
                              const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
                              setDbPatientDocs(prev => [...prev, { id, patientKey: selectedPatient ?? '', name, mimeType, data: base64, addedAt: new Date().toISOString() }])
                            }
                          }}
                          onRemask={(docId) => {
                            const doc = dbPatientDocs.find(d => d.id === docId)
                            if (!doc || !doc.originalData) return
                            const dataUrl = `data:${doc.mimeType};base64,${doc.originalData}`
                            setPatientDocMaskingQueue(prev => [...prev, { dataUrl, name: doc.name, mimeType: doc.mimeType }])
                            setDbPatientDocs(prev => prev.filter(d => d.id !== docId))
                          }}
                        />

                        {/* ── Supprimer le patient ────────────── */}
                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                          <button
                            onClick={() => setDeletingPatientKey(selectedPatient)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'transparent', border: '1.5px solid #fca5a5', color: '#dc2626', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                            Supprimer ce patient
                          </button>
                        </div>
                      </div>

                      <ConsultationChooser
                        open={consultationChooserOpen}
                        onClose={() => setConsultationChooserOpen(false)}
                        zones={zonesForPicker}
                        hasAnyBilan={hasAnyBilanForPicker}
                        onPickSeance={() => {
                          const activeZones = zonesForPicker
                          if (activeZones.length <= 1) {
                            const bt = (activeZones[0]?.bilanType ?? getBilanType(bilans[0]?.zone ?? '')) as BilanType
                            const firstRec = allPatientRecords[0]
                            setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                            const z = allPatientRecords.find(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === bt)?.zone ?? DEFAULT_ZONE_FOR_BILAN[bt] ?? ''
                            setNoteSeanceZone(z)
                            setCurrentNoteSeanceId(null)
                            setCurrentNoteSeanceData(null)
                            setStep('note_seance')
                          } else {
                            setLetterZonePicker({ action: 'seance' })
                          }
                        }}
                        onPickIntermediaire={() => {
                          const activeWithBilans = zonesForPicker.filter(z => z.hasBilans)
                          if (activeWithBilans.length <= 1) {
                            const bt = (activeWithBilans[0]?.bilanType ?? getBilanType(bilans[0]?.zone ?? '')) as BilanType
                            const firstRec = allPatientRecords[0]
                            setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                            const patKey = selectedPatient ?? ''
                            const z = allPatientRecords.find(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === bt)?.zone ?? DEFAULT_ZONE_FOR_BILAN[bt] ?? ''
                            setBilanIntermediaireZone(z)
                            setCurrentBilanIntermediaireId(null)
                            setCurrentBilanIntermediaireData(getIntermediairePreFill(patKey, z))
                            setStep('bilan_intermediaire')
                          } else {
                            setLetterZonePicker({ action: 'intermediaire' })
                          }
                        }}
                        onPickNouveauBilan={() => {
                          const firstRec = allPatientRecords[0]
                          setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                          setPatientMode('existing')
                          setSelectedBodyZone(null)
                          setBilanZoneBackStep('identity')
                          setStep('identity')
                        }}
                        onPickBilanSortie={() => {
                          const firstRec = allPatientRecords[0]
                          setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                          const activeTypes = getPatientBilanTypes(selectedPatient ?? '').filter(t => !isTreatmentClosed(selectedPatient ?? '', t))
                          if (activeTypes.length <= 1) {
                            setSelectedBodyZone(bilans[bilans.length - 1]?.zone ?? null)
                            setStep('bilan_sortie')
                          } else {
                            setLetterZonePicker({ action: 'bilan_sortie' })
                          }
                        }}
                        onPickCourrier={() => {
                          const activeTypes = getPatientBilanTypes(selectedPatient ?? '').filter(t => !isTreatmentClosed(selectedPatient ?? '', t))
                          if (activeTypes.length <= 1) {
                            const soleZone = allPatientRecords.find(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === activeTypes[0])?.zone ?? null
                            setSelectedBodyZone(soleZone)
                            setStep('letter')
                          } else {
                            setLetterZonePicker({ action: 'letter' })
                          }
                        }}
                      />
                    </>
                  )
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Delete patient confirmation ─────────────────────────────────────────── */}
      {deletingPatientKey && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '360px', boxShadow: 'var(--shadow-2xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Supprimer le patient</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{deletingPatientKey}</p>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              Cette action supprimera <strong>définitivement</strong> tous les bilans, notes de séance, bilans intermédiaires et documents associés à ce patient.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setDeletingPatientKey(null)}
                style={{ flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-lg)', background: 'var(--secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                Annuler
              </button>
              <button
                onClick={() => {
                  const patKey = deletingPatientKey
                  setDb(prev => prev.filter(r => `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim() !== patKey))
                  setDbIntermediaires(prev => prev.filter(r => r.patientKey !== patKey))
                  setDbNotes(prev => prev.filter(r => r.patientKey !== patKey))
                  setDbObjectifs(prev => prev.filter(r => r.patientKey !== patKey))
                  setDbPatientDocs(prev => prev.filter(r => r.patientKey !== patKey))
                  setDbLetters(prev => prev.filter(r => r.patientKey !== patKey))
                  setDeletingPatientKey(null)
                  setSelectedPatient(null)
                  showToast('Patient supprimé', 'success')
                }}
                style={{ flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-lg)', background: '#dc2626', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Migration sexe : complétion obligatoire à l'ouverture d'une ancienne fiche patient ── */}
      {sexeMigrationTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '380px', boxShadow: 'var(--shadow-2xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Complétion requise</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sexeMigrationTarget.prenom} {sexeMigrationTarget.nom}</p>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5, margin: '0 0 1rem' }}>
              Cette fiche patient a été créée avant l'ajout du champ <strong>Sexe</strong>. Merci de le renseigner pour permettre un accord grammatical correct dans les bilans envoyés aux médecins.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {([
                { value: 'masculin', label: 'Masculin' },
                { value: 'feminin', label: 'Féminin' },
              ] as const).map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setSexeMigrationChoice(opt.value)}
                  style={{ flex: 1, padding: '0.7rem 0.85rem', borderRadius: 'var(--radius-full)', border: sexeMigrationChoice === opt.value ? '2px solid var(--primary)' : '1.5px solid var(--border-color)', background: sexeMigrationChoice === opt.value ? 'var(--secondary)' : 'var(--input-bg)', color: sexeMigrationChoice === opt.value ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: sexeMigrationChoice === opt.value ? 600 : 400, fontSize: '0.88rem', cursor: 'pointer' }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              disabled={!sexeMigrationChoice}
              onClick={() => {
                if (sexeMigrationChoice !== 'masculin' && sexeMigrationChoice !== 'feminin') return
                const chosen = sexeMigrationChoice
                const patKey = sexeMigrationTarget.patKey
                setDb(prev => prev.map(r =>
                  `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim() === patKey
                    ? { ...r, sexe: chosen }
                    : r
                ))
                setSexeMigrationTarget(null)
                setSexeMigrationChoice('')
                showToast('Sexe enregistré', 'success')
              }}
              style={{ width: '100%', padding: '0.8rem', borderRadius: 'var(--radius-lg)', background: !sexeMigrationChoice ? '#d1d5db' : 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: !sexeMigrationChoice ? 'not-allowed' : 'pointer' }}>
              Valider
            </button>
          </div>
        </div>
      )}

      {/* ── Profile Tab ─────────────────────────────────────────────── */}
      {step === 'profile' && (
          <div className="general-info-screen fade-in">
            <header className="screen-header">
              <button className="btn-back" onClick={() => setStep('settings')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <h2 className="title-section">Modifier le profil</h2>
              <div style={{ width: 24 }} />
            </header>
            <div className="scroll-area" style={{ paddingBottom: '5.5rem' }}>

              <div className="fade-in">
                  {/* Photo */}
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.75rem', marginBottom:'2rem' }}>
                    <div onClick={() => photoInputRef.current?.click()}
                      style={{ position:'relative', width:96, height:96, borderRadius:'50%', overflow:'hidden', cursor:'pointer', boxShadow:'var(--shadow-lg)', background: profileEditDraft.photo ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {profileEditDraft.photo
                        ? <img src={profileEditDraft.photo} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="Profil" />
                        : <span style={{ fontSize:'2.2rem', fontWeight:700, color:'white' }}>{(profileEditDraft.nom || profileEditDraft.prenom || 'W')[0]}</span>}
                      <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0.4rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                    </div>
                    <input ref={photoInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhotoUpload} />
                    <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>Appuyez pour changer la photo</span>
                  </div>

                  <div className="form-group">
                    <label>Prénom / Nom affiché</label>
                    <input type="text" className="input-luxe" value={profileEditDraft.nom}
                      onChange={e => setProfileEditDraft(p => ({ ...p, nom: e.target.value }))} placeholder="Renseignez votre nom" />
                  </div>
                  <div className="form-group">
                    <label>Profession</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      {(['Kinésithérapeute', 'Physiothérapeute'] as const).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setProfileEditDraft(p => ({ ...p, profession: opt }))}
                          style={{
                            flex: 1,
                            padding: '0.65rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            border: profileEditDraft.profession === opt ? '2px solid var(--primary)' : '1.5px solid var(--border-color)',
                            background: profileEditDraft.profession === opt ? 'var(--info-soft)' : 'var(--surface)',
                            color: profileEditDraft.profession === opt ? 'var(--primary-dark)' : 'var(--text-main)',
                            fontWeight: profileEditDraft.profession === opt ? 700 : 500,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          {opt}
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>
                            {opt === 'Kinésithérapeute' ? '🇫🇷 France' : '🇨🇭 Suisse / 🇧🇪 Belgique'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Compétences & Équipements */}
                  {(() => {
                    const chipStyle = (active: boolean): React.CSSProperties => ({
                      padding: '0.45rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      border: active ? '2px solid var(--primary)' : '1.5px solid var(--border-color)',
                      background: active ? 'var(--info-soft)' : 'transparent',
                      color: active ? 'var(--primary-dark)' : 'var(--text-muted)',
                      fontWeight: active ? 600 : 400,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.18s',
                    })
                    const sectionTitle: React.CSSProperties = { fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem', marginBottom: 8 }
                    return (
                  <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                    <div style={sectionTitle}>Compétences & Équipements</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                      Les propositions de prise en charge seront adaptées en fonction de vos compétences et équipements.
                    </p>

                    {/* Spécialités */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={sectionTitle}>Spécialités</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Thérapie manuelle', 'McKenzie (MDT)', 'Sport', 'Pédiatrie', 'Neurologie', 'Vestibulaire', 'Périnéologie', 'Respiratoire', 'Rhumatologie', 'Gériatrie', 'Orthopédie'].map(s => (
                          <button key={s} type="button" style={chipStyle((profileEditDraft.specialites ?? []).includes(s))}
                            onClick={() => setProfileEditDraft(p => ({
                              ...p,
                              specialites: (p.specialites ?? []).includes(s)
                                ? (p.specialites ?? []).filter(x => x !== s)
                                : [...(p.specialites ?? []), s]
                            }))}>{s}</button>
                        ))}
                      </div>
                    </div>

                    {/* Techniques */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={sectionTitle}>Techniques maîtrisées</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Dry needling', 'Mulligan', 'Maitland', 'Cupping', 'Taping / K-Tape', 'PNF (Kabat)', 'Chaînes musculaires (GDS/Busquet)', 'Éducation neurosciences douleur', 'Crochetage / IASTM', 'Drainage lymphatique', 'Trigger points', 'Ventouses', 'Stretching global actif'].map(t => (
                          <button key={t} type="button" style={chipStyle((profileEditDraft.techniques ?? []).includes(t))}
                            onClick={() => setProfileEditDraft(p => ({
                              ...p,
                              techniques: (p.techniques ?? []).includes(t)
                                ? (p.techniques ?? []).filter(x => x !== t)
                                : [...(p.techniques ?? []), t]
                            }))}>{t}</button>
                        ))}
                      </div>
                    </div>

                    {/* Équipements */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={sectionTitle}>Équipements au cabinet</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Ondes de choc', 'TENS', 'Tecarthérapie (Winback/Indiba)', 'Ultrasons', 'Laser', 'Isocinétisme', 'Plateforme proprioceptive', 'Huber / LPG', 'Pressothérapie', 'Électrostimulation', 'Cryothérapie', 'Traction cervicale/lombaire', 'Vélo / Elliptique', 'Presse'].map(e => (
                          <button key={e} type="button" style={chipStyle((profileEditDraft.equipements ?? []).includes(e))}
                            onClick={() => setProfileEditDraft(p => ({
                              ...p,
                              equipements: (p.equipements ?? []).filter(x => x !== e).length === (p.equipements ?? []).length
                                ? [...(p.equipements ?? []), e]
                                : (p.equipements ?? []).filter(x => x !== e)
                            }))}>{e}</button>
                        ))}
                      </div>
                    </div>

                    {/* Autres compétences (texte libre) */}
                    <div>
                      <div style={sectionTitle}>Autres (non listés ci-dessus)</div>
                      <textarea
                        value={profileEditDraft.autresCompetences ?? ''}
                        onChange={e => setProfileEditDraft(p => ({ ...p, autresCompetences: e.target.value }))}
                        placeholder="Ex : méthode Schroth, rééducation maxillo-faciale, posturologie, biofeedback, Game Ready..."
                        rows={2}
                        className="input-luxe"
                        style={{ fontSize: '0.82rem', resize: 'vertical' }}
                      />
                    </div>
                  </div>
                    )
                  })()}

                  {/* En-tête Courriers */}
                  <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem', marginBottom: 8 }}>En-tête des courriers</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                      Ces informations apparaîtront en en-tête de vos courriers PDF (fin de PEC, demande d'imagerie, etc.).
                    </p>
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid var(--border-color)' }}>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: '0.82rem' }}>Prénom (si différent du nom affiché)</label>
                        <input type="text" className="input-luxe" value={profileEditDraft.prenom ?? ''}
                          onChange={e => setProfileEditDraft(p => ({ ...p, prenom: e.target.value }))}
                          placeholder="Ex : Marie" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: '0.82rem' }}>Spécialisations (libellé affiché)</label>
                        <input type="text" className="input-luxe" value={profileEditDraft.specialisationsLibelle ?? ''}
                          onChange={e => setProfileEditDraft(p => ({ ...p, specialisationsLibelle: e.target.value }))}
                          placeholder="Ex : Thérapie manuelle, Rééducation du sportif" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: '0.82rem' }}>Numéro RCC / ADELI</label>
                        <input type="text" className="input-luxe" value={profileEditDraft.rcc ?? ''}
                          onChange={e => setProfileEditDraft(p => ({ ...p, rcc: e.target.value }))}
                          placeholder="Ex : 123456789" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: '0.82rem' }}>Adresse</label>
                        <input type="text" className="input-luxe" value={profileEditDraft.adresse ?? ''}
                          onChange={e => setProfileEditDraft(p => ({ ...p, adresse: e.target.value }))}
                          placeholder="Ex : 12 rue des Lilas" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: '0.82rem' }}>Complément (bâtiment, étage)</label>
                        <input type="text" className="input-luxe" value={profileEditDraft.adresseComplement ?? ''}
                          onChange={e => setProfileEditDraft(p => ({ ...p, adresseComplement: e.target.value }))}
                          placeholder="Ex : Cabinet 2B" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, marginBottom: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.82rem' }}>CP</label>
                          <input type="text" className="input-luxe" value={profileEditDraft.codePostal ?? ''}
                            onChange={e => setProfileEditDraft(p => ({ ...p, codePostal: e.target.value }))}
                            placeholder="75001" />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '0.82rem' }}>Ville</label>
                          <input type="text" className="input-luxe" value={profileEditDraft.ville ?? ''}
                            onChange={e => setProfileEditDraft(p => ({ ...p, ville: e.target.value }))}
                            placeholder="Paris" />
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: '0.82rem' }}>Téléphone</label>
                        <input type="text" className="input-luxe" value={profileEditDraft.telephone ?? ''}
                          onChange={e => setProfileEditDraft(p => ({ ...p, telephone: e.target.value }))}
                          placeholder="01 23 45 67 89" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: '0.82rem' }}>Email</label>
                        <input type="email" className="input-luxe" value={profileEditDraft.email ?? ''}
                          onChange={e => setProfileEditDraft(p => ({ ...p, email: e.target.value }))}
                          placeholder="contact@cabinet.fr" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.82rem' }}>Signature manuscrite (image)</label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={e => {
                            const f = e.target.files?.[0]
                            if (!f) return
                            const reader = new FileReader()
                            reader.onload = () => setProfileEditDraft(p => ({ ...p, signatureImage: reader.result as string }))
                            reader.readAsDataURL(f)
                          }}
                          style={{ fontSize: '0.8rem', marginTop: 4 }}
                        />
                        {profileEditDraft.signatureImage && (
                          <div style={{ marginTop: 8, padding: 8, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 6, display: 'inline-block' }}>
                            <img src={profileEditDraft.signatureImage} alt="Signature" style={{ maxHeight: 50, maxWidth: 180 }} />
                            <button
                              onClick={() => setProfileEditDraft(p => ({ ...p, signatureImage: null }))}
                              style={{ display: 'block', marginTop: 6, background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>
                              Retirer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Confidentialité & conformité */}
                  <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem', marginBottom: 8 }}>Confidentialité & conformité RGPD</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                      Mention d'information à intégrer dans votre livret d'accueil, salle d'attente ou politique de confidentialité, ainsi que le registre des traitements effectués.
                    </p>
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 14 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46', marginBottom: 6 }}>
                        Mention d'information patient (à afficher)
                      </div>
                      <div style={{
                        fontSize: '0.78rem', color: '#064e3b', lineHeight: 1.55,
                        background: 'var(--surface)', padding: '10px 12px', borderRadius: 8,
                        border: '1px solid #bbf7d0', fontFamily: 'Georgia, serif',
                        whiteSpace: 'pre-line',
                      }}>
{`Dans le cadre de votre prise en charge, des outils informatiques incluant des modèles d'intelligence artificielle peuvent être utilisés pour assister la rédaction de vos documents médicaux (courriers aux médecins, synthèses, comptes rendus).

Aucune donnée personnelle identifiante vous concernant (nom, prénom, date de naissance, coordonnées) n'est transmise à ces outils. Seules des informations médicales anonymisées (âge, pathologie, données cliniques) le sont, et uniquement à des fins d'aide à la rédaction. Le contenu final est systématiquement relu et validé par votre thérapeute avant tout envoi.

Vos données médicales sont stockées exclusivement sur l'équipement informatique du praticien, ne sont jamais partagées avec des tiers en dehors du strict cadre du parcours de soins, et restent sous le contrôle du thérapeute qui en est le responsable du traitement au sens du RGPD.

Pour toute question, exercer vos droits (accès, rectification, effacement) ou signaler une préoccupation, adressez-vous directement à votre thérapeute.`}
                      </div>
                      <button
                        onClick={() => {
                          const text = `Dans le cadre de votre prise en charge, des outils informatiques incluant des modèles d'intelligence artificielle peuvent être utilisés pour assister la rédaction de vos documents médicaux (courriers aux médecins, synthèses, comptes rendus).

Aucune donnée personnelle identifiante vous concernant (nom, prénom, date de naissance, coordonnées) n'est transmise à ces outils. Seules des informations médicales anonymisées (âge, pathologie, données cliniques) le sont, et uniquement à des fins d'aide à la rédaction. Le contenu final est systématiquement relu et validé par votre thérapeute avant tout envoi.

Vos données médicales sont stockées exclusivement sur l'équipement informatique du praticien, ne sont jamais partagées avec des tiers en dehors du strict cadre du parcours de soins, et restent sous le contrôle du thérapeute qui en est le responsable du traitement au sens du RGPD.

Pour toute question, exercer vos droits (accès, rectification, effacement) ou signaler une préoccupation, adressez-vous directement à votre thérapeute.`
                          if (navigator.clipboard?.writeText) {
                            navigator.clipboard.writeText(text).then(() => showToast('Mention copiée', 'success'))
                          }
                        }}
                        style={{ marginTop: 10, width: '100%', padding: '0.55rem', borderRadius: 8, background: 'var(--surface)', border: '1px solid #86efac', color: '#065f46', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                        Copier le texte
                      </button>
                    </div>

                    <div style={{ background: 'var(--info-soft)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: 14, marginTop: 10 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
                        Registre des traitements
                      </div>
                      {(() => {
                        const totalCount = dbLetterAudit.length + dbAICallAudit.length
                        const suspiciousCount = dbAICallAudit.filter(e => e.scrubReplacements > 0).length
                        const withDocsCount = dbAICallAudit.filter(e => e.hasDocuments).length
                        if (totalCount === 0) {
                          return <p style={{ fontSize: '0.75rem', color: 'var(--primary)', margin: '0 0 10px', lineHeight: 1.5 }}>Aucun traitement enregistré pour le moment.</p>
                        }
                        return (
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: 10, lineHeight: 1.5 }}>
                            <div>• <strong>{dbLetterAudit.length}</strong> courrier{dbLetterAudit.length > 1 ? 's' : ''} généré{dbLetterAudit.length > 1 ? 's' : ''}</div>
                            <div>• <strong>{dbAICallAudit.length}</strong> autre{dbAICallAudit.length > 1 ? 's' : ''} analyse{dbAICallAudit.length > 1 ? 's' : ''} (bilans, fiches exos…)</div>
                            {withDocsCount > 0 && (
                              <div style={{ color: '#92400e', marginTop: 4 }}>⚠ {withDocsCount} appel{withDocsCount > 1 ? 's' : ''} avec documents joints (non pseudonymisés automatiquement)</div>
                            )}
                            {suspiciousCount > 0 && (
                              <div style={{ color: '#b91c1c', marginTop: 4, fontWeight: 600 }}>⚠ {suspiciousCount} appel{suspiciousCount > 1 ? 's' : ''} où le scrub wrapper a intercepté un nom — à examiner</div>
                            )}
                          </div>
                        )
                      })()}
                      <button
                        disabled={dbLetterAudit.length === 0 && dbAICallAudit.length === 0}
                        onClick={async () => {
                          const { generateAuditPDF } = await import('./utils/pdfGenerator')
                          generateAuditPDF({
                            praticien: {
                              nom: profile.nom, prenom: profile.prenom,
                              profession: profile.profession, rcc: profile.rcc,
                              adresse: profile.adresse, ville: profile.ville,
                              codePostal: profile.codePostal,
                            },
                            entries: dbLetterAudit,
                            aiCallEntries: dbAICallAudit,
                          })
                          showToast('Registre exporté', 'success')
                        }}
                        style={{ width: '100%', padding: '0.55rem', borderRadius: 8, background: (dbLetterAudit.length === 0 && dbAICallAudit.length === 0) ? 'var(--secondary)' : 'var(--surface)', border: '1px solid var(--border-soft)', color: (dbLetterAudit.length === 0 && dbAICallAudit.length === 0) ? 'var(--text-muted)' : 'var(--primary)', fontWeight: 600, fontSize: '0.8rem', cursor: (dbLetterAudit.length === 0 && dbAICallAudit.length === 0) ? 'not-allowed' : 'pointer' }}>
                        Exporter le registre (PDF)
                      </button>
                    </div>
                  </div>

                  {/* Sauvegarde multi-appareils */}
                  <div style={{ background:'var(--surface)', borderRadius:'var(--radius-xl)', padding:'1.25rem', marginBottom:'1.25rem', boxShadow:'var(--shadow-sm)', border:'1px solid var(--border-color)' }}>
                    <div style={{ fontWeight:700, color:'var(--primary-dark)', marginBottom:'0.5rem', fontSize:'0.92rem' }}>Sauvegarde multi-appareils</div>
                    <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', margin:'0 0 1rem', lineHeight:1.5 }}>Exporte tes données depuis ce navigateur, puis importe le fichier sur un autre appareil (téléphone, tablette…).</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <button type="button" onClick={handleExportData}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'0.75rem', borderRadius:10, background:'linear-gradient(135deg, var(--primary), var(--primary-dark))', border:'none', color:'white', fontWeight:700, fontSize:'0.88rem', cursor:'pointer' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Exporter mes données (.json)
                      </button>
                      <button type="button" onClick={() => importDataRef.current?.click()}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'0.75rem', borderRadius:10, background:'var(--surface)', border:'1.5px solid var(--border-color)', color:'var(--primary-dark)', fontWeight:700, fontSize:'0.88rem', cursor:'pointer' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Importer un fichier de sauvegarde
                      </button>
                      <input ref={importDataRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImportData} />
                    </div>
                  </div>

                  <button className="btn-primary-luxe" style={{ marginBottom:'1rem', marginTop:'1.5rem' }}
                    onClick={() => {
                      setProfile(profileEditDraft)
                      showToast('Profil enregistré', 'success')
                      setStep('settings')
                    }}>
                    Enregistrer
                  </button>
                </div>
            </div>
          </div>
      )}

      {/* ── Settings ──────────────────────────────────────────────────────────── */}
      {step === 'settings' && (
        <div className="general-info-screen fade-in">
          <header className="screen-header">
            <button className="btn-back" onClick={() => setStep('dashboard')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h2 className="title-section">Réglages</h2>
            <div style={{ width: 24 }} />
          </header>
          <div className="scroll-area" style={{ paddingBottom: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {/* Profil */}
              <button
                onClick={() => { setProfileEditDraft(profile); setStep('profile') }}
                style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', textAlign: 'left', width: '100%' }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Profil</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Nom, photo, profession, compétences</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>

              {/* Apparence — sélecteur de thème */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.9rem' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Apparence</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Choisissez le thème visuel</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {([
                    { id: 'soft' as const, label: 'Soft', desc: 'Vert & beige', swatch: ['#2D5A4B', '#F0EBE1'] },
                    { id: 'medical' as const, label: 'Médical', desc: 'Bleu & blanc', swatch: ['#1e3a8a', '#f8fafc'] },
                  ]).map(t => {
                    const active = theme === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8,
                          padding: '0.75rem', borderRadius: 'var(--radius-md)',
                          border: active ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                          background: active ? 'color-mix(in srgb, var(--primary) 6%, var(--surface))' : 'var(--surface)',
                          cursor: 'pointer', textAlign: 'left',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', gap: 4, height: 24, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <div style={{ flex: 1, background: t.swatch[0] }} />
                          <div style={{ flex: 1, background: t.swatch[1] }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.85rem' }}>{t.label}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{t.desc}</div>
                        </div>
                        {active && (
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            ✓ Actif
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tutoriel */}
              <button
                onClick={() => { setTutorialIdx(0); setTutorialActive(true); localStorage.removeItem('physio_tutorial_done'); setStep('dashboard') }}
                style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', textAlign: 'left', width: '100%' }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.1rem' }}>🎓</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Relancer le tutoriel</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Revoir le guide de prise en main</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>

              {/* Préférences */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Préférences</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Langue, notifications, thème</div>
                  </div>
                </div>

                {/* Langue */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Langue</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {([
                      { id: 'fr' as const, flag: '🇫🇷', label: 'Français' },
                      { id: 'de' as const, flag: '🇩🇪', label: 'Deutsch' },
                      { id: 'en' as const, flag: '🇬🇧', label: 'English' },
                    ]).map(lang => {
                      const active = language === lang.id
                      return (
                        <button
                          key={lang.id}
                          onClick={() => setLanguage(lang.id)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            padding: '0.6rem 0.4rem',
                            borderRadius: 'var(--radius-md)',
                            border: active ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                            background: active ? 'color-mix(in srgb, var(--primary) 6%, var(--surface))' : 'var(--secondary)',
                            cursor: 'pointer',
                            transition: 'border-color 0.15s, background 0.15s',
                          }}
                        >
                          <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{lang.flag}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: active ? 700 : 500, color: active ? 'var(--primary)' : 'var(--text-muted)' }}>{lang.label}</span>
                          {active && <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 700 }}>✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Notifications */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0', borderTop: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>Notifications</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {notificationsEnabled ? 'Activées — rappels et alertes patients' : 'Désactivées'}
                    </div>
                  </div>
                  <button
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    style={{
                      width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                      background: notificationsEnabled ? 'var(--primary)' : 'var(--border-color)',
                      position: 'relative', flexShrink: 0,
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3,
                      left: notificationsEnabled ? 23 : 3,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
              </div>

              {/* Plan & Facturation */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, #f59e0b 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Plan & Facturation</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Abonnement actuel et options</div>
                  </div>
                </div>

                {/* Abonnement actuel */}
                <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', marginBottom: '1rem', color: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Plan actuel</div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '0.15rem 0.5rem', borderRadius: 99, border: '1px solid rgba(255,255,255,0.3)' }}>
                      ✓ Actif
                    </span>
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>Basique</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.85, marginBottom: 8 }}>
                    {billingType === 'annual'
                      ? '290 CHF / an · soit 24.15 CHF/mois'
                      : '29 CHF / mois'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
                    <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                      Facturation {billingType === 'annual' ? 'annuelle' : 'mensuelle'} · Renouvellement le 22 mai 2026
                    </span>
                  </div>
                </div>

                {/* Inclus dans Basique */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Inclus dans votre plan</div>
                  {[
                    'Bilans illimités (toutes zones)',
                    'Analyse IA par bilan (Claude)',
                    'Génération PDF & courriers',
                    'Stockage local sécurisé',
                    'Fiche d\'exercices IA',
                  ].map((feature, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.3rem 0', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}>✓</span>
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Plans disponibles */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>Changer de plan</div>
                  {([
                    { name: 'Pro', price: '49', desc: 'IA vocale ElevenLabs + sync cloud + statistiques avancées', highlight: false },
                    { name: 'Équipe', price: '79', desc: 'Multi-praticiens, dashboard cabinet, accès collaborateur', highlight: true },
                  ]).map(plan => (
                    <div key={plan.name} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.7rem 0.85rem', borderRadius: 'var(--radius-md)',
                      border: `1px solid ${plan.highlight ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: plan.highlight ? 'color-mix(in srgb, var(--primary) 5%, var(--surface))' : 'var(--secondary)',
                      marginBottom: 8, cursor: 'pointer',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{plan.name}</span>
                          {plan.highlight && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--primary)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', padding: '0.1rem 0.35rem', borderRadius: 99 }}>Populaire</span>}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{plan.desc}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)' }}>{plan.price} CHF</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/mois</div>
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', textAlign: 'center', marginTop: '0.4rem', lineHeight: 1.4 }}>
                    Mise à niveau disponible après intégration Supabase
                  </p>
                </div>
              </div>

              {/* Synchronisation cloud */}
              {(() => {
                const statusConfig = {
                  idle: { color: 'var(--text-muted)', bg: 'var(--secondary)', label: 'En attente' },
                  syncing: { color: '#f59e0b', bg: 'color-mix(in srgb, #f59e0b 10%, transparent)', label: 'Synchronisation...' },
                  done: { color: '#22c55e', bg: 'color-mix(in srgb, #22c55e 10%, transparent)', label: 'Synchronisé' },
                  error: { color: '#dc2626', bg: 'color-mix(in srgb, #dc2626 10%, transparent)', label: 'Erreur de sync' },
                }[syncStatus]
                return (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>Synchronisation cloud</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusConfig.color }} />
                        <span style={{ fontSize: '0.72rem', color: statusConfig.color, fontWeight: 500 }}>{isOnline ? statusConfig.label : 'Hors ligne'}</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Déconnexion */}
              <button
                onClick={() => signOut()}
                style={{ background: 'var(--surface)', border: '1px solid #fecaca', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', textAlign: 'left', width: '100%', marginTop: '0.5rem' }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 'var(--radius-md)', background: 'color-mix(in srgb, #dc2626 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.9rem' }}>Se déconnecter</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Résumé bilan modal ─────────────────────────────────────────────────── */}
      {resumeBilan && (
        <BilanResumeModal
          record={resumeBilan.record}
          bilanNum={resumeBilan.bilanNum}
          onClose={() => setResumeBilan(null)}
        />
      )}

      {/* ── Delete confirmation dialog ─────────────────────────────────────────── */}
      {deletingBilanId !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '360px', boxShadow: 'var(--shadow-2xl)' }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1rem', marginBottom: '0.5rem' }}>Supprimer ce bilan ?</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Cette action est irréversible. L'analyse et la fiche d'exercices associées seront également supprimées.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeletingBilanId(null)}
                style={{ flex: 1, padding: '0.7rem', borderRadius: 10, background: 'var(--secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => {
                  setDb(prev => prev.filter(r => r.id !== deletingBilanId))
                  setDeletingBilanId(null)
                  showToast('Bilan supprimé', 'success')
                }}
                style={{ flex: 1, padding: '0.7rem', borderRadius: 10, background: '#dc2626', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete intermédiaire confirmation ─────────────────────────────────── */}
      {deletingIntermediaireId !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '360px', boxShadow: 'var(--shadow-2xl)' }}>
            <div style={{ fontWeight: 700, color: '#c2410c', fontSize: '1rem', marginBottom: '0.5rem' }}>Supprimer ce bilan intermédiaire ?</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>Cette action est irréversible.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeletingIntermediaireId(null)}
                style={{ flex: 1, padding: '0.7rem', borderRadius: 10, background: 'var(--secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => {
                  setDbIntermediaires(prev => prev.filter(r => r.id !== deletingIntermediaireId))
                  setDeletingIntermediaireId(null)
                  showToast('Bilan intermédiaire supprimé', 'success')
                }}
                style={{ flex: 1, padding: '0.7rem', borderRadius: 10, background: '#c2410c', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Zone selector for intermédiaire ────────────────────────────────────── */}
      {showIntermediaireZoneSelector && selectedPatient && (
        <ZonePickerSheet
          title="Zone du bilan intermédiaire"
          accent="#c2410c"
          accentBg="#fff7ed"
          accentBorder="#fed7aa"
          onSelect={(zone) => {
            const bilans = getPatientBilans(selectedPatient)
            const firstRec = bilans[0]
            setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
            setBilanIntermediaireZone(zone)
            setCurrentBilanIntermediaireId(null)
            setCurrentBilanIntermediaireData(getIntermediairePreFill(selectedPatient, zone))
            setShowIntermediaireZoneSelector(false)
            setStep('bilan_intermediaire')
          }}
          onClose={() => setShowIntermediaireZoneSelector(false)}
        />
      )}

      {/* ── Zone selector pour les 4 actions du ConsultationChooser ──────────── */}
      {letterZonePicker && selectedPatient && (() => {
        const patKey = selectedPatient
        const action = letterZonePicker.action
        const allTypes = getPatientBilanTypes(patKey)
        const typesWithBilans = new Set(getPatientBilans(patKey).map(b => b.bilanType ?? getBilanType(b.zone ?? '')))
        // Zones pertinentes selon l'action
        const typesForAction: BilanType[] = (() => {
          if (action === 'seance') return allTypes.filter(t => !isTreatmentClosed(patKey, t))
          if (action === 'intermediaire') return allTypes.filter(t => !isTreatmentClosed(patKey, t) && typesWithBilans.has(t))
          if (action === 'bilan_sortie') return allTypes.filter(t => !isTreatmentClosed(patKey, t) && typesWithBilans.has(t))
          return allTypes // 'letter' : rétrospectif autorisé sur les PEC clôturées
        })()
        const zoneLabelForType = (t: BilanType): string => BILAN_ZONE_LABELS[t]
        const firstZoneForType = (t: BilanType): string => {
          const firstRec = [...getPatientBilans(patKey), ...getPatientIntermediaires(patKey), ...getPatientNotes(patKey)].find(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === t)
          return firstRec?.zone ?? DEFAULT_ZONE_FOR_BILAN[t] ?? ''
        }
        const titleForAction: Record<typeof action, string> = {
          seance: 'Séance — quelle PEC ?',
          intermediaire: 'Bilan intermédiaire — quelle PEC ?',
          bilan_sortie: 'Bilan de sortie — quelle PEC ?',
          letter: 'Courrier — quelle PEC ?',
        }
        const runAction = (t: BilanType) => {
          const zone = firstZoneForType(t)
          setLetterZonePicker(null)
          if (action === 'seance') {
            const firstRec = getPatientBilans(patKey)[0] ?? getPatientNotes(patKey)[0] ?? getPatientIntermediaires(patKey)[0]
            setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
            setNoteSeanceZone(zone)
            setCurrentNoteSeanceId(null)
            setCurrentNoteSeanceData(null)
            setStep('note_seance')
          } else if (action === 'intermediaire') {
            const firstRec = getPatientBilans(patKey)[0] ?? getPatientNotes(patKey)[0] ?? getPatientIntermediaires(patKey)[0]
            setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
            setBilanIntermediaireZone(zone)
            setCurrentBilanIntermediaireId(null)
            setCurrentBilanIntermediaireData(getIntermediairePreFill(patKey, zone))
            setStep('bilan_intermediaire')
          } else {
            setSelectedBodyZone(zone)
            setStep(action)
          }
        }
        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 3000 }}
               onClick={() => setLetterZonePicker(null)}>
            <div onClick={e => e.stopPropagation()}
                 style={{ background: 'var(--surface)', padding: '1.5rem 1.25rem 2rem', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, boxShadow: 'var(--shadow-2xl)' }}>
              <div style={{ width: 40, height: 4, background: 'var(--border-color)', borderRadius: 2, margin: '0 auto 1rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: 4 }}>
                {titleForAction[action]}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                Ce patient a plusieurs prises en charge. Choisis celle à inclure.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {typesForAction.map(t => {
                  const closed = isTreatmentClosed(patKey, t)
                  return (
                    <button
                      key={t}
                      onClick={() => runAction(t)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.85rem 1rem', borderRadius: 12, border: `1.5px solid ${closed ? '#86efac' : 'var(--border-color)'}`, background: closed ? '#f0fdf4' : 'var(--surface)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: 4, height: 22, background: closed ? '#16a34a' : 'var(--primary)', borderRadius: 2 }} />
                      <span style={{ flex: 1 }}>{zoneLabelForType(t)}</span>
                      {closed && <span style={{ fontSize: '0.62rem', fontWeight: 700, background: '#16a34a', color: 'white', padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase' }}>Terminée</span>}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setLetterZonePicker(null)}
                style={{ marginTop: 12, width: '100%', padding: '0.75rem', borderRadius: 12, background: 'var(--secondary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Zone selector for note de séance ──────────────────────────────────── */}
      {showNoteSeanceZoneSelector && selectedPatient && (
        <ZonePickerSheet
          title="Zone de la note de séance"
          accent="#6d28d9"
          accentBg="#f5f3ff"
          accentBorder="#ddd6fe"
          onSelect={(zone) => {
            const bilans = getPatientBilans(selectedPatient)
            const firstRec = bilans[0]
            setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
            setNoteSeanceZone(zone)
            setCurrentNoteSeanceId(null)
            setCurrentNoteSeanceData(null)
            setShowNoteSeanceZoneSelector(false)
            setStep('note_seance')
          }}
          onClose={() => setShowNoteSeanceZoneSelector(false)}
        />
      )}

      {/* ── Delete note de séance confirmation ─────────────────────────────────── */}
      {deletingNoteSeanceId !== null && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '360px', boxShadow: 'var(--shadow-2xl)' }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '1rem', marginBottom: '0.5rem' }}>Supprimer cette note ?</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeletingNoteSeanceId(null)}
                style={{ flex: 1, padding: '0.7rem', borderRadius: 10, background: 'var(--secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => {
                  setDbNotes(prev => prev.filter(r => r.id !== deletingNoteSeanceId))
                  setDeletingNoteSeanceId(null)
                  showToast('Note supprimée', 'info')
                }}
                style={{ flex: 1, padding: '0.7rem', borderRadius: 10, background: '#dc2626', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Document Masker (traite la queue) ─────────────────────────────────── */}
      {maskingQueue.length > 0 && (() => {
        const current = maskingQueue[0]
        return (
          <Suspense fallback={<LazyFallback />}>
            <DocumentMasker
              key={current.name + maskingQueue.length}
              imageDataUrl={current.dataUrl}
              fileName={current.name + (maskingQueue.length > 1 ? ` (${maskingQueue.length} en attente)` : '')}
              onConfirm={(maskedDataUrl, rectCount) => {
                const maskedBase64 = maskedDataUrl.split(',')[1]
                const originalBase64 = current.dataUrl.split(',')[1]
                setBilanDocuments(prev => [...prev, { name: current.name, mimeType: 'image/jpeg', data: rectCount > 0 ? maskedBase64 : originalBase64, originalData: originalBase64, addedAt: new Date().toISOString(), masked: rectCount > 0 }])
                setMaskingQueue(prev => prev.slice(1))
                showToast(rectCount > 0 ? 'Document anonymisé et ajouté' : 'Document ajouté (non anonymisé)', rectCount > 0 ? 'success' : 'warning')
              }}
              onCancel={() => setMaskingQueue(prev => prev.slice(1))}
            />
          </Suspense>
        )
      })()}

      {/* ── Patient document masker ── */}
      {patientDocMaskingQueue.length > 0 && (() => {
        const current = patientDocMaskingQueue[0]
        return (
          <Suspense fallback={<LazyFallback />}>
            <DocumentMasker
              key={`pat-${current.name}-${patientDocMaskingQueue.length}`}
              imageDataUrl={current.dataUrl}
              fileName={current.name + (patientDocMaskingQueue.length > 1 ? ` (${patientDocMaskingQueue.length} en attente)` : '')}
              onConfirm={(maskedDataUrl, rectCount) => {
                const maskedBase64 = maskedDataUrl.split(',')[1]
                const originalBase64 = current.dataUrl.split(',')[1]
                const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
                setDbPatientDocs(prev => [...prev, { id, patientKey: selectedPatient ?? '', name: current.name, mimeType: 'image/jpeg', data: rectCount > 0 ? maskedBase64 : originalBase64, originalData: originalBase64, addedAt: new Date().toISOString(), masked: rectCount > 0 }])
                setPatientDocMaskingQueue(prev => prev.slice(1))
                showToast(rectCount > 0 ? 'Document anonymisé et ajouté' : 'Document ajouté (non anonymisé)', rectCount > 0 ? 'success' : 'warning')
              }}
              onCancel={() => setPatientDocMaskingQueue(prev => prev.slice(1))}
            />
          </Suspense>
        )
      })()}

      {/* ── Masking prescription ─────────────────────────────────────────── */}
      {rxMaskingItem && (
        <Suspense fallback={<LazyFallback />}>
          <DocumentMasker
            key={`rx-${rxMaskingItem.name}`}
            imageDataUrl={rxMaskingItem.dataUrl}
            fileName={`Ordonnance — ${rxMaskingItem.name}`}
            onConfirm={(maskedDataUrl, rectCount) => {
              const maskedBase64 = maskedDataUrl.split(',')[1]
              const originalBase64 = rxMaskingItem.dataUrl.split(',')[1]
              setRxEditDoc({ data: originalBase64, mimeType: 'image/jpeg', name: rxMaskingItem.name })
              const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
              setDbPatientDocs(prev => [...prev, { id, patientKey: selectedPatient ?? '', name: `Ordonnance — ${rxMaskingItem.name}`, mimeType: 'image/jpeg', data: rectCount > 0 ? maskedBase64 : originalBase64, originalData: originalBase64, addedAt: new Date().toISOString(), masked: rectCount > 0 }])
              setRxMaskingItem(null)
              showToast(rectCount > 0 ? 'Ordonnance anonymisée et ajoutée au dossier' : 'Ordonnance ajoutée au dossier (non anonymisée)', rectCount > 0 ? 'success' : 'warning')
            }}
            onCancel={() => {
              const base64 = rxMaskingItem.dataUrl.split(',')[1]
              setRxEditDoc({ data: base64, mimeType: rxMaskingItem.mimeType, name: rxMaskingItem.name })
              setRxMaskingItem(null)
            }}
          />
        </Suspense>
      )}

      {/* ── Zone popup — grille compacte ───────────────────────────────────── */}
      {showZonePopup && (
        <ZonePickerSheet
          title="Zone du bilan"
          accent="var(--primary)"
          accentBg="var(--info-soft)"
          accentBorder="var(--border-color)"
          selectedZone={selectedBodyZone}
          onSelect={(zone) => { setSelectedBodyZone(zone); setShowZonePopup(false) }}
          onClose={() => setShowZonePopup(false)}
        />
      )}

      {/* ── Add patient choice popup ──────────────────────────────────────────── */}
      {showAddPatientChoice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '380px', boxShadow: 'var(--shadow-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="title-section" style={{ margin: 0, fontSize: '1.05rem' }}>Ajouter un patient</h3>
              <button onClick={() => setShowAddPatientChoice(false)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowAddPatientChoice(false); resetForm(); setSelectedBodyZone(null); setPatientMode('new'); setStep('identity') }}
                style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--primary)', background: 'var(--secondary)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  Bilan initial complet
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>Nouveau patient vu pour la première fois — parcours complet avec bilan</div>
              </button>
              <button
                onClick={() => { setShowAddPatientChoice(false); setQuickAddData({ nom: '', prenom: '', dateNaissance: '', sexe: '', zone: '', evn: '', pathologie: '', notes: '' }); setShowQuickAddPatient(true) }}
                style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-color)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                  Patient existant (sans bilan)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>Patient déjà suivi — ajout rapide pour notes de séance</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick-add patient bottom sheet ──────────────────────────────────────── */}
      {showQuickAddPatient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', width: '100%', maxWidth: '430px', boxShadow: 'var(--shadow-2xl)', maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="title-section" style={{ margin: 0, fontSize: '1.05rem' }}>Ajout rapide</h3>
              <button onClick={() => setShowQuickAddPatient(false)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Nom & Prénom */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Nom *</label>
                  <input type="text" className="input-luxe" placeholder="Ex: Dupont"
                    value={quickAddData.nom} onChange={(e) => setQuickAddData(prev => ({ ...prev, nom: e.target.value }))} />
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Prénom *</label>
                  <input type="text" className="input-luxe" placeholder="Ex: Jean"
                    value={quickAddData.prenom} onChange={(e) => setQuickAddData(prev => ({ ...prev, prenom: e.target.value }))} />
                </div>
              </div>

              {/* Date de naissance (optionnel) */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Date de naissance <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optionnel)</span></label>
                <input type="date" className="input-luxe"
                  value={quickAddData.dateNaissance} onChange={(e) => setQuickAddData(prev => ({ ...prev, dateNaissance: e.target.value }))} />
              </div>

              {/* Sexe (obligatoire — utilisé pour l'accord grammatical des bilans PDF) */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Sexe *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {([
                    { value: 'masculin', label: 'Masculin' },
                    { value: 'feminin', label: 'Féminin' },
                  ] as const).map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setQuickAddData(prev => ({ ...prev, sexe: opt.value }))}
                      style={{ flex: 1, padding: '0.55rem 0.85rem', borderRadius: 'var(--radius-full)', border: quickAddData.sexe === opt.value ? '2px solid var(--primary)' : '1.5px solid var(--border-color)', background: quickAddData.sexe === opt.value ? 'var(--secondary)' : 'transparent', color: quickAddData.sexe === opt.value ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: quickAddData.sexe === opt.value ? 600 : 400, fontSize: '0.82rem', cursor: 'pointer' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone corporelle */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Zone corporelle *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {BODY_ZONES.map(zone => (
                    <button key={zone}
                      onClick={() => setQuickAddData(prev => ({ ...prev, zone }))}
                      style={{ padding: '0.45rem 0.85rem', borderRadius: 'var(--radius-full)', border: quickAddData.zone === zone ? '2px solid var(--primary)' : '1.5px solid var(--border-color)', background: quickAddData.zone === zone ? 'var(--secondary)' : 'transparent', color: quickAddData.zone === zone ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: quickAddData.zone === zone ? 600 : 400, fontSize: '0.78rem', cursor: 'pointer' }}>
                      {zone}
                    </button>
                  ))}
                </div>
              </div>

              {/* EVN Slider */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  Douleur (EVN) <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optionnel)</span>
                  {quickAddData.evn && <strong style={{ color: 'var(--danger)', fontSize: '1.1rem', marginLeft: 8 }}>{quickAddData.evn}/10</strong>}
                </label>
                <input type="range" min="0" max="10" step="1"
                  value={quickAddData.evn || '0'}
                  onChange={(e) => setQuickAddData(prev => ({ ...prev, evn: e.target.value }))}
                  style={{ width: '100%', accentColor: 'var(--danger)', marginTop: '0.25rem' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  <span>0 — Aucune</span>
                  <span>10 — Maximale</span>
                </div>
              </div>

              {/* Pathologie */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Pathologie / Motif <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optionnel)</span></label>
                <input type="text" className="input-luxe" placeholder="Ex: Tendinopathie coiffe des rotateurs"
                  value={quickAddData.pathologie} onChange={(e) => setQuickAddData(prev => ({ ...prev, pathologie: e.target.value }))} />
              </div>

              {/* Notes complémentaires */}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Notes complémentaires <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optionnel)</span></label>
                <DictableTextarea className="input-luxe" rows={3} placeholder="Contexte, antécédents, où en est le traitement..."
                  value={quickAddData.notes} onChange={(e) => setQuickAddData(prev => ({ ...prev, notes: e.target.value }))}
                  textareaStyle={{ resize: 'vertical' }} />
              </div>
            </div>

            {/* Bouton valider */}
            <button
              disabled={!quickAddData.nom.trim() || !quickAddData.prenom.trim() || !quickAddData.zone || !quickAddData.sexe}
              onClick={() => {
                const AVATAR_COLORS = ['var(--primary-light)', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1']
                const avatarBg = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
                const newId = Math.max(0, ...db.map(r => r.id)) + 1
                const sexeQA = (quickAddData.sexe === 'masculin' || quickAddData.sexe === 'feminin') ? quickAddData.sexe : undefined
                const record: BilanRecord = {
                  id: newId,
                  nom: quickAddData.nom.trim(),
                  prenom: quickAddData.prenom.trim(),
                  dateBilan: new Date().toLocaleDateString('fr-FR'),
                  dateNaissance: quickAddData.dateNaissance || '',
                  sexe: sexeQA,
                  zoneCount: 1,
                  zone: quickAddData.zone,
                  pathologie: quickAddData.pathologie.trim() || undefined,
                  avatarBg,
                  status: 'incomplet',
                  bilanType: getBilanType(quickAddData.zone),
                  evn: quickAddData.evn ? Number(quickAddData.evn) : undefined,
                  notes: quickAddData.notes.trim() || undefined,
                }
                setDb(prev => [...prev, record])
                setShowQuickAddPatient(false)
                const patKey = `${quickAddData.nom.trim().toUpperCase()} ${quickAddData.prenom.trim()}`.trim()
                setSelectedPatient(patKey)
                showToast('Patient ajouté', 'success')
              }}
              style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: (!quickAddData.nom.trim() || !quickAddData.prenom.trim() || !quickAddData.zone || !quickAddData.sexe) ? '#d1d5db' : '#10b981', color: 'white', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: (!quickAddData.nom.trim() || !quickAddData.prenom.trim() || !quickAddData.zone || !quickAddData.sexe) ? 'not-allowed' : 'pointer', marginTop: '1.25rem' }}>
              Ajouter le patient
            </button>
          </div>
        </div>
      )}

      {/* ── Identity step ──────────────────────────────────────────────────────── */}
      {step === 'identity' && (
        <div className="identity-screen fade-in">
          <header className="screen-header">
            <button className="btn-back" onClick={() => setStep('dashboard')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h2 className="title-section">Identité du patient</h2>
            <button onClick={handleQuitBilan} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0 }} aria-label="Quitter le bilan">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>
          <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${stepProgress}%` }} /></div>
          <div className="scroll-area">
            <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 'var(--radius-xl)', padding: '0.4rem', marginBottom: '1.5rem', width: '100%', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
              {(['new', 'existing'] as const).map(mode => (
                <button key={mode} onClick={() => setPatientMode(mode)}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-lg)', background: patientMode === mode ? '#ffffff' : 'transparent', color: patientMode === mode ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: patientMode === mode ? 600 : 400, boxShadow: patientMode === mode ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                  {mode === 'new' ? 'Nouveau patient' : 'Patient existant'}
                </button>
              ))}
            </div>
            {patientMode === 'existing' && (
              <div className="form-group" style={{background: 'var(--secondary)', padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem'}}>
                <label style={{fontSize: '1.1rem', color: 'var(--primary-dark)', fontWeight: 600}}>Pour quel patient ?</label>
                <select className="input-luxe" defaultValue=""
                  onChange={(e) => { if(e.target.value) { try { const val = JSON.parse(e.target.value); setFormData(prev => ({...prev, nom: val.nom, prenom: val.prenom, dateNaissance: val.dateNaissance})) } catch { /* select value is self-generated JSON */ } }}}>
                  <option value="" disabled>-- Dossiers récents --</option>
                  {Array.from(new Map(db.map(r => [`${(r.nom||'').toUpperCase()} ${r.prenom}`, r])).values()).map(r => (
                    <option key={r.id} value={JSON.stringify({nom: r.nom, prenom: r.prenom, dateNaissance: r.dateNaissance})}>
                      {(r.nom || '').toUpperCase()} {r.prenom}
                    </option>
                  ))}
                </select>
                {formData.nom && (
                  <div style={{marginTop: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)', color: 'var(--primary)', fontWeight: 600, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Dossier actif : {(formData.nom || '').toUpperCase()} {formData.prenom}
                  </div>
                )}
              </div>
            )}
            {patientMode === 'new' && (
              <>
                <div className="form-group">
                  <label>Nom</label>
                  <input type="text" placeholder="Ex: Dupont" className="input-luxe" value={formData.nom} onChange={e => updateField('nom', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Prénom</label>
                  <input type="text" placeholder="Ex: Jean" className="input-luxe" value={formData.prenom} onChange={e => updateField('prenom', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Date de naissance</label>
                  <input type="date" className="input-luxe" value={formData.dateNaissance} onChange={(e) => updateField('dateNaissance', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Sexe <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {([
                      { value: 'masculin', label: 'Masculin' },
                      { value: 'feminin', label: 'Féminin' },
                    ] as const).map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setFormData(prev => ({ ...prev, sexe: opt.value }))}
                        style={{ flex: 1, padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-full)', border: formData.sexe === opt.value ? '2px solid var(--primary)' : '1.5px solid var(--border-color)', background: formData.sexe === opt.value ? 'var(--secondary)' : 'var(--input-bg)', color: formData.sexe === opt.value ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: formData.sexe === opt.value ? 600 : 400, fontSize: '0.88rem', cursor: 'pointer' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'block', marginBottom: 8 }}>Zone du bilan</label>
              <button
                onClick={() => setShowZonePopup(true)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 16, border: selectedBodyZone ? '2px solid var(--primary)' : '1.5px solid var(--border-color)', background: selectedBodyZone ? 'var(--info-soft)' : 'var(--input-bg)', color: selectedBodyZone ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: selectedBodyZone ? 600 : 400, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, boxShadow: selectedBodyZone ? '0 2px 8px rgba(45,90,75,0.12)' : '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.18s' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {selectedBodyZone && (
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ZoneIcon zone={selectedBodyZone} size={16} color="white" />
                    </span>
                  )}
                  {selectedBodyZone ? ZONE_PICKER_ITEMS.find(z => z.zone === selectedBodyZone)?.label ?? selectedBodyZone : 'Sélectionner une zone…'}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
          </div>
          <div className="fixed-bottom">
            <button className="btn-primary-luxe"
              disabled={!selectedBodyZone}
              style={{ opacity: selectedBodyZone ? 1 : 0.5 }}
              onClick={() => {
                if (patientMode === 'existing') { setBilanZoneBackStep('identity'); setStep('bilan_zone') }
                else setStep('general_info')
              }}>
              Étape suivante
            </button>
          </div>
        </div>
      )}

      {/* ── General info step ──────────────────────────────────────────────────── */}
      {step === 'general_info' && (
        <div className="general-info-screen fade-in">
          <header className="screen-header">
            <button className="btn-back" onClick={() => setStep('identity')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h2 className="title-section">Infos générales</h2>
            <button onClick={handleQuitBilan} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0 }} aria-label="Quitter le bilan">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>
          <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${stepProgress}%` }} /></div>
          <div className="scroll-area">
            <div className="form-group">
              <label>Activité professionnelle</label>
              <DictableInput value={formData.profession} onChange={e => updateField('profession', e.target.value)} placeholder="Ex: Employé de bureau" inputStyle={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.88rem', color: 'var(--text-main)', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', boxSizing: 'border-box' }} />
            </div>
            <div className="form-group">
              <label>Activité physique / sportive</label>
              <DictableInput value={formData.sport} onChange={e => updateField('sport', e.target.value)} placeholder="Ex: Course à pied…" inputStyle={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.88rem', color: 'var(--text-main)', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', boxSizing: 'border-box' }} />
            </div>
            <div className="form-group">
              <label>Antécédents familiaux</label>
              <DictableTextarea value={formData.famille} onChange={e => updateField('famille', e.target.value)} placeholder="Diabète, hypertension…" rows={2} textareaStyle={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.88rem', color: 'var(--text-main)', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', boxSizing: 'border-box' }} />
            </div>
            <div className="form-group">
              <label>Antécédents chirurgicaux</label>
              <DictableTextarea value={formData.chirurgie} onChange={e => updateField('chirurgie', e.target.value)} placeholder="Opérations passées…" rows={2} textareaStyle={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.88rem', color: 'var(--text-main)', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', boxSizing: 'border-box' }} />
            </div>
            <div className="form-group">
              <label>Notes complémentaires</label>
              <DictableTextarea value={formData.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Précisions…" rows={2} textareaStyle={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.88rem', color: 'var(--text-main)', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div className="fixed-bottom">
            <button
              className="btn-primary-luxe"
              disabled={!selectedBodyZone}
              style={{ opacity: selectedBodyZone ? 1 : 0.5 }}
              onClick={() => {
                if (!selectedBodyZone) return
                setBilanZoneBackStep('general_info')
                setStep('bilan_zone')
              }}>
              {selectedBodyZone
                ? `Commencer le bilan → ${BILAN_ZONE_LABELS[getBilanType(selectedBodyZone)]}`
                : 'Sélectionnez une zone dans l\'étape précédente'}
            </button>
          </div>
        </div>
      )}

      {/* ── Bilan zone step — toujours monté pour préserver l'état lors du retour arrière ── */}
      {selectedBodyZone && (
        <div className="general-info-screen" style={{ display: step === 'bilan_zone' ? 'flex' : 'none', flexDirection: 'column' }}>
          <header className="screen-header">
            <button className="btn-back" onClick={() => { if (bilanZoneBackStep === 'database') { setCurrentBilanId(null); setCurrentBilanDataOverride(null) } setStep(bilanZoneBackStep) }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{ flex: 1 }}>
              <h2 className="title-section" style={{ marginBottom: 0 }}>{BILAN_ZONE_LABELS[getBilanType(selectedBodyZone ?? '')]}</h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedBodyZone} · {formData.prenom} {formData.nom}{(() => { const a = formData.dateNaissance ? computeAge(formData.dateNaissance) : null; return a !== null ? ` · ${a} ans` : '' })()}</p>
            </div>
            <button onClick={handleQuitBilan} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0 }} aria-label="Quitter le bilan">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>
          <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${stepProgress}%` }} /></div>

          <div className="scroll-area" style={{ paddingBottom: '5.5rem' }}>
            {getBilanType(selectedBodyZone ?? '') === 'epaule'   && <BilanEpaule   key={currentBilanId ?? 'new'} ref={bilanEpauleRef}   initialData={currentBilanDataOverride ?? undefined} />}
            {getBilanType(selectedBodyZone ?? '') === 'cheville' && <BilanCheville key={currentBilanId ?? 'new'} ref={bilanChevilleRef} initialData={currentBilanDataOverride ?? undefined} />}
            {getBilanType(selectedBodyZone ?? '') === 'genou'    && <BilanGenou    key={currentBilanId ?? 'new'} ref={bilanGenouRef}    initialData={currentBilanDataOverride ?? undefined} />}
            {getBilanType(selectedBodyZone ?? '') === 'hanche'   && <BilanHanche   key={currentBilanId ?? 'new'} ref={bilanHancheRef}   initialData={currentBilanDataOverride ?? undefined} />}
            {getBilanType(selectedBodyZone ?? '') === 'cervical' && <BilanCervical key={currentBilanId ?? 'new'} ref={bilanCervicalRef} initialData={currentBilanDataOverride ?? undefined} />}
            {getBilanType(selectedBodyZone ?? '') === 'lombaire' && <BilanLombaire key={currentBilanId ?? 'new'} ref={bilanLombaireRef} initialData={currentBilanDataOverride ?? undefined} />}
            {getBilanType(selectedBodyZone ?? '') === 'generique'&& <BilanGenerique key={currentBilanId ?? 'new'} ref={bilanGeneriqueRef} initialData={currentBilanDataOverride ?? undefined} />}
            {getBilanType(selectedBodyZone ?? '') === 'geriatrique' && <BilanGeriatrique key={currentBilanId ?? 'new'} ref={bilanGeriatriqueRef} initialData={currentBilanDataOverride ?? undefined} />}

            {/* ── Note de fin de bilan ── */}
            <div style={{ marginTop: 20, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'block', marginBottom: 6 }}>
                Note clinique complémentaire
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
                Observations libres, contexte supplémentaire… Ces notes seront incluses dans l'analyse et le PDF.
              </p>
              <DictableTextarea
                value={bilanNotes}
                onChange={e => setBilanNotes(e.target.value)}
                rows={4}
                placeholder="Ex : Patient stressé, travail physique intensifié ce mois-ci, essai de 3 séances de kiné il y a 6 mois sans succès…"
                textareaStyle={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.88rem', color: 'var(--text-main)', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            {/* ── Documents joints ── */}
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'block', marginBottom: 4 }}>
                Documents joints
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                Radios, comptes rendus médicaux, IRM… L'analyse en tiendra compte.
              </p>
              {bilanDocuments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {bilanDocuments.map((doc, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--secondary)', borderRadius: 8, padding: '6px 10px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                      <button onClick={() => setBilanDocuments(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', alignItems: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Hidden file inputs for each source */}
              {(['camera', 'gallery', 'files'] as const).map(source => (
                <input key={source} id={`doc-input-${source}`} type="file"
                  accept={source === 'files' ? 'image/*,application/pdf' : 'image/*'}
                  {...(source === 'camera' ? { capture: 'environment' } : {})}
                  multiple={source !== 'camera'}
                  style={{ display: 'none' }}
                  onChange={e => {
                    const files = Array.from(e.target.files ?? [])
                    files.forEach(file => {
                      const reader = new FileReader()
                      reader.onload = async ev => {
                        const dataUrl = ev.target?.result as string
                        const mimeType = file.type || 'application/octet-stream'
                        if (mimeType.startsWith('image/')) {
                          setMaskingQueue(prev => [...prev, { dataUrl, name: file.name, mimeType }])
                        } else if (mimeType === 'application/pdf') {
                          showToast('Conversion du PDF en images…', 'info')
                          try {
                            const images = await pdfToImages(dataUrl)
                            const baseName = file.name.replace(/\.pdf$/i, '')
                            const items = images.map((imgDataUrl, i) => ({
                              dataUrl: imgDataUrl,
                              name: images.length > 1 ? `${baseName} — page ${i + 1}.jpg` : `${baseName}.jpg`,
                              mimeType: 'image/jpeg',
                            }))
                            setMaskingQueue(prev => [...prev, ...items])
                          } catch (err) {
                            console.error('Erreur conversion PDF', err)
                            showToast('Erreur lors de la conversion du PDF', 'error')
                          }
                        } else {
                          showToast('Format non supporté. Uniquement images et PDF.', 'error')
                        }
                      }
                      reader.readAsDataURL(file)
                    })
                    e.target.value = ''
                  }} />
              ))}
              <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setShowDocSourceMenu(prev => !prev)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-xl)', border: '1.5px solid var(--border-color)', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, background: 'var(--input-bg)', width: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Ajouter un document
                </button>
                {showDocSourceMenu && (
                  <>
                  <div onClick={() => setShowDocSourceMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 20, overflow: 'hidden' }}>
                    {[
                      { id: 'camera', label: 'Prendre une photo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg> },
                      { id: 'gallery', label: 'Galerie photo', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
                      { id: 'files', label: 'Fichiers', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
                    ].map(opt => (
                      <button key={opt.id} type="button"
                        onClick={() => { setShowDocSourceMenu(false); document.getElementById(`doc-input-${opt.id}`)?.click() }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '0.7rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        <span style={{ color: 'var(--primary)', display: 'flex' }}>{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  </>
                )}
              </div>
              <p style={{ fontSize: '0.7rem', color: '#92400e', margin: '6px 0 0', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Masquez les infos patient (nom, date de naissance, n° sécu) avant l'envoi à l'IA.
              </p>
            </div>

            {/* ── Actions (fin de page) ── */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="btn-primary-luxe" style={{ marginBottom: 0, background: 'linear-gradient(135deg, var(--primary), var(--primary-light))' }}
              onClick={handleSaveAndAnalyse}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/><path d="M14.5 3.5C17 4 19 6.5 19 9.5c0 1-.2 2-.6 2.8"/><path d="M9.5 3.5C7 4 5 6.5 5 9.5c0 1 .2 2 .6 2.8"/><path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/><path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/><path d="M9 20v-6"/><path d="M15 20v-6"/><path d="M9 14h6"/>
                  <circle cx="9" cy="20" r="1" fill="white" stroke="none"/><circle cx="15" cy="20" r="1" fill="white" stroke="none"/>
                </svg>
                Analyser + Enregistrer
              </div>
            </button>
            <button className="btn-primary-luxe"
              style={{ marginBottom: 0, background: 'var(--primary-dark)' }}
              onClick={() => { saveBilan('complet'); setCurrentBilanId(null); setCurrentBilanDataOverride(null); setBilanZoneBackStep('general_info'); goToPatientRecord() }}>
              Enregistrer uniquement
            </button>
            <button className="btn-primary-luxe"
              style={{ marginBottom: 0, background: 'linear-gradient(to right, #059669, #047857)', opacity: exportingPDF ? 0.7 : 1 }}
              onClick={handleExportPDF}
              disabled={exportingPDF}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {exportingPDF ? <div className="spinner" /> : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                )}
                {exportingPDF ? 'Génération du rapport…' : 'Télécharger le PDF'}
              </div>
            </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Evolution IA step ─────────────────────────────────────────────────── */}
      {step === 'evolution_ia' && (() => {
        const patKey = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
        const targetBt = evolutionZoneType
        const matchBt = (bt?: BilanType, zone?: string) => {
          if (!targetBt) return true
          return (bt ?? getBilanType(zone ?? '')) === targetBt
        }
        const bilans = getPatientBilans(patKey).filter(r => r.status === 'complet' && matchBt(r.bilanType, r.zone))
        const intermediaires = getPatientIntermediaires(patKey).filter(r => r.status === 'complet' && matchBt(r.bilanType, r.zone))
        const notes = getPatientNotes(patKey).filter(r => matchBt(r.bilanType, r.zone))
        const evolutionBilans = bilans.map((r, i) => ({
          num: i + 1,
          date: r.dateBilan,
          zone: r.zone ?? '',
          evn: r.evn ?? null,
          bilanData: r.bilanData ?? {},
        }))
        const evolutionIntermediaires = intermediaires.map((r, i) => ({
          num: i + 1,
          date: r.dateBilan,
          zone: r.zone ?? '',
          data: r.data ?? {},
        }))
        const evolutionSeances = notes.map(r => ({
          num: r.numSeance,
          date: r.dateSeance,
          zone: r.zone ?? '',
          data: r.data ?? {},
        }))
        const currentZoneLabel = targetBt ? BILAN_ZONE_LABELS[targetBt] : undefined
        const closedAntecedents = targetBt ? getClosedAntecedents(patKey, targetBt) : []
        return (
          <Suspense fallback={<LazyFallback />}>
          <BilanEvolutionIA
            apiKey={apiKey}
            context={{
              patient: { nom: formData.nom, prenom: formData.prenom, dateNaissance: formData.dateNaissance, profession: formData.profession, sport: formData.sport, antecedents: formData.famille },
              bilans: evolutionBilans,
              intermediaires: evolutionIntermediaires,
              seances: evolutionSeances,
              currentZoneLabel,
              closedAntecedents,
              therapistProfession: profile.profession,
            }}
            patientKey={`${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()}
            profession={profile.profession}
            onAudit={recordAIAudit}
            onBack={() => { setEvolutionZoneType(null); setStep('database') }}
            onClose={() => { setEvolutionZoneType(null); setStep('database') }}
            onGoToProfile={() => { setProfileEditDraft(profile); setStep('profile') }}
            onExportPDF={(evolution) => {
              const hasText = (v: string | undefined | null): v is string => !!v && v.trim().length > 0
              const sanitizeCell = (v: string) => v.replace(/\|/g, '/').replace(/\s+/g, ' ').trim()

              // Accord grammatical selon le sexe (règle Phase E §4)
              const isFem = formData.sexe === 'feminin'
              const Patient = isFem ? 'La patiente' : 'Le patient'
              const ageWord = isFem ? 'âgée' : 'âgé'
              const neWord = isFem ? 'née' : 'né'
              const suiviWord = isFem ? 'Suivie' : 'Suivi'

              // Bornes temporelles de la PEC (min/max sur bilans + intermédiaires + séances)
              const parseFr = (s: string): number => {
                const [d, m, y] = s.split('/').map(Number)
                return d && m && y ? new Date(y, m - 1, d).getTime() : 0
              }
              const allDates = [
                ...evolutionBilans.map(b => b.date),
                ...evolutionIntermediaires.map(i => i.date),
                ...evolutionSeances.map(s => s.date),
              ].filter(Boolean)
              const sortedTs = allDates.map(parseFr).filter(t => t > 0).sort((a, b) => a - b)
              const dateDebut = sortedTs.length
                ? allDates.find(d => parseFr(d) === sortedTs[0]) ?? null
                : null
              const dateFin = sortedTs.length
                ? allDates.find(d => parseFr(d) === sortedTs[sortedTs.length - 1]) ?? null
                : null
              const dureeJours = sortedTs.length > 1
                ? Math.max(0, Math.round((sortedTs[sortedTs.length - 1] - sortedTs[0]) / 86400000))
                : 0

              const motif = currentZoneLabel ?? evolutionBilans[0]?.zone ?? ''
              const age = formData.dateNaissance ? computeAge(formData.dateNaissance) : null

              const md: string[] = []

              // SECTION 1 — Contexte de la prise en charge (prose déterministe)
              md.push('### 1. Contexte de la prise en charge')
              const contextLines: string[] = []
              const identityBits: string[] = []
              if (age !== null) identityBits.push(`${ageWord} de ${age} ans`)
              if (formData.dateNaissance) identityBits.push(`${neWord} le ${formData.dateNaissance}`)
              contextLines.push(`${Patient}${identityBits.length ? ', ' + identityBits.join(', ') : ''}.`)

              const profSportBits: string[] = []
              if (hasText(formData.profession)) profSportBits.push(`profession : ${formData.profession}`)
              if (hasText(formData.sport)) profSportBits.push(`activité sportive : ${formData.sport}`)
              if (profSportBits.length) contextLines.push(profSportBits.join(' ; ').replace(/^./, c => c.toUpperCase()) + '.')

              if (motif) contextLines.push(`${suiviWord} en rééducation pour ${motif.toLowerCase()}.`)

              if (dateDebut && dateFin) {
                const seancesTotal = evolutionSeances.length
                const bilansTotal = evolutionBilans.length + evolutionIntermediaires.length
                const duree = dureeJours > 0
                  ? `Prise en charge du ${dateDebut} au ${dateFin}, soit ${dureeJours} jour${dureeJours > 1 ? 's' : ''}`
                  : `Prise en charge au ${dateDebut}`
                const bilanTxt = bilansTotal > 0 ? `${bilansTotal} bilan${bilansTotal > 1 ? 's' : ''}` : ''
                const seanceTxt = seancesTotal > 0
                  ? `${seancesTotal} séance${seancesTotal > 1 ? 's' : ''} documenté${seancesTotal > 1 ? 'es' : 'e'}`
                  : ''
                const details = [bilanTxt, seanceTxt].filter(Boolean).join(' et ')
                contextLines.push(details ? `${duree} — ${details}.` : `${duree}.`)
              }
              md.push(contextLines.join(' '))
              md.push('')

              // SECTION 2 — Tableau clinique initial
              md.push('### 2. Tableau clinique initial')
              md.push(hasText(evolution.tableauInitial) ? evolution.tableauInitial : '—')
              md.push('')

              // SECTION 3 — Évolution clinique (fusion prose, sans sous-titres)
              md.push('### 3. Évolution clinique')
              const ev = evolution.evolutionClinique
              const evolutionParagraphs: string[] = []
              if (ev) {
                if (hasText(ev.syntheseGlobale)) evolutionParagraphs.push(ev.syntheseGlobale)
                if (hasText(ev.evolutionSymptomatique)) evolutionParagraphs.push(ev.evolutionSymptomatique)
                if (hasText(ev.evolutionFonctionnelle)) evolutionParagraphs.push(ev.evolutionFonctionnelle)
                if (hasText(ev.evolutionObjective)) evolutionParagraphs.push(ev.evolutionObjective)
              }
              if (evolutionParagraphs.length) {
                evolutionParagraphs.forEach((p, i) => {
                  md.push(p)
                  if (i < evolutionParagraphs.length - 1) md.push('')
                })
              } else {
                md.push('—')
              }
              md.push('')

              // SECTION 4 — Chronologie du suivi (tableau GFM)
              md.push('### 4. Chronologie du suivi')
              if (evolution.progression.length) {
                md.push('| Date | Étape | EVN | Observation clinique |')
                md.push('| --- | --- | --- | --- |')
                evolution.progression.forEach(p => {
                  const date = sanitizeCell(p.date ?? '—')
                  const etape = sanitizeCell(p.etape ?? `Étape ${p.bilanNum}`)
                  const evn = p.evn != null ? String(p.evn) : '—'
                  const obs = sanitizeCell(p.commentaire ?? '—')
                  md.push(`| ${date} | ${etape} | ${evn} | ${obs} |`)
                })
              } else {
                md.push('—')
              }
              md.push('')

              // SECTION 5 — Interventions réalisées (fusion prose)
              md.push('### 5. Interventions réalisées')
              const ir = evolution.interventionsRealisees
              const interventionParagraphs: string[] = []
              if (ir) {
                if (hasText(ir.techniquesManuelles)) interventionParagraphs.push(ir.techniquesManuelles)
                if (hasText(ir.exercicesProgrammes)) interventionParagraphs.push(ir.exercicesProgrammes)
                if (hasText(ir.educationConseils)) interventionParagraphs.push(ir.educationConseils)
              }
              if (interventionParagraphs.length) {
                interventionParagraphs.forEach((p, i) => {
                  md.push(p)
                  if (i < interventionParagraphs.length - 1) md.push('')
                })
              } else {
                md.push('—')
              }
              md.push('')

              // SECTION 6 — État actuel et recommandations
              md.push('### 6. État actuel et recommandations')
              const ea = evolution.etatActuel
              const etatParagraphs: string[] = []
              if (ea) {
                if (hasText(ea.symptomes)) etatParagraphs.push(ea.symptomes)
                if (hasText(ea.fonctionnel)) etatParagraphs.push(ea.fonctionnel)
                if (hasText(ea.objectif)) etatParagraphs.push(ea.objectif)
              }
              etatParagraphs.forEach((p, i) => {
                md.push(p)
                if (i < etatParagraphs.length - 1) md.push('')
              })
              if (etatParagraphs.length) md.push('')

              // pointsForts / pointsVigilance : vraies puces (pas de format hybride
              // "intro : item1 ; item2 ; item3." qui mélange prose et liste).
              if (evolution.pointsForts.length) {
                const intro = evolution.pointsForts.length > 1
                  ? 'Plusieurs éléments favorables sont à souligner :'
                  : 'Un élément favorable est à souligner :'
                md.push(intro)
                evolution.pointsForts.forEach(pt => md.push(`- ${pt.replace(/\.$/, '')}.`))
                md.push('')
              }
              if (evolution.pointsVigilance.length) {
                const intro = evolution.pointsVigilance.length > 1
                  ? 'Plusieurs points de vigilance sont à noter :'
                  : 'Un point de vigilance est à noter :'
                md.push(intro)
                evolution.pointsVigilance.forEach(pt => md.push(`- ${pt.replace(/\.$/, '')}.`))
                md.push('')
              }
              if (evolution.recommandations.length) {
                evolution.recommandations.forEach(r => {
                  md.push(`- **${r.titre}** — ${r.detail}`)
                })
                md.push('')
              }

              // SECTION 7 — Conclusion et signature (signature rendue automatiquement sous ce titre)
              md.push('### 7. Conclusion et signature')
              md.push(hasText(evolution.conclusion) ? evolution.conclusion : '—')

              setPdfPreviewMarkdown(md.join('\n'))
              setPdfPreviewZone(currentZoneLabel ?? '')
              setPdfPreviewTitle("RAPPORT D'ÉVOLUTION EN PHYSIOTHÉRAPIE")
              setPdfPreviewSignatureTitle(null)
              setPdfPreviewFilenamePrefix('Rapport_Evolution')
              setPdfPreviewSource('evolution')
              setPdfPreviewPatientKey(selectedPatient ?? '')
              setStep('pdf_preview')
            }}
          />
          </Suspense>
        )
      })()}

      {/* ── Note de séance step ────────────────────────────────────────────────── */}
      {step === 'note_seance' && (() => {
        const bilanType = getBilanType(noteSeanceZone ?? '')
        const ZONE_LABELS: Record<string, string> = {
          epaule: 'Épaule', cheville: 'Cheville', genou: 'Genou', hanche: 'Hanche',
          cervical: 'Rachis Cervical', lombaire: 'Rachis Lombaire', generique: 'Bilan Général', geriatrique: 'Bilan Gériatrique',
        }
        const patKey = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
        const numSeance = currentNoteSeanceId !== null
          ? (dbNotes.find(r => r.id === currentNoteSeanceId)?.numSeance ?? '?')
          : String(getPatientNotes(patKey).filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === bilanType).length + 1)
        return (
          <>
            <header className="screen-header" style={{ marginBottom: '0.5rem' }}>
              <button className="btn-back" onClick={() => { setCurrentNoteSeanceId(null); setCurrentNoteSeanceData(null); setNoteSeanceZone(null); setStep('database') }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)' }}>Note de séance n°{numSeance}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formData.nom} {formData.prenom} · {ZONE_LABELS[bilanType]}</div>
              </div>
            </header>

            <div className="scroll-area" style={{ paddingBottom: '9rem' }}>
              <NoteSeance key={currentNoteSeanceId ?? `new-note-${noteSeanceZone}`} ref={noteSeanceRef} initialData={currentNoteSeanceData ?? undefined} zone={noteSeanceZone ?? undefined} onGenerateExercices={handleGenerateExercices} onExportExercicesPDF={handleExportExercicesPDF} />
            </div>

            <div className="fixed-bottom">
              <button
                style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(45,90,75,0.25)' }}
                onClick={handleSaveNote}>
                Enregistrer la note de séance
              </button>
            </div>
          </>
        )
      })()}

      {/* ── Bilan intermédiaire step ───────────────────────────────────────────── */}
      {step === 'bilan_intermediaire' && (() => {
        const bilanType = getBilanType(bilanIntermediaireZone ?? '')
        const ZONE_LABELS: Record<string, string> = {
          epaule: 'Épaule', cheville: 'Cheville', genou: 'Genou', hanche: 'Hanche',
          cervical: 'Rachis Cervical', lombaire: 'Rachis Lombaire', generique: 'Bilan Général', geriatrique: 'Bilan Gériatrique',
        }
        return (
          <div className="general-info-screen fade-in">
            <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-color)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
              <button onClick={() => { setCurrentBilanIntermediaireId(null); setCurrentBilanIntermediaireData(null); setBilanIntermediaireZone(null); setStep('database') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-md)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Retour
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-dark)' }}>Bilan intermédiaire</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formData.nom} {formData.prenom} · {ZONE_LABELS[bilanType]}</div>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>Intermédiaire</span>
            </div>

            <div className="scroll-area" style={{ padding: '1rem', paddingBottom: '9rem' }}>
              <h2 className="title-section" style={{ marginBottom: 0 }}>Bilan intermédiaire — {ZONE_LABELS[bilanType]}</h2>
              <div style={{ marginBottom: 16 }}>
                {bilanType === 'geriatrique' ? (() => {
                  // Récupérer le dernier bilan initial gériatrique du patient pour fournir la baseline
                  const patKey = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
                  const geriatricBilans = db
                    .filter(r => `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim() === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === 'geriatrique' && r.status === 'complet')
                    .sort((a, b) => b.id - a.id)
                  const baseline = geriatricBilans[0]?.bilanData
                  return (
                    <BilanIntermediaireGeriatrique
                      key={currentBilanIntermediaireId ?? `new-inter-geriatrique`}
                      ref={bilanIntermediaireGeriatriqueRef}
                      baseline={baseline}
                      initialData={currentBilanIntermediaireData ?? undefined}
                    />
                  )
                })() : (
                  <BilanIntermediaire key={currentBilanIntermediaireId ?? `new-inter-${bilanIntermediaireZone}`} ref={bilanIntermediaireRef} bilanType={bilanType} initialData={currentBilanIntermediaireData ?? undefined} />
                )}
              </div>
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border-color)', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 100 }}>
              <button
                style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #ea580c, #c2410c)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                onClick={() => handleSaveIntermediaire('complet')}>
                Enregistrer le bilan intermédiaire
              </button>
              <button
                style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--radius-lg)', background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
                onClick={() => handleSaveIntermediaire('incomplet')}>
                Sauvegarder (incomplet)
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Note diagnostique intermédiaire step ─────────────────────────────── */}
      {step === 'note_intermediaire' && currentIntermediaireForNote && (
        <Suspense fallback={<LazyFallback />}>
        <BilanNoteIntermediaire
          apiKey={apiKey}
          patient={{ nom: formData.nom, prenom: formData.prenom, dateNaissance: formData.dateNaissance }}
          patientKey={currentIntermediaireForNote.patientKey}
          profession={profile.profession}
          onAudit={recordAIAudit}
          zone={currentIntermediaireForNote.zone ?? ''}
          bilanType={currentIntermediaireForNote.bilanType ?? getBilanType(currentIntermediaireForNote.zone ?? '')}
          intermData={currentIntermediaireForNote.data ?? {}}
          historique={currentIntermediaireHistorique}
          closedAntecedents={getClosedAntecedents(currentIntermediaireForNote.patientKey, currentIntermediaireForNote.bilanType ?? getBilanType(currentIntermediaireForNote.zone ?? ''))}
          seances={(() => {
            const patKey = currentIntermediaireForNote.patientKey
            const bt = currentIntermediaireForNote.bilanType ?? getBilanType(currentIntermediaireForNote.zone ?? '')
            return dbNotes
              .filter(n => n.patientKey === patKey && (n.bilanType ?? getBilanType(n.zone ?? '')) === bt)
              .sort((a, b) => a.id - b.id)
              .map(n => ({
                date: n.dateSeance, numSeance: n.numSeance, eva: n.data.eva, observance: n.data.observance,
                evolution: n.data.evolution, interventions: n.data.interventions, tolerance: n.data.tolerance,
                toleranceDetail: n.data.toleranceDetail, prochaineEtape: n.data.prochaineEtape,
                noteSubjective: n.data.noteSubjective,
                analyseIA: n.analyseIA ? { resume: n.analyseIA.resume, evolution: n.analyseIA.evolution, focus: n.analyseIA.focus, conseil: n.analyseIA.conseil } : null,
                ficheExercice: n.ficheExercice,
              }))
          })()}
          cached={currentIntermediaireForNote.analyseIA ?? null}
          onResult={(analyse) => {
            setDbIntermediaires(prev => prev.map(r =>
              r.id === currentIntermediaireForNote.id ? { ...r, analyseIA: analyse } : r
            ))
            setCurrentIntermediaireForNote(prev => prev ? { ...prev, analyseIA: analyse } : prev)
            showToast('Note diagnostique générée', 'success')
          }}
          onBack={() => setStep('database')}
          onGoToProfile={() => { setProfileEditDraft(profile); setStep('profile') }}
          onFicheExercice={() => {
            setFicheBackStep('database')
            setStep('fiche_exercice')
          }}
        />
        </Suspense>
      )}

      {/* ── PDF Preview step ──────────────────────────────────────────────────── */}
      {step === 'pdf_preview' && (
        <PDFPreview
          patient={{
            nom: formData.nom,
            prenom: formData.prenom,
            dateNaissance: formData.dateNaissance,
            sexe: (formData.sexe === 'masculin' || formData.sexe === 'feminin') ? formData.sexe : undefined,
          }}
          zone={pdfPreviewZone}
          markdown={pdfPreviewMarkdown}
          pdfTitle={pdfPreviewTitle}
          signatureTitle={pdfPreviewSignatureTitle}
          filenamePrefix={pdfPreviewFilenamePrefix}
          praticien={{
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
            signatureImage: profile.signatureImage,
          }}
          onExported={(blob, fileName) => {
            attachPdfToPatient(blob, fileName, pdfPreviewPatientKey, pdfPreviewSource)
          }}
          onBack={() => {
            setPdfPreviewSignatureTitle(undefined)
            setPdfPreviewFilenamePrefix(undefined)
            setStep('database')
          }}
        />
      )}

      {/* ── Analyse IA step ────────────────────────────────────────────────────── */}
      {step === 'analyse_ia' && (
        <Suspense fallback={<LazyFallback />}>
        <BilanAnalyseIA
          apiKey={apiKey}
          context={{
            patient: { nom: formData.nom, prenom: formData.prenom, dateNaissance: formData.dateNaissance, profession: formData.profession, sport: formData.sport, antecedents: formData.famille },
            zone: selectedBodyZone ?? '',
            bilanType: getBilanType(selectedBodyZone ?? ''),
            bilanData: currentBilanDataOverride ?? getBilanData() ?? {},
            notesLibres: bilanNotes,
            therapist: { specialites: profile.specialites, techniques: profile.techniques, equipements: profile.equipements, autresCompetences: profile.autresCompetences },
            therapistProfession: profile.profession,
            closedAntecedents: getClosedAntecedents(`${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim(), getBilanType(selectedBodyZone ?? '')),
          }}
          patientKey={`${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()}
          profession={profile.profession}
          onAudit={recordAIAudit}
          onUnmaskedDocsConfirm={askUnmaskedDocsConfirm}
          documents={bilanDocuments.length > 0 ? bilanDocuments : undefined}
          cached={currentAnalyseIA}
          onResult={(analyse) => {
            setCurrentAnalyseIA(analyse)
            if (currentBilanId !== null) {
              setDb(prev => prev.map(r => r.id === currentBilanId ? { ...r, analyseIA: analyse } : r))
            }
            showToast('Analyse générée', 'success')
          }}
          onBack={() => {
            if (bilanZoneBackStep === 'database') {
              setCurrentBilanId(null)
              setCurrentBilanDataOverride(null)
              setBilanZoneBackStep('general_info')
              setStep('database')
            } else {
              setStep('bilan_zone')
            }
          }}
          onClose={() => {
            setCurrentBilanId(null)
            setCurrentBilanDataOverride(null)
            setBilanZoneBackStep('general_info')
            goToPatientRecord()
          }}
          onExport={handleExportPDF}
          exporting={exportingPDF}
          onGoToProfile={() => { setProfileEditDraft(profile); setStep('profile') }}
          onFicheExercice={() => { setFicheBackStep('analyse_ia'); setStep('fiche_exercice') }}
        />
        </Suspense>
      )}

      {/* ── Fiche Exercice IA step ────────────────────────────────────────────── */}
      {step === 'fiche_exercice' && (
        <Suspense fallback={<LazyFallback />}>
        <FicheExerciceIA
          apiKey={apiKey}
          profession={profile.profession}
          context={{
            patient: { nom: formData.nom, prenom: formData.prenom, dateNaissance: formData.dateNaissance, profession: formData.profession, sport: formData.sport, antecedents: formData.famille },
            zone: ficheExerciceContextOverride?.zone ?? selectedBodyZone ?? '',
            bilanType: getBilanType(ficheExerciceContextOverride?.zone ?? selectedBodyZone ?? ''),
            bilanData: ficheExerciceContextOverride?.bilanData ?? currentBilanDataOverride ?? getBilanData() ?? {},
            notesLibres: ficheExerciceContextOverride?.notesLibres ?? bilanNotes,
            therapist: { specialites: profile.specialites, techniques: profile.techniques, equipements: profile.equipements, autresCompetences: profile.autresCompetences },
            closedAntecedents: getClosedAntecedents(selectedPatient ?? `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim(), getBilanType(ficheExerciceContextOverride?.zone ?? selectedBodyZone ?? '')),
            patientHistory: (() => {
              const patKey = selectedPatient ?? `${formData.nom}_${formData.prenom}_${formData.dateNaissance}`
              const currentZone = ficheExerciceContextOverride?.zone ?? selectedBodyZone ?? ''
              const currentBt = getBilanType(currentZone)
              const history: import('./utils/clinicalPrompt').PatientHistoryEntry[] = []
              // Scope strict à la zone courante (on ne mélange pas les PEC)
              for (const b of getPatientBilans(patKey)) {
                if ((b.bilanType ?? getBilanType(b.zone ?? '')) !== currentBt) continue
                history.push({ type: 'bilan', date: b.dateBilan, zone: b.zone ?? '', evn: b.evn, data: b.bilanData as Record<string, unknown> | undefined, ficheExercice: b.ficheExercice })
              }
              for (const b of getPatientIntermediaires(patKey)) {
                if ((b.bilanType ?? getBilanType(b.zone ?? '')) !== currentBt) continue
                history.push({ type: 'intermediaire', date: b.dateBilan, zone: b.zone ?? '', data: b.data, analyseIA: b.analyseIA ? { resume: b.analyseIA.noteDiagnostique.description, evolution: b.analyseIA.noteDiagnostique.evolution } : null, ficheExercice: b.ficheExercice })
              }
              for (const n of getPatientNotes(patKey)) {
                if ((n.bilanType ?? getBilanType(n.zone ?? '')) !== currentBt) continue
                history.push({ type: 'note_seance', date: n.dateSeance, zone: n.zone ?? '', noteData: n.data, analyseIA: n.analyseIA ? { focus: n.analyseIA.focus } : null, ficheExercice: n.ficheExercice })
              }
              return history
            })(),
          }}
          patientKey={selectedPatient ?? `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()}
          onAudit={recordAIAudit}
          analyseIA={ficheExerciceContextOverride ? null : currentAnalyseIA}
          cached={
            ficheExerciceSource?.type === 'note' ? (dbNotes.find(n => n.id === ficheExerciceSource.id)?.ficheExercice ?? null)
            : ficheExerciceSource?.type === 'intermediaire' ? (dbIntermediaires.find(r => r.id === ficheExerciceSource.id)?.ficheExercice ?? null)
            : currentBilanId !== null ? (db.find(r => r.id === currentBilanId)?.ficheExercice ?? null)
            : null
          }
          onResult={(fiche: FicheExercice) => {
            if (ficheExerciceSource?.type === 'note') {
              setDbNotes(prev => prev.map(n => n.id === ficheExerciceSource.id ? { ...n, ficheExercice: fiche } : n))
            } else if (ficheExerciceSource?.type === 'intermediaire') {
              setDbIntermediaires(prev => prev.map(r => r.id === ficheExerciceSource.id ? { ...r, ficheExercice: fiche } : r))
            } else if (currentBilanId !== null) {
              setDb(prev => prev.map(r => r.id === currentBilanId ? { ...r, ficheExercice: fiche } : r))
            }
            // Ajouter les exercices à la banque
            const parsed = parseExercicesFromMarkdown(fiche.markdown)
            if (parsed.length > 0) {
              const zone = ficheExerciceContextOverride?.zone ?? selectedBodyZone ?? ''
              const bt = getBilanType(zone)
              setDbExerciceBank(prev => addExercicesToBank(prev, parsed, zone, bt))
            }
            showToast('Fiche d\'exercices générée', 'success')
          }}
          onBack={() => { setFicheExerciceContextOverride(null); setFicheExerciceSource(null); setStep(ficheBackStep) }}
          onClose={() => { setFicheExerciceContextOverride(null); setFicheExerciceSource(null); setCurrentBilanDataOverride(null); goToPatientRecord() }}
          onGoToProfile={() => { setProfileEditDraft(profile); setStep('profile') }}
        />
        </Suspense>
      )}

      {/* ── Modal : confirmation envoi documents non masqués ─── */}
      {unmaskedPrompt && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200, padding: '1rem' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-2xl)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.1rem 1.3rem 0.8rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--primary-dark)' }}>Documents non anonymisés</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {unmaskedPrompt.docs.length} document{unmaskedPrompt.docs.length > 1 ? 's' : ''} va être envoyé{unmaskedPrompt.docs.length > 1 ? 's' : ''} sans avoir été passé{unmaskedPrompt.docs.length > 1 ? 's' : ''} par l'outil de masquage. Ces documents peuvent contenir des données identifiantes (nom, adresse, N° sécu, médecin traitant).
                  </p>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.9rem 1.3rem' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Documents concernés
              </div>
              {unmaskedPrompt.docs.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 'var(--radius-md)', marginBottom: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '0.82rem', color: '#78350f', fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#92400e' }}>{d.mimeType}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, padding: '0.7rem 0.85rem', background: 'var(--info-soft)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--primary)', lineHeight: 1.5 }}>
                <strong>Conseil :</strong> annulez cet envoi, retournez à l'étape précédente et retirez les documents ou remplacez-les par des versions masquées (gommer noms, dates de naissance, adresses avec l'outil de masquage).
              </div>
            </div>
            <div style={{ padding: '0.9rem 1.3rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 10 }}>
              <button
                onClick={() => { unmaskedPrompt.resolve(false); setUnmaskedPrompt(null) }}
                style={{ flex: 1.3, padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                Annuler l'envoi
              </button>
              <button
                onClick={() => { unmaskedPrompt.resolve(true); setUnmaskedPrompt(null) }}
                style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: 'transparent', color: '#92400e', border: '1.5px solid #fbbf24', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                Envoyer quand même
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Courrier (letter) step ───────────────────────────────────────────── */}
      {step === 'letter' && selectedPatient && (() => {
        const letterBt: BilanType | null = selectedBodyZone ? getBilanType(selectedBodyZone) : null
        const matchBt = (bt?: BilanType, zone?: string) => letterBt == null || (bt ?? getBilanType(zone ?? '')) === letterBt
        const scopedBilans = getPatientBilans(selectedPatient).filter(r => matchBt(r.bilanType, r.zone))
        const scopedInters = getPatientIntermediaires(selectedPatient).filter(r => matchBt(r.bilanType, r.zone))
        const scopedNotes = getPatientNotes(selectedPatient).filter(r => matchBt(r.bilanType, r.zone))
        return (
        <ErrorBoundary onReset={() => setStep('database')}>
        <Suspense fallback={<LazyFallback />}>
          <LetterGenerator
            profile={profile}
            apiKey={apiKey}
            patientKey={selectedPatient}
            bilans={scopedBilans}
            intermediaires={scopedInters}
            notes={scopedNotes}
            existingLetters={dbLetters.filter(l => l.patientKey === selectedPatient)}
            onSave={(letter) => {
              setDbLetters(prev => {
                const exists = prev.some(l => l.id === letter.id)
                return exists
                  ? prev.map(l => l.id === letter.id ? letter : l)
                  : [...prev, letter]
              })
            }}
            onDelete={(id) => {
              setDbLetters(prev => prev.filter(l => l.id !== id))
            }}
            onAudit={(entry) => {
              setDbLetterAudit(prev => [...prev, entry])
            }}
            onBack={() => { setStep('database'); setInitialLetterType(null); setBilanSortieForLetter(null) }}
            showToast={showToast}
            initialType={initialLetterType as import('./types').LetterType | null}
            bilanSortieData={bilanSortieForLetter}
          />
        </Suspense>
        </ErrorBoundary>
        )
      })()}

      {/* ── Bilan de sortie step ──────────────────────────────────────────── */}
      {step === 'bilan_sortie' && selectedPatient && (() => {
        const sortieBt: BilanType | null = selectedBodyZone ? getBilanType(selectedBodyZone) : null
        const matchBt = (bt?: BilanType, zone?: string) => sortieBt == null || (bt ?? getBilanType(zone ?? '')) === sortieBt
        const patBilans = getPatientBilans(selectedPatient).filter(r => (r.status === 'complet' || r.bilanData) && matchBt(r.bilanType, r.zone))
        const firstBilan = patBilans[0]
        const lastBilan = patBilans[patBilans.length - 1]
        const notes = getPatientNotes(selectedPatient).filter(r => matchBt(r.bilanType, r.zone))
        const rx = dbPrescriptions.find(p => p.patientKey === selectedPatient)
        return (
          <>
            <header className="screen-header" style={{ padding: '0 1.5rem', marginBottom: '0.5rem' }}>
              <button className="btn-back" onClick={() => setStep('database')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{ flex: 1 }}>
                <h2 className="title-section" style={{ marginBottom: 0 }}>Bilan de sortie</h2>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formData.nom} {formData.prenom}</p>
              </div>
            </header>
            <div className="scroll-area" style={{ padding: '0 1.5rem', paddingBottom: '9rem' }}>
            <Suspense fallback={<LazyFallback />}>
              <BilanSortie
                ref={(handle: import('./components/BilanSortie').BilanSortieHandle | null) => {
                  if (handle) (window as unknown as Record<string, unknown>).__bilanSortieRef = handle
                }}
                patientName={`${formData.nom} ${formData.prenom}`}
                zone={selectedBodyZone ?? lastBilan?.zone ?? ''}
                initialBilanData={firstBilan ? {
                  evn: firstBilan.evn ?? (() => {
                    const d = firstBilan.bilanData?.douleur as Record<string, unknown> | undefined
                    const v = d?.evnPire ?? d?.evnMvt ?? d?.evnRepos ?? d?.evnMoy
                    return v != null ? Number(v) : undefined
                  })(),
                  scores: {
                    ...((firstBilan.bilanData?.scores as Record<string, unknown>) ?? {}),
                    // Gériatrique: scores stockés dans tests
                    ...((firstBilan.bilanData?.tests as Record<string, unknown>) ?? {}),
                  },
                  dateBilan: firstBilan.dateBilan,
                  bilanData: firstBilan.bilanData,
                } : undefined}
                currentEvn={lastBilan?.evn ?? (() => {
                  const d = lastBilan?.bilanData?.douleur as Record<string, unknown> | undefined
                  const v = d?.evnPire ?? d?.evnMvt ?? d?.evnRepos ?? d?.evnMoy
                  return v != null ? Number(v) : undefined
                })()}
                noteCount={notes.length}
                bilanCount={patBilans.length + getPatientIntermediaires(selectedPatient ?? '').filter(r => matchBt(r.bilanType, r.zone)).length}
                prescribedSessions={(() => { const list = rx?.prescriptions ?? (rx?.nbSeancesPrescrites ? [{ nbSeances: rx.nbSeancesPrescrites }] : []); return list.reduce((s: number, r: { nbSeances: number }) => s + r.nbSeances, 0) || undefined })()}
                notes={notes.map(n => ({ numSeance: n.numSeance, dateSeance: n.dateSeance, data: n.data as unknown as { eva: string; evolution: string; tolerance: string; interventions: string[]; detailDosage?: string; prochaineEtape?: string[]; noteSubjective?: string; observance?: string } }))}
                smartObjectifs={dbObjectifs.filter(o => o.patientKey === selectedPatient).map(o => ({ titre: o.titre, status: o.status }))}
                lastIntermediaire={(() => { const inters = getPatientIntermediaires(selectedPatient ?? '').filter(r => matchBt(r.bilanType, r.zone)); return inters.length > 0 ? inters[inters.length - 1].data ?? {} : undefined })()}
                onGenerateLetter={(type) => {
                  const handle = (window as unknown as Record<string, unknown>).__bilanSortieRef as import('./components/BilanSortie').BilanSortieHandle | undefined
                  const sortieData = handle?.getData() ?? null
                  setBilanSortieForLetter(sortieData as Record<string, unknown> | null)
                  setInitialLetterType(type === 'fin_anticipee' ? 'fin_pec_anticipee' : 'fin_pec')
                  setStep('letter')
                }}
                onGenerateSynthese={async () => {
                  const handle = (window as unknown as Record<string, unknown>).__bilanSortieRef as import('./components/BilanSortie').BilanSortieHandle | undefined
                  if (!handle) return
                  showToast('Création de la synthèse…', 'success')
                  const maxRetries = 2
                  for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    try {
                      const patKey = selectedPatient ?? ''
                      const allBilans = getPatientBilans(patKey).filter(r => (r.status === 'complet' || r.bilanData) && matchBt(r.bilanType, r.zone))
                      const allInters = getPatientIntermediaires(patKey).filter(r => matchBt(r.bilanType, r.zone))
                      const allNotes = getPatientNotes(patKey).filter(r => matchBt(r.bilanType, r.zone))
                      const closedLines = sortieBt ? getClosedAntecedents(patKey, sortieBt) : []
                      const historiqueStr = [
                        ...allBilans.map(b => `Bilan initial ${b.dateBilan} — EVN ${b.evn ?? '?'}/10 — Zone: ${b.zone ?? '?'}`),
                        ...allInters.map(r => { const tc = (r.data?.troncCommun as Record<string, unknown>) ?? {}; return `Bilan intermédiaire ${r.dateBilan} — EVN ${(tc.evn as Record<string, unknown>)?.pireActuel ?? '?'}/10` }),
                        ...allNotes.map(n => `Séance n°${n.numSeance} ${n.dateSeance} — EVA ${n.data.eva}/10 — ${n.data.evolution} — Interventions: ${n.data.interventions.join(', ')}`),
                        ...(closedLines.length > 0 ? ['', 'Antécédents d\'autres PEC (clôturées, contexte) :', ...closedLines.map(l => `- ${l}`)] : [])
                      ].join('\n')
                      const raw = await callClaudeSecure({
                        apiKey,
                        systemPrompt: 'Tu es un kinésithérapeute expert. Génère une synthèse clinique de fin de prise en charge. Sois professionnel, concis et structuré. Réponds UNIQUEMENT en JSON valide.',
                        userPrompt: `HISTORIQUE COMPLET DU PATIENT :\n${historiqueStr}\n\nGénère en JSON :\n{"resumePEC":"résumé complet de la prise en charge (techniques, progression, nombre de séances)","resultatsObtenus":"résultats cliniques obtenus (EVN, scores, gains fonctionnels)","facteursLimitants":"facteurs limitants rencontrés pendant la PEC (si aucun, mettre 'Aucun facteur limitant identifié')"}`,
                        maxOutputTokens: 4096, jsonMode: true,
                        patient: { nom: formData.nom, prenom: formData.prenom, patientKey: patKey },
                        category: 'bilan_analyse', onAudit: recordAIAudit,
                      })
                      const parsed = JSON.parse(raw)
                      const current = handle.getData()
                      handle.setData({ ...current, resumePEC: stripMd(parsed.resumePEC ?? ''), resultatsObtenus: stripMd(parsed.resultatsObtenus ?? ''), facteursLimitants: stripMd(parsed.facteursLimitants ?? '') })
                      showToast('Synthèse créée', 'success')
                      return
                    } catch (err) {
                      console.warn(`[BilanSortie] Synthèse attempt ${attempt + 1} failed:`, err)
                      if (attempt < maxRetries) {
                        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
                      } else {
                        showToast('Erreur — réessayez dans quelques secondes', 'error')
                      }
                    }
                  }
                }}
                onGenerateRecommandations={async () => {
                  const handle = (window as unknown as Record<string, unknown>).__bilanSortieRef as import('./components/BilanSortie').BilanSortieHandle | undefined
                  if (!handle) return
                  showToast('Création des recommandations…', 'success')
                  const maxRetries = 2
                  for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    try {
                      const patKey = selectedPatient ?? ''
                      const allNotes = getPatientNotes(patKey).filter(r => matchBt(r.bilanType, r.zone))
                      const lastNote = allNotes[allNotes.length - 1]
                      const allBilans = getPatientBilans(patKey).filter(r => (r.status === 'complet' || r.bilanData) && matchBt(r.bilanType, r.zone))
                      const firstBilanData = allBilans[0]?.bilanData
                      const contrat = ((firstBilanData?.contratKine ?? firstBilanData?.contrat) as Record<string, unknown>) ?? {}
                      const fichesExo: string[] = []
                      for (const b of allBilans) { if (b.ficheExercice?.markdown) fichesExo.push(b.ficheExercice.markdown) }
                      for (const n of allNotes) { if ((n as unknown as { ficheExercice?: { markdown?: string } }).ficheExercice?.markdown) fichesExo.push((n as unknown as { ficheExercice: { markdown: string } }).ficheExercice.markdown) }
                      const dosages = allNotes.filter(n => n.data.detailDosage).map(n => `Séance ${n.numSeance}: ${n.data.detailDosage}`)
                      const interventions = Array.from(new Set(allNotes.flatMap(n => n.data.interventions)))
                      const raw = await callClaudeSecure({
                        apiKey,
                        systemPrompt: `Tu es un kinésithérapeute expert. Génère des recommandations de fin de prise en charge.

RÈGLE ABSOLUE : Tu ne dois JAMAIS inventer d'exercices ou d'activités que le patient n'a pas fait pendant sa prise en charge. Base-toi UNIQUEMENT sur les exercices effectivement prescrits et les interventions réalisées listés ci-dessous. Si tu n'as pas assez d'informations sur les exercices, écris simplement "Poursuivre les exercices mis en place durant le traitement avec les dosages habituels."

Réponds UNIQUEMENT en JSON valide.`,
                        userPrompt: `Zone: ${selectedBodyZone ?? 'non précisée'}
Dernière EVA: ${lastNote?.data.eva ?? '?'}/10
Dernière évolution: ${lastNote?.data.evolution ?? '?'}
Interventions réalisées: ${interventions.join(', ') || 'non renseignées'}
Objectifs SMART: ${contrat.objectifsSMART ?? contrat.objectifs ?? 'non renseignés'}
Conseils du bilan initial: ${String(firstBilanData?.conseils ?? 'non renseignés')}

EXERCICES RÉELLEMENT PRESCRITS PENDANT LA PEC :
${fichesExo.length > 0 ? fichesExo.map((f, i) => `--- Fiche ${i + 1} ---\n${f.slice(0, 500)}`).join('\n\n') : 'Aucune fiche d\'exercice enregistrée'}

DOSAGES DES SÉANCES :
${dosages.length > 0 ? dosages.join('\n') : 'Non renseignés'}

Génère en JSON :
{"autoExercices":"UNIQUEMENT les exercices déjà prescrits ci-dessus avec leurs dosages (répétitions, séries, fréquence). Ne rien inventer.","precautions":"précautions basées sur l'évolution clinique constatée","infoMedecin":"éléments factuels pour le médecin prescripteur (EVN initial/final, nombre de séances, résultats)"}`,
                        maxOutputTokens: 4096, jsonMode: true,
                        patient: { nom: formData.nom, prenom: formData.prenom, patientKey: patKey },
                        category: 'bilan_analyse', onAudit: recordAIAudit,
                      })
                      const parsed = JSON.parse(raw)
                      const current = handle.getData()
                      handle.setData({ ...current, autoExercices: stripMd(parsed.autoExercices ?? ''), precautions: stripMd(parsed.precautions ?? ''), infoMedecin: stripMd(parsed.infoMedecin ?? '') })
                      showToast('Recommandations créées', 'success')
                      return
                    } catch (err) {
                      console.warn(`[BilanSortie] Recommandations attempt ${attempt + 1} failed:`, err)
                      if (attempt < maxRetries) {
                        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
                      } else {
                        showToast('Erreur — réessayez dans quelques secondes', 'error')
                      }
                    }
                  }
                }}
              />
            </Suspense>
            </div>
            <div className="fixed-bottom">
              <button className="btn-primary-luxe" style={{ marginBottom: 8, background: 'linear-gradient(135deg, #059669, #047857)' }}
                onClick={() => {
                  const handle = (window as unknown as Record<string, unknown>).__bilanSortieRef as import('./components/BilanSortie').BilanSortieHandle | undefined
                  if (!handle) return
                  const data = handle.getData()
                  const id = Date.now()
                  setDbIntermediaires(prev => [...prev, {
                    id,
                    patientKey: selectedPatient,
                    nom: formData.nom,
                    prenom: formData.prenom,
                    dateNaissance: formData.dateNaissance,
                    dateBilan: new Date().toLocaleDateString('fr-FR'),
                    zone: selectedBodyZone ?? lastBilan?.zone ?? '',
                    bilanType: getBilanType(selectedBodyZone ?? lastBilan?.zone ?? ''),
                    status: 'complet',
                    type: 'sortie',
                    data,
                  } as BilanIntermediaireRecord])
                  showToast('Bilan de sortie enregistré', 'success')
                  setStep('database')
                }}>
                Enregistrer le bilan de sortie
              </button>
              <button className="btn-primary-luxe" style={{ marginBottom: 0, background: 'var(--secondary)', color: 'var(--text-main)' }}
                onClick={() => setStep('database')}>
                Annuler
              </button>
            </div>
          </>
        )
      })()}
    </div>
  )
}

export default App
