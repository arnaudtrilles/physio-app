// Verrou applicatif (D6) — contrôle d'accès au DÉMARRAGE de l'app, EN PLUS de
// l'authentification Supabase. Ce module ne contient que de la logique pure :
//   • dérivation/vérification d'un mot de passe (PBKDF2-SHA-256, crypto.subtle) ;
//   • enrôlement/assertion d'une passkey de plateforme (Face ID / Touch ID, WebAuthn).
// Aucune dépendance React ici → testable isolément.
//
// IMPORTANT (RGPD/sécurité) :
//   • on ne stocke JAMAIS le mot de passe en clair, seulement un vérificateur
//     {salt, hash, iterations} ;
//   • la vérification est 100 % LOCALE (aucun appel réseau) pour ne jamais
//     enfermer dehors un praticien hors-ligne au token expiré.

import { saveLockConfig, deleteLockConfig } from './appLockDB'

export interface LockConfig {
  /** Clé primaire = id du compte Supabase propriétaire de l'enrôlement. */
  userId: string
  /** E-mail saisi à l'enrôlement (comparé, insensible à la casse, au repli). */
  email: string
  /** Sel aléatoire (base64) du PBKDF2. */
  salt: string
  /** Empreinte PBKDF2-SHA-256 du mot de passe (base64). Jamais le mot de passe. */
  hash: string
  /** Nombre d'itérations PBKDF2 utilisées (mémorisé pour rester vérifiable). */
  iterations: number
  /** Id (base64url) de la passkey de plateforme, si la biométrie a été enrôlée. */
  credentialId?: string
  /** Horodatage ISO de l'enrôlement. */
  createdAt: string
}

const PBKDF2_ITERATIONS = 210_000
const SALT_BYTES = 16
const HASH_BITS = 256

// ── Encodage base64 / base64url ────────────────────────────────────────────

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  return base64ToBytes(b64 + pad)
}

// ── Aléa & PBKDF2 ──────────────────────────────────────────────────────────

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(n)
  crypto.getRandomValues(b)
  return b
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password) as Uint8Array<ArrayBuffer>, 'PBKDF2', false, ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, HASH_BITS,
  )
  return new Uint8Array(bits)
}

/** Comparaison à temps constant (anti-timing). */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/** Construit un vérificateur {salt, hash, iterations} à partir d'un mot de passe. */
export async function createVerifier(
  password: string,
): Promise<{ salt: string; hash: string; iterations: number }> {
  const salt = randomBytes(SALT_BYTES)
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS)
  return { salt: bytesToBase64(salt), hash: bytesToBase64(hash), iterations: PBKDF2_ITERATIONS }
}

/** Vérifie un mot de passe contre un vérificateur stocké (100 % hors-ligne). */
export async function verifyPassword(
  password: string,
  verifier: { salt: string; hash: string; iterations: number },
): Promise<boolean> {
  try {
    const salt = base64ToBytes(verifier.salt)
    const derived = await pbkdf2(password, salt, verifier.iterations)
    return timingSafeEqual(derived, base64ToBytes(verifier.hash))
  } catch {
    return false
  }
}

// ── WebAuthn (Face ID / Touch ID) ──────────────────────────────────────────

/** L'appareil propose-t-il un authentificateur de plateforme (biométrie) ? */
export async function isPlatformAuthAvailable(): Promise<boolean> {
  try {
    if (typeof PublicKeyCredential === 'undefined') return false
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Enrôle une passkey de plateforme (Face ID / Touch ID). Best-effort : renvoie
 * l'id (base64url) en cas de succès, null sinon (biométrie indispo/refusée).
 */
export async function createPlatformCredential(userId: string, email: string): Promise<string | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.credentials || typeof PublicKeyCredential === 'undefined') {
      return null
    }
    if (!(await isPlatformAuthAvailable())) return null
    const cred = (await navigator.credentials.create({
      publicKey: {
        rp: { id: location.hostname, name: 'PhysioApp' },
        user: { id: randomBytes(16), name: email || userId, displayName: email || userId },
        challenge: randomBytes(32),
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60_000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null
    if (!cred) return null
    return bytesToBase64Url(new Uint8Array(cred.rawId))
  } catch {
    return null
  }
}

/**
 * Demande une assertion biométrique locale. true = l'OS a validé Face/Touch ID.
 * Toute erreur/annulation → false (on bascule alors sur le repli mot de passe).
 */
export async function assertPlatformCredential(credentialId: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.credentials || typeof PublicKeyCredential === 'undefined') {
      return false
    }
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        rpId: location.hostname,
        allowCredentials: [{ type: 'public-key', id: base64UrlToBytes(credentialId) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    })
    return !!assertion
  } catch {
    return false
  }
}

// ── Orchestration enrôlement / désactivation ───────────────────────────────

/**
 * Active le verrou pour le compte : crée le vérificateur de mot de passe, tente
 * d'enrôler la biométrie (best-effort) et persiste la config dans IndexedDB.
 * Renvoie si la biométrie a effectivement été enrôlée (pour le message UI).
 */
export async function enrollAppLock(
  userId: string,
  email: string,
  password: string,
): Promise<{ biometricEnrolled: boolean }> {
  const verifier = await createVerifier(password)
  const credentialId = await createPlatformCredential(userId, email)
  const config: LockConfig = {
    userId,
    email,
    salt: verifier.salt,
    hash: verifier.hash,
    iterations: verifier.iterations,
    credentialId: credentialId ?? undefined,
    createdAt: new Date().toISOString(),
  }
  await saveLockConfig(config)
  return { biometricEnrolled: !!credentialId }
}

/** Désactive le verrou : supprime la config (vérificateur + passkey) du compte. */
export async function disableAppLock(userId: string): Promise<void> {
  await deleteLockConfig(userId)
}
