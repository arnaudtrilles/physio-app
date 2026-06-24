import { describe, it, expect } from 'vitest'
import {
  patientKeyToScrubHint,
  scrubTranscription,
  scrubTranscriptionReversible,
  stripPiiTokens,
} from './transcriptionScrub'

// Scrubbing PII des transcriptions vocales avant envoi à Anthropic.
// Garde-fou RGPD (minimisation, art. 5.1.c) : ces fonctions décident ce qui
// quitte le poste du praticien. Une régression silencieuse = fuite de données
// de santé → on les verrouille par des tests.

describe('patientKeyToScrubHint', () => {
  it('retourne undefined pour une clé absente ou vide', () => {
    expect(patientKeyToScrubHint(undefined)).toBeUndefined()
    expect(patientKeyToScrubHint('')).toBeUndefined()
  })

  it('retourne undefined pour le patient anonyme (insensible à la casse)', () => {
    expect(patientKeyToScrubHint('Anonyme')).toBeUndefined()
    // pk() met le nom en MAJUSCULES → la clé réelle est « ANONYME ».
    expect(patientKeyToScrubHint('ANONYME')).toBeUndefined()
    expect(patientKeyToScrubHint('ANONYME|1990-01-01')).toBeUndefined()
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

  it('rattache un nom composé au nom (bascule de casse) — « LE GOFF Marie »', () => {
    expect(patientKeyToScrubHint('LE GOFF Marie')).toEqual({ nom: 'LE GOFF', prenom: 'Marie' })
    expect(patientKeyToScrubHint('DE LA TOUR Anne Sophie')).toEqual({ nom: 'DE LA TOUR', prenom: 'Anne Sophie' })
  })

  it('gère un nom accentué tout-en-majuscules', () => {
    expect(patientKeyToScrubHint('HERVÉ Léa')).toEqual({ nom: 'HERVÉ', prenom: 'Léa' })
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

  // ── BLOCKER 1 : noms accentués (le `\b` ASCII-only les laissait fuiter) ──
  it('masque un nom à accent initial/final (Hervé, René, Éric, André, Noé)', () => {
    for (const nom of ['Hervé', 'René', 'Éric', 'André', 'Noé']) {
      const res = scrubTranscription(`Le patient ${nom} a mal au genou`, { nom })
      expect(res.text, nom).toContain('[PATIENT]')
      expect(res.text, nom).not.toContain(nom)
    }
  })

  it('ne sur-masque PAS un mot qui contient seulement le nom en sous-chaîne', () => {
    // hint « Noé » ne doit pas caviarder « Noémien » (frontière droite Unicode).
    const res = scrubTranscription('Le patient Noémien reste actif', { nom: 'Noé' })
    expect(res.text).toContain('Noémien')
    expect(res.text).not.toContain('[PATIENT]')
  })

  it('ne masque pas un prénom courant non concerné (Martin) sans hint', () => {
    const clinical = 'Marche de Martin, test de Müller, François présent'
    expect(scrubTranscription(clinical).text).toBe(clinical)
  })

  // ── BLOCKER 2 : noms composés (« LE GOFF ») ──
  it('masque un nom composé entier et ses mots isolés, sans caviarder « le »', () => {
    const hint = patientKeyToScrubHint('LE GOFF Marie')
    const res = scrubTranscription('Madame LE GOFF est venue, Marie va mieux. Le bilan est ok.', hint)
    expect(res.text).not.toContain('GOFF')
    expect(res.text).not.toContain('Marie')
    expect(res.text).toContain('[PATIENT]')
    // L'article « Le » du langage courant n'est PAS masqué.
    expect(res.text).toContain('Le bilan')
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

describe('scrubTranscriptionReversible', () => {
  it('retourne un résultat vide + restore no-op pour un texte vide', () => {
    const res = scrubTranscriptionReversible('')
    expect(res.text).toBe('')
    expect(res.replacements).toBe(0)
    expect(res.restore('inchangé')).toBe('inchangé')
  })

  it('masque le nom/prénom par des placeholders indexés avant envoi', () => {
    const res = scrubTranscriptionReversible('Le patient DUPONT Jean va mieux', { nom: 'DUPONT', prenom: 'Jean' })
    expect(res.text).not.toContain('DUPONT')
    expect(res.text).not.toContain('Jean')
    expect(res.text).toMatch(/__PATIENT_\d+__/)
    // Pas de jeton collisionnel [PATIENT] dans la variante réversible.
    expect(res.text).not.toContain('[PATIENT]')
  })

  it('restaure les vraies valeurs verbatim après réponse IA (aucun jeton résiduel)', () => {
    const res = scrubTranscriptionReversible('DUPONT Jean se plaint du genou', { nom: 'DUPONT', prenom: 'Jean' })
    const restored = res.restore(res.text)
    expect(restored).toBe('DUPONT Jean se plaint du genou')
    expect(restored).not.toMatch(/__PATIENT/)
  })

  it('restaure un nom accentué au caractère près', () => {
    const res = scrubTranscriptionReversible('Hervé se plaint, revoir Hervé demain', { nom: 'Hervé' })
    expect(res.text).not.toContain('Hervé')
    expect(res.restore(res.text)).toBe('Hervé se plaint, revoir Hervé demain')
  })

  it('restaure même si l\'IA altère la casse ou les espaces du marqueur', () => {
    const res = scrubTranscriptionReversible('DUPONT a mal', { nom: 'DUPONT' })
    // L'IA recopie le marqueur en minuscules avec des espaces parasites.
    const altered = res.text.replace('__PATIENT_0__', '__ patient 0 __')
    const restored = res.restore(altered)
    expect(restored).toContain('DUPONT')
    expect(restored).not.toMatch(/__\s*patient/i)
  })

  it('hint absent → texte des noms inchangé et restore no-op', () => {
    const input = 'DUPONT Jean se plaint du genou'
    const res = scrubTranscriptionReversible(input)
    expect(res.text).toContain('DUPONT')
    expect(res.text).toContain('Jean')
    expect(res.restore(res.text)).toBe(res.text)
  })

  it('masque les PII universels de façon NON réversible (comme scrubTranscription)', () => {
    const res = scrubTranscriptionReversible('Joindre au 06 12 34 56 78', { nom: 'DUPONT' })
    expect(res.text).toContain('[TELEPHONE]')
    // restore ne réinjecte jamais un numéro de téléphone.
    expect(res.restore(res.text)).toContain('[TELEPHONE]')
  })

  it('ne masque pas un nom trop court (< 2 caractères)', () => {
    const res = scrubTranscriptionReversible('A consulté pour A', { nom: 'A' })
    expect(res.replacements).toBe(0)
    expect(res.text).toBe('A consulté pour A')
  })
})

describe('stripPiiTokens', () => {
  it('remplace [PATIENT] par « le patient » (capitalisé en tête de phrase)', () => {
    expect(stripPiiTokens('[PATIENT] se plaint du genou')).toBe('Le patient se plaint du genou')
  })

  it('garde « le patient » en minuscule en milieu de phrase', () => {
    expect(stripPiiTokens('Au repos [PATIENT] va mieux')).toBe('Au repos le patient va mieux')
  })

  it('évite la collision « le le patient »', () => {
    expect(stripPiiTokens('Au repos le [PATIENT] se plaint')).toBe('Au repos le patient se plaint')
  })

  it('corrige les contractions « de le » → « du », « à le » → « au »', () => {
    expect(stripPiiTokens('La douleur de [PATIENT] persiste')).toBe('La douleur du patient persiste')
    expect(stripPiiTokens('On confie à [PATIENT] des exercices')).toBe('On confie au patient des exercices')
  })

  it('retire les jetons PII résiduels (téléphone, ville, etc.)', () => {
    expect(stripPiiTokens('Rappeler au [TELEPHONE] habite [VILLE]')).toBe('Rappeler au habite')
  })

  it('préserve les sauts de ligne entre paragraphes', () => {
    const input = 'Anamnèse [VILLE]\n\nExamen clinique'
    expect(stripPiiTokens(input)).toBe('Anamnèse\n\nExamen clinique')
  })

  it('préserve les annotations cliniques [inaudible] / [à préciser]', () => {
    const clinical = 'Douleur [inaudible] depuis [à préciser : 2 ou 3 ?] semaines'
    expect(stripPiiTokens(clinical)).toBe(clinical)
  })

  it('normalise les espaces et la ponctuation après suppression', () => {
    expect(stripPiiTokens('Contact [EMAIL] , merci')).toBe('Contact, merci')
  })

  it('retourne la valeur telle quelle pour une chaîne vide', () => {
    expect(stripPiiTokens('')).toBe('')
  })
})
