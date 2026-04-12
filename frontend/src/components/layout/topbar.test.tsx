import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Topbar } from '@/components/layout/topbar'
import { apiClient } from '@/lib/api/client'
import { renderWithAppState } from '@/tests/test-utils'

describe('Topbar', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the workspace title and action buttons without hitting the backend bootstrap endpoint', async () => {
    const requestSpy = vi.spyOn(apiClient, 'request')

    renderWithAppState(<Topbar />, {
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
    })

    expect(await screen.findByText('Workspace')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(await screen.findByText('Casey Analyst')).toBeInTheDocument()
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('shows the default workspace copy when no current user is loaded', async () => {
    renderWithAppState(<Topbar />, { apiMode: 'mock', locale: 'en' })

    expect(await screen.findByRole('heading', { name: 'Genius Actuary' })).toBeInTheDocument()
    expect(screen.getByText('AI decision analysis workspace.')).toBeInTheDocument()
    expect(screen.getByText('Demo analyst')).toBeInTheDocument()
  })
})
