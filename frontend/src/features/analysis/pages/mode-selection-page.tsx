import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Clock3,
  FileText,
  LoaderCircle,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import {
  ConfidenceBadge,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  MetricCard,
  PreviewNote,
  SectionCard,
  SessionCard,
} from '@/components/product/decision-ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from '@/lib/utils/safe-storage'
import { cn } from '@/lib/utils/cn'
import { fetchAnalysisCatalog } from '@/features/analysis/lib/catalog'
import {
  continuePath,
  extractExecutiveSummary,
  modeLabel,
  modeSummary,
  sessionConfidence,
} from '@/features/analysis/lib/view-models'
import type { AnalysisMode, CreateSessionPayload, RwaIntakeContext } from '@/types'

const DRAFT_KEY = 'ga-new-analysis-draft'

const examplePrompts: Record<AnalysisMode, string[]> = {
  'single-option': [
    'Should I join a study abroad exchange?',
    'Should I buy a car or continue with public transport?',
    'Should I leave my current job this quarter?',
  ],
  'multi-option': [
    'Should I apply to graduate school now, work first, or defer for a year?',
    'Should I rent, buy, or keep living with family for 12 more months?',
    'Should I keep freelancing, join a startup, or take a corporate role?',
  ],
}

function modeCardClass(active: boolean) {
  return cn(
    'interactive-lift rounded-[26px] border p-5 text-left',
    active
      ? 'border-border-strong bg-brand-soft shadow-[0_12px_30px_rgba(70,106,84,0.1)]'
      : 'border-border-subtle bg-panel hover:border-border-strong hover:bg-panel-strong',
  )
}

function parseBudgetToAmount(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)/)
  if (!match) {
    return 10000
  }
  const base = Number(match[1])
  return value.toLowerCase().includes('k') ? base * 1000 : base
}

export function ModeSelectionPage() {
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const locale = useAppStore((state) => state.locale)
  const [mode, setMode] = useState<AnalysisMode>('single-option')
  const [problem, setProblem] = useState('')
  const [showConstraints, setShowConstraints] = useState(true)
  const [budgetRange, setBudgetRange] = useState('$8k - $15k')
  const [timeHorizon, setTimeHorizon] = useState('6-12 months')
  const [riskPreference, setRiskPreference] = useState('Balanced')
  const [mustHaveGoals, setMustHaveGoals] = useState(
    'Protect cash runway; keep optionality; make trade-offs explicit',
  )
  const [mustAvoidOutcomes, setMustAvoidOutcomes] = useState(
    'Irreversible commitment without evidence',
  )

  useEffect(() => {
    const raw = getLocalStorageItem(DRAFT_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as {
        budgetRange: string
        mode: AnalysisMode
        mustAvoidOutcomes: string
        mustHaveGoals: string
        problem: string
        riskPreference: string
        timeHorizon: string
      }
      setMode(parsed.mode)
      setProblem(parsed.problem)
      setBudgetRange(parsed.budgetRange)
      setTimeHorizon(parsed.timeHorizon)
      setRiskPreference(parsed.riskPreference)
      setMustHaveGoals(parsed.mustHaveGoals)
      setMustAvoidOutcomes(parsed.mustAvoidOutcomes)
    } catch {
      removeLocalStorageItem(DRAFT_KEY)
    }
  }, [])

  useEffect(() => {
    setLocalStorageItem(
      DRAFT_KEY,
      JSON.stringify({
        mode,
        problem,
        budgetRange,
        timeHorizon,
        riskPreference,
        mustHaveGoals,
        mustAvoidOutcomes,
      }),
    )
  }, [budgetRange, mode, mustAvoidOutcomes, mustHaveGoals, problem, riskPreference, timeHorizon])

  const catalogQuery = useQuery({
    queryKey: ['analysis', 'catalog', 'new-analysis'],
    queryFn: () => fetchAnalysisCatalog(adapter),
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateSessionPayload) => adapter.analysis.create(payload),
    onSuccess: async (session) => {
      setLocalStorageItem(
        DRAFT_KEY,
        JSON.stringify({
          mode,
          problem,
          budgetRange,
          timeHorizon,
          riskPreference,
          mustHaveGoals,
          mustAvoidOutcomes,
        }),
      )
      await navigate(`/sessions/${session.id}/clarify`)
    },
  })

  const draftContext = useMemo<RwaIntakeContext>(
    () => ({
      budgetRange,
      timeHorizonLabel: timeHorizon,
      riskPreferenceLabel: riskPreference,
      mustHaveGoals: mustHaveGoals
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean),
      mustAvoidOutcomes: mustAvoidOutcomes
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean),
      draftPrompt: problem,
      investmentAmount: parseBudgetToAmount(budgetRange),
      baseCurrency: 'USD',
      preferredAssetIds: [],
      holdingPeriodDays:
        timeHorizon === '1-3 months'
          ? 90
          : timeHorizon === '3-6 months'
            ? 180
            : timeHorizon === '12+ months'
              ? 365
              : 270,
      riskTolerance:
        riskPreference === 'Conservative'
          ? 'conservative'
          : riskPreference === 'Aggressive'
            ? 'aggressive'
            : 'balanced',
      liquidityNeed: 't_plus_3',
      minimumKycLevel: 0,
      walletAddress: '',
      wantsOnchainAttestation: false,
      additionalConstraints: `${mustHaveGoals}\n${mustAvoidOutcomes}`,
    }),
    [budgetRange, mustAvoidOutcomes, mustHaveGoals, problem, riskPreference, timeHorizon],
  )

  const recentSessions = catalogQuery.data?.sessions.slice(0, 3) ?? []
  const exampleReports = Object.values(catalogQuery.data?.reportsBySession ?? {}).slice(0, 2)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="New Analysis"
        title="Start a new analysis"
        description="Describe one important decision. The system will break it into costs, risks, assumptions, evidence, calculations, and recommendations."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <SectionCard
            title="Choose analysis mode"
            description="Pick the structure that best matches the decision you need to make."
          >
            <div className="grid gap-4 md:grid-cols-2">
              {(['single-option', 'multi-option'] as const).map((item) => {
                const active = item === mode
                return (
                  <button
                    key={item}
                    type="button"
                    className={modeCardClass(active)}
                    onClick={() => setMode(item)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-text-primary">
                          {modeLabel(item)}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">
                          {modeSummary(item)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex size-10 items-center justify-center rounded-full',
                          active ? 'bg-gold-primary text-white' : 'bg-app-bg-elevated text-text-secondary',
                        )}
                      >
                        <Sparkles className="size-4" />
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard
            title="Describe the decision"
            description="Keep it concrete. The first question should be the actual decision, not background context."
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="problem"
                  className="text-sm font-semibold text-text-primary"
                >
                  What decision are you trying to make?
                </label>
                <Textarea
                  id="problem"
                  value={problem}
                  placeholder="Example: Should I join a study abroad exchange in year 3?"
                  onChange={(event) => setProblem(event.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {examplePrompts[mode].map((example) => (
                  <button
                    key={example}
                    type="button"
                    className="interactive-lift rounded-full border border-border-subtle bg-app-bg-elevated px-3.5 py-2 text-sm text-text-secondary hover:border-border-strong hover:text-text-primary"
                    onClick={() => setProblem(example)}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Constraints and preferences"
            description="Optional. If you already know the hard edges of the decision, add them now."
            actions={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConstraints((current) => !current)}
              >
                {showConstraints ? 'Hide constraints' : 'Add constraints'}
              </Button>
            }
          >
            {showConstraints ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-text-primary">
                    Budget range
                  </label>
                  <Input
                    value={budgetRange}
                    onChange={(event) => setBudgetRange(event.target.value)}
                    placeholder="$8k - $15k"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-text-primary">
                    Time horizon
                  </label>
                  <Select
                    value={timeHorizon}
                    onChange={(event) => setTimeHorizon(event.target.value)}
                  >
                    <option value="1-3 months">1-3 months</option>
                    <option value="3-6 months">3-6 months</option>
                    <option value="6-12 months">6-12 months</option>
                    <option value="12+ months">12+ months</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-text-primary">
                    Risk preference
                  </label>
                  <Select
                    value={riskPreference}
                    onChange={(event) => setRiskPreference(event.target.value)}
                  >
                    <option value="Conservative">Conservative</option>
                    <option value="Balanced">Balanced</option>
                    <option value="Aggressive">Aggressive</option>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-text-primary">
                    Must-have goals
                  </label>
                  <Input
                    value={mustHaveGoals}
                    onChange={(event) => setMustHaveGoals(event.target.value)}
                    placeholder="Protect cash runway; keep optionality"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-text-primary">
                    Must-avoid outcomes
                  </label>
                  <Input
                    value={mustAvoidOutcomes}
                    onChange={(event) => setMustAvoidOutcomes(event.target.value)}
                    placeholder="Irreversible commitment without evidence"
                  />
                </div>
              </div>
            ) : (
              <PreviewNote>
                You can skip constraints now. The system will still ask follow-up
                questions before it drafts a recommendation.
              </PreviewNote>
            )}
          </SectionCard>

          {createMutation.isError ? (
            <ErrorState
              title="Could not start the analysis"
              description={(createMutation.error as Error).message}
              action={
                <Button onClick={() => createMutation.reset()} variant="secondary">
                  Dismiss
                </Button>
              }
            />
          ) : null}

          <FilterBar>
            <PreviewNote>
              The frontend only captures input and display state. Evidence search,
              calculations, orchestration, and report logic stay behind the API boundary.
            </PreviewNote>
            <Button
              className="ml-auto"
              disabled={!problem.trim() || createMutation.isPending}
              onClick={() =>
                void createMutation.mutateAsync({
                  mode,
                  locale,
                  problemStatement: problem.trim(),
                  intakeContext: draftContext,
                })
              }
            >
              {createMutation.isPending ? 'Starting analysis...' : 'Start analysis'}
              {createMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
            </Button>
          </FilterBar>
        </div>

        <div className="space-y-6">
          {catalogQuery.isLoading ? (
            <LoadingState
              title="Loading workspace context"
              description="Preparing recent sessions and example reports."
            />
          ) : catalogQuery.isError ? (
            <ErrorState
              title="Could not load workspace context"
              description={(catalogQuery.error as Error).message}
              action={
                <Button variant="secondary" onClick={() => void catalogQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : (
            <>
              <SectionCard title="Recent sessions" description="Jump back into work already in progress.">
                {recentSessions.length ? (
                  <div className="space-y-4">
                    {recentSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        confidence={sessionConfidence(
                          session,
                          catalogQuery.data?.reportsBySession[session.id],
                        )}
                        onOpen={() => void navigate(continuePath(session))}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No analysis sessions yet"
                    description="Start your first analysis to compare options, surface risks, and generate a structured report."
                  />
                )}
              </SectionCard>

              <SectionCard title="Example reports" description="See what the finished output looks like.">
                {exampleReports.length ? (
                  <div className="space-y-3">
                    {exampleReports.map((report) => (
                      <Card
                        key={report.id}
                        className="cursor-pointer space-y-3 p-5"
                        onClick={() => void navigate(`/reports/${report.sessionId}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-text-primary">
                              {report.summaryTitle}
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-text-secondary">
                              {extractExecutiveSummary(report.markdown)}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <ConfidenceBadge
                              confidence={sessionConfidence(
                                catalogQuery.data?.sessions.find(
                                  (session) => session.id === report.sessionId,
                                )!,
                                report,
                              )}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3.5" />
                            {report.evidence.length} evidence items
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FileText className="size-3.5" />
                            {report.calculations.length} calculations
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No reports yet"
                    description="Completed analyses will appear here with summaries, charts, and evidence counts."
                  />
                )}
              </SectionCard>

              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                  title="How it works"
                  value="5 steps"
                  detail="Mode selection, problem intake, dynamic clarification, transparent analysis, and final report."
                  tone="brand"
                />
                <MetricCard
                  title="What you get"
                  value="Report + evidence"
                  detail="A structured recommendation with assumptions, unknowns, calculations, and charted comparisons."
                  tone="success"
                />
              </div>

              <SectionCard title="Last saved draft" description="Your in-progress intake is stored locally in this browser.">
                {problem.trim() ? (
                  <div className="space-y-3 rounded-[22px] bg-app-bg-elevated p-4">
                    <p className="text-sm font-semibold text-text-primary">{problem}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-text-primary">
                        {modeLabel(mode)}
                      </span>
                      <span className="rounded-full bg-panel px-3 py-1 text-xs font-semibold text-text-secondary">
                        {budgetRange}
                      </span>
                      <span className="rounded-full bg-panel px-3 py-1 text-xs font-semibold text-text-secondary">
                        {timeHorizon}
                      </span>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="No draft yet"
                    description="Once you start typing a new analysis, the current draft will appear here."
                  />
                )}
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
