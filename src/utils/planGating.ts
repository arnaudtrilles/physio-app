export type Plan = 'basique' | 'pro' | 'cabinet'

// Fonctionnalités réservées aux plans supérieurs
const PRO_FEATURES = new Set([
  'bilans_intermediaires',
  'objectifs_smart',
  'lettres_medecins',
  'evolution_ia',
  'fiche_exercices',
  'bilan_sortie',
])

export function canAccess(feature: string, plan: Plan | undefined): boolean {
  if (!PRO_FEATURES.has(feature)) return true // basique par défaut
  return plan === 'pro' || plan === 'cabinet'
}

export function requiresPro(feature: string): boolean {
  return PRO_FEATURES.has(feature)
}
