import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AnalysisSessionPage } from '@/features/analysis/pages/analysis-session-page'
import { renderWithAppState } from '@/tests/test-utils'
import type { AnalysisSession } from '@/types'

const getById = vi.fn()
const submitAnswers = vi.fn()

vi.mock('@/lib/api/use-api-adapter', () => ({
  useApiAdapter: () => ({
    analysis: {
      getById,
      submitAnswers,
    },
  }),
}))

function buildSession(): AnalysisSession {
  return {
    id: 'sess-clarify-2',
    mode: 'multi-option',
    locale: 'en',
    problemStatement: 'Should idle treasury cash stay in USDT or rotate into a tokenized MMF?',
    status: 'CLARIFYING',
    createdAt: '2026-04-12T08:00:00Z',
    updatedAt: '2026-04-12T08:15:00Z',
    lastInsight: 'Clarify the liquidity window before ranking the options.',
    activityStatus: 'waiting_for_user_clarification_answers',
    currentFocus: 'Resolve the operating cash window and redemption tolerance.',
    lastStopReason: 'The system is waiting for another clarification round.',
    followUpRoundsUsed: 1,
    followUpRoundLimit: 3,
    intakeContext: {
      investmentAmount: 250000,
      baseCurrency: 'USDT',
      preferredAssetIds: ['hsk-usdc'],
      holdingPeriodDays: 90,
      riskTolerance: 'balanced',
      liquidityNeed: 't_plus_3',
      minimumKycLevel: 1,
      wantsOnchainAttestation: false,
    },
    questions: [
      {
        id: 'q-1',
        sessionId: 'sess-clarify-2',
        question: 'Which trade-off matters most right now?',
        purpose: 'The recommendation should rank the options against the main objective first.',
        fieldType: 'single-choice',
        options: [
          {
            value: 'liquidity',
            label: 'Liquidity certainty',
            description: 'Protect quick redemption access.',
          },
          {
            value: 'yield',
            label: 'Yield upside',
            description: 'Accept more lock-up in exchange for better carry.',
          },
        ],
        allowCustomInput: true,
        allowSkip: true,
        priority: 1,
        recommended: [],
        answered: false,
      },
      {
        id: 'q-2',
        sessionId: 'sess-clarify-2',
        question: 'Add any constraint that should override the default ranking.',
        purpose: 'Hard constraints should remain visible in the report.',
        fieldType: 'textarea',
        allowCustomInput: true,
        allowSkip: true,
        priority: 2,
        recommended: [],
        answered: false,
      },
    ],
    answers: [],
    searchTasks: [],
    evidence: [],
    conclusions: [],
    calculations: [],
    chartTasks: [],
    chartArtifacts: [],
  }
}

describe('AnalysisSessionPage', () => {
  beforeEach(() => {
    getById.mockReset()
    submitAnswers.mockReset()
    getById.mockResolvedValue(buildSession())
    submitAnswers.mockResolvedValue({
      ...buildSession(),
      status: 'ANALYZING',
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('shows the sticky action bar and enables continuation once an answer is ready', async () => {
    const user = userEvent.setup()

    renderWithAppState(
      <Routes>
        <Route path="/sessions/:sessionId/clarify" element={<AnalysisSessionPage />} />
        <Route path="/sessions/:sessionId/analyzing" element={<div>analysis progress target</div>} />
      </Routes>,
      { route: '/sessions/sess-clarify-2/clarify', locale: 'en', apiMode: 'rest' },
    )

    expect(await screen.findByText('Round progress')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Continue analysis' })[0]).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Liquidity certainty' }))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Continue analysis' })[0]).toBeEnabled()
    })
    expect(screen.getByText(/1 answer ready/i)).toBeInTheDocument()
    expect(screen.getByText('Answered')).toBeInTheDocument()
  })

  it('surfaces skipped and uncertain clarification states and submits the current round', async () => {
    const user = userEvent.setup()

    renderWithAppState(
      <Routes>
        <Route path="/sessions/:sessionId/clarify" element={<AnalysisSessionPage />} />
        <Route path="/sessions/:sessionId/analyzing" element={<div>analysis progress target</div>} />
      </Routes>,
      { route: '/sessions/sess-clarify-2/clarify', locale: 'en', apiMode: 'rest' },
    )

    await user.click(await screen.findByRole('button', { name: 'Liquidity certainty' }))
    await user.click(screen.getAllByRole('button', { name: 'Mark uncertain' })[1])
    expect(screen.getByText('Uncertain')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getAllByRole('button', { name: 'Skip for now' })[1])
    expect(screen.getByText('Skipped')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save answers' }))
    expect(await screen.findByText(/Autosaved at/i)).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Continue analysis' })[0])

    await waitFor(() => {
      expect(submitAnswers).toHaveBeenCalledWith(
        'sess-clarify-2',
        expect.objectContaining({
          answers: [
            expect.objectContaining({
              questionId: 'q-1',
              answerStatus: 'answered',
              selectedOptions: ['liquidity'],
            }),
            expect.objectContaining({
              questionId: 'q-2',
              answerStatus: 'skipped',
            }),
          ],
        }),
      )
    })
    expect(await screen.findByText('analysis progress target')).toBeInTheDocument()
  }, 10000)
})
