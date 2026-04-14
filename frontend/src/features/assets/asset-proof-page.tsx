import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock3,
  ExternalLink,
  Loader2,
  Network,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { normalizeLanguageCode, toHongKongChinese, toIntlLocale } from '@/lib/i18n/locale'
import { useAppStore } from '@/lib/store/app-store'
import { useHashKeyWallet } from '@/lib/web3/use-hashkey-wallet'
import type { LanguageCode } from '@/types'

type LocaleCopy = {
  en: string
  zhCn: string
  zhHk?: string
}

function localizedCopy(locale: LanguageCode, values: LocaleCopy) {
  if (locale === 'zh-HK') {
    return values.zhHk ?? toHongKongChinese(values.zhCn)
  }
  if (locale === 'zh-CN') {
    return values.zhCn
  }
  return values.en
}

function formatDateTime(value: string | undefined, locale: LanguageCode, fallback: string) {
  if (!value) return fallback
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatPercent(value: number | undefined, fallback: string) {
  if (value == null || Number.isNaN(value)) return fallback
  return `${Math.round(value * 100)}%`
}

function proofTone(value?: string) {
  if (
    value === 'ready' ||
    value === 'fresh' ||
    value === 'verified' ||
    value === 'published' ||
    value === 'completed' ||
    value === 'open'
  ) {
    return 'success' as const
  }
  if (
    value === 'requires_issuer' ||
    value === 'partial' ||
    value === 'pending' ||
    value === 'redirect_required' ||
    value === 'awaiting_publish' ||
    value === 'scheduled'
  ) {
    return 'gold' as const
  }
  if (
    value === 'demo_only' ||
    value === 'benchmark_only' ||
    value === 'view_only' ||
    value === 'unavailable' ||
    value === 'failed'
  ) {
    return 'warning' as const
  }
  return 'info' as const
}

function visibilityLabel(value: string | undefined, locale: LanguageCode) {
  switch (value) {
    case 'demo_only':
      return localizedCopy(locale, {
        en: 'Demo only',
        zhCn: '仅演示',
        zhHk: '僅示範',
      })
    case 'benchmark_only':
      return localizedCopy(locale, {
        en: 'Benchmark only',
        zhCn: '仅基准',
        zhHk: '僅基準',
      })
    default:
      return localizedCopy(locale, {
        en: 'Live',
        zhCn: '可实盘',
        zhHk: '可實盤',
      })
  }
}

export function AssetProofPage() {
  const { t } = useTranslation()
  const { assetId = '' } = useParams()
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const locale = normalizeLanguageCode(useAppStore((state) => state.locale))
  const notAvailable = t('common.notAvailable')

  const bootstrapQuery = useQuery({
    queryKey: ['rwa', 'bootstrap', 'asset-proof', assetId, locale],
    queryFn: () => adapter.rwa.getBootstrap(),
  })

  const chainConfig = bootstrapQuery.data?.chainConfig
  const wallet = useHashKeyWallet(chainConfig)
  const network =
    wallet.walletNetwork ??
    (chainConfig?.defaultExecutionNetwork === 'mainnet' ? 'mainnet' : 'testnet')

  const proofQuery = useQuery({
    queryKey: ['rwa', 'asset-proof', assetId, network, locale],
    queryFn: () => adapter.rwa.getAssetProof(assetId, network),
    enabled: Boolean(assetId),
  })

  const historyQuery = useQuery({
    queryKey: ['rwa', 'asset-proof-history', assetId, network, locale],
    queryFn: () => adapter.rwa.getAssetProofHistory(assetId, network),
    enabled: Boolean(assetId),
  })

  const readinessQuery = useQuery({
    queryKey: ['rwa', 'asset-readiness', assetId, wallet.walletAddress, network, locale],
    queryFn: () =>
      adapter.rwa.getAssetReadiness({
        assetId,
        address: wallet.walletAddress || '',
        network,
      }),
    enabled: Boolean(assetId),
  })

  const asset =
    readinessQuery.data?.asset ??
    bootstrapQuery.data?.assetLibrary.find((item) => item.id === assetId)
  const proof = proofQuery.data
  const readiness = readinessQuery.data
  const timeline = historyQuery.data ?? []
  const previousProof = timeline[1]

  if (bootstrapQuery.isLoading || proofQuery.isLoading || readinessQuery.isLoading || historyQuery.isLoading) {
    return (
      <Card className="p-6 text-sm text-text-secondary">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {localizedCopy(locale, {
            en: 'Building the proof timeline…',
            zhCn: '正在构建 proof 时间线…',
            zhHk: '正在建立 proof 時間線…',
          })}
        </div>
      </Card>
    )
  }

  if (!asset || !proof || !readiness) {
    return (
      <Card className="space-y-4 p-6">
        <p className="text-sm text-text-secondary">
          {localizedCopy(locale, {
            en: 'This asset proof is unavailable.',
            zhCn: '找不到该资产的 proof 信息。',
            zhHk: '找不到此資產的 proof 資訊。',
          })}
        </p>
        <Button variant="secondary" onClick={() => void navigate('/assets')}>
          <ArrowLeft className="size-4" />
          {localizedCopy(locale, {
            en: 'Back to assets',
            zhCn: '返回资产中心',
            zhHk: '返回資產中心',
          })}
        </Button>
      </Card>
    )
  }

  const isProofOnly =
    proof.visibilityRole === 'demo_only' ||
    proof.visibilityRole === 'benchmark_only' ||
    !proof.isExecutable ||
    readiness.executionReadiness === 'view_only'

  const buyBlockers = [
    ...readiness.complianceBlockers,
    ...proof.unavailableReasons,
    ...(isProofOnly
      ? [
          localizedCopy(locale, {
            en: 'This asset is isolated from the live submit path.',
            zhCn: '该资产当前被隔离在 live submit 路径之外。',
            zhHk: '此資產目前被隔離於 live submit 路徑之外。',
          }),
        ]
      : []),
  ].filter(Boolean)

  const nextSteps = readiness.decision.nextActions.length
    ? readiness.decision.nextActions
    : proof.isExecutable
      ? proof.executionReadiness === 'ready'
        ? [
            localizedCopy(locale, {
              en: 'Review the checklist, inspect calldata, then submit the direct contract route.',
              zhCn: '先检查清单和 calldata，再提交直连合约路径。',
              zhHk: '先檢查清單和 calldata，再提交直連合約路徑。',
            }),
          ]
        : [
            localizedCopy(locale, {
              en: 'Open the issuer route and complete compliance or document steps before settlement.',
              zhCn: '打开发行方路径，先完成合规或资料步骤，再进入结算。',
              zhHk: '打開發行方路徑，先完成合規或資料步驟，再進入結算。',
            }),
          ]
      : [
          localizedCopy(locale, {
            en: 'Use the proof timeline and anchor view for verification, not purchase.',
            zhCn: '当前更适合把 proof 时间线和链上锚点用于核验，而不是直接购买。',
            zhHk: '目前更適合把 proof 時間線和鏈上錨點用於核驗，而不是直接購買。',
          }),
        ]

  const disclosureDiffs = previousProof
    ? [
        proof.snapshotHash !== previousProof.snapshotHash
          ? localizedCopy(locale, {
              en: `Snapshot hash changed from ${previousProof.snapshotHash.slice(0, 14)}... to ${proof.snapshotHash.slice(0, 14)}...`,
              zhCn: `Snapshot hash 已从 ${previousProof.snapshotHash.slice(0, 14)}... 变为 ${proof.snapshotHash.slice(0, 14)}...`,
              zhHk: `Snapshot hash 已由 ${previousProof.snapshotHash.slice(0, 14)}... 變為 ${proof.snapshotHash.slice(0, 14)}...`,
            })
          : '',
        proof.oracleFreshness !== previousProof.oracleFreshness
          ? localizedCopy(locale, {
              en: `Oracle freshness moved from "${previousProof.oracleFreshness || 'n/a'}" to "${proof.oracleFreshness || 'n/a'}".`,
              zhCn: `Oracle freshness 已从 "${previousProof.oracleFreshness || notAvailable}" 变为 "${proof.oracleFreshness || notAvailable}"。`,
              zhHk: `Oracle freshness 已由 "${previousProof.oracleFreshness || notAvailable}" 變為 "${proof.oracleFreshness || notAvailable}"。`,
            })
          : '',
        proof.kycPolicySummary !== previousProof.kycPolicySummary
          ? localizedCopy(locale, {
              en: `KYC policy summary changed from "${previousProof.kycPolicySummary || 'n/a'}" to "${proof.kycPolicySummary || 'n/a'}".`,
              zhCn: `KYC policy 摘要已从 "${previousProof.kycPolicySummary || notAvailable}" 变为 "${proof.kycPolicySummary || notAvailable}"。`,
              zhHk: `KYC policy 摘要已由 "${previousProof.kycPolicySummary || notAvailable}" 變為 "${proof.kycPolicySummary || notAvailable}"。`,
            })
          : '',
      ].filter(Boolean)
    : [
        localizedCopy(locale, {
          en: 'This is the first proof snapshot in the local timeline.',
          zhCn: '这是本地时间线里的第一份 proof 快照。',
          zhHk: '這是本地時間線中的第一份 proof 快照。',
        }),
      ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={localizedCopy(locale, {
          en: 'Authenticity center',
          zhCn: '真实性中心',
          zhHk: '真實性中心',
        })}
        title={asset.name}
        description={
          localizedCopy(locale, {
            en: 'Latest proof, history, onchain anchor, executability, and the next step stay in one place.',
            zhCn: '最新 proof、历史版本、链上锚点、可买性和下一步动作都放在同一页。',
            zhHk: '最新 proof、歷史版本、鏈上錨點、可買性和下一步動作都放在同一頁。',
          })
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => void navigate('/assets')}>
              <ArrowLeft className="size-4" />
              {localizedCopy(locale, {
                en: 'Back to assets',
                zhCn: '返回资产中心',
                zhHk: '返回資產中心',
              })}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void navigate(wallet.walletAddress ? `/portfolio/${wallet.walletAddress}` : '/portfolio')
              }
            >
              <Wallet className="size-4" />
              {localizedCopy(locale, {
                en: 'Portfolio',
                zhCn: '组合监控',
                zhHk: '組合監控',
              })}
            </Button>
          </>
        }
      />

      <section className="overflow-hidden rounded-[32px] border border-border-subtle bg-[linear-gradient(135deg,rgba(12,23,44,0.96),rgba(18,39,70,0.92)_48%,rgba(8,23,39,0.96))]">
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:px-8">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{asset.symbol}</Badge>
              <Badge tone={proofTone(proof.truthLevel)}>{proof.truthLevel}</Badge>
              <Badge tone={proofTone(proof.liveReadiness)}>{proof.liveReadiness}</Badge>
              <Badge tone={proofTone(proof.executionReadiness)}>
                {proof.executionAdapterKind}
              </Badge>
              <Badge tone={proofTone(proof.visibilityRole)}>{visibilityLabel(proof.visibilityRole, locale)}</Badge>
            </div>
            <div className="max-w-3xl space-y-3">
              <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-text-primary md:text-4xl">
                {proof.isExecutable
                  ? localizedCopy(locale, {
                      en: 'The latest proof now ties authenticity to an executable route.',
                      zhCn: '最新 proof 已把真实性和执行路径钉在一起。',
                      zhHk: '最新 proof 已把真實性和執行路徑釘在一起。',
                    })
                  : localizedCopy(locale, {
                      en: 'This asset is verifiable, but it is intentionally isolated from live submission.',
                      zhCn: '这个资产可验证，但当前被刻意隔离在 live submit 之外。',
                      zhHk: '此資產可驗證，但目前被刻意隔離於 live submit 之外。',
                    })}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-text-secondary md:text-[15px]">
                {asset.description}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="hero-stat-surface rounded-[22px] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {localizedCopy(locale, {
                    en: 'Proof freshness',
                    zhCn: 'Proof 新鲜度',
                    zhHk: 'Proof 新鮮度',
                  })}
                </p>
                <p className="mt-2 text-base font-semibold text-text-primary">{proof.proofFreshness.label}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{proof.proofFreshness.reason}</p>
              </div>
              <div className="hero-stat-surface rounded-[22px] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {localizedCopy(locale, {
                    en: 'Anchor status',
                    zhCn: '链上锚点状态',
                    zhHk: '鏈上錨點狀態',
                  })}
                </p>
                <p className="mt-2 text-base font-semibold text-text-primary">{proof.anchorStatus.status}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {proof.anchorStatus.proofKey
                    ? proof.anchorStatus.proofKey.slice(0, 18)
                    : localizedCopy(locale, {
                        en: 'Awaiting onchain anchor',
                        zhCn: '等待链上锚点',
                        zhHk: '等待鏈上錨點',
                      })}
                </p>
              </div>
              <div className="hero-stat-surface rounded-[22px] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {localizedCopy(locale, {
                    en: 'Oracle freshness',
                    zhCn: 'Oracle 新鲜度',
                    zhHk: 'Oracle 新鮮度',
                  })}
                </p>
                <p className="mt-2 text-base font-semibold text-text-primary">{proof.oracleFreshness || notAvailable}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {proof.kycPolicySummary ||
                    localizedCopy(locale, {
                      en: 'No KYC summary',
                      zhCn: '暂无 KYC 摘要',
                      zhHk: '暫無 KYC 摘要',
                    })}
                </p>
              </div>
              <div className="hero-stat-surface rounded-[22px] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {localizedCopy(locale, {
                    en: 'Source confidence',
                    zhCn: '来源置信度',
                    zhHk: '來源置信度',
                  })}
                </p>
                <p className="mt-2 text-base font-semibold text-text-primary">{formatPercent(proof.sourceConfidence, notAvailable)}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {localizedCopy(locale, {
                    en: `${timeline.length} historical snapshots tracked`,
                    zhCn: `已追踪 ${timeline.length} 个历史快照`,
                    zhHk: `已追蹤 ${timeline.length} 個歷史快照`,
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="hero-aside-surface rounded-[28px] border border-border-subtle p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-accent-cyan" />
              <p className="text-lg font-semibold text-text-primary">
                {localizedCopy(locale, {
                  en: 'Why it is buyable or blocked now',
                  zhCn: '为什么现在能买或不能买',
                  zhHk: '為何目前可買或不可買',
                })}
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-text-secondary">{readiness.routeSummary}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={proofTone(readiness.decision.status)}>{readiness.decision.status}</Badge>
              <Badge tone={proofTone(proof.executionReadiness)}>{proof.executionReadiness}</Badge>
              <Badge tone={proofTone(proof.anchorStatus.status)}>{proof.anchorStatus.status}</Badge>
            </div>
            <div className="mt-5 space-y-4 text-sm text-text-secondary">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {localizedCopy(locale, {
                    en: 'Current blockers',
                    zhCn: '当前阻塞项',
                    zhHk: '目前阻塞項',
                  })}
                </p>
                <div className="mt-3 space-y-2">
                  {buyBlockers.length ? (
                    buyBlockers.map((item) => (
                      <div key={item} className="rounded-[18px] border border-[rgba(245,158,11,0.18)] bg-[rgba(245,158,11,0.08)] px-3 py-2.5">
                        {item}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[18px] border border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.08)] px-3 py-2.5">
                      {localizedCopy(locale, {
                        en: 'No additional blocker is active. The asset can move into execution preparation.',
                        zhCn: '没有额外 blocker，可进入执行准备。',
                        zhHk: '沒有額外 blocker，可進入執行準備。',
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {localizedCopy(locale, {
                    en: 'Next steps',
                    zhCn: '下一步动作',
                    zhHk: '下一步動作',
                  })}
                </p>
                <div className="mt-3 space-y-2">
                  {nextSteps.map((item) => (
                    <div key={item} className="rounded-[18px] bg-app-bg-elevated px-3 py-2.5">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  onClick={() =>
                    void navigate(`/new-analysis?asset=${asset.id}`)
                  }
                  disabled={isProofOnly}
                >
                  <ArrowRight className="size-4" />
                  {localizedCopy(locale, {
                    en: 'Go to execution',
                    zhCn: '去执行',
                    zhHk: '去執行',
                  })}
                </Button>
                {proof.primaryActionUrl ? (
                  <Button
                    variant="secondary"
                    onClick={() => window.open(proof.primaryActionUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="size-4" />
                    {localizedCopy(locale, {
                      en: 'Open source',
                      zhCn: '打开来源',
                      zhHk: '打開來源',
                    })}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="space-y-5">
          <Card className="space-y-5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-text-primary">
                  {localizedCopy(locale, {
                    en: 'Proof timeline',
                    zhCn: 'Proof 时间线',
                    zhHk: 'Proof 時間線',
                  })}
                </p>
                <p className="text-sm text-text-secondary">
                  {localizedCopy(locale, {
                    en: 'Continuously generated, traceable, and cross-checkable with the chain anchor.',
                    zhCn: '持续生成、可追溯，并可对照链上锚点。',
                    zhHk: '持續生成、可追溯，並可對照鏈上錨點。',
                  })}
                </p>
              </div>
              <Badge tone="info">
                {localizedCopy(locale, {
                  en: `${timeline.length || 1} versions`,
                  zhCn: `${timeline.length || 1} 个版本`,
                  zhHk: `${timeline.length || 1} 個版本`,
                })}
              </Badge>
            </div>
            <div className="space-y-3">
              {(timeline.length ? timeline : [
                {
                  snapshotId: proof.snapshotId ?? `${proof.assetId}-latest`,
                  assetId: proof.assetId,
                  network: proof.network,
                  snapshotHash: proof.snapshotHash,
                  snapshotUri: proof.snapshotUri,
                  proofType: proof.proofType,
                  effectiveAt: proof.effectiveAt,
                  publishedAt: proof.publishedAt,
                  timelineVersion: proof.timelineVersion,
                  attester: proof.attester,
                  publishStatus: proof.publishStatus,
                  onchainAnchorStatus: proof.anchorStatus,
                  oracleFreshness: proof.oracleFreshness,
                  kycPolicySummary: proof.kycPolicySummary,
                  sourceConfidence: proof.sourceConfidence,
                  unavailableReasons: proof.unavailableReasons,
                },
              ]).map((item, index) => (
                <div key={item.snapshotId} className="grid gap-3 rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[rgba(34,211,238,0.12)] text-info">
                    <Clock3 className="size-4" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-text-primary">
                        v{item.timelineVersion}{' '}
                        {index === 0
                          ? localizedCopy(locale, {
                              en: 'Current',
                              zhCn: '当前版本',
                              zhHk: '目前版本',
                            })
                          : ''}
                      </p>
                      <Badge tone={proofTone(item.publishStatus)}>{item.publishStatus}</Badge>
                      <Badge tone={proofTone(item.onchainAnchorStatus.status)}>{item.onchainAnchorStatus.status}</Badge>
                    </div>
                    <p className="break-all text-sm text-text-secondary">{item.snapshotHash}</p>
                    <div className="grid gap-2 text-sm text-text-secondary md:grid-cols-2">
                      <p>
                        {localizedCopy(locale, {
                          en: 'Effective at',
                          zhCn: '生效时间',
                          zhHk: '生效時間',
                        })}
                        : {formatDateTime(item.effectiveAt, locale, notAvailable)}
                      </p>
                      <p>
                        {localizedCopy(locale, {
                          en: 'Recorded',
                          zhCn: '链上记录',
                          zhHk: '鏈上記錄',
                        })}
                        : {formatDateTime(item.publishedAt, locale, notAvailable)}
                      </p>
                      <p>
                        {localizedCopy(locale, {
                          en: 'Oracle freshness',
                          zhCn: 'Oracle 新鲜度',
                          zhHk: 'Oracle 新鮮度',
                        })}
                        : {item.oracleFreshness || notAvailable}
                      </p>
                      <p>
                        {localizedCopy(locale, {
                          en: 'KYC policy',
                          zhCn: 'KYC 策略',
                          zhHk: 'KYC 策略',
                        })}
                        : {item.kycPolicySummary || notAvailable}
                      </p>
                    </div>
                    {item.unavailableReasons.length ? (
                      <div className="space-y-2 pt-1">
                        {item.unavailableReasons.map((reason) => (
                          <div key={reason} className="rounded-[16px] bg-[rgba(244,63,94,0.08)] px-3 py-2 text-sm text-text-secondary">
                            {reason}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {item.onchainAnchorStatus.explorerUrl ? (
                    <a
                      href={item.onchainAnchorStatus.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-accent-cyan"
                    >
                      <ExternalLink className="size-4" />
                      {localizedCopy(locale, {
                        en: 'Onchain anchor',
                        zhCn: '链上锚点',
                        zhHk: '鏈上錨點',
                      })}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <div>
              <p className="text-lg font-semibold text-text-primary">
                {localizedCopy(locale, {
                  en: 'Disclosure diffs',
                  zhCn: '披露差异',
                  zhHk: '披露差異',
                })}
              </p>
              <p className="text-sm text-text-secondary">
                {localizedCopy(locale, {
                  en: 'The explainable delta between the latest snapshot and the previous version.',
                  zhCn: '最新 snapshot 与上一版之间可解释的变化。',
                  zhHk: '最新 snapshot 與上一版之間可解釋的變化。',
                })}
              </p>
            </div>
            <div className="space-y-2">
              {disclosureDiffs.map((item) => (
                <div key={item} className="rounded-[18px] border border-border-subtle bg-app-bg-elevated px-4 py-3 text-sm leading-6 text-text-secondary">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="space-y-5">
          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Network className="size-5 text-accent-cyan" />
              <p className="text-lg font-semibold text-text-primary">
                {localizedCopy(locale, {
                  en: 'Latest anchor',
                  zhCn: '最新锚点',
                  zhHk: '最新錨點',
                })}
              </p>
            </div>
            <div className="space-y-3 text-sm text-text-secondary">
              <div className="rounded-[20px] bg-app-bg-elevated p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {localizedCopy(locale, {
                    en: 'Registry / status',
                    zhCn: 'Registry / 状态',
                    zhHk: 'Registry / 狀態',
                  })}
                </p>
                <p className="mt-2 break-all text-text-primary">
                  {proof.anchorStatus.registryAddress || proof.registryAddress || notAvailable}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={proofTone(proof.anchorStatus.status)}>{proof.anchorStatus.status}</Badge>
                  <Badge tone={proofTone(proof.publishStatus)}>{proof.publishStatus}</Badge>
                </div>
              </div>
              <div className="rounded-[20px] bg-app-bg-elevated p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {localizedCopy(locale, {
                    en: 'Proof key',
                    zhCn: 'Proof key',
                    zhHk: 'Proof key',
                  })}
                </p>
                <p className="mt-2 break-all text-text-primary">
                  {proof.anchorStatus.proofKey ||
                    proof.onchainProofKey ||
                    localizedCopy(locale, {
                      en: 'Awaiting publish',
                      zhCn: '等待发布',
                      zhHk: '等待發佈',
                    })}
                </p>
              </div>
              <div className="rounded-[20px] bg-app-bg-elevated p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {localizedCopy(locale, {
                    en: 'Attester',
                    zhCn: '证明者',
                    zhHk: '證明者',
                  })}
                </p>
                <p className="mt-2 break-all text-text-primary">
                  {proof.anchorStatus.attester || proof.attester}
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {proof.anchorStatus.note ||
                    localizedCopy(locale, {
                      en: 'No extra note.',
                      zhCn: '没有额外备注。',
                      zhHk: '沒有額外備註。',
                    })}
                </p>
              </div>
              {proof.anchorStatus.explorerUrl ? (
                <a
                  href={proof.anchorStatus.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-accent-cyan"
                >
                  <ExternalLink className="size-4" />
                  {localizedCopy(locale, {
                    en: 'Open chain record',
                    zhCn: '打开链上记录',
                    zhHk: '打開鏈上記錄',
                  })}
                </a>
              ) : null}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <p className="text-lg font-semibold text-text-primary">
              {localizedCopy(locale, {
                en: 'Source refs',
                zhCn: '来源引用',
                zhHk: '來源引用',
              })}
            </p>
            <div className="space-y-3">
              {proof.proofSourceRefs.map((item) => (
                <div key={item.refId} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={item.isPrimary ? 'primary' : 'neutral'}>
                      {item.isPrimary
                        ? localizedCopy(locale, {
                            en: 'Primary',
                            zhCn: '主来源',
                            zhHk: '主來源',
                          })
                        : item.sourceKind ||
                          localizedCopy(locale, {
                            en: 'source',
                            zhCn: '来源',
                            zhHk: '來源',
                          })}
                    </Badge>
                    {item.sourceTier ? <Badge tone="info">{item.sourceTier}</Badge> : null}
                    {item.confidence != null ? (
                      <Badge tone="neutral">{formatPercent(item.confidence, notAvailable)}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 font-semibold text-text-primary">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    {item.summary ||
                      localizedCopy(locale, {
                        en: 'No summary.',
                        zhCn: '暂无摘要。',
                        zhHk: '暫無摘要。',
                      })}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                    <span>{item.sourceName}</span>
                    <span>
                      {item.status ||
                        localizedCopy(locale, {
                          en: 'available',
                          zhCn: '可用',
                          zhHk: '可用',
                        })}
                    </span>
                    <span>
                      {item.freshnessDate ||
                        localizedCopy(locale, {
                          en: 'undated',
                          zhCn: '无日期',
                          zhHk: '無日期',
                        })}
                    </span>
                  </div>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm text-accent-cyan"
                  >
                    <ExternalLink className="size-4" />
                    {localizedCopy(locale, {
                      en: 'Open source',
                      zhCn: '打开来源',
                      zhHk: '打開來源',
                    })}
                  </a>
                </div>
              ))}
            </div>
          </Card>

          {buyBlockers.length ? (
            <Card className="space-y-4 border-[rgba(245,158,11,0.18)] p-5">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="size-5" />
                <p className="text-lg font-semibold text-text-primary">
                  {localizedCopy(locale, {
                    en: 'Why it is currently not buyable',
                    zhCn: '为什么当前不可买',
                    zhHk: '為何目前不可買',
                  })}
                </p>
              </div>
              <div className="space-y-2">
                {buyBlockers.map((item) => (
                  <div key={item} className="rounded-[18px] bg-[rgba(245,158,11,0.08)] px-4 py-3 text-sm leading-6 text-text-secondary">
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </section>
      </div>
    </div>
  )
}
