import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SettingsPage } from '@/features/settings/settings-page'
import { useAppStore } from '@/lib/store/app-store'
import { renderWithAppState } from '@/tests/test-utils'
import type { SettingsPayload } from '@/types'

const getSettings = vi.fn()
const updateSettings = vi.fn()
const getProfile = vi.fn()
const deletePersonalData = vi.fn()

vi.mock('@/lib/api/use-api-adapter', () => ({
  useApiAdapter: () => ({
    settings: {
      get: getSettings,
      update: updateSettings,
    },
    profile: {
      get: getProfile,
    },
    auth: {
      deletePersonalData,
    },
  }),
}))

const baseSettings: SettingsPayload = {
  themeMode: 'light',
  language: 'en',
  apiMode: 'mock',
  displayDensity: 'cozy',
  notificationsEmail: true,
  notificationsPush: false,
  autoExportPdf: false,
  chartMotion: true,
}

const baseProfile = {
  id: 'user-1',
  name: 'Casey Analyst',
  email: 'casey@example.com',
  title: 'Decision researcher',
  locale: 'en' as const,
  roles: [],
  lastActiveAt: '2026-04-14T10:00:00Z',
  bio: 'Profile bio',
  timezone: 'Asia/Shanghai',
}

describe('SettingsPage', () => {
  beforeEach(() => {
    getSettings.mockReset()
    updateSettings.mockReset()
    getProfile.mockReset()
    deletePersonalData.mockReset()

    getSettings.mockResolvedValue(baseSettings)
    getProfile.mockResolvedValue(baseProfile)
    updateSettings.mockImplementation(async (payload: SettingsPayload) => payload)
    deletePersonalData.mockResolvedValue({ deletedSessionCount: 0 })

    useAppStore.setState({
      themeMode: 'light',
      resolvedTheme: 'light',
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
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('saves the theme draft only after the operator confirms the settings change', async () => {
    const user = userEvent.setup()

    renderWithAppState(<SettingsPage />, { route: '/settings' })

    const darkButton = await screen.findByRole('button', { name: /Dark/ })
    const lightButton = screen.getByRole('button', { name: /Light/ })

    expect(lightButton).toHaveAttribute('aria-pressed', 'true')
    expect(darkButton).toHaveAttribute('aria-pressed', 'false')

    await user.click(darkButton)
    expect(darkButton).toHaveAttribute('aria-pressed', 'true')
    expect(lightButton).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(useAppStore.getState().themeMode).toBe('dark')
      expect(updateSettings).toHaveBeenCalled()
      expect(updateSettings.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          ...baseSettings,
          themeMode: 'dark',
        }),
      )
    })
  })

  it('rolls the active theme button back when the update fails', async () => {
    const user = userEvent.setup()
    updateSettings.mockRejectedValueOnce(new Error('network down'))

    renderWithAppState(<SettingsPage />, { route: '/settings' })

    const darkButton = await screen.findByRole('button', { name: /Dark/ })

    await user.click(darkButton)
    expect(darkButton).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(useAppStore.getState().themeMode).toBe('light')
      expect(darkButton).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    })
  })
})
