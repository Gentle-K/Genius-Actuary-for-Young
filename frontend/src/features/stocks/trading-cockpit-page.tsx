import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  ShieldBan,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import {
  EmptyState,
  MetricCard,
  RiskPreflightModal,
  SectionCard,
  StatusBadge,
  StatusSummaryCard,
} from '@/components/product/workspace-ui'
import { Button } from '@/components/ui/button'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import { formatDateTime, formatMoney, formatPercent } from '@/lib/utils/format'
import { StocksWorkbenchShell } from '@/features/stocks/workbench-shell'
import { useStocksCopy } from '@/features/stocks/copy'
import {
  getStocksErrorMessage,
  strategyLabel,
  useStocksMode,
} from '@/features/stocks/lib'
import {
  getLiveAutopilotActionState,
  getTradingAutomationStatusDescriptor,
  toTradingAutomationStatus,
} from '@/domain/status'

export function TradingCockpitPage() {
  const adapter = useApiAdapter()
  const copy = useStocksCopy()
  const locale = useAppStore((state) => state.locale)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [killSwitchOpen, setKillSwitchOpen] = useState(false)
  const bootstrapQuery = useQuery({
    queryKey: ['stocks', 'bootstrap'],
    queryFn: adapter.stocks.getBootstrap,
  })
  const { mode, setMode } = useStocksMode(bootstrapQuery.data?.settings.defaultMode ?? 'paper')

  const accountQuery = useQuery({
    queryKey: ['stocks', 'account', mode],
    queryFn: () => adapter.stocks.getAccount(mode),
    refetchInterval: 15_000,
  })
  const positionsQuery = useQuery({
    queryKey: ['stocks', 'positions', mode],
    queryFn: () => adapter.stocks.getPositions(mode),
    refetchInterval: 15_000,
  })
  const cyclesQuery = useQuery({
    queryKey: ['stocks', 'decision-cycles', mode],
    queryFn: () => adapter.stocks.getDecisionCycles(mode),
    refetchInterval: 15_000,
  })

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['stocks', 'bootstrap'] }),
      queryClient.invalidateQueries({ queryKey: ['stocks', 'account', mode] }),
      queryClient.invalidateQueries({ queryKey: ['stocks', 'positions', mode] }),
      queryClient.invalidateQueries({ queryKey: ['stocks', 'decision-cycles', mode] }),
    ])
  }, [mode, queryClient])

  const stateMutation = useMutation({
    mutationFn: (nextState: 'paused' | 'armed') =>
      adapter.stocks.setAutopilotState(mode, nextState),
    onSuccess: async () => {
      toast.success(copy.messages.stateUpdated)
      await refreshAll()
    },
    onError: (error) => {
      toast.error(getStocksErrorMessage(error, copy.actions.retry))
    },
  })
  const killSwitchMutation = useMutation({
    mutationFn: () => adapter.stocks.triggerKillSwitch(mode, 'Manual operator halt.'),
    onSuccess: async () => {
      toast.error(copy.messages.killSwitch)
      setKillSwitchOpen(false)
      await refreshAll()
    },
    onError: (error) => {
      toast.error(getStocksErrorMessage(error, copy.actions.retry))
    },
  })

  const account = accountQuery.data
  const positions = positionsQuery.data?.positions ?? []
  const latestCycle = cyclesQuery.data?.[0]
  const promotionGate = bootstrapQuery.data?.promotionGate
  const liveActionState = getLiveAutopilotActionState({
    eligibleForLiveArm: promotionGate?.eligibleForLiveArm,
    blockers: promotionGate?.blockers,
  })
  const automationStatus = toTradingAutomationStatus({
    mode,
    autopilotState: account?.autopilotState,
    killSwitchActive: account?.killSwitchActive,
    eligibleForLiveArm: promotionGate?.eligibleForLiveArm,
  })
  const automationDescriptor = getTradingAutomationStatusDescriptor({
    status: automationStatus,
    blockers: promotionGate?.blockers,
    updatedAt: account?.updatedAt ?? promotionGate?.evaluatedAt,
  })
  const promotionProgress = `${Math.min(20, promotionGate?.paperTradingDays ?? 0)} of 20 checks passed`
  const showKillSwitch = Boolean(
    account && (account.killSwitchActive || account.autopilotState === 'armed' || account.autopilotState === 'running'),
  )

  const primaryAction = useMemo(() => {
    if (!account) {
      return {
        label: copy.actions.refresh,
        onClick: () => void refreshAll(),
        icon: <RefreshCw className="size-4" />,
      }
    }

    if (mode === 'live' && liveActionState.disabled) {
      return {
        label: copy.actions.resolve,
        onClick: () => void navigate(`/stocks/settings?mode=${mode}`),
        icon: <AlertTriangle className="size-4" />,
      }
    }

    if (account.autopilotState === 'armed' || account.autopilotState === 'running') {
      return {
        label: copy.actions.pause,
        onClick: () => stateMutation.mutate('paused'),
        icon: <PauseCircle className="size-4" />,
      }
    }

    return {
      label: copy.actions.arm,
      onClick: () => stateMutation.mutate('armed'),
      icon: <PlayCircle className="size-4" />,
    }
  }, [
    account,
    copy.actions.arm,
    copy.actions.pause,
    copy.actions.refresh,
    copy.actions.resolve,
    liveActionState.disabled,
    mode,
    navigate,
    refreshAll,
    stateMutation,
  ])

  if (
    bootstrapQuery.isError ||
    accountQuery.isError ||
    positionsQuery.isError ||
    cyclesQuery.isError
  ) {
    const description = getStocksErrorMessage(
      bootstrapQuery.error ?? accountQuery.error ?? positionsQuery.error ?? cyclesQuery.error,
      copy.actions.retry,
    )

    return (
      <SectionCard
        title={copy.pages.cockpit.title}
        description={description}
        action={
          <Button variant="secondary" onClick={() => void refreshAll()}>
            {copy.actions.retry}
          </Button>
        }
        state="danger"
      >
        <p className="text-sm text-text-secondary">{description}</p>
      </SectionCard>
    )
  }

  const positionsEmptyText =
    account?.autopilotState === 'paused' ? copy.messages.positionsPaused : copy.messages.positionsWaiting

  return (
    <>
      <StocksWorkbenchShell
        title={copy.pages.cockpit.title}
        description={copy.pages.cockpit.description}
        mode={mode}
        onModeChange={setMode}
        account={account}
        bootstrap={bootstrapQuery.data}
        actions={
          <>
            <Button
              onClick={primaryAction.onClick}
              disabled={stateMutation.isPending}
              title={mode === 'live' ? liveActionState.reason : undefined}
            >
              {primaryAction.icon}
              {primaryAction.label}
            </Button>
            <Button variant="secondary" onClick={() => void refreshAll()}>
              <RefreshCw className="size-4" />
              {copy.actions.refresh}
            </Button>
            {showKillSwitch ? (
              <Button
                variant="danger"
                onClick={() => setKillSwitchOpen(true)}
                disabled={killSwitchMutation.isPending}
              >
                <ShieldBan className="size-4" />
                {copy.actions.halt}
              </Button>
            ) : null}
          </>
        }
      >
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <div className="space-y-5">
            <StatusSummaryCard title={copy.sections.safetySummary} descriptor={automationDescriptor} />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label={copy.metrics.equity}
                value={formatMoney(account?.equity, 'USD', locale)}
                helperText={`Mode: ${mode === 'live' ? copy.shell.mode.live : copy.shell.mode.paper}`}
                timestamp={account?.updatedAt}
                status={automationDescriptor.severity}
              />
              <MetricCard
                label={copy.metrics.buyingPower}
                value={formatMoney(account?.buyingPower, 'USD', locale)}
                helperText={account?.providerName ?? 'alpaca'}
              />
              <MetricCard
                label={copy.metrics.dayPnl}
                value={formatMoney(account?.dayPnl, 'USD', locale)}
                helperText="Paper and demo metrics remain simulated until live mode is armed."
              />
              <MetricCard
                label={copy.metrics.grossExposure}
                value={formatPercent(account?.grossExposurePct ?? 0, locale)}
                helperText="Gross exposure against the configured cap."
              />
              <MetricCard
                label={copy.metrics.openPositions}
                value={String(account?.openPositions ?? 0)}
                helperText="Open positions in the current mode only."
              />
            </div>

            <SectionCard
              title={copy.sections.positions}
              description="Review current positions before trusting candidate or order activity."
              density="compact"
            >
              {positions.length ? (
                <div className="overflow-hidden rounded-[22px] border border-border-subtle">
                  <div className="hidden grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.8fr))] gap-3 bg-app-bg-elevated px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted md:grid">
                    <span>Symbol</span>
                    <span>Value</span>
                    <span>PnL</span>
                    <span>Exposure</span>
                    <span>Risk cap</span>
                  </div>
                  <div className="divide-y divide-border-subtle">
                    {positions.map((position) => (
                      <div
                        key={position.ticker}
                        className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.8fr))] md:items-center"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary">{position.ticker}</p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {position.companyName}
                            {position.entryStrategy ? ` · ${strategyLabel(position.entryStrategy)}` : ''}
                          </p>
                        </div>
                        <p className="text-sm text-text-secondary">
                          {formatMoney(position.marketValue, 'USD', locale)}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {formatMoney(position.unrealizedPnl, 'USD', locale)}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {formatPercent(
                            account?.equity ? position.marketValue / account.equity : 0,
                            locale,
                          )}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {formatMoney(position.stopPrice, 'USD', locale)}
                          {' / '}
                          {formatMoney(position.takeProfitPrice, 'USD', locale)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title={copy.sections.positions}
                  description={positionsEmptyText}
                  reason={automationDescriptor.reason}
                />
              )}
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard
              title={copy.sections.promotionGate}
              description="Live mode remains blocked until the promotion gate passes and every missing check is explicit."
              state={promotionGate?.eligibleForLiveArm ? 'highlight' : 'warning'}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard
                  label="Checks passed"
                  value={promotionProgress}
                  helperText="Paper-trading readiness is presented as a gate, not a reward."
                />
                <MetricCard
                  label={copy.metrics.fillRate}
                  value={formatPercent(promotionGate?.fillSuccessRate ?? 0, locale)}
                  helperText="Order and fill writeback success rate."
                />
                <MetricCard
                  label={copy.metrics.maxDrawdown}
                  value={formatPercent(promotionGate?.maxDrawdownPct ?? 0, locale)}
                  helperText="Paper-mode max drawdown threshold."
                />
                <MetricCard
                  label={copy.metrics.unresolved}
                  value={String(promotionGate?.unresolvedOrdersCount ?? 0)}
                  helperText="Orders still waiting for reconciliation."
                />
              </div>
              {(promotionGate?.blockers ?? []).length ? (
                <div className="mt-4 space-y-2 rounded-[20px] border border-warning/25 bg-warning/8 p-4">
                  {(promotionGate?.blockers ?? []).map((blocker) => (
                    <div key={blocker} className="flex gap-2 text-sm text-text-secondary">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                      <span>{blocker}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title={copy.sections.latestCycle}
              description="Keep the most recent scan, AI rationale, and safe next action on the same rail."
            >
              {latestCycle ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={latestCycle.status} severity="info" />
                    <StatusBadge
                      label={formatDateTime(latestCycle.createdAt, locale)}
                      severity="neutral"
                    />
                  </div>
                  <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                    <p className="text-sm font-semibold text-text-primary">{latestCycle.summary}</p>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      Last scan: {formatDateTime(latestCycle.createdAt, locale)}
                    </p>
                  </div>
                  {latestCycle.aiDecisions.slice(0, 3).map((decision) => (
                    <div
                      key={decision.decisionId}
                      className="rounded-[20px] border border-border-subtle bg-bg-surface p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-text-primary">{decision.ticker}</p>
                        <StatusBadge
                          label={`${Math.round(decision.confidence * 100)}% confidence`}
                          severity="info"
                        />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">
                        {decision.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={copy.sections.latestCycle}
                  description={copy.empty.candidates}
                  reason={automationDescriptor.nextAction}
                  primaryAction={
                    <Button variant="secondary" onClick={() => void refreshAll()}>
                      {copy.actions.refresh}
                    </Button>
                  }
                />
              )}
            </SectionCard>
          </div>
        </section>
      </StocksWorkbenchShell>

      <RiskPreflightModal
        open={killSwitchOpen}
        onClose={() => setKillSwitchOpen(false)}
        title={copy.actions.halt}
        description={copy.messages.killSwitchDescription}
        summary={[
          { label: 'Mode', value: mode === 'live' ? copy.shell.mode.live : copy.shell.mode.paper },
          { label: 'Provider', value: account?.providerName ?? 'alpaca' },
          { label: 'Autopilot state', value: automationDescriptor.label },
          { label: 'Open positions', value: String(account?.openPositions ?? 0) },
        ]}
        blockers={automationDescriptor.blockingChecks}
        confirmLabel={copy.actions.confirmKillSwitch}
        onConfirm={() => killSwitchMutation.mutate()}
        confirmDisabled={killSwitchMutation.isPending}
      />
    </>
  )
}
