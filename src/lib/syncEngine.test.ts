import { describe, it, expect } from 'vitest'
import { pk, deduplicateLocalData, mergeWithLocalDocs, detectUnionedStores } from './syncEngine'
import type { LocalData } from './syncEngine'

// Cœur de la sync IndexedDB ↔ Supabase. Ces helpers décident quand deux
// enregistrements sont "le même" (fingerprints) et comment fusionner local et
// cloud. Une régression ici = doublons patients OU perte de données (un refresh
// pendant le debounce de 3 s détruit un bilan). Verrouillage par tests.

// Construit un LocalData vide ; on ne remplit que les stores testés.
const emptyLocal = (): LocalData => ({
  db: [], dbIntermediaires: [], dbNotes: [], dbObjectifs: [],
  dbExerciceBank: [], dbPatientDocs: [], dbLetters: [],
  dbLetterAudit: [], dbAICallAudit: [], dbPrescriptions: [],
  dbClosedTreatments: [], profile: {} as LocalData['profile'],
})

describe('pk (clé patient)', () => {
  it('uppercase le nom et titlecase le prénom', () => {
    expect(pk('dupont', 'jean')).toBe('DUPONT Jean')
  })

  it('titlecase chaque mot d\'un prénom composé', () => {
    expect(pk('dupont', 'jean pierre')).toBe('DUPONT Jean Pierre')
  })

  it('ajoute la date de naissance pour désambiguer les homonymes', () => {
    expect(pk('Dupont', 'Jean', '1990-01-01')).toBe('DUPONT Jean|1990-01-01')
  })

  it('rogne les espaces superflus', () => {
    expect(pk('  dupont  ', '  jean  ')).toBe('DUPONT Jean')
  })
})

describe('deduplicateLocalData', () => {
  it('fusionne les bilans identiques malgré une casse nom/prénom différente', () => {
    const data = emptyLocal()
    data.db = [
      { nom: 'Dupont', prenom: 'Jean', dateBilan: '2024-01-01', bilanType: 'epaule', zone: 'epaule' },
      { nom: 'DUPONT', prenom: 'jean', dateBilan: '2024-01-01', bilanType: 'epaule', zone: 'epaule' },
    ] as LocalData['db']
    expect(deduplicateLocalData(data).db).toHaveLength(1)
  })

  it('déduplique la banque d\'exercices par id', () => {
    const data = emptyLocal()
    data.dbExerciceBank = [{ id: 'x' }, { id: 'x' }, { id: 'y' }] as LocalData['dbExerciceBank']
    expect(deduplicateLocalData(data).dbExerciceBank).toHaveLength(2)
  })

  it('conserve les bilans réellement distincts', () => {
    const data = emptyLocal()
    data.db = [
      { nom: 'DUPONT', prenom: 'Jean', dateBilan: '2024-01-01', bilanType: 'epaule', zone: 'epaule' },
      { nom: 'DUPONT', prenom: 'Jean', dateBilan: '2024-02-01', bilanType: 'epaule', zone: 'epaule' },
    ] as LocalData['db']
    expect(deduplicateLocalData(data).db).toHaveLength(2)
  })
})

describe('mergeWithLocalDocs', () => {
  it('réattache le compteRendu local (champ client-only non persisté en cloud)', () => {
    const cloud = emptyLocal()
    cloud.db = [
      { nom: 'DUPONT', prenom: 'Jean', dateBilan: '2024-01-01', bilanType: 'epaule', zone: 'epaule' },
    ] as LocalData['db']
    const local = emptyLocal()
    local.db = [
      { nom: 'DUPONT', prenom: 'Jean', dateBilan: '2024-01-01', bilanType: 'epaule', zone: 'epaule', compteRendu: 'CACHE_LOCAL' },
    ] as LocalData['db']

    const merged = mergeWithLocalDocs(cloud, local)
    expect(merged.db).toHaveLength(1)
    expect(merged.db[0].compteRendu).toBe('CACHE_LOCAL')
  })

  it('préserve un bilan présent en local mais absent du cloud', () => {
    const cloud = emptyLocal()
    const local = emptyLocal()
    local.db = [
      { nom: 'MARTIN', prenom: 'Paul', dateBilan: '2024-03-01', bilanType: 'genou', zone: 'genou' },
    ] as LocalData['db']

    const merged = mergeWithLocalDocs(cloud, local)
    expect(merged.db).toHaveLength(1)
    expect(merged.db[0].nom).toBe('MARTIN')
  })

  it('réattache le binaire local d\'un document et dédupe par patientKey+name', () => {
    const cloud = emptyLocal()
    cloud.dbPatientDocs = [
      { patientKey: 'DUPONT Jean', name: 'ordo.pdf', addedAt: '2024-01-01T00:00:00Z' },
    ] as LocalData['dbPatientDocs']
    const local = emptyLocal()
    local.dbPatientDocs = [
      { patientKey: 'DUPONT Jean', name: 'ordo.pdf', addedAt: '2024-01-02T00:00:00Z', data: 'BASE64' },
    ] as LocalData['dbPatientDocs']

    const merged = mergeWithLocalDocs(cloud, local)
    expect(merged.dbPatientDocs).toHaveLength(1)
    expect(merged.dbPatientDocs[0].data).toBe('BASE64')
  })
})

describe('detectUnionedStores', () => {
  it('signale un store où le merge a ajouté des enregistrements local-only', () => {
    const merged = emptyLocal()
    merged.db = [{}, {}] as LocalData['db']
    const cloud = emptyLocal()
    cloud.db = [{}] as LocalData['db']

    expect(detectUnionedStores(merged, cloud).db).toBe(true)
  })

  it('ne signale rien quand les tailles sont égales', () => {
    const merged = emptyLocal()
    merged.dbNotes = [{}] as LocalData['dbNotes']
    const cloud = emptyLocal()
    cloud.dbNotes = [{}] as LocalData['dbNotes']

    expect(detectUnionedStores(merged, cloud).dbNotes).toBe(false)
  })

  it('signale les documents même quand le merge a RÉDUIT le nombre d\'entrées (dédupe orphelins)', () => {
    const merged = emptyLocal()
    merged.dbPatientDocs = [{}] as LocalData['dbPatientDocs']
    const cloud = emptyLocal()
    cloud.dbPatientDocs = [{}, {}] as LocalData['dbPatientDocs']

    expect(detectUnionedStores(merged, cloud).dbPatientDocs).toBe(true)
  })
})
