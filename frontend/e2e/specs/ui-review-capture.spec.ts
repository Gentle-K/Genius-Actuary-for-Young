import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test, type Page } from '@playwright/test'

import { primeMockAppState } from '../utils/mock-app'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..', '..')
const assetRoot = path.join(repoRoot, 'asset', 'ui-review')
const desktopDir = path.join(assetRoot, 'desktop')
const mobileDir = path.join(assetRoot, 'mobile')

test.setTimeout(120_000)

function ensureDirs() {
  fs.mkdirSync(desktopDir, { recursive: true })
  fs.mkdirSync(mobileDir, { recursive: true })
}

async function stabilizePage(page: Page) {
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
    `,
  })
}

async function captureRoute(
  page: Page,
  options: {
    route: string
    filePath: string
    heading?: string
    fullPage?: boolean
  },
) {
  await page.goto(options.route)

  if (options.heading) {
    await expect(page.getByRole('heading', { name: options.heading }).first()).toBeVisible()
  } else {
    await expect(page.locator('h1').first()).toBeVisible()
  }

  await stabilizePage(page)
  await page.screenshot({
    path: options.filePath,
    fullPage: options.fullPage ?? true,
  })
}

async function captureCurrentPage(
  page: Page,
  options: {
    filePath: string
    heading?: string
    fullPage?: boolean
  },
) {
  if (options.heading) {
    await expect(page.getByRole('heading', { name: options.heading }).first()).toBeVisible()
  } else {
    await expect(page.locator('h1').first()).toBeVisible()
  }

  await stabilizePage(page)
  await page.screenshot({
    path: options.filePath,
    fullPage: options.fullPage ?? true,
  })
}

test('capture frontend UI review screenshots into asset folder', async ({ page, browser }) => {
  ensureDirs()

  const darkState = {
    themeMode: 'dark',
    resolvedTheme: 'dark',
    locale: 'en',
    apiMode: 'mock',
  }
  const lightState = {
    ...darkState,
    themeMode: 'light',
    resolvedTheme: 'light',
  }

  await captureRoute(page, {
    route: '/login',
    heading: 'Continue to your workspace',
    filePath: path.join(desktopDir, '01-login.png'),
  })

  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  await page.context().clearCookies()
  await primeMockAppState(page, darkState)

  await captureRoute(page, {
    route: '/new-analysis',
    heading: 'Start a new analysis',
    filePath: path.join(desktopDir, '02-new-analysis.png'),
  })

  await page.getByLabel('Decision brief').fill(
    'Build a balanced 30 day HashKey Chain RWA demo allocation with a clear execution path.',
  )
  await page.getByRole('button', { name: 'Create session' }).click()
  await expect(page).toHaveURL(/\/sessions\/[^/]+\/clarify$/)
  const createdSessionId = page.url().match(/\/sessions\/([^/]+)\/clarify$/)?.[1] ?? ''
  expect(createdSessionId).toBeTruthy()
  await expect(page.getByText('Round progress')).toBeVisible()
  await captureCurrentPage(page, {
    filePath: path.join(desktopDir, '06-clarification.png'),
  })

  const markUncertainButtons = page.getByRole('button', { name: 'Mark uncertain' })
  const unansweredCount = await markUncertainButtons.count()
  for (let index = 0; index < unansweredCount; index += 1) {
    await markUncertainButtons.nth(index).click()
  }
  await page.getByRole('button', { name: 'Continue analysis' }).first().click()
  await expect(page).toHaveURL(new RegExp(`/reports/${createdSessionId}$`), {
    timeout: 20_000,
  })
  await captureCurrentPage(page, {
    filePath: path.join(desktopDir, '08-report-detail.png'),
  })

  const desktopShots = [
    { route: '/assets', heading: 'HashKey RWA Asset Hub', file: '03-assets-hub.png' },
    { route: '/assets/hsk-usdc/proof', heading: 'HashKey USDC', file: '04-asset-proof.png' },
    { route: '/sessions', heading: 'Sessions', file: '05-sessions.png' },
    { route: '/reports', heading: 'Reports', file: '07-reports.png' },
    {
      route: '/portfolio/0x1234567890abcdef1234567890abcdef12345678',
      heading: 'HashKey RWA Portfolio',
      file: '10-portfolio.png',
    },
    { route: '/evidence', heading: 'Evidence Library', file: '11-evidence.png' },
    { route: '/calculations', heading: 'Calculations', file: '12-calculations.png' },
    { route: '/settings', heading: 'Settings', file: '13-settings-dark.png' },
    { route: '/stocks', heading: 'Trading Cockpit', file: '14-stocks-cockpit.png' },
    {
      route: '/stocks/candidates?mode=paper',
      heading: 'Candidates',
      file: '15-stocks-candidates.png',
    },
    {
      route: '/stocks/orders?mode=paper',
      heading: 'Orders & Positions',
      file: '16-stocks-orders.png',
    },
    {
      route: '/stocks/settings?mode=paper',
      heading: 'Stocks Settings',
      file: '17-stocks-settings-dark.png',
    },
  ] as const

  for (const shot of desktopShots) {
    await captureRoute(page, {
      route: shot.route,
      heading: shot.heading,
      filePath: path.join(desktopDir, shot.file),
    })
  }

  const demoExecutionPage = await browser.newPage()
  await demoExecutionPage.goto('/login')
  await demoExecutionPage.getByRole('button', { name: 'Open demo workspace' }).click()
  await expect(demoExecutionPage).toHaveURL(/\/new-analysis$/)
  await demoExecutionPage.getByLabel('Decision brief').fill(
    'Build a balanced 30 day HashKey Chain RWA demo allocation with a clear execution path.',
  )
  await demoExecutionPage.getByRole('button', { name: 'Create session' }).click()
  await expect(demoExecutionPage).toHaveURL(/\/sessions\/[^/]+\/clarify$/)
  const demoExecutionSessionId =
    demoExecutionPage.url().match(/\/sessions\/([^/]+)\/clarify$/)?.[1] ?? ''
  expect(demoExecutionSessionId).toBeTruthy()
  const demoMarkUncertainButtons = demoExecutionPage.getByRole('button', { name: 'Mark uncertain' })
  const demoUnansweredCount = await demoMarkUncertainButtons.count()
  for (let index = 0; index < demoUnansweredCount; index += 1) {
    await demoMarkUncertainButtons.nth(index).click()
  }
  await demoExecutionPage.getByRole('button', { name: 'Continue analysis' }).first().click()
  await expect(demoExecutionPage).toHaveURL(new RegExp(`/reports/${demoExecutionSessionId}$`), {
    timeout: 20_000,
  })
  await demoExecutionPage.goto(`/sessions/${demoExecutionSessionId}/execute`)
  await expect(
    demoExecutionPage.getByRole('button', { name: 'Generate submit receipt' }),
  ).toBeVisible()
  await stabilizePage(demoExecutionPage)
  await demoExecutionPage.screenshot({
    path: path.join(desktopDir, '09-execution.png'),
    fullPage: true,
  })
  await demoExecutionPage.close()

  const lightPage = await browser.newPage()
  await primeMockAppState(lightPage, lightState)
  await captureRoute(lightPage, {
    route: '/settings',
    heading: 'Settings',
    filePath: path.join(desktopDir, '18-settings-light.png'),
  })
  await captureRoute(lightPage, {
    route: '/stocks/settings?mode=paper',
    heading: 'Stocks Settings',
    filePath: path.join(desktopDir, '19-stocks-settings-light.png'),
  })
  await lightPage.close()

  const mobilePage = await browser.newPage({
    viewport: { width: 393, height: 1200 },
    screen: { width: 393, height: 1200 },
  })
  await primeMockAppState(mobilePage, darkState)

  const mobileShots = [
    {
      route: '/new-analysis',
      heading: 'Start a new analysis',
      file: '01-new-analysis-mobile.png',
    },
    {
      route: '/reports/sess-exchange',
      heading: 'Should I join a study abroad exchange in year 3?',
      file: '02-report-detail-mobile.png',
    },
    {
      route: '/stocks?mode=paper',
      heading: 'Trading Cockpit',
      file: '03-stocks-cockpit-mobile.png',
    },
    {
      route: '/stocks/settings?mode=paper',
      heading: 'Stocks Settings',
      file: '04-stocks-settings-mobile.png',
    },
  ] as const

  for (const shot of mobileShots) {
    await captureRoute(mobilePage, {
      route: shot.route,
      heading: shot.heading,
      filePath: path.join(mobileDir, shot.file),
    })
  }

  await mobilePage.close()
})
