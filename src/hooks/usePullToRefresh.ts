import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 160 // px to pull before triggering refresh

export function usePullToRefresh(enabled = true) {
  const [pulling, setPulling] = useState(false)
  const [progress, setProgress] = useState(0) // 0 to 1
  const startY = useRef(0)
  const currentY = useRef(0)
  const isPulling = useRef(false)

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (!enabled || window.scrollY !== 0) return
      startY.current = e.touches[0].clientY
      isPulling.current = true
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return
      currentY.current = e.touches[0].clientY
      const delta = currentY.current - startY.current
      if (delta <= 0) { setPulling(false); setProgress(0); return }
      setPulling(true)
      setProgress(Math.min(delta / THRESHOLD, 1))
    }

    const onTouchEnd = () => {
      if (!isPulling.current) return
      isPulling.current = false
      const delta = currentY.current - startY.current
      if (delta >= THRESHOLD) {
        window.location.reload()
      } else {
        setPulling(false)
        setProgress(0)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [enabled])

  return { pulling, progress }
}
