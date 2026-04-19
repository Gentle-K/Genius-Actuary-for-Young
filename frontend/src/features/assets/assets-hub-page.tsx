import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ExternalLink, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { PageContainer, PageHeader, PageSection } from '@/components/layout/page-header'
import {
  EmptyState,
  FilterBar,
  SearchField,
  SectionCard,
  StatusBadge,
} from '@/components/product/workspace-ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select } from '@/components/ui/field'
import { getAssetEligibilityDescriptor, type AssetEligibilityStatus } from '@/domain/status'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'

function toEligibilityStatus(readiness?: string): AssetEligibilityStatus {
  if (readiness === 'ready') return 'eligible'
  if (readiness === 'partial') return 'conditional'
  if (readiness === 'unavailable') return 'blocked'
  if (readiness === 'demo_only' || readiness === 'benchmark_only') return 'view_only'
  return 'conditional'
}

export function AssetsHubPage() {
  const { t } = useTranslation()
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const locale = useAppStore((state) => state.locale)
  const walletAddress = useAppStore((state) => state.walletAddress)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const bootstrapQuery = useQuery({
    queryKey: ['rwa', 'bootstrap', 'assets-hub', locale],
    queryFn: () => adapter.rwa.getBootstrap(),
  })

  const assets = useMemo(() => {
    return (bootstrapQuery.data?.assetLibrary ?? []).filter((asset) => {
      const matchesSearch =
        !search ||
        `${asset.name} ${asset.symbol} ${asset.description}`.toLowerCase().includes(search.toLowerCase())

      if (!matchesSearch) {
        return false
      }

      if (filter === 'all') {
        return true
      }

      if (filter === 'eligible') {
        return toEligibilityStatus(asset.liveReadiness) === 'eligible'
      }
      if (filter === 'conditional') {
        return toEligibilityStatus(asset.liveReadiness) === 'conditional'
      }
      if (filter === 'blocked') {
        return toEligibilityStatus(asset.liveReadiness) === 'blocked'
      }
      if (filter === 'view-only') {
        return toEligibilityStatus(asset.liveReadiness) === 'view_only'
      }
      if (filter === 'direct-contract') {
        return asset.executionStyle.toLowerCase().includes('direct')
      }
      if (filter === 'issuer-portal') {
        return asset.executionStyle.toLowerCase().includes('issuer')
      }

      return true
    })
  }, [bootstrapQuery.data?.assetLibrary, filter, search])

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t('assets.eyebrow')}
        title={t('assets.title')}
        description={t('assets.description')}
        primaryAction={
          <Button onClick={() => void navigate('/new-analysis')}>{t('actions.newAnalysis')}</Button>
        }
        secondaryActions={
          <Button
            variant="secondary"
            onClick={() => void navigate(walletAddress ? `/portfolio/${walletAddress}` : '/portfolio')}
          >
            <Wallet className="size-4" />
            {t('actions.openPortfolio')}
          </Button>
        }
      />

      <PageSection className="space-y-6">
        <FilterBar>
          <SearchField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search assets, symbols, or execution routes"
          />
          <Select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All assets</option>
            <option value="eligible">Eligible</option>
            <option value="conditional">Conditional</option>
            <option value="blocked">Blocked</option>
            <option value="view-only">View only</option>
            <option value="direct-contract">Direct contract</option>
            <option value="issuer-portal">Issuer portal</option>
          </Select>
        </FilterBar>

        {assets.length ? (
          <>
            <SectionCard
              title="Asset catalog"
              description="Review asset eligibility, execution routes, proof freshness, and blockers before treating anything as executable."
            >
              <div className="hidden overflow-hidden rounded-[22px] border border-border-subtle lg:block">
                <table className="w-full table-fixed border-collapse">
                  <thead className="bg-app-bg-elevated text-left text-xs uppercase tracking-[0.12em] text-text-muted">
                    <tr>
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3">Network</th>
                      <th className="px-4 py-3">Eligibility</th>
                      <th className="px-4 py-3">Execution route</th>
                      <th className="px-4 py-3">Proof freshness</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => {
                      const descriptor = getAssetEligibilityDescriptor({
                        status: toEligibilityStatus(asset.liveReadiness),
                      })
                      return (
                        <tr key={asset.id} className="border-t border-border-subtle bg-panel align-top">
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-text-primary">{asset.name}</p>
                            <p className="mt-1 text-sm text-text-secondary">{asset.symbol}</p>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">{asset.statusExplanation || asset.fitSummary}</p>
                          </td>
                          <td className="px-4 py-4 text-sm text-text-secondary">Chain {asset.chainId}</td>
                          <td className="px-4 py-4">
                            <StatusBadge
                              label={descriptor.label}
                              severity={descriptor.severity}
                              description={descriptor.reason}
                            />
                          </td>
                          <td className="px-4 py-4 text-sm text-text-secondary">{asset.executionStyle}</td>
                          <td className="px-4 py-4 text-sm text-text-secondary">{asset.liveReadiness}</td>
                          <td className="px-4 py-4">
                            <Button size="sm" onClick={() => void navigate(`/assets/${asset.id}/proof`)}>
                              <ArrowRight className="size-4" />
                              {t('actions.viewProof')}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {assets.map((asset) => {
                  const descriptor = getAssetEligibilityDescriptor({
                    status: toEligibilityStatus(asset.liveReadiness),
                  })
                  return (
                    <Card key={asset.id} className="space-y-3 rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{asset.name}</p>
                          <p className="mt-1 text-sm text-text-secondary">{asset.symbol}</p>
                        </div>
                        <StatusBadge
                          label={descriptor.label}
                          severity={descriptor.severity}
                          description={descriptor.reason}
                        />
                      </div>
                      <p className="text-sm leading-6 text-text-secondary">{asset.statusExplanation || asset.fitSummary}</p>
                      <div className="grid gap-2 text-sm text-text-secondary">
                        <p>Route: {asset.executionStyle}</p>
                        <p>Freshness: {asset.liveReadiness}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void navigate(`/assets/${asset.id}/proof`)}>
                          {t('actions.viewProof')}
                        </Button>
                        {asset.primarySourceUrl ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => window.open(asset.primarySourceUrl, '_blank', 'noopener,noreferrer')}
                          >
                            <ExternalLink className="size-4" />
                            {t('actions.openSource')}
                          </Button>
                        ) : null}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </SectionCard>

            <div className="grid gap-4 xl:grid-cols-3">
              <SectionCard
                title={t('assets.cards.proofScopeTitle')}
                description={t('assets.cards.proofScopeDescription')}
                density="compact"
              >
                <p className="text-sm leading-6 text-text-secondary">
                  Proof scope stays visible, but it no longer displaces the asset catalog.
                </p>
              </SectionCard>
              <SectionCard
                title={t('assets.cards.executionLayeringTitle')}
                description={t('assets.cards.executionLayeringDescription')}
                density="compact"
              >
                <p className="text-sm leading-6 text-text-secondary">
                  Direct contract, issuer portal, and view-only routes stay explicit per asset.
                </p>
              </SectionCard>
              <SectionCard
                title={t('assets.cards.productSpineTitle')}
                description={t('assets.cards.productSpineDescription')}
                density="compact"
              >
                <p className="text-sm leading-6 text-text-secondary">
                  Asset review remains connected to analysis, proof, execution, and monitoring.
                </p>
              </SectionCard>
            </div>
          </>
        ) : (
          <EmptyState
            title="No assets match the current filters"
            description="Adjust the search or filter to review the current catalog."
            primaryAction={<Button onClick={() => setFilter('all')}>Clear filters</Button>}
          />
        )}
      </PageSection>
    </PageContainer>
  )
}
