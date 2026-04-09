import { ExternalLink, ShieldCheck, ShieldAlert } from 'lucide-react'

import type { KycOnchainResult as KycResult } from '@/types'
import { shortAddress } from '@/lib/web3/hashkey'

interface KycSnapshotSectionProps {
  kyc: KycResult
  locale?: 'zh' | 'en'
}

export function KycSnapshotSection({
  kyc,
  locale = 'en',
}: KycSnapshotSectionProps) {
  const isZh = locale === 'zh'
  const statusColor = kyc.isHuman
    ? 'border-emerald-500/30 bg-emerald-500/5'
    : 'border-amber-500/30 bg-amber-500/5'
  const StatusIcon = kyc.isHuman ? ShieldCheck : ShieldAlert
  const statusIconColor = kyc.isHuman ? 'text-emerald-400' : 'text-amber-400'

  return (
    <div
      id="kyc-snapshot-section"
      className={`rounded-xl border p-4 ${statusColor}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <StatusIcon className={`h-5 w-5 ${statusIconColor}`} />
        <h3 className="text-sm font-semibold text-white/90">
          {isZh ? '链上 KYC 快照' : 'On-chain KYC Snapshot'}
        </h3>
      </div>

      <div className="grid gap-2 text-sm text-white/70 sm:grid-cols-2">
        <div>
          <span className="text-white/40">
            {isZh ? '钱包地址' : 'Wallet'}:{' '}
          </span>
          <span className="font-mono">{shortAddress(kyc.walletAddress)}</span>
        </div>
        <div>
          <span className="text-white/40">
            {isZh ? '网络' : 'Network'}:{' '}
          </span>
          <span className="capitalize">{kyc.network}</span>
        </div>
        <div>
          <span className="text-white/40">
            {isZh ? 'KYC 等级' : 'KYC Level'}:{' '}
          </span>
          <span className="font-semibold">L{kyc.level}</span>
        </div>
        <div>
          <span className="text-white/40">
            {isZh ? '验证状态' : 'Status'}:{' '}
          </span>
          <span className={kyc.isHuman ? 'text-emerald-400' : 'text-amber-400'}>
            {kyc.isHuman
              ? isZh
                ? '已验证'
                : 'Verified'
              : isZh
                ? '未验证'
                : 'Not Verified'}
          </span>
        </div>
      </div>

      {kyc.note && (
        <p className="mt-2 text-xs text-white/50">{kyc.note}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {kyc.explorerUrl && (
          <a
            href={kyc.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-white/60 transition hover:bg-white/10 hover:text-white/80"
          >
            <ExternalLink className="h-3 w-3" />
            {isZh ? '查看合约' : 'View Contract'}
          </a>
        )}
        {kyc.sourceUrl && (
          <a
            href={kyc.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-white/60 transition hover:bg-white/10 hover:text-white/80"
          >
            <ExternalLink className="h-3 w-3" />
            {isZh ? 'KYC 文档' : 'KYC Docs'}
          </a>
        )}
      </div>
    </div>
  )
}
