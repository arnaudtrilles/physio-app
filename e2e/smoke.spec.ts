import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('physio_tutorial_done', 'true')
    sessionStorage.setItem('splash_ts', Date.now().toString())
  })
})

test('app boots to dashboard without crashing', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })

  await page.goto('/')

  await expect(page.getByText(/Bonjour/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Nouveau patient/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Mes patients/i })).toBeVisible()

  const fatal = errors.filter(e => !/Failed to load resource|favicon|manifest|service.?worker/i.test(e))
  expect(fatal, `unexpected console errors: ${fatal.join('\n')}`).toEqual([])
})

test('patient creation wizard reaches general info step', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /Nouveau patient/i }).first().click()

  await expect(page.getByRole('heading', { name: /Identité du patient/i })).toBeVisible()

  await page.getByPlaceholder(/Ex: Dupont/i).fill('Test')
  await page.getByPlaceholder(/Ex: Jean/i).fill('Patient')
  await page.locator('input[type="date"]').fill('1980-06-15')
  await page.getByRole('button', { name: /^Masculin$/ }).click()

  await page.getByRole('button', { name: /Sélectionner une zone/i }).click()
  await page.getByRole('button', { name: /^Genou$/ }).click()

  const nextBtn = page.getByRole('button', { name: /Étape suivante/i })
  await expect(nextBtn).toBeEnabled()
  await nextBtn.click()

  await expect(page.getByRole('heading', { name: /Infos générales/i })).toBeVisible()
  await expect(page.getByPlaceholder(/Employé de bureau/i)).toBeVisible()

  const startBtn = page.getByRole('button', { name: /Commencer le bilan/i })
  await expect(startBtn).toBeVisible()
  await expect(startBtn).toBeEnabled()
})
