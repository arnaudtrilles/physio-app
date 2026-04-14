import { useEffect, useRef, useState } from 'react'

// Dimensions logiques du canvas (coordonnées internes). L'image de fond
// et le canvas sont rendus à la même taille via CSS — le zoom passe par
// une mise à l'échelle du conteneur.
export const BODY_CHART_BG_URL = '/body-chart.png'
export const BODY_CHART_W = 1100
export const BODY_CHART_H = 920

const COLORS = ['#dc2626', '#2563eb', '#16a34a', '#7c3aed', '#111827']
type Tool = 'pen' | 'eraser'

interface BodyDrawingProps {
  value: string
  onChange: (dataURL: string) => void
}

export function BodyDrawing({ value, onChange }: BodyDrawingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const drawingRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number } | null>(null)
  const historyRef = useRef<string[]>([])
  const loadedForRef = useRef<string | null>(null)

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState<string>(COLORS[0])
  const [thickness, setThickness] = useState(4)
  const [zoom, setZoom] = useState(0.5)

  // Restaure le calque dessin quand `value` change (à l'ouverture / reload
  // d'un bilan). Ne re-déclenche pas pendant que l'utilisateur dessine
  // puisque `value` reflète alors le dernier toDataURL() du canvas lui-même.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    if (loadedForRef.current === value) return
    loadedForRef.current = value
    ctx.clearRect(0, 0, BODY_CHART_W, BODY_CHART_H)
    if (!value) return
    const img = new Image()
    img.onload = () => {
      if (loadedForRef.current !== value) return
      ctx.clearRect(0, 0, BODY_CHART_W, BODY_CHART_H)
      ctx.drawImage(img, 0, 0, BODY_CHART_W, BODY_CHART_H)
    }
    img.src = value
  }, [value])

  const snapshot = () => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    return canvas.toDataURL('image/png')
  }

  const pushHistory = () => {
    const snap = snapshot()
    historyRef.current.push(snap)
    if (historyRef.current.length > 30) historyRef.current.shift()
  }

  const undo = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const prev = historyRef.current.pop()
    ctx.clearRect(0, 0, BODY_CHART_W, BODY_CHART_H)
    if (!prev) {
      loadedForRef.current = ''
      onChange('')
      return
    }
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, BODY_CHART_W, BODY_CHART_H)
      ctx.drawImage(img, 0, 0)
      const out = canvas.toDataURL('image/png')
      loadedForRef.current = out
      onChange(out)
    }
    img.src = prev
  }

  const clearAll = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    pushHistory()
    ctx.clearRect(0, 0, BODY_CHART_W, BODY_CHART_H)
    loadedForRef.current = ''
    onChange('')
  }

  const getCoords = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * BODY_CHART_W,
      y: ((e.clientY - rect.top) / rect.height) * BODY_CHART_H,
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    try { canvas.setPointerCapture(e.pointerId) } catch { /* noop */ }
    pushHistory()
    drawingRef.current = true
    lastRef.current = getCoords(e)
    // Dépose un point minimal au tap (utile pour les symboles × ponctuels)
    const ctx = canvas.getContext('2d')
    if (ctx && lastRef.current) {
      const { x, y } = lastRef.current
      ctx.save()
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = 'rgba(0,0,0,1)'
        ctx.beginPath()
        ctx.arc(x, y, thickness * 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y, thickness / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx || !lastRef.current) return
    const cur = getCoords(e)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = thickness * 4
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = color
      ctx.lineWidth = thickness
    }
    ctx.beginPath()
    ctx.moveTo(lastRef.current.x, lastRef.current.y)
    ctx.lineTo(cur.x, cur.y)
    ctx.stroke()
    lastRef.current = cur
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastRef.current = null
    const canvas = canvasRef.current
    if (!canvas) return
    try { canvas.releasePointerCapture(e.pointerId) } catch { /* noop */ }
    const out = canvas.toDataURL('image/png')
    loadedForRef.current = out
    onChange(out)
  }

  // Zoom molette (desktop)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (ev: WheelEvent) => {
      if (!ev.ctrlKey && !ev.metaKey) return
      ev.preventDefault()
      setZoom(z => {
        const next = ev.deltaY < 0 ? z + 0.15 : z - 0.15
        return Math.min(3, Math.max(0.5, +next.toFixed(2)))
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
        padding: '8px 10px', background: 'var(--secondary)',
        borderRadius: 10, border: '1px solid var(--border-color)',
      }}>
        <button type="button" onClick={() => setTool('pen')} style={toolBtn(tool === 'pen')}>
          <PenIcon /> Stylo
        </button>
        <button type="button" onClick={() => setTool('eraser')} style={toolBtn(tool === 'eraser')}>
          <EraserIcon /> Gomme
        </button>
        <Divider />
        {COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => { setColor(c); setTool('pen') }}
            aria-label={`Couleur ${c}`}
            style={{
              width: 24, height: 24, borderRadius: '50%', background: c,
              border: color === c && tool === 'pen' ? '3px solid var(--primary-dark)' : '1px solid rgba(0,0,0,0.15)',
              cursor: 'pointer', padding: 0,
            }}
          />
        ))}
        <Divider />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Épaisseur
          <input type="range" min={2} max={14} value={thickness}
            onChange={e => setThickness(Number(e.target.value))}
            style={{ width: 70 }} />
        </label>
        <Divider />
        <button type="button" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} style={smallBtn}>−</button>
        <span style={{ fontSize: '0.75rem', minWidth: 42, textAlign: 'center', fontWeight: 600, color: 'var(--text-main)' }}>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))} style={smallBtn}>+</button>
        <button type="button" onClick={() => setZoom(1)} style={smallBtn} aria-label="Zoom 100%">⟲</button>
        <Divider />
        <button type="button" onClick={undo} style={smallBtn}>Annuler</button>
        <button type="button" onClick={clearAll} style={{ ...smallBtn, color: '#dc2626', borderColor: '#fecaca' }}>Effacer tout</button>
      </div>

      {/* Légende symboles EBP */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: '0.68rem',
        color: 'var(--text-muted)', padding: '2px 4px', lineHeight: 1.4,
      }}>
        <span><b style={{ color: '#dc2626', fontSize: '0.85rem' }}>×</b> douleur</span>
        <span><b style={{ color: '#2563eb', fontSize: '0.85rem' }}>///</b> paresthésies</span>
        <span><b style={{ color: '#16a34a', fontSize: '0.85rem' }}>ooo</b> hypoesthésie</span>
        <span><b style={{ color: '#7c3aed', fontSize: '0.85rem' }}>≈</b> brûlure</span>
        <span><b style={{ fontSize: '0.85rem' }}>→</b> irradiation</span>
      </div>

      {/* Zone canvas (pan natif via overflow:auto quand zoomé, centrée sinon) */}
      <div
        ref={containerRef}
        style={{
          overflow: 'auto',
          background: '#f8fafc',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          maxHeight: '65vh',
          minHeight: 320,
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y',
          display: 'flex',
          alignItems: 'safe center',
          justifyContent: 'safe center',
          padding: 8,
        }}
      >
        <div style={{
          position: 'relative',
          flex: '0 0 auto',
          width: BODY_CHART_W * zoom,
          height: BODY_CHART_H * zoom,
        }}>
          <img
            src={BODY_CHART_BG_URL}
            alt="Silhouette corporelle"
            draggable={false}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              userSelect: 'none', pointerEvents: 'none',
              objectFit: 'contain',
            }}
          />
          <canvas
            ref={canvasRef}
            width={BODY_CHART_W}
            height={BODY_CHART_H}
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              touchAction: 'none',
              cursor: tool === 'eraser' ? 'cell' : 'crosshair',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>
      </div>
      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '2px 4px 0' }}>
        Dessinez directement sur la silhouette. Ctrl/⌘ + molette pour zoomer, pincer sur mobile.
      </p>
    </div>
  )
}

function Divider() {
  return <span style={{ width: 1, height: 22, background: 'var(--border-color)', margin: '0 2px' }} />
}

function PenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

function EraserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  )
}

const toolBtn = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 10px',
  fontSize: '0.78rem',
  fontWeight: 600,
  background: active ? 'var(--primary)' : 'var(--surface)',
  color: active ? '#fff' : 'var(--text-main)',
  border: `1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`,
  borderRadius: 8,
  cursor: 'pointer',
})

const smallBtn: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: '0.75rem',
  fontWeight: 600,
  background: 'var(--surface)',
  color: 'var(--text-main)',
  border: '1px solid var(--border-color)',
  borderRadius: 8,
  cursor: 'pointer',
}

/**
 * Compose la silhouette de fond avec un calque dessin (PNG transparent)
 * en un seul PNG dataURL — utilisé par le PDF pour obtenir une image unique.
 */
export async function composeBodyChart(drawingDataURL: string | undefined): Promise<string | null> {
  const canvas = document.createElement('canvas')
  canvas.width = BODY_CHART_W
  canvas.height = BODY_CHART_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  try {
    const bg = await loadImage(BODY_CHART_BG_URL)
    ctx.drawImage(bg, 0, 0, BODY_CHART_W, BODY_CHART_H)
  } catch {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, BODY_CHART_W, BODY_CHART_H)
  }
  if (drawingDataURL) {
    try {
      const drawing = await loadImage(drawingDataURL)
      ctx.drawImage(drawing, 0, 0, BODY_CHART_W, BODY_CHART_H)
    } catch { /* drawing invalide — on garde juste le fond */ }
  }
  return canvas.toDataURL('image/png')
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${src}`))
    img.src = src
  })
}
