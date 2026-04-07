import { useState, useRef } from 'react'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useIndexedDB } from './hooks/useIndexedDB'
import { useToast } from './hooks/useToast'
import { ToastContainer } from './components/ui/Toast'
import { BodySilhouette } from './components/BodySilhouette'
import { StaticBodyVisual } from './components/StaticBodyVisual'
import { BilanEpaule } from './components/BilanEpaule'
import type { BilanEpauleHandle } from './components/BilanEpaule'
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
import { BilanAnalyseIA } from './components/BilanAnalyseIA'
import { BilanNoteIntermediaire } from './components/BilanNoteIntermediaire'
import { BilanEvolutionIA } from './components/BilanEvolutionIA'
import { generatePDF } from './utils/pdfGenerator'
import type { ImprovementEntry } from './utils/pdfGenerator'
import { getBilanType, BODY_ZONES, BILAN_ZONE_LABELS } from './utils/bilanRouter'
import { buildPDFReportPrompt } from './utils/clinicalPrompt'
import type { BilanIntermediaireEntry } from './utils/clinicalPrompt'
import { callGemini } from './utils/geminiClient'
import type { BilanRecord, BilanIntermediaireRecord, NoteSeanceRecord, SmartObjectif, ExerciceBankEntry, ProfileData, AnalyseIA, FicheExercice, BilanDocument, PatientDocument } from './types'
import { parseExercicesFromMarkdown, addExercicesToBank, exportBankAsCSV } from './utils/parseExercices'
import { FicheExerciceIA } from './components/FicheExerciceIA'
import { DocumentMasker } from './components/DocumentMasker'
import { pdfToImages } from './utils/pdfToImages'
import { NoteSeance } from './components/NoteSeance'
import type { NoteSeanceHandle, NoteSeanceData } from './components/NoteSeance'
import { PDFPreview } from './components/PDFPreview'
import { DashboardStats } from './components/DashboardStats'
import { PatientTimeline } from './components/PatientTimeline'
import { DossierDocuments } from './components/DossierDocuments'
import { BilanResumeModal } from './components/BilanResumeModal'
import { SmartObjectifs } from './components/SmartObjectifs'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import './App.css'

type Step = 'dashboard' | 'database' | 'profile' | 'identity' | 'general_info' | 'silhouette' | 'bilan_zone' | 'bilan_intermediaire' | 'note_intermediaire' | 'note_seance' | 'pdf_preview' | 'analyse_ia' | 'evolution_ia' | 'fiche_exercice'

const DEMO_DB: BilanRecord[] = [
  { id:1,  nom:'BERGER',   prenom:'Thomas', dateNaissance:'12/05/1982', dateBilan:'15/10/2025', zoneCount:1, evn:8, zone:'Épaule Droite', pathologie:'Tendinite de la coiffe des rotateurs', avatarBg:'#3b82f6', bilanType:'epaule', status:'complet' },
  { id:2,  nom:'BERGER',   prenom:'Thomas', dateNaissance:'12/05/1982', dateBilan:'29/10/2025', zoneCount:1, evn:7, zone:'Épaule Droite', pathologie:'Tendinite de la coiffe des rotateurs', avatarBg:'#3b82f6', bilanType:'epaule', status:'complet' },
  { id:3,  nom:'BERGER',   prenom:'Thomas', dateNaissance:'12/05/1982', dateBilan:'12/11/2025', zoneCount:1, evn:5, zone:'Épaule Droite', pathologie:'Tendinite de la coiffe des rotateurs', avatarBg:'#3b82f6', bilanType:'epaule', status:'complet' },
  { id:4,  nom:'BERGER',   prenom:'Thomas', dateNaissance:'12/05/1982', dateBilan:'26/11/2025', zoneCount:1, evn:4, zone:'Épaule Droite', pathologie:'Tendinite de la coiffe des rotateurs', avatarBg:'#3b82f6', bilanType:'epaule', status:'complet' },
  { id:5,  nom:'BERGER',   prenom:'Thomas', dateNaissance:'12/05/1982', dateBilan:'10/12/2025', zoneCount:1, evn:3, zone:'Épaule Droite', pathologie:'Tendinite de la coiffe des rotateurs', avatarBg:'#3b82f6', bilanType:'epaule', status:'complet' },
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

const DEFAULT_PROFILE: ProfileData = { nom: 'William', prenom: '', profession: 'Kinésithérapeute', photo: null }

function App() {
  const [step, setStep] = useState<Step>('dashboard')
  const { toasts, showToast, removeToast } = useToast()
  // ── Persistent state (IndexedDB — no size limit) ───────────────────────────
  const [db, setDb, dbLoaded] = useIndexedDB<BilanRecord[]>('physio_db', DEMO_DB)
  const [dbIntermediaires, setDbIntermediaires, intLoaded] = useIndexedDB<BilanIntermediaireRecord[]>('physio_intermediaires_db', [])
  const [dbNotes, setDbNotes, notesLoaded] = useIndexedDB<NoteSeanceRecord[]>('physio_notes_seance_db', [])
  const [dbObjectifs, setDbObjectifs, objLoaded] = useIndexedDB<SmartObjectif[]>('physio_objectifs_db', [])
  const [dbExerciceBank, setDbExerciceBank, exLoaded] = useIndexedDB<ExerciceBankEntry[]>('physio_exercice_bank', [])
  const [dbPatientDocs, setDbPatientDocs, docsLoaded] = useIndexedDB<PatientDocument[]>('physio_patient_docs', [])
  const isOnline = useOnlineStatus()
  const [profile, setProfile, profLoaded] = useIndexedDB<ProfileData>('physio_profile', DEFAULT_PROFILE)
  const [apiKey, setApiKey, keyLoaded] = useIndexedDB<string>('physio_api_key', '')
  const allDataLoaded = dbLoaded && intLoaded && notesLoaded && objLoaded && exLoaded && docsLoaded && profLoaded && keyLoaded

  // ── Transient UI state ────────────────────────────────────────────────────────
  const [currentBilanId, setCurrentBilanId] = useState<number | null>(null)
  const [currentAnalyseIA, setCurrentAnalyseIA] = useState<AnalyseIA | null>(null)
  const [currentBilanDataOverride, setCurrentBilanDataOverride] = useState<Record<string, unknown> | null>(null)
  const [ficheBackStep, setFicheBackStep] = useState<'analyse_ia' | 'database'>('analyse_ia')
  const [ficheExerciceContextOverride, setFicheExerciceContextOverride] = useState<{ notesLibres: string; bilanData: Record<string, unknown>; zone: string } | null>(null)
  const [ficheExerciceSource, setFicheExerciceSource] = useState<{ type: 'note' | 'intermediaire'; id: number } | null>(null)
  const [bilanZoneBackStep, setBilanZoneBackStep] = useState<'identity' | 'general_info' | 'database' | 'silhouette'>('general_info')
  const [deletingBilanId, setDeletingBilanId] = useState<number | null>(null)
  const [editingLabelBilanId, setEditingLabelBilanId] = useState<number | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [resumeBilan, setResumeBilan] = useState<{ record: BilanRecord; bilanNum: number } | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [testingApiKey, setTestingApiKey] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [patientMode, setPatientMode] = useState<'new' | 'existing'>('new')
  const [silhouetteData, setSilhouetteData] = useState<Record<string, unknown>>({})
  const [bilanDocuments, setBilanDocuments] = useState<BilanDocument[]>([])
  const [maskingQueue, setMaskingQueue] = useState<Array<{ dataUrl: string; name: string; mimeType: string }>>([])
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
  const [pdfPreviewMarkdown, setPdfPreviewMarkdown] = useState('')
  const [pdfPreviewZone, setPdfPreviewZone] = useState('')
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('')
  const [profileEditDraft, setProfileEditDraft] = useState<ProfileData>(profile)
  const [apiKeyDraft, setApiKeyDraft] = useState(apiKey)

  const [formData, setFormData] = useState({
    nom: '', prenom: '', dateNaissance: '',
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
  const importDataRef    = useRef<HTMLInputElement>(null)

  const { activeField, toggleListening } = useSpeechRecognition()

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const updateField = (field: keyof typeof formData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const handleVoice = (field: keyof typeof formData) => {
    const baseText = formData[field]
    toggleListening(field, (transcript) => {
      setFormData(prev => ({ ...prev, [field]: baseText ? `${baseText} ${transcript}` : transcript }))
    })
  }

  const goToPatientRecord = () => {
    const key = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
    setSelectedPatient(key)
    setStep('database')
  }

  const handleQuitBilan = () => {
    if ((formData.nom || currentBilanId !== null) && selectedBodyZone) {
      saveBilan('incomplet')
    }
    const key = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
    resetForm()
    setSelectedBodyZone(null)
    setSelectedPatient(key)
    setStep('database')
  }

  const resetForm = () => {
    setFormData({ nom: '', prenom: '', dateNaissance: '', profession: '', sport: '', famille: '', chirurgie: '', notes: '' })
    setSilhouetteData({})
    setBilanDocuments([])
    setPatientMode('new')
    setCurrentAnalyseIA(null)
    setBilanNotes('')
    setCurrentBilanId(null)
    setCurrentBilanDataOverride(null)
    setBilanZoneBackStep('general_info')
  }

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
      if (initScores.ffaam) modScores.faamInit = initScores.ffaam
      if (initScores.cait) modScores.cumberlandInit = initScores.cait
    } else if (bilanType === 'epaule') {
      if (initScores.scoreOSS) modScores.ossInit = initScores.scoreOSS
      if (initScores.scoreConstant) modScores.constantInit = initScores.scoreConstant
      if (initScores.scoreDASH) modScores.dashInit = initScores.scoreDASH
    } else if (bilanType === 'genou') {
      if (initScores.koos) modScores.koosInit = initScores.koos
      if (initScores.ikdc) modScores.ikdcInit = initScores.ikdc
    } else if (bilanType === 'hanche') {
      if (initScores.hoos) modScores.hoosInit = initScores.hoos
      if (initScores.oxfordHip) modScores.oxfordHipInit = initScores.oxfordHip
    } else if (bilanType === 'cervical') {
      if (initScores.ndi) modScores.ndiInit = initScores.ndi
    } else if (bilanType === 'lombaire') {
      if (initScores.startBack) modScores.startBackInit = initScores.startBack
      if (initScores.eifel) modScores.eifelInit = initScores.eifel
    }

    // PSFS initial — epaule a 3 activités séparées, les autres un seul score
    const psfsInit1 = bilanType === 'epaule' ? String(initScores.psfs1 ?? '') : String(initScores.psfs ?? '')
    const psfsInit2 = bilanType === 'epaule' ? String(initScores.psfs2 ?? '') : ''
    const psfsInit3 = bilanType === 'epaule' ? String(initScores.psfs3 ?? '') : ''

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
          nom1: String(lastPs.nom1 ?? ''),
          nom2: String(lastPs.nom2 ?? ''),
          nom3: String(lastPs.nom3 ?? ''),
        },
      },
      moduleSpecifique: {
        scores: modScores,
      },
    }
  }

  const getPatientIntermediaires = (key: string) =>
    dbIntermediaires.filter(r => r.patientKey === key).sort((a, b) => a.id - b.id)

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

  const getPatientNotes = (key: string) =>
    dbNotes.filter(r => r.patientKey === key).sort((a, b) => b.id - a.id)

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

  const improvDelta = (prev: number, curr: number) => Math.round(((prev - curr) / prev) * 100)

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

  const allPatientKeys = Array.from(new Set(db.map(r => `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim())))

  const globalScore = (() => {
    const scores = allPatientKeys.map(k => patientGeneralScore(k)).filter((s): s is number => s !== null)
    if (scores.length === 0) return 0
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  })()

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

    if (currentBilanId !== null) {
      setDb(prev => prev.map(r => r.id === currentBilanId
        ? { ...r, status, bilanData: bilanData ?? undefined, bilanType, evn: evnValue ?? r.evn, notes: bilanNotes || r.notes, silhouetteData: Object.keys(silhouetteData).length > 0 ? silhouetteData : r.silhouetteData, documents: bilanDocuments.length > 0 ? bilanDocuments : r.documents }
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
        zoneCount: 1,
        zone: selectedBodyZone ?? undefined,
        pathologie: bilanData ? '' : undefined,
        avatarBg: '#3b82f6',
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
          setDbObjectifs(prev => [...prev, ...newObjectifs])
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

  const handleExportPDF = async () => {
    const bilanData = getBilanData()
    setPdfPreviewZone(selectedBodyZone ?? '')
    setPdfPreviewTitle('BILAN EN PHYSIOTHÉRAPIE')

    if (apiKey && bilanData) {
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
        const report = await callGemini(apiKey, PDF_ANALYSE_SYSTEM_PROMPT, userPrompt, 8192, false, 'gemini-2.5-flash', bilanDocuments.length > 0 ? bilanDocuments : undefined)
        setPdfPreviewMarkdown(report)
        setStep('pdf_preview')
      } catch {
        showToast('Erreur IA — export classique', 'error')
        const patKey = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
        const patBilans = getPatientBilans(patKey).filter(r => r.evn != null)
        const entries: ImprovementEntry[] = patBilans.map((r, i) => ({
          num: i + 1, date: r.dateBilan, evn: r.evn ?? null,
          delta: i === 0 ? null : improvDelta(patBilans[i - 1].evn!, r.evn!),
        }))
        generatePDF(formData, formData, silhouetteData,
          bilanData ? { sectionTitle: selectedBodyZone ?? '', data: bilanData } : null,
          entries.length > 0 ? { generalScore: patientGeneralScore(patKey), bilans: entries } : null,
          currentAnalyseIA ?? undefined, bilanNotes || undefined)
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
    generatePDF(formData, formData, silhouetteData,
      bilanData ? { sectionTitle: selectedBodyZone ?? '', data: bilanData } : null,
      entries.length > 0 ? { generalScore: patientGeneralScore(patKey), bilans: entries } : null,
      currentAnalyseIA ?? undefined, bilanNotes || undefined)
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
- Tu n'utilises JAMAIS le nom ou prénom du patient. Tu utilises "le/la patient(e)".
- PAS de section "Diagnostic", PAS de "Plan de traitement", PAS de "Conclusion" ou "Synthèse diagnostique".

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

  // Prompt pour export depuis la page Analyse IA — inclut diagnostic + plan de traitement
  const PDF_ANALYSE_SYSTEM_PROMPT = `Tu es un physiothérapeute/kinésithérapeute expert chargé de rédiger un rapport de Bilan Diagnostic Physiothérapique destiné au dossier patient.

RÈGLES STRICTES DE FIDÉLITÉ :
- Tu n'utilises QUE les informations présentes dans le message utilisateur. Aucune invention, aucune supposition.
- Si une information est absente (champ vide, non fourni), tu ne la mentionnes pas.
- IMPORTANT : un test "négatif" ou "non" N'EST PAS une donnée absente — c'est un résultat clinique qui DOIT figurer. Inclure TOUS les tests renseignés (positifs ET négatifs).
- Tu n'inventes AUCUN résultat qui n'est pas explicitement fourni.
- Tu ne mentionnes jamais que ce texte a été généré par une IA.
- Tu n'utilises JAMAIS le nom ou prénom du patient.

MISE EN PAGE :
- Titres : ### — Sous-titres : **Titre :** — Données : puces "- **Label :** valeur"
- Paragraphes de prose pour anamnèse et diagnostic, listes pour données objectives

STRUCTURE (n'inclure que si données présentes) :
### 1. Informations Générales et Profil du Patient
### 2. Anamnèse et Histoire de la Maladie
### 3. Bilan Clinique (Subjectif et Objectif)
### 4. Diagnostic Physiothérapique
### 5. Plan de Traitement et Démarche Thérapeutique`

  // Export un bilan depuis le dossier patient — génère avec IA puis ouvre l'aperçu modifiable
  const exportBilanFromRecord = async (record: BilanRecord, isIntermediaire = false) => {
    setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance }))
    setPdfPreviewZone(record.zone ?? '')
    setPdfPreviewTitle(isIntermediaire ? 'BILAN INTERMÉDIAIRE EN PHYSIOTHÉRAPIE' : 'BILAN EN PHYSIOTHÉRAPIE')

    if (apiKey && record.bilanData) {
      showToast('Mise en forme du bilan en cours…', 'success')
      try {
        const userPrompt = buildPDFReportPrompt({
          patient: { nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance },
          zone: record.zone ?? '',
          bilanType: getBilanType(record.zone ?? '') ?? '',
          bilanData: record.bilanData,
          notesLibres: record.notes || undefined,
          analyseIA: null, // Bilan PDF = pas d'analyse IA
        })
        const report = await callGemini(apiKey, PDF_BILAN_SYSTEM_PROMPT, userPrompt, 8192, false, 'gemini-2.5-flash', record.documents?.length ? record.documents : undefined)
        setPdfPreviewMarkdown(report)
        setStep('pdf_preview')
      } catch {
        showToast('Erreur IA — export classique', 'error')
        const patKey = `${(record.nom || 'Anonyme').toUpperCase()} ${record.prenom}`.trim()
        const patBilans = getPatientBilans(patKey).filter(r => r.evn != null)
        const entries: ImprovementEntry[] = patBilans.map((r, i) => ({
          num: i + 1, date: r.dateBilan, evn: r.evn ?? null,
          delta: i === 0 ? null : improvDelta(patBilans[i - 1].evn!, r.evn!),
        }))
        const pi = { nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance, profession: '', sport: '', famille: '', chirurgie: '', notes: '' }
        generatePDF(pi, pi, record.silhouetteData ?? {},
          record.bilanData ? { sectionTitle: record.zone ?? '', data: record.bilanData } : null,
          entries.length > 0 ? { generalScore: patientGeneralScore(patKey), bilans: entries } : null,
          undefined, record.notes || undefined)
      }
    } else {
      // Sans clé API — fallback PDF classique direct
      const patKey = `${(record.nom || 'Anonyme').toUpperCase()} ${record.prenom}`.trim()
      const patBilans = getPatientBilans(patKey).filter(r => r.evn != null)
      const entries: ImprovementEntry[] = patBilans.map((r, i) => ({
        num: i + 1, date: r.dateBilan, evn: r.evn ?? null,
        delta: i === 0 ? null : improvDelta(patBilans[i - 1].evn!, r.evn!),
      }))
      const pi = { nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance, profession: '', sport: '', famille: '', chirurgie: '', notes: '' }
      generatePDF(pi, pi, record.silhouetteData ?? {},
        record.bilanData ? { sectionTitle: record.zone ?? '', data: record.bilanData } : null,
        entries.length > 0 ? { generalScore: patientGeneralScore(patKey), bilans: entries } : null,
        undefined, record.notes || undefined)
    }
  }

  const handleExportExerciceBank = () => {
    if (dbExerciceBank.length === 0) {
      showToast('Aucun exercice dans la banque', 'info')
      return
    }
    const csv = exportBankAsCSV(dbExerciceBank)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `banque-exercices-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`${dbExerciceBank.length} exercices exportés`, 'success')
  }

  const handleExportData = () => {
    if (!allDataLoaded) { showToast('Chargement en cours, réessayez dans un instant', 'error'); return }
    const payload = JSON.stringify({ db, dbIntermediaires, dbNotes, dbObjectifs, dbExerciceBank, dbPatientDocs, profile, apiKey, exportedAt: new Date().toISOString() }, null, 2)
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
        const parsed = JSON.parse(ev.target?.result as string)
        if (!parsed.db || !Array.isArray(parsed.db)) throw new Error('Format invalide')
        console.log('[Import] bilans:', parsed.db?.length, 'notes:', parsed.dbNotes?.length, 'keys:', parsed.dbNotes?.map((n: { patientKey: string }) => n.patientKey))
        setDb(parsed.db)
        if (parsed.dbIntermediaires) setDbIntermediaires(parsed.dbIntermediaires)
        if (Array.isArray(parsed.dbNotes)) setDbNotes(parsed.dbNotes)
        if (parsed.dbObjectifs) setDbObjectifs(parsed.dbObjectifs)
        if (parsed.dbExerciceBank) setDbExerciceBank(parsed.dbExerciceBank)
        if (parsed.dbPatientDocs) setDbPatientDocs(parsed.dbPatientDocs)
        if (parsed.profile) setProfile(parsed.profile)
        if (parsed.apiKey) { setApiKey(parsed.apiKey); setApiKeyDraft(parsed.apiKey) }
        const counts = [
          `${parsed.db.length} bilans`,
          parsed.dbIntermediaires?.length ? `${parsed.dbIntermediaires.length} intermédiaires` : '',
          parsed.dbNotes?.length ? `${parsed.dbNotes.length} séances` : '',
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

  const testApiKey = async () => {
    if (!apiKeyDraft.trim()) return
    setTestingApiKey(true)
    setApiKeyStatus('idle')
    try {
      const { callGemini } = await import('./utils/geminiClient')
      await callGemini(apiKeyDraft.trim(), 'You are a test assistant.', 'ping', 1)
      setApiKeyStatus('ok')
      showToast('Connexion Gemini réussie', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403') || msg.includes('API key') || msg.includes('UNAUTHENTICATED') || msg.includes('"code":401') || msg.includes('"code":403')) {
        setApiKeyStatus('error')
        showToast('Clé API invalide', 'error')
      } else {
        // Quota ou modèle indispo — clé structurellement valide
        setApiKeyStatus('ok')
        showToast('Clé API acceptée', 'success')
      }
    } finally {
      setTestingApiKey(false)
    }
  }

  // ── Input with mic helper ─────────────────────────────────────────────────────
  const renderInputWithMic = (label: string, field: keyof typeof formData, placeholder: string, isTextArea = false) => (
    <div className="form-group">
      <label>{label}</label>
      <div className="input-with-mic">
        {isTextArea ? (
          <textarea placeholder={placeholder} className="input-luxe" rows={2}
            value={formData[field]} onChange={(e) => updateField(field, e.target.value)} />
        ) : (
          <input type="text" placeholder={placeholder} className="input-luxe"
            value={formData[field]} onChange={(e) => updateField(field, e.target.value)} />
        )}
        <button className={`mic-btn-inline ${activeField === field ? 'recording' : ''}`}
          onClick={() => handleVoice(field)} aria-label="Dictée vocale">
          {activeField !== field && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3"/>
              <path d="M5 10a7 7 0 0 0 14 0"/>
              <line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )

  // ── Step progress ─────────────────────────────────────────────────────────────
  const STEP_ORDER: Step[] = ['identity', 'general_info', 'silhouette', 'bilan_zone', 'analyse_ia']
  const stepProgress = STEP_ORDER.indexOf(step) >= 0 ? ((STEP_ORDER.indexOf(step) + 1) / STEP_ORDER.length) * 100 : 0

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── Dashboard ──────────────────────────────────────────────────────────── */}
      {step === 'dashboard' && (
        <div className="start-screen fade-in">
          <div style={{ width:80, height:80, borderRadius:'50%', overflow:'hidden', marginBottom:'2rem', boxShadow:'var(--shadow-lg)', flexShrink:0, background: profile.photo ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {profile.photo
              ? <img src={profile.photo} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="Profil" />
              : <span style={{ fontSize:'2rem', fontWeight:700, color:'white' }}>{(profile.nom || profile.prenom || 'W')[0]}</span>}
          </div>
          <h1 className="title-premium" style={{fontSize: '1.8rem'}}>Bonjour, {profile.nom || profile.prenom}</h1>
          <p className="subtitle">Bienvenue sur votre espace Physio</p>
          <div className="spacer" />
          <div style={{ width: '100%', marginBottom: '5.5rem' }}>
            <button className="btn-primary-luxe" onClick={() => { resetForm(); setSelectedBodyZone(null); setPatientMode('new'); setStep('identity') }} style={{marginBottom: 0}}>
              Nouveau Patient
            </button>
          </div>
        </div>
      )}

      {/* ── Database ───────────────────────────────────────────────────────────── */}
      {step === 'database' && (
        <div className="general-info-screen fade-in">
          <header className="screen-header">
            {selectedPatient
              ? <button className="btn-back" onClick={() => setSelectedPatient(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              : <div style={{width: '24px'}} />}
            <h2 className="title-section">Tous les patients</h2>
            <div style={{width: '24px'}} />
          </header>
          <div className="scroll-area">
            {!selectedPatient ? (
              <>
                <div style={{marginBottom: '1.5rem'}}>
                  <div style={{ position: 'relative' }}>
                    <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input type="text" placeholder="Rechercher un nom…" className="input-luxe"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      style={{borderRadius: 'var(--radius-full)', paddingLeft: 36}} />
                  </div>
                </div>
                {(() => {
                  const patientsMap = new Map<string, { key: string; nom: string; prenom: string; dateNaissance: string; pathologie?: string; avatarBg?: string; records: BilanRecord[] }>()
                  db.forEach(r => {
                    const key = `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim()
                    if (!patientsMap.has(key)) patientsMap.set(key, { key, nom: r.nom, prenom: r.prenom, dateNaissance: r.dateNaissance, pathologie: r.pathologie, avatarBg: r.avatarBg, records: [] })
                    patientsMap.get(key)!.records.push(r)
                  })
                  const patients = Array.from(patientsMap.values()).filter(p => p.key.toLowerCase().includes(searchQuery.toLowerCase()))
                  if (patients.length === 0) return <div className="empty-state"><p>Aucun dossier trouvé.</p></div>
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '5rem' }}>
                      {patients.map(p => {
                        const score = patientGeneralScore(p.key)
                        const scoreColor = score === null ? '#94a3b8' : score > 0 ? '#16a34a' : '#dc2626'

                        const lastBilan = p.records.sort((a, b) => b.id - a.id)[0]
                        return (
                          <div key={p.key} onClick={() => setSelectedPatient(p.key)}
                            style={{ background: 'var(--surface)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                              <div style={{ width: 46, height: 46, borderRadius: '50%', background: p.avatarBg || 'var(--primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1rem' }}>
                                {(p.nom[0] || '?')}{(p.prenom[0] || '?')}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '1rem', marginBottom: '0.15rem' }}>{p.key}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  {lastBilan?.zone || p.pathologie || 'Zone non renseignée'} · {p.records.length} bilan(s)
                                </div>
                              </div>
                            </div>
                            {score !== null
                              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: '0.82rem', color: scoreColor, flexShrink: 0, letterSpacing: '-0.01em' }}>
                                  {score > 0 ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                  ) : score < 0 ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                  ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                  )}
                                  {Math.abs(score)}%
                                </span>
                              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                            }
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </>
            ) : (
              <>
                {(() => {
                  const bilans = getPatientBilans(selectedPatient)
                  const firstR = bilans[0]
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div style={{ width: 50, height: 50, borderRadius: '50%', background: firstR?.avatarBg || 'var(--primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
                          {(firstR?.nom[0] || '?')}{(firstR?.prenom[0] || '?')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '1.05rem' }}>{selectedPatient}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{firstR?.pathologie || ''}</div>
                        </div>
                      </div>

                      {/* ── Objectifs SMART ────────────────── */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ flex: 1, height: 1, background: '#fde68a' }} />
                          <span style={{ fontSize: '0.65rem', color: '#d97706', fontWeight: 700, letterSpacing: '0.05em' }}>OBJECTIFS SMART</span>
                          <div style={{ flex: 1, height: 1, background: '#fde68a' }} />
                        </div>
                        <SmartObjectifs objectifs={dbObjectifs} patientKey={selectedPatient ?? ''} onUpdate={setDbObjectifs} />
                      </div>

                      {(() => {
                        const ZONE_LABELS: Record<string, string> = {
                          epaule: 'Épaule', cheville: 'Cheville', genou: 'Genou',
                          hanche: 'Hanche', cervical: 'Rachis Cervical',
                          lombaire: 'Rachis Lombaire', generique: 'Autres bilans', geriatrique: 'Gériatrie',
                        }
                        const groupMap = new Map<string, typeof bilans>()
                        bilans.forEach(r => {
                          const k = r.bilanType ?? getBilanType(r.zone ?? '')
                          if (!groupMap.has(k)) groupMap.set(k, [])
                          groupMap.get(k)!.push(r)
                        })
                        const zoneScores = Array.from(groupMap.entries()).map(([zoneType, zb]) => {
                          const withEvn = zb.filter(b => b.evn != null)
                          if (withEvn.length < 2) return null
                          const score = improvDelta(withEvn[0].evn!, withEvn[withEvn.length - 1].evn!)
                          return { zoneType, first: withEvn[0].evn!, last: withEvn[withEvn.length - 1].evn!, score }
                        }).filter(Boolean)
                        if (zoneScores.length === 0) return null
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                            {zoneScores.map(item => {
                              if (!item) return null
                              const { zoneType, first, last, score } = item
                              const color = score > 0 ? '#16a34a' : score < 0 ? '#dc2626' : '#64748b'
                              const border = score > 0 ? '#86efac' : score < 0 ? '#fca5a5' : 'var(--border-color)'
                              return (
                                <div key={zoneType} style={{ background: 'var(--surface)', border: `1px solid ${border}`, borderRadius: 'var(--radius-lg)', padding: '0.7rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.15rem', letterSpacing: '0.02em' }}>
                                      Amélioration globale · {ZONE_LABELS[zoneType] ?? zoneType}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      EVN <strong style={{ color: 'var(--text-main)' }}>{first}</strong> → <strong style={{ color: 'var(--text-main)' }}>{last}</strong>
                                    </div>
                                  </div>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: '1.05rem', color, letterSpacing: '-0.01em' }}>
                                    {score > 0 ? (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                    ) : score < 0 ? (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    )}
                                    {Math.abs(score)}%
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}
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
                          const groups = Array.from(groupMap.entries())
                          const showSections = groups.length > 1
                          return groups.map(([zoneType, zoneBilans]) => (
                            <div key={zoneType} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                              {showSections && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.9rem', background: 'var(--secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', marginTop: '0.35rem' }}>
                                  <div style={{ width: 3, height: 18, background: 'var(--primary)', borderRadius: 2, flexShrink: 0 }} />
                                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary-dark)', letterSpacing: '0.03em' }}>
                                    {ZONE_SECTION_LABELS[zoneType] ?? zoneType}
                                  </span>
                                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    {zoneBilans.length} bilan{zoneBilans.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                              {zoneBilans.map((record, index) => {
                          const prevEvn = index > 0 ? zoneBilans[index - 1].evn : null
                          const currEvn = record.evn
                          const delta   = (prevEvn != null && currEvn != null) ? improvDelta(prevEvn, currEvn) : null
                          const dColor  = delta === null ? '' : delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#94a3b8'

                          const incomplet = record.status === 'incomplet'
                          return (
                            <div key={record.id} style={{ background: 'var(--surface)', padding: '0.9rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.95rem' }}>Bilan N°{index + 1}</span>
                                    {editingLabelBilanId === record.id ? (
                                      <input
                                        autoFocus
                                        value={labelDraft}
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
                                        style={{ flex: 1, minWidth: 140, fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)', padding: '2px 6px', border: '1.5px solid var(--primary)', borderRadius: 6, outline: 'none', background: 'white' }}
                                      />
                                    ) : (
                                      <span
                                        onClick={() => { setEditingLabelBilanId(record.id); setLabelDraft(record.customLabel ?? '') }}
                                        title={record.customLabel ? 'Cliquer pour modifier' : 'Cliquer pour ajouter un titre'}
                                        style={{ fontSize: '0.85rem', fontWeight: 500, color: record.customLabel ? 'var(--text-main)' : 'var(--text-muted)', fontStyle: record.customLabel ? 'normal' : 'italic', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                      >
                                        {record.customLabel ? `: ${record.customLabel}` : (
                                          <>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            ajouter un titre
                                          </>
                                        )}
                                      </span>
                                    )}
                                    {!incomplet && record.analyseIA && (
                                      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>IA</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {record.dateBilan}{currEvn != null ? ` · EVN : ${currEvn}` : ''}{!showSections && record.zone ? ` · ${record.zone}` : ''}
                                  </div>
                                </div>
                                {incomplet ? (
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991b1b', flexShrink: 0, paddingTop: 2 }}>Incomplet</span>
                                ) : delta !== null ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: '0.82rem', color: dColor, flexShrink: 0, letterSpacing: '-0.01em' }}>
                                    {delta > 0 ? (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                    ) : delta < 0 ? (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                    ) : (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    )}
                                    {Math.abs(delta)}%
                                  </span>
                                ) : null}
                              </div>
                              {incomplet ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: '0.75rem' }}>
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: '0.75rem' }}>
                                  {/* Rangée 1 : Bilan PDF + Analyse IA */}
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      style={{ flex: 1, padding: '0.6rem 0.5rem', borderRadius: 10, background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                      onClick={() => exportBilanFromRecord(record)}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                      </svg>
                                      Bilan PDF
                                    </button>
                                    <button
                                      style={{ flex: 1, padding: '0.6rem 0.5rem', borderRadius: 10, background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#1d4ed8', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance }))
                                        setSelectedBodyZone(record.zone ?? null)
                                        setCurrentBilanId(record.id)
                                        setCurrentAnalyseIA(record.analyseIA ?? null)
                                        setCurrentBilanDataOverride(record.bilanData ?? null)
                                        setStep('analyse_ia')
                                      }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/><path d="M14.5 3.5C17 4 19 6.5 19 9.5c0 1-.2 2-.6 2.8"/><path d="M9.5 3.5C7 4 5 6.5 5 9.5c0 1 .2 2 .6 2.8"/><path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/><path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/><path d="M9 20v-6"/><path d="M15 20v-6"/><path d="M9 14h6"/>
                                      </svg>
                                      Analyse IA
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
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
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
                              )}
                            </div>
                          )
                        })}
                              {(() => {
                                const inters = getPatientIntermediaires(selectedPatient ?? '').filter(r => (r.bilanType ?? getBilanType(r.zone ?? '')) === zoneType)
                                if (inters.length === 0) return null
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0.5rem' }}>
                                      <div style={{ flex: 1, height: 1, background: '#fed7aa' }} />
                                      <span style={{ fontSize: '0.65rem', color: '#c2410c', fontWeight: 700, letterSpacing: '0.05em' }}>BILANS INTERMÉDIAIRES</span>
                                      <div style={{ flex: 1, height: 1, background: '#fed7aa' }} />
                                    </div>
                                    {inters.map((rec, idx) => {
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
                                      const sColor = score === null ? '#94a3b8' : score > 0 ? '#16a34a' : score < 0 ? '#dc2626' : '#94a3b8'

                                      return (
                                      <div key={rec.id} style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                                          <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1rem' }}>
                                              <span style={{ fontWeight: 600, color: '#92400e', fontSize: '0.92rem' }}>Intermédiaire N°{idx + 1}</span>
                                              {rec.status === 'incomplet' && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#991b1b' }}>Incomplet</span>}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#c2410c' }}>{rec.dateBilan}</div>
                                          </div>
                                          {score !== null && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: '0.8rem', color: sColor, flexShrink: 0, letterSpacing: '-0.01em' }}>
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
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                                              {/* Rangée 1 : Bilan PDF + Note diag IA */}
                                              <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                  style={{ flex: 1, padding: '0.55rem 0.5rem', borderRadius: 10, background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                                  onClick={() => {
                                                    // Exporte le bilan intermédiaire comme un BilanRecord pour réutiliser exportBilanFromRecord
                                                    exportBilanFromRecord({
                                                      id: rec.id, nom: rec.nom, prenom: rec.prenom,
                                                      dateNaissance: rec.dateNaissance, dateBilan: rec.dateBilan,
                                                      zoneCount: 1, zone: rec.zone, bilanType: rec.bilanType,
                                                      bilanData: rec.data, notes: rec.notes, status: rec.status,
                                                      avatarBg: rec.avatarBg,
                                                    } as BilanRecord, true)
                                                  }}>
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                                  </svg>
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
                                      </div>
                                      )
                                    })}
                                  </div>
                                )
                              })()}
                            </div>
                          ))
                        })()}
                        {bilans.filter(r => r.status === 'complet').length >= 2 && (
                          <button
                            onClick={() => {
                              const firstRec = bilans[0]
                              setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                              setStep('evolution_ia')
                            }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            Rapport d'évolution IA
                          </button>
                        )}
                        {/* ── Notes de séance ────────────────────── */}
                        {(() => {
                          const notes = getPatientNotes(selectedPatient ?? '')
                          if (notes.length === 0) return null
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0.5rem' }}>
                                <div style={{ flex: 1, height: 1, background: '#c4b5fd' }} />
                                <span style={{ fontSize: '0.65rem', color: '#6d28d9', fontWeight: 700, letterSpacing: '0.05em' }}>NOTES DE SÉANCE</span>
                                <div style={{ flex: 1, height: 1, background: '#c4b5fd' }} />
                              </div>
                              {notes.map(note => {
                                const ZONE_LABELS: Record<string, string> = { epaule: 'Épaule', cheville: 'Cheville', genou: 'Genou', hanche: 'Hanche', cervical: 'Cervical', lombaire: 'Lombaire', generique: 'Général', geriatrique: 'Gériatrie' }
                                const zt = note.bilanType ?? getBilanType(note.zone ?? '')
                                return (
                                  <div key={note.id} style={{ background: 'var(--surface)', borderRadius: 12, border: '1.5px solid #ddd6fe', padding: '0.75rem', boxShadow: '0 1px 3px rgba(109,40,217,0.06)' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                      <div>
                                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#5b21b6' }}>Séance n°{note.numSeance}</span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 6 }}>{ZONE_LABELS[zt] ?? zt}</span>
                                      </div>
                                      <div style={{ fontSize: '0.78rem', color: '#6d28d9' }}>{note.dateSeance}</div>
                                    </div>
                                    {/* Badges */}
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                                      {note.data.eva && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-full)', background: '#ede9fe', color: '#6d28d9' }}>EVA {note.data.eva}/10</span>}
                                      {note.data.evolution && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-full)', background: note.data.evolution === 'Amélioré' ? '#dcfce7' : note.data.evolution === 'Aggravé' ? '#fef2f2' : '#f3f4f6', color: note.data.evolution === 'Amélioré' ? '#16a34a' : note.data.evolution === 'Aggravé' ? '#dc2626' : '#6b7280' }}>{note.data.evolution}</span>}
                                      {note.data.tolerance && <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-full)', background: note.data.tolerance === 'Bien toléré' ? '#dcfce7' : '#fffbeb', color: note.data.tolerance === 'Bien toléré' ? '#16a34a' : '#d97706' }}>{note.data.tolerance}</span>}
                                    </div>
                                    {/* Preview contenu */}
                                    <div style={{ background: '#f5f3ff', borderRadius: 8, padding: '0.55rem 0.7rem', marginBottom: 8, fontSize: '0.75rem', color: '#5b21b6', lineHeight: 1.5 }}>
                                      {note.data.interventions.length > 0 && (
                                        <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Traitement :</span> {note.data.interventions.join(', ')}</div>
                                      )}
                                      {note.data.detailDosage && <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Dosage :</span> {note.data.detailDosage}</div>}
                                      {note.data.noteSubjective && <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Ressenti :</span> {note.data.noteSubjective}</div>}
                                      {note.data.toleranceDetail && <div style={{ marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Tolérance :</span> {note.data.toleranceDetail}</div>}
                                      {note.data.prochaineEtape.length > 0 && (
                                        <div><span style={{ fontWeight: 700 }}>Prochaine étape :</span> {note.data.prochaineEtape.join(', ')}</div>
                                      )}
                                      {note.data.notePlan && <div><span style={{ fontWeight: 700 }}>Note :</span> {note.data.notePlan}</div>}
                                    </div>
                                    {/* Analyse IA mini — toggle */}
                                    {note.analyseIA && (
                                      <div style={{ marginBottom: 8 }}>
                                        <button onClick={() => {
                                          const el = document.getElementById(`analyse-seance-${note.id}`)
                                          if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'
                                        }}
                                          style={{ width: '100%', padding: '0.4rem 0.7rem', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 600, fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/><path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/><path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/><path d="M9 14h6"/></svg>
                                            Analyse IA
                                          </span>
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                                        </button>
                                        <div id={`analyse-seance-${note.id}`} style={{ background: '#eff6ff', borderRadius: '0 0 8px 8px', padding: '0.55rem 0.7rem', fontSize: '0.75rem', color: '#1e3a8a', lineHeight: 1.5, borderLeft: '3px solid #2563eb', borderTop: 'none' }}>
                                          <div style={{ marginBottom: 3 }}>{note.analyseIA.resume}</div>
                                          <div style={{ marginBottom: 3, fontSize: '0.72rem' }}>{note.analyseIA.evolution}</div>
                                          {note.analyseIA.vigilance.length > 0 && (
                                            <div style={{ color: '#dc2626', fontSize: '0.72rem', marginBottom: 3 }}>Vigilance : {note.analyseIA.vigilance.join(' / ')}</div>
                                          )}
                                          <div style={{ fontWeight: 600, fontSize: '0.72rem' }}>Focus : {note.analyseIA.focus}</div>
                                          {note.analyseIA.conseil && (
                                            <div style={{ marginTop: 4, padding: '0.4rem 0.55rem', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', color: '#15803d', fontSize: '0.72rem' }}>
                                              <span style={{ fontWeight: 700 }}>Conseil IA :</span> {note.analyseIA.conseil}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    {/* Boutons */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                          style={{ flex: 1, padding: '0.5rem 0.5rem', borderRadius: 10, background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#1d4ed8', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                          onClick={async () => {
                                            if (!apiKey) { showToast('Clé API requise', 'error'); return }
                                            showToast('Analyse en cours...', 'success')
                                            try {
                                              // Build historique complet from all notes + bilans + intermediaires for this patient/zone
                                              const patKey = note.patientKey
                                              const allNotes = dbNotes.filter(n => n.patientKey === patKey && (n.bilanType ?? getBilanType(n.zone ?? '')) === zt).sort((a, b) => a.id - b.id)
                                              const allBilans = db.filter(r => `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim() === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === zt)
                                              const allInters = dbIntermediaires.filter(r => r.patientKey === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === zt)

                                              // Bilans détaillés
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

                                              // Bilans intermédiaires détaillés
                                              const intersStr = allInters.map(r => {
                                                const tc2 = (r.data?.troncCommun as Record<string, unknown>) ?? {}
                                                const evn2 = (tc2.evn as Record<string, unknown>) ?? {}
                                                const lines = [`--- Bilan intermédiaire ${r.dateBilan} ---`, `EVN pire : ${evn2.pireActuel ?? '?'}/10 (initial: ${evn2.pireInitial ?? '?'}) | Évolution globale : ${tc2.evolutionGlobale ?? 'N/R'}`]
                                                if (r.analyseIA) lines.push(`Diagnostic IA : ${r.analyseIA.noteDiagnostique.titre} — ${r.analyseIA.noteDiagnostique.evolution}`)
                                                if (r.ficheExercice?.markdown) { const md = r.ficheExercice.markdown; lines.push(`Exercices prescrits : ${md.length > 300 ? md.slice(0, 300) + '...' : md}`) }
                                                return lines.join('\n')
                                              }).join('\n\n')

                                              // Séances détaillées
                                              const notesStr = allNotes.map(n => {
                                                const lines = [`--- Séance n°${n.numSeance} (${n.dateSeance}) ---`,
                                                  `EVA : ${n.data.eva}/10 | Observance : ${n.data.observance} | Tolérance : ${n.data.tolerance}${n.data.toleranceDetail ? ` (${n.data.toleranceDetail})` : ''}`,
                                                  `Évolution : ${n.data.evolution}`,
                                                  `Interventions : ${n.data.interventions.join(', ')}`]
                                                if (n.data.prochaineEtape?.length) lines.push(`Prochaines étapes : ${n.data.prochaineEtape.join(', ')}`)
                                                if (n.data.noteSubjective) lines.push(`Ressenti patient : ${n.data.noteSubjective}`)
                                                if (n.analyseIA) {
                                                  if (n.analyseIA.resume) lines.push(`Analyse IA : ${n.analyseIA.resume}`)
                                                  if (n.analyseIA.focus) lines.push(`Focus IA : ${n.analyseIA.focus}`)
                                                  if (n.analyseIA.conseil) lines.push(`Conseil IA : ${n.analyseIA.conseil}`)
                                                }
                                                if (n.ficheExercice?.markdown) { const md = n.ficheExercice.markdown; lines.push(`Exercices prescrits : ${md.length > 300 ? md.slice(0, 300) + '...' : md}`) }
                                                return lines.join('\n')
                                              }).join('\n\n')

                                              const historiqueStr = [bilansStr, intersStr, notesStr].filter(Boolean).join('\n\n')

                                              const raw = await callGemini(apiKey,
                                                'Tu es un kinésithérapeute expert. Analyse la séance actuelle dans le contexte de tout l\'historique COMPLET du patient (bilans, bilans intermédiaires, séances précédentes, analyses IA, exercices prescrits). Sois concis. Réponds UNIQUEMENT en JSON valide.',
                                                `HISTORIQUE COMPLET DU PATIENT (${ZONE_LABELS[zt] ?? zt}) :\n${historiqueStr}\n\nSÉANCE ACTUELLE (n°${note.numSeance}) :\nEVA : ${note.data.eva}/10\nÉvolution : ${note.data.evolution}\nObservance : ${note.data.observance}\nInterventions : ${note.data.interventions.join(', ')}\nDosage : ${note.data.detailDosage}\nTolérance : ${note.data.tolerance} ${note.data.toleranceDetail}\nRessenti : ${note.data.noteSubjective}\nProchaine étape : ${note.data.prochaineEtape.join(', ')}\nNote : ${note.data.notePlan}\n\nRéponds en JSON :\n{"resume":"1-2 phrases résumant la séance","evolution":"1 phrase sur la tendance globale de l\'évolution","vigilance":["point de vigilance 1","point 2 si pertinent"],"focus":"1 phrase sur quoi se focaliser à la prochaine séance","conseil":"1-2 phrases de conseil IA basé sur la direction de la symptomatologie et l\'historique — concret et actionnable"}`,
                                                2048, true, 'gemini-2.5-flash')
                                              const parsed = JSON.parse(raw)
                                              if (parsed.resume) {
                                                const mini = { generatedAt: new Date().toISOString(), resume: parsed.resume, evolution: parsed.evolution ?? '', vigilance: parsed.vigilance ?? [], focus: parsed.focus ?? '', conseil: parsed.conseil ?? '' }
                                                setDbNotes(prev => prev.map(n => n.id === note.id ? { ...n, analyseIA: mini } : n))
                                                showToast('Analyse générée', 'success')
                                              }
                                            } catch { showToast('Erreur analyse', 'error') }
                                          }}>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/><path d="M14.5 3.5C17 4 19 6.5 19 9.5c0 1-.2 2-.6 2.8"/><path d="M9.5 3.5C7 4 5 6.5 5 9.5c0 1 .2 2 .6 2.8"/><path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/><path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/><path d="M9 20v-6"/><path d="M15 20v-6"/><path d="M9 14h6"/>
                                          </svg>
                                          {note.analyseIA ? 'Relancer IA' : 'Analyse IA'}
                                        </button>
                                        <button
                                          style={{ flex: 1, padding: '0.5rem 0.5rem', borderRadius: 10, background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                                          onClick={() => {
                                            setFormData(prev => ({ ...prev, nom: note.nom, prenom: note.prenom, dateNaissance: note.dateNaissance }))
                                            // Build context from note de séance + historique
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
                                      {/* Modifier / Supprimer discrets */}
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
                                )
                              })}
                            </div>
                          )
                        })()}

                        {/* Note de séance pleine largeur */}
                        <button
                          onClick={() => {
                            const firstRec = bilans[0]
                            setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                            const zones = Array.from(new Map(bilans.map(r => [r.bilanType ?? getBilanType(r.zone ?? ''), r.zone])).entries())
                            if (zones.length === 1) {
                              const z = zones[0][1] ?? ''
                              setNoteSeanceZone(z)
                              setCurrentNoteSeanceId(null)
                              setCurrentNoteSeanceData(null)
                              setStep('note_seance')
                            } else {
                              setShowNoteSeanceZoneSelector(true)
                            }
                          }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: '2px dashed #c4b5fd', background: 'transparent', color: '#6d28d9', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Nouvelle note de séance
                        </button>
                        {/* Bilan intermédiaire + Bilan initial côte à côte */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => {
                              const firstRec = bilans[0]
                              setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                              const patKey = selectedPatient ?? ''
                              const zones = Array.from(new Map(bilans.map(r => [r.bilanType ?? getBilanType(r.zone ?? ''), r.zone])).entries())
                              if (zones.length === 1) {
                                const z = zones[0][1] ?? ''
                                setBilanIntermediaireZone(z)
                                setCurrentBilanIntermediaireId(null)
                                setCurrentBilanIntermediaireData(getIntermediairePreFill(patKey, z))
                                setStep('bilan_intermediaire')
                              } else {
                                setShowIntermediaireZoneSelector(true)
                              }
                            }}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.7rem 0.5rem', borderRadius: 'var(--radius-lg)', border: '2px dashed #fed7aa', background: 'transparent', color: '#c2410c', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                            <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Bilan intermédiaire
                          </button>
                          <button
                            onClick={() => {
                              const firstRec = bilans[0]
                              setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                              setPatientMode('existing')
                              setSelectedBodyZone(null)
                              setBilanZoneBackStep('identity')
                              setStep('identity')
                            }}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', padding: '0.7rem 0.5rem', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-color)', background: 'transparent', color: 'var(--primary)', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
                            <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Bilan initial
                          </button>
                        </div>

                        {/* ── Timeline ────────────────────── */}
                        <div style={{ marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CHRONOLOGIE</span>
                            <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                          </div>
                          <PatientTimeline
                            bilans={bilans}
                            intermediaires={getPatientIntermediaires(selectedPatient ?? '')}
                            notesSeance={getPatientNotes(selectedPatient ?? '')}
                          />
                        </div>

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
                          onAdd={(doc) => {
                            const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
                            setDbPatientDocs(prev => [...prev, { ...doc, id, patientKey: selectedPatient ?? '' }])
                          }}
                        />
                      </div>
                    </>
                  )
                })()}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Profile / Dashboard Tab ─────────────────────────────────────────────── */}
      {step === 'profile' && (() => {
        const r = 52, circ = 2 * Math.PI * r
        const total     = allPatientKeys.length
        const forte     = allPatientKeys.filter(k => (patientGeneralScore(k) ?? 0) > 50).length
        const moderee   = allPatientKeys.filter(k => { const s = patientGeneralScore(k); return s !== null && s > 0 && s <= 50 }).length
        const regressN  = allPatientKeys.filter(k => { const s = patientGeneralScore(k); return s !== null && s <= 0 }).length
        const sansScore = Math.max(total - forte - moderee - regressN, 0)
        const slot = (n: number) => total > 0 ? (n / total) * circ : 0
        const seg  = (n: number) => Math.max(slot(n) - 6, 0)
        const startOff = -circ / 4
        const gsColor = globalScore >= 50 ? '#16a34a' : globalScore >= 20 ? '#f97316' : '#dc2626'
        const incompletCount = db.filter(r => r.status === 'incomplet').length
        return (
          <div className="general-info-screen fade-in">
            <header className="screen-header">
              <button className="btn-back" onClick={() => editingProfile ? setEditingProfile(false) : setStep('dashboard')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <h2 className="title-section">{editingProfile ? 'Modifier le profil' : 'Tableau de bord'}</h2>
              <button onClick={() => { setEditingProfile(v => !v); setProfileEditDraft(profile); setApiKeyDraft(apiKey) }}
                style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--primary)', background:'none', border:'none', cursor:'pointer' }}>
                {editingProfile ? 'Annuler' : 'Modifier'}
              </button>
            </header>
            <div className="scroll-area" style={{ paddingBottom: '5.5rem' }}>

              {editingProfile ? (
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
                      onChange={e => setProfileEditDraft(p => ({ ...p, nom: e.target.value }))} placeholder="Ex : William" />
                  </div>
                  <div className="form-group">
                    <label>Profession</label>
                    <input type="text" className="input-luxe" value={profileEditDraft.profession}
                      onChange={e => setProfileEditDraft(p => ({ ...p, profession: e.target.value }))} placeholder="Ex : Kinésithérapeute" />
                  </div>

                  {/* Compétences & Équipements */}
                  <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem', marginBottom: 12 }}>Compétences & Équipements</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                      L'IA adaptera ses propositions de prise en charge en fonction de vos compétences et équipements.
                    </p>

                    {/* Spécialités */}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>Spécialités</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Thérapie manuelle', 'McKenzie (MDT)', 'Sport', 'Pédiatrie', 'Neurologie', 'Vestibulaire', 'Périnéologie', 'Respiratoire', 'Rhumatologie', 'Gériatrie', 'Orthopédie'].map(s => (
                          <button key={s} className={`choix-btn${(profileEditDraft.specialites ?? []).includes(s) ? ' active' : ''}`}
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
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>Techniques maîtrisées</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Dry needling', 'Mulligan', 'Maitland', 'Cupping', 'Taping / K-Tape', 'PNF (Kabat)', 'Chaînes musculaires (GDS/Busquet)', 'Éducation neurosciences douleur', 'Crochetage / IASTM', 'Drainage lymphatique', 'Trigger points', 'Ventouses', 'Stretching global actif'].map(t => (
                          <button key={t} className={`choix-btn${(profileEditDraft.techniques ?? []).includes(t) ? ' active' : ''}`}
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
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>Équipements au cabinet</label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['Ondes de choc', 'TENS', 'Tecarthérapie (Winback/Indiba)', 'Ultrasons', 'Laser', 'Isocinétisme', 'Plateforme proprioceptive', 'Huber / LPG', 'Pressothérapie', 'Électrostimulation', 'Cryothérapie', 'Traction cervicale/lombaire', 'Vélo / Elliptique', 'Presse'].map(e => (
                          <button key={e} className={`choix-btn${(profileEditDraft.equipements ?? []).includes(e) ? ' active' : ''}`}
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
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>Autres (non listés ci-dessus)</label>
                      <textarea
                        value={profileEditDraft.autresCompetences ?? ''}
                        onChange={e => setProfileEditDraft(p => ({ ...p, autresCompetences: e.target.value }))}
                        placeholder="Ex : méthode Schroth, rééducation maxillo-faciale, posturologie, biofeedback, Game Ready..."
                        rows={2}
                        style={{ width: '100%', padding: '0.6rem 0.85rem', fontSize: '0.82rem', color: 'var(--text-main)', background: 'var(--secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* IA Section */}
                  <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem', marginBottom: 12 }}>Intelligence Artificielle</div>
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid var(--border-color)' }}>
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: '0.82rem' }}>Clé API Gemini</label>
                        <input type="password" className={`input-luxe api-key-field`}
                          value={apiKeyDraft} onChange={e => { setApiKeyDraft(e.target.value); setApiKeyStatus('idle') }}
                          placeholder="AIza…" />
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={testApiKey} disabled={testingApiKey || !apiKeyDraft.trim()}
                          style={{ padding: '0.55rem 1rem', borderRadius: 8, border: '1.5px solid var(--border-color)', background: 'white', fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: testingApiKey || !apiKeyDraft.trim() ? 0.5 : 1 }}>
                          {testingApiKey
                            ? <><div className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(30,58,138,0.2)', borderTopColor: 'var(--primary)' }} />Test…</>
                            : 'Tester la connexion'}
                        </button>
                        {apiKeyStatus === 'ok'  && <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>Connecté</span>}
                        {apiKeyStatus === 'error'&& <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>Invalide</span>}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>La clé est stockée localement et n'est jamais transmise à nos serveurs.</p>
                    </div>
                  </div>

                  <button className="btn-primary-luxe" style={{ marginBottom:'1rem', marginTop:'0.5rem' }}
                    onClick={() => {
                      setProfile(profileEditDraft)
                      setApiKey(apiKeyDraft.trim())
                      setEditingProfile(false)
                      showToast('Profil enregistré', 'success')
                    }}>
                    Enregistrer
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem', padding:'1rem', background:'var(--secondary)', borderRadius:'var(--radius-lg)' }}>
                    <div style={{ width:52, height:52, borderRadius:'50%', overflow:'hidden', flexShrink:0, boxShadow:'var(--shadow-md)', background: profile.photo ? 'transparent' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {profile.photo
                        ? <img src={profile.photo} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="Profil" />
                        : <span style={{ fontSize:'1.4rem', fontWeight:700, color:'white' }}>{(profile.nom || profile.prenom || 'W')[0]}</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'1.1rem', color:'var(--primary-dark)' }}>{profile.nom}</div>
                      <div style={{ fontSize:'0.85rem', color:'var(--text-muted)' }}>{profile.profession}</div>
                      {apiKey && <div style={{ fontSize:'0.75rem', color:'#16a34a', fontWeight:600, marginTop:2 }}>IA active</div>}
                    </div>
                    {!isOnline && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                        Hors-ligne
                      </span>
                    )}
                  </div>

                  {/* Dashboard Stats */}
                  <DashboardStats bilans={db} intermediaires={dbIntermediaires} notesSeance={dbNotes} />

                  <div style={{ background:'var(--surface)', borderRadius:'var(--radius-xl)', padding:'1.1rem 1.15rem', marginBottom:'1.25rem', border:'1px solid var(--border-color)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.9rem' }}>
                      <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--primary-dark)', letterSpacing:'0.01em' }}>Mes Patients</div>
                      <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', fontWeight:500 }}>Répartition par évolution</div>
                    </div>

                    {/* Donut + breakdown patients */}
                    <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                      <svg viewBox="0 0 150 150" width="112" height="112" style={{ flexShrink:0 }}>
                        <circle cx="75" cy="75" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10"/>
                        {forte   > 0 && <circle cx="75" cy="75" r={r} fill="none" stroke="#22c55e" strokeWidth="10" strokeDasharray={`${seg(forte)} ${circ}`}   strokeDashoffset={startOff} strokeLinecap="round"/>}
                        {moderee > 0 && <circle cx="75" cy="75" r={r} fill="none" stroke="#f97316" strokeWidth="10" strokeDasharray={`${seg(moderee)} ${circ}`} strokeDashoffset={startOff - slot(forte)} strokeLinecap="round"/>}
                        {regressN> 0 && <circle cx="75" cy="75" r={r} fill="none" stroke="#ef4444" strokeWidth="10" strokeDasharray={`${seg(regressN)} ${circ}`} strokeDashoffset={startOff - slot(forte) - slot(moderee)} strokeLinecap="round"/>}
                        {sansScore > 0 && <circle cx="75" cy="75" r={r} fill="none" stroke="#cbd5e1" strokeWidth="10" strokeDasharray={`${seg(sansScore)} ${circ}`} strokeDashoffset={startOff - slot(forte) - slot(moderee) - slot(regressN)} strokeLinecap="round"/>}
                        <text x="75" y="72" textAnchor="middle" fill="var(--primary-dark)" fontSize="28" fontWeight="700" letterSpacing="-0.02em">{total}</text>
                        <text x="75" y="90" textAnchor="middle" fill="#94a3b8" fontSize="10" letterSpacing="0.04em">PATIENTS</text>
                      </svg>
                      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                        {[
                          { c:'#22c55e', label:'Forte amélioration', hint:'>50%',  n: forte },
                          { c:'#f97316', label:'Modérée',            hint:'1–50%', n: moderee },
                          { c:'#ef4444', label:'Régression',         hint:'EVN ↑', n: regressN },
                          { c:'#cbd5e1', label:'Sans score',         hint:'< 2 bilans', n: sansScore },
                        ].map(s => (
                          <div key={s.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ width:8, height:8, borderRadius:'50%', background:s.c, flexShrink:0 }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:'0.78rem', color:'var(--text-main)', fontWeight:600, lineHeight:1.2 }}>{s.label}</div>
                              <div style={{ fontSize:'0.66rem', color:'var(--text-muted)', lineHeight:1.2 }}>{s.hint}</div>
                            </div>
                            <div style={{ fontSize:'0.95rem', fontWeight:700, color:'var(--primary-dark)', minWidth:20, textAlign:'right' }}>{s.n}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Métriques complémentaires (pas liées au donut) */}
                    <div style={{ display:'flex', gap:0, marginTop:'0.9rem', paddingTop:'0.75rem', borderTop:'1px solid #f1f5f9' }}>
                      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, borderRight:'1px solid #f1f5f9' }}>
                        <div style={{ fontSize:'1.05rem', fontWeight:700, color:'var(--primary-dark)', lineHeight:1, letterSpacing:'-0.01em' }}>{db.length}</div>
                        <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:500 }}>Bilans</div>
                      </div>
                      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, borderRight:'1px solid #f1f5f9' }}>
                        <div style={{ fontSize:'1.05rem', fontWeight:700, color: gsColor, lineHeight:1, letterSpacing:'-0.01em' }}>{globalScore}%</div>
                        <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:500 }}>Score global</div>
                      </div>
                      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                        <div style={{ fontSize:'1.05rem', fontWeight:700, color: incompletCount > 0 ? '#d97706' : 'var(--primary-dark)', lineHeight:1, letterSpacing:'-0.01em' }}>{incompletCount}</div>
                        <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:500 }}>Incomplets</div>
                      </div>
                    </div>
                  </div>

                  {/* Export / Import */}
                  <div style={{ background:'var(--surface)', borderRadius:'var(--radius-xl)', padding:'1.25rem', marginBottom:'1.25rem', boxShadow:'var(--shadow-sm)', border:'1px solid var(--border-color)' }}>
                    <div style={{ fontWeight:700, color:'var(--primary-dark)', marginBottom:'0.75rem', fontSize:'0.92rem' }}>Synchronisation multi-appareils</div>
                    <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', margin:'0 0 1rem', lineHeight:1.5 }}>Exporte tes données depuis ce navigateur, puis importe le fichier sur un autre appareil (téléphone, tablette…).</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <button onClick={handleExportData}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'0.75rem', borderRadius:10, background:'linear-gradient(135deg, var(--primary), var(--primary-dark))', border:'none', color:'white', fontWeight:700, fontSize:'0.88rem', cursor:'pointer' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Exporter mes données (.json)
                      </button>
                      <button onClick={() => importDataRef.current?.click()}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'0.75rem', borderRadius:10, background:'white', border:'1.5px solid var(--border-color)', color:'var(--primary-dark)', fontWeight:700, fontSize:'0.88rem', cursor:'pointer' }}>
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

                  {/* Banque d'exercices */}
                  <div style={{ background:'var(--surface)', borderRadius:'var(--radius-xl)', padding:'1.25rem', marginBottom:'1.25rem', boxShadow:'var(--shadow-sm)', border:'1px solid var(--border-color)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.5rem' }}>
                      <div style={{ fontWeight:700, color:'var(--primary-dark)', fontSize:'0.92rem' }}>Banque d'exercices</div>
                      <span style={{ fontSize:'0.75rem', fontWeight:700, padding:'0.15rem 0.55rem', borderRadius:'var(--radius-full)', background:'#f0fdf4', color:'#15803d', border:'1px solid #bbf7d0' }}>
                        {dbExerciceBank.length} {dbExerciceBank.length > 1 ? 'exercices' : 'exercice'}
                      </span>
                    </div>
                    <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', margin:'0 0 1rem', lineHeight:1.5 }}>
                      Tous les exercices uniques générés par l'IA sont collectés ici automatiquement. Exporte-les en CSV pour construire ta banque personnelle.
                    </p>
                    <button onClick={handleExportExerciceBank} disabled={dbExerciceBank.length === 0}
                      style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'0.75rem', borderRadius:10, background: dbExerciceBank.length === 0 ? 'var(--secondary)' : 'linear-gradient(135deg, #059669, #047857)', border: dbExerciceBank.length === 0 ? '1px solid var(--border-color)' : 'none', color: dbExerciceBank.length === 0 ? 'var(--text-muted)' : 'white', fontWeight:700, fontSize:'0.88rem', cursor: dbExerciceBank.length === 0 ? 'not-allowed' : 'pointer' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                      Exporter en CSV (.csv)
                    </button>
                  </div>

                  <div style={{ fontWeight:700, color:'var(--primary-dark)', marginBottom:'0.75rem', fontSize:'0.92rem' }}>Aperçu des patients</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                    {allPatientKeys.map(key => {
                      const bilans = getPatientBilans(key)
                      const firstRec = bilans[0]
                      const score = patientGeneralScore(key)
                      const sColor = score === null ? '#94a3b8' : score > 0 ? '#16a34a' : '#dc2626'
                      const sBg    = score === null ? '#f1f5f9' : score > 0 ? '#dcfce7' : '#fee2e2'
                      const initials = `${(firstRec?.nom[0] || '?')}${(firstRec?.prenom[0] || '?')}`
                      return (
                        <div key={key} onClick={() => { setSelectedPatient(key); setStep('database') }}
                          style={{ background:'var(--surface)', borderRadius:'var(--radius-lg)', padding:'0.9rem 1rem', border:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:'0.85rem', boxShadow:'var(--shadow-sm)', cursor:'pointer' }}>
                          <div style={{ width:42, height:42, borderRadius:'50%', background: firstRec?.avatarBg || 'var(--primary)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:'0.9rem' }}>{initials}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:600, color:'var(--primary-dark)', fontSize:'0.95rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{key}</div>
                            <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{firstRec?.pathologie || ''}</div>
                          </div>
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.2rem', flexShrink:0 }}>
                            {score !== null && (
                              <span style={{ fontWeight:700, fontSize:'0.85rem', color: sColor, background: sBg, padding:'0.2rem 0.6rem', borderRadius:'var(--radius-full)' }}>
                                {score > 0 ? '+' : ''}{score}%
                              </span>
                            )}
                            <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{bilans.length} bilan(s)</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Bottom nav ─────────────────────────────────────────────────────────── */}
      {(step === 'dashboard' || step === 'database' || step === 'profile') && (
        <nav className="bottom-nav">
          <button className={`bottom-nav-item${step === 'database' ? ' active' : ''}`}
            onClick={() => { setSelectedPatient(null); setSearchQuery(''); setStep('database') }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Patients</span>
          </button>
          <button className={`bottom-nav-item${step === 'dashboard' ? ' active' : ''}`} onClick={() => setStep('dashboard')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Accueil</span>
          </button>
          <button className={`bottom-nav-item${step === 'profile' ? ' active' : ''}`} onClick={() => setStep('profile')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Profil</span>
          </button>
        </nav>
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
              Cette action est irréversible. L'analyse IA et la fiche d'exercices associées seront également supprimées.
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', width: '100%', maxWidth: '430px', boxShadow: 'var(--shadow-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="title-section" style={{ margin: 0 }}>Choisir la zone du bilan intermédiaire</h3>
              <button onClick={() => setShowIntermediaireZoneSelector(false)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: '1rem' }}>
              {[
                { zone: 'Épaule',        label: 'Épaule' },
                { zone: 'Genou',         label: 'Genou' },
                { zone: 'Hanche',        label: 'Hanche' },
                { zone: 'Cheville',      label: 'Cheville' },
                { zone: 'Cervicales',    label: 'Rachis Cervical' },
                { zone: 'Rachis Lombaire', label: 'Rachis Lombaire' },
                { zone: 'Gériatrie',     label: 'Bilan Gériatrique' },
                { zone: 'Autre',         label: 'Bilan Général' },
              ].map(({ zone, label }) => (
                <button key={zone} onClick={() => {
                  const bilans = getPatientBilans(selectedPatient)
                  const firstRec = bilans[0]
                  setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                  setBilanIntermediaireZone(zone)
                  setCurrentBilanIntermediaireId(null)
                  setCurrentBilanIntermediaireData(getIntermediairePreFill(selectedPatient, zone))
                  setShowIntermediaireZoneSelector(false)
                  setStep('bilan_intermediaire')
                }} style={{ padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-lg)', background: '#fff7ed', border: '1.5px solid #fed7aa', color: '#92400e', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', textAlign: 'left' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Zone selector for note de séance ──────────────────────────────────── */}
      {showNoteSeanceZoneSelector && selectedPatient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', width: '100%', maxWidth: '430px', boxShadow: 'var(--shadow-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 className="title-section" style={{ margin: 0 }}>Zone de la note de séance</h3>
              <button onClick={() => setShowNoteSeanceZoneSelector(false)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: '1rem' }}>
              {[
                { zone: 'Épaule',        label: 'Épaule' },
                { zone: 'Genou',         label: 'Genou' },
                { zone: 'Hanche',        label: 'Hanche' },
                { zone: 'Cheville',      label: 'Cheville' },
                { zone: 'Cervicales',    label: 'Rachis Cervical' },
                { zone: 'Rachis Lombaire', label: 'Rachis Lombaire' },
                { zone: 'Gériatrie',     label: 'Bilan Gériatrique' },
                { zone: 'Autre',         label: 'Bilan Général' },
              ].map(({ zone, label }) => (
                <button key={zone} onClick={() => {
                  const bilans = getPatientBilans(selectedPatient)
                  const firstRec = bilans[0]
                  setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                  setNoteSeanceZone(zone)
                  setCurrentNoteSeanceId(null)
                  setCurrentNoteSeanceData(null)
                  setShowNoteSeanceZoneSelector(false)
                  setStep('note_seance')
                }} style={{ padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-lg)', background: '#f5f3ff', border: '1.5px solid #ddd6fe', color: '#5b21b6', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', textAlign: 'left' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
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
          <DocumentMasker
            key={current.name + maskingQueue.length}
            imageDataUrl={current.dataUrl}
            fileName={current.name + (maskingQueue.length > 1 ? ` (${maskingQueue.length} en attente)` : '')}
            onConfirm={(maskedDataUrl) => {
              const base64 = maskedDataUrl.split(',')[1]
              setBilanDocuments(prev => [...prev, { name: current.name, mimeType: 'image/jpeg', data: base64, addedAt: new Date().toISOString() }])
              setMaskingQueue(prev => prev.slice(1))
              showToast('Document anonymisé et ajouté', 'success')
            }}
            onCancel={() => setMaskingQueue(prev => prev.slice(1))}
          />
        )
      })()}

      {/* ── Zone popup ─────────────────────────────────────────────────────────── */}
      {showZonePopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 2000, padding: '0' }}>
          <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', width: '100%', maxWidth: '430px', boxShadow: 'var(--shadow-2xl)', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="title-section" style={{ margin: 0 }}>Zone du bilan</h3>
              <button onClick={() => setShowZonePopup(false)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
              {BODY_ZONES.map(zone => (
                <button key={zone} className={`zone-btn${selectedBodyZone === zone ? ' selected' : ''}`}
                  onClick={() => setSelectedBodyZone(zone)}>
                  {zone}
                </button>
              ))}
            </div>
            <button className="btn-primary-luxe" style={{ marginBottom: 0, opacity: selectedBodyZone ? 1 : 0.5 }}
              disabled={!selectedBodyZone}
              onClick={() => setShowZonePopup(false)}>
              Confirmer
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
            <div style={{ display: 'flex', background: 'var(--secondary)', borderRadius: 'var(--radius-xl)', padding: '0.4rem', marginBottom: '1.5rem', width: '100%' }}>
              {(['new', 'existing'] as const).map(mode => (
                <button key={mode} onClick={() => setPatientMode(mode)}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: 'var(--radius-lg)', background: patientMode === mode ? 'var(--surface)' : 'transparent', color: patientMode === mode ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: patientMode === mode ? 600 : 400, boxShadow: patientMode === mode ? 'var(--shadow-sm)' : 'none' }}>
                  {mode === 'new' ? 'Nouveau patient' : 'Patient existant'}
                </button>
              ))}
            </div>
            {patientMode === 'existing' && (
              <div className="form-group" style={{background: 'var(--secondary)', padding: '1rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem'}}>
                <label style={{fontSize: '1.1rem', color: 'var(--primary-dark)', fontWeight: 600}}>Pour quel patient ?</label>
                <select className="input-luxe" defaultValue=""
                  onChange={(e) => { if(e.target.value) { const val = JSON.parse(e.target.value); setFormData(prev => ({...prev, nom: val.nom, prenom: val.prenom, dateNaissance: val.dateNaissance})) }}}>
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
                {renderInputWithMic("Nom", "nom", "Ex: Dupont")}
                {renderInputWithMic("Prénom", "prenom", "Ex: Jean")}
                <div className="form-group">
                  <label>Date de naissance</label>
                  <input type="date" className="input-luxe" value={formData.dateNaissance} onChange={(e) => updateField('dateNaissance', e.target.value)} />
                </div>
              </>
            )}
            <div style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'block', marginBottom: 8 }}>Zone du bilan</label>
              <button
                onClick={() => setShowZonePopup(true)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: selectedBodyZone ? '1.5px solid var(--primary)' : '1.5px dashed var(--border-color)', background: selectedBodyZone ? 'var(--secondary)' : 'transparent', color: selectedBodyZone ? 'var(--primary-dark)' : 'var(--text-muted)', fontWeight: selectedBodyZone ? 600 : 400, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span>{selectedBodyZone ?? 'Sélectionner une zone…'}</span>
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
            {renderInputWithMic("Activité professionnelle", "profession", "Ex: Employé de bureau")}
            {renderInputWithMic("Activité physique / sportive", "sport", "Ex: Course à pied…")}
            {renderInputWithMic("Antécédents familiaux", "famille", "Diabète, hypertension…", true)}
            {renderInputWithMic("Antécédents chirurgicaux", "chirurgie", "Opérations passées…", true)}
            {renderInputWithMic("Notes complémentaires", "notes", "Précisions…", true)}
          </div>
          <div className="fixed-bottom">
            <button className="btn-primary-luxe" onClick={() => setStep('silhouette')}>
              Bilan corporel →
            </button>
          </div>
        </div>
      )}

      {/* ── Hidden SVGs for PDF ──────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', zIndex: -100 }}>
        <div id="pdf-face-svg" style={{ width: '200px', background: 'var(--surface)' }}><StaticBodyVisual view="Face" zoneData={silhouetteData} /></div>
        <div id="pdf-dos-svg"  style={{ width: '200px', background: 'var(--surface)' }}><StaticBodyVisual view="Dos"  zoneData={silhouetteData} /></div>
      </div>

      {/* ── Silhouette step ────────────────────────────────────────────────────── */}
      {step === 'silhouette' && (
        <div className="silhouette-screen fade-in">
          <header className="screen-header">
            <button className="btn-back" onClick={() => setStep('general_info')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h2 className="title-section">Bilan corporel</h2>
            <button onClick={handleQuitBilan} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0 }} aria-label="Quitter le bilan">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </header>
          <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${stepProgress}%` }} /></div>
          <div className="scroll-area flex-center" style={{ paddingBottom: '16rem' }}>
            <BodySilhouette onContextChange={(data) => setSilhouetteData(data)} />
          </div>
          <div className="fixed-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedBodyZone && (
              <button className="btn-primary-luxe" style={{ marginBottom: 0 }} onClick={() => { setBilanZoneBackStep('silhouette'); setStep('bilan_zone') }}>
                Commencer le bilan → {BILAN_ZONE_LABELS[getBilanType(selectedBodyZone)]}
              </button>
            )}
            <button className="btn-primary-luxe" style={{background: 'var(--primary-dark)', marginBottom: 0}}
              onClick={() => {
                saveBilan('incomplet')
                goToPatientRecord()
              }}>
              Enregistrer brouillon
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
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedBodyZone} · {formData.prenom} {formData.nom}</p>
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
                Observations libres, contexte supplémentaire… Ces notes seront incluses dans l'analyse IA et le PDF.
              </p>
              <textarea
                value={bilanNotes}
                onChange={e => setBilanNotes(e.target.value)}
                rows={4}
                placeholder="Ex : Patient stressé, travail physique intensifié ce mois-ci, essai de 3 séances de kiné il y a 6 mois sans succès…"
                style={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.88rem', color: 'var(--text-main)', background: 'var(--secondary)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            {/* ── Documents joints ── */}
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'block', marginBottom: 4 }}>
                Documents joints
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                Radios, comptes rendus médicaux, IRM… L'analyse IA en tiendra compte.
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
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1.5px dashed var(--border-color)', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Ajouter un document
                <input type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }}
                  onChange={e => {
                    const files = Array.from(e.target.files ?? [])
                    files.forEach(file => {
                      const reader = new FileReader()
                      reader.onload = async ev => {
                        const dataUrl = ev.target?.result as string
                        const mimeType = file.type || 'application/octet-stream'
                        // Pour les images, ajouter à la queue de masquage
                        if (mimeType.startsWith('image/')) {
                          setMaskingQueue(prev => [...prev, { dataUrl, name: file.name, mimeType }])
                        } else if (mimeType === 'application/pdf') {
                          // PDF : convertir en images puis ajouter à la queue
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
                          const base64 = dataUrl.split(',')[1]
                          setBilanDocuments(prev => [...prev, { name: file.name, mimeType, data: base64, addedAt: new Date().toISOString() }])
                          showToast('Document ajouté', 'info')
                        }
                      }
                      reader.readAsDataURL(file)
                    })
                    e.target.value = ''
                  }} />
              </label>
              <p style={{ fontSize: '0.7rem', color: '#92400e', margin: '6px 0 0', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Masquez les infos patient (nom, date de naissance, n° sécu) avant l'envoi à l'IA.
              </p>
            </div>

            {/* ── Actions (fin de page) ── */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="btn-primary-luxe" style={{ marginBottom: 0, background: 'linear-gradient(135deg, #1e3a8a, #2563eb)' }}
              onClick={handleSaveAndAnalyse}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/><path d="M14.5 3.5C17 4 19 6.5 19 9.5c0 1-.2 2-.6 2.8"/><path d="M9.5 3.5C7 4 5 6.5 5 9.5c0 1 .2 2 .6 2.8"/><path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/><path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/><path d="M9 20v-6"/><path d="M15 20v-6"/><path d="M9 14h6"/>
                  <circle cx="9" cy="20" r="1" fill="white" stroke="none"/><circle cx="15" cy="20" r="1" fill="white" stroke="none"/>
                </svg>
                Analyse IA + Enregistrer
              </div>
            </button>
            <button className="btn-primary-luxe"
              style={{ marginBottom: 0, background: 'var(--primary-dark)' }}
              onClick={() => { saveBilan('complet'); setCurrentBilanId(null); setCurrentBilanDataOverride(null); setBilanZoneBackStep('general_info'); goToPatientRecord() }}>
              Enregistrer sans IA
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
        const bilans = getPatientBilans(patKey).filter(r => r.status === 'complet')
        const evolutionBilans = bilans.map((r, i) => ({
          num: i + 1,
          date: r.dateBilan,
          zone: r.zone ?? '',
          evn: r.evn ?? null,
          bilanData: r.bilanData ?? {},
        }))
        return (
          <BilanEvolutionIA
            apiKey={apiKey}
            context={{
              patient: { nom: formData.nom, prenom: formData.prenom, dateNaissance: formData.dateNaissance, profession: formData.profession, sport: formData.sport, antecedents: formData.famille },
              bilans: evolutionBilans,
            }}
            onBack={() => setStep('database')}
            onClose={() => setStep('database')}
            onGoToProfile={() => setStep('profile')}
          />
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
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#5b21b6' }}>Note de séance n°{numSeance}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formData.nom} {formData.prenom} · {ZONE_LABELS[bilanType]}</div>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}>SOAP</span>
            </header>

            <div className="scroll-area" style={{ paddingBottom: '9rem' }}>
              <NoteSeance key={currentNoteSeanceId ?? `new-note-${noteSeanceZone}`} ref={noteSeanceRef} initialData={currentNoteSeanceData ?? undefined} />
            </div>

            <div className="fixed-bottom" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                onClick={handleSaveNote}>
                Enregistrer la note de séance
              </button>
              <button
                style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--radius-lg)', background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => {
                  const data = noteSeanceRef.current?.getData()
                  handleSaveNote()
                  // Build contexte from la séance en cours
                  const patKey = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
                  const bt = getBilanType(noteSeanceZone ?? '')
                  const allNotesForZone = dbNotes.filter(n => n.patientKey === patKey && (n.bilanType ?? getBilanType(n.zone ?? '')) === bt)
                  const allBilansForZone = db.filter(r => `${(r.nom || '').toUpperCase()} ${r.prenom}`.trim() === patKey && (r.bilanType ?? getBilanType(r.zone ?? '')) === bt)
                  const historiqueStr = [
                    ...allBilansForZone.map(b => `Bilan ${b.dateBilan} — EVN ${b.evn ?? '?'}/10`),
                    ...allNotesForZone.map(n => `Séance n°${n.numSeance} — EVA ${n.data.eva}/10 — ${n.data.evolution}`),
                  ].join('\n')
                  const savedNoteId = dbNotes.filter(n => n.patientKey === patKey).sort((a, b) => b.id - a.id)[0]?.id ?? Date.now()
                  setFicheExerciceContextOverride({
                    zone: noteSeanceZone ?? '',
                    bilanData: {},
                    notesLibres: `SÉANCE DU JOUR\nEVA: ${data?.eva ?? '?'}/10 — ${data?.evolution ?? ''}\nInterventions: ${data?.interventions?.join(', ') ?? ''}\nDosage: ${data?.detailDosage ?? ''}\nTolérance: ${data?.tolerance ?? ''}\nRessenti: ${data?.noteSubjective ?? ''}\n\nHistorique:\n${historiqueStr}`,
                  })
                  setFicheExerciceSource({ type: 'note', id: savedNoteId })
                  setFicheBackStep('database')
                  setStep('fiche_exercice')
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                Fiche d'exercices
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
        <BilanNoteIntermediaire
          apiKey={apiKey}
          patient={{ nom: formData.nom, prenom: formData.prenom, dateNaissance: formData.dateNaissance }}
          zone={currentIntermediaireForNote.zone ?? ''}
          bilanType={currentIntermediaireForNote.bilanType ?? getBilanType(currentIntermediaireForNote.zone ?? '')}
          intermData={currentIntermediaireForNote.data ?? {}}
          historique={currentIntermediaireHistorique}
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
          onGoToProfile={() => setStep('profile')}
          onFicheExercice={() => {
            setFicheBackStep('database')
            setStep('fiche_exercice')
          }}
        />
      )}

      {/* ── PDF Preview step ──────────────────────────────────────────────────── */}
      {step === 'pdf_preview' && (
        <PDFPreview
          patient={{ nom: formData.nom, prenom: formData.prenom, dateNaissance: formData.dateNaissance }}
          zone={pdfPreviewZone}
          markdown={pdfPreviewMarkdown}
          pdfTitle={pdfPreviewTitle}
          onBack={() => setStep('database')}
        />
      )}

      {/* ── Analyse IA step ────────────────────────────────────────────────────── */}
      {step === 'analyse_ia' && (
        <BilanAnalyseIA
          apiKey={apiKey}
          context={{
            patient: { nom: formData.nom, prenom: formData.prenom, dateNaissance: formData.dateNaissance, profession: formData.profession, sport: formData.sport, antecedents: formData.famille },
            zone: selectedBodyZone ?? '',
            bilanType: getBilanType(selectedBodyZone ?? ''),
            bilanData: currentBilanDataOverride ?? getBilanData() ?? {},
            notesLibres: bilanNotes,
            therapist: { specialites: profile.specialites, techniques: profile.techniques, equipements: profile.equipements, autresCompetences: profile.autresCompetences },
          }}
          documents={bilanDocuments.length > 0 ? bilanDocuments : undefined}
          cached={currentAnalyseIA}
          onResult={(analyse) => {
            setCurrentAnalyseIA(analyse)
            if (currentBilanId !== null) {
              setDb(prev => prev.map(r => r.id === currentBilanId ? { ...r, analyseIA: analyse } : r))
            }
            showToast('Analyse IA générée', 'success')
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
          onGoToProfile={() => setStep('profile')}
          onFicheExercice={() => { setFicheBackStep('analyse_ia'); setStep('fiche_exercice') }}
        />
      )}

      {/* ── Fiche Exercice IA step ────────────────────────────────────────────── */}
      {step === 'fiche_exercice' && (
        <FicheExerciceIA
          apiKey={apiKey}
          context={{
            patient: { nom: formData.nom, prenom: formData.prenom, dateNaissance: formData.dateNaissance, profession: formData.profession, sport: formData.sport, antecedents: formData.famille },
            zone: ficheExerciceContextOverride?.zone ?? selectedBodyZone ?? '',
            bilanType: getBilanType(ficheExerciceContextOverride?.zone ?? selectedBodyZone ?? ''),
            bilanData: ficheExerciceContextOverride?.bilanData ?? currentBilanDataOverride ?? getBilanData() ?? {},
            notesLibres: ficheExerciceContextOverride?.notesLibres ?? bilanNotes,
            therapist: { specialites: profile.specialites, techniques: profile.techniques, equipements: profile.equipements, autresCompetences: profile.autresCompetences },
            patientHistory: (() => {
              const patKey = selectedPatient ?? `${formData.nom}_${formData.prenom}_${formData.dateNaissance}`
              const history: import('./utils/clinicalPrompt').PatientHistoryEntry[] = []
              // Bilans initiaux
              for (const b of getPatientBilans(patKey)) {
                history.push({ type: 'bilan', date: b.dateBilan, zone: b.zone ?? '', evn: b.evn, data: b.bilanData as Record<string, unknown> | undefined, ficheExercice: b.ficheExercice })
              }
              // Bilans intermédiaires
              for (const b of getPatientIntermediaires(patKey)) {
                history.push({ type: 'intermediaire', date: b.dateBilan, zone: b.zone ?? '', data: b.data, analyseIA: b.analyseIA ? { resume: b.analyseIA.noteDiagnostique.description, evolution: b.analyseIA.noteDiagnostique.evolution } : null, ficheExercice: b.ficheExercice })
              }
              // Notes de séance
              for (const n of getPatientNotes(patKey)) {
                history.push({ type: 'note_seance', date: n.dateSeance, zone: n.zone ?? '', noteData: n.data, analyseIA: n.analyseIA ? { focus: n.analyseIA.focus } : null, ficheExercice: n.ficheExercice })
              }
              return history
            })(),
          }}
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
          onGoToProfile={() => setStep('profile')}
        />
      )}
    </div>
  )
}

export default App
