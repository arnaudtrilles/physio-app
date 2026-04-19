// ─── Question types ────────────────────────────────────────────────────────
export type QuestionType = 'radio' | 'likert' | 'slider' | 'yesno' | 'number' | 'text' | 'select'

export interface QuestionOption {
  label: string
  value: number
}

export interface Question {
  id: string
  label: string
  type: QuestionType
  options?: QuestionOption[]    // for radio / select
  min?: number                   // for slider / number
  max?: number
  step?: number
  labelMin?: string              // for slider (e.g. "Pas de douleur")
  labelMax?: string              // for slider (e.g. "Douleur max")
  section?: string               // groups questions into subsections
  sectionLabel?: string          // full label for the section header
  help?: string                  // help text below the question
  conditional?: { dependsOn: string; equals: unknown } // show only if condition met
  optional?: boolean
  naAllowed?: boolean            // allow "Non applicable" (excluded from scoring)
  placeholder?: string
}

export interface ComputeResult {
  value: string | number          // the final value written into the score field
  display: string                 // human-readable summary for the modal
  subscores?: Record<string, number | string>
  interpretation?: string
  color?: 'green' | 'orange' | 'red' | 'gray'
}

export interface Questionnaire {
  id: string
  title: string
  short: string                   // short label for the button badge
  period?: string                 // e.g. "4 dernières semaines"
  instructions?: string
  questions: Question[]
  compute: (answers: Record<string, unknown>) => ComputeResult
}
