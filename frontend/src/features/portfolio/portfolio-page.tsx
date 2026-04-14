import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCheck,
  Loader2,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  PageContainer,
  PageHeader,
  PageSection,
} from '@/components/layout/page-header'
import { DetailDrawer, ErrorState } from '@/components/product/decision-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { formatDateTime, formatMoney, formatPercent } from '@/lib/utils/format'
import { useAppStore } from '@/lib/store/app-store'
import { shortAddress } from '@/lib/web3/hashkey'
import { useHashKeyWallet } from '@/lib/web3/use-hashkey-wallet'
import type { PortfolioAlert } from '@/types'

function severityTone(value?: string) {
  if (value === 'critical') return 'danger' as const
  if (value === 'warning') return 'warning' as const
  return 'info' as const
}

function severityRank(value?: string) {
  if (value === 'critical') return 0
  if (value === 'warning') return 1
  return 2
}

export function PortfolioPage() {
  const { t } = useTranslation()
  const { address = '' } = useParams()
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const locale = useAppStore((state) => state.locale)

  const bootstrapQuery = useQuery({
    queryKey: ['rwa', 'bootstrap', 'portfolio-page', locale],
    queryFn: () => adapter.rwa.getBootstrap(),
  })

  const wallet = useHashKeyWallet(bootstrapQuery.data?.chainConfig)
  const network =
    wallet.walletNetwork ??
    (bootstrapQuery.data?.chainConfig.defaultExecutionNetwork === 'mainnet' ? 'mainnet' : 'testnet')
  const resolvedAddress = address || wallet.walletAddress || ''

  const portfolioQuery = useQuery({
    queryKey: ['rwa', 'portfolio', resolvedAddress, network, locale],
    queryFn: () => adapter.rwa.getPortfolio(resolvedAddress, network),
    enabled: Boolean(resolvedAddress),
    refetchInterval: 30_000,
  })
  const alertsQuery = useQuery({
    queryKey: ['rwa', 'portfolio-alerts', resolvedAddress, network, locale],
    queryFn: () => adapter.rwa.getPortfolioAlerts(resolvedAddress, network),
    enabled: Boolean(resolvedAddress),
    refetchInterval: 30_000,
  })

  const [selectedAlert, setSelectedAlert] = useState<PortfolioAlert | null>(null)

  const syncQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['rwa', 'portfolio', resolvedAddress, network] }),
      queryClient.invalidateQueries({ queryKey: ['rwa', 'portfolio-alerts', resolvedAddress, network] }),
    ])
  }

  const ackMutation = useMutation({
    mutationFn: (alertId: string) => adapter.rwa.ackPortfolioAlert(resolvedAddress, alertId),
    onSuccess: async () => {
      await syncQueries()
    },
  })
  const readMutation = useMutation({
    mutationFn: (alertId: string) => adapter.rwa.readPortfolioAlert(resolvedAddress, alertId),
    onSuccess: async () => {
      await syncQueries()
    },
  })

  const portfolio = portfolioQuery.data
  const alerts = [...(alertsQuery.data ?? portfolio?.alerts ?? [])].sort((left, right) => {
    const severityDelta = severityRank(left.severity) - severityRank(right.severity)
    if (severityDelta !== 0) return severityDelta
    return new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime()
  })
  const proofByAsset = new Map((portfolio?.proofSnapshots ?? []).map((proof) => [proof.assetId, proof]))
  const isZeroValue = Boolean(portfolio?.positions.length) && (portfolio?.totalValueUsd ?? 0) <= 0

  if (bootstrapQuery.isLoading || portfolioQuery.isLoading || alertsQuery.isLoading) {
    return (
      <Card className="p-6 text-sm text-text-secondary">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {t('portfolio.loading')}
        </div>
      </Card>
    )
  }

  if (!resolvedAddress) {
    return (
      <Card className="space-y-4 p-6">
        <p className="text-lg font-semibold text-text-primary">{t('empty.portfolio.noAddressTitle')}</p>
        <p className="text-sm leading-6 text-text-secondary">{t('empty.portfolio.noAddressDescription')}</p>
        <div className="flex flex-wrap gap-2 max-sm:flex-col">
          <Button
            className="max-sm:w-full"
            onClick={() => void wallet.connectWallet()}
            disabled={!wallet.hasProvider || wallet.isWalletBusy}
          >
            <Wallet className="size-4" />
            {t('actions.connectWallet')}
          </Button>
          <Button className="max-sm:w-full" variant="secondary" onClick={() => void navigate('/assets')}>
            {t('actions.openAssetHub')}
          </Button>
        </div>
      </Card>
    )
  }

  if (portfolioQuery.isError || alertsQuery.isError || !portfolio) {
    return (
      <ErrorState
        title={t('empty.portfolio.unavailableTitle')}
        description={t('empty.portfolio.unavailableDescription')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void syncQueries()}>
              <RefreshCw className="size-4" />
              {t('actions.resync')}
            </Button>
            <Button onClick={() => void navigate('/assets')}>{t('actions.openAssetHub')}</Button>
          </div>
        }
      />
    )
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t('portfolio.eyebrow')}
        title={t('portfolio.title')}
        description={t('portfolio.description')}
        actions={
          <>
            <Button variant="secondary" className="max-sm:w-full" onClick={() => void navigate('/assets')}>
              {t('actions.openAssetHub')}
            </Button>
            <Button variant="secondary" className="max-sm:w-full" onClick={() => void navigate('/new-analysis')}>
              <BarChart3 className="size-4" />
              {t('actions.newAnalysis')}
            </Button>
          </>
        }
      />

      <PageSection className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="space-y-5 p-6 md:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{network}</Badge>
            <Badge tone={alerts.some((item) => item.severity === 'critical') ? 'danger' : alerts.length ? 'warning' : 'success'}>
              {t('portfolio.alertsCount', { count: alerts.length })}
            </Badge>
          </div>
          <div className="space-y-2">
            <h2 className="text-[clamp(1.8rem,3.2vw,3rem)] font-semibold tracking-[-0.05em] text-text-primary">
              {shortAddress(resolvedAddress)}
            </h2>
            <p className="break-all text-sm leading-6 text-text-secondary">{resolvedAddress}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card className="rounded-[20px] bg-app-bg-elevated p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.currentValue')}</p>
              <p className="mt-2 text-base font-semibold text-text-primary">
                {formatMoney(portfolio.totalValueUsd, 'USD', locale)}
              </p>
            </Card>
            <Card className="rounded-[20px] bg-app-bg-elevated p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.costBasis')}</p>
              <p className="mt-2 text-base font-semibold text-text-primary">
                {formatMoney(portfolio.totalCostBasis, 'USD', locale)}
              </p>
            </Card>
            <Card className="rounded-[20px] bg-app-bg-elevated p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.unrealizedPnl')}</p>
              <p className="mt-2 text-base font-semibold text-text-primary">
                {formatMoney(portfolio.totalUnrealizedPnl, 'USD', locale)}
              </p>
            </Card>
            <Card className="rounded-[20px] bg-app-bg-elevated p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.realizedIncome')}</p>
              <p className="mt-2 text-base font-semibold text-text-primary">
                {formatMoney(portfolio.totalRealizedIncome, 'USD', locale)}
              </p>
            </Card>
            <Card className="rounded-[20px] bg-app-bg-elevated p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.accruedYield')}</p>
              <p className="mt-2 text-base font-semibold text-text-primary">
                {formatMoney(portfolio.totalAccruedYield, 'USD', locale)}
              </p>
            </Card>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <BellRing className="size-5 text-accent-cyan" />
              <p className="text-lg font-semibold text-text-primary">{t('portfolio.summary.title')}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[18px] bg-app-bg-elevated p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {t('portfolio.summary.severityBreakdown')}
                </p>
                <p className="mt-2 text-text-primary">
                  {alerts.filter((item) => item.severity === 'critical').length} / {alerts.filter((item) => item.severity === 'warning').length} / {alerts.filter((item) => item.severity === 'info').length}
                </p>
              </div>
              <div className="rounded-[18px] bg-app-bg-elevated p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {t('portfolio.summary.redemptionForecast')}
                </p>
                <p className="mt-2 text-text-primary">
                  {formatMoney(portfolio.totalRedemptionForecast, 'USD', locale)}
                </p>
              </div>
              <div className="rounded-[18px] bg-app-bg-elevated p-4 sm:col-span-2 xl:col-span-1">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {t('portfolio.summary.lastSync')}
                </p>
                <p className="mt-2 text-text-primary">{formatDateTime(portfolio.lastSyncAt, locale)}</p>
              </div>
            </div>
          </Card>

          {isZeroValue ? (
            <Card className="rounded-[24px] border border-warning/30 bg-warning/8 p-5">
              <p className="text-sm font-semibold text-text-primary">{t('portfolio.metrics.currentValue')}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t('empty.portfolio.noPositionsDescription')}
              </p>
            </Card>
          ) : null}
        </div>
      </PageSection>

      {!portfolio.positions.length ? (
        <PageSection>
          <Card className="space-y-4 p-6 md:p-7">
            <p className="text-lg font-semibold text-text-primary">{t('empty.portfolio.noPositionsTitle')}</p>
            <p className="text-sm leading-6 text-text-secondary">{t('empty.portfolio.noPositionsDescription')}</p>
            <div className="flex flex-wrap gap-2 max-sm:flex-col">
              <Button className="max-sm:w-full" onClick={() => void navigate('/assets')}>
                {t('actions.openAssetHub')}
              </Button>
              <Button className="max-sm:w-full" variant="secondary" onClick={() => void navigate('/portfolio')}>
                {t('actions.switchAddress')}
              </Button>
              <Button className="max-sm:w-full" variant="secondary" onClick={() => void syncQueries()}>
                <RefreshCw className="size-4" />
                {t('actions.resync')}
              </Button>
            </div>
          </Card>
        </PageSection>
      ) : (
        <PageSection className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="space-y-4 p-5">
            <p className="text-lg font-semibold text-text-primary">{t('portfolio.sections.allocationMix')}</p>
            <div className="space-y-3">
              {Object.entries(portfolio.allocationMix).map(([assetId, weight]) => (
                <div key={assetId} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-text-primary">{assetId}</span>
                    <span className="text-text-secondary">{formatPercent(weight ?? 0, locale)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-app-bg-elevated">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.88),rgba(79,124,255,0.92))]"
                      style={{ width: `${Math.max(6, Math.round((weight ?? 0) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="space-y-4 p-5">
              <p className="text-lg font-semibold text-text-primary">{t('portfolio.sections.alertTimeline')}</p>
              <div className="space-y-3">
                {alerts.length ? (
                  alerts.map((alert) => (
                    <div key={alert.id} className="rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={severityTone(alert.severity)}>{alert.severity}</Badge>
                            {alert.acked ? <Badge tone="success">{t('portfolio.states.acknowledged')}</Badge> : null}
                            {alert.read ? <Badge tone="info">{t('portfolio.states.read')}</Badge> : null}
                          </div>
                          <p className="font-semibold text-text-primary">{alert.title}</p>
                          <p className="text-sm leading-6 text-text-secondary">{alert.detail}</p>
                          <p className="text-xs text-text-muted">{formatDateTime(alert.detectedAt, locale)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 max-sm:w-full">
                          <Button variant="secondary" size="sm" onClick={() => setSelectedAlert(alert)}>
                            {t('portfolio.states.detail')}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={ackMutation.isPending || Boolean(alert.acked)}
                            onClick={() => void ackMutation.mutateAsync(alert.id)}
                          >
                            <CheckCheck className="size-4" />
                            {t('actions.acknowledge')}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={readMutation.isPending || Boolean(alert.read)}
                            onClick={() => void readMutation.mutateAsync(alert.id)}
                          >
                            {t('actions.markRead')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[20px] bg-app-bg-elevated p-4 text-sm text-text-secondary">
                    {t('portfolio.states.noAlerts')}
                  </div>
                )}
              </div>
            </Card>

            <div className="space-y-4">
              <p className="text-lg font-semibold text-text-primary">{t('portfolio.sections.trackedPositions')}</p>
              {(portfolio.positions ?? []).map((position) => {
                const proof = proofByAsset.get(position.assetId)
                return (
                  <Card key={position.id} className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-text-primary">{position.assetName}</p>
                          {proof ? <Badge tone={severityTone(proof.executionReadiness === 'view_only' ? 'warning' : 'info')}>{proof.executionAdapterKind}</Badge> : null}
                          {proof ? <Badge tone="info">{proof.proofFreshness.label}</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">
                          {proof?.monitoringNotes[0] || t('portfolio.states.monitoringFallback')}
                        </p>
                      </div>
                      <Button variant="secondary" onClick={() => void navigate(`/assets/${position.assetId}/proof`)}>
                        <ArrowRight className="size-4" />
                        {t('actions.viewProof')}
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <Card className="rounded-[20px] bg-app-bg-elevated p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.currentValue')}</p>
                        <p className="mt-2 text-text-primary">{formatMoney(position.currentValue, 'USD', locale)}</p>
                      </Card>
                      <Card className="rounded-[20px] bg-app-bg-elevated p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.costBasis')}</p>
                        <p className="mt-2 text-text-primary">{formatMoney(position.costBasis, 'USD', locale)}</p>
                      </Card>
                      <Card className="rounded-[20px] bg-app-bg-elevated p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.unrealizedPnl')}</p>
                        <p className="mt-2 text-text-primary">{formatMoney(position.unrealizedPnl, 'USD', locale)}</p>
                      </Card>
                      <Card className="rounded-[20px] bg-app-bg-elevated p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.realizedIncome')}</p>
                        <p className="mt-2 text-text-primary">{formatMoney(position.realizedIncome, 'USD', locale)}</p>
                      </Card>
                      <Card className="rounded-[20px] bg-app-bg-elevated p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.accruedYield')}</p>
                        <p className="mt-2 text-text-primary">{formatMoney(position.accruedYield, 'USD', locale)}</p>
                      </Card>
                      <Card className="rounded-[20px] bg-app-bg-elevated p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.redemptionForecast')}</p>
                        <p className="mt-2 text-text-primary">{formatMoney(position.redemptionForecast, 'USD', locale)}</p>
                      </Card>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.allocation')}</p>
                        <p className="mt-2 text-text-primary">{formatPercent(position.allocationWeightPct ?? 0, locale)}</p>
                      </div>
                      <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.liquidityRisk')}</p>
                        <p className="mt-2 text-text-primary">{position.liquidityRisk || t('common.notAvailable')}</p>
                      </div>
                      <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('portfolio.metrics.nextWindow')}</p>
                        <p className="mt-2 text-text-primary">{proof?.redemptionWindow.label || position.nextRedemptionWindow || 'T+0'}</p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </PageSection>
      )}

      <DetailDrawer
        open={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert?.title ?? ''}
        description={selectedAlert?.detail ?? ''}
      >
        {selectedAlert ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={severityTone(selectedAlert.severity)}>{selectedAlert.severity}</Badge>
              <Badge tone="neutral">{formatDateTime(selectedAlert.detectedAt, locale)}</Badge>
            </div>
            {selectedAlert.sourceRef ? (
              <p className="text-sm leading-6 text-text-secondary">{selectedAlert.sourceRef}</p>
            ) : null}
          </div>
        ) : null}
      </DetailDrawer>
    </PageContainer>
  )
}
