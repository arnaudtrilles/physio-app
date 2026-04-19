import { useState, useMemo } from 'react'
import type { Question, Questionnaire, ComputeResult } from './types'

interface Props {
  questionnaire: Questionnaire
  initialAnswers?: Record<string, unknown>
  onClose: () => void
  onValidate: (result: ComputeResult, rawAnswers: Record<string, unknown>) => void
}

export function QuestionnaireModal({ questionnaire, initialAnswers, onClose, onValidate }: Props) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers ?? {})

  const setAnswer = (id: string, value: unknown) => setAnswers(p => ({ ...p, [id]: value }))

  // Live computation
  const result = useMemo(() => {
    try {
      return questionnaire.compute(answers)
    } catch {
      return null
    }
  }, [questionnaire, answers])

  // Group questions by section
  const sections = useMemo(() => {
    const groups: Array<{ key: string; label: string; qs: Question[] }> = []
    const map = new Map<string, { key: string; label: string; qs: Question[] }>()
    for (const qu of questionnaire.questions) {
      const secKey = qu.section ?? '_default'
      const secLabel = qu.sectionLabel ?? (qu.section ? qu.section : '')
      if (!map.has(secKey)) {
        const g = { key: secKey, label: secLabel, qs: [] as Question[] }
        map.set(secKey, g)
        groups.push(g)
      }
      map.get(secKey)!.qs.push(qu)
    }
    return groups
  }, [questionnaire])

  // Conditional visibility
  const isVisible = (qu: Question): boolean => {
    if (!qu.conditional) return true
    const dep = answers[qu.conditional.dependsOn]
    return dep === qu.conditional.equals
  }

  const answeredCount = questionnaire.questions.filter(q => typeof answers[q.id] !== 'undefined').length
  const progress = Math.round((answeredCount / questionnaire.questions.length) * 100)

  const colorFor = (c?: string): string => c === 'green' ? '#059669' : c === 'orange' ? '#d97706' : c === 'red' ? '#dc2626' : 'var(--text-muted)'

  const inputBase: React.CSSProperties = {
    padding: '0.4rem 0.6rem', fontSize: '0.82rem',
    color: 'var(--text-main)', background: 'var(--secondary)',
    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
    outline: 'none', width: '100%',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 'var(--radius-xl)', width: '100%',
          maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.3)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1rem 1.2rem 0.8rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: 'var(--primary-dark)' }}>{questionnaire.title}</h3>
              {questionnaire.period && (
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Période : {questionnaire.period}</p>
              )}
              {questionnaire.instructions && (
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{questionnaire.instructions}</p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.3rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, lineHeight: 1 }}
              aria-label="Fermer"
            >×</button>
          </div>
          <div style={{ marginTop: 8, height: 4, background: 'var(--secondary)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.2s' }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {answeredCount} / {questionnaire.questions.length} répondues
          </div>
        </div>

        {/* Body (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.8rem 1.2rem' }}>
          {sections.map(section => (
            <div key={section.key}>
              {section.label && (
                <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '14px 0 8px', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                  {section.label}
                </h4>
              )}
              {section.qs.filter(isVisible).map(qu => {
                const val = answers[qu.id]
                return (
                  <div key={qu.id} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-main)', display: 'block', marginBottom: 6 }}>
                      {qu.label}
                      {qu.help && <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>{qu.help}</span>}
                    </label>

                    {(qu.type === 'radio' || qu.type === 'yesno') && qu.options && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {qu.options.map(opt => (
                          <button
                            key={String(opt.value) + opt.label}
                            onClick={() => setAnswer(qu.id, val === opt.value ? undefined : opt.value)}
                            className={`choix-btn${val === opt.value ? ' active' : ''}`}
                            style={{ fontSize: '0.78rem' }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {qu.type === 'slider' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="range"
                            min={qu.min ?? 0}
                            max={qu.max ?? 10}
                            step={qu.step ?? 1}
                            value={typeof val === 'number' ? val : qu.min ?? 0}
                            onChange={e => setAnswer(qu.id, Number(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {typeof val === 'number' ? val : '—'}
                          </span>
                        </div>
                        {(qu.labelMin || qu.labelMax) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            <span>{qu.labelMin ?? qu.min}</span>
                            <span>{qu.labelMax ?? qu.max}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {qu.type === 'number' && (
                      <input
                        type="number"
                        min={qu.min}
                        max={qu.max}
                        step={qu.step}
                        value={typeof val === 'number' ? val : ''}
                        onChange={e => setAnswer(qu.id, e.target.value === '' ? undefined : Number(e.target.value))}
                        placeholder={qu.placeholder}
                        style={inputBase}
                      />
                    )}

                    {qu.type === 'text' && (
                      <input
                        type="text"
                        value={typeof val === 'string' ? val : ''}
                        onChange={e => setAnswer(qu.id, e.target.value)}
                        placeholder={qu.placeholder}
                        style={inputBase}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer with live result */}
        <div style={{ padding: '0.9rem 1.2rem', borderTop: '1px solid var(--border-color)', background: 'var(--secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Score</div>
              {result && (
                <>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: colorFor(result.color), fontVariantNumeric: 'tabular-nums' }}>
                    {result.display}
                  </div>
                  {result.interpretation && (
                    <div style={{ fontSize: '0.75rem', color: colorFor(result.color), marginTop: 2 }}>{result.interpretation}</div>
                  )}
                  {result.subscores && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {Object.entries(result.subscores).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
            >
              Annuler
            </button>
            <button
              onClick={() => result && onValidate(result, answers)}
              disabled={!result}
              style={{ padding: '0.5rem 1.1rem', fontSize: '0.82rem', fontWeight: 600, color: 'white', background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-md)', cursor: result ? 'pointer' : 'not-allowed', opacity: result ? 1 : 0.5 }}
            >
              Valider et enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
