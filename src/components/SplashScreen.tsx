import { useEffect, useState } from 'react'

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // Légère pause avant d'apparaître — sensation de respiration
    const t0 = setTimeout(() => setVisible(true), 80)
    const t1 = setTimeout(() => setLeaving(true), 1600)
    const t2 = setTimeout(() => onDone(), 2200)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'var(--primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: leaving ? 0 : 1,
      transition: leaving ? 'opacity 0.6s cubic-bezier(0.4, 0, 1, 1)' : 'none',
      pointerEvents: leaving ? 'none' : 'all',
    }}>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(8px)',
        filter: visible ? 'blur(0px)' : 'blur(4px)',
        transition: visible
          ? 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 1.1s cubic-bezier(0.16, 1, 0.3, 1), filter 0.8s ease'
          : 'none',
      }}>

        {/* Wordmark only */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 5,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
        }}>
          {/* Ligne top — s'étire de gauche à droite */}
          <div style={{
            height: 1.5,
            background: 'rgba(255,255,255,0.28)',
            borderRadius: 1,
            transformOrigin: 'left',
            transform: visible ? 'scaleX(1)' : 'scaleX(0)',
            transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.25s',
          }} />

          {/* KNODE */}
          <div style={{ display: 'flex', alignItems: 'baseline', padding: '2px 0' }}>
            <span style={{ fontWeight: 900, fontSize: 56, color: 'white', lineHeight: 1, letterSpacing: -2, fontFamily: 'Inter, sans-serif' }}>K</span>
            <span style={{ fontWeight: 200, fontSize: 56, color: 'rgba(255,255,255,0.82)', lineHeight: 1, letterSpacing: -1.5, fontFamily: 'Inter, sans-serif' }}>NODE</span>
          </div>

          {/* Ligne bottom */}
          <div style={{
            height: 1.5,
            background: 'rgba(255,255,255,0.28)',
            borderRadius: 1,
            transformOrigin: 'left',
            transform: visible ? 'scaleX(1)' : 'scaleX(0)',
            transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.35s',
          }} />

          {/* Tagline */}
          <div style={{
            fontSize: 9, fontWeight: 500,
            color: 'rgba(255,255,255,0.38)',
            letterSpacing: 3.5, paddingTop: 3,
            fontFamily: 'Inter, sans-serif',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.8s ease 0.5s',
          }}>
            PHYSIOTHERAPY PLATFORM
          </div>
        </div>

      </div>
    </div>
  )
}
