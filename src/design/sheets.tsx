import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { colors, spacing, radius, typography, shadow, motion } from './tokens'

// ──────────────────────────────────────────────────────────────────
// BottomSheet — mobile-first modal sliding from bottom
// ──────────────────────────────────────────────────────────────────

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  maxHeight?: string
  footer?: ReactNode
}

export function BottomSheet({ open, onClose, title, subtitle, children, maxHeight = '70vh', footer }: BottomSheetProps) {
  const [dragY, setDragY] = useState(0)
  const [closing, setClosing] = useState(false)
  const dragRef = useRef<{ startY: number; dragging: boolean } | null>(null)

  useEffect(() => {
    if (!open) { setDragY(0); setClosing(false); dragRef.current = null }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const dismiss = () => {
    setDragY(0)
    setClosing(true)
    setTimeout(() => { setClosing(false); onClose() }, 350)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (closing) return
    dragRef.current = { startY: e.touches[0].clientY, dragging: true }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current?.dragging || closing) return
    const dy = e.touches[0].clientY - dragRef.current.startY
    if (dy > 0) setDragY(dy)
  }
  const onTouchEnd = () => {
    if (!dragRef.current || closing) return
    dragRef.current = null
    if (dragY > 80) {
      dismiss()
    } else {
      setDragY(0)
    }
  }

  if (!open) return null
  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        height: '100dvh',
        background: 'transparent',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 2000,
        animation: `sheet-fade-in ${motion.fast}`,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: colors.surfaceMuted,
          borderRadius: `${radius['3xl']}px ${radius['3xl']}px 0 0`,
          width: '100%',
          maxWidth: 430,
          boxShadow: shadow.xl,
          maxHeight: maxHeight,
          display: 'flex',
          flexDirection: 'column',
          animation: dragY || closing ? 'none' : `sheet-slide-up ${motion.normal}`,
          transform: closing ? 'translateY(100%)' : dragY ? `translateY(${dragY}px)` : undefined,
          transition: closing ? 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)' : dragY ? 'none' : `transform ${motion.normal}`,
          overflow: 'hidden',
        }}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '0.6rem 0 0.2rem',
            cursor: 'grab',
            touchAction: 'none',
          }}
        >
          <div style={{ width: 38, height: 4, borderRadius: radius.full, background: colors.borderSoft }} />
        </div>
        {(title || subtitle) && (
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ padding: '0.4rem 1.2rem 0.75rem', touchAction: 'none' }}
          >
            {title && <div style={{ fontSize: typography.heading, fontWeight: typography.extrabold, color: colors.text }}>{title}</div>}
            {subtitle && <div style={{ fontSize: typography.meta, color: colors.textMuted, marginTop: 2 }}>{subtitle}</div>}
          </div>
        )}
        <div style={{ overflowY: 'auto', padding: '0.5rem 1.2rem 2.4rem', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: '0.75rem 1.2rem 1rem', borderTop: `1px solid ${colors.borderSoft}` }}>{footer}</div>}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// ActionSheet — list of actions (iOS-style)
// ──────────────────────────────────────────────────────────────────

export interface ActionItem {
  label: string
  description?: string
  icon?: ReactNode
  tone?: 'default' | 'primary' | 'danger' | 'success'
  onClick: () => void
  disabled?: boolean
}

interface ActionSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  actions: ActionItem[]
}

export function ActionSheet({ open, onClose, title, subtitle, actions }: ActionSheetProps) {
  const toneColors: Record<string, { color: string; bg: string }> = {
    default: { color: colors.text, bg: colors.surfaceMuted },
    primary: { color: colors.primary, bg: colors.infoSoft },
    danger: { color: colors.danger, bg: colors.dangerSoft },
    success: { color: colors.success, bg: colors.successSoft },
  }
  return (
    <BottomSheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {actions.map((a, i) => {
          const t = toneColors[a.tone || 'default']
          return (
            <button
              key={i}
              disabled={a.disabled}
              onClick={() => {
                if (a.disabled) return
                a.onClick()
                onClose()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.md,
                padding: '0.9rem 1rem',
                background: t.bg,
                border: 'none',
                borderRadius: radius.lg,
                cursor: a.disabled ? 'not-allowed' : 'pointer',
                opacity: a.disabled ? 0.5 : 1,
                textAlign: 'left',
                transition: `transform ${motion.fast}`,
              }}
            >
              {a.icon && (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: radius.md,
                    background: 'white',
                    color: t.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: shadow.xs,
                  }}
                >
                  {a.icon}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: typography.body, fontWeight: typography.bold, color: t.color }}>{a.label}</div>
                {a.description && <div style={{ fontSize: typography.meta, color: colors.textMuted, marginTop: 1 }}>{a.description}</div>}
              </div>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}

// Styles for sheet animations (global keyframes via a small injected stylesheet)
const STYLE_ID = 'design-sheets-style'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    @keyframes sheet-fade-in { from { opacity: 0 } to { opacity: 1 } }
    @keyframes sheet-slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }
  `
  document.head.appendChild(el)
}
