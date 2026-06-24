import { createContext, useContext } from 'react'
import type { ScrubPatientHint } from './transcriptionScrub'

/**
 * Contexte fournissant le patient courant aux champs dictables (Dictable*), afin
 * que la reformulation vocale puisse anonymiser nom/prénom avant l'envoi à l'IA
 * (RGPD art. 5.1.c — minimisation).
 *
 * On transporte une *référence mutable* plutôt que la valeur directement : son
 * identité est stable, ce qui évite de réabonner et re-rendre les dizaines de
 * champs dictables à chaque frappe dans le nom du patient. Les consommateurs
 * lisent `ref.current` paresseusement, uniquement au moment de la reformulation.
 *
 * Valeur par défaut `null` → aucun provider monté = comportement historique
 * (hint `undefined`, scrub par nom inopérant) : zéro régression.
 */
export type VoicePatientHintRef = { readonly current: ScrubPatientHint | undefined }

const VoicePatientContext = createContext<VoicePatientHintRef | null>(null)

export const VoicePatientProvider = VoicePatientContext.Provider

/** À appeler dans un composant ; renvoie un getter du hint patient courant. */
export function useVoicePatientHint(): () => ScrubPatientHint | undefined {
  const ref = useContext(VoicePatientContext)
  return () => ref?.current
}
