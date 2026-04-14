import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Copy,
  ExternalLink,
  FileDown,
  RefreshCw,
  Share2,
  TriangleAlert,
} from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { ChartCard } from '@/components/charts/chart-card'
import { PageHeader } from '@/components/layout/page-header'
import {
  CalculationCard,
  ConfidenceBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  PreviewNote,
  ReportSection,
  SourceCard,
  StatusBadge,
} from '@/components/product/decision-ui'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { exportToPdf } from '@/lib/export/pdf'
import { useAppStore } from '@/lib/store/app-store'
import { formatDate } from '@/lib/utils/format'
import {
  extractExecutiveSummary,
  modeLabel,
  reportState,
  sessionDisplayTitle,
  sessionConfidence,
} from '@/features/analysis/lib/view-models'

export function ReportPage() {
  const { t } = useTranslation()
  const { reportId = '', sessionId = '' } = useParams()
  const resolvedId = reportId || sessionId
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const locale = useAppStore((state) => state.locale)
  const reportSections = [
    { id: 'summary', label: t('analysis.reportPage.sections.summary') },
    { id: 'eligibility', label: t('analysis.reportPage.sections.eligibility') },
    { id: 'asset-facts', label: t('analysis.reportPage.sections.assetFacts') },
    { id: 'goal', label: t('analysis.reportPage.sections.goal') },
    { id: 'assumptions', label: t('analysis.reportPage.sections.assumptions') },
    { id: 'facts', label: t('analysis.reportPage.sections.facts') },
    { id: 'costs', label: t('analysis.reportPage.sections.costs') },
    { id: 'risks', label: t('analysis.reportPage.sections.risks') },
    { id: 'options', label: t('analysis.reportPage.sections.options') },
    { id: 'scenarios', label: t('analysis.reportPage.sections.scenarios') },
    { id: 'calculations', label: t('analysis.reportPage.sections.calculations') },
    { id: 'charts', label: t('analysis.reportPage.sections.charts') },
    { id: 'evidence', label: t('analysis.reportPage.sections.evidence') },
    { id: 'execution', label: t('analysis.reportPage.sections.execution') },
    { id: 'monitoring', label: t('analysis.reportPage.sections.monitoring') },
    { id: 'receipts', label: t('analysis.reportPage.sections.receipts') },
    { id: 'unknowns', label: t('analysis.reportPage.sections.unknowns') },
    { id: 'recommendation', label: t('analysis.reportPage.sections.recommendation') },
    { id: 'boundary', label: t('analysis.reportPage.sections.boundary') },
  ] as const

  const sessionQuery = useQuery({
    queryKey: ['analysis', resolvedId, 'report-session', locale],
    queryFn: () => adapter.analysis.getById(resolvedId),
  })

  const reportQuery = useQuery({
    queryKey: ['analysis', resolvedId, 'report', locale],
    queryFn: () => adapter.analysis.getReport(resolvedId),
  })

  const reanalyzeMutation = useMutation({
    mutationFn: () => adapter.analysis.requestMoreFollowUp(resolvedId),
    onSuccess: async () => {
      toast.success(t('analysis.reportPage.reopened'))
      await navigate(`/sessions/${resolvedId}/clarify`)
    },
  })

  useEffect(() => {
    if (!sessionQuery.data) return
    if (sessionQuery.data.status === 'CLARIFYING') {
      void navigate(`/sessions/${resolvedId}/clarify`, { replace: true })
    }
    if (sessionQuery.data.status === 'ANALYZING') {
      void navigate(`/sessions/${resolvedId}/analyzing`, { replace: true })
    }
  }, [navigate, resolvedId, sessionQuery.data])

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/reports/${resolvedId}`
    await navigator.clipboard.writeText(url)
    toast.success(t('analysis.reportPage.linkCopied'))
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/reports/${resolvedId}`
    if (navigator.share) {
      await navigator.share({
        title: t('analysis.reportPage.shareTitle'),
        url,
      })
      return
    }
    await navigator.clipboard.writeText(url)
    toast.success(t('analysis.reportPage.shareFallback'))
  }

  const handleExport = async () => {
    if (!sessionQuery.data || !reportQuery.data) return
    await exportToPdf({
      title: `genius-actuary-report-${resolvedId}`,
      headers: [
        t('analysis.reportPage.exportHeaders.section'),
        t('analysis.reportPage.exportHeaders.item'),
        t('analysis.reportPage.exportHeaders.value'),
        t('analysis.reportPage.exportHeaders.detail'),
      ],
      rows: [
        ['overview', 'problem', reportQuery.data.summaryTitle, modeLabel(reportQuery.data.mode)],
        ['overview', 'status', sessionQuery.data.status, reportState(sessionQuery.data, reportQuery.data).label],
        ...reportQuery.data.highlights.map((item) => [
          'highlight',
          item.label,
          item.value,
          item.detail,
        ]),
        ...reportQuery.data.calculations.map((item) => [
          'calculation',
          item.taskType,
          item.result,
          item.formulaExpression,
        ]),
      ],
    })
  }

  if (sessionQuery.isError || reportQuery.isError) {
    return (
      <ErrorState
        title={t('analysis.reportPage.errorTitle')}
        description={
          (sessionQuery.error as Error | undefined)?.message ??
          (reportQuery.error as Error | undefined)?.message ??
          t('analysis.reportPage.errorFallback')
        }
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void sessionQuery.refetch()
              void reportQuery.refetch()
            }}
          >
            {t('common.retry')}
          </Button>
        }
      />
    )
  }

  if (sessionQuery.isLoading || reportQuery.isLoading || !sessionQuery.data || !reportQuery.data) {
    return (
      <LoadingState
        title={t('analysis.reportPage.loadingTitle')}
        description={t('analysis.reportPage.loadingDescription')}
      />
    )
  }

  const session = sessionQuery.data
  const report = reportQuery.data
  const sessionTitle = sessionDisplayTitle(session, report)
  const confidence = sessionConfidence(session, report)
  const state = reportState(session, report)
  const evidenceStale = report.evidence.some(
    (item) => item.freshness?.bucket === 'stale',
  )
  const executiveSummary = extractExecutiveSummary(report.markdown, locale)
  const primaryAssetId =
    report.executionPlan?.targetAsset ||
    report.recommendedAllocations[0]?.assetId ||
    report.assetCards[0]?.assetId ||
    ''
  const recommendationLine =
    report.highlights[0]?.detail ?? session.lastInsight ?? executiveSummary

  const costRows =
    report.budgetItems?.map((item) => ({
      label: item.name,
      range: `${item.low} - ${item.high} ${item.currency}`,
      base: `${item.base} ${item.currency}`,
      note: item.rationale ?? t('analysis.decisionUi.calculationCard.noAdditionalNote'),
      confidence: item.confidence,
      type: item.itemType,
    })) ?? []

  const scenarioRows =
    report.budgetSummary != null
      ? [
          {
            label: t('analysis.reportPage.scenarioLabels.bestCase'),
            value: `${report.budgetSummary.netLow} ${report.budgetSummary.currency}`,
            detail: t('analysis.reportPage.scenarioDetails.bestCase'),
          },
          {
            label: t('analysis.reportPage.scenarioLabels.likelyCase'),
            value: `${report.budgetSummary.netBase} ${report.budgetSummary.currency}`,
            detail: t('analysis.reportPage.scenarioDetails.likelyCase'),
          },
          {
            label: t('analysis.reportPage.scenarioLabels.worstCase'),
            value: `${report.budgetSummary.netHigh} ${report.budgetSummary.currency}`,
            detail: t('analysis.reportPage.scenarioDetails.worstCase'),
          },
        ]
      : report.optionProfiles?.slice(0, 3).map((option) => ({
          label: option.name,
          value: option.estimatedCostBase
            ? `${option.estimatedCostBase} ${option.currency}`
            : t('analysis.reportPage.rangeUnavailable'),
          detail: option.summary,
        })) ?? []

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('analysis.reportPage.eyebrow')}
          title={report.summaryTitle}
          description={t('analysis.reportPage.description')}
          actions={
            <>
              {primaryAssetId ? (
                <Button onClick={() => void navigate(`/assets/${primaryAssetId}/proof`)}>
                  <ExternalLink className="size-4" />
                  {t('analysis.reportPage.openProofCenter')}
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => void navigate(`/sessions/${resolvedId}/execute`)}>
                {t('analysis.reportPage.reviewExecutionPlan')}
              </Button>
              <Button variant="secondary" onClick={() => void navigate(`/sessions/${resolvedId}/execute`)}>
                {t('analysis.reportPage.executeOnHashKeyChain')}
              </Button>
              <Button variant="secondary" onClick={() => void navigate(`/sessions/${resolvedId}`)}>
                {t('analysis.reportPage.openSession')}
              </Button>
              <Button variant="secondary" onClick={() => void reanalyzeMutation.mutateAsync()}>
                <RefreshCw className="size-4" />
                {t('analysis.reportPage.reopenClarification')}
              </Button>
              <Button variant="secondary" onClick={() => void handleExport()}>
                <FileDown className="size-4" />
                {t('analysis.reportPage.export')}
              </Button>
              <Button variant="secondary" onClick={() => void handleCopyLink()}>
                <Copy className="size-4" />
                {t('analysis.reportPage.copyLink')}
              </Button>
              <Button variant="secondary" onClick={() => void handleShare()}>
                <Share2 className="size-4" />
                {t('analysis.reportPage.shareReport')}
              </Button>
            </>
          }
        />

        <div className="xl:hidden">
          <Card className="p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">{t('analysis.reportPage.jumpToSection')}</p>
            <Select
              value=""
              onChange={(event) => {
                if (event.target.value) {
                  window.location.hash = event.target.value
                }
              }}
            >
              <option value="">{t('analysis.reportPage.selectSection')}</option>
              {reportSections.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Card>
        </div>

        <Card className="space-y-5 overflow-hidden p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={state.tone}>{state.label}</Badge>
                <Badge tone="neutral">{modeLabel(report.mode)}</Badge>
                <StatusBadge status={session.status} />
                <ConfidenceBadge confidence={confidence} />
              </div>
              <h2 className="max-w-4xl text-[2rem] font-semibold leading-[0.96] tracking-[-0.05em] text-text-primary">
                {executiveSummary}
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-text-secondary">
                {recommendationLine}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {report.highlights.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-[20px] bg-app-bg-elevated p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-semibold text-text-primary">{item.value}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {evidenceStale ? (
            <div className="flex items-start gap-2 rounded-[20px] border border-[rgba(185,115,44,0.2)] bg-[rgba(185,115,44,0.08)] px-4 py-3 text-sm leading-6 text-warning">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {t('analysis.reportPage.staleEvidenceWarning')}
              </span>
            </div>
          ) : null}
        </Card>

        <ReportSection
          id="summary"
          title={t('analysis.reportPage.sections.summary')}
          description={t('analysis.reportPage.summaryDescription')}
        >
          <p className="text-sm leading-7 text-text-secondary">{executiveSummary}</p>
          <PreviewNote>
            {t('analysis.reportPage.summaryNote')}
          </PreviewNote>
        </ReportSection>

        <ReportSection
          id="eligibility"
          title={t('analysis.reportPage.sections.eligibility')}
          description={t('analysis.reportPage.eligibilityDescription')}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {(report.eligibilitySummary ?? []).map((item) => (
              <Card key={item.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-text-primary">{item.assetName}</p>
                  <Badge tone={item.status === 'eligible' ? 'success' : item.status === 'conditional' ? 'gold' : 'warning'}>
                    {t(`analysis.reportPage.eligibilityStatus.${item.status}`)}
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary">{item.reasons[0] ?? t('analysis.reportPage.noBlockerDetected')}</p>
                {(item.missingRequirements ?? []).length ? (
                  <p className="text-sm text-warning">{t('analysis.reportPage.missingPrefix')}: {item.missingRequirements.join(' · ')}</p>
                ) : null}
              </Card>
            ))}
          </div>
        </ReportSection>

        <ReportSection
          id="asset-facts"
          title={t('analysis.reportPage.sections.assetFacts')}
          description={t('analysis.reportPage.assetFactsDescription')}
        >
          <div className="grid gap-3 md:grid-cols-2">
              {report.assetCards.slice(0, 4).map((asset) => (
              <Card key={asset.assetId} className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-text-primary">{asset.name}</p>
                  <Badge tone="neutral">{asset.symbol}</Badge>
                </div>
                <div className="grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
                  <div>{t('analysis.reportPage.fields.settlement')}: {asset.settlementAsset || t('common.notAvailable')}</div>
                  <div>{t('analysis.reportPage.fields.kyc')}: L{asset.requiredKycLevel ?? asset.kycRequiredLevel ?? 0}</div>
                  <div>{t('analysis.reportPage.fields.indicativeYield')}: {asset.indicativeYield != null ? `${(asset.indicativeYield * 100).toFixed(2)}%` : t('common.notAvailable')}</div>
                  <div>{t('analysis.reportPage.fields.oracle')}: {asset.oracleProvider || t('common.notAvailable')}</div>
                </div>
                <p className="text-sm leading-6 text-text-secondary">{asset.fitSummary}</p>
                <Button variant="secondary" onClick={() => void navigate(`/assets/${asset.assetId}/proof`)}>
                  <ExternalLink className="size-4" />
                  {t('analysis.reportPage.viewProof')}
                </Button>
              </Card>
            ))}
          </div>
        </ReportSection>

        <ReportSection
          id="goal"
          title={t('analysis.reportPage.sections.goal')}
          description={t('analysis.reportPage.goalDescription')}
        >
          <div className="space-y-3">
            <div className="rounded-[20px] bg-app-bg-elevated p-4 text-sm leading-7 text-text-primary">
              {sessionTitle}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">{modeLabel(report.mode)}</Badge>
              <Badge tone="info">{t('analysis.reportPage.lastUpdated', { value: formatDate(session.updatedAt, locale) })}</Badge>
            </div>
          </div>
        </ReportSection>

        <ReportSection
          id="execution"
          title={t('analysis.reportPage.sections.execution')}
          description={t('analysis.reportPage.executionDescription')}
        >
          {report.executionPlan ? (
            <div className="space-y-4">
              <Card className="grid gap-3 p-4 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('analysis.reportPage.fields.targetAsset')}</p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">{report.executionPlan.targetAsset || t('common.notAvailable')}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('analysis.reportPage.fields.ticketSize')}</p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">{report.executionPlan.ticketSize}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('analysis.reportPage.fields.route')}</p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">{report.executionPlan.quote?.routeType ?? t('common.notAvailable')}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-text-muted">{t('analysis.reportPage.fields.expectedAmount')}</p>
                  <p className="mt-2 text-sm font-semibold text-text-primary">{report.executionPlan.quote?.expectedAmountOut ?? t('common.notAvailable')}</p>
                </div>
              </Card>
              <div className="space-y-3">
                {report.executionPlan.steps.map((step) => (
                  <Card key={step.id} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-text-primary">{step.stepIndex}. {step.title}</p>
                      <Badge tone="neutral">{step.stepType}</Badge>
                    </div>
                    <p className="text-sm text-text-secondary">{step.description}</p>
                    {(step.warnings ?? []).length ? (
                      <p className="text-sm text-warning">{step.warnings.join(' · ')}</p>
                    ) : null}
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title={t('analysis.reportPage.executionEmptyTitle')}
              description={t('analysis.reportPage.executionEmptyDescription')}
            />
          )}
        </ReportSection>

        <ReportSection
          id="monitoring"
          title={t('analysis.reportPage.sections.monitoring')}
          description={t('analysis.reportPage.monitoringDescription')}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {(report.positionSnapshots ?? []).map((item) => (
              <Card key={item.id} className="space-y-2 p-4">
                <p className="font-semibold text-text-primary">{item.assetName}</p>
                <p className="text-sm text-text-secondary">{t('analysis.reportPage.monitoringLines.balanceNavPrice', { balance: item.currentBalance, value: item.latestNavOrPrice })}</p>
                <p className="text-sm text-text-secondary">{t('analysis.reportPage.monitoringLines.pnlYield', { pnl: item.unrealizedPnl, yield: item.accruedYield })}</p>
                <p className="text-sm text-text-secondary">{t('analysis.reportPage.monitoringLines.nextRedemption', { value: item.nextRedemptionWindow || t('common.notAvailable') })}</p>
              </Card>
            ))}
          </div>
        </ReportSection>

        <ReportSection
          id="receipts"
          title={t('analysis.reportPage.sections.receipts')}
          description={t('analysis.reportPage.receiptsDescription')}
        >
          <div className="space-y-3">
            {(report.transactionReceipts ?? []).map((receipt) => (
              <Card key={receipt.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-text-primary">{receipt.txHash}</p>
                  <p className="text-sm text-text-secondary">
                    {t('analysis.reportPage.receiptSummary', {
                      status: receipt.txStatus,
                      block:
                        receipt.blockNumber ??
                        t('analysis.reportPage.pending'),
                    })}
                  </p>
                </div>
                {receipt.explorerUrl ? (
                  <a href={receipt.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary">
                    {t('analysis.reportPage.fields.explorer')} <ExternalLink className="size-4" />
                  </a>
                ) : null}
              </Card>
            ))}
            {(report.reportAnchorRecords ?? []).map((record) => (
              <Card key={record.id} className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-text-primary">{record.status}</p>
                  <Badge tone="info">{record.chainId ?? t('common.notAvailable')}</Badge>
                </div>
                <p className="text-sm text-text-secondary">{record.note || record.attestationHash}</p>
              </Card>
            ))}
          </div>
        </ReportSection>

        <ReportSection
          id="assumptions"
          title={t('analysis.reportPage.sections.assumptions')}
          description={t('analysis.reportPage.assumptionsDescription')}
        >
          <div className="space-y-3">
            {report.assumptions.map((item) => (
              <div key={item} className="rounded-[20px] border border-[rgba(139,92,246,0.22)] bg-[rgba(139,92,246,0.08)] px-4 py-3 text-sm leading-6 text-text-secondary">
                <div className="mb-2"><Badge tone="gold">{t('analysis.decisionUi.conclusionTypes.estimate')}</Badge></div>
                {item}
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection
          id="facts"
          title={t('analysis.reportPage.sections.facts')}
          description={t('analysis.reportPage.factsDescription')}
        >
          <div className="space-y-3">
            {report.evidence.flatMap((item) =>
              item.extractedFacts.slice(0, 2).map((fact) => (
                <div key={`${item.id}-${fact}`} className="rounded-[20px] border border-[rgba(34,211,238,0.22)] bg-[rgba(34,211,238,0.08)] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{t('analysis.decisionUi.conclusionTypes.fact')}</Badge>
                    <Badge tone="neutral">{item.sourceName}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-text-primary">{fact}</p>
                </div>
              )),
            )}
          </div>
        </ReportSection>

        <ReportSection
          id="costs"
          title={t('analysis.reportPage.sections.costs')}
          description={t('analysis.reportPage.costsDescription')}
        >
          {costRows.length ? (
            <div className="space-y-3">
              {costRows.map((row) => (
                <div key={row.label} className="rounded-[20px] bg-app-bg-elevated p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{row.type.replace(/_/g, ' ')}</Badge>
                        <ConfidenceBadge confidence={row.confidence} />
                      </div>
                      <p className="mt-2 font-semibold text-text-primary">{row.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="mono text-base font-semibold text-text-primary">{row.base}</p>
                      <p className="text-sm text-text-secondary">{row.range}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{row.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('analysis.reportPage.costEmptyTitle')}
              description={t('analysis.reportPage.costEmptyDescription')}
            />
          )}
        </ReportSection>

        <ReportSection
          id="risks"
          title={t('analysis.reportPage.sections.risks')}
          description={t('analysis.reportPage.risksDescription')}
        >
          <div className="space-y-3">
            {(report.warnings ?? []).map((warning) => (
              <div key={warning} className="rounded-[20px] border border-[rgba(185,115,44,0.2)] bg-[rgba(185,115,44,0.08)] px-4 py-3 text-sm leading-6 text-warning">
                {warning}
              </div>
            ))}
            {session.conclusions.map((item) => (
              <div key={item.id} className="rounded-[20px] bg-app-bg-elevated p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={item.conclusionType === 'fact' ? 'info' : item.conclusionType === 'estimate' ? 'gold' : 'warning'}>
                    {item.conclusionType === 'fact'
                      ? t('analysis.decisionUi.conclusionTypes.fact')
                      : item.conclusionType === 'estimate'
                        ? t('analysis.decisionUi.conclusionTypes.estimate')
                        : t('analysis.decisionUi.conclusionTypes.inference')}
                  </Badge>
                  <ConfidenceBadge confidence={item.confidence} />
                </div>
                <p className="mt-2 text-sm leading-6 text-text-primary">{item.conclusion}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection
          id="options"
          title={t('analysis.reportPage.sections.options')}
          description={t('analysis.reportPage.optionsDescription')}
        >
          {report.optionProfiles?.length ? (
            <div className="space-y-4">
              {report.optionProfiles.map((option) => (
                <div key={option.id} className="rounded-[22px] bg-app-bg-elevated p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-text-primary">{option.name}</p>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">
                        {option.summary}
                      </p>
                    </div>
                    <div className="text-right">
                      <ConfidenceBadge confidence={option.confidence} />
                      <p className="mono mt-2 text-sm text-text-secondary">
                        {option.estimatedCostBase} {option.currency}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {t('analysis.reportPage.fields.pros')}
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-text-secondary">
                        {option.pros.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {t('analysis.reportPage.fields.cons')}
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-text-secondary">
                        {option.cons.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {t('analysis.reportPage.fields.conditions')}
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-text-secondary">
                        {option.conditions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                        {t('analysis.reportPage.fields.cautionFlags')}
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-text-secondary">
                        {option.cautionFlags.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('analysis.reportPage.optionsEmptyTitle')}
              description={t('analysis.reportPage.optionsEmptyDescription')}
            />
          )}
        </ReportSection>

        <ReportSection
          id="scenarios"
          title={t('analysis.reportPage.sections.scenarios')}
          description={t('analysis.reportPage.scenariosDescription')}
        >
          <div className="grid gap-4 md:grid-cols-3">
            {scenarioRows.map((item) => (
              <div key={item.label} className="rounded-[22px] bg-app-bg-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {item.label}
                </p>
                <p className="mono mt-2 text-lg font-semibold text-text-primary">
                  {item.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{item.detail}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection
          id="calculations"
          title={t('analysis.reportPage.sections.calculations')}
          description={t('analysis.reportPage.calculationsDescription')}
        >
          {report.calculations.length ? (
            <div className="space-y-4">
              {report.calculations.map((item) => (
                <CalculationCard
                  key={item.id}
                  task={item}
                  sessionTitle={report.summaryTitle}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('analysis.reportPage.calculationsEmptyTitle')}
              description={t('analysis.reportPage.calculationsEmptyDescription')}
            />
          )}
        </ReportSection>

        <ReportSection
          id="charts"
          title={t('analysis.reportPage.sections.charts')}
          description={t('analysis.reportPage.chartsDescription')}
        >
          {report.charts.length ? (
            <div className="space-y-4">
              {report.charts.map((chart) => (
                <ChartCard key={chart.id} chart={chart} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('analysis.reportPage.chartsEmptyTitle')}
              description={t('analysis.reportPage.chartsEmptyDescription')}
            />
          )}
        </ReportSection>

        <ReportSection
          id="evidence"
          title={t('analysis.reportPage.sections.evidence')}
          description={t('analysis.reportPage.evidenceDescription')}
        >
          {report.evidence.length ? (
            <div className="space-y-4">
              {report.evidence.map((item) => (
                <SourceCard
                  key={item.id}
                  item={item}
                  linkedConclusionCount={session.conclusions.filter((conclusion) =>
                    conclusion.basisRefs.includes(item.id),
                  ).length}
                  sessionTitle={sessionTitle}
                  onOpen={() => window.open(item.sourceUrl, '_blank', 'noopener,noreferrer')}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('analysis.reportPage.evidenceEmptyTitle')}
              description={t('analysis.reportPage.evidenceEmptyDescription')}
            />
          )}
        </ReportSection>

        <ReportSection
          id="unknowns"
          title={t('analysis.reportPage.sections.unknowns')}
          description={t('analysis.reportPage.unknownsDescription')}
        >
          {(report.unknowns ?? []).length ? (
            <div className="space-y-3">
              {(report.unknowns ?? []).map((item) => (
                <div key={item} className="rounded-[20px] border border-[rgba(244,63,94,0.24)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-sm leading-6 text-text-secondary">
                  <div className="mb-2"><Badge tone="danger">{t('analysis.reportPage.unknownBadge')}</Badge></div>
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('analysis.reportPage.unknownsEmptyTitle')}
              description={t('analysis.reportPage.unknownsEmptyDescription')}
            />
          )}
        </ReportSection>

        <ReportSection
          id="recommendation"
          title={t('analysis.reportPage.sections.recommendation')}
          description={t('analysis.reportPage.recommendationDescription')}
        >
          <div className="space-y-4">
            <div className="rounded-[22px] border border-[rgba(79,124,255,0.22)] bg-primary-soft p-5">
              <p className="text-base font-semibold text-text-primary">{recommendationLine}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t('analysis.reportPage.recommendationConfidence', {
                  value:
                    typeof confidence === 'number'
                      ? `${Math.round(confidence * 100)}%`
                      : t('analysis.reportPage.recommendationNotAvailable'),
                })}
              </p>
            </div>
            <div className="rounded-[20px] bg-app-bg-elevated p-4 text-sm leading-7 text-text-secondary">
              {report.markdown.replace(/^#.*$/gm, '').trim()}
            </div>
          </div>
        </ReportSection>

        <ReportSection
          id="boundary"
          title={t('analysis.reportPage.sections.boundary')}
          description={t('analysis.reportPage.boundaryDescription')}
        >
          <div className="space-y-3">
            {report.disclaimers.map((item) => (
              <div key={item} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated px-4 py-3 text-sm leading-6 text-text-secondary">
                {item}
              </div>
            ))}
            <PreviewNote>
              {t('analysis.reportPage.boundaryNote')}
            </PreviewNote>
          </div>
        </ReportSection>
      </div>

      <aside className="hidden xl:block">
        <div className="panel-card sticky top-6 space-y-4 p-4">
          <p className="text-sm font-semibold text-text-primary">{t('analysis.reportPage.outline')}</p>
          <nav className="space-y-1">
            {reportSections.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="interactive-lift block rounded-2xl px-3 py-2 text-sm text-text-secondary hover:bg-app-bg-elevated hover:text-text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href={report.evidence[0]?.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gold-primary"
          >
            {t('analysis.reportPage.openFirstSource')}
            <ExternalLink className="size-4" />
          </a>
        </div>
      </aside>
    </div>
  )
}
