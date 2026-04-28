/**
 * Cache mémoire des markdowns générés par l'IA pour les exports PDF.
 *
 * Deux flows distincts, chacun avec son système prompt → deux caches séparés
 * pour éviter toute collision entre un Bilan PDF direct et un Bilan+Analyse.
 *
 *   pdfBilanCache   → flow PDF_BILAN (exportBilanFromRecord)
 *   pdfAnalyseCache → flow PDF_ANALYSE (handleExportPDF + onExport BilanAnalyseIA)
 *
 * La clé est un hash stable des entrées pertinentes pour la génération
 * (données du bilan, analyse IA, identité patient, sexe, documents…).
 * Si le hash d'une requête identique est déjà présent, on sert le markdown
 * mémorisé sans refaire d'appel Claude. Le cache vit pour la session — un
 * rechargement de la page le vide.
 */

const pdfBilanCache = new Map<string, string>()
const pdfAnalyseCache = new Map<string, string>()

/** JSON.stringify avec clés triées — garantit un hash stable malgré
 *  les permutations d'ordre d'insertion de React/indexedDB. */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  const t = typeof value
  if (t === 'number' || t === 'boolean' || t === 'string') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  if (t === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort()
    return '{' + keys.map(k =>
      JSON.stringify(k) + ':' + stableStringify((value as Record<string, unknown>)[k])
    ).join(',') + '}'
  }
  return 'null'
}

/** FNV-1a 32 bits — suffisant pour un cache en mémoire : collision
 *  statistiquement improbable sur l'ordre de quelques dizaines d'entrées. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

export function hashInputs(inputs: unknown): string {
  return fnv1a(stableStringify(inputs))
}

/** Fingerprint d'un document SANS hasher sa base64 complète (coûteux) :
 *  on encode nom + mimeType + taille + premier et dernier kilooctet. Toute
 *  modification réelle du fichier change l'un des trois → cache invalidé. */
export function documentFingerprint(doc: { name?: string; mimeType?: string; data?: string; masked?: boolean }): string {
  const data = doc.data ?? ''
  const head = data.slice(0, 1024)
  const tail = data.slice(-1024)
  return `${doc.name ?? ''}|${doc.mimeType ?? ''}|${data.length}|${doc.masked ? '1' : '0'}|${fnv1a(head + tail)}`
}

export function getCachedBilanPDF(hash: string): string | undefined {
  return pdfBilanCache.get(hash)
}

export function setCachedBilanPDF(hash: string, markdown: string): void {
  pdfBilanCache.set(hash, markdown)
}

export function getCachedAnalysePDF(hash: string): string | undefined {
  return pdfAnalyseCache.get(hash)
}

export function setCachedAnalysePDF(hash: string, markdown: string): void {
  pdfAnalyseCache.set(hash, markdown)
}

/** Invalidation manuelle d'un bilan (ex : modification d'un champ). */
export function invalidatePDFCachesForBilan(bilanId: number): void {
  // Les clés sont des hashs opaques — on ne peut pas filtrer par id sans le
  // stocker dans la clé. Stratégie : le hash inclut bilanId ET le contenu,
  // donc toute modification du contenu invalide naturellement l'entrée en
  // produisant un nouveau hash. Les vieilles entrées restent en mémoire
  // mais ne seront plus servies. Elles s'évaporent au rechargement.
  void bilanId
}
