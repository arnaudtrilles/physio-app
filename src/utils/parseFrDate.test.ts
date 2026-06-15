import { describe, it, expect } from 'vitest'
import { parseFrDate } from './parseFrDate'

describe('parseFrDate', () => {
  it('parse une date "dd/mm/yyyy" zéro-padée (format toLocaleDateString fr-FR)', () => {
    expect(parseFrDate('15/10/2025')).toBe(new Date(2025, 9, 15).getTime())
  })

  it('accepte jour et mois sur 1 chiffre', () => {
    expect(parseFrDate('1/2/2024')).toBe(new Date(2024, 1, 1).getTime())
  })

  it('renvoie 0 pour undefined / chaîne vide', () => {
    expect(parseFrDate(undefined)).toBe(0)
    expect(parseFrDate('')).toBe(0)
  })

  it('renvoie 0 pour un format non dd/mm/yyyy', () => {
    expect(parseFrDate('2024-01-15')).toBe(0) // ISO non géré (par conception)
    expect(parseFrDate('15/10/25')).toBe(0)   // année 2 chiffres rejetée
    expect(parseFrDate('15-10-2025')).toBe(0)
    expect(parseFrDate('pas une date')).toBe(0)
    expect(parseFrDate('15/10/2025/3')).toBe(0)
  })

  it('est monotone : une date plus récente donne un timestamp plus grand', () => {
    expect(parseFrDate('02/01/2024')).toBeGreaterThan(parseFrDate('01/01/2024'))
    expect(parseFrDate('01/01/2025')).toBeGreaterThan(parseFrDate('31/12/2024'))
  })
})
