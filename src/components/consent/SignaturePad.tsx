import { useEffect, useRef, useState } from 'react'

interface SignaturePadProps {
  onConfirm: (dataUrl: string) => void
  onCancel: () => void
  /** Hauteur du canvas en px (la largeur s'adapte au container). */
  height?: number
}

/**
 * Canvas de signature tactile (pointer events → marche souris + tactile + stylet).
 *
 * Sortie : PNG data URL (transparent BG conservé pour superposition propre sur
 * le PDF). Le canvas garde un buffer offscreen plus haute densité pour que
 * la signature reste nette quand on l'embed dans le PDF (sinon elle pixelise).
 */
export function SignaturePad({ onConfirm, onCancel, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [hasInk, setHasInk] = useState(false)

  // Resize observer + DPR scaling : le canvas doit matcher sa taille CSS
  // avec un buffer scalé par devicePixelRatio pour rester net en HiDPI.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      // Préserver le dessin existant quand on resize.
      const prev = canvas.toDataURL()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2
      // Restore previous ink (only meaningful if user already drew something)
      if (hasInk) {
        const img = new Image()
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height)
        img.src = prev
      }
    }
    setupCanvas()
    const ro = new ResizeObserver(setupCanvas)
    ro.observe(canvas)
    return () => ro.disconnect()
    // hasInk volontairement absent : on ne veut pas re-init à chaque trait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    isDrawingRef.current = true
    lastPointRef.current = getPoint(e)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const p = getPoint(e)
    const last = lastPointRef.current
    if (last) {
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
    lastPointRef.current = p
    if (!hasInk) setHasInk(true)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    canvasRef.current?.releasePointerCapture(e.pointerId)
    isDrawingRef.current = false
    lastPointRef.current = null
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
  }

  const confirm = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasInk) return
    onConfirm(canvas.toDataURL('image/png'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        background: 'white',
        border: '2px dashed var(--border-color)',
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            display: 'block',
            width: '100%',
            height: `${height}px`,
            touchAction: 'none',
            cursor: 'crosshair',
          }}
        />
        {!hasInk && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)', fontSize: 13, pointerEvents: 'none',
            fontStyle: 'italic',
          }}>
            Signez ici avec votre doigt
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={clear}
          disabled={!hasInk}
          style={{
            flex: 1, padding: '0.7rem',
            borderRadius: 12, border: '1.5px solid var(--border-color)',
            background: 'var(--input-bg)', color: 'var(--text-muted)',
            fontSize: 14, cursor: hasInk ? 'pointer' : 'not-allowed',
            opacity: hasInk ? 1 : 0.5,
          }}
        >
          Effacer
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1, padding: '0.7rem',
            borderRadius: 12, border: '1.5px solid var(--border-color)',
            background: 'var(--input-bg)', color: 'var(--text-muted)',
            fontSize: 14, cursor: 'pointer',
          }}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={!hasInk}
          style={{
            flex: 2, padding: '0.7rem',
            borderRadius: 12, border: 'none',
            background: hasInk ? 'var(--primary)' : 'var(--secondary)',
            color: hasInk ? 'white' : 'var(--text-muted)',
            fontWeight: 600, fontSize: 14,
            cursor: hasInk ? 'pointer' : 'not-allowed',
            opacity: hasInk ? 1 : 0.5,
          }}
        >
          Enregistrer la signature
        </button>
      </div>
    </div>
  )
}
