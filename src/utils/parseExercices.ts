import type { ExerciceBankEntry } from '../types'

// Normalise le nom pour dédupliquer (lowercase, sans accents, trimmé)
function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface ParsedExercice {
  nom: string
  objectif: string
  positionDepart: string
  mouvement: string
  dosage: string
  limiteSecurite: string
}

// Extrait les exercices depuis le markdown généré par l'IA
export function parseExercicesFromMarkdown(markdown: string): ParsedExercice[] {
  const results: ParsedExercice[] = []
  // Split par #### (chaque exercice commence par #### 1. Nom, #### 2. Nom...)
  const blocks = markdown.split(/\n####\s+/).slice(1)

  for (const block of blocks) {
    const lines = block.split('\n')
    // Première ligne = nom (enlever le "1. ", "2. " au début)
    const rawName = lines[0].trim().replace(/^\d+\.\s*/, '')
    if (!rawName) continue

    // Récupérer les champs par regex sur le bloc
    const getField = (labels: string[]): string => {
      for (const label of labels) {
        const re = new RegExp(`-\\s*\\*\\*${label}\\s*:?\\*\\*\\s*:?\\s*([^\\n]+)`, 'i')
        const match = block.match(re)
        if (match) return match[1].trim()
      }
      return ''
    }

    // Récupérer les étapes du mouvement (lignes commençant par > )
    const mouvementLines: string[] = []
    let inMouvement = false
    for (const line of lines) {
      if (/-\s*\*\*Mouvement/i.test(line) || /-\s*\*\*Le mouvement/i.test(line)) {
        inMouvement = true
        continue
      }
      if (inMouvement) {
        const m = line.match(/^\s*>\s*(.+)$/)
        if (m) mouvementLines.push(m[1].trim())
        else if (line.trim().startsWith('-')) break  // fin du mouvement
      }
    }

    results.push({
      nom: rawName,
      objectif: getField(['L\'objectif', 'Objectif']),
      positionDepart: getField(['Position de départ']),
      mouvement: mouvementLines.join(' → '),
      dosage: getField(['Votre Dosage', 'Dosage']),
      limiteSecurite: getField(['Consigne de sécurité', 'Limite de sécurité']),
    })
  }

  return results
}

// Ajoute des exercices à la banque avec déduplication
export function addExercicesToBank(
  existingBank: ExerciceBankEntry[],
  parsed: ParsedExercice[],
  zone: string,
  bilanType: string,
): ExerciceBankEntry[] {
  const now = new Date().toISOString()
  const byId = new Map(existingBank.map(e => [e.id, e]))

  for (const ex of parsed) {
    const id = normalizeName(ex.nom)
    if (!id) continue
    const existing = byId.get(id)
    if (existing) {
      // Incrémente le compteur et met à jour la dernière utilisation
      byId.set(id, { ...existing, lastSeenAt: now, occurrences: existing.occurrences + 1 })
    } else {
      byId.set(id, {
        id,
        nom: ex.nom,
        zone,
        bilanType,
        objectif: ex.objectif,
        positionDepart: ex.positionDepart,
        mouvement: ex.mouvement,
        dosage: ex.dosage,
        limiteSecurite: ex.limiteSecurite,
        firstSeenAt: now,
        lastSeenAt: now,
        occurrences: 1,
      })
    }
  }

  return Array.from(byId.values())
}

// Exporte la banque en CSV (compatible Excel)
export function exportBankAsCSV(bank: ExerciceBankEntry[]): string {
  const escape = (v: string): string => {
    // Échapper les " en "" et entourer de guillemets si contient ; , " ou \n
    const s = String(v ?? '').replace(/"/g, '""')
    if (/[;,"\n]/.test(s)) return `"${s}"`
    return s
  }

  const headers = [
    'ID', 'Nom', 'Zone', 'Type bilan', 'Objectif', 'Position de départ',
    'Mouvement', 'Dosage', 'Limite de sécurité', 'Première occurrence',
    'Dernière occurrence', 'Nombre d\'utilisations',
  ]

  const rows = bank.map(e => [
    e.id, e.nom, e.zone, e.bilanType, e.objectif, e.positionDepart,
    e.mouvement, e.dosage, e.limiteSecurite,
    new Date(e.firstSeenAt).toLocaleDateString('fr-FR'),
    new Date(e.lastSeenAt).toLocaleDateString('fr-FR'),
    String(e.occurrences),
  ].map(escape).join(';'))

  // BOM UTF-8 pour Excel
  return '\uFEFF' + [headers.join(';'), ...rows].join('\n')
}
