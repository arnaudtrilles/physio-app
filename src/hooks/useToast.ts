import { useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  message: string
  type: ToastType
  onAction?: () => void  // appelé au clic avant fermeture (ex: redirection)
  actionLabel?: string   // libellé du bouton d'action (ex: "Voir les forfaits")
}

let toastId = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((
    message: string,
    type: ToastType = 'success',
    options?: { onAction?: () => void; actionLabel?: string }
  ) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type, ...options }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, showToast, removeToast }
}
