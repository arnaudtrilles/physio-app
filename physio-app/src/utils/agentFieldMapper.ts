import type { BilanType } from '../types'

/**
 * Traduit le nom de champ générique de Lucie en structure partielle
 * compatible avec setData() de chaque composant bilan.
 *
 * Retourne null si le champ n'est pas mappé pour ce type de bilan.
 */
export function mapAgentField(
  bilanType: BilanType,
  field: string,
  value: string
): Record<string, unknown> | null {

  const f = field.toLowerCase().trim()

  // ── Champs communs à tous les bilans ────────────────────────────────────────
  const common: Record<string, Record<string, unknown>> = {
    motif:        { douleur: { facteurDeclenchant: value } },
    debut:        { douleur: { debutSymptomes: value } },
    evn_repos:    { douleur: { evnMieux: value } },
    evn_effort:   { douleur: { evnPire: value } },
    evn:          { douleur: { evnMoy: value } },
    evn_moyen:    { douleur: { evnMoy: value } },
    cote:         { douleur: { situation: value } },
    localisation: { douleur: { localisationActuelle: value } },
    antecedents:  { redFlags: { antecedents: value } },
    ttt_medical:  { redFlags: { tttMedical: value } },
    imagerie:     { redFlags: { imageries: value } },
    imageries:    { redFlags: { imageries: value } },
    sommeil:      { redFlags: { sommeilQualite: value } },
    comorbidites: { redFlags: { comorbidites: value } },
    attentes:     { yellowFlags: { attentes: value } },
    mecanisme:    { douleur: { debutSymptomes: value } },
  }

  if (common[f]) return common[f]

  // ── Champs spécifiques par type de bilan ─────────────────────────────────────
  switch (bilanType) {

    case 'epaule': {
      const epauleMap: Record<string, Record<string, unknown>> = {
        mouvements_douloureux: { douleur: { mouvementsEmpirent: value } },
        mouvements_soulagent:  { douleur: { mouvementsSoulagent: value } },
        // Tests + amplitudes → scores.autresScores (champ libre)
        tests:      { scores: { autresScores: `Tests cliniques : ${value}` } },
        amplitudes: { scores: { autresScores: `Amplitudes : ${value}` } },
        force:      { scores: { autresScores: `Force musculaire : ${value}` } },
        // Scores fonctionnels
        oss:      { scores: { scoreOSS: value } },
        constant: { scores: { scoreConstant: value } },
        dash:     { scores: { scoreDASH: value } },
        rowe:     { scores: { scoreRowe: value } },
        // Douleur nocturne
        nocturne: { douleur: { douleurNocturne: value } },
      }
      return epauleMap[f] ?? null
    }

    case 'genou': {
      const genouMap: Record<string, Record<string, unknown>> = {
        mouvements_douloureux: { douleur: { mouvementsEmpirent: value } },
        inflammation:          { douleur: { localisationActuelle: value } },
        // Tests → examClinique avec valeurs structurées
        tests: {
          examClinique: {
            force: { lachman: 'positif', tiroir: 'positif' }  // simplification
          }
        },
        amplitudes: {
          examClinique: {
            mobilite: {
              flexionGenou:   { gauche: value, droite: value },
              extensionGenou: { gauche: '0', droite: '0' },
            }
          }
        },
        flexion:   { examClinique: { mobilite: { flexionGenou:   { gauche: value, droite: value } } } },
        extension: { examClinique: { mobilite: { extensionGenou: { gauche: value, droite: value } } } },
        lachman:   { examClinique: { force: { lachman: value } } },
        mcmurray:  { examClinique: { force: { mcmurray: value } } },
      }
      return genouMap[f] ?? null
    }

    case 'lombaire': {
      const lombaireMap: Record<string, Record<string, unknown>> = {
        irradiations:  { douleur: { localisationActuelle: value } },
        neurologique:  { neurologique: { sensibilite: value } },
        posture:       { examClinique: { morfho: value } },
        tests:         { mecanosensibilite: { lasegue: value } },
        schober:       { examClinique: { mobilite: { flexionLombaire: { gauche: value, droite: value } } } },
        amplitudes:    { examClinique: { mobilite: { flexionLombaire: { gauche: value, droite: value } } } },
        lasegue:       { mecanosensibilite: { lasegue: value } },
        nocturne:      { douleur: { nocturne: value } },
      }
      return lombaireMap[f] ?? null
    }

    case 'cervical': {
      const cervicalMap: Record<string, Record<string, unknown>> = {
        irradiations:  { douleur: { localisationActuelle: value } },
        cephalees:     { douleur: { douleurNocturneType: value } },
        neurologique:  { neurologique: { sensibilite: value } },
        tests:         { examClinique: { force: { spurling: value } } },
        amplitudes:    { examClinique: { mobilite: { flexionCervicale: { gauche: value, droite: value } } } },
        flexion:       { examClinique: { mobilite: { flexionCervicale:   { gauche: value, droite: value } } } },
        extension:     { examClinique: { mobilite: { extensionCervicale: { gauche: value, droite: value } } } },
        rotation:      { examClinique: { mobilite: { rotationCervicale:  { gauche: value, droite: value } } } },
        inclinaison:   { examClinique: { mobilite: { inclinaisonCervicale: { gauche: value, droite: value } } } },
      }
      return cervicalMap[f] ?? null
    }

    case 'hanche': {
      const hancheMap: Record<string, Record<string, unknown>> = {
        tests:      { examClinique: { force: { faber: value, fadir: value } } },
        amplitudes: { examClinique: { mobilite: { flexionHanche: { gauche: value, droite: value } } } },
        flexion:    { examClinique: { mobilite: { flexionHanche:         { gauche: value, droite: value } } } },
        rotation_i: { examClinique: { mobilite: { rotationInterneHanche: { gauche: value, droite: value } } } },
        rotation_e: { examClinique: { mobilite: { rotationExterneHanche: { gauche: value, droite: value } } } },
        abduction:  { examClinique: { mobilite: { abductionHanche:       { gauche: value, droite: value } } } },
        marche:     { douleur: { situation: value } },
        faber:      { examClinique: { force: { faber: value } } },
        fadir:      { examClinique: { force: { fadir: value } } },
      }
      return hancheMap[f] ?? null
    }

    case 'cheville': {
      const chevilleMap: Record<string, Record<string, unknown>> = {
        inflammation:  { douleur: { localisationActuelle: value } },
        oedeme:        { douleur: { localisationActuelle: value } },
        tests:         { examClinique: { force: { tiroir: value } } },
        amplitudes:    { examClinique: { mobilite: { flexionDorsale: { gauche: value, droite: value } } } },
        flexion_d:     { examClinique: { mobilite: { flexionDorsale:    { gauche: value, droite: value } } } },
        flexion_p:     { examClinique: { mobilite: { flexionPlantaire:  { gauche: value, droite: value } } } },
        tiroir:        { examClinique: { force: { tiroir: value } } },
        varus:         { examClinique: { force: { varus: value } } },
      }
      return chevilleMap[f] ?? null
    }

    case 'generique':
      return { douleur: { facteurDeclenchant: `${field}: ${value}` } }

    default:
      return null
  }
}
