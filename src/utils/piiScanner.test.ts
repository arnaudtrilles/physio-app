import { describe, it, expect } from 'vitest'
import type { LetterFormData } from '../types'
import { scanFormForPII } from './piiScanner'

// Filet de sécurité : détecte des identifiants oubliés dans les champs texte
// libre d'un courrier (le praticien aurait sauté la pseudonymisation manuelle).
// On vérifie surtout l'absence de faux positifs sur le vocabulaire médical —
// sinon l'alerte devient du bruit et le praticien l'ignore.

const makeForm = (partial: Partial<LetterFormData>): LetterFormData =>
  ({ ...partial } as LetterFormData)

const reasons = (form: LetterFormData) => scanFormForPII(form).map(m => m.reason)

describe('scanFormForPII', () => {
  it('détecte un numéro de téléphone', () => {
    expect(reasons(makeForm({ resumeBilanInitial: 'rappeler au 06 12 34 56 78' })))
      .toContain('Numéro de téléphone')
  })

  it('détecte une adresse email', () => {
    expect(reasons(makeForm({ traitement: 'envoyer à jean.dupont@example.com' })))
      .toContain('Adresse email')
  })

  it('détecte un numéro de sécurité sociale', () => {
    expect(reasons(makeForm({ resultats: 'sécu 123456789012345 au dossier' })))
      .toContain('Numéro de sécurité sociale')
  })

  it('détecte une séquence "Prénom NOM"', () => {
    expect(reasons(makeForm({ recommandations: 'orienter vers Marie DURAND' })))
      .toContain('Séquence "Prénom NOM"')
  })

  it('ne lève AUCUNE alerte sur le vocabulaire clinique légitime', () => {
    // EVN et ROM sont whitelistés — ne doivent jamais être pris pour des noms.
    expect(scanFormForPII(makeForm({ constat: 'EVN 7/10, ROM correcte ce jour' }))).toEqual([])
  })

  it('ne signale rien pour un formulaire sans champ texte', () => {
    expect(scanFormForPII(makeForm({}))).toEqual([])
  })
})
