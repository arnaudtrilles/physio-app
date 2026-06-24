import { vi, describe, it, expect, beforeEach } from 'vitest'

// On mocke l'appel réseau à Claude : ces tests verrouillent deux invariants RGPD
//  (1) le nom/prénom réel ne quitte JAMAIS le poste (envoyé scrubbé à l'IA) ;
//  (2) aucun jeton de scrubbing n'est JAMAIS visible par le praticien (verbatim
//      restauré ; JSON stocké nettoyé).
const { callClaudeMock } = vi.hoisted(() => ({ callClaudeMock: vi.fn() }))
vi.mock('./claudeClient', () => ({ callClaude: callClaudeMock }))

import {
  reformulateTranscription,
  extractBilanFromTranscription,
  generateNarrativeReport,
} from './voiceBilanClient'

// Récupère le userPrompt (3ᵉ arg) réellement transmis à Claude.
const sentUserPrompt = (callIndex = 0): string => callClaudeMock.mock.calls[callIndex][2] as string

// Mock « IA fidèle » : recopie verbatim la transcription scrubbée (placeholders inclus).
const echoTranscription = () =>
  callClaudeMock.mockImplementation(async (_k: unknown, _s: unknown, userPrompt: string) => {
    const m = userPrompt.match(/"""\n([\s\S]*?)\n"""/)
    return m ? m[1] : userPrompt
  })

beforeEach(() => {
  callClaudeMock.mockReset()
})

describe('reformulateTranscription', () => {
  it('n\'envoie jamais le nom/prénom réel à Claude et restaure le verbatim', async () => {
    echoTranscription()
    const out = await reformulateTranscription(
      'DUPONT Jean a mal au genou', 'Observation', { nom: 'DUPONT', prenom: 'Jean' },
    )
    // (1) ce qui part vers l'IA est anonymisé (marqueurs indexés)
    expect(sentUserPrompt()).not.toContain('DUPONT')
    expect(sentUserPrompt()).not.toContain('Jean')
    expect(sentUserPrompt()).toMatch(/__PATIENT_0__/)
    expect(sentUserPrompt()).toMatch(/__PATIENT_1__/)
    // (2) ce qui revient au praticien contient le vrai nom, aucun jeton
    expect(out).toContain('DUPONT')
    expect(out).toContain('Jean')
    expect(out).not.toContain('__PATIENT')
  })

  it('restaure même si Claude altère la casse/espaces du marqueur', async () => {
    // L'IA recopie le marqueur indexé en minuscules avec des espaces parasites.
    callClaudeMock.mockResolvedValueOnce('__ patient 0 __ a mal au genou')
    const out = await reformulateTranscription('DUPONT a mal au genou', 'Observation', { nom: 'DUPONT' })
    expect(out).toContain('DUPONT')
    expect(out).not.toMatch(/__\s*patient/i)
  })

  it('retombe sur la dictée brute si un marqueur non géré survit (jamais de jeton visible)', async () => {
    // L'IA hallucine un index jamais produit (seul __PATIENT_0__ existait).
    callClaudeMock.mockResolvedValueOnce('__PATIENT_5__ a mal au genou')
    const raw = 'DUPONT a mal au genou'
    const out = await reformulateTranscription(raw, 'Observation', { nom: 'DUPONT' })
    expect(out).toBe(raw)
    expect(out).not.toContain('__PATIENT')
  })

  it('sans hint patient : comportement historique, aucun jeton', async () => {
    echoTranscription()
    const out = await reformulateTranscription('Le patient a mal au genou', 'Observation')
    expect(out).toBe('Le patient a mal au genou')
    expect(sentUserPrompt()).toContain('Le patient a mal au genou')
  })
})

describe('extractBilanFromTranscription', () => {
  it('n\'envoie pas le nom réel du patient à Claude (transcription scrubbée)', async () => {
    callClaudeMock.mockResolvedValueOnce('{}')
    await extractBilanFromTranscription('DUPONT Jean a mal', 'epaule', { nom: 'DUPONT', prenom: 'Jean' })
    expect(sentUserPrompt()).not.toContain('DUPONT')
    expect(sentUserPrompt()).not.toContain('Jean')
    expect(sentUserPrompt()).toContain('[PATIENT]')
  })

  it('nettoie les jetons PII résiduels du JSON extrait (défense en profondeur)', async () => {
    callClaudeMock.mockResolvedValueOnce(JSON.stringify({
      douleur: { localisationActuelle: '[PATIENT] ressent une douleur, habite [VILLE]' },
    }))
    const out = await extractBilanFromTranscription('texte', 'epaule', { nom: 'DUPONT' })
    const loc = (out.douleur as { localisationActuelle: string }).localisationActuelle
    // [PATIENT] en tête de champ → « Le patient » (capitalisation de phrase).
    expect(loc).toContain('Le patient')
    expect(loc).not.toContain('[PATIENT]')
    expect(loc).not.toContain('[VILLE]')
  })
})

describe('generateNarrativeReport', () => {
  it('nettoie les jetons PII résiduels des sections narratives stockées', async () => {
    callClaudeMock.mockResolvedValueOnce(JSON.stringify([
      { id: 'anamnese', titre: 'Anamnèse', contenu: '[PATIENT] consulte, rappeler au [TELEPHONE]' },
    ]))
    const out = await generateNarrativeReport('texte', 'epaule', 'dictee', { nom: 'DUPONT' })
    // [PATIENT] en tête de section → « Le patient » (capitalisation de phrase).
    expect(out[0].contenu).toContain('Le patient')
    expect(out[0].contenu).not.toContain('[PATIENT]')
    expect(out[0].contenu).not.toContain('[TELEPHONE]')
  })
})
