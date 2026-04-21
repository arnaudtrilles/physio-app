import type { BanqueExerciceEntry } from '../types'

const STORAGE_KEY = 'physio_banque_exercices'

// ── Fingerprint (déduplication) ───────────────────────────────────────────────
// Normalise le texte : minuscules, sans accents, sans ponctuation, sans espaces multiples
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Hash djb2 simple — suffisant pour détecter les doublons exacts
function hashString(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i)
    h = h >>> 0  // uint32
  }
  return h.toString(36)
}

export function fingerprintExercice(name: string, markdown: string): string {
  return hashString(normalize(name) + '||' + normalize(markdown.slice(0, 300)))
}

// ── Persistence ───────────────────────────────────────────────────────────────
export function loadBanque(): BanqueExerciceEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveBanque(entries: BanqueExerciceEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage full
  }
}

// ── Ajout avec déduplication ──────────────────────────────────────────────────
// Retourne true si ajouté, false si doublon détecté
export function addToBanque(
  entry: Omit<BanqueExerciceEntry, 'id' | 'usageCount'>,
  banque: BanqueExerciceEntry[]
): { banque: BanqueExerciceEntry[]; added: boolean } {
  const id = fingerprintExercice(entry.name, entry.markdown)
  const existing = banque.find(e => e.id === id)
  if (existing) {
    // Doublon : incrémenter usageCount seulement
    const updated = banque.map(e =>
      e.id === id ? { ...e, usageCount: e.usageCount + 1 } : e
    )
    saveBanque(updated)
    return { banque: updated, added: false }
  }
  const newEntry: BanqueExerciceEntry = { ...entry, id, usageCount: 1 }
  const updated = [newEntry, ...banque]
  saveBanque(updated)
  return { banque: updated, added: true }
}

// ── Extraction des exercices individuels depuis un markdown de fiche ──────────
// Le markdown suit la structure : "#### N. Nom de l'exercice" pour chaque exercice
export function extractExercicesFromFiche(
  ficheMarkdown: string,
  zone: string,
  source: 'ia' | 'manuel'
): Omit<BanqueExerciceEntry, 'id' | 'usageCount'>[] {
  const lines = ficheMarkdown.split('\n')
  const exercices: Omit<BanqueExerciceEntry, 'id' | 'usageCount'>[] = []
  let currentName = ''
  let currentLines: string[] = []

  const pushCurrent = () => {
    if (!currentName || currentLines.length === 0) return
    const markdown = currentLines.join('\n').trim()
    if (markdown.length < 20) return
    exercices.push({
      name: currentName,
      zone,
      markdown,
      source,
      createdAt: new Date().toISOString(),
    })
  }

  for (const line of lines) {
    // Détecte "#### 1. Nom exercice" ou "#### Nom exercice"
    const match = line.match(/^####\s+(?:\d+\.\s+)?(.+)/)
    if (match) {
      pushCurrent()
      currentName = match[1].trim()
      currentLines = [`#### ${currentName}`]
    } else if (currentName) {
      // Stopper à la prochaine section ### ou ---
      if (line.startsWith('### ')) {
        pushCurrent()
        currentName = ''
        currentLines = []
      } else {
        currentLines.push(line)
      }
    }
  }
  pushCurrent()

  return exercices
}

// ── Fusion de deux banques (merge Arnaud + Elyes) ─────────────────────────────
// Les doublons sont détectés par fingerprint ; en cas de doublon on garde le plus utilisé
export function mergeBanques(
  banqueA: BanqueExerciceEntry[],
  banqueB: BanqueExerciceEntry[]
): BanqueExerciceEntry[] {
  const map = new Map<string, BanqueExerciceEntry>()
  for (const e of banqueA) map.set(e.id, e)
  for (const e of banqueB) {
    const existing = map.get(e.id)
    if (existing) {
      // Garder le plus récent, cumuler les usages
      map.set(e.id, {
        ...existing,
        usageCount: existing.usageCount + e.usageCount,
        createdAt: existing.createdAt < e.createdAt ? existing.createdAt : e.createdAt,
      })
    } else {
      map.set(e.id, e)
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

// ── Export / Import JSON ───────────────────────────────────────────────────────
export function exportBanqueJSON(banque: BanqueExerciceEntry[]): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), banque }, null, 2)
}

export function importBanqueJSON(raw: string): BanqueExerciceEntry[] | null {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed          // format legacy sans wrapper
    if (Array.isArray(parsed?.banque)) return parsed.banque
    return null
  } catch {
    return null
  }
}
