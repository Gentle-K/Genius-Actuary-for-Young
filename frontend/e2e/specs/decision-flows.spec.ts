import { expect, test } from '@playwright/test'

import { decisionScenarios } from '../fixtures/decision-scenarios'
import { primeMockAppState } from '../utils/mock-app'

test.setTimeout(60_000)

test('desktop demo flow reaches the live analysis progress workspace', async ({ page }) => {
  const scenario = decisionScenarios[0]

  await page.goto('/login')

  await expect(
    page.getByRole('heading', { name: 'Continue to your workspace' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Open demo workspace' }).click()

  await expect(page).toHaveURL(/\/new-analysis$/)
  await expect(
    page.getByRole('heading', { name: 'Start a new analysis' }),
  ).toBeVisible()

  await page.getByLabel('Decision brief').fill(scenario.problem)
  await page.getByRole('button', { name: 'Create session' }).click()

  await expect(page).toHaveURL(/\/sessions\/[^/]+\/clarify/)
  await expect(page.getByText('Round progress')).toBeVisible()
  const markUncertainButtons = page.getByRole('button', { name: 'Mark uncertain' })
  const unansweredCount = await markUncertainButtons.count()

  for (let index = 0; index < unansweredCount; index += 1) {
    await markUncertainButtons.nth(index).click()
  }

  await page.getByRole('button', { name: 'Continue analysis' }).first().click()

  await expect(page).toHaveURL(/\/sessions\/[^/]+\/analyzing/)
  await expect(
    page.getByRole('heading', { name: 'Analysis in progress' }),
  ).toBeVisible()

  await expect(
    page.getByRole('heading', { name: 'Progress stepper' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Worklog' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Current status' })).toBeVisible()
})

test('mobile release flow exposes drawer navigation, filters, detail drawers, and report jump menus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await primeMockAppState(page, { sidebarOpen: false })

  await page.goto('/new-analysis')
  const topbarExpandButton = page
    .getByRole('banner')
    .getByRole('button', { name: 'Open navigation' })

  await expect(topbarExpandButton).toBeVisible()
  await topbarExpandButton.click()
  await expect(page.getByText('Genius Actuary')).toBeVisible()
  await page.locator('button[aria-label="Close navigation"]').first().click({ force: true })

  await page.goto('/evidence')
  await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible()
  await page.getByRole('button', { name: 'Filters' }).click()
  await expect(page.getByRole('heading', { name: 'Filters' })).toBeVisible()
  await page.getByRole('button', { name: 'Apply filters' }).click()

  await page.getByRole('button', { name: 'View details' }).first().click()
  const detailDrawer = page.getByRole('dialog')
  await expect(detailDrawer.getByText('Usage and freshness')).toBeVisible()
  await detailDrawer.getByRole('button', { name: 'Close' }).click()

  await page.goto('/reports')
  await page.getByRole('button', { name: 'View full report' }).first().click()
  await expect(page.getByText('Jump to section')).toBeVisible()
  await page.locator('select[aria-hidden="true"]').first().evaluate((element) => {
    const select = element as HTMLSelectElement
    select.value = 'unknowns'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await expect(page).toHaveURL(/#unknowns$/)
})
