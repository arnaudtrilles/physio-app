import { useEffect, useRef, useState } from 'react'
import type { BilanRecord, BilanDocument, AICallAuditEntry } from '../types'
import { buildClinicalPrompt, roleTitle } from '../utils/clinicalPrompt'
import type { BilanContext } from '../utils/clinicalPrompt'
import { callClaudeSecure, UnmaskedDocumentsError } from '../utils/claudeSecure'

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

/**
 * Bulle de chat thérapeute ↔ IA — pivot hors-DM (2026-05-10).
 *
 * Différence clé avec BilanAnalyseIA :
 *  - L'IA ne propose RIEN d'elle-même. Elle répond uniquement aux questions
 *    explicites du thérapeute.
 *  - Le contexte du bilan est injecté en system prompt (anonymisé) pour que
 *    les réponses soient pertinentes — mais c'est le thérapeute qui pose
 *    chaque question.
 *  - Test mental : « est-ce qu'un thérapeute pourrait copier-coller son bilan
 *    dans ChatGPT et poser ces mêmes questions ? » → oui = même statut légal.
 *
 * Position : bouton flottant en bas à droite. Click → drawer de chat.
 * Pas de persistance entre sessions (transient).
 */
export function BilanChatBubble({
  apiKey, record, patientKey, profession, documents, onAudit, onUnmaskedDocsConfirm,
}: BilanChatBubbleProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, open])

  useEffect(() => {
    if (open && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 250)
      return () => clearTimeout(t)
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
    return buildClinicalPrompt(ctx)
  }

  const buildSystemPrompt = (): string => {
    const role = roleTitle(profession)
    const otherRole = role === 'kinésithérapeute' ? 'physiothérapeute' : 'kinésithérapeute'
    return `Tu es un assistant clinique généraliste accessible à un ${role} qui consulte tes connaissances pendant son bilan. Tu réponds UNIQUEMENT aux questions qu'il te pose explicitement.

CADRE :
- C'est le thérapeute qui pose chaque question. Tu ne proposes JAMAIS spontanément un diagnostic, un plan, ou une orientation.
- Tu réponds factuellement, en t'appuyant sur les données du bilan fournies en contexte ET sur tes connaissances cliniques générales.
- Pour les questions cliniques (« quelles hypothèses penser ? », « tests à faire ? », « critères de drapeaux rouges ? »), tu réponds en t'appuyant sur la littérature et les recommandations existantes — comme un confrère senior répondrait.
- Tu rappelles que ce sont des éléments de réflexion, pas une prescription : la décision clinique reste celle du thérapeute qui voit le patient.
- Si la question dépasse ton domaine ou les données fournies, dis-le franchement.

STYLE :
- Réponses concises et structurées (puces si pertinent).
- Français médical professionnel.
- Pas de bullshit, pas de disclaimers inutiles à chaque message — un disclaimer global suffit.
- Tu emploies « ${role} ». INTERDIT : « ${otherRole} », abréviations « kiné »/« physio ».

ACCORD :
- Pas de formulations inclusives.
- Sexe inconnu → masculin singulier.

CONTEXTE DU BILAN — données saisies par le thérapeute, à utiliser comme base de tes réponses :
${buildBilanContextBlock()}`
  }

  const send = async () => {
    const text = input.trim()
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
      // Construit l'historique conversationnel injecté dans userPrompt — Claude
      // lit le system + tout l'historique sérialisé.
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
      if (err instanceof Error && err.message === 'UNMASKED_DOCS_CANCELLED') {
        return
      }
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          aria-label="Ouvrir l'assistant clinique"
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            right: 16,
            bottom: 88,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0e7490, #0891b2)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(14, 116, 144, 0.35), 0 2px 6px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            transition: 'transform 0.18s ease',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {messages.length > 0 && (
            <span style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 22,
              height: 22,
              borderRadius: 11,
              background: '#ef4444',
              color: 'white',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 6px',
              border: '2px solid white',
            }}>{messages.length}</span>
          )}
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div
          role="dialog"
          aria-label="Assistant clinique"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="slide-in-up"
            style={{
              width: '100%',
              maxWidth: 480,
              height: '85vh',
              background: 'white',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.15)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'linear-gradient(135deg, #0e7490, #0891b2)',
              color: 'white',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Assistant clinique</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>
                  Contexte : {record.zone || record.bilanType || 'bilan'} · {record.prenom}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: '#f8fafc',
            }}>
              {messages.length === 0 && (
                <div style={{
                  margin: 'auto',
                  textAlign: 'center',
                  padding: '20px',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  lineHeight: 1.6,
                  maxWidth: 320,
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: '#ecfeff', color: '#0e7490',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 14px',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                    Posez votre question
                  </div>
                  <p style={{ margin: 0 }}>
                    L'assistant a accès au contexte de ce bilan. Demandez-lui ce que vous souhaitez vérifier ou approfondir.
                  </p>
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SUGGESTIONS.map(s => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 10,
                          background: 'white',
                          border: '1px solid var(--border-color)',
                          fontSize: 12.5,
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          lineHeight: 1.4,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(m => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: m.role === 'user' ? 'linear-gradient(135deg, #0e7490, #0891b2)' : 'white',
                    color: m.role === 'user' ? 'white' : 'var(--text-main)',
                    fontSize: 14,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    boxShadow: m.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    border: m.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                  }}
                >
                  {m.content}
                </div>
              ))}

              {loading && (
                <div style={{
                  alignSelf: 'flex-start',
                  padding: '10px 14px',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <TypingDot delay={0} /><TypingDot delay={150} /><TypingDot delay={300} />
                </div>
              )}

              {error && (
                <div style={{
                  alignSelf: 'center',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  fontSize: 12.5,
                  maxWidth: '90%',
                  textAlign: 'center',
                }}>
                  {error}
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{
              padding: '12px',
              borderTop: '1px solid var(--border-color)',
              background: 'white',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                background: 'var(--secondary)',
                borderRadius: 12,
                padding: '8px 8px 8px 12px',
                border: '1px solid var(--border-color)',
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={apiKey ? 'Votre question…' : 'Service IA indisponible'}
                  disabled={!apiKey || loading}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    resize: 'none',
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'var(--text-main)',
                    fontFamily: 'inherit',
                    maxHeight: 120,
                    padding: '4px 0',
                  }}
                />
                <button
                  onClick={send}
                  disabled={!apiKey || !input.trim() || loading}
                  aria-label="Envoyer"
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: !input.trim() || loading || !apiKey ? '#cbd5e1' : 'linear-gradient(135deg, #0e7490, #0891b2)',
                    border: 'none',
                    color: 'white',
                    cursor: !input.trim() || loading || !apiKey ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
              <div style={{
                fontSize: 10.5,
                color: 'var(--text-muted)',
                textAlign: 'center',
                marginTop: 6,
                lineHeight: 1.4,
              }}>
                Réponses à titre indicatif. La décision clinique reste celle du thérapeute.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const SUGGESTIONS = [
  'Quels diagnostics différentiels envisager pour cette zone et ce profil ?',
  'Quels tests cliniques manquent pour préciser mon hypothèse ?',
  'Quels drapeaux rouges devrais-je écarter avant de commencer ?',
]

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
