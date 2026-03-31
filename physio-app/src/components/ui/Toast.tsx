import type { Toast, ToastType } from '../../hooks/useToast'

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: number) => void
}

function getToastStyle(type: ToastType) {
  switch (type) {
    case 'success': return { background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' }
    case 'error':   return { background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b' }
    case 'info':    return { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8' }
  }
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
  if (type === 'error') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 390, width: '90%' }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => onRemove(toast.id)}
          style={{
            ...getToastStyle(toast.type),
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            cursor: 'pointer',
            animation: 'toast-in 0.2s ease',
          }}
        >
          <ToastIcon type={toast.type} />
          <span style={{ flex: 1 }}>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
