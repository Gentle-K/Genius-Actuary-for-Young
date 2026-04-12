import type { Page } from '@playwright/test'


export async function primeMockAppState(
  page: Page,
  stateOverrides: Record<string, unknown> = {},
) {
  await page.addInitScript(({ stateOverrides }) => {
    const now = new Date().toISOString()
    const defaultState = {
      themeMode: 'dark',
      resolvedTheme: 'dark',
      locale: 'en',
      displayDensity: 'cozy',
      apiMode: 'mock',
      sidebarOpen: true,
      accessToken: 'mock_cookie_session',
      refreshToken: 'mock_cookie_session',
      currentUser: {
        id: 'browser-e2e',
        name: 'E2E User',
        email: 'e2e@browser.local',
        title: 'Browser-linked account',
        locale: 'en',
        roles: ['analyst'],
        lastActiveAt: now,
      },
      walletAddress: '',
      walletChainId: null,
    }

    window.localStorage.setItem(
      'genius-actuary-store',
      JSON.stringify({
        state: {
          ...defaultState,
          ...stateOverrides,
        },
        version: 0,
      }),
    )
  }, { stateOverrides })
}
