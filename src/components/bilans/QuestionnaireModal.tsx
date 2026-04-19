import { useState } from 'react'

export interface QuestionOption {
  label: string
  value: number
}

export interface Question {
  id: string
  text: string
  options: QuestionOption[]
}

interface QuestionnaireModalProps {
  title: string
  subtitle?: string
  questions: Question[]
  maxScore: number
  interpretation?: (score: number) => { label: string; color: string }
  initialAnswers?: Record<string, number>
  onValidate: (score: number, answers: Record<string, number>) => void
  onClose: () => void
}

export function QuestionnaireModal({
  title, subtitle, questions, maxScore, interpretation, initialAnswers = {}, onValidate, onClose,
}: QuestionnaireModalProps) {
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers)

  const answered = Object.keys(answers).length
  const total = questions.length
  const currentScore = Object.values(answers).reduce((s, v) => s + v, 0)
  const isComplete = answered === total

  const interp = isComplete && interpretation ? interpretation(currentScore) : null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 12, boxSizing: 'border-box',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440, maxHeight: '90vh',
          background: 'white', borderRadius: 14, boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 14px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: 'var(--secondary)', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Progress */}
        <div style={{
          padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10,
          background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexShrink: 0,
        }}>
          <div style={{ flex: 1, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(answered / total) * 100}%`, background: isComplete ? '#16a34a' : '#2563eb', transition: 'width 0.2s' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', minWidth: 40, textAlign: 'right' }}>
            {answered}/{total}
          </span>
        </div>

        {/* Questions */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {questions.map((q, idx) => (
            <div key={q.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: idx < questions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ fontSize: 12.5, color: '#0f172a', lineHeight: 1.4, marginBottom: 6, fontWeight: 500 }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700, marginRight: 6 }}>{idx + 1}.</span>
                {q.text}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {q.options.map(opt => {
                  const active = answers[q.id] === opt.value
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setAnswers(p => ({ ...p, [q.id]: opt.value }))}
                      style={{
                        padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${active ? '#2563eb' : 'var(--border-color)'}`,
                        background: active ? '#eff6ff' : 'white', color: active ? '#1e3a8a' : 'var(--text-main)',
                        fontSize: 11.5, fontWeight: active ? 700 : 500, cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 14px', borderTop: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: 'white',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: interp?.color ?? 'var(--primary-dark)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {currentScore} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>/ {maxScore}</span>
            </div>
            {interp && <div style={{ fontSize: 10.5, fontWeight: 600, color: interp.color, marginTop: 2 }}>{interp.label}</div>}
          </div>
          <button
            type="button"
            onClick={() => onValidate(currentScore, answers)}
            disabled={!isComplete}
            style={{
              padding: '8px 16px', borderRadius: 10, border: 'none',
              background: isComplete ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : 'var(--secondary)',
              color: isComplete ? 'white' : 'var(--text-muted)',
              fontSize: 13, fontWeight: 700, cursor: isComplete ? 'pointer' : 'not-allowed',
            }}
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Questionnaires définis ────────────────────────────────────────────────

// FES-I (16 items, 1-4 each → total 16-64)
const FES_I_OPTIONS: QuestionOption[] = [
  { label: '1 · Pas inquiet', value: 1 },
  { label: '2 · Un peu', value: 2 },
  { label: '3 · Assez', value: 3 },
  { label: '4 · Très inquiet', value: 4 },
]

export const FES_I_QUESTIONS: Question[] = [
  { id: 'q1', text: 'Nettoyer la maison (balayer, épousseter)', options: FES_I_OPTIONS },
  { id: 'q2', text: "S'habiller et se déshabiller", options: FES_I_OPTIONS },
  { id: 'q3', text: 'Préparer des repas simples', options: FES_I_OPTIONS },
  { id: 'q4', text: 'Prendre un bain ou une douche', options: FES_I_OPTIONS },
  { id: 'q5', text: 'Aller faire des courses', options: FES_I_OPTIONS },
  { id: 'q6', text: "Se lever ou s'asseoir sur une chaise", options: FES_I_OPTIONS },
  { id: 'q7', text: 'Monter ou descendre les escaliers', options: FES_I_OPTIONS },
  { id: 'q8', text: 'Marcher dehors dans le voisinage', options: FES_I_OPTIONS },
  { id: 'q9', text: 'Attraper un objet en hauteur ou au sol', options: FES_I_OPTIONS },
  { id: 'q10', text: 'Aller répondre au téléphone avant qu\'il ne s\'arrête', options: FES_I_OPTIONS },
  { id: 'q11', text: 'Marcher sur une surface glissante', options: FES_I_OPTIONS },
  { id: 'q12', text: 'Rendre visite à un ami ou à la famille', options: FES_I_OPTIONS },
  { id: 'q13', text: 'Marcher dans la foule', options: FES_I_OPTIONS },
  { id: 'q14', text: 'Marcher sur une surface inégale (pavés…)', options: FES_I_OPTIONS },
  { id: 'q15', text: 'Monter ou descendre une pente', options: FES_I_OPTIONS },
  { id: 'q16', text: 'Sortir à une fête / mariage / réunion', options: FES_I_OPTIONS },
]

export function interpretFesI(score: number): { label: string; color: string } {
  if (score <= 22) return { label: 'Peur faible', color: '#166534' }
  if (score <= 31) return { label: 'Peur modérée', color: '#f59e0b' }
  return { label: 'Peur élevée — risque de chute', color: '#881337' }
}

// Mini GDS (4 items, oui/non)
const GDS_OPTIONS: QuestionOption[] = [
  { label: 'Oui (1)', value: 1 },
  { label: 'Non (0)', value: 0 },
]
const GDS_OPTIONS_INV: QuestionOption[] = [
  { label: 'Oui (0)', value: 0 },
  { label: 'Non (1)', value: 1 },
]

export const MINI_GDS_QUESTIONS: Question[] = [
  { id: 'q1', text: "Vous sentez-vous souvent découragé(e) et triste ?", options: GDS_OPTIONS },
  { id: 'q2', text: "Avez-vous le sentiment que votre vie est vide ?", options: GDS_OPTIONS },
  { id: 'q3', text: "Êtes-vous heureux(se) la plupart du temps ?", options: GDS_OPTIONS_INV },
  { id: 'q4', text: "Avez-vous l'impression que votre situation est désespérée ?", options: GDS_OPTIONS },
]

export function interpretMiniGds(score: number): { label: string; color: string } {
  if (score === 0) return { label: 'Pas de dépression suspectée', color: '#166534' }
  return { label: 'Forte probabilité de dépression', color: '#881337' }
}

// Tinetti (16 items : 9 équilibre + 7 marche, max 28)
export const TINETTI_BALANCE_QUESTIONS: Question[] = [
  { id: 'b1', text: 'Équilibre assis (solide / glisse)', options: [
    { label: 'Glisse (0)', value: 0 }, { label: 'Stable (1)', value: 1 },
  ]},
  { id: 'b2', text: 'Lever de chaise', options: [
    { label: 'Incapable (0)', value: 0 }, { label: 'Utilise les bras (1)', value: 1 }, { label: 'Sans les bras (2)', value: 2 },
  ]},
  { id: 'b3', text: 'Tentatives pour se lever', options: [
    { label: 'Incapable (0)', value: 0 }, { label: '> 1 tentative (1)', value: 1 }, { label: '1 seule (2)', value: 2 },
  ]},
  { id: 'b4', text: 'Équilibre debout immédiat (5 sec)', options: [
    { label: 'Instable (0)', value: 0 }, { label: 'Stable avec appui (1)', value: 1 }, { label: 'Stable sans appui (2)', value: 2 },
  ]},
  { id: 'b5', text: 'Équilibre debout prolongé', options: [
    { label: 'Instable (0)', value: 0 }, { label: 'Appui large / appui (1)', value: 1 }, { label: 'Pieds rapprochés sans appui (2)', value: 2 },
  ]},
  { id: 'b6', text: 'Épreuve de poussée (yeux ouverts)', options: [
    { label: 'Chute (0)', value: 0 }, { label: 'Chancelle (1)', value: 1 }, { label: 'Stable (2)', value: 2 },
  ]},
  { id: 'b7', text: 'Yeux fermés (pieds joints)', options: [
    { label: 'Instable (0)', value: 0 }, { label: 'Stable (1)', value: 1 },
  ]},
  { id: 'b8', text: 'Rotation 360°', options: [
    { label: 'Pas discontinus + instable (0)', value: 0 }, { label: 'Pas continus mais instable (1)', value: 1 }, { label: 'Pas continus stables (2)', value: 2 },
  ]},
  { id: 'b9', text: "S'asseoir sur une chaise", options: [
    { label: 'Insécure (tombe) (0)', value: 0 }, { label: 'Utilise les bras (1)', value: 1 }, { label: 'Mouvement fluide (2)', value: 2 },
  ]},
]

export const TINETTI_GAIT_QUESTIONS: Question[] = [
  { id: 'g1', text: 'Initiation de la marche', options: [
    { label: 'Hésitation / tentatives (0)', value: 0 }, { label: 'Sans hésitation (1)', value: 1 },
  ]},
  { id: 'g2', text: 'Hauteur du pas (pied droit)', options: [
    { label: 'Ne décolle pas (0)', value: 0 }, { label: 'Décolle (1)', value: 1 },
  ]},
  { id: 'g3', text: 'Hauteur du pas (pied gauche)', options: [
    { label: 'Ne décolle pas (0)', value: 0 }, { label: 'Décolle (1)', value: 1 },
  ]},
  { id: 'g4', text: 'Symétrie du pas', options: [
    { label: 'Asymétrique (0)', value: 0 }, { label: 'Symétrique (1)', value: 1 },
  ]},
  { id: 'g5', text: 'Continuité du pas', options: [
    { label: 'Arrêts / discontinu (0)', value: 0 }, { label: 'Continu (1)', value: 1 },
  ]},
  { id: 'g6', text: 'Trajectoire', options: [
    { label: 'Déviation marquée (0)', value: 0 }, { label: 'Légère déviation / aide (1)', value: 1 }, { label: 'Ligne droite sans aide (2)', value: 2 },
  ]},
  { id: 'g7', text: 'Tronc', options: [
    { label: 'Oscillation marquée (0)', value: 0 }, { label: 'Flexion genoux / bras écartés (1)', value: 1 }, { label: 'Stable sans aide (2)', value: 2 },
  ]},
  { id: 'g8', text: 'Largeur du pas', options: [
    { label: 'Pieds écartés (0)', value: 0 }, { label: 'Pieds rapprochés (1)', value: 1 },
  ]},
]

export const TINETTI_QUESTIONS: Question[] = [...TINETTI_BALANCE_QUESTIONS, ...TINETTI_GAIT_QUESTIONS]

export function interpretTinetti(score: number): { label: string; color: string } {
  if (score >= 25) return { label: 'Risque de chute faible', color: '#166534' }
  if (score >= 20) return { label: 'Risque modéré', color: '#f59e0b' }
  return { label: 'Risque de chute élevé', color: '#881337' }
}
