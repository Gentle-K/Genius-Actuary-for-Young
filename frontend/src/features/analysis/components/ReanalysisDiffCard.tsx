import { ArrowRightLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()

  if (!diff) {
    return null
  }

  return (
    <Card className="space-y-4 p-6" data-testid="reanalysis-diff-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ArrowRightLeft className="size-5 text-gold-primary" />
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {t('analysis.reanalysisDiff.title')}
            </h2>
            {diff.previousSnapshotAt ? (
              <p className="mt-1 text-sm text-text-secondary">
                {t('analysis.reanalysisDiff.previousSnapshot')}: {formatDateTime(diff.previousSnapshotAt, locale)}
              </p>
            ) : null}
            {diff.currentGeneratedAt ? (
              <p className="mt-1 text-sm text-text-secondary">
                {t('analysis.reanalysisDiff.currentResult')}: {formatDateTime(diff.currentGeneratedAt, locale)}
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
            {t('analysis.reanalysisDiff.constraintChanges')}
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

      {diff.previousRecommendation.length || diff.currentRecommendation.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border-subtle bg-app-bg-elevated p-4">
            <p className="text-sm font-medium text-text-primary">
              {t('analysis.reanalysisDiff.previousRecommendation')}
            </p>
            {diff.previousRecommendation.length ? (
              <ul className="mt-2 space-y-2 text-sm leading-7 text-text-secondary">
                {diff.previousRecommendation.map((item) => (
                  <li key={`previous-${item}`}>• {item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">
                {t('analysis.reanalysisDiff.noComparableRecommendation')}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border-subtle bg-app-bg-elevated p-4">
            <p className="text-sm font-medium text-text-primary">
              {t('analysis.reanalysisDiff.currentRecommendation')}
            </p>
            {diff.currentRecommendation.length ? (
              <ul className="mt-2 space-y-2 text-sm leading-7 text-text-secondary">
                {diff.currentRecommendation.map((item) => (
                  <li key={`current-${item}`}>• {item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">
                {t('analysis.reanalysisDiff.noCurrentRecommendation')}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {diff.changedWeights.length ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-primary">
            {t('analysis.reanalysisDiff.weightChanges')}
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

      {diff.changedRisk.length ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-primary">
            {t('analysis.reanalysisDiff.riskChanges')}
          </p>
          {diff.changedRisk.map((item) => (
            <div key={`${item.assetId}-risk`} className="rounded-lg border border-border-subtle bg-app-bg-elevated p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-text-primary">{item.assetName}</p>
                <Badge tone={item.deltaOverall <= 0 ? 'success' : 'warning'}>
                  {item.deltaOverall >= 0 ? '+' : ''}
                  {item.deltaOverall.toFixed(1)}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                {item.beforeOverall.toFixed(1)} {'->'} {item.afterOverall.toFixed(1)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {diff.changedEvidence.length ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-primary">
            {t('analysis.reanalysisDiff.evidenceChanges')}
          </p>
          {diff.changedEvidence.map((item) => {
            const improved =
              item.afterCoverageScore >= item.beforeCoverageScore &&
              item.afterConflictCount <= item.beforeConflictCount

            return (
              <div
                key={`${item.assetId ?? item.assetName ?? item.summary}-evidence`}
                className="rounded-lg border border-border-subtle bg-app-bg-elevated p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-text-primary">
                    {item.assetName || item.assetId || t('analysis.reanalysisDiff.evidenceFallback')}
                  </p>
                  <Badge tone={improved ? 'success' : 'warning'}>
                    {Math.round(item.beforeCoverageScore * 100)}% {'->'} {Math.round(item.afterCoverageScore * 100)}%
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{item.summary}</p>
                <p className="mt-2 text-xs text-text-muted">
                  {t('analysis.reanalysisDiff.conflicts')}: {item.beforeConflictCount} {'->'} {item.afterConflictCount}
                </p>
              </div>
            )
          })}
        </div>
      ) : null}
    </Card>
  )
}
