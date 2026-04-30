/**
 * Persona — Kiné FR, bilan Lombaire vocal
 *
 * Workflow simulé :
 *   1. Boot app, dismiss tutoriel/splash
 *   2. Créer un nouveau patient (Marie Dupont, 45 ans, F, zone Lombaire)
 *   3. Avancer dans le wizard jusqu'au bilan
 *   4. Basculer sur l'onglet "🎙 Vocal"
 *   5. Vérifier que la zone d'enregistrement (ou état idle) s'affiche
 *   6. Capturer screenshots à chaque étape
 *   7. Surveiller console errors / pageerror — flag tout
 *
 * Limitation : on ne pilote PAS le micro réel. La validation de la transcription
 * + persistence des sections vocales est testée par les charters Tier 1 (lecture
 * de code) et par les e2e signés `e2e/`.
 *
 * But : détecter régressions UX visibles à l'œil — boutons cassés, layout
 * mobile qui déborde, sections invisibles, erreurs silencieuses dans la console.
 */
import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const STAMP = new Date().toISOString().replace(/[:.]/g, '-')
const OUT_DIR = path.resolve(HERE, '..', 'reports', STAMP, 'kine-fr-lombaire-vocal')

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true })
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('physio_tutorial_done', 'true')
    sessionStorage.setItem('splash_ts', Date.now().toString())
  })
})

test('persona: kiné FR ouvre un bilan Lombaire et bascule vocal', async ({ page }) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []

  page.on('pageerror', (err) => pageErrors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  // Étape 1 — boot
  await page.goto('/')
  await page.screenshot({ path: path.join(OUT_DIR, '01-dashboard.png'), fullPage: true })

  await expect(page.getByText(/Bonjour/i)).toBeVisible()

  // Étape 2 — créer patient
  await page.getByRole('button', { name: /Nouveau patient/i }).first().click()
  await expect(page.getByRole('heading', { name: /Identité du patient/i })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, '02-identity.png'), fullPage: true })

  await page.getByPlaceholder(/Ex: Dupont/i).fill('Dupont')
  await page.getByPlaceholder(/Ex: Jean/i).fill('Marie')
  await page.locator('input[type="date"]').first().fill('1980-06-15')
  await page.getByRole('button', { name: /^Féminin$/ }).click()

  await page.getByRole('button', { name: /Sélectionner une zone/i }).click()
  await page.getByRole('button', { name: /^Lombaire$/ }).click()

  const nextBtn = page.getByRole('button', { name: /Étape suivante/i })
  await expect(nextBtn).toBeEnabled()
  await nextBtn.click()

  // Étape 3 — bilan ouvert
  await expect(page.getByRole('button', { name: /Infos générales/i })).toBeVisible()
  await page.screenshot({ path: path.join(OUT_DIR, '03-bilan-noyau.png'), fullPage: true })

  // Étape 4 — bascule vocal
  const vocalTab = page.getByRole('button', { name: /🎙\s*Vocal/i })
  await expect(vocalTab).toBeVisible()
  await vocalTab.click()

  // Étape 5 — vérifier UI vocal (état idle ou recording)
  // L'état "idle" affiche soit un bouton de démarrage d'enregistrement, soit
  // un texte d'introduction. Sans mic réel, on s'arrête là — on capture juste
  // le rendu pour eval visuel.
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUT_DIR, '04-vocal-tab.png'), fullPage: true })

  // Tap target audit — boutons visibles dans le viewport doivent faire ≥ 40px
  const buttons = await page.getByRole('button').all()
  const tooSmall: string[] = []
  for (const btn of buttons) {
    const visible = await btn.isVisible().catch(() => false)
    if (!visible) continue
    const box = await btn.boundingBox().catch(() => null)
    if (!box) continue
    if (box.height < 40 || box.width < 40) {
      const label = (await btn.textContent().catch(() => null)) ?? '(no label)'
      tooSmall.push(`${label.trim().slice(0, 40)} → ${Math.round(box.width)}×${Math.round(box.height)}`)
    }
  }
  if (tooSmall.length > 0) {
    console.warn('[persona] tap targets sous-dimensionnés:\n  - ' + tooSmall.slice(0, 10).join('\n  - '))
  }

  // Étape 6 — assertions finales
  const fatal = [...pageErrors, ...consoleErrors].filter(
    (e) => !/Failed to load resource|favicon|manifest|service.?worker|Microphone/i.test(e),
  )
  expect(fatal, `erreurs console inattendues:\n${fatal.join('\n')}`).toEqual([])
})
