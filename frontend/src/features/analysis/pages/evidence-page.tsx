import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  SearchInput,
  SectionCard,
  SourceCard,
} from '@/components/product/decision-ui'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { fetchAnalysisCatalog, flattenEvidence } from '@/features/analysis/lib/catalog'
import { evidenceDomain, evidenceFreshnessMeta } from '@/features/analysis/lib/view-models'

export function EvidencePage() {
  const adapter = useApiAdapter()
  const [search, setSearch] = useState('')
  const [sessionFilter, setSessionFilter] = useState('all')
  const [freshness, setFreshness] = useState('all')
  const [confidence, setConfidence] = useState('all')
  const [domain, setDomain] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const catalogQuery = useQuery({
    queryKey: ['analysis', 'catalog', 'evidence'],
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
        eyebrow="Evidence"
        title="Evidence library"
        description="Inspect the source summaries supporting current analyses, including freshness, extracted facts, and where each source is used."
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search evidence"
        />
        <Select
          value={sessionFilter}
          onChange={(event) => setSessionFilter(event.target.value)}
        >
          <option value="all">All sessions</option>
          {(catalogQuery.data?.sessions ?? []).map((session) => (
            <option key={session.id} value={session.id}>
              {session.problemStatement}
            </option>
          ))}
        </Select>
        <Select value={freshness} onChange={(event) => setFreshness(event.target.value)}>
          <option value="all">All freshness</option>
          <option value="fresh">Fresh</option>
          <option value="aging">Aging</option>
          <option value="stale">Potentially stale</option>
        </Select>
        <Select value={confidence} onChange={(event) => setConfidence(event.target.value)}>
          <option value="all">All confidence</option>
          <option value="high">High confidence</option>
          <option value="medium">Medium confidence</option>
          <option value="low">Low confidence</option>
        </Select>
        <Select value={domain} onChange={(event) => setDomain(event.target.value)}>
          <option value="all">All domains</option>
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
          title="Loading evidence library"
          description="Preparing source summaries, freshness labels, and linked session metadata."
        />
      ) : catalogQuery.isError ? (
        <ErrorState
          title="Could not load evidence library"
          description={(catalogQuery.error as Error).message}
          action={
            <Button variant="secondary" onClick={() => void catalogQuery.refetch()}>
              Retry
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
                sessionTitle={session.problemStatement}
                onOpen={() => setSelectedId(item.id)}
              />
            )
          })}
        </div>
      ) : (
        <EmptyState
          title={search ? 'No matching evidence' : 'No evidence available'}
          description={
            search
              ? 'Try a different search term or relax one of the evidence filters.'
              : 'Evidence will appear here after sessions start collecting source summaries.'
          }
        />
      )}

      <Dialog open={Boolean(selectedEvidence)} onClose={() => setSelectedId(null)} className="relative z-50">
        <DialogBackdrop className="fixed inset-0 bg-[rgba(18,27,21,0.26)]" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel className="panel-card w-full max-w-3xl space-y-5 p-6">
              {selectedEvidence ? (
                <>
                  <SectionCard
                    title={selectedEvidence.item.title}
                    description={selectedEvidence.item.summary}
                    actions={
                      <a
                        href={selectedEvidence.item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-gold-primary"
                      >
                        Open source
                        <ExternalLink className="size-4" />
                      </a>
                    }
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[20px] bg-app-bg-elevated p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                          Extracted facts
                        </p>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
                          {selectedEvidence.item.extractedFacts.map((fact) => (
                            <li key={fact}>{fact}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-[20px] bg-app-bg-elevated p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                          Linked report usage
                        </p>
                        <div className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
                          <p>Session: {selectedEvidence.session.problemStatement}</p>
                          <p>
                            Linked conclusions:{' '}
                            {
                              selectedEvidence.session.conclusions.filter((conclusion) =>
                                conclusion.basisRefs.includes(selectedEvidence.item.id),
                              ).length
                            }
                          </p>
                          <p>
                            Included in final report:{' '}
                            {selectedEvidence.report?.evidence.some(
                              (evidence) => evidence.id === selectedEvidence.item.id,
                            )
                              ? 'Yes'
                              : 'No'}
                          </p>
                          <p>
                            Freshness warning:{' '}
                            {selectedEvidence.item.freshness?.staleWarning ?? 'No explicit warning'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                  <div className="flex justify-end">
                    <Button variant="secondary" onClick={() => setSelectedId(null)}>
                      Close
                    </Button>
                  </div>
                </>
              ) : null}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
