import { describe, it, expect } from 'vitest'
import { createVerifier, verifyPassword } from './appLock'

// Ces tests verrouillent les invariants du verrou applicatif (D6) côté crypto :
//  (1) un bon mot de passe est accepté, un mauvais rejeté ;
//  (2) le mot de passe n'est JAMAIS stocké en clair (vérificateur opaque) ;
//  (3) deux enrôlements du même mot de passe produisent des empreintes distinctes
//      (sel aléatoire) — pas de rainbow table possible.
// On ne teste pas WebAuthn (Face/Touch ID) ni IndexedDB : indisponibles hors navigateur.

describe('appLock — vérificateur de mot de passe (PBKDF2)', () => {
  it('accepte le bon mot de passe et rejette les autres', async () => {
    const verifier = await createVerifier('S3cret-Kine!')
    expect(await verifyPassword('S3cret-Kine!', verifier)).toBe(true)
    expect(await verifyPassword('S3cret-Kine', verifier)).toBe(false)
    expect(await verifyPassword('mauvais', verifier)).toBe(false)
    expect(await verifyPassword('', verifier)).toBe(false)
  })

  it('ne stocke jamais le mot de passe en clair', async () => {
    const verifier = await createVerifier('MotDePasseEnClair')
    const dump = JSON.stringify(verifier)
    expect(dump).not.toContain('MotDePasseEnClair')
    expect(verifier.salt).toBeTruthy()
    expect(verifier.hash).toBeTruthy()
    expect(verifier.iterations).toBeGreaterThanOrEqual(100_000)
  })

  it('utilise un sel aléatoire : même mot de passe → empreintes différentes', async () => {
    const a = await createVerifier('identique')
    const b = await createVerifier('identique')
    expect(a.salt).not.toEqual(b.salt)
    expect(a.hash).not.toEqual(b.hash)
    // …mais chacun valide bien le mot de passe d'origine.
    expect(await verifyPassword('identique', a)).toBe(true)
    expect(await verifyPassword('identique', b)).toBe(true)
  })

  it('un vérificateur corrompu ne déverrouille pas (échec sûr)', async () => {
    const verifier = await createVerifier('peu importe')
    expect(await verifyPassword('peu importe', { ...verifier, salt: '!!!not-base64!!!' })).toBe(false)
    expect(await verifyPassword('peu importe', { ...verifier, hash: '' })).toBe(false)
  })
})
