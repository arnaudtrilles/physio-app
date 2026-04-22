import { useEffect, useState, useRef } from 'react'

export interface TutorialStep {
  id: string
  emoji: string
  title: string
  description: string
  selector: string | null
  tooltip: 'top' | 'bottom' | 'center'
  padding?: number
  isActionStep?: boolean
}

interface Rect { x: number; y: number; w: number; h: number }

interface TutorialProps {
  steps: TutorialStep[]
  currentIdx: number
  containerEl: HTMLElement | null
  onNext: () => void
  onSkip: () => void
  onDone: () => void
  onActionIA: () => void
  onActionExercices: () => void
  onActionPDF: () => void
}

export function Tutorial({
  steps, currentIdx, containerEl,
  onNext, onSkip, onDone,
  onActionIA, onActionExercices, onActionPDF,
}: TutorialProps) {
  const [spotlight, setSpotlight] = useState<Rect | null>(null)
  const [cSize, setCSize] = useState({ w: 430, h: 812 })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const step = steps[currentIdx]
  const isFirst = currentIdx === 0

  useEffect(() => {
    if (!containerEl) return
    const cr = containerEl.getBoundingClientRect()
    setCSize({ w: cr.width, h: cr.height })

    if (!step?.selector) { setSpotlight(null); return }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const el = containerEl.querySelector(step.selector!)
      if (!el) { setSpotlight(null); return }
      const er = el.getBoundingClientRect()
      const pad = step.padding ?? 10
      setSpotlight({
        x: er.left - cr.left - pad,
        y: er.top - cr.top - pad,
        w: er.width + pad * 2,
        h: er.height + pad * 2,
      })
    }, 350)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [currentIdx, step?.selector, containerEl])

  const { w: cW, h: cH } = cSize
  const PAD = 14

  // Card position
  let cardTop: number | undefined
  let cardBottom: number | undefined

  if (step.isActionStep) {
    cardTop = Math.round(cH * 0.2)
  } else if (isFirst && !spotlight) {
    // Étape d'accueil → centrer verticalement
    cardTop = Math.round(cH * 0.28)
  } else if (!spotlight || step.tooltip === 'center') {
    // Étapes formulaire → carte en bas pour laisser les champs visibles
    cardBottom = 110
  } else if (step.tooltip === 'bottom') {
    cardBottom = 110
  } else {
    cardBottom = cH - spotlight.y + 18
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 9999, pointerEvents: 'all' }}>
      {/* Overlay — toujours présent, avec découpe spotlight si applicable */}
      {spotlight ? (
        <svg
          width={cW} height={cH}
          style={{ position: 'absolute', top: 0, left: 0, display: 'block', pointerEvents: 'none' }}
        >
          <defs>
            <mask id="tuto-mask">
              <rect width={cW} height={cH} fill="white" />
              <rect x={spotlight.x} y={spotlight.y} width={spotlight.w} height={spotlight.h} rx={14} fill="black" />
            </mask>
          </defs>
          <rect width={cW} height={cH} fill="rgba(8,12,24,0.60)" mask="url(#tuto-mask)" />
          <rect x={spotlight.x - 4} y={spotlight.y - 4} width={spotlight.w + 8} height={spotlight.h + 8}
            rx={18} fill="none" stroke="rgba(74,140,115,0.7)" strokeWidth={2} />
          <rect x={spotlight.x} y={spotlight.y} width={spotlight.w} height={spotlight.h}
            rx={14} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
        </svg>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,12,24,0.55)', pointerEvents: 'none' }} />
      )}

      {/* Tooltip card — always interactive */}
      <div style={{
        position: 'absolute',
        left: PAD, right: PAD,
        top: cardTop,
        bottom: cardBottom,
        background: 'var(--surface)',
        borderRadius: 16,
        padding: step.isActionStep ? '1.4rem 1.2rem 1.2rem' : !spotlight ? '0.85rem 1rem 0.8rem' : '1.1rem 1.2rem 1rem',
        boxShadow: spotlight ? '0 16px 48px rgba(0,0,0,0.30), 0 2px 8px rgba(0,0,0,0.10)' : 'none',
        border: '1px solid rgba(45,90,75,0.12)',
        pointerEvents: 'all',
      }}>

        {step.isActionStep ? (
          /* ── Action step (final) ─────────────────────────────────── */
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>{step.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1A1A1A', marginBottom: 6 }}>{step.title}</div>
              <div style={{ fontSize: '0.855rem', color: '#5A5A52', lineHeight: 1.5 }}>{step.description}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <button onClick={onActionIA} style={actionBtnStyle('var(--primary)')}>
                <span style={{ fontSize: '1.1rem' }}>🤖</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Générer l'analyse IA</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Synthèse clinique automatique</div>
                </div>
              </button>
              <button onClick={onActionExercices} style={actionBtnStyle('var(--primary-dark)')}>
                <span style={{ fontSize: '1.1rem' }}>💪</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Créer la fiche d'exercices</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Programme personnalisé</div>
                </div>
              </button>
              <button onClick={onActionPDF} style={actionBtnStyle('var(--primary-light)')}>
                <span style={{ fontSize: '1.1rem' }}>📄</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Exporter en PDF</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Compte-rendu imprimable</div>
                </div>
              </button>
            </div>

            <button onClick={onDone} style={{
              width: '100%', padding: '0.6rem', borderRadius: 12,
              border: `1px solid var(--border-color)`, background: 'transparent',
              color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
            }}>
              Terminer le tutoriel
            </button>
          </>
        ) : (
          /* ── Normal step ─────────────────────────────────────────── */
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>{step.emoji}</span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A1A1A', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                {step.title}
              </div>
            </div>

            <div style={{ fontSize: '0.845rem', color: '#5A5A52', lineHeight: 1.55, marginBottom: 12 }}>
              {step.description}
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 12 }}>
              {steps.map((_, i) => (
                <div key={i} style={{
                  width: i === currentIdx ? 18 : 6, height: 6, borderRadius: 3,
                  background: i === currentIdx ? 'var(--primary)' : i < currentIdx ? 'var(--primary-light)' : 'var(--border-color)',
                  transition: 'all 0.25s ease',
                }} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onSkip} style={{
                padding: '0.6rem 0.9rem', borderRadius: 12,
                border: '1px solid #DDD8CE', background: 'transparent',
                color: '#7A7A6E', fontWeight: 600, fontSize: '0.80rem', cursor: 'pointer', flexShrink: 0,
              }}>
                Passer
              </button>
              <button onClick={onNext} style={{
                flex: 1, padding: '0.6rem', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
              }}>
                {isFirst ? 'Commencer →' : 'Suivant →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function actionBtnStyle(bg: string): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '0.8rem 1rem', borderRadius: 14, border: 'none',
    background: bg, color: 'white', cursor: 'pointer', width: '100%', textAlign: 'left',
  }
}
