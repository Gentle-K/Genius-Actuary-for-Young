import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  Wallet,
  ShieldCheck,
  Radio,
  ArrowLeft,
  ExternalLink,
  XCircle,
} from 'lucide-react'

import { useAppStore } from '@/lib/store/app-store'
import {
  connectInjectedWallet,
  getInjectedProvider,
  readWalletKyc,
  resolveWalletNetwork,
  switchWalletNetwork,
  writePlanAttestation,
  shortAddress,
} from '@/lib/web3/hashkey'
import type { WalletNetworkKey } from '@/types'

type ExecutionPhase =
  | 'pre_check'
  | 'signing'
  | 'pending'
  | 'success'
  | 'fail'

export function ExecutionPage() {
  const { sessionId = '' } = useParams()
  const navigate = useNavigate()
  const locale = useAppStore((s) => s.locale)
  const isZh = locale === 'zh'

  // Session, report, and attestation data are passed via route state
  // or fetched from the API in a real integration. For now, we use
  // placeholder values to establish the execution flow UI.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const report = null as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainConfig = null as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attestation = null as any

  const [phase, setPhase] = useState<ExecutionPhase>('pre_check')
  const [walletAddress, setWalletAddress] = useState('')
  const [walletNetwork, setWalletNetwork] = useState<WalletNetworkKey | null>(null)
  const [kycLevel, setKycLevel] = useState<number | null>(null)
  const [kycVerified, setKycVerified] = useState(false)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')
  const [txUrl, setTxUrl] = useState('')
  const [blockNumber, setBlockNumber] = useState<number | null>(null)

  if (!report || !chainConfig || !attestation) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-400" />
          <p className="text-white/60">
            {isZh
              ? '报告或存证草案不可用。请先完成分析。'
              : 'Report or attestation draft unavailable. Please complete the analysis first.'}
          </p>
          <button
            onClick={() => navigate(`/analysis/session/${sessionId}/result`)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            {isZh ? '返回报告' : 'Back to Report'}
          </button>
        </div>
      </div>
    )
  }

  const targetNetwork: WalletNetworkKey =
    (attestation.network as WalletNetworkKey) || 'testnet'

  const handleConnect = async () => {
    try {
      setError('')
      const { address, chainId } = await connectInjectedWallet()
      setWalletAddress(address)
      const resolved = resolveWalletNetwork(chainConfig, chainId)
      setWalletNetwork(resolved)

      if (resolved && address) {
        const kyc = await readWalletKyc(chainConfig, address, resolved)
        setKycLevel(kyc.level)
        setKycVerified(kyc.isHuman)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to connect wallet.',
      )
    }
  }

  const handleSwitchNetwork = async () => {
    try {
      setError('')
      await switchWalletNetwork(chainConfig, targetNetwork)
      setWalletNetwork(targetNetwork)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to switch network.',
      )
    }
  }

  const handleSign = async () => {
    setPhase('signing')
    setError('')

    try {
      setPhase('pending')
      const result = await writePlanAttestation({
        chainConfig,
        network: targetNetwork,
        reportHash: attestation.reportHash,
        portfolioHash: attestation.portfolioHash,
        attestationHash: attestation.attestationHash,
        sessionId,
        summaryUri: '',
      })

      setTxHash(result.transactionHash)
      setTxUrl(result.transactionUrl)
      setBlockNumber(result.blockNumber)
      setPhase('success')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Transaction failed.',
      )
      setPhase('fail')
    }
  }

  const walletConnected = !!walletAddress
  const correctNetwork = walletNetwork === targetNetwork
  const providerAvailable = !!getInjectedProvider()

  const preChecks = [
    {
      label: isZh ? '钱包已安装' : 'Wallet Installed',
      passed: providerAvailable,
      icon: Wallet,
    },
    {
      label: isZh ? '钱包已连接' : 'Wallet Connected',
      passed: walletConnected,
      icon: Wallet,
    },
    {
      label: isZh
        ? `已切换到 ${targetNetwork}`
        : `On ${targetNetwork} network`,
      passed: correctNetwork,
      icon: Radio,
    },
    {
      label: isZh ? 'KYC 已验证' : 'KYC Verified',
      passed: kycVerified,
      icon: ShieldCheck,
      optional: true,
    },
  ]

  const canSign = walletConnected && correctNetwork && attestation.ready

  return (
    <div
      id="execution-page"
      className="mx-auto max-w-2xl space-y-6 py-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/analysis/session/${sessionId}/result`)}
          className="rounded-lg bg-white/5 p-2 text-white/50 hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white/90">
            {isZh ? '链上存证执行' : 'On-chain Attestation'}
          </h1>
          <p className="text-xs text-white/40">
            {isZh
              ? `写入到 HashKey Chain ${targetNetwork}`
              : `Writing to HashKey Chain ${targetNetwork}`}
          </p>
        </div>
      </div>

      {/* Pre-checks */}
      {phase === 'pre_check' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white/80">
              {isZh ? '执行前检查' : 'Pre-flight Checks'}
            </h2>
            <div className="space-y-2">
              {preChecks.map((check) => {
                const Icon = check.icon
                return (
                  <div
                    key={check.label}
                    className="flex items-center gap-3 text-sm"
                  >
                    {check.passed ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <div className="h-4 w-4 shrink-0 rounded-full border border-white/20" />
                    )}
                    <Icon className="h-4 w-4 text-white/40" />
                    <span
                      className={
                        check.passed ? 'text-white/70' : 'text-white/40'
                      }
                    >
                      {check.label}
                    </span>
                    {check.optional && !check.passed && (
                      <span className="text-xs text-white/30">
                        ({isZh ? '可选' : 'optional'})
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {!walletConnected && (
              <button
                onClick={handleConnect}
                className="rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-500/30"
              >
                {isZh ? '连接钱包' : 'Connect Wallet'}
              </button>
            )}
            {walletConnected && !correctNetwork && (
              <button
                onClick={handleSwitchNetwork}
                className="rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-500/30"
              >
                {isZh
                  ? `切换到 ${targetNetwork}`
                  : `Switch to ${targetNetwork}`}
              </button>
            )}
            {canSign && (
              <button
                onClick={handleSign}
                className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30"
              >
                {isZh ? '签名并提交' : 'Sign & Submit'}
              </button>
            )}
          </div>

          {walletConnected && (
            <p className="text-xs text-white/40">
              {isZh ? '已连接' : 'Connected'}:{' '}
              <span className="font-mono">{shortAddress(walletAddress)}</span>
              {kycLevel != null && (
                <>
                  {' '}
                  · KYC L{kycLevel}{' '}
                  {kycVerified ? '✓' : ''}
                </>
              )}
            </p>
          )}
        </div>
      )}

      {/* Signing phase */}
      {phase === 'signing' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          <p className="text-sm text-white/60">
            {isZh
              ? '请在钱包中确认交易...'
              : 'Please confirm the transaction in your wallet...'}
          </p>
        </div>
      )}

      {/* Pending phase */}
      {phase === 'pending' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          <p className="text-sm text-white/60">
            {isZh ? '等待链上确认...' : 'Waiting for on-chain confirmation...'}
          </p>
        </div>
      )}

      {/* Success */}
      {phase === 'success' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
            <h2 className="text-lg font-bold text-white/90">
              {isZh ? '存证成功！' : 'Attestation Successful!'}
            </h2>
            <p className="mt-1 text-sm text-white/60">
              {isZh
                ? '报告哈希和组合哈希已写入 HashKey Chain。'
                : 'Report hash and portfolio hash have been written to HashKey Chain.'}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Tx Hash</span>
              <span className="font-mono text-xs text-white/70">
                {shortAddress(txHash)}
              </span>
            </div>
            {blockNumber != null && (
              <div className="flex justify-between">
                <span className="text-white/40">Block</span>
                <span className="font-mono text-xs text-white/70">
                  #{blockNumber.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {txUrl && (
              <a
                href={txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/25"
              >
                <ExternalLink className="h-4 w-4" />
                {isZh ? '在浏览器查看' : 'View in Explorer'}
              </a>
            )}
            <button
              onClick={() =>
                navigate(`/analysis/session/${sessionId}/result`)
              }
              className="rounded-lg bg-white/10 px-4 py-1.5 text-sm text-white/60 hover:bg-white/15"
            >
              {isZh ? '返回报告' : 'Back to Report'}
            </button>
          </div>
        </div>
      )}

      {/* Fail */}
      {phase === 'fail' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
            <XCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <h2 className="text-lg font-bold text-white/90">
              {isZh ? '交易失败' : 'Transaction Failed'}
            </h2>
            {error && (
              <p className="mt-2 text-sm text-red-300/80">{error}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setPhase('pre_check')
                setError('')
              }}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/15"
            >
              {isZh ? '重新开始' : 'Retry'}
            </button>
            <button
              onClick={() =>
                navigate(`/analysis/session/${sessionId}/result`)
              }
              className="rounded-lg bg-white/5 px-4 py-2 text-sm text-white/50 hover:bg-white/10"
            >
              {isZh ? '返回报告' : 'Back to Report'}
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && phase === 'pre_check' && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
