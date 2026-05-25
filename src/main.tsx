import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { applyInitialTheme } from './hooks/useTheme'
import { initPostHog } from './lib/posthog'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  })
}

applyInitialTheme()
initPostHog()

// Recharge automatiquement quand un nouveau service worker prend le contrôle
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

const isAdminRoute = window.location.pathname === '/admin'
const isPatientInfoRoute = window.location.pathname === '/patients' || window.location.pathname === '/patients/'
const hashParams = new URLSearchParams(window.location.hash.slice(1))
const isPasswordRecovery = hashParams.get('type') === 'recovery'

if (isAdminRoute) {
  import('./pages/AdminPage').then(({ default: AdminPage }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode><AdminPage /></StrictMode>,
    )
  })
} else if (isPatientInfoRoute) {
  import('./pages/PatientInfoPage').then(({ default: PatientInfoPage }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode><PatientInfoPage /></StrictMode>,
    )
  })
} else if (isPasswordRecovery) {
  import('./pages/PasswordResetPage').then(({ default: PasswordResetPage }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode><PasswordResetPage /></StrictMode>,
    )
  })
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode><App /></StrictMode>,
  )
}
