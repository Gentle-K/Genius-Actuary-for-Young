import { CheckCircle, Clock, Copy, ExternalLink } from 'lucide-react'

import { formatDateTime } from '@/lib/utils/format'
import { shortAddress } from '@/lib/web3/hashkey'
import type { LanguageCode, TxReceipt } from '@/types'

interface TxReceiptSectionProps {
  receipt: TxReceipt
  locale?: LanguageCode
}

export function TxReceiptSection({
  receipt,
  locale = 'en',
}: TxReceiptSectionProps) {
  const isZh = locale === 'zh'

  const copyHash = () => {
    navigator.clipboard.writeText(receipt.transactionHash).catch(() => {})
  }

  return (
    <div
      id="tx-receipt-section"
      className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-emerald-400" />
        <h3 className="text-sm font-semibold text-white/90">
          {isZh ? '链上存证已确认' : 'On-chain Attestation Confirmed'}
        </h3>
      </div>

      <div className="space-y-2 text-sm text-white/70">
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/40">{isZh ? '交易哈希' : 'Tx hash'}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs">
              {shortAddress(receipt.transactionHash)}
            </span>
            <button
              type="button"
              onClick={copyHash}
              className="text-white/30 transition hover:text-white/70"
              title={isZh ? '复制哈希' : 'Copy hash'}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {receipt.blockNumber != null ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/40">{isZh ? '区块' : 'Block'}</span>
            <span className="font-mono text-xs">#{receipt.blockNumber}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <span className="text-white/40">{isZh ? '网络' : 'Network'}</span>
          <span className="capitalize text-xs">{receipt.network}</span>
        </div>

        {receipt.submittedBy ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/40">{isZh ? '提交地址' : 'Submitted by'}</span>
            <span className="font-mono text-xs">
              {shortAddress(receipt.submittedBy)}
            </span>
          </div>
        ) : null}

        {receipt.submittedAt ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/40">{isZh ? '提交时间' : 'Submitted at'}</span>
            <span className="inline-flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {formatDateTime(receipt.submittedAt, locale)}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <a
          href={receipt.transactionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {isZh ? '在浏览器中查看' : 'View in explorer'}
        </a>
      </div>
    </div>
  )
}
