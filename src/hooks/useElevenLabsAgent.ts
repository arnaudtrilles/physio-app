import { useState, useRef, useCallback, useEffect } from 'react'
import { Conversation } from '@elevenlabs/client'
import { playSuccessChime, playConfirmBeep, playErrorTone } from '../utils/sounds'
import type { BilanRecord } from '../types'

export type AgentStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error' | 'disconnected'

export interface AgentMessage {
  role: 'user' | 'agent' | 'system'
  text: string
  timestamp: string
}

// Données accumulées par fill_field pendant la session
export type AgentBilanFields = Record<string, string>

export interface AgentToolCallbacks {
  db: BilanRecord[]
  therapistName: string
  onCreatePatient: (nom: string, prenom: string, dateNaissance: string) => number
  onSelectPatient: (nom: string, prenom: string, dateNaissance: string) => void
  onSetBilanZone: (zone: string, typeBilan: string) => string | null  // retourne la zone matchée ou null
  onFillField: (field: string, value: string) => void
  onSaveBilan: () => void
  onGenerateAnalyseIA: () => void
  onExportPDF: () => void
  onGenerateFicheExercice: () => void
  onSendWhatsApp: (phone: string, message: string) => void
}

interface UseElevenLabsAgentOptions {
  agentId: string
  toolCallbacks: AgentToolCallbacks
  onMessage?: (msg: AgentMessage) => void
}

export function useElevenLabsAgent({ agentId, toolCallbacks, onMessage }: UseElevenLabsAgentOptions) {
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [activePatient, setActivePatient] = useState<BilanRecord | null>(null)
  const [lastDisconnectReason, setLastDisconnectReason] = useState<string | null>(null)
  const conversationRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null)
  const keepaliveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const toolCallbacksRef = useRef(toolCallbacks)
  toolCallbacksRef.current = toolCallbacks  // toujours à jour sans recréer start()
  const bilanStartedRef = useRef(false)  // true dès que set_bilan_zone est appelé

  // Nettoyage au démontage du composant
  useEffect(() => {
    return () => {
      if (keepaliveRef.current) clearInterval(keepaliveRef.current)
    }
  }, [])

  const addMessage = useCallback((role: AgentMessage['role'], text: string) => {
    const msg: AgentMessage = { role, text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, msg])
    onMessage?.(msg)
  }, [onMessage])

  const start = useCallback(async () => {
    if (!agentId) { setError('Agent ID manquant'); return }
    setError(null)
    setStatus('connecting')
    setMessages([])
    setActivePatient(null)
    bilanStartedRef.current = false

    try {
      // Obtenir la permission micro
      await navigator.mediaDevices.getUserMedia({ audio: true })
      console.warn('[Lucie] Micro autorisé')

      // Déverrouiller l'audio iOS AVANT que ElevenLabs crée son AudioContext.
      // Safari iOS démarre tout AudioContext en "suspended". Un resume() ici,
      // dans le handler de geste utilisateur, déverrouille l'audio pour toute
      // la page → ElevenLabs joue immédiatement sans perdre le début du premier message.
      // On suspend ensuite (sans fermer) pour libérer les ressources CPU/DSP.
      try {
        const unlockCtx = new AudioContext()
        if (unlockCtx.state === 'suspended') await unlockCtx.resume()
        await unlockCtx.suspend()
        console.warn('[Lucie] Audio iOS déverrouillé')
      } catch { /* non bloquant */ }

      // Récupère l'URL signée depuis la serverless function Vercel
      let signedUrl: string | undefined
      try {
        const r = await fetch('/api/signed-url')
        if (r.ok) {
          const data = await r.json() as { signedUrl: string }
          signedUrl = data.signedUrl
          console.warn('[Lucie] Signed URL obtenue')
        } else {
          console.warn('[Lucie] Signed URL échouée — fallback agentId', r.status)
        }
      } catch (e) {
        console.warn('[Lucie] Signed URL exception — fallback agentId', e)
      }

      const conv = await Conversation.startSession({
        ...(signedUrl ? { signedUrl, connectionType: 'websocket' } : { agentId, connectionType: 'websocket' }),
        useWakeLock: true,

        dynamicVariables: {
          therapist_name: toolCallbacksRef.current.therapistName || 'Thérapeute',
          patient_name: 'Non défini',
          patient_zone: 'Non définie',
        },

        clientTools: {
          // ── Recherche patient ──────────────────────────────────────────────
          search_patient: async ({ nom }: { nom: string }) => {
            const { db } = toolCallbacksRef.current
            const query = nom.toLowerCase().trim()
            const found = db.filter(r =>
              r.nom.toLowerCase().includes(query) ||
              `${r.nom} ${r.prenom}`.toLowerCase().includes(query)
            )
            if (found.length === 0) {
              addMessage('system', `🔍 Recherche "${nom}" — aucun résultat`)
              return 'Patient introuvable'
            }
            // Prend le plus récent
            const patient = found.sort((a, b) => b.id - a.id)[0]
            setActivePatient(patient)
            // Pré-remplit formData pour que save_bilan sauve avec le bon nom
            toolCallbacksRef.current.onSelectPatient(patient.nom, patient.prenom, patient.dateNaissance)
            const count = db.filter(r =>
              r.nom === patient.nom && r.prenom === patient.prenom
            ).length
            addMessage('system', `✓ Patient trouvé : ${patient.prenom} ${patient.nom}`)
            return JSON.stringify({
              found: true,
              nom: patient.nom,
              prenom: patient.prenom,
              date_naissance: patient.dateNaissance,
              zone: patient.zone ?? '',
              pathologie: patient.pathologie ?? '',
              evn: patient.evn ?? '',
              bilans: count,
            })
          },

          // ── Création patient ───────────────────────────────────────────────
          create_patient: async ({ nom, prenom, date_naissance }: { nom: string; prenom: string; date_naissance: string }) => {
            try {
              toolCallbacksRef.current.onCreatePatient(nom, prenom, date_naissance)
              setActivePatient({ id: -1, nom, prenom, dateNaissance: date_naissance } as BilanRecord)
              addMessage('system', `✓ Patient créé : ${prenom} ${nom}`)
              playConfirmBeep()
              return `Patient créé : ${prenom} ${nom}. C'est un nouveau patient — propose uniquement un bilan initial.`
            } catch {
              playErrorTone()
              return 'Erreur lors de la création'
            }
          },

          // ── Zone et type de bilan ──────────────────────────────────────────
          set_bilan_zone: async ({ zone, type_bilan }: { zone: string; type_bilan: string }) => {
            try {
              // Nouveau patient = bilan initial uniquement
              const isNewPatient = !activePatient || activePatient.id === -1
              if (isNewPatient && type_bilan !== 'initial') {
                return 'Ce patient est nouveau — seul un bilan initial est possible. Propose un bilan initial.'
              }
              const matched = toolCallbacksRef.current.onSetBilanZone(zone, type_bilan)
              if (!matched) {
                return `Zone "${zone}" non reconnue. Zones disponibles : épaule, genou, hanche, cheville, cervicales, lombaire, gériatrie.`
              }
              bilanStartedRef.current = true
              addMessage('system', `📋 Bilan ${type_bilan} · ${matched} ouvert`)
              playConfirmBeep()
              return `Bilan ${type_bilan} zone ${matched} ouvert`
            } catch {
              playErrorTone()
              return 'Erreur navigation bilan'
            }
          },

          // ── Remplissage champ ──────────────────────────────────────────────
          fill_field: async ({ field, value }: { field: string; value: string }) => {
            try {
              toolCallbacksRef.current.onFillField(field, value)
              addMessage('system', `✏️ ${field} → ${value}`)
            } catch {
              // champ non mappé — ignoré silencieusement
            }
          },

          // ── Sauvegarde bilan ───────────────────────────────────────────────
          save_bilan: async () => {
            try {
              bilanStartedRef.current = false
              toolCallbacksRef.current.onSaveBilan()
              addMessage('system', '💾 Bilan sauvegardé')
              playSuccessChime()
              return 'Bilan sauvegardé avec succès'
            } catch {
              playErrorTone()
              return 'Erreur sauvegarde'
            }
          },

          // ── Analyse IA ─────────────────────────────────────────────────────
          generate_analyse_ia: async () => {
            try {
              toolCallbacksRef.current.onGenerateAnalyseIA()
              addMessage('system', '🧠 Analyse IA lancée')
              playConfirmBeep()
              return 'Analyse IA en cours de génération'
            } catch {
              playErrorTone()
              return 'Erreur génération analyse'
            }
          },

          // ── Export PDF ─────────────────────────────────────────────────────
          export_pdf: async () => {
            try {
              toolCallbacksRef.current.onExportPDF()
              addMessage('system', '📄 Export PDF lancé')
              playSuccessChime()
              return 'PDF en cours de génération'
            } catch {
              playErrorTone()
              return 'Erreur export PDF'
            }
          },

          // ── Fiche exercices ────────────────────────────────────────────────
          generate_fiche_exercice: async () => {
            try {
              toolCallbacksRef.current.onGenerateFicheExercice()
              addMessage('system', '🏋️ Fiche exercices ouverte')
              playConfirmBeep()
              return 'Fiche exercices ouverte'
            } catch {
              playErrorTone()
              return 'Erreur fiche exercice'
            }
          },

          // ── WhatsApp ───────────────────────────────────────────────────────
          send_whatsapp: async ({ phone, message }: { phone: string; message: string }) => {
            try {
              toolCallbacksRef.current.onSendWhatsApp(phone, message)
              addMessage('system', `📱 WhatsApp → ${phone}`)
              playSuccessChime()
              return 'WhatsApp ouvert'
            } catch {
              playErrorTone()
              return 'Erreur WhatsApp'
            }
          },
        },

        onConnect: (props: { conversationId: string }) => {
          console.warn('[Lucie] Connectée — conversationId:', props.conversationId)
          setStatus('listening')
        },

        onDisconnect: (details) => {
          const d = details as { reason?: string; code?: number | string }
          const reason = d?.reason ?? (d?.code != null ? `code ${d.code}` : 'unknown')
          console.warn('[Lucie] Déconnectée — raison:', reason, details)
          // Sauvegarde automatique si un bilan était en cours et n'a pas été sauvegardé
          if (bilanStartedRef.current) {
            try {
              toolCallbacksRef.current.onSaveBilan()
              bilanStartedRef.current = false
              addMessage('system', '💾 Bilan auto-sauvegardé à la déconnexion')
              console.warn('[Lucie] Bilan auto-sauvegardé')
            } catch (e) {
              console.warn('[Lucie] Échec auto-sauvegarde', e)
            }
          }
          setLastDisconnectReason(reason)
          setStatus('disconnected')
          conversationRef.current = null
          addMessage('system', `🔌 Session terminée — raison : ${reason}`)
        },

        onMessage: (props: { message: string; source: 'user' | 'ai' }) => {
          const role = props.source === 'ai' ? 'agent' : 'user'
          if (props.message?.trim()) addMessage(role, props.message)
        },

        onError: (message: string) => {
          setError(message ?? 'Erreur inconnue')
          setStatus('error')
          playErrorTone()
        },

        onModeChange: (prop: { mode: 'speaking' | 'listening' }) => {
          if (prop.mode === 'speaking') setStatus('speaking')
          else if (prop.mode === 'listening') setStatus('listening')
        },
      })

      conversationRef.current = conv
      console.warn('[Lucie] Session démarrée avec succès')

      // Keepalive toutes les 20s pour éviter timeout Safari/ElevenLabs
      if (keepaliveRef.current) clearInterval(keepaliveRef.current)
      keepaliveRef.current = setInterval(() => {
        if (conversationRef.current) {
          try { conversationRef.current.sendUserActivity() } catch { /* ignoré */ }
        } else {
          if (keepaliveRef.current) clearInterval(keepaliveRef.current)
        }
      }, 20000)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossible de démarrer'
      setError(
        msg.includes('Permission') || msg.includes('NotAllowed')
          ? 'Accès micro refusé — autorise le microphone dans les paramètres du navigateur'
          : msg
      )
      setStatus('error')
      playErrorTone()
    }
  }, [agentId, addMessage])

  const stop = useCallback(async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession()
      conversationRef.current = null
    }
    if (keepaliveRef.current) { clearInterval(keepaliveRef.current); keepaliveRef.current = null }
    setStatus('idle')
  }, [])

  const toggleMute = useCallback(async () => {
    if (!conversationRef.current) return
    const next = !isMuted
    conversationRef.current.setMicMuted(next)
    setIsMuted(next)
  }, [isMuted])

  return { status, messages, error, isMuted, activePatient, lastDisconnectReason, start, stop, toggleMute }
}
