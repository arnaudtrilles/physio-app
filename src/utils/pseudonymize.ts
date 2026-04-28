import type { LetterFormData } from '../types'
import { computeAge } from './clinicalPrompt'

/**
 * Pseudonymisation des courriers avant envoi à l'IA.
 *
 * Stratégie :
 * 1. Avant l'appel LLM, on remplace toutes les données identifiantes du patient
 *    et du destinataire par des placeholders neutres dans le LetterFormData.
 * 2. Après la réponse LLM, on réinjecte les vraies valeurs dans le texte généré
 *    côté client (les données identifiantes ne quittent jamais le poste).
 *
 * Ainsi Claude (Anthropic) ne reçoit que :
 *  - Un patient "Monsieur X" / "Madame X" de N ans
 *  - Un destinataire "Docteur Y"
 *  - Les données cliniques (qui ne sont pas identifiantes en elles-mêmes)
 */

// Placeholders utilisés dans le prompt envoyé à l'IA
const PH = {
  patientPrenom: '__PATIENT_PRENOM__',
  patientNom: '__PATIENT_NOM__',
  destinataireNom: '__DESTINATAIRE_NOM__',
  proRecommandeNom: '__PRO_RECOMMANDE_NOM__',
} as const

export interface PseudonymizationMap {
  placeholders: Record<string, string>  // placeholder → vraie valeur
  formSansPII: LetterFormData            // form data avec placeholders
}

/**
 * Remplace toutes les données identifiantes par des placeholders, en ne
 * conservant que l'âge (calculé) à la place de la date de naissance.
 */
export function pseudonymizeForm(form: LetterFormData): PseudonymizationMap {
  const placeholders: Record<string, string> = {}

  // ── Patient : prénom + nom ─────────────────────────────────────────────
  const prenomReal = (form.prenomPatient ?? '').trim()
  const nomReal = (form.nomPatient ?? '').trim()
  if (prenomReal) placeholders[PH.patientPrenom] = prenomReal
  if (nomReal) placeholders[PH.patientNom] = nomReal

  // ── Date de naissance → âge ────────────────────────────────────────────
  let ageLabel = ''
  if (form.dateNaissancePatient) {
    const age = computeAge(form.dateNaissancePatient)
    if (typeof age === 'number') ageLabel = `${age} ans`
  }

  // ── Destinataire ───────────────────────────────────────────────────────
  const destReal = (form.nomDestinataire ?? '').trim()
  if (destReal) placeholders[PH.destinataireNom] = destReal

  // ── Pro recommandé (facultatif) ────────────────────────────────────────
  const proReal = (form.nomProRecommande ?? '').trim()
  if (proReal) placeholders[PH.proRecommandeNom] = proReal

  const formSansPII: LetterFormData = {
    ...form,
    prenomPatient: prenomReal ? PH.patientPrenom : '',
    nomPatient: nomReal ? PH.patientNom : '',
    // On remplace la date de naissance par un âge neutre pour garder la contextualisation
    dateNaissancePatient: ageLabel || '',
    nomDestinataire: destReal ? PH.destinataireNom : '',
    nomProRecommande: proReal ? PH.proRecommandeNom : '',
  }

  return { placeholders, formSansPII }
}

/**
 * Réinjecte les vraies valeurs dans le texte généré par l'IA.
 * Opère en une passe, insensible au fait que le LLM ait éventuellement
 * légèrement modifié la casse autour du placeholder.
 */
export function rehydrateText(text: string, placeholders: Record<string, string>): string {
  let out = text
  for (const [ph, real] of Object.entries(placeholders)) {
    // Remplacement global du placeholder exact
    out = out.split(ph).join(real)
  }
  return out
}

/**
 * Vérifie qu'aucun placeholder n'a été oublié par le LLM (cas rare mais possible
 * si le modèle décide de ne pas utiliser le placeholder).
 */
export function hasLeftoverPlaceholders(text: string): boolean {
  return /__[A-Z_]+__/.test(text)
}
