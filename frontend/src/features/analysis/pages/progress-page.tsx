import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  CircleAlert,
  FileSearch,
  LoaderCircle,
  Sigma,
  Sparkles,
} from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import {
  ConclusionCard,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PreviewNote,
  SectionCard,
  WorklogCard,
} from '@/components/product/decision-ui'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import { formatRelativeTime } from '@/features/analysis/lib/view-models'

export function ProgressPage() {
  const { t } = useTranslation()
  const { sessionId = '' } = useParams()
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const locale = useAppStore((state) => state.locale)
  const stepLabels = [
    t('analysis.progressPage.steps.clarifying'),
    t('analysis.progressPage.steps.searchingEvidence'),
    t('analysis.progressPage.steps.runningCalculations'),
    t('analysis.progressPage.steps.draftingReport'),
  ]

  const sessionQuery = useQuery({
    queryKey: ['analysis', sessionId, 'progress-session', locale],
    queryFn: () => adapter.analysis.getById(sessionId),
  })

  const progressQuery = useQuery({
    queryKey: ['analysis', sessionId, 'progress', locale],
    queryFn: () => adapter.analysis.getProgress(sessionId),
    refetchInterval: (query) =>
      query.state.data?.status === 'READY_FOR_EXECUTION' ||
      query.state.data?.status === 'EXECUTING' ||
      query.state.data?.status === 'MONITORING' ||
      query.state.data?.status === 'COMPLETED' ||
      query.state.data?.status === 'FAILED'
        ? false
        : 1400,
  })

  useEffect(() => {
    if (
      progressQuery.data?.status === 'READY_FOR_EXECUTION' ||
      progressQuery.data?.status === 'EXECUTING' ||
      progressQuery.data?.status === 'MONITORING' ||
      progressQuery.data?.status === 'COMPLETED'
    ) {
      void navigate(`/reports/${sessionId}`, { replace: true })
    }
  }, [navigate, progressQuery.data?.status, sessionId])

  if (sessionQuery.isLoading || progressQuery.isLoading) {
    return (
      <LoadingState
        title={t('analysis.progressPage.loadingTitle')}
        description={t('analysis.progressPage.loadingDescription')}
      />
    )
  }

  if (sessionQuery.isError || progressQuery.isError || !sessionQuery.data || !progressQuery.data) {
    return (
      <ErrorState
        title={t('analysis.progressPage.errorTitle')}
        description={
          (sessionQuery.error as Error | undefined)?.message ??
          (progressQuery.error as Error | undefined)?.message ??
          t('analysis.progressPage.errorFallback')
        }
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void sessionQuery.refetch()
              void progressQuery.refetch()
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    )
  }

  const session = sessionQuery.data
  const progress = progressQuery.data
  const stepIndex =
    progress.status === 'CLARIFYING'
      ? 0
      : progress.activityStatus?.includes('search')
        ? 1
        : progress.activityStatus?.includes('calculation')
          ? 2
          : 3

  const activityItems = [
    progress.currentFocus ? { kind: 'focus', title: t('analysis.progressPage.worklogItems.currentFocus'), detail: progress.currentFocus } : null,
    ...(progress.pendingSearchTasks ?? []).map((item) => ({
      kind: 'search',
      title: t('analysis.progressPage.worklogItems.searchTaskGenerated'),
      detail: item.topic,
    })),
    ...(progress.pendingCalculationTasks ?? []).map((item) => ({
      kind: 'calculation',
      title: t('analysis.progressPage.worklogItems.calculationQueued'),
      detail: item.taskType,
    })),
    ...(progress.pendingChartTasks ?? []).map((item) => ({
      kind: 'chart',
      title: t('analysis.progressPage.worklogItems.chartInProgress'),
      detail: item.title,
    })),
  ].filter(Boolean) as Array<{ detail: string; kind: 'focus' | 'search' | 'calculation' | 'chart'; title: string }>

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('analysis.progressPage.eyebrow')}
        title={t('analysis.progressPage.title')}
        description={t('analysis.progressPage.description')}
        actions={
          <>
            <Button variant="secondary" onClick={() => void navigate(`/sessions/${session.id}`)}>
              {t('analysis.progressPage.sessionDetail')}
            </Button>
            {session.status === 'FAILED' ? (
              <Button variant="secondary" onClick={() => void navigate(`/sessions/${session.id}/clarify`)}>
                {t('analysis.progressPage.reopenClarifications')}
              </Button>
            ) : null}
          </>
        }
      />

      <SectionCard
        title={t('analysis.progressPage.stepperTitle')}
        description={t('analysis.progressPage.stepperDescription')}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stepLabels.map((label, index) => {
            const completed =
              index < stepIndex ||
              progress.status === 'READY_FOR_EXECUTION' ||
              progress.status === 'EXECUTING' ||
              progress.status === 'MONITORING' ||
              progress.status === 'COMPLETED'
            const active =
              index === stepIndex &&
              progress.status !== 'READY_FOR_EXECUTION' &&
              progress.status !== 'EXECUTING' &&
              progress.status !== 'MONITORING' &&
              progress.status !== 'COMPLETED'

            return (
              <div
                key={label}
                className={`rounded-[22px] border px-4 py-4 ${
                  completed
                    ? 'border-[rgba(34,197,94,0.18)] bg-[rgba(20,184,122,0.08)]'
                    : active
                      ? 'border-[rgba(79,124,255,0.28)] bg-primary-soft'
                      : 'border-border-subtle bg-app-bg-elevated'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">{label}</p>
                  {completed ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : active ? (
                    <LoaderCircle className="size-4 animate-spin text-primary" />
                  ) : (
                    <Badge tone="neutral">{t('analysis.progressPage.pending')}</Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title={t('analysis.progressPage.metrics.questionsAnswered.title')}
              value={String(session.questions.filter((item) => item.answered).length)}
              detail={t('analysis.progressPage.metrics.questionsAnswered.detail')}
              tone="brand"
            />
            <MetricCard
              title={t('analysis.progressPage.metrics.evidenceCollected.title')}
              value={String(session.evidence.length)}
              detail={t('analysis.progressPage.metrics.evidenceCollected.detail')}
              tone="success"
            />
            <MetricCard
              title={t('analysis.progressPage.metrics.calculationsCompleted.title')}
              value={String(session.calculations.length)}
              detail={t('analysis.progressPage.metrics.calculationsCompleted.detail')}
              tone="brand"
            />
            <MetricCard
              title={t('analysis.progressPage.metrics.conclusionsExtracted.title')}
              value={String(session.conclusions.length)}
              detail={t('analysis.progressPage.metrics.conclusionsExtracted.detail')}
              tone="success"
            />
          </div>

          <SectionCard
            title={t('analysis.progressPage.worklogTitle')}
            description={t('analysis.progressPage.worklogDescription')}
          >
            {activityItems.length ? (
              <div className="space-y-3">
                {activityItems.map((item, index) => (
                  <WorklogCard
                    key={`${item.title}-${index}`}
                    title={item.title}
                    detail={item.detail}
                    icon={
                      item.kind === 'search' ? (
                        <FileSearch className="size-4" />
                      ) : item.kind === 'calculation' ? (
                        <Sigma className="size-4" />
                      ) : item.kind === 'chart' ? (
                        <Sparkles className="size-4" />
                      ) : (
                        <CircleAlert className="size-4" />
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={t('analysis.progressPage.worklogEmptyTitle')}
                description={t('analysis.progressPage.worklogEmptyDescription')}
              />
            )}
          </SectionCard>

          {progress.status === 'FAILED' ? (
            <ErrorState
              title={t('analysis.progressPage.failedTitle')}
              description={
                progress.errorMessage ??
                t('analysis.progressPage.failedFallback')
              }
              action={
                <Button variant="secondary" onClick={() => void navigate(`/sessions/${session.id}/clarify`)}>
                  {t('analysis.progressPage.returnToClarifications')}
                </Button>
              }
            />
          ) : (
            <PreviewNote>
              {t('analysis.progressPage.previewNote')}
            </PreviewNote>
          )}
        </div>

        <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <SectionCard title={t('analysis.progressPage.conclusionsPreviewTitle')} description={t('analysis.progressPage.conclusionsPreviewDescription')}>
            {session.conclusions.length ? (
              <div className="space-y-3">
                {session.conclusions.map((item) => (
                  <ConclusionCard
                    key={item.id}
                    title={item.conclusion}
                    type={item.conclusionType}
                    confidence={item.confidence}
                    basisCount={item.basisRefs.length}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={t('analysis.progressPage.conclusionsPreviewEmptyTitle')}
                description={t('analysis.progressPage.conclusionsPreviewEmptyDescription')}
              />
            )}
          </SectionCard>

          <SectionCard title={t('analysis.progressPage.currentStatusTitle')} description={t('analysis.progressPage.currentStatusDescription')}>
            <div className="space-y-3">
              <div className="rounded-[20px] bg-app-bg-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {t('analysis.progressPage.activeFocus')}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-primary">
                  {progress.currentFocus ?? t('analysis.progressPage.waitingNextStep')}
                </p>
              </div>
              <div className="rounded-[20px] bg-app-bg-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {t('analysis.progressPage.remainingBeforeDraft')}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-primary">
                  {progress.nextAction === 'complete'
                    ? t('analysis.progressPage.draftReady')
                    : progress.pendingSearchTasks?.length
                      ? t('analysis.progressPage.evidenceTasksOpen', {
                          count: progress.pendingSearchTasks.length,
                        })
                      : progress.pendingCalculationTasks?.length
                        ? t('analysis.progressPage.calculationTasksOpen', {
                            count: progress.pendingCalculationTasks.length,
                          })
                        : t('analysis.progressPage.workflowWaiting')}
                </p>
              </div>
              <div className="rounded-[20px] bg-app-bg-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {t('analysis.progressPage.lastStopReason')}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-primary">
                  {progress.lastStopReason ?? t('analysis.progressPage.noFallbackReason')}
                </p>
              </div>
              <div className="rounded-[20px] bg-app-bg-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {t('analysis.progressPage.updated')}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-primary">
                  {formatRelativeTime(session.updatedAt)}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
