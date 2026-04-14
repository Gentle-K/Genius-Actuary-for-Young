import { expect, test } from '@playwright/test'

import { primeMockAppState, primeRestAppState } from '../utils/mock-app'

test.setTimeout(60_000)

test('locale switcher stays synchronized with settings and document title', async ({ page }) => {
  await primeMockAppState(page)

  await page.goto('/settings')

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.locator('select').first()).toHaveValue('en')
  await page.getByRole('button', { name: 'Traditional Chinese (Hong Kong)' }).click()

  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()
  await expect(page.locator('select').first()).toHaveValue('zh-HK')
  await expect(page).toHaveTitle(/設定 · Genius Actuary/)

  const zhHkText = await page.locator('body').innerText()
  expect(zhHkText).toContain('設定')
  expect(zhHkText).not.toContain('Log out')

  await page.getByRole('button', { name: /English|英語|英文/ }).click()

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.locator('select').first()).toHaveValue('en')
  await expect(page).toHaveTitle(/Settings · Genius Actuary/)

  const englishText = await page.locator('body').innerText()
  expect(englishText).toContain('Settings')
  expect(englishText).not.toContain('登出')
})

test('disconnect wallet preserves the authenticated session and clears wallet state', async ({ page }) => {
  await primeMockAppState(page, {
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    walletChainId: 133,
  })

  await page.goto('/settings')
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Disconnect wallet' }).click()

  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByText('Wallet disconnected')).toBeVisible()

  const persistedState = await page.evaluate(() => {
    const raw = window.localStorage.getItem('genius-actuary-store')
    return raw ? JSON.parse(raw) : null
  })

  expect(persistedState?.state?.accessToken).toBeTruthy()
  expect(persistedState?.state?.currentUser?.id).toBe('browser-e2e')
  expect(persistedState?.state?.walletAddress).toBe('')
  expect(persistedState?.state?.walletChainId).toBeNull()
})

test('log out clears auth state, removes ga-* drafts, and redirects to login', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('ga-sensitive-draft', 'draft')
  })
  await primeMockAppState(page)

  await page.goto('/settings')
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Continue to your workspace' })).toBeVisible()

  const persistedState = await page.evaluate(() => {
    const raw = window.localStorage.getItem('genius-actuary-store')
    return raw ? JSON.parse(raw) : null
  })

  expect(persistedState?.state?.accessToken).toBeNull()
  expect(persistedState?.state?.refreshToken).toBeNull()
  expect(persistedState?.state?.currentUser).toBeNull()

  const staleDraft = await page.evaluate(() => window.localStorage.getItem('ga-sensitive-draft'))
  expect(staleDraft).toBeNull()

  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
})

test('logout failure surfaces an error and keeps the current session intact', async ({ page }) => {
  await page.route('**/api/auth/logout', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'forced logout failure' }),
    })
  })

  await primeRestAppState(page, {
    accessToken: 'cookie_session',
    refreshToken: 'cookie_session',
    currentUser: {
      id: 'rest-e2e',
      name: 'REST E2E User',
      email: 'rest@browser.local',
      title: 'Browser-linked account',
      locale: 'en',
      roles: ['analyst'],
      lastActiveAt: new Date().toISOString(),
    },
  })

  await page.goto('/settings')
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()

  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByText('Log out failed.')).toBeVisible()

  const persistedState = await page.evaluate(() => {
    const raw = window.localStorage.getItem('genius-actuary-store')
    return raw ? JSON.parse(raw) : null
  })

  expect(persistedState?.state?.accessToken).toBe('cookie_session')
  expect(persistedState?.state?.currentUser?.id).toBe('rest-e2e')
})

test('network logout failure falls back to a local sign-out and clears browser state', async ({ page }) => {
  await page.route('**/api/auth/logout', async (route) => {
    await route.abort()
  })

  await page.addInitScript(() => {
    window.localStorage.setItem('ga-sensitive-draft', 'draft')
  })

  await primeRestAppState(page, {
    accessToken: 'cookie_session',
    refreshToken: 'cookie_session',
    currentUser: {
      id: 'rest-e2e',
      name: 'REST E2E User',
      email: 'rest@browser.local',
      title: 'Browser-linked account',
      locale: 'en',
      roles: ['analyst'],
      lastActiveAt: new Date().toISOString(),
    },
  })

  await page.goto('/settings')
  await page.getByRole('button', { name: 'Account menu' }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Continue to your workspace' })).toBeVisible()

  const persistedState = await page.evaluate(() => {
    const raw = window.localStorage.getItem('genius-actuary-store')
    return raw ? JSON.parse(raw) : null
  })

  expect(persistedState?.state?.accessToken).toBeNull()
  expect(persistedState?.state?.refreshToken).toBeNull()
  expect(persistedState?.state?.currentUser).toBeNull()
  expect(await page.evaluate(() => window.localStorage.getItem('ga-sensitive-draft'))).toBeNull()
})

test('theme buttons stay synchronized with the applied theme and light controls no longer keep dark surfaces', async ({ page }) => {
  await primeMockAppState(page, {
    themeMode: 'light',
    resolvedTheme: 'light',
  })

  await page.goto('/settings')

  const lightButton = page.getByRole('button', { name: 'Light' })
  const darkButton = page.getByRole('button', { name: 'Dark' })
  const firstSelectButton = page.locator('button[aria-haspopup="listbox"]').first()

  await lightButton.click()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(lightButton).toHaveAttribute('aria-pressed', 'true')
  await expect(darkButton).toHaveAttribute('aria-pressed', 'false')

  const lightControlBackground = await firstSelectButton.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  )
  expect(lightControlBackground).not.toContain('19, 34, 58')

  await darkButton.click()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(darkButton).toHaveAttribute('aria-pressed', 'true')
  await expect(lightButton).toHaveAttribute('aria-pressed', 'false')
})

test('reports page suppresses a duplicate eyebrow when it matches the title', async ({ page }) => {
  await primeMockAppState(page, {
    locale: 'zh-CN',
    currentUser: {
      id: 'browser-e2e',
      name: 'E2E User',
      email: 'e2e@browser.local',
      title: 'Browser-linked account',
      locale: 'zh-CN',
      roles: ['analyst'],
      lastActiveAt: new Date().toISOString(),
    },
  })

  await page.goto('/reports')

  await expect(page.locator('h1').filter({ hasText: '报告' })).toBeVisible()
  await expect(page.locator('.apple-kicker').filter({ hasText: '报告' })).toHaveCount(0)
})
