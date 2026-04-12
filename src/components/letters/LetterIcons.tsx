import type { JSX } from 'react'
import type { LetterType } from '../../types'

interface IconProps {
  size?: number
  color?: string
}

/**
 * Pictogrammes stylisés pour les 7 types de courrier.
 * SVG line-art avec stroke, cohérent avec le reste de l'app.
 */

function FinPecIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Bouclier validé */}
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function FinPecAnticipeeIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Panneau stop (octogone) */}
      <polygon points="8 2 16 2 22 8 22 16 16 22 8 22 2 16 2 8" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function DemandeAvisIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Bulle de dialogue avec point d'interrogation */}
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function DemandeImagerieIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Scanner / imagerie médicale */}
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="12" cy="12" r="1" fill={color} stroke="none" />
      <line x1="6" y1="9" x2="7.5" y2="9" />
      <line x1="16.5" y1="15" x2="18" y2="15" />
    </svg>
  )
}

function DemandePrescriptionIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Ordonnance avec croix pharmaceutique */}
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="12" y1="10" x2="12" y2="16" />
    </svg>
  )
}

function SuiviIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Bulle de dialogue avec flèche de progression */}
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <polyline points="10 11 14 11 14 15" />
      <line x1="9" y1="16" x2="14" y2="11" />
    </svg>
  )
}

function EchecPecIcon({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {/* Triangle d'alerte */}
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export const LETTER_TYPE_ICONS: Record<LetterType, (props: IconProps) => JSX.Element> = {
  fin_pec: FinPecIcon,
  fin_pec_anticipee: FinPecAnticipeeIcon,
  demande_avis: DemandeAvisIcon,
  demande_imagerie: DemandeImagerieIcon,
  demande_prescription: DemandePrescriptionIcon,
  suivi: SuiviIcon,
  echec_pec: EchecPecIcon,
}

export function LetterTypeIcon({ type, size = 20, color = 'currentColor' }: { type: LetterType; size?: number; color?: string }) {
  const Icon = LETTER_TYPE_ICONS[type]
  return <Icon size={size} color={color} />
}
