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
  ficheExercice: z.object({
    generatedAt: z.string(),
    markdown: z.string(),
    notesSeance: z.string(),
  }).optional(),
})

// ── Claude mini-analyse response ───────────────────────────────────────────
export const analyseSeanceMiniSchema = z.object({
  resume: z.string(),
  evolution: z.string().optional().default(''),
  vigilance: z.array(z.string()).optional().default([]),
  focus: z.string().optional().default(''),
  conseil: z.string().optional().default(''),
})

// ── Backup import validation ───────────────────────────────────────────────
// Données de santé importées d'un fichier utilisateur → on valide AU MINIMUM
// les champs d'identité par lesquels l'app indexe/dédoublonne (id, patientKey).
// Avant, ces tableaux n'étaient validés que comme `record(unknown)` : un fichier
// corrompu (id manquant, patientKey du mauvais type) passait et corrompait
// silencieusement l'IndexedDB. `.passthrough()` garantit qu'aucun autre champ
// n'est ni rejeté ni supprimé — on ne durcit que le socle d'identité.
const intermediaireImportSchema = z.object({
  id: z.number(),
  patientKey: z.string(),
}).passthrough()

const noteImportSchema = z.object({
  id: z.number(),
  patientKey: z.string(),
  data: z.object({}).passthrough(), // `note.data.*` est accédé sans garde au render
}).passthrough()

const objectifImportSchema = z.object({
  id: z.number(),
  patientKey: z.string(),
}).passthrough()

const exerciceBankImportSchema = z.object({
  id: z.string(),
}).passthrough()

const patientDocImportSchema = z.object({
  id: z.string(),
  patientKey: z.string(),
}).passthrough()

const prescriptionImportSchema = z.object({
  patientKey: z.string(),
}).passthrough()

const profileImportSchema = z.object({
  nom: z.string(),
  prenom: z.string(),
}).passthrough()

export const backupSchema = z.object({
  db: z.array(bilanRecordSchema),
  dbIntermediaires: z.array(intermediaireImportSchema).optional(),
  dbNotes: z.array(noteImportSchema).optional(),
  dbObjectifs: z.array(objectifImportSchema).optional(),
  dbExerciceBank: z.array(exerciceBankImportSchema).optional(),
  dbPatientDocs: z.array(patientDocImportSchema).optional(),
  dbPrescriptions: z.array(prescriptionImportSchema).optional(),
  profile: profileImportSchema.optional(),
  exportedAt: z.string().optional(),
})

// ── Helper ─────────────────────────────────────────────────────────────────
export function isValidFrenchDate(val: string): boolean {
  return frenchDateSchema.safeParse(val).success
}
