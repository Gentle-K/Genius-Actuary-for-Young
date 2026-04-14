import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import {
  DetailDrawer,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  SearchInput,
  SourceCard,
} from '@/components/product/decision-ui'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { fetchAnalysisCatalog, flattenEvidence } from '@/features/analysis/lib/catalog'
import { evidenceDomain, evidenceFreshnessMeta, sessionDisplayTitle } from '@/features/analysis/lib/view-models'
import { useAppStore } from '@/lib/store/app-store'
import { formatDateTime } from '@/lib/utils/format'

export function EvidencePage() {
  const { t } = useTranslation()
  const adapter = useApiAdapter()
  const locale = useAppStore((state) => state.locale)
  const [search, setSearch] = useState('')
  const [sessionFilter, setSessionFilter] = useState('all')
  const [freshness, setFreshness] = useState('all')
  const [confidence, setConfidence] = useState('all')
  const [domain, setDomain] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const catalogQuery = useQuery({
    queryKey: ['analysis', 'catalog', 'evidence', locale],
    queryFn: () => fetchAnalysisCatalog(adapter),
  })

  const evidenceItems = useMemo(() => {
    const all = flattenEvidence(catalogQuery.data ?? { sessions: [], reportsBySession: {} })
    return all.filter(({ item, session }) => {
      const matchesSearch =
        !search ||
        `${item.title} ${item.summary} ${item.sourceName}`
          .toLowerCase()
          .includes(search.toLowerCase())
      const matchesSession = sessionFilter === 'all' || session.id === sessionFilter
      const freshnessMeta = evidenceFreshnessMeta(item)
      const matchesFreshness =
        freshness === 'all' ||
        (freshness === 'fresh' && freshnessMeta.tone === 'success') ||
        (freshness === 'aging' && freshnessMeta.tone === 'warning') ||
        (freshness === 'stale' && freshnessMeta.tone === 'danger')
      const matchesConfidence =
        confidence === 'all' ||
        (confidence === 'high' && item.confidence >= 0.82) ||
        (confidence === 'medium' && item.confidence >= 0.66 && item.confidence < 0.82) ||
        (confidence === 'low' && item.confidence < 0.66)
      const matchesDomain = domain === 'all' || evidenceDomain(item.sourceUrl) === domain

      return (
        matchesSearch &&
        matchesSession &&
        matchesFreshness &&
        matchesConfidence &&
        matchesDomain
      )
    })
  }, [catalogQuery.data, confidence, domain, freshness, search, sessionFilter])

  const selectedEvidence = evidenceItems.find(({ item }) => item.id === selectedId)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('analysis.evidencePage.eyebrow')}
        title={t('analysis.evidencePage.title')}
        description={t('analysis.evidencePage.description')}
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('analysis.evidencePage.searchPlaceholder')}
        />
        <Select
          value={sessionFilter}
          onChange={(event) => setSessionFilter(event.target.value)}
        >
          <option value="all">{t('analysis.evidencePage.allSessions')}</option>
          {(catalogQuery.data?.sessions ?? []).map((session) => (
            <option key={session.id} value={session.id}>
              {sessionDisplayTitle(session, catalogQuery.data?.reportsBySession[session.id])}
            </option>
          ))}
        </Select>
        <Select value={freshness} onChange={(event) => setFreshness(event.target.value)}>
          <option value="all">{t('analysis.evidencePage.allFreshness')}</option>
          <option value="fresh">{t('analysis.evidencePage.freshness.fresh')}</option>
          <option value="aging">{t('analysis.evidencePage.freshness.aging')}</option>
          <option value="stale">{t('analysis.evidencePage.freshness.stale')}</option>
        </Select>
        <Select value={confidence} onChange={(event) => setConfidence(event.target.value)}>
          <option value="all">{t('analysis.evidencePage.allConfidence')}</option>
          <option value="high">{t('analysis.evidencePage.confidence.high')}</option>
          <option value="medium">{t('analysis.evidencePage.confidence.medium')}</option>
          <option value="low">{t('analysis.evidencePage.confidence.low')}</option>
        </Select>
        <Select value={domain} onChange={(event) => setDomain(event.target.value)}>
          <option value="all">{t('analysis.evidencePage.allDomains')}</option>
          {Array.from(
            new Set(
              flattenEvidence(catalogQuery.data ?? { sessions: [], reportsBySession: {} }).map(
                ({ item }) => evidenceDomain(item.sourceUrl),
              ),
            ),
          ).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </FilterBar>

      {catalogQuery.isLoading ? (
        <LoadingState
          title={t('analysis.evidencePage.loadingTitle')}
          description={t('analysis.evidencePage.loadingDescription')}
        />
      ) : catalogQuery.isError ? (
        <ErrorState
          title={t('analysis.evidencePage.errorTitle')}
          description={(catalogQuery.error as Error).message}
          action={
            <Button variant="secondary" onClick={() => void catalogQuery.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : evidenceItems.length ? (
        <div className="space-y-4">
          {evidenceItems.map(({ item, session }) => {
            const linkedConclusionCount = session.conclusions.filter((conclusion) =>
              conclusion.basisRefs.includes(item.id),
            ).length

            return (
              <SourceCard
                key={item.id}
                item={item}
                linkedConclusionCount={linkedConclusionCount}
                sessionTitle={sessionDisplayTitle(session, catalogQuery.data?.reportsBySession[session.id])}
                onOpen={() => setSelectedId(item.id)}
              />
            )
          })}
        </div>
      ) : (
        <EmptyState
          title={
            search
              ? t('analysis.evidencePage.noMatchingTitle')
              : t('analysis.evidencePage.emptyTitle')
          }
          description={
            search
              ? t('analysis.evidencePage.noMatchingDescription')
              : t('analysis.evidencePage.emptyDescription')
          }
        />
      )}

      <DetailDrawer
        open={Boolean(selectedEvidence)}
        onClose={() => setSelectedId(null)}
        title={selectedEvidence?.item.title ?? t('analysis.evidencePage.detailTitle')}
        description={selectedEvidence?.item.summary}
        actions={
          selectedEvidence ? (
            <a
              href={selectedEvidence.item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-accent-cyan"
            >
              {t('analysis.evidencePage.openSource')}
              <ExternalLink className="size-4" />
            </a>
          ) : undefined
        }
      >
        {selectedEvidence ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                {t('analysis.evidencePage.extractedFacts')}
              </p>
              <ul className="space-y-2 text-sm leading-6 text-text-secondary">
                {selectedEvidence.item.extractedFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-3 rounded-[20px] border border-border-subtle bg-bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                {t('analysis.evidencePage.usageAndFreshness')}
              </p>
              <div className="space-y-2 text-sm leading-6 text-text-secondary">
                <p>
                  {t('analysis.evidencePage.session')}:{' '}
                  {sessionDisplayTitle(selectedEvidence.session, selectedEvidence.report)}
                </p>
                <p>
                  {t('analysis.evidencePage.linkedConclusions')}:{' '}
                  {
                    selectedEvidence.session.conclusions.filter((conclusion) =>
                      conclusion.basisRefs.includes(selectedEvidence.item.id),
                    ).length
                  }
                </p>
                <p>
                  {t('analysis.evidencePage.includedInFinalReport')}:{' '}
                  {selectedEvidence.report?.evidence.some(
                    (evidence) => evidence.id === selectedEvidence.item.id,
                  )
                    ? t('analysis.evidencePage.yes')
                    : t('analysis.evidencePage.no')}
                </p>
                <p>
                  {t('analysis.evidencePage.fetchTime')}:{' '}
                  {formatDateTime(selectedEvidence.item.fetchedAt, locale)}
                </p>
                <p>
                  {t('analysis.evidencePage.freshnessWarning')}:{' '}
                  {selectedEvidence.item.freshness?.staleWarning ??
                    t('analysis.evidencePage.noExplicitWarning')}
                </p>
              </div>
            </div>
            <div className="space-y-3 rounded-[20px] border border-border-subtle bg-bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                {t('analysis.evidencePage.proofOnchainContext')}
              </p>
              <div className="space-y-2 text-sm leading-6 text-text-secondary">
                <p>
                  {t('analysis.evidencePage.proofType')}:{' '}
                  {selectedEvidence.item.proofType ?? t('analysis.evidencePage.notClassified')}
                </p>
                <p>
                  {t('analysis.evidencePage.oracleProvider')}:{' '}
                  {selectedEvidence.item.oracleProvider ?? t('common.notAvailable')}
                </p>
                <p>
                  {t('analysis.evidencePage.chain')}:{' '}
                  {selectedEvidence.item.chainId ?? t('common.notAvailable')}
                </p>
                <p>
                  {t('analysis.evidencePage.contract')}:{' '}
                  {selectedEvidence.item.contractAddress ?? t('common.notAvailable')}
                </p>
                <p>
                  {t('analysis.evidencePage.lastVerified')}:{' '}
                  {selectedEvidence.item.lastVerifiedAt
                    ? formatDateTime(selectedEvidence.item.lastVerifiedAt, locale)
                    : t('common.notAvailable')}
                </p>
                <p>
                  {t('analysis.evidencePage.includedInExecutionPlan')}:{' '}
                  {selectedEvidence.item.includedInExecutionPlan
                    ? t('analysis.evidencePage.yes')
                    : t('analysis.evidencePage.no')}
                </p>
              </div>
            </div>
            <div className="space-y-3 rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                {t('analysis.evidencePage.linkedReportExecution')}
              </p>
              <div className="space-y-3 text-sm text-text-secondary">
                <p>
                  {t('analysis.evidencePage.reportSections')}:{' '}
                  {selectedEvidence.item.reportSectionKeys?.length
                    ? selectedEvidence.item.reportSectionKeys.join(' · ')
                    : t('analysis.evidencePage.notLinked')}
                </p>
                <p>
                  {t('analysis.evidencePage.executionSteps')}:{' '}
                  {selectedEvidence.item.executionStepIds?.length
                    ? selectedEvidence.item.executionStepIds.join(' · ')
                    : t('analysis.evidencePage.notLinked')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/reports/${selectedEvidence.session.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm text-text-primary transition hover:border-border-strong hover:bg-panel-strong"
                  >
                    {t('analysis.evidencePage.openReport')}
                  </a>
                  <a
                    href={`/sessions/${selectedEvidence.session.id}/execute`}
                    className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm text-text-primary transition hover:border-border-strong hover:bg-panel-strong"
                  >
                    {t('analysis.evidencePage.openExecutePage')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setSelectedId(null)}>
            {t('analysis.evidencePage.close')}
          </Button>
        </div>
      </DetailDrawer>
    </div>
  )
}
