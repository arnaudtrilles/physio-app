import { describe, it, expect } from 'vitest'
import { improvDelta, buildImprovementEntries } from './improvement'
import type { BilanRecord } from '../types'

// Fabrique un BilanRecord minimal — seuls evn et dateBilan sont lus par le helper.
const mk = (evn: number | null | undefined, dateBilan: string): BilanRecord =>
  ({ evn, dateBilan } as unknown as BilanRecord)

describe('improvDelta', () => {
  it('une douleur divisée par deux donne +50 %', () => {
    expect(improvDelta(8, 4)).toBe(50)
  })

  it('arrondit au pourcentage entier le plus proche', () => {
    expect(improvDelta(7, 5)).toBe(29) // (2/7)*100 = 28.57 → 29
  })

  it('renvoie une valeur négative en cas d’aggravation', () => {
    expect(improvDelta(4, 6)).toBe(-50)
  })

  it('renvoie 0 quand la mesure est inchangée', () => {
    expect(improvDelta(5, 5)).toBe(0)
  })
})

describe('buildImprovementEntries', () => {
  it('renvoie un tableau vide sans bilan', () => {
    expect(buildImprovementEntries([])).toEqual([])
  })

  it('numérote à partir de 1 et laisse le delta de la 1re entrée à null', () => {
    const entries = buildImprovementEntries([mk(8, '01/01/2024')])
    expect(entries).toEqual([{ num: 1, date: '01/01/2024', evn: 8, delta: null }])
  })

  it('écarte les bilans sans EVN (null ou undefined)', () => {
    const entries = buildImprovementEntries([
      mk(8, '01/01/2024'),
      mk(null, '15/01/2024'),
      mk(undefined, '20/01/2024'),
      mk(4, '01/02/2024'),
    ])
    expect(entries.map(e => e.evn)).toEqual([8, 4])
    expect(entries.map(e => e.num)).toEqual([1, 2])
  })

  it('calcule le delta vs la mesure précédente de la liste filtrée', () => {
    // 8 puis (après filtrage) 4 → delta de la 2e = improvDelta(8, 4) = 50
    const entries = buildImprovementEntries([
      mk(8, '01/01/2024'),
      mk(null, '15/01/2024'),
      mk(4, '01/02/2024'),
    ])
    expect(entries[0].delta).toBeNull()
    expect(entries[1].delta).toBe(improvDelta(8, 4))
    expect(entries[1].delta).toBe(50)
  })

  it('préserve l’ordre reçu (pas de tri interne)', () => {
    const entries = buildImprovementEntries([
      mk(6, '01/03/2024'),
      mk(3, '01/01/2024'),
    ])
    expect(entries.map(e => e.date)).toEqual(['01/03/2024', '01/01/2024'])
  })
})
