import { useState, useRef, useEffect, useCallback } from 'react'
import { transcribeAudio, generateNarrativeReport } from '../../utils/voiceBilanClient'
import {
  saveRecovery,
  deleteRecovery,
  listIncompleteRecoveries,
  newRecoveryId,
  concatChunkBlobs,
  concatChunkTranscriptions,
  recoveryHasAudio,
  type VocalRecovery,
  type VocalContext,
} from '../../utils/vocalRecoveryDB'
import type { NarrativeReport, NarrativeSection } from '../../types'
import { DictableTextarea } from '../VoiceMic'

type VocalState =
  | 'idle'
  | 'recovery-prompt'      // un enregistrement précédent incomplet attend une reprise
  | 'recording'
  | 'transcribing'
  | 'generating'
  | 'done'
  | 'error'

const BAR_COUNT = 32
// Durée max d'un chunk avant rotation du MediaRecorder. Avec un bitrate Opus 24 kbps
// mono, 10 min ≈ 1.7 Mo → bien sous toutes les limites + transcription rapide en BG.
const CHUNK_MAX_SECONDS = 10 * 60
const AUDIO_BITRATE = 24000
const WARN_SECONDS = 45 * 60 // alerte douce à 45 min, pas de blocage

interface Props {
  zone: string
  initialReport: NarrativeReport | null
  onChange: (report: NarrativeReport) => void
}

export function BilanVocalMode({ zone, initialReport, onChange }: Props) {
  const [state, setState] = useState<VocalState>(initialReport ? 'done' : 'idle')
  const [context, setContext] = useState<VocalContext>('dictee')
  const [report, setReport] = useState<NarrativeReport | null>(initialReport)
  const [error, setError] = useState('')
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(4))
  const [elapsed, setElapsed] = useState(0)
  const [chunkCount, setChunkCount] = useState(0)
  const [transcribedCount, setTranscribedCount] = useState(0)
  const [warned, setWarned] = useState(false)

  // Progress detail pour les phases longues (transcription / génération)
  const [phaseDetail, setPhaseDetail] = useState('')

  // Recovery info (proposée à l'utilisateur si trouvée au mount)
  const [pendingRecovery, setPendingRecovery] = useState<VocalRecovery | null>(null)

  // ── Refs MediaRecorder + audio ──────────────────────────────────────────
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number>(0)

  // Chunk en cours
  const currentRecorderRef = useRef<MediaRecorder | null>(null)
  const currentChunksRef = useRef<Blob[]>([])
  const chunkStartAtRef = useRef<number>(0)
  const chunkIndexRef = useRef<number>(0)
  const rotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ID du recovery en cours (pour persistance progressive)
  const recoveryIdRef = useRef<string>('')
  const recoveryRef = useRef<VocalRecovery | null>(null)

  // Flag pour différencier rotation de chunk vs arrêt définitif
  const stoppingFinalRef = useRef<boolean>(false)

  // ── Persistence helper ──────────────────────────────────────────────────
  const persistRecovery = useCallback(async (rec: VocalRecovery) => {
    try {
      rec.updatedAt = new Date().toISOString()
      await saveRecovery(rec)
      recoveryRef.current = rec
    } catch (e) {
      console.error('[vocal] persist failed', e)
    }
  }, [])

  // ── Transcription en arrière-plan d'un chunk individuel ────────────────
  // Lance la transcription d'un chunk dès qu'il est enregistré, sans bloquer
  // l'UI ni l'enregistrement en cours. Le résultat est persisté en IDB et le
  // compteur transcribedCount est mis à jour. Si l'appel échoue, on log mais
  // on n'affiche pas d'erreur — le retry sera fait à l'arrêt.
  const transcribeChunkInBackground = useCallback(async (chunkIdx: number) => {
    const rec = recoveryRef.current
    if (!rec) return
    const chunk = rec.chunks.find(c => c.index === chunkIdx)
    if (!chunk || chunk.transcription || !chunk.blob) return

    try {
      const text = await transcribeWithRetry(chunk.blob, 1) // 1 retry seulement en BG (plus rapide pour libérer la queue)
      // Re-fetch recoveryRef au cas où d'autres chunks aient été ajoutés entre temps
      const current = recoveryRef.current
      if (!current) return
      const target = current.chunks.find(c => c.index === chunkIdx)
      if (target) {
        target.transcription = text
        await persistRecovery(current)
        setTranscribedCount(prev => prev + 1)
      }
    } catch (e) {
      // Pas grave — sera retenté au stop avec le retry x2 standard
      console.warn(`[vocal] BG transcription failed for chunk ${chunkIdx}, will retry on stop:`, (e as Error).message)
    }
  }, [persistRecovery])

  // ── Cleanup helper ─────────────────────────────────────────────────────
  const stopAllAudio = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (rotationTimerRef.current) { clearTimeout(rotationTimerRef.current); rotationTimerRef.current = null }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    analyserRef.current = null
  }, [])

  useEffect(() => () => stopAllAudio(), [stopAllAudio])

  // ── Recovery detection au mount ─────────────────────────────────────────
  useEffect(() => {
    if (initialReport) return // déjà un rapport, pas de reprise
    let cancelled = false
    listIncompleteRecoveries()
      .then(recs => {
        if (cancelled || recs.length === 0) return
        // On prend le plus récent qui correspond grosso modo à la zone.
        // (Si une autre zone a un recovery en attente, l'utilisateur le verra dans la zone correspondante.)
        const match = recs.find(r => r.zone === zone) || recs[0]
        setPendingRecovery(match)
        setState('recovery-prompt')
      })
      .catch(e => console.warn('[vocal] recovery scan failed', e))
    return () => { cancelled = true }
  }, [initialReport, zone])

  // ── Animation barres ───────────────────────────────────────────────────
  const animateBars = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      const a = analyserRef.current
      if (!a) return
      a.getByteFrequencyData(data)
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

  // ── Sauvegarde du chunk courant + rotation ─────────────────────────────
  // Appelé soit par le timer de rotation (toutes les 10 min), soit par stopRecording final.
  const finalizeCurrentChunk = useCallback((isFinal: boolean) => {
    const mr = currentRecorderRef.current
    if (!mr) return

    stoppingFinalRef.current = isFinal
    // L'event onstop fera le reste (sauvegarde + rotation)
    if (mr.state !== 'inactive') {
      try { mr.stop() } catch { /* already stopped */ }
    }
  }, [])

  // ── Démarrage d'un nouveau MediaRecorder pour le chunk suivant ─────────
  const startNewChunkRecorder = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    const mr = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: AUDIO_BITRATE,
    })
    currentChunksRef.current = []
    chunkStartAtRef.current = Date.now()

    mr.ondataavailable = e => {
      if (e.data.size > 0) currentChunksRef.current.push(e.data)
    }

    mr.onstop = async () => {
      const idx = chunkIndexRef.current
      const blob = new Blob(currentChunksRef.current, { type: mimeType })
      const durationSec = Math.round((Date.now() - chunkStartAtRef.current) / 1000)
      const sizeBytes = blob.size

      // Persiste le chunk dans IndexedDB AVANT toute autre opération
      const rec = recoveryRef.current
      if (rec) {
        rec.chunks.push({ index: idx, blob, durationSec, sizeBytes })
        rec.totalDurationSec += durationSec
        rec.totalSizeBytes += sizeBytes
        await persistRecovery(rec)
      }

      const finalizedIdx = chunkIndexRef.current
      chunkIndexRef.current += 1
      setChunkCount(chunkIndexRef.current)

      currentRecorderRef.current = null
      currentChunksRef.current = []

      if (stoppingFinalRef.current) {
        // Arrêt définitif demandé par l'utilisateur → on lance la transcription finale
        stoppingFinalRef.current = false
        await runTranscriptionAndAnalysis()
      } else {
        // Rotation auto → on relance immédiatement un nouveau chunk
        startNewChunkRecorder()
        // Reprogramme la prochaine rotation
        rotationTimerRef.current = setTimeout(() => finalizeCurrentChunk(false), CHUNK_MAX_SECONDS * 1000)
        // Lance la transcription du chunk fraîchement finalisé en arrière-plan
        // (le user ne voit que le compteur, l'UI reste réactive)
        void transcribeChunkInBackground(finalizedIdx)
      }
    }

    // Demande des données toutes les 1s pour que ondataavailable accumule progressivement
    mr.start(1000)
    currentRecorderRef.current = mr
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistRecovery, finalizeCurrentChunk])

  // ── Transcription + Claude (après récupération de tous les chunks) ─────
  const runTranscriptionAndAnalysis = useCallback(async () => {
    const rec = recoveryRef.current
    if (!rec || rec.chunks.length === 0) {
      setError('Aucun chunk audio à transcrire')
      setState('error')
      return
    }

    setState('transcribing')
    setPhaseDetail(`0 / ${rec.chunks.length} chunks`)

    try {
      // Transcription séquentielle (évite de saturer Whisper en parallèle)
      // — chaque chunk transcrit est immédiatement persisté
      for (let i = 0; i < rec.chunks.length; i++) {
        const chunk = rec.chunks[i]
        if (chunk.transcription) {
          // déjà transcrit (cas reprise) — on saute
          setPhaseDetail(`${i + 1} / ${rec.chunks.length} chunks (déjà fait)`)
          continue
        }
        if (!chunk.blob) {
          // blob libéré après transcription — ne devrait pas arriver ici
          continue
        }
        setPhaseDetail(`Chunk ${i + 1} / ${rec.chunks.length} en cours…`)
        const text = await transcribeWithRetry(chunk.blob, 2)
        chunk.transcription = text
        await persistRecovery(rec)
      }

      // Concatène toutes les transcriptions
      const fullTranscription = concatChunkTranscriptions(rec)
      rec.fullTranscription = fullTranscription
      rec.status = 'transcribed'

      // Audio plus nécessaire — on libère IDB. Si Claude échoue ensuite, le
      // retry s'appuiera uniquement sur le texte (chunk.transcription préservé).
      // Une séance de 45 min = ~10 Mo d'audio qui partent ici.
      for (const c of rec.chunks) c.blob = undefined
      rec.totalSizeBytes = 0
      await persistRecovery(rec)

      setState('generating')
      setPhaseDetail('Claude rédige les 7 sections cliniques…')

      const sections = await generateReportWithRetry(fullTranscription, zone, context, (attempt) => {
        setPhaseDetail(`Claude rédige (tentative ${attempt + 1})…`)
      })

      const newReport: NarrativeReport = {
        sections,
        transcription: fullTranscription,
        generatedAt: new Date().toISOString(),
      }

      rec.report = newReport
      rec.status = 'completed'
      await persistRecovery(rec)

      setReport(newReport)
      onChange(newReport)
      setState('done')
      setPhaseDetail('')

      // Nettoyage : on supprime le recovery une fois tout fini (les chunks audio
      // sont volumineux, on ne les garde pas après succès)
      try { await deleteRecovery(rec.id) } catch { /* non bloquant */ }
    } catch (e) {
      const errMsg = (e as Error).message
      if (rec) {
        rec.status = 'error'
        rec.errorMsg = errMsg
        await persistRecovery(rec)
      }
      setError(errMsg)
      setState('error')
      setPhaseDetail('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, context, onChange, persistRecovery])

  // ── Démarrage de l'enregistrement ──────────────────────────────────────
  const startRecording = useCallback(async () => {
    setError('')
    setWarned(false)
    setChunkCount(0)
    setTranscribedCount(0)
    chunkIndexRef.current = 0

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      // Crée le recovery initial dans IndexedDB
      const id = newRecoveryId()
      recoveryIdRef.current = id
      const rec: VocalRecovery = {
        id,
        zone,
        context,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'recorded',
        chunks: [],
        totalDurationSec: 0,
        totalSizeBytes: 0,
      }
      recoveryRef.current = rec
      await persistRecovery(rec)

      // Démarre le premier chunk + programme la rotation
      startNewChunkRecorder()
      rotationTimerRef.current = setTimeout(() => finalizeCurrentChunk(false), CHUNK_MAX_SECONDS * 1000)

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
      stopAllAudio()
      setError(`Impossible d'accéder au microphone : ${(e as Error).message}`)
      setState('error')
    }
  }, [zone, context, animateBars, persistRecovery, startNewChunkRecorder, finalizeCurrentChunk, stopAllAudio, warned])

  // ── Arrêt utilisateur ──────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (rotationTimerRef.current) { clearTimeout(rotationTimerRef.current); rotationTimerRef.current = null }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    cancelAnimationFrame(animFrameRef.current)
    finalizeCurrentChunk(true)
    // Le stream est arrêté dans onstop → runTranscriptionAndAnalysis → cleanup final
    setTimeout(() => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
      analyserRef.current = null
    }, 100)
  }, [finalizeCurrentChunk])

  // ── Reprise d'un recovery existant ─────────────────────────────────────
  const resumeRecovery = useCallback(async (rec: VocalRecovery) => {
    setError('')
    recoveryIdRef.current = rec.id
    recoveryRef.current = rec
    chunkIndexRef.current = rec.chunks.length
    setChunkCount(rec.chunks.length)
    setTranscribedCount(rec.chunks.filter(c => c.transcription).length)
    setContext(rec.context)
    setPendingRecovery(null)
    // Lance directement l'analyse depuis les chunks déjà enregistrés
    await runTranscriptionAndAnalysis()
  }, [runTranscriptionAndAnalysis])

  // ── Supprime un recovery existant ──────────────────────────────────────
  const dismissRecovery = useCallback(async () => {
    const rec = pendingRecovery
    if (rec) {
      try { await deleteRecovery(rec.id) } catch { /* ignore */ }
    }
    setPendingRecovery(null)
    setState('idle')
  }, [pendingRecovery])

  // ── Téléchargement de l'audio brut (failsafe) ──────────────────────────
  const downloadAudio = useCallback((rec: VocalRecovery | null) => {
    const target = rec ?? recoveryRef.current
    if (!target || target.chunks.length === 0) return
    const blob = concatChunkBlobs(target)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bilan-vocal-${target.zone}-${target.createdAt.slice(0, 19).replace(/[:T]/g, '-')}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [])

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
    stopAllAudio()
    setState('idle')
    setReport(null)
    setError('')
    setElapsed(0)
    setChunkCount(0)
    setTranscribedCount(0)
    chunkIndexRef.current = 0
    recoveryIdRef.current = ''
    recoveryRef.current = null
  }, [stopAllAudio])

  const retryFromError = useCallback(async () => {
    const rec = recoveryRef.current
    if (!rec) {
      restart()
      return
    }
    setError('')
    await runTranscriptionAndAnalysis()
  }, [runTranscriptionAndAnalysis, restart])

  const fmtTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`
  }

  const fmtSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
  }

  // ── RECOVERY PROMPT ───────────────────────────────────────────────────────
  if (state === 'recovery-prompt' && pendingRecovery) {
    const rec = pendingRecovery
    const hasTranscription = rec.chunks.some(c => c.transcription)
    const hasAudio = recoveryHasAudio(rec)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '1rem 0 0.5rem' }}>
        <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 12, padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#78350f', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚠ Enregistrement précédent non finalisé
          </div>
          <div style={{ fontSize: '0.78rem', color: '#92400e', lineHeight: 1.5 }}>
            Zone : <b>{rec.zone}</b> · Mode : <b>{rec.context === 'seance' ? 'Séance complète' : 'Dictée'}</b><br/>
            Durée : <b>{fmtTime(rec.totalDurationSec)}</b>{hasAudio && <> · Taille : <b>{fmtSize(rec.totalSizeBytes)}</b></>} · Chunks : <b>{rec.chunks.length}</b><br/>
            Statut : <b>{rec.status === 'transcribed' ? 'Transcription OK, analyse Claude à refaire' : hasTranscription ? 'Transcription partielle' : 'Audio enregistré, transcription à faire'}</b>
            {rec.errorMsg && <><br/>Erreur précédente : <i>{rec.errorMsg.slice(0, 150)}</i></>}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => resumeRecovery(rec)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.75rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
          >
            ▶ Reprendre {hasTranscription ? "l'analyse Claude" : 'la transcription'}
          </button>
          {hasAudio && (
            <button
              onClick={() => downloadAudio(rec)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.65rem 1rem', background: 'var(--surface)', color: 'var(--text-main)', border: '1.5px solid var(--border-color)', borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              📥 Télécharger l'audio (.webm)
            </button>
          )}
          <button
            onClick={dismissRecovery}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.55rem 1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: 10, cursor: 'pointer', fontSize: '0.75rem' }}
          >
            🗑 Supprimer et démarrer un nouvel enregistrement
          </button>
        </div>
      </div>
    )
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
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
        Audio découpé automatiquement en chunks de 10 min — pas de limite de durée.<br/>
        Sauvegarde progressive : aucune perte possible même en cas d'erreur.
      </div>
    </div>
  )

  // ── RECORDING ─────────────────────────────────────────────────────────────
  if (state === 'recording') {
    const currentChunkSec = elapsed - chunkCount * CHUNK_MAX_SECONDS
    const nextRotationIn = Math.max(0, CHUNK_MAX_SECONDS - currentChunkSec)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '1rem 0 0.5rem' }}>
        {warned && (
          <div style={{ background: '#dbeafe', border: '1px solid #60a5fa', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: '#1e40af', textAlign: 'center' }}>
            ℹ Enregistrement de plus de 45 min en cours — pas de limite, sauvegarde toutes les 10 min.
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
          {(chunkCount > 0 || nextRotationIn < 60) && (
            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
              {chunkCount > 0 && (
                <>💾 {chunkCount} sauvegardé{chunkCount > 1 ? 's' : ''} · ✨ {transcribedCount}/{chunkCount} transcrit{transcribedCount > 1 ? 's' : ''} · </>
              )}
              Prochaine sauvegarde dans {fmtTime(nextRotationIn)}
            </div>
          )}
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
  }

  // ── TRANSCRIBING / GENERATING ─────────────────────────────────────────────
  if (state === 'transcribing' || state === 'generating') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '2rem 0' }}>
      <Spinner />
      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
        {state === 'transcribing' ? 'Transcription en cours…' : 'Génération du compte rendu…'}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 320 }}>
        {phaseDetail || (state === 'transcribing' ? 'Whisper (OpenAI) transcrit l\'audio en français' : 'Claude rédige les 7 sections cliniques')}
      </div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', marginTop: 8 }}>
        Audio sauvegardé · si une étape échoue, vous pourrez reprendre depuis ce point.
      </div>
    </div>
  )

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (state === 'error') {
    const rec = recoveryRef.current
    const hasRecovery = !!rec && rec.chunks.length > 0
    const hasAudio = !!rec && recoveryHasAudio(rec)
    const hasTranscription = !!rec?.fullTranscription
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '1rem 0 0.5rem' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#991b1b' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ Erreur</div>
          <div style={{ lineHeight: 1.5 }}>{error}</div>
          {hasRecovery && (
            <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#7f1d1d', fontStyle: 'italic' }}>
              ✓ {hasTranscription ? 'Transcription préservée' : 'Audio préservé'} dans la base locale — vous pouvez réessayer{hasAudio ? ' ou télécharger' : ''}.
            </div>
          )}
        </div>
        {hasRecovery ? (
          <>
            <button
              onClick={retryFromError}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.7rem 1.2rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
            >
              ↻ Réessayer {hasTranscription ? "l'analyse Claude" : 'la transcription'}
            </button>
            {hasAudio && (
              <button
                onClick={() => downloadAudio(null)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.6rem 1.2rem', background: 'var(--surface)', color: 'var(--text-main)', border: '1.5px solid var(--border-color)', borderRadius: 10, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
              >
                📥 Télécharger l'audio brut (.webm)
              </button>
            )}
            <button
              onClick={restart}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: 10, cursor: 'pointer', fontSize: '0.72rem' }}
            >
              Abandonner et recommencer
            </button>
          </>
        ) : (
          <button
            onClick={restart}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.6rem 1.2rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}
          >
            Réessayer
          </button>
        )}
      </div>
    )
  }

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

// ─── Transcription avec retry — protège des erreurs réseau temporaires ────
async function transcribeWithRetry(blob: Blob, retries: number): Promise<string> {
  let lastErr: Error | null = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await transcribeAudio(blob)
    } catch (e) {
      lastErr = e as Error
      // Backoff progressif avant retry
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
      }
    }
  }
  throw lastErr ?? new Error('Transcription échouée')
}

// ─── Génération Claude avec retry — protège des 503/529/timeouts ──────────
// On retente uniquement sur les erreurs transitoires (overload, timeout, réseau).
// Les erreurs définitives (400 mauvais payload, 401 auth) sont propagées immédiatement.
async function generateReportWithRetry(
  transcription: string,
  zone: string,
  context: VocalContext,
  onAttempt: (attempt: number) => void,
): Promise<NarrativeSection[]> {
  const MAX_ATTEMPTS = 3
  let lastErr: Error | null = null
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    onAttempt(attempt)
    try {
      return await generateNarrativeReport(transcription, zone, context)
    } catch (e) {
      lastErr = e as Error
      const msg = lastErr.message
      // Erreurs définitives → on s'arrête tout de suite
      if (/API 4(00|01|03|04)/.test(msg)) break
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
      }
    }
  }
  throw lastErr ?? new Error('Génération Claude échouée')
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
