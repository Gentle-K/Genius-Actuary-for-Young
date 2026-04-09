import { ExternalLink, Radio, AlertTriangle } from 'lucide-react'

import type { OracleSnapshotBackend } from '@/types'

interface OracleSnapshotSectionProps {
  snapshots: OracleSnapshotBackend[]
  locale?: 'zh' | 'en'
}

export function OracleSnapshotSection({
  snapshots,
  locale = 'en',
}: OracleSnapshotSectionProps) {
  const isZh = locale === 'zh'

  if (!snapshots.length) return null

  const liveCount = snapshots.filter((s) => s.status === 'live').length

  return (
    <div
      id="oracle-snapshot-section"
      className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Radio className="h-5 w-5 text-blue-400" />
        <h3 className="text-sm font-semibold text-white/90">
          {isZh ? '预言机价格快照' : 'Oracle Price Snapshots'}
        </h3>
        <span className="ml-auto text-xs text-white/40">
          {liveCount}/{snapshots.length} {isZh ? '在线' : 'live'}
        </span>
      </div>

      <div className="space-y-2">
        {snapshots.map((snapshot) => (
          <div
            key={snapshot.feedId}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              snapshot.status === 'live'
                ? 'bg-white/5'
                : 'bg-amber-500/5 border border-amber-500/15'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`h-2 w-2 rounded-full ${
                  snapshot.status === 'live' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <div>
                <span className="text-sm font-medium text-white/80">
                  {snapshot.pair}
                </span>
                <span className="ml-2 text-xs text-white/40">
                  {snapshot.sourceName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {snapshot.price != null ? (
                <span className="font-mono text-sm font-semibold text-white/90">
                  ${snapshot.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: snapshot.decimals > 4 ? 4 : 2,
                  })}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  {isZh ? '不可用' : 'Unavailable'}
                </span>
              )}

              {snapshot.updatedAt && (
                <span className="text-xs text-white/30">
                  {new Date(snapshot.updatedAt).toLocaleTimeString()}
                </span>
              )}

              {snapshot.explorerUrl && (
                <a
                  href={snapshot.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/30 transition hover:text-white/60"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-2 text-xs text-white/40">
        {isZh
          ? '价格来自 HashKey Chain 后端 JSON-RPC 读取，用于报告生成和推荐。'
          : 'Prices fetched via backend JSON-RPC reads from HashKey Chain oracles. Used as source of truth for report generation.'}
      </p>
    </div>
  )
}
