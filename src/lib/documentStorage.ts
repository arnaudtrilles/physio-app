/**
 * Supabase Storage layer pour les blobs binaires des documents patients.
 *
 * Bucket : `patient-docs` (privé, RLS basé sur le user_id en 1er segment du path).
 * Path scheme : `{userId}/{scope}/{uniqueId}.{ext}` — préserve l'isolation
 * per-practitioner via RLS et permet le cleanup par dossier.
 *
 * Les blobs sont stockés bruts (binaires), pas en base64 — gain de ~33%
 * d'espace + Storage gère le streaming natif.
 */

import { supabase as _supabase } from './supabase'

const BUCKET = 'patient-docs'

function client() {
  if (!_supabase) throw new Error('Supabase non configuré')
  return _supabase
}

// ── Helpers ─────────────────────────────────────────────────────

function extFromMime(mime: string): string {
  if (mime === 'application/pdf') return 'pdf'
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic'
  // Fallback générique — Storage accepte mais le viewer pourra mal afficher
  const sub = mime.split('/')[1]
  return (sub || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'bin'
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'doc'
}

function uniqueId(): string {
  // RFC4122-ish suffix (pas besoin de crypto-grade ici)
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().split('-')[0]
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Construit un path Storage stable pour un blob.
 * @param userId UUID du practitioner (1er segment, requis par RLS)
 * @param scope 'bilan-{id}' | 'patient-doc' — sous-dossier logique
 * @param fileName Nom d'origine — sert au slug
 * @param mimeType Pour l'extension finale
 */
export function buildStoragePath(
  userId: string,
  scope: string,
  fileName: string,
  mimeType: string,
): string {
  const safeScope = slug(scope) || 'doc'
  const safeName = slug(fileName.replace(/\.[^.]+$/, ''))
  const ext = extFromMime(mimeType)
  return `${userId}/${safeScope}/${safeName}-${uniqueId()}.${ext}`
}

function base64ToBlob(b64OrDataUrl: string, mimeType: string): Blob {
  const raw = b64OrDataUrl.startsWith('data:')
    ? b64OrDataUrl.slice(b64OrDataUrl.indexOf(',') + 1)
    : b64OrDataUrl
  const binary = atob(raw)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arr = new Uint8Array(await blob.arrayBuffer())
  // chunked btoa pour éviter le stack overflow sur gros blobs
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < arr.length; i += chunk) {
    binary += String.fromCharCode(...arr.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Upload un blob binaire dans Storage. Retourne le path utilisé.
 * Idempotent côté path : si un path existe déjà, il est écrasé (upsert).
 */
export async function uploadDocBlob(
  path: string,
  base64OrDataUrl: string,
  mimeType: string,
): Promise<string> {
  const blob = base64ToBlob(base64OrDataUrl, mimeType)
  const { error } = await client().storage
    .from(BUCKET)
    .upload(path, blob, { contentType: mimeType, upsert: true, cacheControl: '3600' })
  if (error) throw new Error(`Storage upload (${path}): ${error.message}`)
  return path
}

/**
 * Télécharge un blob depuis Storage et le renvoie en base64 brut
 * (sans préfixe `data:`). Renvoie `null` si le blob n'existe pas
 * (cas : storage_path présent en DB mais blob jamais uploadé).
 */
export async function downloadDocBlob(path: string): Promise<string | null> {
  const { data, error } = await client().storage.from(BUCKET).download(path)
  if (error) {
    // 404 → blob absent (sera traité comme orphelin par l'appelant)
    const msg = (error as { message?: string }).message || ''
    if (msg.toLowerCase().includes('not found') || msg.includes('404')) return null
    throw new Error(`Storage download (${path}): ${msg}`)
  }
  if (!data) return null
  return blobToBase64(data)
}

/**
 * Supprime un blob de Storage. Best-effort : un échec ne casse pas le delete
 * local. Les erreurs sont loggées pour cleanup ultérieur si nécessaire.
 */
export async function deleteDocBlob(path: string): Promise<void> {
  const { error } = await client().storage.from(BUCKET).remove([path])
  if (error) {
    console.warn(`[Storage] delete failed (${path}):`, error.message)
  }
}

/**
 * Suppression batch (pour la cleanup d'un bilan entier ou d'un patient).
 */
export async function deleteDocBlobs(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await client().storage.from(BUCKET).remove(paths)
  if (error) {
    console.warn(`[Storage] batch delete failed (${paths.length} files):`, error.message)
  }
}
