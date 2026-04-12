import { useState, useRef, useEffect } from 'react'

interface DocumentMaskerProps {
  imageDataUrl: string
  fileName: string
  /** maskedDataUrl: le résultat, rectCount: nombre de rectangles appliqués (0 = aucun caviardage) */
  onConfirm: (maskedDataUrl: string, rectCount: number) => void
  onCancel: () => void
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function DocumentMasker({ imageDataUrl, fileName, onConfirm, onCancel }: DocumentMaskerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [rects, setRects] = useState<Rect[]>([])
  const [drawing, setDrawing] = useState<{ startX: number; startY: number } | null>(null)
  const [currentRect, setCurrentRect] = useState<Rect | null>(null)
  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [scale, setScale] = useState(1)
  const [showNoMaskWarning, setShowNoMaskWarning] = useState(false)
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  // Load image
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.src = imageDataUrl
  }, [imageDataUrl])

  // Observe container size (recalcule au resize, rotation, etc.)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setContainerSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || imgSize.w === 0 || containerSize.w === 0) return

    // Fit canvas entirely dans le container (largeur ET hauteur), avec padding
    const padding = 16
    const availW = containerSize.w - padding * 2
    const availH = containerSize.h - padding * 2
    const s = Math.min(availW / imgSize.w, availH / imgSize.h, 1)
    setScale(s)

    // Gérer Retina / high-DPI : rendu à la densité réelle du device (écriture nette)
    const dpr = window.devicePixelRatio || 1
    const cssW = imgSize.w * s
    const cssH = imgSize.h * s
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, cssW, cssH)

    // Draw existing rectangles in black
    ctx.fillStyle = '#000'
    for (const r of rects) {
      ctx.fillRect(r.x * s, r.y * s, r.w * s, r.h * s)
    }
    // Draw current rect being drawn (semi-transparent)
    if (currentRect) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(currentRect.x * s, currentRect.y * s, currentRect.w * s, currentRect.h * s)
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = 2
      ctx.strokeRect(currentRect.x * s, currentRect.y * s, currentRect.w * s, currentRect.h * s)
    }
  }, [rects, currentRect, imgSize, containerSize])

  const getCoords = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale }
  }

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const { x, y } = getCoords(e)
    setDrawing({ startX: x, startY: y })
    setCurrentRect({ x, y, w: 0, h: 0 })
  }

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return
    e.preventDefault()
    const { x, y } = getCoords(e)
    setCurrentRect({
      x: Math.min(drawing.startX, x),
      y: Math.min(drawing.startY, y),
      w: Math.abs(x - drawing.startX),
      h: Math.abs(y - drawing.startY),
    })
  }

  const handleEnd = () => {
    if (currentRect && currentRect.w > 5 && currentRect.h > 5) {
      setRects(prev => [...prev, currentRect])
    }
    setDrawing(null)
    setCurrentRect(null)
  }

  const undoLast = () => setRects(prev => prev.slice(0, -1))
  const clearAll = () => setRects([])

  const maskHeader = () => {
    // Masquer les 15% supérieurs
    setRects(prev => [...prev, { x: 0, y: 0, w: imgSize.w, h: imgSize.h * 0.15 }])
  }

  const handleConfirm = () => {
    const img = imgRef.current
    if (!img) return
    // Créer un canvas à la taille originale et appliquer les rectangles
    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = imgSize.w
    finalCanvas.height = imgSize.h
    const ctx = finalCanvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0)
    ctx.fillStyle = '#000'
    for (const r of rects) {
      ctx.fillRect(r.x, r.y, r.w, r.h)
    }
    const maskedDataUrl = finalCanvas.toDataURL('image/jpeg', 0.9)
    onConfirm(maskedDataUrl, rects.length)
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', zIndex: 3000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 0.75rem', background: 'var(--surface)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Masquer les infos patient</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
        </div>
        <button onClick={onCancel} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: 'var(--secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Instructions */}
      <div style={{ padding: '0.4rem 0.75rem', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: '0.68rem', color: '#92400e', lineHeight: 1.35 }}>
        Tracez un rectangle sur les infos sensibles (nom, date de naissance, n° sécu).
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 0 }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          style={{ cursor: 'crosshair', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', borderRadius: 4, touchAction: 'none' }}
        />
      </div>

      {/* Actions */}
      <div style={{ padding: '0.6rem 0.75rem', background: 'var(--surface)', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={maskHeader}
            style={{ flex: 1, minWidth: 0, padding: '0.35rem 0.2rem', borderRadius: 6, background: '#fffbeb', border: '1.5px solid #fde68a', color: '#92400e', fontWeight: 600, fontSize: '0.65rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="6" rx="1" fill="currentColor"/><rect x="3" y="11" width="18" height="10" rx="1"/></svg>
            En-tête
          </button>
          <button onClick={undoLast} disabled={rects.length === 0}
            style={{ flex: 1, minWidth: 0, padding: '0.35rem 0.2rem', borderRadius: 6, background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: rects.length === 0 ? 'var(--text-muted)' : 'var(--text-main)', fontWeight: 600, fontSize: '0.65rem', cursor: rects.length === 0 ? 'not-allowed' : 'pointer', opacity: rects.length === 0 ? 0.5 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>
            Annuler
          </button>
          <button onClick={clearAll} disabled={rects.length === 0}
            style={{ flex: 1, minWidth: 0, padding: '0.35rem 0.2rem', borderRadius: 6, background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: rects.length === 0 ? 'var(--text-muted)' : '#dc2626', fontWeight: 600, fontSize: '0.65rem', cursor: rects.length === 0 ? 'not-allowed' : 'pointer', opacity: rects.length === 0 ? 0.5 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Effacer
          </button>
        </div>
        {showNoMaskWarning ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ padding: '8px 10px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, fontSize: '0.7rem', color: '#92400e', lineHeight: 1.45 }}>
              <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Vérification avant validation
              </div>
              Avez-vous bien masqué toutes les zones sensibles ?
              <div style={{ marginTop: 4, paddingLeft: 4 }}>
                • Nom et prénom du patient{'\n'}
                • Date de naissance{'\n'}
                • N° de sécurité sociale / assurance maladie{'\n'}
                • Adresse du patient{'\n'}
                • En-tête et signature du médecin{'\n'}
                • Tout autre identifiant personnel
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowNoMaskWarning(false)}
                style={{ flex: 1, minWidth: 0, padding: '0.55rem 0.4rem', borderRadius: 8, background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Retour
              </button>
              <button onClick={handleConfirm}
                style={{ flex: 2, minWidth: 0, padding: '0.55rem 0.4rem', borderRadius: 8, background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                J'ai vérifié, valider{rects.length > 0 ? ` (${rects.length})` : ''}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onCancel}
              style={{ flex: 1, minWidth: 0, padding: '0.55rem 0.4rem', borderRadius: 8, background: 'var(--secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Annuler
            </button>
            <button onClick={() => setShowNoMaskWarning(true)}
              style={{ flex: 2, minWidth: 0, padding: '0.55rem 0.4rem', borderRadius: 8, background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Valider{rects.length > 0 ? ` (${rects.length})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
