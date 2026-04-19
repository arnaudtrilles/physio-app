import type { LetterFormData } from '../types'

/**
 * Détecteur léger d'identifiants potentiels dans les champs texte libre
 * d'un LetterFormData. L'objectif n'est PAS d'être infaillible, mais de
 * déclencher une alerte si le praticien a oublié de pseudonymiser manuellement
 * dans un champ "notes libres" que le pipeline automatique ne traite pas.
 *
 * Heuristiques détectées :
 *  - Mots en MAJUSCULES (≥ 3 lettres) : souvent des patronymes ("DUPONT")
 *  - Patronymes composés ("Jean-Pierre", "Dr Martin")
 *  - Séquences "Prénom NOM" (ex: "Marie DURAND")
 *  - Numéros de téléphone français (06 XX XX XX XX, +33 …)
 *  - Emails
 *  - NIR / numéros sécu français (15 chiffres)
 *  - Adresses postales explicites ("12 rue …")
 */

export interface PIIMatch {
  field: keyof LetterFormData
  fieldLabel: string
  snippet: string
  reason: string
}

const FIELD_LABELS: Partial<Record<keyof LetterFormData, string>> = {
  resumeBilanInitial: 'Résumé du bilan initial',
  traitement: 'Traitement effectué',
  resultats: 'Résultats / état actuel',
  recommandations: 'Recommandations',
  suite: 'Suite proposée',
  raisonArret: "Raison de l'arrêt",
  etatActuel: 'État actuel',
  resumePec: 'Résumé de la PEC',
  raisonOrientation: "Raison de l'orientation",
  justification: 'Justification',
  antecedents: 'Antécédents',
  indication1: 'Indication 1',
  indication2: 'Indication 2',
  evolution: 'Évolution',
  pointsPositifs: 'Points positifs',
  difficultes: 'Difficultés',
  traitementsEssayes: 'Traitements essayés',
  constat: 'Constat',
  scoresFonctionnels: 'Scores fonctionnels',
  orientation: 'Orientation',
  avisPersonnel: 'Avis personnel',
  indication: 'Indication de PEC',
}

// Mots "faux positifs" à ignorer (termes médicaux en majuscules légitimes)
const WHITELIST = new Set([
  'EVN', 'EVA', 'IRM', 'IMC', 'LCA', 'LCP', 'LCM', 'LCL', 'LTFA', 'LCF',
  'NDI', 'DN4', 'FFI', 'KOOS', 'PSFS', 'FABQ', 'HAD', 'CSI', 'OSS', 'DASH',
  'ACL', 'PCL', 'MCL', 'LCL', 'ROM', 'PEC', 'IA', 'PEP', 'CRP', 'BM', 'EI',
  'AVC', 'TC', 'MI', 'MS', 'RE', 'RI', 'ABD', 'ADD', 'EXT', 'FLEX', 'ROT',
  'ATCD', 'ATCDS', 'RCC', 'ADELI', 'PKB', 'SLR', 'RFR', 'AT', 'AINS',
  'TENS', 'SIJ', 'MTR', 'LPG', 'SPPB', 'STAR', 'EAST', 'SPURLING', 'ADSON',
  'FADDIR', 'FABER', 'OBER', 'THOMAS', 'THESSALY', 'LACHMAN', 'MCKENZIE',
  'APLEY', 'EIFEL', 'OXFORD', 'OREBRO', 'SF', 'IKDC', 'HAGOS', 'HOOS',
  'EI', 'ER', 'GH', 'AC', 'SC', 'CP', 'DM', 'DR', 'PR', 'MT',
])

// Patronymes composés classiques (ex: "Jean-Pierre DURAND")
const COMPOSED_NAME = /\b[A-ZÀ-Ÿ][a-zà-ÿ]+(?:-[A-ZÀ-Ÿ][a-zà-ÿ]+)+\b/

// Séquences prénom-type + NOM MAJUSCULES (ex: "Thomas BERGER", "Marie DURAND")
const PRENOM_NOM = /\b[A-ZÀ-Ÿ][a-zà-ÿ]{2,}\s+[A-ZÀ-Ÿ]{3,}\b/

// Tout mot en majuscules ≥ 3 lettres (hors whitelist)
const ALL_CAPS_WORD = /\b[A-ZÀ-Ÿ]{3,}\b/g

// Téléphones français
const PHONE_FR = /(?:\+33\s?[1-9](?:[\s.-]?\d{2}){4}|\b0[1-9](?:[\s.-]?\d{2}){4}\b)/

// Emails
const EMAIL = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/

// NIR / numéro de sécu français (13-15 chiffres consécutifs)
const NIR = /\b\d{13,15}\b/

// Adresses postales ("12 rue …", "5 avenue …", etc.)
const POSTAL_ADDRESS = /\b\d{1,4}\s?(?:bis|ter)?,?\s+(?:rue|avenue|av\.|boulevard|bd|place|impasse|allée|chemin|route|quai)\s+[A-ZÀ-Ÿa-zà-ÿ]/i

function findAllCapsOutsideWhitelist(text: string): string[] {
  const found: string[] = []
  const matches = text.match(ALL_CAPS_WORD) ?? []
  for (const m of matches) {
    if (!WHITELIST.has(m)) found.push(m)
  }
  return found
}

function makeSnippet(text: string, match: string): string {
  const idx = text.indexOf(match)
  if (idx === -1) return match
  const start = Math.max(0, idx - 20)
  const end = Math.min(text.length, idx + match.length + 20)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

export function scanFormForPII(form: LetterFormData): PIIMatch[] {
  const matches: PIIMatch[] = []

  for (const [key, label] of Object.entries(FIELD_LABELS) as [keyof LetterFormData, string][]) {
    const value = (form[key] ?? '').toString().trim()
    if (!value || value.length < 3) continue

    // Téléphone
    if (PHONE_FR.test(value)) {
      const m = value.match(PHONE_FR)!
      matches.push({ field: key, fieldLabel: label, snippet: makeSnippet(value, m[0]), reason: 'Numéro de téléphone' })
    }
    // Email
    if (EMAIL.test(value)) {
      const m = value.match(EMAIL)!
      matches.push({ field: key, fieldLabel: label, snippet: makeSnippet(value, m[0]), reason: 'Adresse email' })
    }
    // NIR
    if (NIR.test(value)) {
      const m = value.match(NIR)!
      matches.push({ field: key, fieldLabel: label, snippet: makeSnippet(value, m[0]), reason: 'Numéro de sécurité sociale' })
    }
    // Adresse postale
    if (POSTAL_ADDRESS.test(value)) {
      const m = value.match(POSTAL_ADDRESS)!
      matches.push({ field: key, fieldLabel: label, snippet: makeSnippet(value, m[0]), reason: 'Adresse postale' })
    }
    // Prénom NOM (séquence)
    if (PRENOM_NOM.test(value)) {
      const m = value.match(PRENOM_NOM)!
      const tokens = m[0].split(/\s+/)
      const nomCandidate = tokens[tokens.length - 1]
      if (!WHITELIST.has(nomCandidate)) {
        matches.push({ field: key, fieldLabel: label, snippet: makeSnippet(value, m[0]), reason: 'Séquence "Prénom NOM"' })
      }
    }
    // Patronyme composé (Jean-Pierre)
    if (COMPOSED_NAME.test(value)) {
      const m = value.match(COMPOSED_NAME)!
      matches.push({ field: key, fieldLabel: label, snippet: makeSnippet(value, m[0]), reason: 'Patronyme composé' })
    }
    // Mots ALL-CAPS hors whitelist
    const caps = findAllCapsOutsideWhitelist(value)
    if (caps.length > 0) {
      // On ne garde qu'une alerte par champ pour cette catégorie
      matches.push({
        field: key,
        fieldLabel: label,
        snippet: makeSnippet(value, caps[0]),
        reason: `Mot en majuscules (peut être un nom : ${caps.slice(0, 3).join(', ')})`,
      })
    }
  }

  return matches
}
