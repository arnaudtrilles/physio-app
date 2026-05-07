import posthog from 'posthog-js'

const key = import.meta.env.VITE_POSTHOG_KEY
const host = import.meta.env.VITE_POSTHOG_URL ?? 'https://eu.i.posthog.com'

export function initPostHog() {
  if (!key) return
  posthog.init(key, {
    api_host: host,
    persistence: 'localStorage+cookie',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: true,
    // PHI safeguard: session replay désactivé — le DOM contient nom/prénom/date_naissance.
    // Ne PAS réactiver sans DPA HDS + maskAllInputs + maskTextSelector strict.
    disable_session_recording: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
    },
    loaded: (ph) => {
      // Respecte l'opt-out persisté
      if (localStorage.getItem('physio_analytics_enabled') === 'false') {
        ph.opt_out_capturing()
      }
    },
  })
}

export function phIdentify(userId: string, props: { email?: string; plan?: string }) {
  if (!key) return
  posthog.identify(userId, props)
}

export function phReset() {
  if (!key) return
  posthog.reset()
}

export function phCapture(event: string, props?: Record<string, unknown>) {
  if (!key) return
  posthog.capture(event, props)
}

export function phOptOut() {
  if (!key) return
  posthog.opt_out_capturing()
  localStorage.setItem('physio_analytics_enabled', 'false')
}

export function phOptIn() {
  if (!key) return
  posthog.opt_in_capturing()
  localStorage.setItem('physio_analytics_enabled', 'true')
}

export function phIsOptedIn(): boolean {
  if (!key) return false
  return !posthog.has_opted_out_capturing()
}
