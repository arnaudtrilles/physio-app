import { useState } from 'react'
import { QuestionnaireModal } from './QuestionnaireModal'
import { QUESTIONNAIRES } from './configs'
import type { ComputeResult } from './types'

export interface StoredResult {
  display?: string
  interpretation?: string
  subscores?: Record<string, number | string>
  color?: 'green' | 'orange' | 'red' | 'gray'
}

export interface QuestionnaireOpener {
  open: (questionnaireId: string, scoreKey: string) => void
  modal: React.ReactNode
  results: Record<string, StoredResult>
  setResults: (r: Record<string, StoredResult>) => void
  /** Get rich result for a given score key (or live-recompute from stored answers) */
  getResult: (scoreKey: string, questionnaireId: string) => StoredResult | undefined
}

export function useQuestionnaires(
  updateScore: (key: string, value: string) => void,
  storedAnswers: Record<string, Record<string, unknown>>,
  setStoredAnswers: (a: Record<string, Record<string, unknown>>) => void,
  storedResults: Record<string, StoredResult>,
  setStoredResults: (r: Record<string, StoredResult>) => void,
): QuestionnaireOpener {
  const [active, setActive] = useState<{ questionnaireId: string; scoreKey: string } | null>(null)

  const open = (questionnaireId: string, scoreKey: string) => {
    setActive({ questionnaireId, scoreKey })
  }

  const handleValidate = (result: ComputeResult, rawAnswers: Record<string, unknown>) => {
    if (!active) return
    updateScore(active.scoreKey, String(result.value))
    setStoredAnswers({ ...storedAnswers, [active.questionnaireId]: rawAnswers })
    setStoredResults({
      ...storedResults,
      [active.scoreKey]: {
        display: result.display,
        interpretation: result.interpretation,
        subscores: result.subscores,
        color: result.color,
      },
    })
    setActive(null)
  }

  const getResult = (scoreKey: string, questionnaireId: string): StoredResult | undefined => {
    // Prefer stored result; otherwise recompute live from stored raw answers if available
    if (storedResults[scoreKey]) return storedResults[scoreKey]
    const answers = storedAnswers[questionnaireId]
    const cfg = QUESTIONNAIRES[questionnaireId]
    if (answers && cfg) {
      try {
        const r = cfg.compute(answers)
        return { display: r.display, interpretation: r.interpretation, subscores: r.subscores, color: r.color }
      } catch {
        return undefined
      }
    }
    return undefined
  }

  const modal = active && QUESTIONNAIRES[active.questionnaireId] ? (
    <QuestionnaireModal
      questionnaire={QUESTIONNAIRES[active.questionnaireId]}
      initialAnswers={storedAnswers[active.questionnaireId]}
      onClose={() => setActive(null)}
      onValidate={handleValidate}
    />
  ) : null

  return { open, modal, results: storedResults, setResults: setStoredResults, getResult }
}
