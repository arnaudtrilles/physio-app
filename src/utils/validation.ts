import { z } from 'zod'

// ── Date validation ────────────────────────────────────────────────────────
const frenchDateRegex = /^\d{2}\/\d{2}\/\d{4}$/
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/

export const frenchDateSchema = z.string().refine(
  (val) => {
    if (!frenchDateRegex.test(val)) return false
    const [d, m, y] = val.split('/').map(Number)
    const date = new Date(y, m - 1, d)
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
  },
  { message: 'Date invalide (format attendu: JJ/MM/AAAA)' }
)

export const dateStringSchema = z.string().refine(
  (val) => {
    if (frenchDateRegex.test(val)) {
      const [d, m, y] = val.split('/').map(Number)
      const date = new Date(y, m - 1, d)
      return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
    }
    if (isoDateRegex.test(val)) {
      const date = new Date(val)
      return !isNaN(date.getTime())
    }
    return false
  },
  { message: 'Date invalide (JJ/MM/AAAA ou AAAA-MM-JJ)' }
)

// ── Bilan Record (import validation) ───────────────────────────────────────
export const bilanRecordSchema = z.object({
  id: z.number(),
  nom: z.string(),
  prenom: z.string(),
  dateBilan: z.string(),
  dateNaissance: z.string(),
  zoneCount: z.number(),
  evn: z.number().optional(),
  zone: z.string().optional(),
  pathologie: z.string().optional(),
  avatarBg: z.string().optional(),
  status: z.enum(['incomplet', 'complet']).optional(),
  customLabel: z.string().optional(),
  bilanType: z.enum(['epaule', 'cheville', 'genou', 'hanche', 'cervical', 'lombaire', 'generique', 'geriatrique']).optional(),
  bilanData: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().optional(),
  silhouetteData: z.record(z.string(), z.unknown()).optional(),
  documents: z.array(z.object({
    name: z.string(),
    mimeType: z.string(),
    data: z.string(),
    addedAt: z.string(),
  })).optional(),
  analyseIA: z.object({
    generatedAt: z.string(),
    diagnostic: z.object({ titre: z.string(), description: z.string() }),
    hypotheses: z.array(z.object({ rang: z.number(), titre: z.string(), probabilite: z.number(), justification: z.string() })),
    priseEnCharge: z.array(z.object({ phase: z.string(), titre: z.string(), detail: z.string(), points: z.array(z.string()).optional() })),
    alertes: z.array(z.string()),
  }).optional(),
  ficheExercice: z.object({
    generatedAt: z.string(),
    markdown: z.string(),
    notesSeance: z.string(),
  }).optional(),
})

// ── Gemini mini-analyse response ───────────────────────────────────────────
export const analyseSeanceMiniSchema = z.object({
  resume: z.string(),
  evolution: z.string().optional().default(''),
  vigilance: z.array(z.string()).optional().default([]),
  focus: z.string().optional().default(''),
  conseil: z.string().optional().default(''),
})

// ── Backup import validation ───────────────────────────────────────────────
export const backupSchema = z.object({
  db: z.array(bilanRecordSchema),
  dbIntermediaires: z.array(z.record(z.string(), z.unknown())).optional(),
  dbNotes: z.array(z.record(z.string(), z.unknown())).optional(),
  dbObjectifs: z.array(z.record(z.string(), z.unknown())).optional(),
  dbExerciceBank: z.array(z.record(z.string(), z.unknown())).optional(),
  dbPatientDocs: z.array(z.record(z.string(), z.unknown())).optional(),
  dbPrescriptions: z.array(z.record(z.string(), z.unknown())).optional(),
  profile: z.record(z.string(), z.unknown()).optional(),
  exportedAt: z.string().optional(),
})

// ── Helper ─────────────────────────────────────────────────────────────────
export function isValidFrenchDate(val: string): boolean {
  return frenchDateSchema.safeParse(val).success
}
