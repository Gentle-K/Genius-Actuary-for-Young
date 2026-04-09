import { ExternalLink, CheckCircle, Clock, Copy } from 'lucide-react'

import type { TxReceipt } from '@/types'
import { shortAddress } from '@/lib/web3/hashkey'

interface TxReceiptSectionProps {
  receipt: TxReceipt
  locale?: 'zh' | 'en'
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
          {isZh ? '链上存证完成' : 'On-chain Attestation Confirmed'}
        </h3>
      </div>

      <div className="space-y-2 text-sm text-white/70">
        <div className="flex items-center justify-between">
          <span className="text-white/40">
            {isZh ? '交易哈希' : 'Tx Hash'}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs">
              {shortAddress(receipt.transactionHash)}
            </span>
            <button
              onClick={copyHash}
              className="text-white/30 transition hover:text-white/60"
              title={isZh ? '复制' : 'Copy'}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {receipt.blockNumber != null && (
          <div className="flex items-center justify-between">
            <span className="text-white/40">
              {isZh ? '区块号' : 'Block'}
            </span>
            <span className="font-mono text-xs">
              #{receipt.blockNumber.toLocaleString()}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-white/40">
            {isZh ? '网络' : 'Network'}
          </span>
          <span className="capitalize text-xs">{receipt.network}</span>
        </div>

        {receipt.submittedBy && (
          <div className="flex items-center justify-between">
            <span className="text-white/40">
              {isZh ? '提交者' : 'Submitted by'}
            </span>
            <span className="font-mono text-xs">
              {shortAddress(receipt.submittedBy)}
            </span>
          </div>
        )}

        {receipt.submittedAt && (
          <div className="flex items-center justify-between">
            <span className="text-white/40">
              {isZh ? '提交时间' : 'Submitted at'}
            </span>
            <span className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {new Date(receipt.submittedAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <a
          href={receipt.transactionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/25"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {isZh ? '在浏览器中查看' : 'View in Explorer'}
        </a>
      </div>
    </div>
  )
}
