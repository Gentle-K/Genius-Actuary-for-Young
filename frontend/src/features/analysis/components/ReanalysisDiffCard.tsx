import { ArrowRightLeft } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils/format'
import type { LanguageCode, ReanalysisDiff } from '@/types'

interface ReanalysisDiffCardProps {
  diff?: ReanalysisDiff
  locale?: LanguageCode
}

export function ReanalysisDiffCard({
  diff,
  locale = 'en',
}: ReanalysisDiffCardProps) {
  const isZh = locale === 'zh'

  if (!diff) {
    return null
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="size-5 text-gold-primary" />
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {isZh ? '再分析差异' : 'Re-analysis diff'}
            </h2>
            {diff.previousSnapshotAt ? (
              <p className="mt-1 text-sm text-text-secondary">
                {isZh ? '上次快照' : 'Previous snapshot'}: {formatDateTime(diff.previousSnapshotAt, locale)}
              </p>
            ) : null}
          </div>
        </div>
        {diff.summary ? <Badge tone="gold">{diff.summary}</Badge> : null}
      </div>

      {diff.whyChanged.length ? (
        <div className="space-y-2">
          {diff.whyChanged.map((item) => (
            <p key={item} className="text-sm leading-7 text-text-secondary">
              {item}
            </p>
          ))}
        </div>
      ) : null}

      {diff.changedConstraints.length ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-primary">
            {isZh ? '约束变化' : 'Constraint changes'}
          </p>
          {diff.changedConstraints.map((item) => (
            <div key={`${item.label}-${item.before}-${item.after}`} className="rounded-lg border border-border-subtle bg-app-bg-elevated p-4">
              <p className="font-medium text-text-primary">{item.label}</p>
              <p className="mt-2 text-sm text-text-secondary">{item.before} {'->'} {item.after}</p>
              {item.detail ? <p className="mt-2 text-xs text-text-muted">{item.detail}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {diff.changedWeights.length ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-primary">
            {isZh ? '权重变化' : 'Weight changes'}
          </p>
          {diff.changedWeights.map((item) => (
            <div key={item.assetId} className="rounded-lg border border-border-subtle bg-app-bg-elevated p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-text-primary">{item.assetName}</p>
                <Badge tone={item.deltaWeightPct >= 0 ? 'success' : 'warning'}>
                  {item.deltaWeightPct >= 0 ? '+' : ''}
                  {item.deltaWeightPct.toFixed(1)}%
                </Badge>
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                {item.beforeWeightPct.toFixed(1)}% {'->'} {item.afterWeightPct.toFixed(1)}%
              </p>
              {item.reason ? <p className="mt-2 text-xs text-text-muted">{item.reason}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  )
}
