import { ExternalLink, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react'

import { formatDateTime } from '@/lib/utils/format'
import { shortAddress } from '@/lib/web3/hashkey'
import type { KycOnchainResult, LanguageCode } from '@/types'

interface KycSnapshotSectionProps {
  kyc: KycOnchainResult
  locale?: LanguageCode
}

function statusLabel(status: KycOnchainResult['status'], isZh: boolean) {
  switch (status) {
    case 'approved':
      return isZh ? '已通过' : 'Approved'
    case 'revoked':
      return isZh ? '已撤销' : 'Revoked'
    case 'unavailable':
      return isZh ? '不可用' : 'Unavailable'
    default:
      return isZh ? '未通过' : 'None'
  }
}

function statusTone(status: KycOnchainResult['status']) {
  switch (status) {
    case 'approved':
      return {
        card: 'border-emerald-500/30 bg-emerald-500/5',
        text: 'text-emerald-400',
        Icon: ShieldCheck,
      }
    case 'revoked':
      return {
        card: 'border-red-500/30 bg-red-500/5',
        text: 'text-red-300',
        Icon: ShieldX,
      }
    default:
      return {
        card: 'border-amber-500/30 bg-amber-500/5',
        text: 'text-amber-300',
        Icon: ShieldAlert,
      }
  }
}

export function KycSnapshotSection({
  kyc,
  locale = 'en',
}: KycSnapshotSectionProps) {
  const isZh = locale === 'zh'
  const tone = statusTone(kyc.status)

  return (
    <div
      id="kyc-snapshot-section"
      className={`rounded-xl border p-4 ${tone.card}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <tone.Icon className={`h-5 w-5 ${tone.text}`} />
        <h3 className="text-sm font-semibold text-white/90">
          {isZh ? '链上 KYC 快照' : 'On-chain KYC Snapshot'}
        </h3>
      </div>

      <div className="grid gap-3 text-sm text-white/70 sm:grid-cols-2">
        <div>
          <span className="text-white/40">{isZh ? '钱包' : 'Wallet'}: </span>
          <span className="font-mono">{shortAddress(kyc.walletAddress)}</span>
        </div>
        <div>
          <span className="text-white/40">{isZh ? '网络' : 'Network'}: </span>
          <span className="capitalize">{kyc.network}</span>
        </div>
        <div>
          <span className="text-white/40">{isZh ? 'KYC 等级' : 'KYC level'}: </span>
          <span className="font-semibold">L{kyc.level}</span>
        </div>
        <div>
          <span className="text-white/40">{isZh ? '状态' : 'Status'}: </span>
          <span className={tone.text}>{statusLabel(kyc.status, isZh)}</span>
        </div>
      </div>

      {kyc.note ? <p className="mt-3 text-xs text-white/50">{kyc.note}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/40">
        <span>
          {isZh ? '抓取时间' : 'Fetched at'}: {formatDateTime(kyc.fetchedAt, locale)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {kyc.explorerUrl ? (
          <a
            href={kyc.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-white/60 transition hover:bg-white/10 hover:text-white/85"
          >
            <ExternalLink className="h-3 w-3" />
            {isZh ? '查看合约' : 'View contract'}
          </a>
        ) : null}
        {kyc.sourceUrl ? (
          <a
            href={kyc.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-white/60 transition hover:bg-white/10 hover:text-white/85"
          >
            <ExternalLink className="h-3 w-3" />
            {isZh ? '查看 KYC 文档' : 'View KYC docs'}
          </a>
        ) : null}
      </div>
    </div>
  )
}
