import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import {
  CalculationCard,
  CalculationEmptyHint,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  MetricCard,
  SearchInput,
} from '@/components/product/decision-ui'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { fetchAnalysisCatalog, flattenCalculations } from '@/features/analysis/lib/catalog'
import { calculationTitle, sessionDisplayTitle } from '@/features/analysis/lib/view-models'
import { useAppStore } from '@/lib/store/app-store'
import { useState } from 'react'

function matchCalculationValue(
  calculations: Array<{ task: import('@/types').CalculationTask }>,
  patterns: string[],
  unavailableLabel: string,
) {
  return (
    calculations.find(({ task }) =>
      patterns.some((pattern) => task.taskType.toLowerCase().includes(pattern)),
    )?.task.result ?? unavailableLabel
  )
}

export function CalculationsPage() {
  const { t } = useTranslation()
  const adapter = useApiAdapter()
  const locale = useAppStore((state) => state.locale)
  const [search, setSearch] = useState('')
  const [sessionFilter, setSessionFilter] = useState('all')

  const catalogQuery = useQuery({
    queryKey: ['analysis', 'catalog', 'calculations', locale],
    queryFn: () => fetchAnalysisCatalog(adapter),
  })

  const calculations = useMemo(() => {
    return flattenCalculations(catalogQuery.data ?? { sessions: [], reportsBySession: {} }).filter(
      ({ session, task }) => {
        const matchesSearch =
          !search ||
          `${calculationTitle(task)} ${task.formulaExpression}`
            .toLowerCase()
            .includes(search.toLowerCase())
        const matchesSession = sessionFilter === 'all' || session.id === sessionFilter
        return matchesSearch && matchesSession
      },
    )
  }, [catalogQuery.data, search, sessionFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('analysis.calculationsPage.eyebrow')}
        title={t('analysis.calculationsPage.title')}
        description={t('analysis.calculationsPage.description')}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t('analysis.calculationsPage.metrics.expectedYield.title')}
          value={matchCalculationValue(calculations, ['yield', 'apy', 'apr'], t('common.notAvailable'))}
          detail={t('analysis.calculationsPage.metrics.expectedYield.detail')}
          tone="brand"
        />
        <MetricCard
          title={t('analysis.calculationsPage.metrics.feeBreakdown.title')}
          value={matchCalculationValue(calculations, ['fee', 'cost'], t('common.notAvailable'))}
          detail={t('analysis.calculationsPage.metrics.feeBreakdown.detail')}
          tone="success"
        />
        <MetricCard
          title={t('analysis.calculationsPage.metrics.slippageGas.title')}
          value={matchCalculationValue(calculations, ['slippage', 'gas'], t('common.notAvailable'))}
          detail={t('analysis.calculationsPage.metrics.slippageGas.detail')}
          tone="warning"
        />
        <MetricCard
          title={t('analysis.calculationsPage.metrics.redemptionBreakeven.title')}
          value={matchCalculationValue(calculations, ['break-even', 'breakeven', 'redemption'], t('common.notAvailable'))}
          detail={t('analysis.calculationsPage.metrics.redemptionBreakeven.detail')}
          tone="success"
        />
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('analysis.calculationsPage.searchPlaceholder')}
        />
        <Select
          value={sessionFilter}
          onChange={(event) => setSessionFilter(event.target.value)}
        >
          <option value="all">{t('analysis.calculationsPage.allSessions')}</option>
          {(catalogQuery.data?.sessions ?? []).map((session) => (
            <option key={session.id} value={session.id}>
              {sessionDisplayTitle(session, catalogQuery.data?.reportsBySession[session.id])}
            </option>
          ))}
        </Select>
      </FilterBar>

      <CalculationEmptyHint />

      {catalogQuery.isLoading ? (
        <LoadingState
          title={t('analysis.calculationsPage.loadingTitle')}
          description={t('analysis.calculationsPage.loadingDescription')}
        />
      ) : catalogQuery.isError ? (
        <ErrorState
          title={t('analysis.calculationsPage.errorTitle')}
          description={(catalogQuery.error as Error).message}
          action={
            <Button variant="secondary" onClick={() => void catalogQuery.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : calculations.length ? (
        <div className="space-y-4">
          {calculations.map(({ session, task }) => (
            <div key={task.id} className="space-y-3">
              <CalculationCard
                task={task}
                sessionTitle={sessionDisplayTitle(session, catalogQuery.data?.reportsBySession[session.id])}
              />
              <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm text-text-secondary">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                      {t('analysis.calculationsPage.reportLinkage')}
                    </p>
                    <p className="mt-2">
                      {task.reportSectionKeys?.length
                        ? task.reportSectionKeys.join(' · ')
                        : t('analysis.calculationsPage.notLinkedToReport')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                      {t('analysis.calculationsPage.executionLinkage')}
                    </p>
                    <p className="mt-2">
                      {task.executionStepIds?.length
                        ? task.executionStepIds.join(' · ')
                        : t('analysis.calculationsPage.notLinkedToExecution')}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`/reports/${session.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm text-text-primary transition hover:border-border-strong hover:bg-panel-strong"
                  >
                    {t('analysis.calculationsPage.openReport')}
                  </a>
                  <a
                    href={`/sessions/${session.id}/execute`}
                    className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm text-text-primary transition hover:border-border-strong hover:bg-panel-strong"
                  >
                    {t('analysis.calculationsPage.openExecutePage')}
                  </a>
                </div>
              </div>
            </div>
          ))}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="panel-card rounded-[24px] p-5">
              <p className="text-sm font-semibold text-text-primary">{t('analysis.calculationsPage.supportedSurfacesTitle')}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t('analysis.calculationsPage.supportedSurfacesDescription')}
              </p>
            </div>
            <div className="panel-card rounded-[24px] p-5">
              <p className="text-sm font-semibold text-text-primary">{t('analysis.calculationsPage.trustRuleTitle')}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t('analysis.calculationsPage.trustRuleDescription')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title={t('analysis.calculationsPage.emptyTitle')}
          description={t('analysis.calculationsPage.emptyDescription')}
        />
      )}
    </div>
  )
}
