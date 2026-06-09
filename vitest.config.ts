import { defineConfig } from 'vitest/config'

// Config Vitest dédiée (prioritaire sur vite.config.ts) : les tests unitaires
// portent sur des fonctions PURES (scrubbing PII, fingerprints de sync). On
// n'a pas besoin des plugins applicatifs (PWA, Sentry, proxies dev) ni du DOM.
// Les tests e2e Playwright vivent dans ./e2e et ne sont pas captés ici.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
})
