import { clsx } from 'clsx'

import type { DataSourceTag } from '@/types'

const tagConfig: Record<
  DataSourceTag,
  { label: string; labelZh: string; color: string; icon: string }
> = {
  onchain_verified: {
    label: 'On-chain Verified',
    labelZh: '链上验证',
    color: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    icon: '🔗',
  },
  oracle_fed: {
    label: 'Oracle-fed',
    labelZh: '预言机喂价',
    color: 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
    icon: '📡',
  },
  issuer_disclosed: {
    label: 'Issuer Disclosed',
    labelZh: '发行方披露',
    color: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    icon: '📄',
  },
  model_inference: {
    label: 'Model Inference',
    labelZh: '模型推断',
    color: 'bg-violet-500/15 text-violet-400 ring-violet-500/30',
    icon: '🧠',
  },
  user_assumption: {
    label: 'User Assumption',
    labelZh: '用户假设',
    color: 'bg-gray-500/15 text-gray-400 ring-gray-500/30',
    icon: '👤',
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
  if (!config) return null

  const label = locale === 'zh' ? config.labelZh : config.label

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        config.color,
        className,
      )}
    >
      <span className="text-[10px]">{config.icon}</span>
      {label}
    </span>
  )
}
