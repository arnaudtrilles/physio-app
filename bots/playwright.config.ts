import { defineConfig, devices } from '@playwright/test'

/**
 * Config Playwright dédiée aux personas bots.
 * Distincte de playwright.config.ts (e2e signés) pour ne pas mélanger :
 * - les e2e de régression (bloquants en CI)
 * - les personas exploratoires (artefacts pour eval IA, non-bloquants)
 */
export default defineConfig({
  testDir: './personas',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'reports/last-run.json' }],
  ],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 8_000,
  },
  webServer: {
    command: 'npm run dev:test',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
})
