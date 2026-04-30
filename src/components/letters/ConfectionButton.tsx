import { useState } from 'react'

interface ConfectionButtonProps {
  onConfect: () => Promise<void> | void
  busy?: boolean
  disabled?: boolean
  title?: string
}

// Bouton discret ✨ rendu à côté du label d'une zone éditable d'un courrier.
// Au clic : appelle onConfect (qui résout l'appel IA dans le LetterGenerator).
// Spinner pendant busy. Reste petit, neutre, en hover doux.
export function ConfectionButton({ onConfect, busy = false, disabled = false, title }: ConfectionButtonProps) {
  const [hovered, setHovered] = useState(false)

  const baseStyle: React.CSSProperties = {
    appearance: 'none',
    border: '1px solid var(--border-color)',
    background: hovered && !busy && !disabled ? 'var(--surface-soft, #f1f5f9)' : 'transparent',
    color: disabled ? 'var(--text-muted)' : busy ? 'var(--primary)' : 'var(--text-muted)',
    padding: '2px 8px',
    borderRadius: 999,
    cursor: disabled || busy ? 'default' : 'pointer',
    fontSize: '0.7rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 22,
    transition: 'background 0.15s, color 0.15s',
    opacity: disabled ? 0.5 : 1,
    marginLeft: 6,
    verticalAlign: 'middle',
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy || disabled) return
    void onConfect()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={baseStyle}
      title={title ?? 'Confectionner ce paragraphe avec l\'IA'}
      aria-label={title ?? 'Confectionner ce paragraphe'}
      disabled={busy || disabled}
    >
      {busy ? (
        <SpinnerDot />
      ) : (
        <SparkleIcon />
      )}
      <span>{busy ? 'Confection…' : 'Confectionner'}</span>
    </button>
  )
}

function SparkleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  )
}

function SpinnerDot() {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        display: 'inline-block',
        animation: 'spin 0.8s linear infinite',
      }}
      aria-hidden="true"
    />
  )
}
