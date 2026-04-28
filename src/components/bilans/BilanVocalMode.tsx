import { useState, useRef, useEffect, useCallback } from 'react'
import { transcribeAudio, generateNarrativeReport } from '../../utils/voiceBilanClient'
import type { NarrativeReport, NarrativeSection } from '../../types'
import { DictableTextarea } from '../VoiceMic'

type VocalState = 'idle' | 'recording' | 'transcribing' | 'generating' | 'done' | 'error'
type RecordingContext = 'dictee' | 'seance'

const BAR_COUNT = 32
const WARN_SECONDS = 55 * 60 // 55 min warning

interface Props {
  zone: string
  initialReport: NarrativeReport | null
  onChange: (report: NarrativeReport) => void
}

export function BilanVocalMode({ zone, initialReport, onChange }: Props) {
  const [state, setState] = useState<VocalState>(initialReport ? 'done' : 'idle')
  const [context, setContext] = useState<RecordingContext>('dictee')
  const [report, setReport] = useState<NarrativeReport | null>(initialReport)
  const [error, setError] = useState('')
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(4))
  const [elapsed, setElapsed] = useState(0)
  const [warned, setWarned] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(0)

  const stopAnimation = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  useEffect(() => () => stopAnimation(), [stopAnimation])

  const animateBars = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      analyser.getByteFrequencyData(data)
      const slice = Math.floor(data.length / BAR_COUNT)
      const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
        const avg = data.slice(i * slice, (i + 1) * slice).reduce((s, v) => s + v, 0) / slice
        return Math.max(3, Math.min(28, (avg / 255) * 28))
      })
      setBars(newBars)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const startRecording = useCallback(async () => {
    setError('')
    setWarned(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.start(250)
      mediaRecorderRef.current = mr
      startedAtRef.current = Date.now()
      setElapsed(0)

      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startedAtRef.current) / 1000)
        setElapsed(secs)
        if (secs >= WARN_SECONDS && !warned) setWarned(true)
      }, 1000)

      animateBars()
      setState('recording')
    } catch (e) {
      setError(`Impossible d'accéder au microphone : ${(e as Error).message}`)
      setState('error')
    }
  }, [animateBars, warned])

  const stopRecording = useCallback(() => {
    stopAnimation()
    const mr = mediaRecorderRef.current
    if (!mr) return
    mr.onstop = async () => {
      const mimeType = mr.mimeType || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type: mimeType })
      mr.stream.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current = null

      setState('transcribing')
      try {
        const transcription = await transcribeAudio(blob)
        setState('generating')
        const sections = await generateNarrativeReport(transcription, zone, context)
        const newReport: NarrativeReport = {
          sections,
          transcription,
          generatedAt: new Date().toISOString(),
        }
        setReport(newReport)
        onChange(newReport)
        setState('done')
      } catch (e) {
        setError((e as Error).message)
        setState('error')
      }
    }
    mr.stop()
  }, [stopAnimation, zone, onChange])

  const updateSection = useCallback((id: string, contenu: string) => {
    if (!report) return
    const updated: NarrativeReport = {
      ...report,
      sections: report.sections.map(s => s.id === id ? { ...s, contenu } : s),
    }
    setReport(updated)
    onChange(updated)
  }, [report, onChange])

  const restart = useCallback(() => {
    setState('idle')
    setReport(null)
    setError('')
    setElapsed(0)
  }, [])

  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (state === 'idle') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '1rem 0 0.5rem' }}>
      <div style={{ display: 'flex', border: '1.5px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
        <button
          onClick={() => setContext('dictee')}
          style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: context === 'dictee' ? 'var(--primary)' : 'transparent', color: context === 'dictee' ? 'white' : 'var(--text-muted)', borderRadius: '8px 0 0 8px', transition: 'all 0.15s' }}
          title="Vous dictez seul le résumé après la séance"
        >
          📋 Dictée
        </button>
        <button
          onClick={() => setContext('seance')}
          style={{ flex: 1, padding: '0.6rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, border: 'none', borderLeft: '1px solid var(--border-color)', cursor: 'pointer', background: context === 'seance' ? 'var(--primary)' : 'transparent', color: context === 'seance' ? 'white' : 'var(--text-muted)', borderRadius: '0 8px 8px 0', transition: 'all 0.15s' }}
          title="Enregistrement de la séance complète — thérapeute + patient"
        >
          🎙 Séance complète
        </button>
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
        {context === 'dictee'
          ? 'Dictez ce que vous avez observé et fait — Claude rédige le compte rendu.'
          : 'Enregistrez toute la séance. Claude extrait les informations cliniques des deux voix.'}
      </div>
      <button
        onClick={startRecording}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '0.85rem 1.5rem',
          background: 'var(--primary)', color: 'white',
          border: 'none', borderRadius: 12, cursor: 'pointer',
          fontSize: '0.9rem', fontWeight: 700,
          boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
        }}
      >
        <MicIcon /> Démarrer l'enregistrement
      </button>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Durée max recommandée : 55 min · WebM ~14 Mo/h
      </div>
    </div>
  )

  // ── RECORDING ─────────────────────────────────────────────────────────────
  if (state === 'recording') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '1rem 0 0.5rem' }}>
      {warned && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#92400e', textAlign: 'center' }}>
          ⚠ Approche des 55 min — recommandé d'arrêter avant la limite Whisper (25 Mo).
        </div>
      )}
      <div style={{ background: 'var(--input-bg)', border: '1.5px solid var(--primary)', borderRadius: 14, padding: '1rem 1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'vocal-pulse 1s ease-in-out infinite' }} />
          Enregistrement
          <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(elapsed)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, height: 36, width: '100%' }}>
          {bars.map((h, i) => (
            <div key={i} style={{ width: 2.5, height: h, borderRadius: 2, background: 'var(--primary)', transition: 'height 0.08s ease', flexShrink: 0 }} />
          ))}
        </div>
        <button
          onClick={stopRecording}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0.6rem 1.4rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 2, background: 'white', display: 'inline-block', flexShrink: 0 }} />
          Arrêter et analyser
        </button>
      </div>
      <style>{`@keyframes vocal-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )

  // ── TRANSCRIBING / GENERATING ─────────────────────────────────────────────
  if (state === 'transcribing' || state === 'generating') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '2rem 0' }}>
      <Spinner />
      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
        {state === 'transcribing' ? 'Transcription en cours…' : 'Génération du compte rendu…'}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        {state === 'transcribing' ? 'Whisper (OpenAI) transcrit l\'audio en français' : 'Claude rédige les 7 sections cliniques'}
      </div>
    </div>
  )

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (state === 'error') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '1rem 0 0.5rem' }}>
      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#991b1b' }}>
        {error}
      </div>
      <button
        onClick={restart}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.6rem 1.2rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
      >
        Réessayer
      </button>
    </div>
  )

  // ── DONE — editable narrative ─────────────────────────────────────────────
  if (state === 'done' && report) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Généré le {new Date(report.generatedAt).toLocaleString('fr-CH')}
        </div>
        <button
          onClick={restart}
          style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '3px 9px', cursor: 'pointer' }}
        >
          Ré-enregistrer
        </button>
      </div>
      {report.sections.map((section) => (
        <NarrativeSectionEditor
          key={section.id}
          section={section}
          onChange={(contenu) => updateSection(section.id, contenu)}
        />
      ))}
    </div>
  )

  return null
}

// ─── NarrativeSectionEditor ────────────────────────────────────────────────
function NarrativeSectionEditor({ section, onChange }: { section: NarrativeSection; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ borderBottom: '1px solid var(--border-color)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>{section.titre}</span>
        <svg style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{ paddingBottom: '0.75rem' }}>
          <DictableTextarea
            value={section.contenu}
            onChange={e => onChange(e.target.value)}
            placeholder="Aucun contenu"
            rows={4}
            textareaStyle={{ width: '100%', fontSize: '0.82rem', color: 'var(--text-main)', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '0.6rem 0.75rem', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.55 }}
          />
        </div>
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  )
}

function Spinner() {
  return (
    <>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'vocal-spin 0.75s linear infinite' }} />
      <style>{`@keyframes vocal-spin { to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
