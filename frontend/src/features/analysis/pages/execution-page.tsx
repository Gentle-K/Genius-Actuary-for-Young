import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Radio,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { TransactionStatus } from '@/components/web3/TransactionStatus'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { KycSnapshotSection, TxReceiptSection } from '@/features/analysis/components/result-sections'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import { resolveWalletNetwork, shortAddress } from '@/lib/web3/hashkey'
import {
  classifyTransactionError,
  errorMessage,
  type TransactionFailureInfo,
} from '@/lib/web3/transaction-errors'
import { useAttestationWriter, useHashKeyWallet } from '@/lib/web3/use-hashkey-wallet'
import type { TxReceipt, WalletNetworkKey } from '@/types'

type ExecutionPhase =
  | 'pre_check'
  | 'signing'
  | 'submitted'
  | 'pending'
  | 'success'
  | 'failure'

function statusTone(phase: ExecutionPhase) {
  switch (phase) {
    case 'success':
      return 'success'
    case 'failure':
      return 'warning'
    default:
      return 'gold'
  }
}

export function ExecutionPage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const adapter = useApiAdapter()
  const locale = useAppStore((state) => state.locale)
  const isZh = locale === 'zh'
  const submitTimeoutRef = useRef<number | null>(null)

  const text = useMemo(
    () => ({
      eyebrow: isZh ? '页面 4 / 执行控制台' : 'Page 4 / Execution Console',
      description: isZh
        ? '在这里完成钱包检查、网络切换和链上存证写入。交易状态只显示真实钱包与链上结果，不伪造成功或确认。'
        : 'Run wallet checks, network switching, and on-chain attestation here. The UI only reflects real wallet and chain state.',
      backToReport: isZh ? '返回结果页' : 'Back to Report',
      loading: isZh ? '正在加载执行草案...' : 'Loading execution draft...',
      missingDraftTitle: isZh ? '缺少可执行存证草案' : 'No Executable Attestation Draft',
      missingDraftBody: isZh
        ? '当前会话还没有可用的链上存证配置。请先完成分析并生成报告。'
        : 'This session does not have an executable attestation draft yet. Complete the analysis and generate the report first.',
      executionChecks: isZh ? '执行前检查' : 'Pre-flight Checks',
      walletInstalled: isZh ? '已检测到 EVM 钱包' : 'EVM wallet detected',
      walletConnected: isZh ? '钱包已连接' : 'Wallet connected',
      onHashKey: isZh ? '当前处于 HashKey 网络' : 'Connected to a HashKey network',
      targetNetwork: isZh ? '目标网络匹配' : 'Target network matched',
      planRegistryReady: isZh ? 'Plan Registry 已配置' : 'Plan Registry configured',
      reportKyc: isZh ? '报告 KYC 快照' : 'Report KYC snapshot',
      walletKyc: isZh ? '实时钱包 KYC' : 'Live wallet KYC',
      connectWallet: isZh ? '连接钱包' : 'Connect Wallet',
      disconnectWallet: isZh ? '断开本地连接' : 'Disconnect Local Wallet',
      switchNetwork: isZh ? '切换网络' : 'Switch Network',
      writeAttestation: isZh ? '写入链上存证' : 'Write Attestation',
      retry: isZh ? '重试' : 'Retry',
      network: isZh ? '网络' : 'Network',
      contract: isZh ? '合约' : 'Contract',
      currentWallet: isZh ? '当前钱包' : 'Current wallet',
      currentChain: isZh ? '当前链' : 'Current chain',
      noWallet: isZh ? '尚未连接钱包' : 'Wallet not connected',
      wrongNetworkHelp: isZh
        ? '执行按钮会在未连接钱包或网络不匹配时禁用。'
        : 'Execution stays disabled until a wallet is connected on the required network.',
      attestationDraft: isZh ? '存证草案' : 'Attestation Draft',
      reportHash: isZh ? '报告哈希' : 'Report hash',
      portfolioHash: isZh ? '组合哈希' : 'Portfolio hash',
      attestationHash: isZh ? '存证哈希' : 'Attestation hash',
      explorer: isZh ? '查看浏览器' : 'View Explorer',
      writeWarningTitle: isZh ? '链上已确认，但后台同步失败' : 'On-chain write confirmed, but backend sync failed',
      failureTitle: isZh ? '执行失败' : 'Execution Failed',
      successTitle: isZh ? '链上存证成功' : 'On-chain Attestation Succeeded',
      successBody: isZh
        ? '报告哈希和组合哈希已经写入链上。结果页会显示交易哈希与浏览器链接。'
        : 'The report hash and portfolio hash were written on-chain. The result page now shows the tx hash and explorer link.',
      submittedHint: isZh
        ? '交易已提交到 RPC，正在等待链上确认。'
        : 'The transaction was submitted to the RPC and is waiting for chain confirmation.',
      pendingHint: isZh
        ? '正在等待区块确认。请保持钱包和网络连接。'
        : 'Waiting for block confirmation. Keep the wallet and network connection active.',
      failureMayStillSettle: isZh
        ? '如果已经拿到交易哈希，交易仍可能在链上继续确认。请用浏览器链接再次核对。'
        : 'If you already have a tx hash, the transaction may still settle on-chain. Re-check the explorer link.',
      reasonLabel: isZh ? '失败类别' : 'Failure reason',
      recordOnReport: isZh ? '同步到报告' : 'Sync to report',
      alreadyRecorded: isZh ? '该会话已经记录过链上存证。' : 'This session already has a recorded attestation.',
      ready: isZh ? '可执行' : 'Ready',
      offlineOnly: isZh ? '仅离线草案' : 'Offline only',
    }),
    [isZh],
  )

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
  const attestationWriter = useAttestationWriter(report?.chainConfig)

  const recordAttestationMutation = useMutation({
    mutationFn: (payload: {
      network: WalletNetworkKey
      transactionHash: string
      submittedBy?: string
      blockNumber?: number
    }) => adapter.analysis.recordAttestation(sessionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['analysis', sessionId] })
      await queryClient.invalidateQueries({
        queryKey: ['analysis', sessionId, 'report'],
      })
    },
  })

  const [phase, setPhase] = useState<ExecutionPhase>('pre_check')
  const [transactionReceipt, setTransactionReceipt] = useState<TxReceipt | null>(null)
  const [executionError, setExecutionError] = useState<TransactionFailureInfo | null>(null)
  const [uiError, setUiError] = useState<string>('')
  const [recordWarning, setRecordWarning] = useState<string>('')

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current != null) {
        window.clearTimeout(submitTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!session) {
      return
    }

    if (session.status !== 'COMPLETED' && session.status !== 'FAILED') {
      void navigate(`/analysis/session/${sessionId}`, { replace: true })
    }
  }, [navigate, session, sessionId])

  useEffect(() => {
    const draft = report?.attestationDraft
    if (!draft?.transactionHash || !draft.transactionUrl) {
      return
    }

    setTransactionReceipt({
      transactionHash: draft.transactionHash,
      transactionUrl: draft.transactionUrl,
      blockNumber: draft.blockNumber,
      submittedBy: draft.submittedBy,
      submittedAt: draft.submittedAt,
      network: draft.network ?? 'testnet',
    })
    setPhase('success')
  }, [report?.attestationDraft])

  const targetNetwork: WalletNetworkKey =
    report?.attestationDraft?.network === 'mainnet' ? 'mainnet' : 'testnet'

  const liveWalletNetwork =
    report?.chainConfig != null
      ? resolveWalletNetwork(report.chainConfig, useAppStore.getState().walletChainId)
      : null

  const correctNetwork = wallet.walletNetwork === targetNetwork
  const contractConfigured = Boolean(
    report?.attestationDraft?.ready && report.attestationDraft.contractAddress,
  )
  const hasRecordedTx = Boolean(report?.attestationDraft?.transactionHash)
  const executionBusy =
    wallet.isWalletBusy ||
    attestationWriter.isPending ||
    recordAttestationMutation.isPending ||
    phase === 'signing' ||
    phase === 'submitted' ||
    phase === 'pending'
  const canExecute =
    Boolean(report?.attestationDraft?.ready) &&
    wallet.hasProvider &&
    wallet.isConnected &&
    correctNetwork &&
    !executionBusy

  const highestRequiredKyc = useMemo(
    () =>
      Math.max(
        0,
        ...(report?.recommendedAllocations ?? [])
          .map((allocation) =>
            report?.assetCards.find((asset) => asset.assetId === allocation.assetId)
              ?.kycRequiredLevel ?? 0,
          ),
      ),
    [report?.assetCards, report?.recommendedAllocations],
  )

  const checks = [
    {
      label: text.walletInstalled,
      passed: wallet.hasProvider,
      icon: Wallet,
    },
    {
      label: text.walletConnected,
      passed: wallet.isConnected,
      icon: Wallet,
    },
    {
      label: text.onHashKey,
      passed: Boolean(wallet.walletNetwork),
      icon: Radio,
    },
    {
      label: `${text.targetNetwork}: ${targetNetwork}`,
      passed: correctNetwork,
      icon: Radio,
    },
    {
      label: text.planRegistryReady,
      passed: contractConfigured,
      icon: ShieldCheck,
    },
  ]

  const handleConnect = async () => {
    setUiError('')
    try {
      await wallet.connectWallet()
    } catch (err) {
      setUiError(errorMessage(err))
    }
  }

  const handleSwitchNetwork = async () => {
    setUiError('')
    try {
      await wallet.switchNetwork(targetNetwork)
    } catch (err) {
      setUiError(errorMessage(err))
    }
  }

  const handleExecute = async () => {
    if (!report?.attestationDraft || !report.chainConfig) {
      return
    }

    setUiError('')
    setRecordWarning('')
    setExecutionError(null)
    setPhase('signing')

    try {
      if (!wallet.isConnected) {
        await wallet.connectWallet()
      }

      const resolvedNetwork = resolveWalletNetwork(
        report.chainConfig,
        useAppStore.getState().walletChainId,
      )

      if (resolvedNetwork !== targetNetwork) {
        await wallet.switchNetwork(targetNetwork)
      }

      const receipt = await attestationWriter.mutateAsync({
        network: targetNetwork,
        reportHash: report.attestationDraft.reportHash,
        portfolioHash: report.attestationDraft.portfolioHash,
        attestationHash: report.attestationDraft.attestationHash,
        sessionId,
        summaryUri:
          typeof window !== 'undefined'
            ? window.location.href
            : `session:${sessionId}`,
        onTransactionSubmitted: (submitted) => {
          setTransactionReceipt({
            transactionHash: submitted.transactionHash,
            transactionUrl: submitted.transactionUrl,
            submittedBy: submitted.account,
            network: targetNetwork,
          })
          setPhase('submitted')

          if (submitTimeoutRef.current != null) {
            window.clearTimeout(submitTimeoutRef.current)
          }

          submitTimeoutRef.current = window.setTimeout(() => {
            setPhase((currentPhase) =>
              currentPhase === 'submitted' ? 'pending' : currentPhase,
            )
          }, 600)
        },
      })

      const confirmedReceipt: TxReceipt = {
        transactionHash: receipt.transactionHash,
        transactionUrl: receipt.transactionUrl,
        blockNumber: receipt.blockNumber,
        submittedBy: receipt.account,
        network: targetNetwork,
        submittedAt: new Date().toISOString(),
      }

      setTransactionReceipt(confirmedReceipt)
      setPhase('success')

      try {
        await recordAttestationMutation.mutateAsync({
          network: targetNetwork,
          transactionHash: receipt.transactionHash,
          submittedBy: receipt.account,
          blockNumber: receipt.blockNumber,
        })
      } catch (recordError) {
        setRecordWarning(errorMessage(recordError))
      }
    } catch (err) {
      setExecutionError(classifyTransactionError(err))
      setUiError(errorMessage(err))
      setPhase('failure')
    }
  }

  if (!report || !session) {
    return <Card className="p-6 text-sm text-text-secondary">{text.loading}</Card>
  }

  if (!report.chainConfig || !report.attestationDraft) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={text.eyebrow}
          title={text.missingDraftTitle}
          description={text.missingDraftBody}
          actions={
            <Button
              variant="secondary"
              onClick={() => void navigate(`/analysis/session/${sessionId}/result`)}
            >
              <ArrowLeft className="size-4" />
              {text.backToReport}
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={text.eyebrow}
        title={isZh ? '链上存证执行' : 'On-chain Attestation Execution'}
        description={text.description}
        actions={
          <Button
            variant="secondary"
            onClick={() => void navigate(`/analysis/session/${sessionId}/result`)}
          >
            <ArrowLeft className="size-4" />
            {text.backToReport}
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <Card className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {text.executionChecks}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {text.wrongNetworkHelp}
              </p>
            </div>
            <Badge tone={statusTone(phase)}>{phase.replace('_', ' ')}</Badge>
          </div>

          <div className="space-y-3">
            {checks.map((check) => {
              const Icon = check.icon
              return (
                <div
                  key={check.label}
                  className="flex items-center gap-3 rounded-xl border border-border-subtle bg-app-bg-elevated p-4"
                >
                  {check.passed ? (
                    <CheckCircle2 className="size-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-300" />
                  )}
                  <Icon className="size-4 text-text-muted" />
                  <span
                    className={
                      check.passed ? 'text-text-primary' : 'text-text-secondary'
                    }
                  >
                    {check.label}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4">
              <p className="text-xs text-text-muted">{text.currentWallet}</p>
              <p className="mt-2 break-all text-sm text-text-primary">
                {wallet.walletAddress || text.noWallet}
              </p>
              {wallet.walletAddress ? (
                <p className="mt-2 text-xs text-text-muted">
                  {shortAddress(wallet.walletAddress)}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4">
              <p className="text-xs text-text-muted">{text.currentChain}</p>
              <p className="mt-2 text-sm text-text-primary">{wallet.networkLabel}</p>
              <p className="mt-2 text-xs text-text-muted">
                {text.network}: {targetNetwork}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!wallet.isConnected ? (
              <Button onClick={() => void handleConnect()} disabled={!wallet.hasProvider}>
                <Wallet className="size-4" />
                {text.connectWallet}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => wallet.disconnectWallet()}
                disabled={executionBusy}
              >
                {text.disconnectWallet}
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={() => void handleSwitchNetwork()}
              disabled={!wallet.hasProvider || correctNetwork || executionBusy}
            >
              <Radio className="size-4" />
              {text.switchNetwork}
            </Button>

            <Button onClick={() => void handleExecute()} disabled={!canExecute || hasRecordedTx}>
              {executionBusy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              {text.writeAttestation}
            </Button>
          </div>

          {hasRecordedTx ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-4 text-sm text-[#ccebd7]">
              {text.alreadyRecorded}
            </div>
          ) : null}

          {uiError && phase !== 'failure' ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
              {uiError}
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {text.attestationDraft}
              </p>
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {report.attestationDraft.ready ? text.ready : text.offlineOnly}
              </p>
            </div>
            <Badge tone={report.attestationDraft.ready ? 'success' : 'warning'}>
              {targetNetwork}
            </Badge>
          </div>

          <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4 text-sm text-text-secondary">
            <div className="flex items-center justify-between gap-3">
              <span>{text.contract}</span>
              <span className="break-all text-right text-text-primary">
                {report.attestationDraft.contractAddress || '-'}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span>{text.network}</span>
              <span className="capitalize text-text-primary">{targetNetwork}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span>{text.reportHash}</span>
              <span className="font-mono text-xs text-text-primary">
                {report.attestationDraft.reportHash.slice(0, 18)}...
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span>{text.portfolioHash}</span>
              <span className="font-mono text-xs text-text-primary">
                {report.attestationDraft.portfolioHash.slice(0, 18)}...
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span>{text.attestationHash}</span>
              <span className="font-mono text-xs text-text-primary">
                {report.attestationDraft.attestationHash.slice(0, 18)}...
              </span>
            </div>
          </div>

          {report.attestationDraft.explorerUrl ? (
            <a
              href={report.attestationDraft.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-gold-ink underline-offset-4 hover:underline"
            >
              <ExternalLink className="size-4" />
              {text.explorer}
            </a>
          ) : null}
        </Card>
      </div>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text-primary">
            {isZh ? '交易状态' : 'Transaction Status'}
          </p>
          {highestRequiredKyc > 0 ? (
            <Badge tone="warning">
              {isZh ? `最高资产门槛 L${highestRequiredKyc}` : `Highest asset gate L${highestRequiredKyc}`}
            </Badge>
          ) : null}
        </div>

        <TransactionStatus
          status={
            phase === 'pre_check'
              ? 'idle'
              : phase === 'signing'
                ? 'signing'
                : phase === 'submitted'
                  ? 'submitted'
                  : phase === 'pending'
                    ? 'pending'
                    : phase === 'success'
                      ? 'confirmed'
                      : 'failed'
          }
          txHash={transactionReceipt?.transactionHash}
          explorerUrl={transactionReceipt?.transactionUrl}
          blockNumber={transactionReceipt?.blockNumber}
          errorMessage={executionError?.message}
        />

        {phase === 'success' ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-[#ccebd7]">
            <p className="font-medium">{text.successTitle}</p>
            <p className="mt-2 text-sm leading-6 text-[#d7f2e1]">{text.successBody}</p>
          </div>
        ) : null}

        {phase === 'submitted' ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 text-sm text-[#f3ddbb]">
            {text.submittedHint}
          </div>
        ) : null}

        {phase === 'pending' ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 text-sm text-[#f3ddbb]">
            {text.pendingHint}
          </div>
        ) : null}

        {phase === 'failure' && executionError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
            <p className="font-medium">{text.failureTitle}</p>
            <p className="mt-2">
              {text.reasonLabel}: {executionError.reason}
            </p>
            <p className="mt-2">{executionError.message}</p>
            {transactionReceipt?.transactionUrl ? (
              <p className="mt-2 text-red-100">{text.failureMayStillSettle}</p>
            ) : null}
          </div>
        ) : null}

        {recordWarning ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 text-sm text-[#f3ddbb]">
            <p className="font-medium">{text.writeWarningTitle}</p>
            <p className="mt-2">{recordWarning}</p>
          </div>
        ) : null}

        {phase === 'failure' ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setPhase('pre_check')}>
              {text.retry}
            </Button>
            {transactionReceipt?.transactionUrl ? (
              <a
                href={transactionReceipt.transactionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border-subtle bg-app-bg-elevated px-5 py-3 text-sm text-text-primary transition hover:border-border-strong hover:bg-panel-strong"
              >
                <ExternalLink className="size-4" />
                {text.explorer}
              </a>
            ) : null}
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {wallet.kycSnapshot ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-text-primary">{text.walletKyc}</p>
            <KycSnapshotSection kyc={wallet.kycSnapshot} locale={locale} />
          </div>
        ) : (
          <Card className="p-5">
            <p className="text-sm font-semibold text-text-primary">{text.walletKyc}</p>
            <p className="mt-2 text-sm text-text-secondary">
              {wallet.kycLoading
                ? text.loading
                : wallet.isConnected
                  ? wallet.kycError
                    ? errorMessage(wallet.kycError)
                    : text.noWallet
                  : text.noWallet}
            </p>
          </Card>
        )}

        {report.kycSnapshot ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-text-primary">{text.reportKyc}</p>
            <KycSnapshotSection kyc={report.kycSnapshot} locale={locale} />
          </div>
        ) : null}
      </div>

      {transactionReceipt ? <TxReceiptSection receipt={transactionReceipt} locale={locale} /> : null}

      {session.status === 'FAILED' ? (
        <Card className="border-[rgba(197,109,99,0.35)] bg-[rgba(197,109,99,0.08)] p-5">
          <div className="flex items-center gap-2 text-[#f7d4cf]">
            <XCircle className="size-5" />
            <p className="font-semibold">{isZh ? '原始分析会话已失败' : 'The analysis session is marked as failed'}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#f1cbc6]">
            {session.errorMessage}
          </p>
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-gold-primary" />
          <p className="text-sm font-semibold text-text-primary">
            {isZh ? '执行上下文' : 'Execution Context'}
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4">
            <p className="text-xs text-text-muted">{text.currentWallet}</p>
            <p className="mt-2 break-all text-sm text-text-primary">
              {wallet.walletAddress || session.intakeContext.walletAddress || text.noWallet}
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4">
            <p className="text-xs text-text-muted">{text.currentChain}</p>
            <p className="mt-2 text-sm text-text-primary">
              {wallet.walletNetwork || liveWalletNetwork || session.intakeContext.walletNetwork || '-'}
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-app-bg-elevated p-4">
            <p className="text-xs text-text-muted">{text.recordOnReport}</p>
            <p className="mt-2 text-sm text-text-primary">
              {recordAttestationMutation.isSuccess || hasRecordedTx
                ? isZh
                  ? '已写入结果页'
                  : 'Synced to result page'
                : isZh
                  ? '待链上确认后回写'
                  : 'Will sync after confirmation'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
