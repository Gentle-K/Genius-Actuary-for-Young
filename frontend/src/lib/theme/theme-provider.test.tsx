import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ThemeProvider } from '@/lib/theme/theme-provider'
import { useAppStore } from '@/lib/store/app-store'

describe('ThemeProvider', () => {
  beforeEach(() => {
    useAppStore.setState({
      themeMode: 'system',
      resolvedTheme: 'dark',
      locale: 'zh-HK',
      displayDensity: 'cozy',
      apiMode: 'mock',
      sidebarOpen: true,
      accessToken: null,
      refreshToken: null,
      currentUser: null,
      walletAddress: '',
      walletChainId: null,
    })

    window.matchMedia = ((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
  })

  afterEach(() => {
    cleanup()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-themePreference')
    document.documentElement.removeAttribute('data-locale')
    document.documentElement.removeAttribute('lang')
  })

  it('resolves system theme and locale onto the document root', async () => {
    render(
      <ThemeProvider>
        <div>theme probe</div>
      </ThemeProvider>,
    )

    await waitFor(() => {
      expect(document.documentElement.dataset['theme']).toBe('dark')
      expect(document.documentElement.dataset['themePreference']).toBe('system')
      expect(document.documentElement.dataset['locale']).toBe('zh-HK')
      expect(document.documentElement.lang).toBe('zh-HK')
      expect(document.documentElement.style.colorScheme).toBe('dark')
      expect(useAppStore.getState().resolvedTheme).toBe('dark')
    })
  })

  it('updates the color scheme when an explicit light theme is selected', async () => {
    useAppStore.setState({
      themeMode: 'light',
      resolvedTheme: 'dark',
      locale: 'en',
      displayDensity: 'cozy',
      apiMode: 'mock',
      sidebarOpen: true,
      accessToken: null,
      refreshToken: null,
      currentUser: null,
      walletAddress: '',
      walletChainId: null,
    })

    render(
      <ThemeProvider>
        <div>theme probe</div>
      </ThemeProvider>,
    )

    await waitFor(() => {
      expect(document.documentElement.dataset['theme']).toBe('light')
      expect(document.documentElement.dataset['themePreference']).toBe('light')
      expect(document.documentElement.style.colorScheme).toBe('light')
      expect(useAppStore.getState().resolvedTheme).toBe('light')
    })
  })
})
