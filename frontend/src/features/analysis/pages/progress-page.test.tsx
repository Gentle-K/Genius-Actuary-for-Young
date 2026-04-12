import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProgressPage } from '@/features/analysis/pages/progress-page'
import { renderWithAppState } from '@/tests/test-utils'

const getProgress = vi.fn()
const getById = vi.fn()

vi.mock('@/lib/api/use-api-adapter', () => ({
  useApiAdapter: () => ({
    analysis: {
      getById,
      getProgress,
    },
  }),
}))

describe('ProgressPage', () => {
  beforeEach(() => {
    getProgress.mockReset()
    getById.mockReset()
    getById.mockResolvedValue({
      id: 'sess-progress-1',
      mode: 'multi-option',
      problemStatement: 'Should I switch jobs now?',
      status: 'ANALYZING',
      createdAt: '2026-04-11T08:00:00Z',
      updatedAt: '2026-04-11T09:00:00Z',
      lastInsight: 'Waiting for more evidence on compensation and downside.',
      intakeContext: {
        investmentAmount: 10000,
        baseCurrency: 'USD',
        preferredAssetIds: [],
        holdingPeriodDays: 180,
        riskTolerance: 'balanced',
        liquidityNeed: 't_plus_3',
        minimumKycLevel: 0,
        wantsOnchainAttestation: false,
      },
      questions: [{ id: 'q1', answered: true }, { id: 'q2', answered: false }],
      answers: [],
      searchTasks: [],
      evidence: [{ id: 'e1' }],
      conclusions: [],
      calculations: [{ id: 'c1' }],
      chartTasks: [],
      chartArtifacts: [],
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the current focus, worklog, and live metrics', async () => {
    getProgress.mockResolvedValue({
      sessionId: 'sess-progress-1',
      status: 'ANALYZING',
      overallProgress: 60,
      currentStepLabel: 'Search evidence',
      activityStatus: 'searching_web_for_evidence',
      currentFocus: 'Comparing compensation, skill acceleration, and downside risk across the options.',
      lastStopReason: 'Waiting for the evidence batch to finish.',
      stages: [
        { id: 'clarify', title: 'Clarify', description: 'Clarify inputs', status: 'completed' },
      ],
      pendingSearchTasks: [
        {
          id: 's1',
          sessionId: 'sess-progress-1',
          topic: 'Compensation benchmarks',
          goal: '',
          scope: '',
          suggestedQueries: [],
          requiredFields: [],
          freshnessRequirement: 'high',
          status: 'running',
        },
      ],
      pendingCalculationTasks: [],
      pendingChartTasks: [],
    })

    renderWithAppState(
      <Routes>
        <Route path="/sessions/:sessionId/analyzing" element={<ProgressPage />} />
      </Routes>,
      { route: '/sessions/sess-progress-1/analyzing', locale: 'en', apiMode: 'rest' },
    )

    expect(await screen.findByRole('heading', { name: 'Analysis in progress' })).toBeInTheDocument()
    expect(
      screen.getAllByText(
        'Comparing compensation, skill acceleration, and downside risk across the options.',
      ),
    ).toHaveLength(2)
    expect(screen.getByText('Waiting for the evidence batch to finish.')).toBeInTheDocument()
    expect(screen.getByText('Questions answered')).toBeInTheDocument()
    expect(screen.getByText('Compensation benchmarks')).toBeInTheDocument()
  })

  it('shows a retryable error state when the progress API fails', async () => {
    const user = userEvent.setup()
    getProgress.mockRejectedValueOnce(new Error('timeout'))
    getProgress.mockResolvedValueOnce({
      sessionId: 'sess-progress-1',
      status: 'FAILED',
      overallProgress: 35,
      currentStepLabel: 'Report failed',
      errorMessage: 'The backend timed out.',
      stages: [],
    })

    renderWithAppState(
      <Routes>
        <Route path="/sessions/:sessionId/analyzing" element={<ProgressPage />} />
      </Routes>,
      { route: '/sessions/sess-progress-1/analyzing', locale: 'en', apiMode: 'rest' },
    )

    expect(
      await screen.findByRole('heading', { name: 'Could not load analysis progress' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => {
      expect(getProgress).toHaveBeenCalledTimes(2)
    })
  })
})
