import { AlertTriangle, ExternalLink, Radio } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatDateTime } from '@/lib/utils/format'
import type { LanguageCode, MarketDataSnapshot } from '@/types'

interface OracleSnapshotSectionProps {
  snapshots: MarketDataSnapshot[]
  locale?: LanguageCode
}

export function OracleSnapshotSection({
  snapshots,
  locale = 'en',
}: OracleSnapshotSectionProps) {
  const { t } = useTranslation()

  if (!snapshots.length) {
    return null
  }

  const liveCount = snapshots.filter((snapshot) => snapshot.status === 'live').length

  return (
    <div
      id="oracle-snapshot-section"
      className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Radio className="h-5 w-5 text-blue-400" />
        <h3 className="text-sm font-semibold text-white/90">
          {t('analysis.oracleSnapshot.title')}
        </h3>
        <span className="ml-auto text-xs text-white/40">
          {t('analysis.oracleSnapshot.liveCount', { live: liveCount, total: snapshots.length })}
        </span>
      </div>

      <div className="space-y-2">
        {snapshots.map((snapshot) => (
          <div
            key={`${snapshot.feedId}-${snapshot.network}`}
            className={`rounded-lg border px-3 py-3 ${
              snapshot.status === 'live'
                ? 'border-white/10 bg-white/5'
                : 'border-amber-500/15 bg-amber-500/5'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      snapshot.status === 'live' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-sm font-medium text-white/90">
                    {snapshot.pair}
                  </span>
                  <span className="text-xs text-white/40">{snapshot.network}</span>
                </div>
                <p className="mt-1 text-xs text-white/45">{snapshot.sourceName}</p>
              </div>

              <div className="text-right">
                {typeof snapshot.price === 'number' ? (
                  <p className="font-mono text-sm font-semibold text-white/90">
                    ${snapshot.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: snapshot.decimals > 4 ? 4 : 2,
                    })}
                  </p>
                ) : (
                  <p className="inline-flex items-center gap-1 text-xs text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t('analysis.oracleSnapshot.unavailable')}
                  </p>
                )}
                {snapshot.updatedAt ? (
                  <p className="mt-1 text-[11px] text-white/35">
                    {t('analysis.oracleSnapshot.updated')}:{' '}
                    {formatDateTime(snapshot.updatedAt, locale)}
                  </p>
                ) : null}
              </div>
            </div>

            {snapshot.note ? (
              <p className="mt-2 text-xs text-white/45">{snapshot.note}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-white/35">
              <span>
                {t('analysis.oracleSnapshot.fetched')}: {formatDateTime(snapshot.fetchedAt, locale)}
              </span>
              {snapshot.explorerUrl ? (
                <a
                  href={snapshot.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-white/55 transition hover:text-white/80"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('analysis.oracleSnapshot.viewFeedContract')}
                </a>
              ) : null}
              {snapshot.sourceUrl ? (
                <a
                  href={snapshot.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-white/55 transition hover:text-white/80"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('analysis.oracleSnapshot.viewDocs')}
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
