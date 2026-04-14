import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Topbar } from '@/components/layout/topbar'
import { ApiError } from '@/lib/api/client'
import { useAppStore } from '@/lib/store/app-store'
import { renderWithAppState } from '@/tests/test-utils'
import type { SettingsPayload } from '@/types'

const logout = vi.fn()
const listSessions = vi.fn()
const getSettings = vi.fn()
const updateSettings = vi.fn()
const clearBrowserAccount = vi.fn()

vi.mock('@/lib/auth/browser-account', () => ({
  clearBrowserAccount: () => clearBrowserAccount(),
}))

vi.mock('@/lib/api/use-api-adapter', () => ({
  useApiAdapter: () => ({
    auth: {
      logout,
    },
    analysis: {
      list: listSessions,
    },
    settings: {
      get: getSettings,
      update: updateSettings,
    },
  }),
}))

const baseSettings: SettingsPayload = {
  themeMode: 'system',
  language: 'en',
  apiMode: 'mock',
  displayDensity: 'cozy',
  notificationsEmail: true,
  notificationsPush: false,
  autoExportPdf: false,
  chartMotion: true,
}

function clearTestStorage() {
  window.localStorage.removeItem('ga-analysis-draft')
  window.localStorage.removeItem('genius-actuary-store')
}

describe('Topbar', () => {
  beforeEach(() => {
    logout.mockReset()
    listSessions.mockReset()
    getSettings.mockReset()
    updateSettings.mockReset()
    clearBrowserAccount.mockReset()

    logout.mockResolvedValue(undefined)
    listSessions.mockResolvedValue({
      items: [
        {
          id: 'session-1',
          updatedAt: '2026-04-14T10:00:00Z',
        },
      ],
    })
    getSettings.mockResolvedValue(baseSettings)
    updateSettings.mockImplementation(async (payload: SettingsPayload) => payload)
    clearTestStorage()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    clearTestStorage()
  })

  it('renders the global status bar, locale switcher, and account menu', async () => {
    renderWithAppState(
      <Routes>
        <Route path="/portfolio" element={<Topbar />} />
      </Routes>,
      {
        route: '/portfolio',
        apiMode: 'mock',
        locale: 'en',
        currentUser: {
          id: 'user-1',
          name: 'Casey Analyst',
          email: 'casey@example.com',
          title: 'Decision researcher',
          locale: 'en',
          roles: [],
          lastActiveAt: '2026-04-12T00:00:00Z',
        },
      },
    )

    expect(await screen.findByText('Release')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Simplified Chinese')).toBeInTheDocument()
    expect(screen.getByText('Traditional Chinese (Hong Kong)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Account menu' })).toBeInTheDocument()
    expect(screen.getByText('Casey Analyst')).toBeInTheDocument()
    expect(document.title).toBe('Portfolio · Genius Actuary')
  })

  it('syncs the locale switcher through the shared settings store', async () => {
    const user = userEvent.setup()

    renderWithAppState(
      <Routes>
        <Route path="/settings" element={<Topbar />} />
      </Routes>,
      {
        route: '/settings',
        apiMode: 'mock',
        locale: 'en',
      },
    )

    await user.click(await screen.findByRole('button', { name: 'Simplified Chinese' }))

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          ...baseSettings,
          language: 'zh-CN',
        }),
      )
    })

    expect(useAppStore.getState().locale).toBe('zh-CN')
  })

  it('logs out through the account menu and clears local session state', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('ga-analysis-draft', 'sensitive')
    useAppStore.setState({
      walletAddress: '0x1234',
      walletChainId: 133,
    })

    renderWithAppState(
      <Routes>
        <Route path="/portfolio" element={<Topbar />} />
        <Route path="/login" element={<div>login target</div>} />
      </Routes>,
      {
        route: '/portfolio',
        apiMode: 'mock',
        locale: 'en',
        currentUser: {
          id: 'user-1',
          name: 'Casey Analyst',
          email: 'casey@example.com',
          title: 'Decision researcher',
          locale: 'en',
          roles: [],
          lastActiveAt: '2026-04-12T00:00:00Z',
        },
      },
    )

    await user.click(await screen.findByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }))

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1)
      expect(clearBrowserAccount).toHaveBeenCalledTimes(1)
      expect(screen.getByText('login target')).toBeInTheDocument()
    })

    expect(useAppStore.getState().currentUser).toBeNull()
    expect(useAppStore.getState().walletAddress).toBe('')
    expect(window.localStorage.getItem('ga-analysis-draft')).toBeNull()
  })

  it('keeps the app state when logout fails with a server response', async () => {
    const user = userEvent.setup()
    logout.mockRejectedValueOnce(new ApiError('server error', 500))

    renderWithAppState(
      <Routes>
        <Route path="/portfolio" element={<Topbar />} />
      </Routes>,
      {
        route: '/portfolio',
        apiMode: 'mock',
        locale: 'en',
        currentUser: {
          id: 'user-1',
          name: 'Casey Analyst',
          email: 'casey@example.com',
          title: 'Decision researcher',
          locale: 'en',
          roles: [],
          lastActiveAt: '2026-04-12T00:00:00Z',
        },
      },
    )

    await user.click(await screen.findByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }))

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1)
    })

    expect(useAppStore.getState().currentUser?.email).toBe('casey@example.com')
    expect(clearBrowserAccount).not.toHaveBeenCalled()
  })

  it('falls back to local logout when the network request cannot reach the backend', async () => {
    const user = userEvent.setup()
    logout.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    window.localStorage.setItem('ga-analysis-draft', 'sensitive')

    renderWithAppState(
      <Routes>
        <Route path="/portfolio" element={<Topbar />} />
        <Route path="/login" element={<div>login target</div>} />
      </Routes>,
      {
        route: '/portfolio',
        apiMode: 'rest',
        locale: 'en',
        currentUser: {
          id: 'user-1',
          name: 'Casey Analyst',
          email: 'casey@example.com',
          title: 'Decision researcher',
          locale: 'en',
          roles: [],
          lastActiveAt: '2026-04-12T00:00:00Z',
        },
      },
    )

    await user.click(await screen.findByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }))

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1)
      expect(clearBrowserAccount).toHaveBeenCalledTimes(1)
      expect(screen.getByText('login target')).toBeInTheDocument()
    })

    expect(useAppStore.getState().currentUser).toBeNull()
    expect(window.localStorage.getItem('ga-analysis-draft')).toBeNull()
  })
})
