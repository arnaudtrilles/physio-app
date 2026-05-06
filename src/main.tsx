import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyInitialTheme } from './hooks/useTheme'

applyInitialTheme()

// Recharge automatiquement quand un nouveau service worker prend le contrôle
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

const isAdminRoute = window.location.pathname === '/admin'

if (isAdminRoute) {
  import('./pages/AdminPage').then(({ default: AdminPage }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <AdminPage />
      </StrictMode>,
    )
  })
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
