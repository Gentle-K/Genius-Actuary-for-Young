import { clsx } from 'clsx'

import { i18n } from '@/lib/i18n'
import { normalizeLanguageCode } from '@/lib/i18n/locale'
import type { DataSourceTag, LanguageCode } from '@/types'

const tagConfig: Record<
  DataSourceTag,
  { key: string; color: string }
> = {
  onchain_verified: {
    key: 'onChainVerified',
    color: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  },
  oracle_fed: {
    key: 'oracleFed',
    color: 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
  },
  issuer_disclosed: {
    key: 'issuerDisclosed',
    color: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  },
  third_party_source: {
    key: 'thirdPartySource',
    color: 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30',
  },
  model_inference: {
    key: 'modelInference',
    color: 'bg-violet-500/15 text-violet-400 ring-violet-500/30',
  },
  user_assumption: {
    key: 'userAssumption',
    color: 'bg-gray-500/15 text-gray-400 ring-gray-500/30',
  },
}

interface DataSourceBadgeProps {
  tag: DataSourceTag
  locale?: LanguageCode
  className?: string
}

export function DataSourceBadge({
  tag,
  locale = 'en',
  className,
}: DataSourceBadgeProps) {
  const config = tagConfig[tag]
  if (!config) {
    return null
  }
  const t = i18n.getFixedT(normalizeLanguageCode(locale))

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        config.color,
        className,
      )}
    >
      {t(`analysis.dataSourceBadge.${config.key}`)}
    </span>
  )
}
