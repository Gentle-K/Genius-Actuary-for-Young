import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import {
  EmptyState,
  MetricCard,
  NextActionList,
  SectionCard,
  SkeletonList,
  StatusBadge,
  StatusSummaryCard,
} from '@/components/product/workspace-ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getAnalysisStatusDescriptor,
  getTradingAutomationStatusDescriptor,
  resolveDataTruthState,
  resolveEnvironmentMode,
  toAnalysisStatus,
  toTradingAutomationStatus,
} from '@/domain/status'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import { formatDateTime } from '@/lib/utils/format'
import { continuePath } from '@/features/analysis/lib/view-models'

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const apiMode = useAppStore((state) => state.apiMode)
  const locale = useAppStore((state) => state.locale)
  const walletAddress = useAppStore((state) => state.walletAddress)

  const dashboardQuery = useQuery({
    queryKey: ['workspace', 'dashboard'],
    queryFn: adapter.dashboard.getOverview,
  })
  const sessionsQuery = useQuery({
    queryKey: ['workspace', 'sessions'],
    queryFn: () => adapter.analysis.list({ page: 1, pageSize: 20 }),
  })
  const stocksBootstrapQuery = useQuery({
    queryKey: ['workspace', 'stocks', 'bootstrap'],
    queryFn: adapter.stocks.getBootstrap,
  })
  const paperAccountQuery = useQuery({
    queryKey: ['workspace', 'stocks', 'paper-account'],
    queryFn: () => adapter.stocks.getAccount('paper'),
  })

  const sessions = sessionsQuery.data?.items ?? []
  const latestUpdate =
    paperAccountQuery.data?.updatedAt ??
    sessions[0]?.updatedAt ??
    dashboardQuery.data?.recentSessions[0]?.updatedAt

  const environmentMode = resolveEnvironmentMode('/workspace', apiMode, null)
  const dataTruth = resolveDataTruthState({
    apiMode,
    pathname: '/workspace',
    lastUpdated: latestUpdate,
  })
  const clarifyingSessions = sessions.filter((item) => item.status === 'CLARIFYING')
  const reportReadySessions = sessions.filter(
    (item) =>
      item.status === 'READY_FOR_EXECUTION' ||
      item.status === 'COMPLETED' ||
      item.status === 'EXECUTING' ||
      item.status === 'MONITORING',
  )
  const nextActions = (() => {
    const items = []

    if (clarifyingSessions[0]) {
      items.push({
        id: 'clarify',
        label: clarifyingSessions[0].problemStatement,
        detail: getAnalysisStatusDescriptor(
          toAnalysisStatus(clarifyingSessions[0].status),
          clarifyingSessions[0].updatedAt,
        ).nextAction,
        action: (
          <Button size="sm" onClick={() => void navigate(continuePath(clarifyingSessions[0]))}>
            Continue
          </Button>
        ),
      })
    }

    if (reportReadySessions[0]) {
      items.push({
        id: 'report',
        label: reportReadySessions[0].problemStatement,
        detail: 'Open the report or execution package only after unresolved risks are reviewed.',
        action: (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void navigate(`/reports/${reportReadySessions[0].id}`)}
          >
            Open report
          </Button>
        ),
      })
    }

    if (!items.length) {
      items.push({
        id: 'new-analysis',
        label: t('workspace.primaryAction'),
        detail: 'Start with one decision brief, then let the workspace build evidence, calculations, and execution posture.',
        action: (
          <Button size="sm" onClick={() => void navigate('/new-analysis')}>
            {t('workspace.primaryAction')}
          </Button>
        ),
      })
    }

    return items
  })()

  const autopilotDescriptor = paperAccountQuery.data
    ? getTradingAutomationStatusDescriptor({
        status: toTradingAutomationStatus({
          mode: 'paper',
          autopilotState: paperAccountQuery.data.autopilotState,
          killSwitchActive: paperAccountQuery.data.killSwitchActive,
          eligibleForLiveArm: stocksBootstrapQuery.data?.promotionGate.eligibleForLiveArm,
        }),
        blockers: stocksBootstrapQuery.data?.promotionGate.blockers,
        updatedAt: paperAccountQuery.data.updatedAt,
      })
    : undefined

  if (dashboardQuery.isLoading || sessionsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('layout.navigation.workspace')}
          title={t('workspace.title')}
          description={t('workspace.description')}
          primaryAction={
            <Button onClick={() => void navigate('/new-analysis')}>
              {t('workspace.primaryAction')}
            </Button>
          }
        />
        <SkeletonList description="Loading the command center surfaces..." count={4} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('layout.navigation.workspace')}
        title={t('workspace.title')}
        description={t('workspace.description')}
        primaryAction={
          <Button onClick={() => void navigate('/new-analysis')}>
            {t('workspace.primaryAction')}
          </Button>
        }
        statusBadges={
          <>
            <StatusBadge
              label={t(`status.environment.${environmentMode}`)}
              severity={environmentMode === 'live' ? 'danger' : 'info'}
            />
            <StatusBadge
              label={dataTruth.label}
              severity={dataTruth.severity}
              description={dataTruth.reason}
            />
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('workspace.cards.mode')}
          value={t(`status.environment.${environmentMode}`)}
          helperText={environmentMode === 'demo' ? 'Mock and demo data stay visibly separated from real actions.' : 'Connected state can still be blocked by safety checks.'}
        />
        <MetricCard
          label={t('workspace.cards.truth')}
          value={dataTruth.label}
          helperText={dataTruth.reason}
          timestamp={latestUpdate}
        />
        <MetricCard
          label={t('workspace.cards.blockers')}
          value={String(clarifyingSessions.length + (stocksBootstrapQuery.data?.promotionGate.blockers.length ?? 0))}
          helperText="Blockers stay visible until a specific next action resolves them."
        />
        <MetricCard
          label={t('workspace.cards.updates')}
          value={latestUpdate ? formatDateTime(latestUpdate, locale) : '--'}
          helperText="Latest session or autopilot state writeback."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <div className="space-y-6">
          <SectionCard title={t('workspace.sections.nextActions')} description="Keep the next safe action obvious on every pass through the workspace.">
            <NextActionList actions={nextActions} />
          </SectionCard>

          <SectionCard title={t('workspace.sections.recentSessions')} description="Recent analysis sessions stay anchored to status, confidence, and next action.">
            {sessions.length ? (
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session) => {
                  const descriptor = getAnalysisStatusDescriptor(
                    toAnalysisStatus(session.status),
                    session.updatedAt,
                  )

                  return (
                    <Card key={session.id} className="space-y-3 rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-text-primary">{session.problemStatement}</p>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge
                              label={descriptor.label}
                              severity={descriptor.severity}
                              description={descriptor.reason}
                              timestamp={session.updatedAt}
                            />
                          </div>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => void navigate(continuePath(session))}>
                          Open
                        </Button>
                      </div>
                      <p className="text-sm leading-6 text-text-secondary">
                        {descriptor.nextAction}
                      </p>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                title="No analysis sessions yet"
                description="Start a new analysis to create the first decision workspace."
                primaryAction={
                  <Button onClick={() => void navigate('/new-analysis')}>{t('workspace.primaryAction')}</Button>
                }
              />
            )}
          </SectionCard>

          <SectionCard title={t('workspace.sections.reportReady')} description="Reports that are ready for review or execution preparation stay grouped here.">
            {reportReadySessions.length ? (
              <div className="space-y-3">
                {reportReadySessions.slice(0, 3).map((session) => (
                  <Card key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-text-primary">{session.problemStatement}</p>
                      <p className="text-sm text-text-secondary">Open the report before preparing execution.</p>
                    </div>
                    <Button size="sm" onClick={() => void navigate(`/reports/${session.id}`)}>
                      Open report
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No report-ready session is available yet.</p>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          {autopilotDescriptor ? (
            <StatusSummaryCard
              title={t('workspace.sections.autopilot')}
              descriptor={autopilotDescriptor}
              action={
                <Button size="sm" variant="secondary" onClick={() => void navigate('/stocks?mode=paper')}>
                  Open cockpit
                </Button>
              }
            />
          ) : (
            <SectionCard title={t('workspace.sections.autopilot')}>
              <p className="text-sm text-text-secondary">{t('workspace.emptyAutopilot')}</p>
            </SectionCard>
          )}

          <SectionCard title={t('workspace.sections.portfolio')} description="Portfolio monitoring is available without changing the current decision flow.">
            {walletAddress ? (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">
                  Connected wallet: <span className="text-text-primary">{walletAddress}</span>
                </p>
                <Button variant="secondary" onClick={() => void navigate(`/portfolio/${walletAddress}`)}>
                  Open portfolio
                </Button>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{t('workspace.emptyPortfolio')}</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
