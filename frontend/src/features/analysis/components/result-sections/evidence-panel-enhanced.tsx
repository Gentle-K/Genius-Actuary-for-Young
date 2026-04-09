import { ExternalLink, FileText } from 'lucide-react'

import type { EvidenceItem } from '@/types'
import { DataSourceBadge } from './data-source-badge'

interface EvidencePanelEnhancedProps {
  evidence: EvidenceItem[]
  locale?: 'zh' | 'en'
}

export function EvidencePanelEnhanced({
  evidence,
  locale = 'en',
}: EvidencePanelEnhancedProps) {
  const isZh = locale === 'zh'

  if (!evidence.length) return null

  return (
    <div id="evidence-panel-enhanced" className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-white/50" />
        <h3 className="text-sm font-semibold text-white/90">
          {isZh ? '证据面板' : 'Evidence Panel'}
        </h3>
        <span className="text-xs text-white/40">
          {evidence.length} {isZh ? '条' : 'items'}
        </span>
      </div>

      <div className="space-y-2">
        {evidence.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-white/10 bg-white/5 p-3"
          >
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium text-white/80">
                {item.title}
              </h4>
              <div className="flex shrink-0 items-center gap-2">
                {item.sourceTag && (
                  <DataSourceBadge tag={item.sourceTag} locale={locale} />
                )}
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/30 transition hover:text-white/60"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            <p className="text-xs text-white/50 leading-relaxed">
              {item.summary}
            </p>

            {item.extractedFacts.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {item.extractedFacts.map((fact, i) => (
                  <li key={i} className="text-xs text-white/40">
                    • {fact}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-2 flex items-center gap-3 text-[10px] text-white/30">
              <span>{item.sourceName}</span>
              <span>
                {isZh ? '置信度' : 'Confidence'}:{' '}
                {(item.confidence * 100).toFixed(0)}%
              </span>
              {item.fetchedAt && (
                <span>{new Date(item.fetchedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
