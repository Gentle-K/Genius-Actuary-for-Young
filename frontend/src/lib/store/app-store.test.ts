import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useAppStore } from '@/lib/store/app-store'

const initialState = {
  themeMode: 'system' as const,
  resolvedTheme: 'dark' as const,
  locale: 'en' as const,
  displayDensity: 'cozy' as const,
  apiMode: 'mock' as const,
  sidebarOpen: true,
  accessToken: null,
  refreshToken: null,
  currentUser: null,
  walletAddress: '',
  walletChainId: null,
}

function clearPersistedStore() {
  window.localStorage.removeItem('genius-actuary-store')
}

describe('app-store', () => {
  beforeEach(() => {
    clearPersistedStore()
    useAppStore.setState(initialState)
  })

  afterEach(() => {
    clearPersistedStore()
    useAppStore.setState(initialState)
  })

  it('normalizes legacy locale values when syncing settings', () => {
    useAppStore.getState().syncFromSettings({
      themeMode: 'light',
      language: 'zh' as never,
      apiMode: 'mock',
      displayDensity: 'cozy',
      notificationsEmail: true,
      notificationsPush: false,
      autoExportPdf: false,
      chartMotion: true,
    })

    expect(useAppStore.getState().themeMode).toBe('light')
    expect(useAppStore.getState().locale).toBe('zh-CN')
  })

  it('rehydrates persisted locale and current user locale through normalization', async () => {
    window.localStorage.setItem(
      'genius-actuary-store',
      JSON.stringify({
        state: {
          ...initialState,
          locale: 'zh',
          currentUser: {
            id: 'user-1',
            name: 'Ada',
            email: 'ada@example.com',
            title: 'Analyst',
            locale: 'zh',
            roles: ['analyst'],
            lastActiveAt: '2026-04-14T00:00:00Z',
          },
        },
        version: 0,
      }),
    )

    await useAppStore.persist.rehydrate()

    expect(useAppStore.getState().locale).toBe('zh-CN')
    expect(useAppStore.getState().currentUser?.locale).toBe('zh-CN')
  })
})
