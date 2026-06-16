import type { BilanRecord } from '../types'
import type { ImprovementEntry } from './pdfGenerator'

/**
 * Pourcentage d'amélioration de l'EVN entre deux mesures.
 * Une diminution de la douleur (prev > curr) produit une valeur positive.
 * Formule extraite verbatim d'App.tsx — comportement inchangé.
 */
export function improvDelta(prev: number, curr: number): number {
  return Math.round(((prev - curr) / prev) * 100)
}

/**
 * Construit la série d'entrées d'amélioration EVN injectée dans le bloc
 * « évolution » des exports PDF.
 *
 * Ne retient que les bilans porteurs d'une EVN, les numérote dans l'ordre reçu,
 * et calcule pour chacun le delta % vs la mesure précédente (null pour la 1re).
 *
 * Factorisation des 4 occurrences strictement identiques d'App.tsx :
 * comportement préservé (même filtre `evn != null`, même ordre, même formule).
 */
export function buildImprovementEntries(bilans: BilanRecord[]): ImprovementEntry[] {
  const withEvn = bilans.filter(r => r.evn != null)
  return withEvn.map((r, i) => ({
    num: i + 1,
    date: r.dateBilan,
    evn: r.evn ?? null,
    delta: i === 0 ? null : improvDelta(withEvn[i - 1].evn!, r.evn!),
  }))
}
