import { useState, useRef } from 'react'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useLocalStorage } from './hooks/useLocalStorage'
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
import { BilanAnalyseIA } from './components/BilanAnalyseIA'
import { BilanEvolutionIA } from './components/BilanEvolutionIA'
import { generatePDF } from './utils/pdfGenerator'
import type { ImprovementEntry } from './utils/pdfGenerator'
import { getBilanType, BODY_ZONES, BILAN_ZONE_LABELS } from './utils/bilanRouter'
import type { BilanRecord, ProfileData, AnalyseIA } from './types'
import './App.css'

type Step = 'dashboard' | 'database' | 'profile' | 'identity' | 'general_info' | 'silhouette' | 'bilan_zone' | 'analyse_ia' | 'evolution_ia'

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

  // ── Persistent state ──────────────────────────────────────────────────────────
  const [db, setDb] = useLocalStorage<BilanRecord[]>('physio_db', DEMO_DB)
  const [profile, setProfile] = useLocalStorage<ProfileData>('physio_profile', DEFAULT_PROFILE)
  const [apiKey, setApiKey] = useLocalStorage<string>('physio_api_key', '')

  // ── Transient UI state ────────────────────────────────────────────────────────
  const [currentBilanId, setCurrentBilanId] = useState<number | null>(null)
  const [currentAnalyseIA, setCurrentAnalyseIA] = useState<AnalyseIA | null>(null)
  const [currentBilanDataOverride, setCurrentBilanDataOverride] = useState<Record<string, unknown> | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [testingApiKey, setTestingApiKey] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [patientMode, setPatientMode] = useState<'new' | 'existing'>('new')
  const [silhouetteData, setSilhouetteData] = useState<Record<string, unknown>>({})
  const [selectedBodyZone, setSelectedBodyZone] = useState<string | null>(null)
  const [showZonePopup, setShowZonePopup] = useState(false)
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
  const bilanGeneriqueRef = useRef<BilanGeneriqueHandle>(null)
  const photoInputRef    = useRef<HTMLInputElement>(null)
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

  const resetForm = () => {
    setFormData({ nom: '', prenom: '', dateNaissance: '', profession: '', sport: '', famille: '', chirurgie: '', notes: '' })
    setSilhouetteData({})
    setPatientMode('new')
    setCurrentAnalyseIA(null)
    setBilanNotes('')
  }

  const getPatientBilans = (key: string) =>
    db.filter(r => `${(r.nom || 'Anonyme').toUpperCase()} ${r.prenom}`.trim() === key)
      .sort((a, b) => a.id - b.id)

  const improvDelta = (prev: number, curr: number) => Math.round(((prev - curr) / prev) * 100)

  const patientGeneralScore = (key: string): number | null => {
    const bilans = getPatientBilans(key)
    if (bilans.length < 2) return null
    const first = bilans[0].evn, last = bilans[bilans.length - 1].evn
    if (first == null || last == null) return null
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
        ? { ...r, status, bilanData: bilanData ?? undefined, bilanType, evn: evnValue ?? r.evn }
        : r))
      showToast(status === 'complet' ? 'Bilan complété' : 'Brouillon enregistré', 'success')
      setCurrentBilanId(null)
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
      }
      setDb(prev => [...prev, record])
      setCurrentBilanId(newId)
      showToast(status === 'complet' ? 'Bilan enregistré' : 'Brouillon sauvegardé', 'success')
      if (status === 'complet') return newId
    }
    return currentBilanId
  }

  const handleSaveAndAnalyse = () => {
    saveBilan('complet')
    setCurrentBilanDataOverride(null)
    setStep('analyse_ia')
  }

  const handleExportPDF = () => {
    const bilanData = getBilanData()
    const patKey = `${(formData.nom || 'Anonyme').toUpperCase()} ${formData.prenom}`.trim()
    const patBilans = getPatientBilans(patKey).filter(r => r.evn != null)
    const entries: ImprovementEntry[] = patBilans.map((r, i) => ({
      num: i + 1, date: r.dateBilan, evn: r.evn ?? null,
      delta: i === 0 ? null : improvDelta(patBilans[i - 1].evn!, r.evn!),
    }))
    const generalScore = patientGeneralScore(patKey)
    generatePDF(
      formData, formData, silhouetteData,
      bilanData ? { sectionTitle: selectedBodyZone ?? '', data: bilanData } : null,
      entries.length > 0 ? { generalScore, bilans: entries } : null,
      currentAnalyseIA ?? undefined,
      bilanNotes || undefined,
    )
  }

  const handleExportData = () => {
    const payload = JSON.stringify({ db, profile, apiKey, exportedAt: new Date().toISOString() }, null, 2)
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
        setDb(parsed.db)
        if (parsed.profile) setProfile(parsed.profile)
        if (parsed.apiKey) { setApiKey(parsed.apiKey); setApiKeyDraft(parsed.apiKey) }
        showToast(`${parsed.db.length} bilans importés`, 'success')
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
      const res = await fetch('/groq/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKeyDraft.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      })
      if (res.ok || res.status === 200) {
        setApiKeyStatus('ok')
        showToast('Connexion Groq réussie', 'success')
      } else if (res.status === 401) {
        setApiKeyStatus('error')
        showToast('Clé API invalide (401)', 'error')
      } else {
        // 429 quota, etc. — la clé est valide
        setApiKeyStatus('ok')
        showToast('Clé API acceptée', 'success')
      }
    } catch {
      // CORS — on accepte quand même
      setApiKeyStatus('ok')
      showToast('Clé sauvegardée (connexion non vérifiable depuis ce navigateur)', 'info')
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
            <button className="btn-primary-luxe" onClick={() => { setSelectedBodyZone(null); setPatientMode('new'); setShowZonePopup(true) }} style={{marginBottom: 0}}>
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
                        const scoreBg   = score === null ? '#f1f5f9' : score > 0 ? '#dcfce7' : '#fee2e2'
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
                              ? <span style={{ fontWeight: 700, fontSize: '0.88rem', color: scoreColor, background: scoreBg, padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', flexShrink: 0 }}>
                                  {score > 0 ? '+' : ''}{score}%
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
                  const generalScore = patientGeneralScore(selectedPatient)
                  const gsColor  = generalScore === null ? '#94a3b8' : generalScore > 0 ? '#16a34a' : '#dc2626'
                  const gsBg     = generalScore === null ? '#f1f5f9' : generalScore > 0 ? '#f0fdf4' : '#fef2f2'
                  const gsBorder = generalScore === null ? '#e2e8f0' : generalScore > 0 ? '#86efac' : '#fca5a5'
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
                      {generalScore !== null && (
                        <div style={{ background: gsBg, border: `1px solid ${gsBorder}`, borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Score global d'amélioration</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>EVN initial : <strong>{bilans[0]?.evn ?? '—'}</strong> → actuel : <strong>{bilans[bilans.length - 1]?.evn ?? '—'}</strong></div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '1.75rem', color: gsColor }}>{generalScore > 0 ? '+' : ''}{generalScore}%</div>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingBottom: '5rem' }}>
                        {bilans.map((record, index) => {
                          const prevEvn = index > 0 ? bilans[index - 1].evn : null
                          const currEvn = record.evn
                          const delta   = (prevEvn != null && currEvn != null) ? improvDelta(prevEvn, currEvn) : null
                          const dColor  = delta === null ? '' : delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#94a3b8'
                          const dBg     = delta === null ? '' : delta > 0 ? '#dcfce7' : delta < 0 ? '#fee2e2' : '#f1f5f9'
                          const incomplet = record.status === 'incomplet'
                          return (
                            <div key={record.id} style={{ background: incomplet ? '#fffbeb' : 'var(--surface)', padding: '0.9rem 1.25rem', borderRadius: 'var(--radius-lg)', border: `1px solid ${incomplet ? '#fcd34d' : 'var(--border-color)'}`, boxShadow: 'var(--shadow-sm)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '0.95rem' }}>Bilan N°{index + 1}</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', background: incomplet ? '#fef3c7' : '#dcfce7', color: incomplet ? '#92400e' : '#166534' }}>
                                      {incomplet ? 'Incomplet' : 'Complet'}
                                    </span>
                                    {record.analyseIA && (
                                      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-full)', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>IA</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {record.dateBilan}{currEvn != null ? ` · EVN : ${currEvn}` : ''}{record.zone ? ` · ${record.zone}` : ''}
                                  </div>
                                </div>
                                {delta !== null && (
                                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: dColor, background: dBg, padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-full)', flexShrink: 0 }}>
                                    {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {Math.abs(delta)}%
                                  </span>
                                )}
                              </div>
                              {incomplet && (
                                <button className="btn-primary-luxe"
                                  style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '0.88rem', padding: '0.65rem 1rem' }}
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance }))
                                    setSelectedBodyZone(record.zone ?? null)
                                    setCurrentBilanId(record.id)
                                    setStep('bilan_zone')
                                  }}>
                                  Continuer le bilan →
                                </button>
                              )}
                              {!incomplet && (
                                <button
                                  style={{ marginTop: '0.75rem', width: '100%', padding: '0.6rem 1rem', borderRadius: 10, background: record.analyseIA ? '#eff6ff' : 'linear-gradient(135deg, #1e3a8a, #2563eb)', border: record.analyseIA ? '1.5px solid #bfdbfe' : 'none', color: record.analyseIA ? '#1d4ed8' : 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, nom: record.nom, prenom: record.prenom, dateNaissance: record.dateNaissance }))
                                    setSelectedBodyZone(record.zone ?? null)
                                    setCurrentBilanId(record.id)
                                    setCurrentAnalyseIA(record.analyseIA ?? null)
                                    setCurrentBilanDataOverride(record.bilanData ?? null)
                                    setStep('analyse_ia')
                                  }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9.5 2a2.5 2.5 0 0 1 5 0v1.5"/><path d="M14.5 3.5C17 4 19 6.5 19 9.5c0 1-.2 2-.6 2.8"/><path d="M9.5 3.5C7 4 5 6.5 5 9.5c0 1 .2 2 .6 2.8"/><path d="M5.6 12.3C4 13 3 14.4 3 16a4 4 0 0 0 4 4h2"/><path d="M18.4 12.3C20 13 21 14.4 21 16a4 4 0 0 1-4 4h-2"/><path d="M9 20v-6"/><path d="M15 20v-6"/><path d="M9 14h6"/>
                                    <circle cx="9" cy="20" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="20" r="1" fill="currentColor" stroke="none"/>
                                  </svg>
                                  {record.analyseIA ? 'Voir l\'analyse IA' : 'Lancer l\'analyse IA'}
                                </button>
                              )}
                            </div>
                          )
                        })}
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
                        <button
                          onClick={() => {
                            const firstRec = bilans[0]
                            setFormData(prev => ({ ...prev, nom: firstRec?.nom ?? '', prenom: firstRec?.prenom ?? '', dateNaissance: firstRec?.dateNaissance ?? '' }))
                            setPatientMode('existing')
                            setSelectedBodyZone(null)
                            setShowZonePopup(true)
                          }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-color)', background: 'transparent', color: 'var(--primary)', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}>
                          <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>+</span> Nouveau bilan
                        </button>
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
        const regressN  = allPatientKeys.filter(k => (patientGeneralScore(k) ?? 1) <= 0).length
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

                  {/* IA Section */}
                  <div style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem', marginBottom: 12 }}>Intelligence Artificielle</div>
                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid var(--border-color)' }}>
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: '0.82rem' }}>Clé API Groq</label>
                        <input type="password" className={`input-luxe api-key-field`}
                          value={apiKeyDraft} onChange={e => { setApiKeyDraft(e.target.value); setApiKeyStatus('idle') }}
                          placeholder="gsk_…" />
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
                  </div>

                  <div style={{ background:'var(--surface)', borderRadius:'var(--radius-xl)', padding:'1.25rem', marginBottom:'1.25rem', boxShadow:'var(--shadow-sm)', border:'1px solid var(--border-color)' }}>
                    <div style={{ fontWeight:700, color:'var(--primary-dark)', marginBottom:'1rem' }}>Mes Patients</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'1.25rem' }}>
                      <svg viewBox="0 0 150 150" width="130" height="130" style={{ flexShrink:0 }}>
                        <circle cx="75" cy="75" r={r} fill="none" stroke="#e2e8f0" strokeWidth="14"/>
                        {forte   > 0 && <circle cx="75" cy="75" r={r} fill="none" stroke="#22c55e" strokeWidth="14" strokeDasharray={`${seg(forte)} ${circ}`}   strokeDashoffset={startOff} strokeLinecap="round"/>}
                        {moderee > 0 && <circle cx="75" cy="75" r={r} fill="none" stroke="#f97316" strokeWidth="14" strokeDasharray={`${seg(moderee)} ${circ}`} strokeDashoffset={startOff - slot(forte)} strokeLinecap="round"/>}
                        {regressN> 0 && <circle cx="75" cy="75" r={r} fill="none" stroke="#ef4444" strokeWidth="14" strokeDasharray={`${seg(regressN)} ${circ}`} strokeDashoffset={startOff - slot(forte) - slot(moderee)} strokeLinecap="round"/>}
                        <text x="75" y="69" textAnchor="middle" fill="var(--primary-dark)" fontSize="26" fontWeight="800">{total}</text>
                        <text x="75" y="87" textAnchor="middle" fill="#94a3b8" fontSize="11">patients</text>
                      </svg>
                      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.85rem' }}>
                        {[
                          { label:'Bilans réalisés', value: db.length, color:'var(--primary)' },
                          { label:'Score global', value: `${globalScore}%`, color: gsColor },
                          { label:'En amélioration', value: forte + moderee, color:'#16a34a' },
                          { label:'En régression', value: regressN, color:'#dc2626' },
                          { label:'Bilans incomplets', value: incompletCount, color: incompletCount > 0 ? '#d97706' : '#94a3b8' },
                        ].map(s => (
                          <div key={s.label}>
                            <div style={{ fontSize:'1.4rem', fontWeight:800, color: s.color, lineHeight:1 }}>{s.value}</div>
                            <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:'0.2rem', lineHeight:1.2 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', marginTop:'1rem', paddingTop:'0.75rem', borderTop:'1px solid var(--border-color)' }}>
                      {[{ c:'#22c55e', l:'Forte amélioration (>50%)' }, { c:'#f97316', l:'Modérée (1–50%)' }, { c:'#ef4444', l:'Régression' }].map(({ c, l }) => (
                        <div key={l} style={{ display:'flex', alignItems:'center', gap:'0.35rem', fontSize:'0.72rem', color:'var(--text-muted)' }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:c, flexShrink:0 }} />{l}
                        </div>
                      ))}
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
              onClick={() => {
                setShowZonePopup(false)
                if (patientMode === 'existing') setStep('silhouette')
                else { resetForm(); setStep('identity') }
              }}>
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
            <div style={{width: '24px'}} />
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
          </div>
          <div className="fixed-bottom">
            <button className="btn-primary-luxe" onClick={() => setStep(patientMode === 'existing' ? 'silhouette' : 'general_info')}>
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
            <div style={{width: '24px'}} />
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
              Passer au bilan corporel
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
            <button className="btn-back" onClick={() => setStep(patientMode === 'existing' ? 'identity' : 'general_info')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <h2 className="title-section">Bilan corporel</h2>
            <div style={{width: '24px'}} />
          </header>
          <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${stepProgress}%` }} /></div>
          <div className="scroll-area flex-center" style={{ paddingBottom: '16rem' }}>
            <BodySilhouette onContextChange={(data) => setSilhouetteData(data)} />
          </div>
          <div className="fixed-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selectedBodyZone && (
              <button className="btn-primary-luxe" style={{ marginBottom: 0 }} onClick={() => setStep('bilan_zone')}>
                Continuer → {BILAN_ZONE_LABELS[getBilanType(selectedBodyZone)]}
              </button>
            )}
            <button className="btn-primary-luxe" style={{background: 'var(--primary-dark)', marginBottom: 0}}
              onClick={() => {
                saveBilan('incomplet')
                setStep('dashboard')
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
            <button className="btn-back" onClick={() => setStep('silhouette')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{ flex: 1 }}>
              <h2 className="title-section" style={{ marginBottom: 0 }}>{BILAN_ZONE_LABELS[getBilanType(selectedBodyZone ?? '')]}</h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedBodyZone} · {formData.prenom} {formData.nom}</p>
            </div>
            <div style={{width: '24px'}} />
          </header>
          <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${stepProgress}%` }} /></div>

          <div className="scroll-area" style={{ paddingBottom: '13rem' }}>
            {getBilanType(selectedBodyZone ?? '') === 'epaule'   && <BilanEpaule   ref={bilanEpauleRef} />}
            {getBilanType(selectedBodyZone ?? '') === 'cheville' && <BilanCheville ref={bilanChevilleRef} />}
            {getBilanType(selectedBodyZone ?? '') === 'genou'    && <BilanGenou    ref={bilanGenouRef} />}
            {getBilanType(selectedBodyZone ?? '') === 'hanche'   && <BilanHanche   ref={bilanHancheRef} />}
            {getBilanType(selectedBodyZone ?? '') === 'cervical' && <BilanCervical ref={bilanCervicalRef} />}
            {getBilanType(selectedBodyZone ?? '') === 'lombaire' && <BilanLombaire ref={bilanLombaireRef} />}
            {getBilanType(selectedBodyZone ?? '') === 'generique'&& <BilanGenerique ref={bilanGeneriqueRef} />}

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
          </div>

          <div className="fixed-bottom" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
              onClick={() => { saveBilan('complet'); setStep('dashboard') }}>
              Enregistrer sans IA
            </button>
            <button className="btn-primary-luxe"
              style={{ marginBottom: 0, background: 'linear-gradient(to right, #059669, #047857)' }}
              onClick={handleExportPDF}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                Télécharger le PDF
              </div>
            </button>
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
            onGoToProfile={() => setStep('profile')}
          />
        )
      })()}

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
          }}
          cached={currentAnalyseIA}
          onResult={(analyse) => {
            setCurrentAnalyseIA(analyse)
            if (currentBilanId !== null) {
              setDb(prev => prev.map(r => r.id === currentBilanId ? { ...r, analyseIA: analyse } : r))
            }
            showToast('Analyse IA générée', 'success')
          }}
          onBack={() => {
            if (currentBilanDataOverride !== null) {
              setCurrentBilanDataOverride(null)
              setStep('database')
            } else {
              setStep('bilan_zone')
            }
          }}
          onExport={handleExportPDF}
          onGoToProfile={() => setStep('profile')}
        />
      )}
    </div>
  )
}

export default App
