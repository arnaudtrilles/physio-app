import { describe, it, expect } from 'vitest'
import { patientKeyToScrubHint, scrubTranscription } from './transcriptionScrub'

// Scrubbing PII des transcriptions vocales avant envoi à Anthropic.
// Garde-fou RGPD (minimisation, art. 5.1.c) : ces fonctions décident ce qui
// quitte le poste du praticien. Une régression silencieuse = fuite de données
// de santé → on les verrouille par des tests.

describe('patientKeyToScrubHint', () => {
  it('retourne undefined pour une clé absente ou vide', () => {
    expect(patientKeyToScrubHint(undefined)).toBeUndefined()
    expect(patientKeyToScrubHint('')).toBeUndefined()
  })

  it('retourne undefined pour le patient anonyme', () => {
    expect(patientKeyToScrubHint('Anonyme')).toBeUndefined()
  })

  it('extrait nom + prénom depuis "NOM Prenom"', () => {
    expect(patientKeyToScrubHint('DUPONT Jean')).toEqual({ nom: 'DUPONT', prenom: 'Jean' })
  })

  it('conserve un prénom composé', () => {
    expect(patientKeyToScrubHint('DUPONT Jean Pierre')).toEqual({ nom: 'DUPONT', prenom: 'Jean Pierre' })
  })

  it('ignore le suffixe de date de naissance', () => {
    expect(patientKeyToScrubHint('DUPONT Jean|1990-01-01')).toEqual({ nom: 'DUPONT', prenom: 'Jean' })
  })

  it('gère un nom seul sans prénom', () => {
    expect(patientKeyToScrubHint('DUPONT')).toEqual({ nom: 'DUPONT', prenom: undefined })
  })
})

describe('scrubTranscription', () => {
  it('retourne un résultat vide pour un texte vide', () => {
    expect(scrubTranscription('')).toEqual({ text: '', replacements: 0 })
  })

  it('remplace le nom du patient par [PATIENT] quand un hint est fourni', () => {
    const res = scrubTranscription('Le patient DUPONT se plaint de douleurs', { nom: 'DUPONT', prenom: 'Jean' })
    expect(res.text).toContain('[PATIENT]')
    expect(res.text).not.toContain('DUPONT')
    expect(res.replacements).toBeGreaterThanOrEqual(1)
  })

  it('masque un numéro de téléphone français', () => {
    const res = scrubTranscription('Joindre au 06 12 34 56 78 pour le rdv')
    expect(res.text).toContain('[TELEPHONE]')
    expect(res.text).not.toContain('06 12 34 56 78')
  })

  it('masque une adresse email', () => {
    const res = scrubTranscription('Contact : jean.dupont@example.com merci')
    expect(res.text).toContain('[EMAIL]')
    expect(res.text).not.toContain('jean.dupont@example.com')
  })

  it('masque un numéro de sécurité sociale (NIR)', () => {
    const res = scrubTranscription('NIR 180017512345678 noté au dossier')
    expect(res.text).toContain('[NIR]')
    expect(res.text).not.toContain('180017512345678')
  })

  it('préserve les données cliniques (pas de faux positif)', () => {
    const clinical = 'EVN 7/10, flexion 120 degres, test de Lachman negatif'
    const res = scrubTranscription(clinical)
    expect(res.text).toBe(clinical)
    expect(res.replacements).toBe(0)
  })

  it('comptabilise plusieurs remplacements', () => {
    const res = scrubTranscription('06 12 34 56 78 et a@b.fr', { nom: 'DUPONT' })
    expect(res.replacements).toBeGreaterThanOrEqual(2)
  })
})
