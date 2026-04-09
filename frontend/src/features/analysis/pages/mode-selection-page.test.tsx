import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ModeSelectionPage } from '@/features/analysis/pages/mode-selection-page'
import { renderWithProviders } from '@/tests/test-utils'

describe('ModeSelectionPage', () => {
  it('renders both rebuilt analysis modes from the adapter', async () => {
    renderWithProviders(<ModeSelectionPage />, '/analysis/modes')

    expect(
      await screen.findByRole('heading', { name: '单资产尽调' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: '多资产配置' }),
    ).toBeInTheDocument()
  })
})
