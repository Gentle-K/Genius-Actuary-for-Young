import { useDeferredValue, useMemo, useState, useTransition } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Copy, ArrowRight, FileText, MoreHorizontal, Sigma, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

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
import { useAppStore } from '@/lib/store/app-store'
import type { AnalysisMode } from '@/types'

function SessionOverflow({
  onDelete,
  label,
}: {
  onDelete: () => void
  label: string
}) {
  return (
    <details className="relative">
      <summary className="interactive-lift flex size-9 cursor-pointer list-none items-center justify-center rounded-[14px] border border-border-subtle bg-app-bg-elevated text-text-secondary">
        <MoreHorizontal className="size-4" />
      </summary>
      <div className="menu-surface absolute right-0 top-11 z-20 min-w-[168px] rounded-[18px] border border-border-subtle p-2">
        <button
          type="button"
          className="menu-danger-item interactive-lift flex w-full items-center rounded-[14px] px-3 py-2 text-left text-sm text-danger"
          onClick={onDelete}
        >
          {label}
        </button>
      </div>
    </details>
  )
}

export function SessionsPage() {
  const { t } = useTranslation()
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const locale = useAppStore((state) => state.locale)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState('all')
  const [status, setStatus] = useState('all')
  const [confidence, setConfidence] = useState('all')
  const [sort, setSort] = useState('updated')
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [, startTransition] = useTransition()
  const deferredSearch = useDeferredValue(search)

  const catalogQuery = useQuery({
    queryKey: ['analysis', 'catalog', 'sessions', locale],
    queryFn: () => fetchAnalysisCatalog(adapter),
  })

  const duplicateMutation = useMutation({
    mutationFn: (payload: { mode: AnalysisMode; problemStatement: string }) =>
      adapter.analysis.create({
        mode: payload.mode,
        locale,
        problemStatement: payload.problemStatement,
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
      toast.success(t('analysis.sessionsPage.duplicateSuccess'))
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
    toast.success(t('analysis.sessionsPage.removeDemoSuccess'))
  }

  const calculationCount = (sessionId: string) =>
    catalogQuery.data?.reportsBySession[sessionId]?.calculations.length ??
    catalogQuery.data?.sessions.find((item) => item.id === sessionId)?.calculations.length ??
    0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('analysis.sessionsPage.eyebrow')}
        title={t('analysis.sessionsPage.title')}
        description={t('analysis.sessionsPage.description')}
        actions={
          <Button onClick={() => void navigate('/new-analysis')}>
            {t('analysis.sessionsPage.startNewAnalysis')}
          </Button>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('analysis.sessionsPage.searchPlaceholder')}
        />
        <Select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="all">{t('analysis.sessionsPage.filters.allModes')}</option>
          <option value="single-asset-allocation">
            {t('analysis.sessionsPage.filters.singleAssetAllocation')}
          </option>
          <option value="strategy-compare">
            {t('analysis.sessionsPage.filters.strategyCompare')}
          </option>
        </Select>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">{t('analysis.sessionsPage.filters.allStatuses')}</option>
          <option value="CLARIFYING">{t('analysis.sessionsPage.filters.clarifying')}</option>
          <option value="ANALYZING">{t('analysis.sessionsPage.filters.analyzing')}</option>
          <option value="READY_FOR_EXECUTION">
            {t('analysis.sessionsPage.filters.readyForExecution')}
          </option>
          <option value="EXECUTING">{t('analysis.sessionsPage.filters.executing')}</option>
          <option value="MONITORING">{t('analysis.sessionsPage.filters.monitoring')}</option>
          <option value="COMPLETED">{t('analysis.sessionsPage.filters.completed')}</option>
          <option value="FAILED">{t('analysis.sessionsPage.filters.failed')}</option>
        </Select>
        <Select value={confidence} onChange={(event) => setConfidence(event.target.value)}>
          <option value="all">{t('analysis.sessionsPage.filters.allConfidence')}</option>
          <option value="high">{t('analysis.sessionsPage.filters.highConfidence')}</option>
          <option value="medium">{t('analysis.sessionsPage.filters.mediumConfidence')}</option>
          <option value="low">{t('analysis.sessionsPage.filters.lowConfidence')}</option>
        </Select>
        <Select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="updated">{t('analysis.sessionsPage.filters.sortUpdated')}</option>
          <option value="created">{t('analysis.sessionsPage.filters.sortCreated')}</option>
          <option value="title">{t('analysis.sessionsPage.filters.sortTitle')}</option>
        </Select>
      </FilterBar>

      {catalogQuery.isLoading ? (
        <LoadingState
          title={t('analysis.sessionsPage.loadingTitle')}
          description={t('analysis.sessionsPage.loadingDescription')}
        />
      ) : catalogQuery.isError ? (
        <ErrorState
          title={t('analysis.sessionsPage.errorTitle')}
          description={(catalogQuery.error as Error).message}
          action={
            <Button variant="secondary" onClick={() => void catalogQuery.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : visibleSessions.length === 0 ? (
        <EmptyState
          title={
            search
              ? t('analysis.sessionsPage.noMatchingTitle')
              : t('analysis.sessionsPage.emptyTitle')
          }
          description={
            search
              ? t('analysis.sessionsPage.noMatchingDescription')
              : t('analysis.sessionsPage.emptyDescription')
          }
          action={
            !search ? (
              <Button onClick={() => void navigate('/new-analysis')}>
                {t('analysis.sessionsPage.startNewAnalysis')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden xl:block">
            <div className="mb-3 grid gap-4 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted xl:grid-cols-[2.4fr_1fr_1fr_1fr_1.8fr_1.3fr_0.8fr_0.8fr_auto]">
              <span>{t('analysis.sessionsPage.table.session')}</span>
              <span>{t('analysis.sessionsPage.table.mode')}</span>
              <span>{t('analysis.sessionsPage.table.status')}</span>
              <span>{t('analysis.sessionsPage.table.lastUpdated')}</span>
              <span>{t('analysis.sessionsPage.table.keyConclusion')}</span>
              <span>{t('analysis.sessionsPage.table.confidence')}</span>
              <span>{t('analysis.sessionsPage.table.evidence')}</span>
              <span>{t('analysis.sessionsPage.table.calcs')}</span>
              <span>{t('analysis.sessionsPage.table.actions')}</span>
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
                  calculationCount={calculationCount(session.id)}
                  onOpen={() => void navigate(sessionPath(session.id))}
                  actions={
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          void navigate(
                            catalogQuery.data?.reportsBySession[session.id]
                              ? `/reports/${session.id}`
                              : continuePath(session),
                          )
                        }
                      >
                        {catalogQuery.data?.reportsBySession[session.id] ? (
                          <>
                            <FileText className="size-4" />
                            {t('analysis.sessionsPage.viewReport')}
                          </>
                        ) : (
                          <>
                            <ArrowRight className="size-4" />
                            {t('analysis.sessionsPage.continue')}
                          </>
                        )}
                      </Button>
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
                        {t('analysis.sessionsPage.duplicate')}
                      </Button>
                      <SessionOverflow
                        onDelete={() => handleDelete(session.id)}
                        label={t('analysis.sessionsPage.deleteSession')}
                      />
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
                evidenceCount={uniqueEvidenceCount(
                  session,
                  catalogQuery.data?.reportsBySession[session.id],
                )}
                calculationCount={calculationCount(session.id)}
                onOpen={() => void navigate(sessionPath(session.id))}
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void navigate(
                          catalogQuery.data?.reportsBySession[session.id]
                            ? `/reports/${session.id}`
                            : continuePath(session),
                        )
                      }
                    >
                      {catalogQuery.data?.reportsBySession[session.id]
                        ? t('analysis.sessionsPage.viewReport')
                        : t('analysis.sessionsPage.continue')}
                    </Button>
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
                      {t('analysis.sessionsPage.duplicate')}
                    </Button>
                    <SessionOverflow
                      onDelete={() => handleDelete(session.id)}
                      label={t('analysis.sessionsPage.deleteSession')}
                    />
                  </>
                }
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="panel-card rounded-[24px] p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary-soft p-3 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {t('analysis.sessionsPage.decisionSignalDensityTitle')}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {t('analysis.sessionsPage.decisionSignalDensityDescription')}
                  </p>
                </div>
              </div>
            </div>
            <div className="panel-card rounded-[24px] p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-[rgba(139,92,246,0.14)] p-3 text-accent-violet">
                  <Sigma className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {t('analysis.sessionsPage.denseCatalogTitle')}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {t('analysis.sessionsPage.denseCatalogDescription')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
