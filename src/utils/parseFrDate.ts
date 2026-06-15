/**
 * Parse une date clinique au format métier "dd/mm/yyyy" (fr-FR) en timestamp ms.
 *
 * Source unique de vérité : factorise les copies historiques jadis dupliquées
 * dans App.tsx, letterPrompts.ts, letterZonePrompts.ts, ScoreEvolutionChart.tsx
 * et EvolutionChart.tsx (toutes sémantiquement identiques sur les dates réelles
 * produites par `toLocaleDateString('fr-FR')`, qui sont toujours en année 4
 * chiffres).
 *
 * Comportement : renvoie 0 si l'entrée est vide ou ne correspond pas exactement
 * au motif `d/m/yyyy` (1-2 chiffres jour, 1-2 chiffres mois, 4 chiffres année).
 * Conservateur — un 0 trie le record comme antérieur à tout le reste.
 *
 * NB : `clinicalPrompt.ts` conserve volontairement sa propre variante
 * (`parseFrDateStr`) qui gère en plus le repli ISO via `Date.parse` ; elle n'est
 * donc PAS factorisée ici pour préserver son comportement.
 */
export function parseFrDate(s: string | undefined): number {
  if (!s) return 0
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return 0
  return new Date(+m[3], +m[2] - 1, +m[1]).getTime()
}
