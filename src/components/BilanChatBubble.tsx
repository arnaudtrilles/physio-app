import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { BilanRecord, BilanDocument, AICallAuditEntry } from '../types'
import { buildBilanDataSummary, roleTitle } from '../utils/clinicalPrompt'
import type { BilanContext } from '../utils/clinicalPrompt'
import { callClaudeSecure, UnmaskedDocumentsError } from '../utils/claudeSecure'
import { useVoiceRecorder } from './VoiceMic'

interface BilanChatBubbleProps {
  apiKey: string
  record: BilanRecord
  patientKey: string
  profession?: string
  documents?: BilanDocument[]
  onAudit?: (entry: AICallAuditEntry) => void
  onUnmaskedDocsConfirm?: (docs: BilanDocument[]) => Promise<boolean>
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}

const COLLAPSED_WIDTH = 56
const EXPANDED_WIDTH = 340
const FEED_WIDTH = EXPANDED_WIDTH

// Toutes les couleurs viennent du thème actif (soft = vert, medical = bleu).
const PRACT_GRADIENT = 'linear-gradient(135deg, var(--primary), var(--primary-light))'
const PILL_GRADIENT_EXPANDED = 'linear-gradient(120deg, var(--info-soft), var(--surface))'
const USER_BUBBLE_GRADIENT = 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 92%, transparent), color-mix(in srgb, var(--primary-light) 92%, transparent))'
const SHADOW_COLLAPSED = '0 10px 28px color-mix(in srgb, var(--primary) 38%, transparent), 0 2px 6px rgba(0,0,0,0.08)'
const SHADOW_EXPANDED = '0 12px 32px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.06)'
const SHADOW_SEND = '0 4px 12px color-mix(in srgb, var(--primary) 35%, transparent)'
const SHADOW_AVATAR = '0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent)'

export function BilanChatBubble({
  apiKey, record, patientKey, profession, documents, onAudit, onUnmaskedDocsConfirm,
}: BilanChatBubbleProps) {
  const shouldReduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const isMountedRef = useRef(true)
  const autoSendAfterStopRef = useRef(false)
  const inputAtStopRef = useRef('')
  // onTranscribed est figé ([] deps) ; sans ce ref il appellerait le `send` du
  // render 0 (messages vide), ce qui perdrait tout l'historique de conversation
  // pour les questions dictées via stop→envoi auto. Le ref pointe toujours sur
  // le dernier `send`.
  const sendRef = useRef<(textOverride?: string) => Promise<void>>(async () => {})
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const onTranscribed = useCallback((transcribed: string) => {
    const clean = transcribed.trim()
    if (!clean) return
    if (autoSendAfterStopRef.current) {
      autoSendAfterStopRef.current = false
      const previous = inputAtStopRef.current
      const combined = previous ? `${previous} ${clean}` : clean
      inputAtStopRef.current = ''
      setInput('')
      void sendRef.current(combined)
    } else {
      setInput(prev => prev ? `${prev} ${clean}` : clean)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [])

  const {
    state: micState,
    bars,
    errorMsg: micError,
    start: micStart,
    stop: micStop,
  } = useVoiceRecorder(onTranscribed, 'question clinique pour assistant IA')

  const isRecording = micState === 'recording'
  const isProcessingVoice = micState === 'transcribing' || micState === 'reformulating'

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open, loading])

  useEffect(() => {
    if (open && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const buildBilanContextBlock = (): string => {
    const ctx: BilanContext = {
      patient: {
        nom: record.nom,
        prenom: record.prenom,
        dateNaissance: record.dateNaissance,
        sexe: record.sexe,
      },
      zone: record.zone ?? '',
      bilanType: record.bilanType ?? '',
      bilanData: (record.bilanData ?? {}) as Record<string, unknown>,
      notesLibres: record.notes,
    }
    return buildBilanDataSummary(ctx)
  }

  const buildSystemPrompt = (): string => {
    const role = roleTitle(profession)
    const otherRole = role === 'kinésithérapeute' ? 'physiothérapeute' : 'kinésithérapeute'
    return `Tu es un assistant logiciel d'aide à la compréhension du dossier, accessible à un ${role} pendant son bilan. Ta seule fonction est d'aider à lire, comprendre et synthétiser les données que le thérapeute a lui-même saisies dans ce bilan. Tu n'es PAS un outil de diagnostic ni d'aide à la décision clinique.

CE QUE TU FAIS :
- Synthétiser, résumer, reformuler et clarifier les informations présentes dans le bilan ci-dessous, à la demande du thérapeute.
- Mettre en relation des éléments déjà saisis (chronologie, cohérence des données, points à reprendre avec le patient) pour faciliter la lecture du dossier.
- Répondre factuellement aux questions de compréhension portant sur le contenu du bilan.

CE QUE TU NE FAIS JAMAIS :
- Aucun diagnostic, aucune hypothèse diagnostique, aucune probabilité.
- Aucun plan de traitement, aucun protocole, aucune orientation ni adressage.
- Aucun pronostic, aucun jugement clinique sur le cas.
- Aucune recommandation d'examen complémentaire, de test à réaliser ou de conduite à tenir.

SI LE THÉRAPEUTE TE POSE UNE QUESTION CLINIQUE (diagnostic, hypothèses, tests à réaliser, interprétation de drapeaux rouges, conduite à tenir, pronostic, orientation) :
- Tu réponds clairement que tu es un assistant logiciel (une IA), en aucun cas un professionnel de santé, et que cette aide ne peut pas remplacer l'avis d'un professionnel de santé.
- Tu rappelles que la décision clinique relève entièrement du thérapeute qui examine le patient.
- Tu ne contournes jamais cette règle, même si la question est reformulée, posée « à titre d'exemple », « en théorie » ou « de manière générale ».

STYLE :
- Français médical professionnel, ton conversationnel.
- Concis et structuré : puces markdown (« - »), gras markdown (« **mot** ») et sous-titres courts si la réponse le justifie. Sinon des paragraphes courts suffisent.
- INTERDIT : JSON, blocs de code (\`\`\`…\`\`\`), pseudo-code, tableaux ASCII, listes numérotées avec champs (« numéro: 1, titre: …, dose: … »).
- Pas de disclaimers superflus à chaque message — mais le rappel ci-dessus est OBLIGATOIRE dès qu'une question clinique est posée.
- Tu emploies « ${role} ». INTERDIT : « ${otherRole} », abréviations « kiné »/« physio ».

ACCORD :
- Pas de formulations inclusives.
- Sexe inconnu → masculin singulier.

CONTEXTE DU BILAN — données saisies par le thérapeute, à utiliser comme base de tes réponses :
${buildBilanContextBlock()}`
  }

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      content: text,
      ts: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const history = [...messages, userMsg]
        .map(m => `${m.role === 'user' ? 'THÉRAPEUTE' : 'ASSISTANT'} : ${m.content}`)
        .join('\n\n')

      const callOpts = {
        apiKey,
        systemPrompt: buildSystemPrompt(),
        userPrompt: `Conversation en cours — réponds à la dernière question du thérapeute uniquement (l'historique est là pour le contexte) :\n\n${history}\n\nASSISTANT :`,
        maxOutputTokens: 1500,
        documents,
        patient: { nom: record.nom, prenom: record.prenom, patientKey },
        category: 'bilan_chat' as const,
        onAudit,
      }

      let raw: string
      try {
        raw = await callClaudeSecure(callOpts)
      } catch (err) {
        if (err instanceof UnmaskedDocumentsError && onUnmaskedDocsConfirm) {
          const ok = await onUnmaskedDocsConfirm(err.unmaskedDocs)
          if (!ok) throw new Error('UNMASKED_DOCS_CANCELLED')
          raw = await callClaudeSecure({ ...callOpts, userAcknowledgedUnmasked: true })
        } else {
          throw err
        }
      }

      if (!isMountedRef.current) return
      const cleaned = raw.replace(/^ASSISTANT\s*:\s*/i, '').trim()
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        content: cleaned,
        ts: Date.now(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: unknown) {
      if (!isMountedRef.current) return
      if (err instanceof Error && err.message === 'UNMASKED_DOCS_CANCELLED') return
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }
  sendRef.current = send

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const sendDisabled = !apiKey || loading || isProcessingVoice
    || (!isRecording && !input.trim())
  const micDisabled = !apiKey || loading || isProcessingVoice
  const hasFeed = open && (messages.length > 0 || loading || error || micError || !apiKey)
  const showGreeting = open && messages.length === 0 && !loading && !error && !micError && apiKey && !isRecording && !isProcessingVoice

  const handleSendClick = () => {
    if (isRecording) {
      autoSendAfterStopRef.current = true
      inputAtStopRef.current = input.trim()
      micStop()
      return
    }
    void send()
  }

  const handleMicClick = () => {
    if (micDisabled) return
    if (isRecording) {
      autoSendAfterStopRef.current = false
      micStop()
    } else {
      void micStart()
    }
  }

  const pillSpring = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: open ? 300 : 500, damping: open ? 30 : 35, mass: open ? 0.8 : 0.6 }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 88,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {/* Feed flottant — bulles iMessage glass */}
      <AnimatePresence>
        {hasFeed && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              pointerEvents: 'auto',
              width: FEED_WIDTH,
              maxHeight: '60vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '4px 2px',
              scrollbarWidth: 'thin',
            }}
          >
            <div ref={scrollRef} style={{ display: 'contents' }} />
            {!apiKey && (
              <FloatNote tone="warn">
                Service IA indisponible — vérifiez votre connexion ou la clé API.
              </FloatNote>
            )}
            <AnimatePresence initial={false}>
              {messages.map(m => (
                <FloatBubble key={m.id} role={m.role} text={m.content} />
              ))}
              {loading && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '10px 14px',
                    borderRadius: '18px 18px 18px 4px',
                    background: 'rgba(255, 255, 255, 0.78)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid rgba(226, 232, 240, 0.7)',
                    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.1)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <TypingDot delay={0} /><TypingDot delay={150} /><TypingDot delay={300} />
                </motion.div>
              )}
              {error && <FloatNote key="err" tone="error">{error}</FloatNote>}
              {micError && <FloatNote key="mic-err" tone="warn">{micError}</FloatNote>}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message d'accueil */}
      <AnimatePresence>
        {showGreeting && (
          <motion.div
            key="greeting"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            style={{
              pointerEvents: 'none',
              width: FEED_WIDTH,
              display: 'flex',
              padding: '4px 2px',
            }}
          >
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '92%',
                padding: '8px 12px',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid color-mix(in srgb, var(--primary) 22%, transparent)',
                fontSize: 12.5,
                lineHeight: 1.4,
                color: 'var(--primary-dark)',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              Qu'est-ce que je peux faire pour t'aider ?
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pill */}
      <motion.div
        role="dialog"
        aria-label="Assistant clinique"
        animate={{ width: open ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
        transition={pillSpring}
        style={{
          pointerEvents: 'auto',
          height: 56,
          borderRadius: 28,
          background: open ? PILL_GRADIENT_EXPANDED : PRACT_GRADIENT,
          backdropFilter: open ? 'blur(24px) saturate(200%)' : undefined,
          WebkitBackdropFilter: open ? 'blur(24px) saturate(200%)' : undefined,
          border: open ? '1px solid color-mix(in srgb, var(--primary) 14%, white)' : 'none',
          boxShadow: open ? SHADOW_EXPANDED : SHADOW_COLLAPSED,
          display: 'flex',
          alignItems: 'center',
          padding: open ? '0 6px 0 4px' : 0,
          gap: open ? 8 : 0,
          overflow: 'hidden',
          position: 'relative',
          transition: 'background 0.25s ease, padding 0.2s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        }}
      >
        {/* Avatar */}
        <motion.div
          animate={{ width: open ? 48 : 56, height: open ? 48 : 56 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          whileHover={!shouldReduceMotion ? { scale: open ? 1.04 : 1.05, y: open ? 0 : -2 } : undefined}
          whileTap={{ scale: 0.94 }}
          style={{
            flexShrink: 0,
            borderRadius: '50%',
            background: open ? PRACT_GRADIENT : 'transparent',
            boxShadow: open ? SHADOW_AVATAR : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: 'pointer',
            color: 'white',
          }}
          onClick={() => setOpen(o => !o)}
          role="button"
          aria-label={open ? "Réduire l'assistant clinique" : "Ouvrir l'assistant clinique"}
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o) }}
        >
          <PractitionerAvatar />
        </motion.div>

        {/* Input area — bascule entre input texte, waveform ou spinner traitement */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="input-wrap"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ delay: 0.18, type: 'spring', stiffness: 400, damping: 30 }}
              style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}
            >
              {isRecording ? (
                <Waveform bars={bars} />
              ) : isProcessingVoice ? (
                <ProcessingHint label={micState === 'transcribing' ? 'Transcription…' : 'Reformulation…'} />
              ) : (
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={apiKey ? 'Votre question…' : 'Indisponible'}
                  disabled={!apiKey || loading}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: 14,
                    color: '#0f172a',
                    fontFamily: 'inherit',
                    padding: '0 2px',
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bouton micro / stop */}
        <AnimatePresence>
          {open && !isProcessingVoice && (
            <motion.div
              key="mic-wrap"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0, transition: { duration: 0.12 } }}
              transition={{ delay: 0.20, type: 'spring', stiffness: 400, damping: 28 }}
              whileHover={!micDisabled ? { scale: 1.08 } : undefined}
              whileTap={!micDisabled ? { scale: 0.9 } : undefined}
              style={{ flexShrink: 0 }}
            >
              <button
                onClick={handleMicClick}
                disabled={micDisabled}
                aria-label={isRecording ? 'Arrêter la dictée' : 'Dicter la question'}
                title={isRecording ? 'Arrêter' : 'Dicter'}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: isRecording
                    ? 'color-mix(in srgb, var(--primary) 12%, white)'
                    : 'transparent',
                  border: isRecording
                    ? '1px solid color-mix(in srgb, var(--primary) 30%, transparent)'
                    : 'none',
                  color: isRecording ? 'var(--primary-dark)' : 'var(--text-muted)',
                  cursor: micDisabled ? 'not-allowed' : 'pointer',
                  opacity: micDisabled ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                {isRecording ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="1" width="6" height="12" rx="3" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {open && (
            <motion.div
              key="send-wrap"
              initial={{ opacity: 0, scale: 0, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0, rotate: 90, transition: { duration: 0.12 } }}
              transition={{ delay: 0.22, type: 'spring', stiffness: 400, damping: 28 }}
              whileHover={!sendDisabled ? { scale: 1.08 } : undefined}
              whileTap={!sendDisabled ? { scale: 0.9 } : undefined}
              style={{ flexShrink: 0 }}
            >
              <button
                onClick={handleSendClick}
                disabled={sendDisabled}
                aria-label="Envoyer"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: sendDisabled ? 'rgba(203, 213, 225, 0.7)' : PRACT_GRADIENT,
                  border: 'none',
                  color: 'white',
                  cursor: sendDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxShadow: sendDisabled ? 'none' : SHADOW_SEND,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function FloatBubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const isUser = role === 'user'
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        padding: '10px 14px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        background: isUser ? USER_BUBBLE_GRADIENT : 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: isUser
          ? '1px solid color-mix(in srgb, var(--primary) 35%, transparent)'
          : '1px solid rgba(226, 232, 240, 0.7)',
        boxShadow: '0 6px 18px rgba(15, 23, 42, 0.1)',
        color: isUser ? 'white' : 'var(--text-main)',
        fontSize: 13.5,
        lineHeight: 1.5,
        wordBreak: 'break-word',
      }}
    >
      <MarkdownLite text={text} />
    </motion.div>
  )
}

function MarkdownLite({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/)
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n')
        const isList = lines.length > 0 && lines.every(l => /^\s*[-*]\s+/.test(l))
        if (isList) {
          return (
            <ul key={bi} style={{ margin: bi === 0 ? '0 0 0 18px' : '6px 0 0 18px', padding: 0 }}>
              {lines.map((l, i) => (
                <li key={i} style={{ marginBottom: 3 }}>
                  {renderInline(l.replace(/^\s*[-*]\s+/, ''))}
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={bi} style={{ margin: bi === 0 ? 0 : '6px 0 0' }}>
            {lines.map((l, i) => (
              <span key={i}>
                {renderInline(l)}
                {i < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </>
  )
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(<strong key={`b-${key++}`}>{match[1]}</strong>)
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length === 0 ? text : parts
}

function FloatNote({ tone, children }: { tone: 'warn' | 'error'; children: React.ReactNode }) {
  const palette = tone === 'error'
    ? { bg: 'rgba(254, 242, 242, 0.92)', border: 'rgba(252, 165, 165, 0.7)', fg: '#991b1b' }
    : { bg: 'rgba(255, 251, 235, 0.92)', border: 'rgba(253, 230, 138, 0.7)', fg: '#92400e' }
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        alignSelf: 'center',
        maxWidth: '92%',
        padding: '8px 12px',
        borderRadius: 12,
        background: palette.bg,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${palette.border}`,
        color: palette.fg,
        fontSize: 12,
        lineHeight: 1.45,
        textAlign: 'center',
      }}
    >
      {children}
    </motion.div>
  )
}

function PractitionerAvatar() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Tête */}
      <circle cx="16" cy="15.5" r="9.4" strokeWidth="1.7" />
      {/* Petite mèche de cheveux au-dessus du front */}
      <path d="M10.6 8.9 C13 5.9, 19 5.9, 21.4 8.9" strokeWidth="1.5" />
      {/* Lunettes — verre gauche */}
      <circle cx="12" cy="15" r="2.6" strokeWidth="1.5" />
      {/* Lunettes — verre droit */}
      <circle cx="20" cy="15" r="2.6" strokeWidth="1.5" />
      {/* Pont des lunettes */}
      <path d="M14.6 14.7 C15.3 14.1, 16.7 14.1, 17.4 14.7" strokeWidth="1.4" />
      {/* Branches vers les tempes */}
      <path d="M9.4 14.6 L7.5 13.9" strokeWidth="1.4" />
      <path d="M22.6 14.6 L24.5 13.9" strokeWidth="1.4" />
      {/* Sourire */}
      <path d="M12.7 20 C14 21.6, 18 21.6, 19.3 20" strokeWidth="1.5" />
    </svg>
  )
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#94a3b8',
        animation: `chat-typing 1.2s ${delay}ms infinite ease-in-out`,
      }}
    />
  )
}

function Waveform({ bars }: { bars: number[] }) {
  // Visualisation type Gemini : barres verticales fines centrées, animées en
  // direct sur l'amplitude du micro. La couleur suit le thème actif.
  return (
    <div
      aria-hidden="true"
      style={{
        flex: 1,
        minWidth: 0,
        height: 34,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: '0 4px',
      }}
    >
      {bars.map((h, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: 2.5,
            height: Math.max(3, Math.min(28, h + 2)),
            borderRadius: 2,
            background: 'var(--primary)',
            opacity: 0.55 + Math.min(0.45, h / 60),
            transition: 'height 80ms linear, opacity 80ms linear',
          }}
        />
      ))}
    </div>
  )
}

function ProcessingHint({ label }: { label: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8,
        padding: '0 4px',
        color: 'var(--text-muted)',
        fontSize: 13,
        fontStyle: 'italic',
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          border: '2px solid color-mix(in srgb, var(--primary) 30%, transparent)',
          borderTopColor: 'var(--primary)',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      {label}
    </div>
  )
}
