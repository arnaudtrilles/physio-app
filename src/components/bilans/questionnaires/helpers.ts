import type { Question, QuestionOption } from './types'

// ─── Reusable option sets ──────────────────────────────────────────────────
export const opts5 = (labels: string[], scores: number[]): QuestionOption[] =>
  labels.map((l, i) => ({ label: l, value: scores[i] }))

// OSS / Oxford Hip (5 options, 4→0)
export const optsOxford = (labels: string[]): QuestionOption[] =>
  labels.map((l, i) => ({ label: l, value: 4 - i }))

// HOOS/KOOS frequency (0 = never, 4 = always) — higher = worse
export const optsFreq = (): QuestionOption[] => [
  { label: 'Jamais', value: 0 },
  { label: 'Rarement', value: 1 },
  { label: 'Parfois', value: 2 },
  { label: 'Souvent', value: 3 },
  { label: 'Toujours', value: 4 },
]

// HOOS/KOOS severity (0 = absente, 4 = extrême)
export const optsSeverity = (): QuestionOption[] => [
  { label: 'Absente', value: 0 },
  { label: 'Légère', value: 1 },
  { label: 'Modérée', value: 2 },
  { label: 'Forte', value: 3 },
  { label: 'Extrême', value: 4 },
]

// HOOS/KOOS quality-of-life 4th question
export const optsQoL = (): QuestionOption[] => [
  { label: 'Pas du tout', value: 0 },
  { label: 'Un peu', value: 1 },
  { label: 'Modérément', value: 2 },
  { label: 'Beaucoup', value: 3 },
  { label: 'Totalement', value: 4 },
]

// HOOS/KOOS frequency-month scale (for "pensez-vous à votre problème ?")
export const optsFreqMonth = (): QuestionOption[] => [
  { label: 'Jamais', value: 0 },
  { label: '1× / mois', value: 1 },
  { label: '1× / semaine', value: 2 },
  { label: 'Tous les jours', value: 3 },
  { label: 'Tout le temps', value: 4 },
]

// Yes/No
export const optsYesNo: QuestionOption[] = [
  { label: 'Non', value: 0 },
  { label: 'Oui', value: 1 },
]

// DASH difficulty (1 = none, 5 = impossible)
export const optsDashDiff: QuestionOption[] = [
  { label: 'Aucune difficulté', value: 1 },
  { label: 'Légère', value: 2 },
  { label: 'Moyenne', value: 3 },
  { label: 'Sévère', value: 4 },
  { label: 'Impossible', value: 5 },
]

// ─── Generic scoring helpers ───────────────────────────────────────────────
export const sumAnswers = (answers: Record<string, unknown>, ids: string[]): number => {
  let total = 0
  for (const id of ids) {
    const v = answers[id]
    if (typeof v === 'number') total += v
  }
  return total
}

export const countAnswered = (answers: Record<string, unknown>, ids: string[]): number =>
  ids.filter(id => typeof answers[id] === 'number').length

export const interpret = (value: number, thresholds: Array<[number, string, 'green' | 'orange' | 'red' | 'gray']>): { text: string; color: 'green' | 'orange' | 'red' | 'gray' } => {
  for (const [t, text, color] of thresholds) {
    if (value <= t) return { text, color }
  }
  const last = thresholds[thresholds.length - 1]
  return { text: last[1], color: last[2] }
}

// Generate a simple likert question helper
export const q = (id: string, label: string, options: QuestionOption[], extras: Partial<Question> = {}): Question => ({
  id, label, type: 'radio', options, ...extras,
})

export const slider = (id: string, label: string, max = 10, extras: Partial<Question> = {}): Question => ({
  id, label, type: 'slider', min: 0, max, step: 1, ...extras,
})

export const yesNo = (id: string, label: string, extras: Partial<Question> = {}): Question => ({
  id, label, type: 'yesno', options: optsYesNo, ...extras,
})
