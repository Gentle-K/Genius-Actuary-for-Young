import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ExternalLink, ShieldCheck, Wallet } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  PageContainer,
  PageHeader,
  PageSection,
} from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'

const FOCUSED_ASSET_IDS = [
  'hsk-usdt',
  'hsk-usdc',
  'cpic-estable-mmf',
  'hk-regulated-silver',
] as const

function readinessTone(readiness?: string) {
  if (readiness === 'ready') return 'success' as const
  if (readiness === 'partial') return 'gold' as const
  return 'warning' as const
}

export function AssetsHubPage() {
  const { t } = useTranslation()
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const locale = useAppStore((state) => state.locale)
  const walletAddress = useAppStore((state) => state.walletAddress)

  const bootstrapQuery = useQuery({
    queryKey: ['rwa', 'bootstrap', 'assets-hub', locale],
    queryFn: () => adapter.rwa.getBootstrap(),
  })

  const focusedAssets = useMemo(() => {
    const library = bootstrapQuery.data?.assetLibrary ?? []
    return FOCUSED_ASSET_IDS.map((id) => library.find((asset) => asset.id === id)).filter(Boolean)
  }, [bootstrapQuery.data?.assetLibrary]) as NonNullable<typeof bootstrapQuery.data>['assetLibrary']

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t('assets.eyebrow')}
        title={t('assets.title')}
        description={t('assets.description')}
        actions={
          <>
            <Button
              variant="secondary"
              className="max-sm:w-full"
              onClick={() => void navigate('/new-analysis')}
            >
              {t('actions.newAnalysis')}
            </Button>
            <Button
              className="max-sm:w-full"
              onClick={() => void navigate(walletAddress ? `/portfolio/${walletAddress}` : '/portfolio')}
            >
              <Wallet className="size-4" />
              {t('actions.openPortfolio')}
            </Button>
          </>
        }
      />

      <PageSection className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-[24px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
            {t('assets.cards.proofScopeTitle')}
          </p>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {t('assets.cards.proofScopeDescription')}
          </p>
        </Card>
        <Card className="rounded-[24px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
            {t('assets.cards.executionLayeringTitle')}
          </p>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {t('assets.cards.executionLayeringDescription')}
          </p>
        </Card>
        <Card className="rounded-[24px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
            {t('assets.cards.productSpineTitle')}
          </p>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {t('assets.cards.productSpineDescription')}
          </p>
        </Card>
      </PageSection>

      <PageSection className="grid gap-4 2xl:grid-cols-2">
        {focusedAssets.map((asset) => (
          <Card key={asset.id} className="space-y-5 p-5 md:p-6">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">{asset.symbol}</Badge>
                  <Badge tone={readinessTone(asset.liveReadiness)}>{asset.liveReadiness}</Badge>
                  {asset.truthLevel ? <Badge tone="neutral">{asset.truthLevel}</Badge> : null}
                </div>
                <p className="mt-3 text-lg font-semibold text-text-primary">{asset.name}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{asset.description}</p>
              </div>
              <ShieldCheck className="size-5 shrink-0 text-accent-cyan" />
            </div>

            <div className="grid gap-4 text-sm text-text-secondary sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {t('assets.fields.settlement')}
                </p>
                <p className="mt-2 break-words text-text-primary">{asset.settlementAsset}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {t('assets.fields.kyc')}
                </p>
                <p className="mt-2 break-words text-text-primary">
                  {asset.requiresKycLevel != null ? `L${asset.requiresKycLevel}` : 'Open'}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {t('assets.fields.redemption')}
                </p>
                <p className="mt-2 break-words text-text-primary">
                  {asset.redemptionWindow || (asset.redemptionDays ? `T+${asset.redemptionDays}` : 'T+0')}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
                  {t('assets.fields.executionStyle')}
                </p>
                <p className="mt-2 break-words text-text-primary">{asset.executionStyle}</p>
              </div>
            </div>

            <p className="text-sm leading-6 text-text-secondary">
              {asset.statusExplanation || asset.fitSummary}
            </p>

            {asset.tags.length ? (
              <div className="flex flex-wrap gap-2">
                {asset.tags.map((tag) => (
                  <Badge key={`${asset.id}-${tag}`} tone="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 max-sm:flex-col">
              <Button className="max-sm:w-full" onClick={() => void navigate(`/assets/${asset.id}/proof`)}>
                <ArrowRight className="size-4" />
                {t('actions.viewProof')}
              </Button>
              {asset.primarySourceUrl ? (
                <Button
                  variant="secondary"
                  className="max-sm:w-full"
                  onClick={() => window.open(asset.primarySourceUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="size-4" />
                  {t('actions.openSource')}
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </PageSection>
    </PageContainer>
  )
}
