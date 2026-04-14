import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CircleHelp, FileSearch, Sigma } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import {
  CalculationCard,
  ConclusionCard,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PreviewNote,
  SectionCard,
  SmallMetaList,
  StatusBadge,
  ConfidenceBadge,
} from '@/components/product/decision-ui'
import { Button } from '@/components/ui/button'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import { mergeCalculations, mergeEvidence } from '@/features/analysis/lib/catalog'
import {
  continuePath,
  currentUnderstanding,
  formatRelativeTime,
  modeLabel,
  sessionDisplayTitle,
  sessionConfidence,
  statusMeta,
} from '@/features/analysis/lib/view-models'

export function SessionDetailPage() {
  const { t } = useTranslation()
  const { sessionId = '' } = useParams()
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const locale = useAppStore((state) => state.locale)

  const sessionQuery = useQuery({
    queryKey: ['analysis', sessionId, 'detail', locale],
    queryFn: () => adapter.analysis.getById(sessionId),
  })

  const reportQuery = useQuery({
    queryKey: ['analysis', sessionId, 'detail-report', locale],
    queryFn: () => adapter.analysis.getReport(sessionId),
    enabled:
      sessionQuery.data?.status === 'READY_FOR_EXECUTION' ||
      sessionQuery.data?.status === 'EXECUTING' ||
      sessionQuery.data?.status === 'MONITORING' ||
      sessionQuery.data?.status === 'COMPLETED',
  })

  if (sessionQuery.isLoading) {
    return (
      <LoadingState
        title={t('analysis.sessionDetailPage.loadingTitle')}
        description={t('analysis.sessionDetailPage.loadingDescription')}
      />
    )
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <ErrorState
        title={t('analysis.sessionDetailPage.errorTitle')}
        description={
          (sessionQuery.error as Error | undefined)?.message ??
          t('analysis.sessionDetailPage.errorFallback')
        }
        action={
          <Button variant="secondary" onClick={() => void sessionQuery.refetch()}>
            {t('common.retry')}
          </Button>
        }
      />
    )
  }

  const session = sessionQuery.data
  const report = reportQuery.data
  const sessionTitle = sessionDisplayTitle(session, report)
  const understanding = currentUnderstanding(session)
  const evidence = mergeEvidence(session, report)
  const calculations = mergeCalculations(session, report)
  const unresolved = [
    ...session.questions
      .filter((item) => !item.answered)
      .map((item) => item.question),
    ...(report?.unknowns ?? []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('analysis.sessionDetailPage.eyebrow')}
        title={sessionTitle}
        description={t('analysis.sessionDetailPage.description')}
        actions={
          <>
            <Button variant="secondary" onClick={() => void navigate('/sessions')}>
              {t('analysis.sessionDetailPage.backToSessions')}
            </Button>
            <Button onClick={() => void navigate(continuePath(session))}>
              {session.status === 'READY_FOR_EXECUTION' ||
              session.status === 'EXECUTING' ||
              session.status === 'MONITORING' ||
              session.status === 'COMPLETED'
                ? t('analysis.sessionDetailPage.openReport')
                : t('analysis.sessionDetailPage.continueAnalysis')}
              <ArrowRight className="size-4" />
            </Button>
          </>
        }
      />

      <SmallMetaList
        items={[
          { label: t('analysis.sessionDetailPage.meta.mode'), value: modeLabel(session.mode) },
          { label: t('analysis.sessionDetailPage.meta.status'), value: statusMeta(session.status).label },
          { label: t('analysis.sessionDetailPage.meta.updated'), value: formatRelativeTime(session.updatedAt) },
          {
            label: t('analysis.sessionDetailPage.meta.currentRound'),
            value: `${session.followUpRoundsUsed ?? 0} / ${session.followUpRoundLimit ?? 0}`,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <SectionCard
            title={t('analysis.sessionDetailPage.understandingTitle')}
            description={t('analysis.sessionDetailPage.understandingDescription')}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={session.status} />
                <ConfidenceBadge confidence={sessionConfidence(session, report)} />
              </div>
            }
          >
            {understanding.length ? (
              <div className="grid gap-3">
                {understanding.map((item) => (
                  <div key={item} className="rounded-[20px] bg-app-bg-elevated px-4 py-3 text-sm leading-6 text-text-secondary">
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={t('analysis.sessionDetailPage.understandingEmptyTitle')}
                description={t('analysis.sessionDetailPage.understandingEmptyDescription')}
              />
            )}
          </SectionCard>

          <SectionCard
            title={t('analysis.sessionDetailPage.statusActionTitle')}
            description={t('analysis.sessionDetailPage.statusActionDescription')}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                title={t('analysis.sessionDetailPage.metrics.questionsAnswered.title')}
                value={String(session.questions.filter((item) => item.answered).length)}
                detail={t('analysis.sessionDetailPage.metrics.questionsAnswered.detail')}
                tone="brand"
              />
              <MetricCard
                title={t('analysis.sessionDetailPage.metrics.pendingQuestions.title')}
                value={String(session.questions.filter((item) => !item.answered).length)}
                detail={t('analysis.sessionDetailPage.metrics.pendingQuestions.detail')}
                tone="warning"
              />
              <MetricCard
                title={t('analysis.sessionDetailPage.metrics.evidenceCollected.title')}
                value={String(evidence.length)}
                detail={t('analysis.sessionDetailPage.metrics.evidenceCollected.detail')}
                tone="success"
              />
            </div>
            <PreviewNote icon={<CircleHelp className="mt-0.5 size-4 shrink-0 text-info" />}>
              {t('analysis.sessionDetailPage.nextActionLabel')}:{' '}
              {session.status === 'READY_FOR_EXECUTION' ||
              session.status === 'EXECUTING' ||
              session.status === 'MONITORING' ||
              session.status === 'COMPLETED'
                ? t('analysis.sessionDetailPage.nextActionReview')
                : t('analysis.sessionDetailPage.nextActionContinue')}
            </PreviewNote>
          </SectionCard>

          <SectionCard
            title={t('analysis.sessionDetailPage.evidenceTitle')}
            description={t('analysis.sessionDetailPage.evidenceDescription')}
          >
            {evidence.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {evidence.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-text-primary">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{item.summary}</p>
                      </div>
                      <FileSearch className="size-4 shrink-0 text-info" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={t('analysis.sessionDetailPage.evidenceEmptyTitle')}
                description={t('analysis.sessionDetailPage.evidenceEmptyDescription')}
              />
            )}
          </SectionCard>

          <SectionCard
            title={t('analysis.sessionDetailPage.calculationsTitle')}
            description={t('analysis.sessionDetailPage.calculationsDescription')}
          >
            {calculations.length ? (
              <div className="space-y-4">
                {calculations.slice(0, 2).map((task) => (
                  <CalculationCard key={task.id} task={task} sessionTitle={sessionTitle} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={t('analysis.sessionDetailPage.calculationsEmptyTitle')}
                description={t('analysis.sessionDetailPage.calculationsEmptyDescription')}
              />
            )}
          </SectionCard>
        </div>

        <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <SectionCard title={t('analysis.sessionDetailPage.conclusionsTitle')} description={t('analysis.sessionDetailPage.conclusionsDescription')}>
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
                title={t('analysis.sessionDetailPage.conclusionsEmptyTitle')}
                description={t('analysis.sessionDetailPage.conclusionsEmptyDescription')}
              />
            )}
          </SectionCard>

          <SectionCard title={t('analysis.sessionDetailPage.unresolvedTitle')} description={t('analysis.sessionDetailPage.unresolvedDescription')}>
            {unresolved.length ? (
              <div className="space-y-3">
                {unresolved.map((item) => (
                  <div key={item} className="rounded-[20px] border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-sm leading-6 text-text-secondary">
                    {item}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={t('analysis.sessionDetailPage.unresolvedEmptyTitle')}
                description={t('analysis.sessionDetailPage.unresolvedEmptyDescription')}
              />
            )}
          </SectionCard>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <MetricCard
              title={t('analysis.sessionDetailPage.evidenceProgressTitle')}
              value={t('analysis.sessionDetailPage.evidenceProgressValue', { count: evidence.length })}
              detail={t('analysis.sessionDetailPage.evidenceProgressDetail')}
              tone="brand"
            />
            <MetricCard
              title={t('analysis.sessionDetailPage.calculationProgressTitle')}
              value={t('analysis.sessionDetailPage.calculationProgressValue', { count: calculations.length })}
              detail={t('analysis.sessionDetailPage.calculationProgressDetail')}
              tone="success"
            />
          </div>

          <PreviewNote icon={<Sigma className="mt-0.5 size-4 shrink-0 text-info" />}>
            {t('analysis.sessionDetailPage.confidenceBoundary')}
          </PreviewNote>
        </div>
      </div>
    </div>
  )
}
