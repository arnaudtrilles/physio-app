import { describe, it, expect } from 'vitest'
import type { LetterFormData } from '../types'
import { pseudonymizeForm, rehydrateText, hasLeftoverPlaceholders } from './pseudonymize'

// Pseudonymisation des courriers : les identités patient/destinataire sont
// remplacées par des placeholders AVANT l'appel LLM, puis réhydratées côté
// client. Les vraies valeurs ne doivent jamais partir chez Anthropic.

const makeForm = (partial: Partial<LetterFormData>): LetterFormData =>
  ({ ...partial } as LetterFormData)

describe('pseudonymizeForm', () => {
  it('remplace les identités par des placeholders et mappe les vraies valeurs', () => {
    const { placeholders, formSansPII } = pseudonymizeForm(makeForm({
      prenomPatient: 'Jean',
      nomPatient: 'DUPONT',
      dateNaissancePatient: '01/01/1990',
      nomDestinataire: 'Dr Martin',
      nomProRecommande: '',
    }))

    expect(placeholders).toEqual({
      __PATIENT_PRENOM__: 'Jean',
      __PATIENT_NOM__: 'DUPONT',
      __DESTINATAIRE_NOM__: 'Dr Martin',
    })
    expect(placeholders.__PRO_RECOMMANDE_NOM__).toBeUndefined()

    expect(formSansPII.prenomPatient).toBe('__PATIENT_PRENOM__')
    expect(formSansPII.nomPatient).toBe('__PATIENT_NOM__')
    expect(formSansPII.nomDestinataire).toBe('__DESTINATAIRE_NOM__')
    expect(formSansPII.nomProRecommande).toBe('')
  })

  it('convertit la date de naissance en âge neutre (jamais la date brute)', () => {
    const { formSansPII } = pseudonymizeForm(makeForm({
      prenomPatient: 'Jean',
      nomPatient: 'DUPONT',
      dateNaissancePatient: '01/01/1990',
    }))
    expect(formSansPII.dateNaissancePatient).toMatch(/^\d+ ans$/)
    expect(formSansPII.dateNaissancePatient).not.toContain('1990')
  })

  it('ne produit aucun placeholder pour un formulaire vide', () => {
    const { placeholders, formSansPII } = pseudonymizeForm(makeForm({}))
    expect(placeholders).toEqual({})
    expect(formSansPII.prenomPatient).toBe('')
    expect(formSansPII.nomPatient).toBe('')
    expect(formSansPII.dateNaissancePatient).toBe('')
  })

  it('mappe le pro recommandé quand il est renseigné', () => {
    const { placeholders } = pseudonymizeForm(makeForm({ nomProRecommande: 'Dr Bernard' }))
    expect(placeholders.__PRO_RECOMMANDE_NOM__).toBe('Dr Bernard')
  })
})

describe('rehydrateText', () => {
  it('réinjecte les vraies valeurs dans le texte généré', () => {
    const out = rehydrateText(
      'Cher __DESTINATAIRE_NOM__, concernant __PATIENT_NOM__.',
      { __DESTINATAIRE_NOM__: 'Dr Martin', __PATIENT_NOM__: 'DUPONT' },
    )
    expect(out).toBe('Cher Dr Martin, concernant DUPONT.')
  })

  it('remplace toutes les occurrences d\'un même placeholder', () => {
    const out = rehydrateText('__PATIENT_NOM__ puis __PATIENT_NOM__', { __PATIENT_NOM__: 'DUPONT' })
    expect(out).toBe('DUPONT puis DUPONT')
  })

  it('laisse le texte inchangé sans placeholders', () => {
    expect(rehydrateText('texte propre', {})).toBe('texte propre')
  })
})

describe('hasLeftoverPlaceholders', () => {
  it('détecte un placeholder oublié par le LLM', () => {
    expect(hasLeftoverPlaceholders('Bonjour __PATIENT_NOM__')).toBe(true)
  })

  it('retourne false sur un texte sans placeholder', () => {
    expect(hasLeftoverPlaceholders('Bonjour Monsieur Dupont')).toBe(false)
  })
})
