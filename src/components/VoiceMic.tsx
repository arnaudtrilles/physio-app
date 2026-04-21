import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { transcribeAudio, reformulateTranscription } from '../utils/voiceBilanClient'

type VoiceMicState = 'idle' | 'recording' | 'transcribing' | 'reformulating' | 'error'

const BAR_COUNT = 24
const MAX_RETRIES = 2

interface RecordingOverlayProps {
  bars: number[]
  onStop: () => void
}

function RecordingOverlay({ bars, onStop }: RecordingOverlayProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      width: '100%', height: '100%', minHeight: 44,
      padding: '8px 12px', boxSizing: 'border-box',
      background: 'var(--secondary)', borderRadius: 'inherit',
      border: '1.5px solid var(--border-color)',
    }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 2, height: 28,
        overflow: 'hidden',
      }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            width: 2.5, height: h, borderRadius: 2,
            background: 'var(--text-muted)',
            transition: 'height 0.08s ease',
            flexShrink: 0,
          }} />
        ))}
      </div>
      <button
        type="button"
        onClick={onStop}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--text-muted)', border: 'none',
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
        title="Arrêter et transcrire"
      >
        <div style={{ width: 12, height: 12, borderRadius: 2, background: 'white' }} />
      </button>
    </div>
  )
}

function ProcessingOverlay({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, width: '100%', height: '100%', minHeight: 44,
      padding: '8px 12px', boxSizing: 'border-box',
      background: 'var(--secondary)', borderRadius: 'inherit',
      border: '1.5px solid var(--border-color)',
    }}>
      <div style={{
        width: 16, height: 16, border: '2px solid var(--text-muted)',
        borderTopColor: 'transparent', borderRadius: '50%',
        animation: 'voicemic-spin 0.7s linear infinite',
      }} />
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        {label}
      </span>
      <style>{`@keyframes voicemic-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ErrorOverlay({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, width: '100%', height: '100%', minHeight: 44,
        padding: '8px 12px', boxSizing: 'border-box',
        background: '#fef2f2', borderRadius: 'inherit',
        border: '1.5px solid #fca5a5', cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>
        {message}
      </span>
    </div>
  )
}

async function transcribeWithRetry(blob: Blob, retries = MAX_RETRIES): Promise<string> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await transcribeAudio(blob)
    } catch (err) {
      lastError = err as Error
      console.warn(`[VoiceMic] Transcription attempt ${attempt + 1} failed:`, err)
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
      }
    }
  }
  throw lastError!
}

function useVoiceRecorder(onResult: (text: string) => void, fieldHint: string) {
  const [state, setState] = useState<VoiceMicState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(3))
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef<number>(0)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult
  const fieldHintRef = useRef(fieldHint)
  fieldHintRef.current = fieldHint

  const stopAll = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    analyserRef.current = null
    mediaRef.current = null
  }, [])

  useEffect(() => () => stopAll(), [stopAll])

  const start = useCallback(async () => {
    if (state !== 'idle' && state !== 'error') return
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new AudioContext()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        const allChunks = [...chunksRef.current]
        const blob = new Blob(allChunks, { type: recorder.mimeType })
        const duration = Date.now() - startTimeRef.current
        stopAll()

        console.log(`[VoiceMic] Recording stopped, blob: ${blob.size}B, chunks: ${allChunks.length}, duration: ${duration}ms`)

        if (blob.size < 100 || duration < 800) {
          setState('idle')
          return
        }

        setState('transcribing')
        try {
          const rawText = await transcribeWithRetry(blob)
          console.log(`[VoiceMic] Raw transcription: "${rawText.slice(0, 120)}"`)

          setState('reformulating')
          let finalText: string
          try {
            finalText = await reformulateTranscription(rawText, fieldHintRef.current)
            console.log(`[VoiceMic] Reformulated: "${finalText.slice(0, 120)}"`)
          } catch (err) {
            console.warn('[VoiceMic] Reformulation failed, using raw text:', err)
            finalText = rawText
          }

          onResultRef.current(finalText)
          setState('idle')
        } catch (err) {
          const msg = (err as Error).message
          console.error('[VoiceMic] Transcription failed:', msg)
          setErrorMsg(msg.includes('parole') ? 'Aucune parole détectée' : 'Échec — réessayer')
          setState('error')
          setTimeout(() => {
            setState(s => s === 'error' ? 'idle' : s)
            setErrorMsg('')
          }, 3000)
        }
      }
      recorder.start(200)
      mediaRef.current = recorder
      startTimeRef.current = Date.now()
      setState('recording')

      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!analyserRef.current) return
        analyser.getByteFrequencyData(data)
        const slice = Math.max(1, Math.floor(data.length / BAR_COUNT))
        const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
          let sum = 0
          for (let j = 0; j < slice; j++) sum += data[i * slice + j]
          return Math.max(3, (sum / slice / 255) * 24)
        })
        setBars(newBars)
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (err) {
      console.error('[VoiceMic] Mic access error:', err)
      setErrorMsg('Micro non disponible')
      setState('error')
      setTimeout(() => {
        setState(s => s === 'error' ? 'idle' : s)
        setErrorMsg('')
      }, 3000)
    }
  }, [state, stopAll])

  const stop = useCallback(() => {
    const recorder = mediaRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.requestData()
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop()
        }
      }, 50)
    }
  }, [])

  const dismissError = useCallback(() => {
    setState('idle')
    setErrorMsg('')
  }, [])

  return { state, bars, errorMsg, start, stop, dismissError }
}

function MicButton({ onClick, style }: { onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, padding: 0, border: 'none',
        borderRadius: 6, background: 'transparent', cursor: 'pointer',
        color: 'var(--text-muted)', flexShrink: 0, ...style,
      }}
      title="Dicter"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="1" width="6" height="12" rx="3" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
  )
}

// ─── AUTO-RESIZE HELPER ─────────────────────────────────────────────────────

function useAutoResize(ref: React.RefObject<HTMLTextAreaElement | null>, value: string, minHeight = 38) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0'
    el.style.height = `${Math.max(el.scrollHeight, minHeight)}px`
  }, [ref, value, minHeight])
}

// ─── DICTABLE INPUT ──────────────────────────────────────────────────────────

interface DictableInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  inputStyle?: React.CSSProperties
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function DictableInput({ inputStyle: is, value, onChange, placeholder, ...rest }: DictableInputProps) {
  const valueRef = useRef(value)
  valueRef.current = value
  const taRef = useRef<HTMLTextAreaElement>(null)
  useAutoResize(taRef, value)

  const appendText = useCallback((text: string) => {
    const cur = valueRef.current
    onChange({ target: { value: cur ? `${cur} ${text}` : text } } as React.ChangeEvent<HTMLInputElement>)
  }, [onChange])

  const { state, bars, errorMsg, start, stop, dismissError } = useVoiceRecorder(appendText, placeholder ?? '')

  if (state === 'error') {
    return (
      <div style={{ ...is, padding: 0, overflow: 'hidden' }}>
        <ErrorOverlay message={errorMsg} onDismiss={dismissError} />
      </div>
    )
  }

  if (state === 'transcribing' || state === 'reformulating') {
    return (
      <div style={{ ...is, padding: 0, overflow: 'hidden' }}>
        <ProcessingOverlay label={state === 'transcribing' ? 'Transcription…' : 'Reformulation…'} />
      </div>
    )
  }

  if (state === 'recording') {
    return (
      <div style={{ ...is, padding: 0, overflow: 'hidden' }}>
        <RecordingOverlay bars={bars} onStop={stop} />
      </div>
    )
  }

  const { type: _type, ...textareaCompatRest } = rest as Record<string, unknown>

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <textarea
        {...textareaCompatRest}
        ref={taRef}
        value={value}
        onChange={e => onChange({ target: { value: e.target.value } } as React.ChangeEvent<HTMLInputElement>)}
        placeholder={placeholder}
        rows={1}
        style={{ ...is, paddingRight: 36, resize: 'none', overflow: 'hidden', boxSizing: 'border-box' }}
      />
      <MicButton onClick={start} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }} />
    </div>
  )
}

// ─── DICTABLE TEXTAREA ───────────────────────────────────────────────────────

interface DictableTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> {
  textareaStyle?: React.CSSProperties
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  minHeight?: number
}

export function DictableTextarea({ textareaStyle: ts, value, onChange, placeholder, minHeight, ...rest }: DictableTextareaProps) {
  const valueRef = useRef(value)
  valueRef.current = value
  const taRef = useRef<HTMLTextAreaElement>(null)
  useAutoResize(taRef, value, minHeight)

  const appendText = useCallback((text: string) => {
    const cur = valueRef.current
    onChange({ target: { value: cur ? `${cur} ${text}` : text } } as React.ChangeEvent<HTMLTextAreaElement>)
  }, [onChange])

  const { state, bars, errorMsg, start, stop, dismissError } = useVoiceRecorder(appendText, placeholder ?? '')

  if (state === 'error') {
    return (
      <div style={{ ...ts, padding: 0, overflow: 'hidden' }}>
        <ErrorOverlay message={errorMsg} onDismiss={dismissError} />
      </div>
    )
  }

  if (state === 'transcribing' || state === 'reformulating') {
    return (
      <div style={{ ...ts, padding: 0, overflow: 'hidden' }}>
        <ProcessingOverlay label={state === 'transcribing' ? 'Transcription…' : 'Reformulation…'} />
      </div>
    )
  }

  if (state === 'recording') {
    return (
      <div style={{ ...ts, padding: 0, overflow: 'hidden' }}>
        <RecordingOverlay bars={bars} onStop={stop} />
      </div>
    )
  }

  const micTop = minHeight !== undefined && minHeight < 40 ? Math.max(0, Math.round((minHeight - 28) / 2)) : 10
  return (
    <div style={{ position: 'relative' }}>
      <textarea {...rest} ref={taRef} value={value} onChange={onChange} placeholder={placeholder} style={{ ...ts, paddingRight: 36, resize: 'none', overflow: 'hidden', boxSizing: 'border-box' }} />
      <MicButton onClick={start} style={{ position: 'absolute', right: 6, top: micTop }} />
    </div>
  )
}
