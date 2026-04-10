import { useQuery } from '@tanstack/react-query'
import {
  Blocks,
  Cable,
  CheckCircle2,
  Coins,
  ExternalLink,
  FileCode2,
  Link2,
  Radio,
  ScrollText,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ChartCard } from '@/components/charts/chart-card'
import { PageHeader } from '@/components/layout/page-header'
import { ReportMarkdown } from '@/components/markdown/report-markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ReportTableCard } from '@/features/analysis/components/report-table-card'
import {
  EvidencePanelEnhanced,
  KycSnapshotSection,
  OracleSnapshotSection,
  TxReceiptSection,
} from '@/features/analysis/components/result-sections'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { exportToCsv } from '@/lib/export/csv'
import { exportToPdf } from '@/lib/export/pdf'
import { useAppStore } from '@/lib/store/app-store'
import { formatDateTime } from '@/lib/utils/format'
import { errorMessage } from '@/lib/web3/transaction-errors'
import { useHashKeyWallet, useLiveMarketSnapshots } from '@/lib/web3/use-hashkey-wallet'
import type { AnalysisReport, AnalysisSession, AssetAnalysisCard, LanguageCode, TxReceipt } from '@/types'

function money(value: number | undefined, currency = 'USD', locale: LanguageCode = 'zh') {
  if (typeof value !== 'number') {
    return '--'
  }
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

function pct(value: number | undefined, locale: LanguageCode = 'zh') {
  if (typeof value !== 'number') {
    return '--'
  }
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    maximumFractionDigits: 2,
  }).format(value)
}

function assetTypeLabel(value: AssetAnalysisCard['assetType'], isZh: boolean) {
  const labels: Record<AssetAnalysisCard['assetType'], string> = {
    stablecoin: isZh ? '稳定币' : 'Stablecoin',
    mmf: 'MMF',
    precious_metal: isZh ? '贵金属' : 'Precious metal',
    real_estate: isZh ? '房地产' : 'Real estate',
    stocks: isZh ? '股票' : 'Stocks',
    benchmark: isZh ? '基准资产' : 'Benchmark',
  }
  return labels[value]
}

function txReceiptFromReport(report: AnalysisReport): TxReceipt | undefined {
  if (!report.attestationDraft?.transactionHash || !report.attestationDraft.transactionUrl) {
    return undefined
  }
  return {
    transactionHash: report.attestationDraft.transactionHash,
    transactionUrl: report.attestationDraft.transactionUrl,
    blockNumber: report.attestationDraft.blockNumber,
    submittedBy: report.attestationDraft.submittedBy,
    submittedAt: report.attestationDraft.submittedAt,
    network: report.attestationDraft.network ?? 'testnet',
  }
}

function buildExportPayload(
  session: AnalysisSession,
  report: AnalysisReport,
  locale: LanguageCode,
) {
  const rows: Array<Array<string | number>> = [
    ['overview', 'session_id', session.id, session.status],
    ['overview', 'problem', report.summaryTitle, report.mode],
    ['wallet', 'address', session.intakeContext.walletAddress || '--', session.intakeContext.walletNetwork || '--'],
    ['wallet', 'kyc', report.kycSnapshot ? `L${report.kycSnapshot.level}` : '--', report.kycSnapshot?.status || '--'],
  ]

  for (const allocation of report.recommendedAllocations) {
    rows.push([
      'allocation',
      allocation.assetName,
      allocation.targetWeightPct.toFixed(2),
      allocation.blockedReason || allocation.rationale,
    ])
  }

  for (const assumption of report.assumptions) {
    rows.push(['assumption', 'report', assumption, ''])
  }

  if (report.attestationDraft) {
    rows.push([
      'attestation',
      'tx',
      report.attestationDraft.transactionHash || '--',
      report.attestationDraft.transactionUrl || report.attestationDraft.contractAddress || '--',
    ])
  }

  return {
    title: `hashkey-rwa-report-${session.id}-${locale}`,
    headers: ['Section', 'Item', 'Value', 'Details'],
    rows,
  }
}

export function ReportPage() {
  const navigate = useNavigate()
  const { sessionId = '' } = useParams()
  const adapter = useApiAdapter()
  const locale = useAppStore((state) => state.locale)
  const isZh = locale === 'zh'
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  const sessionQuery = useQuery({
    queryKey: ['analysis', sessionId],
    queryFn: () => adapter.analysis.getById(sessionId),
  })
  const reportQuery = useQuery({
    queryKey: ['analysis', sessionId, 'report'],
    queryFn: () => adapter.analysis.getReport(sessionId),
  })

  const session = sessionQuery.data
  const report = reportQuery.data
  const wallet = useHashKeyWallet(report?.chainConfig)
  const marketQuery = useLiveMarketSnapshots(
    report?.chainConfig,
    report?.attestationDraft?.network === 'mainnet' ? 'mainnet' : 'testnet',
  )

  useEffect(() => {
    if (session && session.status !== 'COMPLETED' && session.status !== 'FAILED') {
      void navigate(`/analysis/session/${sessionId}`, { replace: true })
    }
  }, [navigate, session, sessionId])

  const latestSnapshots = useMemo(
    () => (marketQuery.data?.length ? marketQuery.data : report?.marketSnapshots ?? []),
    [marketQuery.data, report?.marketSnapshots],
  )
  const txReceipt = useMemo(() => (report ? txReceiptFromReport(report) : undefined), [report])

  const handleExport = async (kind: 'csv' | 'pdf') => {
    if (!session || !report) {
      return
    }
    setExporting(kind)
    try {
      const payload = buildExportPayload(session, report, locale)
      if (kind === 'csv') {
        await exportToCsv(payload)
      } else {
        await exportToPdf(payload)
      }
    } finally {
      setExporting(null)
    }
  }

  if (!session || !report) {
    return <Card className="p-6 text-sm text-text-secondary">{isZh ? '正在准备结果页...' : 'Preparing the result page...'}</Card>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isZh ? '页面 3 / RWA 报告' : 'Page 3 / RWA Report'}
        title={report.summaryTitle}
        description={isZh ? '汇总分析、证据、链上上下文与执行路径。' : 'Analysis, evidence, on-chain context, and the execution path in one place.'}
        actions={
          <>
            <Button variant="secondary" onClick={() => void navigate(`/analysis/session/${sessionId}`)}>
              {isZh ? '返回分析页' : 'Back to Analysis'}
            </Button>
            <Button variant="secondary" onClick={() => void handleExport('csv')} disabled={exporting !== null}>
              {isZh ? '导出 CSV' : 'Export CSV'}
            </Button>
            <Button variant="secondary" onClick={() => void handleExport('pdf')} disabled={exporting !== null}>
              {isZh ? '导出 PDF' : 'Export PDF'}
            </Button>
            {report.attestationDraft ? (
              <Button onClick={() => void navigate(`/analysis/session/${sessionId}/execute`)}>
                {isZh ? '打开执行控制台' : 'Open Execution Console'}
              </Button>
            ) : null}
          </>
        }
      />

      {session.status === 'FAILED' ? (
        <Card className="border-[rgba(197,109,99,0.35)] bg-[rgba(197,109,99,0.08)] p-6 text-[#f1cbc6]">
          <p className="font-semibold">{isZh ? '分析失败' : 'Analysis failed'}</p>
          <p className="mt-2 text-sm leading-7">{session.errorMessage || (isZh ? '后端未能生成完整报告。' : 'The backend could not produce a complete report.')}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {report.highlights.map((highlight) => (
          <Card key={highlight.id} className="p-5">
            <p className="text-sm text-text-secondary">{highlight.label}</p>
            <p className="mt-3 text-3xl font-semibold text-text-primary">{highlight.value}</p>
            <p className="mt-3 text-sm leading-7 text-text-secondary">{highlight.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-4">
          {report.chainConfig ? (
            <Card className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Blocks className="size-5 text-gold-primary" />
                <h2 className="text-lg font-semibold text-text-primary">{isZh ? 'HashKey 链配置' : 'HashKey Chain Config'}</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">Mainnet</p><p className="mt-2 text-text-primary">{report.chainConfig.mainnetChainId}</p></div>
                <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">Testnet</p><p className="mt-2 text-text-primary">{report.chainConfig.testnetChainId}</p></div>
                <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">Plan Registry</p><p className="mt-2 break-all text-sm text-text-primary">{report.attestationDraft?.contractAddress || report.chainConfig.planRegistryAddress || '--'}</p></div>
                <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">KYC SBT</p><p className="mt-2 break-all text-sm text-text-primary">{report.chainConfig.kycSbtAddress || '--'}</p></div>
              </div>
            </Card>
          ) : null}

          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-3">
              <WalletCards className="size-5 text-gold-primary" />
              <h2 className="text-lg font-semibold text-text-primary">{isZh ? '钱包与执行入口' : 'Wallet and Execution'}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {wallet.isConnected ? (
                <Button variant="secondary" onClick={() => wallet.disconnectWallet()} disabled={wallet.isWalletBusy}>
                  {isZh ? '断开本地连接' : 'Disconnect'}
                </Button>
              ) : (
                <Button onClick={() => void wallet.connectWallet()} disabled={!wallet.hasProvider || wallet.isWalletBusy}>
                  <Cable className="size-4" />
                  {isZh ? '连接钱包' : 'Connect Wallet'}
                </Button>
              )}
              <Button variant="secondary" onClick={() => void wallet.switchNetwork('testnet')} disabled={!wallet.hasProvider || wallet.isWalletBusy}>
                {isZh ? '切到 Testnet' : 'Switch Testnet'}
              </Button>
              <Button variant="secondary" onClick={() => void wallet.switchNetwork('mainnet')} disabled={!wallet.hasProvider || wallet.isWalletBusy}>
                {isZh ? '切到 Mainnet' : 'Switch Mainnet'}
              </Button>
              {report.attestationDraft ? (
                <Button onClick={() => void navigate(`/analysis/session/${sessionId}/execute`)}>
                  <Radio className="size-4" />
                  {isZh ? '执行存证' : 'Execute Attestation'}
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">{isZh ? '钱包' : 'Wallet'}</p><p className="mt-2 break-all text-sm text-text-primary">{wallet.walletAddress || (isZh ? '未连接' : 'Not connected')}</p></div>
              <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">{isZh ? '网络' : 'Network'}</p><p className="mt-2 text-sm text-text-primary">{wallet.networkLabel}</p></div>
              <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">{isZh ? '实时 KYC' : 'Live KYC'}</p><p className="mt-2 text-sm text-text-primary">{wallet.kycSnapshot ? `${wallet.kycSnapshot.status} / L${wallet.kycSnapshot.level}` : (isZh ? '未连接' : 'Unavailable')}</p><p className="mt-2 text-xs text-text-muted">{wallet.kycSnapshot?.note || (wallet.kycError ? errorMessage(wallet.kycError) : '')}</p></div>
            </div>
          </Card>

          {report.kycSnapshot ? <KycSnapshotSection kyc={report.kycSnapshot} locale={locale} /> : null}
          {wallet.kycSnapshot ? <KycSnapshotSection kyc={wallet.kycSnapshot} locale={locale} /> : null}
          {txReceipt ? <TxReceiptSection receipt={txReceipt} locale={locale} /> : null}
        </div>

        <div className="space-y-4">
          <OracleSnapshotSection snapshots={latestSnapshots} locale={locale} />
          {marketQuery.error ? (
            <Card className="p-4 text-sm text-[#f3ddbb]">
              {isZh ? '实时刷新失败，当前展示报告快照。' : 'Live refresh failed, showing the report snapshot.'}
              <span className="ml-2 text-text-muted">{errorMessage(marketQuery.error)}</span>
            </Card>
          ) : null}
        </div>
      </div>

      {report.assetCards.length ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-gold-primary" />
            <h2 className="text-xl font-semibold text-text-primary">{isZh ? '资产卡片' : 'Asset Cards'}</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {report.assetCards.map((asset) => (
              <Card key={asset.assetId} className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-text-primary">{asset.name}</h3><Badge tone="neutral">{asset.symbol}</Badge></div><p className="mt-2 text-sm leading-7 text-text-secondary">{asset.fitSummary}</p></div>
                  <Badge tone="gold">{assetTypeLabel(asset.assetType, isZh)}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">{isZh ? '基准年化' : 'Base annualized'}</p><p className="mt-2 text-text-primary">{pct(asset.expectedReturnBase * 100, locale)}%</p></div>
                  <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">{isZh ? '综合风险' : 'Overall risk'}</p><p className="mt-2 text-text-primary">{asset.riskVector.overall.toFixed(1)} / 100</p></div>
                  <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">{isZh ? '最早退出' : 'Earliest exit'}</p><p className="mt-2 text-text-primary">{asset.exitDays === 0 ? 'T+0' : `T+${asset.exitDays}`}</p></div>
                  <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">{isZh ? '总成本' : 'Total cost'}</p><p className="mt-2 text-text-primary">{asset.totalCostBps} bps</p></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {report.simulations.length ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {report.simulations.map((simulation) => (
            <Card key={simulation.assetId} className="space-y-4 p-5">
              <h3 className="text-lg font-semibold text-text-primary">{simulation.assetName}</h3>
              <p className="text-sm leading-7 text-text-secondary">{simulation.scenarioNote}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">P10 / P50 / P90</p><p className="mt-2 text-sm text-text-primary">{pct(simulation.returnPctLow, locale)}% / {pct(simulation.returnPctBase, locale)}% / {pct(simulation.returnPctHigh, locale)}%</p></div>
                <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4"><p className="text-xs text-text-muted">VaR / CVaR</p><p className="mt-2 text-sm text-text-primary">{pct(simulation.var95Pct, locale)}% / {pct(simulation.cvar95Pct, locale)}%</p></div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {report.tables?.length ? report.tables.map((table) => <ReportTableCard key={table.id} table={table} />) : null}
      {report.charts.length ? report.charts.map((chart) => <ChartCard key={chart.id} chart={chart} />) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-3"><ScrollText className="size-5 text-gold-primary" /><h2 className="text-xl font-semibold text-text-primary">{isZh ? '完整分析' : 'Full Analysis'}</h2></div>
            <ReportMarkdown markdown={report.markdown} />
          </Card>
          <Card className="space-y-3 p-6">
            <h2 className="text-lg font-semibold text-text-primary">{isZh ? '假设与限制' : 'Assumptions and Constraints'}</h2>
            {report.assumptions.concat(report.disclaimers).map((item) => (
              <div key={item} className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4 text-sm leading-7 text-text-secondary">{item}</div>
            ))}
          </Card>
        </div>

        <div className="space-y-4">
          {report.recommendedAllocations.length ? (
            <Card className="space-y-4 p-6">
              <div className="flex items-center gap-3"><Coins className="size-5 text-gold-primary" /><h2 className="text-lg font-semibold text-text-primary">{isZh ? '建议权重' : 'Suggested Weights'}</h2></div>
              {report.recommendedAllocations.map((allocation) => (
                <div key={allocation.assetId} className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4">
                  <div className="flex items-center justify-between gap-3"><p className="font-medium text-text-primary">{allocation.assetName}</p><Badge tone={allocation.blockedReason ? 'warning' : 'gold'}>{allocation.targetWeightPct.toFixed(1)}%</Badge></div>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">{allocation.rationale}</p>
                  <p className="mt-2 text-xs text-text-muted">{isZh ? '建议金额' : 'Suggested amount'}: {money(allocation.suggestedAmount, session.intakeContext.baseCurrency, locale)}</p>
                  {allocation.blockedReason ? <p className="mt-2 text-xs text-[#f3ddbb]">{allocation.blockedReason}</p> : null}
                </div>
              ))}
            </Card>
          ) : null}

          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-3"><Link2 className="size-5 text-gold-primary" /><h2 className="text-lg font-semibold text-text-primary">{isZh ? '证据面板' : 'Evidence Panel'}</h2></div>
            <EvidencePanelEnhanced evidence={report.evidence} locale={locale} />
          </Card>

          {report.txDraft ? (
            <Card className="space-y-4 p-6">
              <div className="flex items-center gap-3"><WalletCards className="size-5 text-gold-primary" /><h2 className="text-lg font-semibold text-text-primary">{isZh ? '执行路径' : 'Execution Path'}</h2></div>
              <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4 text-sm text-text-secondary">{isZh ? '总预估费用' : 'Total estimated fee'}: {money(report.txDraft.totalEstimatedFeeUsd, 'USD', locale)}</div>
              {report.txDraft.steps.map((step) => (
                <div key={`${step.step}-${step.title}`} className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4">
                  <div className="flex items-center justify-between gap-3"><p className="font-medium text-text-primary">{step.step}. {step.title}</p><Badge tone="neutral">{step.actionType}</Badge></div>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">{step.description}</p>
                  {step.explorerUrl ? <a href={step.explorerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-gold-ink underline-offset-4 hover:underline"><ExternalLink className="size-3.5" />{isZh ? '查看浏览器' : 'View Explorer'}</a> : null}
                </div>
              ))}
            </Card>
          ) : null}

          {report.attestationDraft ? (
            <Card className="space-y-4 p-6">
              <div className="flex items-center gap-3"><FileCode2 className="size-5 text-gold-primary" /><h2 className="text-lg font-semibold text-text-primary">{isZh ? '链上存证草案' : 'On-chain Attestation Draft'}</h2></div>
              <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4 text-sm text-text-secondary">
                <p className="font-medium text-text-primary">{report.attestationDraft.contractAddress || '--'}</p>
                <p className="mt-2">{isZh ? '网络' : 'Network'}: {report.attestationDraft.network}</p>
                <p className="mt-2">{isZh ? '创建时间' : 'Created at'}: {formatDateTime(report.attestationDraft.createdAt, locale)}</p>
                {report.attestationDraft.explorerUrl ? <a href={report.attestationDraft.explorerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-gold-ink underline-offset-4 hover:underline"><ExternalLink className="size-3.5" />{isZh ? '查看浏览器' : 'View Explorer'}</a> : null}
              </div>
              <Button variant="secondary" onClick={() => void navigate(`/analysis/session/${sessionId}/execute`)}>
                <CheckCircle2 className="size-4" />
                {isZh ? '进入执行页' : 'Go to Execution'}
              </Button>
            </Card>
          ) : null}

          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-3"><Link2 className="size-5 text-gold-primary" /><h2 className="text-lg font-semibold text-text-primary">{isZh ? '计算摘要' : 'Calculation Summary'}</h2></div>
            {report.calculations.map((calculation) => (
              <div key={calculation.id} className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4">
                <p className="font-medium text-text-primary">{calculation.taskType}</p>
                <p className="mt-2 text-sm text-gold-ink">{calculation.result} {calculation.units}</p>
                <p className="mt-2 text-sm leading-7 text-text-secondary">{calculation.formulaExpression}</p>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
