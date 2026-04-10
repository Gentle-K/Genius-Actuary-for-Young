import { clsx } from 'clsx'

import type { DataSourceTag } from '@/types'

const tagConfig: Record<
  DataSourceTag,
  { label: string; labelZh: string; color: string }
> = {
  onchain_verified: {
    label: 'On-chain Verified',
    labelZh: '链上验证',
    color: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  },
  oracle_fed: {
    label: 'Oracle-fed',
    labelZh: '预言机喂价',
    color: 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
  },
  issuer_disclosed: {
    label: 'Issuer Disclosed',
    labelZh: '发行方披露',
    color: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  },
  third_party_source: {
    label: 'Third-party Source',
    labelZh: '第三方来源',
    color: 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30',
  },
  model_inference: {
    label: 'Model Inference',
    labelZh: '模型推断',
    color: 'bg-violet-500/15 text-violet-400 ring-violet-500/30',
  },
  user_assumption: {
    label: 'User Assumption',
    labelZh: '用户假设',
    color: 'bg-gray-500/15 text-gray-400 ring-gray-500/30',
  },
}

interface DataSourceBadgeProps {
  tag: DataSourceTag
  locale?: 'zh' | 'en'
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

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        config.color,
        className,
      )}
    >
      {locale === 'zh' ? config.labelZh : config.label}
    </span>
  )
}
