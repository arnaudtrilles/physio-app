import { useState } from 'react'
import { BODY_CHART_BG_URL, BODY_CHART_W, BODY_CHART_H } from './BodyDrawing'

interface TreatmentBodyChartProps {
  drawing: string
}

/**
 * Aperçu non-éditable du schéma corporel du premier bilan d'un traitement.
 * Affiché en accordéon fermé par défaut dans la fiche patient, au-dessus
 * des courbes d'évolution. La silhouette de fond et le calque dessin sont
 * empilés via deux <img> superposés — pas de composition canvas pour rester
 * léger et éviter tout délai de chargement.
 */
export function TreatmentBodyChart({ drawing }: TreatmentBodyChartProps) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      border: '1px solid var(--border-color)',
      borderRadius: 12,
      overflow: 'hidden',
      background: 'var(--surface)',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px', background: 'var(--secondary)',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
        <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dark)', letterSpacing: '0.01em' }}>
          Schéma corporel — bilan initial
        </span>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600,
            background: 'var(--surface)', color: 'var(--primary-dark)',
            border: '1px solid var(--border-color)', borderRadius: 8,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {open ? 'Masquer' : 'Voir'}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div style={{
          padding: 12,
          background: '#f8fafc',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: 520,
            aspectRatio: `${BODY_CHART_W} / ${BODY_CHART_H}`,
            borderRadius: 8,
            overflow: 'hidden',
            background: '#ffffff',
          }}>
            <img
              src={BODY_CHART_BG_URL}
              alt="Silhouette corporelle"
              draggable={false}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'contain',
                userSelect: 'none', pointerEvents: 'none',
              }}
            />
            <img
              src={drawing}
              alt="Schéma corporel du bilan initial"
              draggable={false}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'contain',
                userSelect: 'none', pointerEvents: 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
