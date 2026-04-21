import { useEffect, useRef, useState, useCallback } from 'react'
import type { BilanType } from '../types'
import { transcribeAudio, extractBilanFromTranscription } from '../utils/voiceBilanClient'

type Status = 'idle' | 'recording' | 'transcribing' | 'review' | 'extracting' | 'error'

interface Props {
  bilanType: BilanType
  onFill: (partial: Record<string, unknown>) => void
}

const BAR_COUNT = 28
const CACHE_KEY = 'voice_dictation_cache'

function loadCache(): { text: string; bilanType: string; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed.text !== 'string' || !parsed.text.trim()) return null
    return parsed
  } catch { return null }
}

function saveCache(text: string, bilanType: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ text, bilanType, timestamp: Date.now() }))
  } catch { /* quota exceeded — non-blocking */ }
}

export function VoiceDictation({ bilanType, onFill }: Props) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [transcription, setTranscription] = useState('')
  const [levels, setLevels] = useState<number[]>(() => new Array(BAR_COUNT).fill(0))
  const cached = loadCache()

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const timerIntervalRef = useRef<number | null>(null)

  const cleanupAudio = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => undefined)
      audioCtxRef.current = null
    }
    analyserRef.current = null
  }, [])

  useEffect(() => {
    return () => cleanupAudio()
  }, [cleanupAudio])

  const pickMimeType = (): string => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ]
    for (const m of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) return m
    }
    return ''
  }

  const startRecording = async () => {
    setErrorMsg('')
    setTranscription('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream

      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.6
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        cleanupAudio()
        if (blob.size === 0) {
          setStatus('error')
          setErrorMsg('Aucun son enregistré')
          return
        }
        setStatus('transcribing')
        try {
          const text = await transcribeAudio(blob)
          setTranscription(text)
          saveCache(text, bilanType)
          setStatus('review')
        } catch (e) {
          setStatus('error')
          setErrorMsg((e as Error).message)
        }
      }

      recorder.start()
      startTimeRef.current = Date.now()
      setElapsedMs(0)
      setStatus('recording')

      // Timer
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current)
      }, 200)

      // Animation boucle : lit le volume et décale un buffer de BAR_COUNT valeurs.
      const timeData = new Uint8Array(analyser.fftSize)
      const history: number[] = new Array(BAR_COUNT).fill(0)
      const loop = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteTimeDomainData(timeData)
        // RMS amplitude (0..1) à partir des échantillons signés autour de 128
        let sum = 0
        for (let i = 0; i < timeData.length; i++) {
          const v = (timeData[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / timeData.length)
        const scaled = Math.min(1, rms * 3)
        history.shift()
        history.push(scaled)
        setLevels([...history])
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    } catch (e) {
      cleanupAudio()
      setStatus('error')
      const name = (e as Error).name
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorMsg("Accès au microphone refusé. Autorise-le dans les réglages du navigateur.")
      } else {
        setErrorMsg(`Impossible de démarrer l'enregistrement : ${(e as Error).message}`)
      }
    }
  }

  const stopRecording = () => {
    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') {
      rec.stop()
    }
  }

  const confirmAndFill = async () => {
    if (!transcription.trim()) return
    setStatus('extracting')
    setErrorMsg('')
    try {
      const partial = await extractBilanFromTranscription(transcription, bilanType)
      onFill(partial)
      setStatus('idle')
      setOpen(false)
      setTranscription('')
      setElapsedMs(0)
    } catch (e) {
      setStatus('error')
      setErrorMsg((e as Error).message)
    }
  }

  const resetAll = () => {
    cleanupAudio()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch { /* noop */ }
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
    setStatus('idle')
    setErrorMsg('')
    setTranscription('')
    setElapsedMs(0)
    setLevels(new Array(BAR_COUNT).fill(0))
  }

  const closePanel = () => {
    resetAll()
    setOpen(false)
  }

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r.toString().padStart(2, '0')}`
  }

  // ── Bouton d'ouverture (état replié) ────────────────────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setStatus('idle') }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%',
          padding: '12px 16px',
          background: 'var(--primary)',
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          fontSize: '0.92rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: 12,
        }}
      >
        <MicIcon />
        Dicter le bilan à la voix
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>
          ✨ Remplissage automatique
        </span>
      </button>
    )
  }

  // ── Panneau déplié ──────────────────────────────────────────────────────
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <MicIcon color="var(--primary-dark)" />
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
          Dictée vocale du bilan
        </span>
        <button
          type="button"
          onClick={closePanel}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '1.1rem',
            padding: 4,
          }}
          aria-label="Fermer"
        >×</button>
      </div>

      {status === 'idle' && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <button
            type="button"
            onClick={startRecording}
            style={bigMicBtnStyle}
          >
            <MicIcon size={32} color="#fff" />
          </button>
          <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Appuie pour commencer à parler
          </div>
          <div style={{ marginTop: 8, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Décris le bilan comme tu le dirais à haute voix — l'IA remplira les champs automatiquement.
          </div>
          {cached && (
            <button
              type="button"
              onClick={() => {
                setTranscription(cached.text)
                setStatus('review')
              }}
              style={{
                marginTop: 14,
                padding: '9px 16px',
                background: 'var(--secondary)',
                color: 'var(--primary-dark)',
                border: '1px solid var(--border-color)',
                borderRadius: 10,
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Reprendre la dernière dictée
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                ({new Date(cached.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })})
              </span>
            </button>
          )}
        </div>
      )}

      {status === 'recording' && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              height: 70,
              padding: '0 8px',
              marginBottom: 10,
            }}
          >
            {levels.map((v, i) => (
              <div
                key={i}
                style={{
                  width: 5,
                  height: `${Math.max(6, v * 70)}px`,
                  background: 'var(--primary)',
                  borderRadius: 3,
                  transition: 'height 80ms linear',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-dark)', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(elapsedMs)}
          </div>
          <button
            type="button"
            onClick={stopRecording}
            style={{
              ...bigMicBtnStyle,
              background: '#dc2626',
              marginTop: 12,
            }}
            aria-label="Arrêter l'enregistrement"
          >
            <StopIcon />
          </button>
          <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Appuie pour arrêter
          </div>
        </div>
      )}

      {status === 'transcribing' && (
        <StatusLine label="Transcription en cours…" />
      )}

      {status === 'review' && (
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
            Transcription (modifiable avant validation)
          </div>
          <textarea
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '0.88rem',
              color: 'var(--text-main)',
              background: 'var(--secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 10,
              resize: 'vertical',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={resetAll} style={secondaryBtnStyle}>
              Recommencer
            </button>
            <button
              type="button"
              onClick={confirmAndFill}
              disabled={!transcription.trim()}
              style={primaryBtnStyle}
            >
              ✨ Remplir le bilan
            </button>
          </div>
        </div>
      )}

      {status === 'extracting' && (
        <StatusLine label="Analyse et remplissage du bilan…" />
      )}

      {status === 'error' && (
        <div style={{ padding: 12, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10 }}>
          <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600, marginBottom: 6 }}>
            Erreur
          </div>
          <div style={{ fontSize: '0.82rem', color: '#991b1b', marginBottom: 10 }}>
            {errorMsg}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={resetAll} style={secondaryBtnStyle}>
              Réessayer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Petits composants visuels ─────────────────────────────────────────────

function StatusLine({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', justifyContent: 'center' }}>
      <div style={spinnerStyle} />
      <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <style>{`
        @keyframes voiceSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function MicIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

// ─── Styles partagés ──────────────────────────────────────────────────────

const bigMicBtnStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: '50%',
  background: 'var(--primary)',
  border: 'none',
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
}

const primaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '11px 16px',
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: '0.88rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: '11px 16px',
  background: 'var(--secondary)',
  color: 'var(--text-main)',
  border: '1px solid var(--border-color)',
  borderRadius: 10,
  fontSize: '0.88rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const spinnerStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  border: '2px solid var(--border-color)',
  borderTopColor: 'var(--primary)',
  borderRadius: '50%',
  animation: 'voiceSpin 0.8s linear infinite',
}
