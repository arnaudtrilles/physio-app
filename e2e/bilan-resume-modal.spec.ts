import { test, expect } from '@playwright/test'

// Régression : un bilan avec `contrat.objectifs` en Array (shape produite par
// BilanGenou/Cheville/Hanche/Generique/Geriatrique/Cervical/Lombaire) faisait
// crasher extractSummary (`.trim()` sur non-string), unmount tout le tree React
// et donnait une page blanche au clic sur "Résumé".
const BUGGY_DB = [
  {
    id: 99, nom: 'TESTBUG', prenom: 'Patient', dateNaissance: '01/01/1980',
    dateBilan: '07/05/2026', zoneCount: 1, evn: 5, zone: 'Genou Droit',
    pathologie: '—', avatarBg: '#666', bilanType: 'genou',
    status: 'complet', sexe: 'masculin',
    bilanData: {
      douleur: { evnPire: 7, evnMoy: 4, douleurType: 'mécanique' },
      contrat: {
        objectifs: [
          { id: 1, titre: 'Reprendre la course', cible: '5 km', dateCible: '2026-07-01' },
          { id: 2, titre: 'Disparition douleur', cible: 'EVN < 2', dateCible: '2026-06-15' },
        ],
        autoReeducation: 'oui',
        frequenceDuree: '3x/semaine',
      },
    },
  },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript((seed) => {
    localStorage.setItem('physio_tutorial_done', 'true')
    sessionStorage.setItem('splash_ts', Date.now().toString())
    localStorage.setItem('physio_db', JSON.stringify(seed))
  }, BUGGY_DB)
})

test('Résumé d\'un bilan avec objectifs en Array ne crash pas (page blanche)', async ({ page }) => {
  const errs: string[] = []
  page.on('pageerror', (e) => errs.push('PAGEERR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()) })

  await page.goto('/')
  await page.waitForTimeout(800)

  await page.getByRole('button', { name: /Mes patients/i }).first().click()
  await page.waitForTimeout(500)

  await page.getByText(/TESTBUG Patient/i).first().click()
  await page.waitForTimeout(500)

  const bilanTile = page.getByText(/Bilan n°1/i).first()
  await bilanTile.scrollIntoViewIfNeeded()
  await bilanTile.click()
  await page.waitForTimeout(400)

  const resumeBtn = page.getByRole('button', { name: /^Résumé$/ })
  await expect(resumeBtn).toBeVisible({ timeout: 4000 })
  await resumeBtn.click()
  await page.waitForTimeout(500)

  await expect(page.getByText(/Résumé · Bilan N°1/i)).toBeVisible()
  await expect(page.getByText(/Reprendre la course/i)).toBeVisible()

  const fatal = errs.filter(e => !/Failed to load resource|favicon|manifest|service.?worker/i.test(e))
  expect(fatal, `erreurs console inattendues:\n${fatal.join('\n')}`).toEqual([])
})
