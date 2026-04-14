import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { differenceInMinutes } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ChartCard } from '@/components/charts/chart-card'
import { PageHeader } from '@/components/layout/page-header'
import {
  ConfidenceBadge,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  MetricCard,
  SectionCard,
} from '@/components/product/decision-ui'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/field'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { fetchAnalysisCatalog } from '@/features/analysis/lib/catalog'
import {
  extractExecutiveSummary,
  modeLabel,
  reportState,
  sessionConfidence,
} from '@/features/analysis/lib/view-models'
import { useAppStore } from '@/lib/store/app-store'
import { formatDate } from '@/lib/utils/format'

export function ReportsPage() {
  const { t } = useTranslation()
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const locale = useAppStore((state) => state.locale)
  const [filter, setFilter] = useState('all')

  const catalogQuery = useQuery({
    queryKey: ['analysis', 'catalog', 'reports', locale],
    queryFn: () => fetchAnalysisCatalog(adapter),
  })

  const reportEntries = useMemo(() => {
    const entries = Object.values(catalogQuery.data?.reportsBySession ?? []).map((report) => {
      const session = catalogQuery.data?.sessions.find((item) => item.id === report.sessionId)
      return { report, session }
    })

    return entries.filter((entry) => {
      if (!entry.session) return false
      if (filter === 'all') return true

      if (entry.session.status !== 'COMPLETED') {
        if (filter === 'draft') {
          return !['READY_FOR_EXECUTION', 'EXECUTING', 'MONITORING'].includes(entry.session.status)
        }
        if (filter === 'completed') {
          return ['READY_FOR_EXECUTION', 'EXECUTING', 'MONITORING'].includes(entry.session.status)
        }
        return false
      }

      const staleEvidence = entry.report.evidence.some((item) => item.freshness?.bucket === 'stale')
      const needsReview = (entry.report.unknowns?.length ?? 0) > 2 || (entry.report.warnings?.length ?? 0) > 1

      if (filter === 'review') return needsReview
      if (filter === 'updated') return staleEvidence
      if (filter === 'completed') return !needsReview && !staleEvidence
      return false
    })
  }, [catalogQuery.data, filter])

  const completedReports = reportEntries.filter(
    ({ session }) =>
      session?.status === 'READY_FOR_EXECUTION' ||
      session?.status === 'EXECUTING' ||
      session?.status === 'MONITORING' ||
      session?.status === 'COMPLETED',
  )
  const avgEvidence =
    completedReports.reduce((sum, entry) => sum + entry.report.evidence.length, 0) /
      (completedReports.length || 1)
  const avgTimeToReport =
    completedReports.reduce((sum, entry) => {
      if (!entry.session) return sum
      return (
        sum +
        differenceInMinutes(
          new Date(entry.session.updatedAt),
          new Date(entry.session.createdAt),
        )
      )
    }, 0) / (completedReports.length || 1)
  const reportsWithCalculations = completedReports.filter(
    (entry) => entry.report.calculations.length > 0,
  ).length
  const chartShowcase = completedReports[0]?.report.charts.slice(0, 2) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('analysis.reportsPage.eyebrow')}
        title={t('analysis.reportsPage.title')}
        description={t('analysis.reportsPage.description')}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t('analysis.reportsPage.metrics.completedAnalyses.title')}
          value={String(completedReports.length)}
          detail={t('analysis.reportsPage.metrics.completedAnalyses.detail')}
          tone="brand"
        />
        <MetricCard
          title={t('analysis.reportsPage.metrics.avgEvidenceCount.title')}
          value={avgEvidence ? avgEvidence.toFixed(1) : '0'}
          detail={t('analysis.reportsPage.metrics.avgEvidenceCount.detail')}
          tone="success"
        />
        <MetricCard
          title={t('analysis.reportsPage.metrics.avgTimeToReport.title')}
          value={`${Math.round(avgTimeToReport || 0)} min`}
          detail={t('analysis.reportsPage.metrics.avgTimeToReport.detail')}
          tone="brand"
        />
        <MetricCard
          title={t('analysis.reportsPage.metrics.reportsWithCalculations.title')}
          value={`${reportsWithCalculations}`}
          detail={t('analysis.reportsPage.metrics.reportsWithCalculations.detail')}
          tone="warning"
        />
      </div>

      <FilterBar>
        <Select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">{t('analysis.reportsPage.filters.all')}</option>
          <option value="draft">{t('analysis.reportsPage.filters.draft')}</option>
          <option value="completed">{t('analysis.reportsPage.filters.completed')}</option>
          <option value="updated">{t('analysis.reportsPage.filters.updated')}</option>
          <option value="review">{t('analysis.reportsPage.filters.review')}</option>
        </Select>
      </FilterBar>

      {catalogQuery.isLoading ? (
        <LoadingState
          title={t('analysis.reportsPage.loadingTitle')}
          description={t('analysis.reportsPage.loadingDescription')}
        />
      ) : catalogQuery.isError ? (
        <ErrorState
          title={t('analysis.reportsPage.errorTitle')}
          description={(catalogQuery.error as Error).message}
          action={
            <Button variant="secondary" onClick={() => void catalogQuery.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : reportEntries.length ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {reportEntries.map(({ report, session }) => {
              if (!session) return null
              const state = reportState(session, report, locale)
              const confidence = sessionConfidence(session, report)
              return (
                <Card key={report.id} className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={state.tone}>{state.label}</Badge>
                        <Badge tone="neutral">{modeLabel(session.mode, locale)}</Badge>
                        <ConfidenceBadge confidence={confidence} />
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary">
                        {report.summaryTitle}
                      </h3>
                      <p className="line-clamp-2 text-sm leading-6 text-text-secondary">
                        {extractExecutiveSummary(report.markdown, locale)}
                      </p>
                    </div>
                    <Button onClick={() => void navigate(`/reports/${session.id}`)}>
                      {t('analysis.reportsPage.viewFullReport')}
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[18px] border border-border-subtle bg-app-bg-elevated p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {t('analysis.reportsPage.summary')}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-text-primary">
                        {report.highlights[0]?.detail ??
                          report.highlights[0]?.value ??
                          t('analysis.reportsPage.recommendationGenerated')}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-border-subtle bg-bg-surface p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {t('analysis.reportsPage.evidenceCalculations')}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">
                        {report.evidence.length} {t('analysis.reportsPage.evidenceItems')} · {report.calculations.length} {t('analysis.reportsPage.calculations')}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-border-subtle bg-bg-surface p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {t('analysis.reportsPage.unresolvedUncertainty')}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">
                        {report.unknowns?.[0] ?? t('analysis.reportsPage.noUnresolved')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                    <span>{t('analysis.reportsPage.lastUpdated')}: {formatDate(session.updatedAt, locale)}</span>
                    <span>{report.evidence.length} {t('analysis.reportsPage.evidenceItems')}</span>
                    <span>{report.calculations.length} {t('analysis.reportsPage.calculations')}</span>
                    <span>{report.charts.length} {t('analysis.reportsPage.charts')}</span>
                  </div>
                </Card>
              )
            })}
          </div>

          <SectionCard
            title={t('analysis.reportsPage.insightRailTitle')}
            description={t('analysis.reportsPage.insightRailDescription')}
          >
            {chartShowcase.length ? (
              <div className="space-y-4">
                {chartShowcase.map((chart) => (
                  <ChartCard key={chart.id} chart={chart} />
                ))}
                <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {t('analysis.reportsPage.railNoteTitle')}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {t('analysis.reportsPage.railNoteDescription')}
                  </p>
                </div>
              </div>
            ) : (
              <EmptyState
                title={t('analysis.reportsPage.noChartsTitle')}
                description={t('analysis.reportsPage.noChartsDescription')}
              />
            )}
          </SectionCard>
        </div>
      ) : (
        <EmptyState
          title={t('analysis.reportsPage.emptyTitle')}
          description={t('analysis.reportsPage.emptyDescription')}
        />
      )}
    </div>
  )
}
