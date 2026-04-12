import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { differenceInMinutes } from 'date-fns'
import { useNavigate } from 'react-router-dom'

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
  reportState,
  sessionConfidence,
} from '@/features/analysis/lib/view-models'

export function ReportsPage() {
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const catalogQuery = useQuery({
    queryKey: ['analysis', 'catalog', 'reports'],
    queryFn: () => fetchAnalysisCatalog(adapter),
  })

  const reportEntries = useMemo(() => {
    const entries = Object.values(catalogQuery.data?.reportsBySession ?? []).map((report) => {
      const session = catalogQuery.data?.sessions.find((item) => item.id === report.sessionId)
      return { report, session }
    })

    return entries.filter((entry) => {
      if (!entry.session) return false
      const state = reportState(entry.session, entry.report).label
      if (filter === 'all') return true
      if (filter === 'draft') return state === 'Draft'
      if (filter === 'completed') return state === 'Completed'
      if (filter === 'updated') return state === 'Updated with new evidence'
      if (filter === 'review') return state === 'Needs review'
      return true
    })
  }, [catalogQuery.data, filter])

  const completedReports = reportEntries.filter(({ session }) => session?.status === 'COMPLETED')
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
        eyebrow="Reports"
        title="Reports"
        description="Browse final decision reports, compare evidence density, and inspect which outputs already include deterministic calculations."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Completed analyses"
          value={String(completedReports.length)}
          detail="Only finished sessions count toward the report catalog."
          tone="brand"
        />
        <MetricCard
          title="Avg evidence count"
          value={avgEvidence ? avgEvidence.toFixed(1) : '0'}
          detail="How many source summaries typically support a finished report."
          tone="success"
        />
        <MetricCard
          title="Avg time to report"
          value={`${Math.round(avgTimeToReport || 0)} min`}
          detail="Measured from session creation to last update in mock data."
          tone="brand"
        />
        <MetricCard
          title="Reports with calculations"
          value={`${reportsWithCalculations}`}
          detail="Finished reports that surface deterministic outputs."
          tone="success"
        />
      </div>

      <FilterBar>
        <Select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All reports</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="updated">Updated with new evidence</option>
          <option value="review">Needs review</option>
        </Select>
      </FilterBar>

      {catalogQuery.isLoading ? (
        <LoadingState
          title="Loading reports"
          description="Preparing summaries, evidence counts, and chart previews."
        />
      ) : catalogQuery.isError ? (
        <ErrorState
          title="Could not load reports"
          description={(catalogQuery.error as Error).message}
          action={
            <Button variant="secondary" onClick={() => void catalogQuery.refetch()}>
              Retry
            </Button>
          }
        />
      ) : reportEntries.length ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {reportEntries.map(({ report, session }) => {
              if (!session) return null
              const state = reportState(session, report)
              const confidence = sessionConfidence(session, report)
              return (
                <Card key={report.id} className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={state.tone}>{state.label}</Badge>
                        <Badge tone="neutral">
                          {session.mode === 'multi-option' ? 'Multi-option' : 'Single decision'}
                        </Badge>
                        <ConfidenceBadge confidence={confidence} />
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary">
                        {report.summaryTitle}
                      </h3>
                      <p className="text-sm leading-6 text-text-secondary">
                        {extractExecutiveSummary(report.markdown)}
                      </p>
                    </div>
                    <Button onClick={() => void navigate(`/reports/${session.id}`)}>
                      View full report
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="neutral">Cost</Badge>
                    <Badge tone="neutral">Risk</Badge>
                    <Badge tone="neutral">Recommendation direction</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                    <span>Last updated: {new Date(session.updatedAt).toLocaleDateString()}</span>
                    <span>{report.evidence.length} evidence items</span>
                    <span>{report.calculations.length} calculations</span>
                  </div>
                </Card>
              )
            })}
          </div>

          <SectionCard
            title="Chart showcase"
            description="Reports should only include charts with real decision meaning, not decorative finance visuals."
          >
            {chartShowcase.length ? (
              <div className="space-y-4">
                {chartShowcase.map((chart) => (
                  <ChartCard key={chart.id} chart={chart} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No charts available"
                description="Charts appear here when at least one report has enough data to render comparison or range visuals."
              />
            )}
          </SectionCard>
        </div>
      ) : (
        <EmptyState
          title="No reports yet"
          description="Completed reports will appear here with executive summaries, evidence counts, and chart previews."
        />
      )}
    </div>
  )
}
