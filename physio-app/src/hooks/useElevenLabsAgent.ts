import { useState, useRef, useCallback } from 'react'
import { Conversation } from '@11labs/client'
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
  onSetBilanZone: (zone: string, typeBilan: string) => void
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
  const conversationRef = useRef<Awaited<ReturnType<typeof Conversation.startSession>> | null>(null)
  const toolCallbacksRef = useRef(toolCallbacks)
  toolCallbacksRef.current = toolCallbacks  // toujours à jour sans recréer start()

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

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })

      const conv = await Conversation.startSession({
        agentId,

        dynamicVariables: {
          therapist_name: toolCallbacksRef.current.therapistName || 'Thérapeute',
          patient_name: 'Non défini',
          patient_zone: 'Non définie',
          patient_pathologie: 'Non définie',
          patient_evn: 'Non renseigné',
          session_count: '0',
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
              return { found: false, message: 'Patient introuvable' }
            }
            // Prend le plus récent
            const patient = found.sort((a, b) => b.id - a.id)[0]
            setActivePatient(patient)
            const count = db.filter(r =>
              r.nom === patient.nom && r.prenom === patient.prenom
            ).length
            addMessage('system', `✓ Patient trouvé : ${patient.prenom} ${patient.nom}`)
            return {
              found: true,
              nom: patient.nom,
              prenom: patient.prenom,
              date_naissance: patient.dateNaissance,
              zone: patient.zone ?? '',
              pathologie: patient.pathologie ?? '',
              evn: patient.evn ?? '',
              bilans: count,
            }
          },

          // ── Création patient ───────────────────────────────────────────────
          create_patient: async ({ nom, prenom, date_naissance }: { nom: string; prenom: string; date_naissance: string }) => {
            try {
              const id = toolCallbacksRef.current.onCreatePatient(nom, prenom, date_naissance)
              addMessage('system', `✓ Patient créé : ${prenom} ${nom}`)
              playConfirmBeep()
              return { success: true, patient_id: id, message: 'Patient créé avec succès' }
            } catch {
              playErrorTone()
              return { success: false, message: 'Erreur lors de la création' }
            }
          },

          // ── Zone et type de bilan ──────────────────────────────────────────
          set_bilan_zone: async ({ zone, type_bilan }: { zone: string; type_bilan: string }) => {
            try {
              toolCallbacksRef.current.onSetBilanZone(zone, type_bilan)
              addMessage('system', `📋 Bilan ${type_bilan} · ${zone} ouvert`)
              playConfirmBeep()
              return { success: true, zone, type_bilan }
            } catch {
              playErrorTone()
              return { success: false, message: 'Erreur navigation bilan' }
            }
          },

          // ── Remplissage champ ──────────────────────────────────────────────
          fill_field: async ({ field, value }: { field: string; value: string }) => {
            try {
              toolCallbacksRef.current.onFillField(field, value)
              addMessage('system', `✏️ ${field} → ${value}`)
              return { success: true }
            } catch {
              return { success: false, message: 'Champ introuvable' }
            }
          },

          // ── Sauvegarde bilan ───────────────────────────────────────────────
          save_bilan: async () => {
            try {
              toolCallbacksRef.current.onSaveBilan()
              addMessage('system', '💾 Bilan sauvegardé')
              playSuccessChime()
              return { success: true, message: 'Bilan sauvegardé avec succès' }
            } catch {
              playErrorTone()
              return { success: false, message: 'Erreur sauvegarde' }
            }
          },

          // ── Analyse IA ─────────────────────────────────────────────────────
          generate_analyse_ia: async () => {
            try {
              toolCallbacksRef.current.onGenerateAnalyseIA()
              addMessage('system', '🧠 Analyse IA lancée')
              playConfirmBeep()
              return { success: true, message: 'Analyse IA en cours de génération' }
            } catch {
              playErrorTone()
              return { success: false, message: 'Erreur génération analyse' }
            }
          },

          // ── Export PDF ─────────────────────────────────────────────────────
          export_pdf: async () => {
            try {
              toolCallbacksRef.current.onExportPDF()
              addMessage('system', '📄 Export PDF lancé')
              playSuccessChime()
              return { success: true, message: 'PDF en cours de génération' }
            } catch {
              playErrorTone()
              return { success: false, message: 'Erreur export PDF' }
            }
          },

          // ── Fiche exercices ────────────────────────────────────────────────
          generate_fiche_exercice: async () => {
            try {
              toolCallbacksRef.current.onGenerateFicheExercice()
              addMessage('system', '🏋️ Fiche exercices ouverte')
              playConfirmBeep()
              return { success: true, message: 'Fiche exercices ouverte' }
            } catch {
              playErrorTone()
              return { success: false, message: 'Erreur fiche exercice' }
            }
          },

          // ── WhatsApp ───────────────────────────────────────────────────────
          send_whatsapp: async ({ phone, message }: { phone: string; message: string }) => {
            try {
              toolCallbacksRef.current.onSendWhatsApp(phone, message)
              addMessage('system', `📱 WhatsApp → ${phone}`)
              playSuccessChime()
              return { success: true, message: 'WhatsApp ouvert' }
            } catch {
              playErrorTone()
              return { success: false, message: 'Erreur WhatsApp' }
            }
          },
        },

        onConnect: () => setStatus('listening'),

        onDisconnect: () => {
          setStatus('disconnected')
          conversationRef.current = null
        },

        onMessage: (msg: { message: string; source: string }) => {
          const role = msg.source === 'ai' ? 'agent' : 'user'
          if (msg.message?.trim()) addMessage(role, msg.message)
        },

        onError: (err: { message?: string } | string) => {
          const msg = typeof err === 'string' ? err : err?.message ?? 'Erreur inconnue'
          setError(msg)
          setStatus('error')
          playErrorTone()
        },

        onModeChange: (mode: { mode: string }) => {
          if (mode.mode === 'speaking') setStatus('speaking')
          else if (mode.mode === 'listening') setStatus('listening')
        },
      })

      conversationRef.current = conv
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
    setStatus('idle')
  }, [])

  const toggleMute = useCallback(async () => {
    if (!conversationRef.current) return
    const next = !isMuted
    await conversationRef.current.setInputVolume(next ? 0 : 1)
    setIsMuted(next)
  }, [isMuted])

  return { status, messages, error, isMuted, activePatient, start, stop, toggleMute }
}
