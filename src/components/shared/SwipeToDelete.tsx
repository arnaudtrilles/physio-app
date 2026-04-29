import { useRef, useState } from 'react'
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react'

interface SwipeToDeleteProps {
  children: ReactNode
  onDelete: () => void
  disabled?: boolean
}

export function SwipeToDelete({ children, onDelete, disabled = false }: SwipeToDeleteProps) {
  const REVEAL = 68
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const baselineRef = useRef(0)
  const lockedRef = useRef<'none' | 'h' | 'v'>('none')
  const pointerIdRef = useRef<number | null>(null)
  if (disabled) return <>{children}</>
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pointerIdRef.current = e.pointerId
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    baselineRef.current = dx
    lockedRef.current = 'none'
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (startXRef.current === null || startYRef.current === null) return
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return
    const rawX = e.clientX - startXRef.current
    const rawY = e.clientY - startYRef.current
    if (lockedRef.current === 'none') {
      if (Math.abs(rawX) < 6 && Math.abs(rawY) < 6) return
      lockedRef.current = Math.abs(rawX) > Math.abs(rawY) ? 'h' : 'v'
      if (lockedRef.current === 'h') {
        setDragging(true)
        try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch { /* noop */ }
      }
    }
    if (lockedRef.current !== 'h') return
    const next = Math.max(-REVEAL, Math.min(0, baselineRef.current + rawX))
    setDx(next)
  }
  const finishGesture = () => {
    startXRef.current = null
    startYRef.current = null
    pointerIdRef.current = null
    if (lockedRef.current === 'h') {
      setDx(dx < -REVEAL / 2 ? -REVEAL : 0)
    }
    lockedRef.current = 'none'
    setDragging(false)
  }
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 10 }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        aria-label="Supprimer"
        style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: REVEAL,
          background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={finishGesture}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 0.2s',
          position: 'relative',
          background: 'var(--surface)',
          touchAction: 'pan-y',
          cursor: dx < 0 ? 'grabbing' : 'auto',
        }}>
        {children}
      </div>
    </div>
  )
}
