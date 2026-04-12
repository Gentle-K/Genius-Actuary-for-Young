import { useDeferredValue, useMemo, useState, useTransition } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Trash2, Copy, ArrowRight, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/page-header'
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  SearchInput,
  SessionCard,
  SessionRow,
} from '@/components/product/decision-ui'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { fetchAnalysisCatalog, uniqueEvidenceCount } from '@/features/analysis/lib/catalog'
import {
  continuePath,
  sessionConfidence,
  sessionPath,
} from '@/features/analysis/lib/view-models'

export function SessionsPage() {
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('all')
  const [status, setStatus] = useState('all')
  const [confidence, setConfidence] = useState('all')
  const [sort, setSort] = useState('updated')
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [, startTransition] = useTransition()
  const deferredSearch = useDeferredValue(search)

  const catalogQuery = useQuery({
    queryKey: ['analysis', 'catalog', 'sessions'],
    queryFn: () => fetchAnalysisCatalog(adapter),
  })

  const duplicateMutation = useMutation({
    mutationFn: (payload: { mode: 'single-option' | 'multi-option'; problemStatement: string }) =>
      adapter.analysis.create({
        mode: payload.mode,
        locale: 'en',
        problemStatement: `${payload.problemStatement} (copy)`,
        intakeContext: {
          budgetRange: '$8k - $15k',
          timeHorizonLabel: '6-12 months',
          riskPreferenceLabel: 'Balanced',
          mustHaveGoals: ['Keep downside visible'],
          mustAvoidOutcomes: ['False certainty'],
          draftPrompt: payload.problemStatement,
          investmentAmount: 10000,
          baseCurrency: 'USD',
          preferredAssetIds: [],
          holdingPeriodDays: 180,
          riskTolerance: 'balanced',
          liquidityNeed: 't_plus_3',
          minimumKycLevel: 0,
          walletAddress: '',
          wantsOnchainAttestation: false,
          additionalConstraints: '',
        },
      }),
    onSuccess: async (session) => {
      toast.success('Session duplicated')
      await navigate(`/sessions/${session.id}/clarify`)
    },
  })

  const visibleSessions = useMemo(() => {
    const sessions = (catalogQuery.data?.sessions ?? []).filter(
      (session) => !deletedIds.includes(session.id),
    )

    return sessions
      .filter((session) => {
        const matchesSearch =
          !deferredSearch ||
          `${session.problemStatement} ${session.lastInsight}`
            .toLowerCase()
            .includes(deferredSearch.toLowerCase())

        const matchesMode = mode === 'all' || session.mode === mode
        const matchesStatus = status === 'all' || session.status === status
        const sessionScore = sessionConfidence(
          session,
          catalogQuery.data?.reportsBySession[session.id],
        )
        const matchesConfidence =
          confidence === 'all' ||
          (confidence === 'high' && (sessionScore ?? 0) >= 0.82) ||
          (confidence === 'medium' &&
            (sessionScore ?? 0) >= 0.66 &&
            (sessionScore ?? 0) < 0.82) ||
          (confidence === 'low' && (sessionScore ?? 0) < 0.66)

        return matchesSearch && matchesMode && matchesStatus && matchesConfidence
      })
      .sort((left, right) => {
        if (sort === 'updated') {
          return right.updatedAt.localeCompare(left.updatedAt)
        }
        if (sort === 'created') {
          return right.createdAt.localeCompare(left.createdAt)
        }
        return left.problemStatement.localeCompare(right.problemStatement)
      })
  }, [catalogQuery.data, confidence, deferredSearch, deletedIds, mode, sort, status])

  const handleDelete = (sessionId: string) => {
    startTransition(() => {
      setDeletedIds((current) => [...current, sessionId])
    })
    toast.success('Session removed from this demo view')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sessions"
        title="Analysis sessions"
        description="Review every decision analysis in one place, continue unfinished work, and compare the recommendation quality across sessions."
        actions={
          <Button onClick={() => void navigate('/new-analysis')}>Start new analysis</Button>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search sessions"
        />
        <Select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="all">All modes</option>
          <option value="single-option">Single decision</option>
          <option value="multi-option">Multi-option</option>
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="CLARIFYING">Clarifying</option>
          <option value="ANALYZING">Analyzing</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </Select>
        <Select
          value={confidence}
          onChange={(event) => setConfidence(event.target.value)}
        >
          <option value="all">All confidence</option>
          <option value="high">High confidence</option>
          <option value="medium">Medium confidence</option>
          <option value="low">Low confidence</option>
        </Select>
        <Select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="updated">Sort by last updated</option>
          <option value="created">Sort by created</option>
          <option value="title">Sort by title</option>
        </Select>
      </FilterBar>

      {catalogQuery.isLoading ? (
        <LoadingState
          title="Loading sessions"
          description="Preparing session summaries, confidence signals, and report links."
        />
      ) : catalogQuery.isError ? (
        <ErrorState
          title="Could not load analysis sessions"
          description={(catalogQuery.error as Error).message}
          action={
            <Button variant="secondary" onClick={() => void catalogQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : visibleSessions.length === 0 ? (
        <EmptyState
          title={search ? 'No matching sessions' : 'No analysis sessions yet'}
          description={
            search
              ? 'Try a different search or relax one of the filters.'
              : 'Start your first analysis to compare options, surface risks, and generate a structured report.'
          }
          action={
            !search ? (
              <Button onClick={() => void navigate('/new-analysis')}>Start new analysis</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden xl:block">
            <div className="mb-3 grid gap-4 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted xl:grid-cols-[2.5fr_1.1fr_1.1fr_1fr_2fr_1.4fr_1fr_auto]">
              <span>Session</span>
              <span>Mode</span>
              <span>Status</span>
              <span>Last updated</span>
              <span>Key conclusion</span>
              <span>Confidence</span>
              <span>Evidence</span>
              <span>Actions</span>
            </div>
            <div className="space-y-3">
              {visibleSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  confidence={sessionConfidence(
                    session,
                    catalogQuery.data?.reportsBySession[session.id],
                  )}
                  evidenceCount={uniqueEvidenceCount(
                    session,
                    catalogQuery.data?.reportsBySession[session.id],
                  )}
                  onOpen={() => void navigate(sessionPath(session.id))}
                  actions={
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void navigate(continuePath(session))}
                      >
                        <ArrowRight className="size-4" />
                        Continue
                      </Button>
                      {catalogQuery.data?.reportsBySession[session.id] ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void navigate(`/reports/${session.id}`)}
                        >
                          <FileText className="size-4" />
                          View report
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void duplicateMutation.mutateAsync({
                            mode: session.mode,
                            problemStatement: session.problemStatement,
                          })
                        }
                      >
                        <Copy className="size-4" />
                        Duplicate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(session.id)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:hidden">
            {visibleSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                confidence={sessionConfidence(
                  session,
                  catalogQuery.data?.reportsBySession[session.id],
                )}
                onOpen={() => void navigate(sessionPath(session.id))}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void navigate(continuePath(session))}
                    >
                      Continue
                    </Button>
                    {catalogQuery.data?.reportsBySession[session.id] ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void navigate(`/reports/${session.id}`)}
                      >
                        View report
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void duplicateMutation.mutateAsync({
                          mode: session.mode,
                          problemStatement: session.problemStatement,
                        })
                      }
                    >
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(session.id)}
                    >
                      Delete
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
