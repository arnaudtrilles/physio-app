import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('physio_tutorial_done', 'true')
    sessionStorage.setItem('splash_ts', Date.now().toString())
  })
})

test('letter form: Brouillon and Confectionner buttons work', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`) })

  await page.goto('/')

  // 1. Open patient database
  await page.getByRole('button', { name: /Mes patients/i }).first().click()

  // 2. Click on first patient (BERGER Thomas from DEMO)
  await page.getByText(/BERGER/i).first().click()

  // 3. Click "Consultation du jour" CTA on PatientHeroCard
  await page.getByRole('button', { name: /Consultation du jour/i }).first().click()

  // 4. ConsultationChooser opens — click "Courrier médecin"
  await page.getByText(/Courrier médecin/i).first().click()

  // 5. If a zone picker shows, pick Épaule (BERGER has shoulder bilan)
  const zoneEpaule = page.getByRole('button', { name: /Épaule/i }).first()
  if (await zoneEpaule.isVisible({ timeout: 2000 }).catch(() => false)) {
    await zoneEpaule.click()
  }

  // 6. Phase 'select' — pick "Fin de prise en charge"
  await page.getByText(/Fin de prise en charge/i).first().click()

  // 7. Phase 'form' — find footer buttons
  const brouillonBtn = page.getByRole('button', { name: /^Brouillon$/i })
  const confectionnerBtn = page.getByRole('button', { name: /Confectionner le courrier/i })

  await expect(brouillonBtn).toBeVisible({ timeout: 5000 })
  await expect(confectionnerBtn).toBeVisible({ timeout: 5000 })

  await expect(brouillonBtn).toBeEnabled()
  await expect(confectionnerBtn).toBeEnabled()

  // 8. Click Brouillon — should trigger toast "Brouillon enregistré"
  await brouillonBtn.click()
  await expect(page.getByText(/Brouillon enregistré/i)).toBeVisible({ timeout: 3000 })

  const fatal = errors.filter(e => !/Failed to load resource|favicon|manifest|service.?worker/i.test(e))
  expect(fatal, `unexpected errors: ${fatal.join('\n')}`).toEqual([])
})
