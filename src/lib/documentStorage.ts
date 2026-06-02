/**
 * Supabase Storage layer pour les blobs binaires des documents patients.
 *
 * Bucket : `patient-docs` (privé, RLS basé sur le user_id en 1er segment du path).
 * Path scheme : `{userId}/{scope}/{slug}-{hash(stableId)}.{ext}` — le hash est
 * DÉTERMINISTE (dérivé de l'identité stable du doc), pas aléatoire : deux appels
 * pour le même doc produisent le même path, donc un ré-upload écrase le même blob
 * (upsert) au lieu de créer un orphelin. C'est ce qui rend les documents
 * récupérables et empêche l'accumulation de blobs fantômes dans Storage.
 *
 * Préserve l'isolation per-practitioner via RLS et permet le cleanup par dossier.
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

/**
 * Hash DÉTERMINISTE (FNV-1a 32-bit) → base36. Même entrée → même sortie,
 * sans aléatoire. Sert à construire des paths Storage reconstructibles depuis
 * l'identité stable d'un document : si le `storagePath` est perdu (race de
 * persistance, éviction locale), on recalcule exactement le même path et un
 * ré-upload écrase le même blob au lieu d'en créer un orphelin.
 */
function stableHash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/**
 * Construit un path Storage DÉTERMINISTE pour un blob.
 * @param userId UUID du practitioner (1er segment, requis par RLS)
 * @param scope 'bilan-{id}' | 'patient-doc' — sous-dossier logique
 * @param stableId Identité stable du doc (id pour patient-doc ;
 *                 `{bilanId}|{name}|{addedAt}` pour un doc de bilan).
 *                 Garantit qu'un même doc retombe toujours sur le même path.
 * @param fileName Nom d'origine — sert au slug lisible
 * @param mimeType Pour l'extension finale
 */
export function buildStoragePath(
  userId: string,
  scope: string,
  stableId: string,
  fileName: string,
  mimeType: string,
): string {
  const safeScope = slug(scope) || 'doc'
  const safeName = slug(fileName.replace(/\.[^.]+$/, ''))
  const ext = extFromMime(mimeType)
  return `${userId}/${safeScope}/${safeName}-${stableHash(stableId)}.${ext}`
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

/**
 * Upload AVEC retry (backoff linéaire). Lève si toutes les tentatives échouent —
 * l'appelant NE DOIT PAS écrire `storage_path` quand ça lève, sinon la métadonnée
 * prétend qu'un blob existe alors qu'il n'a jamais atterri (→ "introuvable" ailleurs).
 */
export async function uploadDocBlobWithRetry(
  path: string,
  base64OrDataUrl: string,
  mimeType: string,
  attempts = 3,
): Promise<string> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await uploadDocBlob(path, base64OrDataUrl, mimeType)
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, 400 * (i + 1)))
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`Storage upload échoué après ${attempts} tentatives (${path})`)
}

export type BlobStatus = 'present' | 'absent' | 'unknown'

/**
 * État d'un blob en TRI-ÉTAT (via `list` + filtre exact sur le nom de fichier),
 * sans le télécharger. Distinction cruciale pour ne JAMAIS supprimer un document
 * sur la base d'une simple panne réseau :
 * - 'present' : le blob existe (vérifié).
 * - 'absent'  : le listing a réussi et le fichier n'y figure pas → vraiment absent.
 * - 'unknown' : impossible de vérifier (réseau/erreur) → ne rien supprimer.
 */
export async function docBlobStatus(path: string): Promise<BlobStatus> {
  const lastSlash = path.lastIndexOf('/')
  const folder = lastSlash >= 0 ? path.slice(0, lastSlash) : ''
  const fileName = lastSlash >= 0 ? path.slice(lastSlash + 1) : path
  try {
    const { data, error } = await client().storage
      .from(BUCKET)
      .list(folder, { search: fileName, limit: 100 })
    if (error) return 'unknown'
    return (data || []).some(f => f.name === fileName) ? 'present' : 'absent'
  } catch {
    return 'unknown'
  }
}

/**
 * Référence stable d'un document irrécupérable (pour suppression ciblée).
 * - patient : identifié par `docId`.
 * - bilan   : identifié par (`bilanId`, `name`, `addedAt`).
 */
export interface LostDocRef {
  kind: 'patient' | 'bilan'
  name: string
  docId?: string
  bilanId?: number
  addedAt?: string
}

/**
 * Bilan d'une passe de réconciliation documents (blob↔métadonnée).
 * - `uploaded`   : blobs (ré-)uploadés avec succès depuis la copie locale.
 * - `failed`     : copie locale présente mais upload KO → réessayer plus tard (récupérable).
 * - `unverified` : blob non vérifiable (réseau) ET pas de copie locale → conservés par prudence.
 * - `lost`       : blob confirmé absent ET aucune copie locale → définitivement perdus (supprimables).
 */
export interface DocReconcileResult {
  checked: number
  uploaded: number
  failed: number
  unverified: number
  lost: LostDocRef[]
}
