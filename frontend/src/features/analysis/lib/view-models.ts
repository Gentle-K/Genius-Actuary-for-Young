import type {
  AnalysisMode,
  AnalysisReport,
  AnalysisSession,
  CalculationTask,
  EvidenceItem,
  LanguageCode,
  SessionStatus,
} from '@/types'
import { normalizeLanguageCode, toHongKongChinese, toIntlLocale } from '@/lib/i18n/locale'
import { useAppStore } from '@/lib/store/app-store'

function currentLocale(locale?: LanguageCode) {
  return normalizeLanguageCode(locale ?? useAppStore.getState().locale)
}

function localizedCopy(
  locale: LanguageCode | undefined,
  {
    en,
    zhCn,
    zhHk,
  }: {
    en: string
    zhCn: string
    zhHk?: string
  },
) {
  const resolved = currentLocale(locale)
  if (resolved === 'zh-HK') {
    return zhHk ?? toHongKongChinese(zhCn)
  }
  if (resolved === 'zh-CN') {
    return zhCn
  }
  return en
}

export function formatRelativeTime(value: string, locale?: LanguageCode) {
  const resolvedLocale = currentLocale(locale)
  const target = new Date(value).getTime()
  const diffSeconds = Math.round((target - Date.now()) / 1000)
  const absoluteSeconds = Math.abs(diffSeconds)
  const formatter = new Intl.RelativeTimeFormat(toIntlLocale(resolvedLocale), {
    numeric: 'auto',
  })

  if (absoluteSeconds < 60) {
    return formatter.format(diffSeconds, 'second')
  }

  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) {
    return formatter.format(diffDays, 'day')
  }

  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return formatter.format(diffMonths, 'month')
  }

  return formatter.format(Math.round(diffMonths / 12), 'year')
}

export function modeLabel(mode: AnalysisMode, locale?: LanguageCode) {
  return mode === 'strategy-compare' || mode === 'multi-option'
    ? localizedCopy(locale, {
        en: 'Strategy compare',
        zhCn: '策略对比',
        zhHk: '策略對比',
      })
    : localizedCopy(locale, {
        en: 'Single-asset allocation',
        zhCn: '单资产配置',
        zhHk: '單資產配置',
      })
}

export function modeSummary(mode: AnalysisMode, locale?: LanguageCode) {
  return mode === 'strategy-compare' || mode === 'multi-option'
    ? localizedCopy(locale, {
        en: 'Compare eligible RWA paths, execution friction, and monitoring trade-offs.',
        zhCn: '并行比较可投资 RWA 路径、执行摩擦和监控权衡。',
        zhHk: '並行比較可投資 RWA 路徑、執行摩擦與監控取捨。',
      })
    : localizedCopy(locale, {
        en: 'Go deep on one target asset from wallet eligibility through execution.',
        zhCn: '围绕一个目标资产，从钱包准入一路深入到执行准备。',
        zhHk: '圍繞一個目標資產，從錢包準入一路深入到執行準備。',
      })
}

export function sessionDisplayTitle(
  session: Pick<AnalysisSession, 'problemStatement'>,
  report?: Pick<AnalysisReport, 'summaryTitle'> | null,
) {
  return report?.summaryTitle?.trim() || session.problemStatement
}

export function statusMeta(status: SessionStatus | string, locale?: LanguageCode) {
  const mapping: Record<
    string,
    { label: string; tone: 'neutral' | 'gold' | 'success' | 'warning' | 'danger' | 'info' }
  > = {
    INIT: {
      label: localizedCopy(locale, { en: 'Draft', zhCn: '草稿', zhHk: '草稿' }),
      tone: 'neutral',
    },
    CLARIFYING: {
      label: localizedCopy(locale, { en: 'Clarifying', zhCn: '待补充信息', zhHk: '待補充資料' }),
      tone: 'info',
    },
    ANALYZING: {
      label: localizedCopy(locale, { en: 'Analyzing', zhCn: '分析中', zhHk: '分析中' }),
      tone: 'gold',
    },
    READY_FOR_REPORT: {
      label: localizedCopy(locale, { en: 'Ready for report', zhCn: '可生成报告', zhHk: '可生成報告' }),
      tone: 'info',
    },
    REPORTING: {
      label: localizedCopy(locale, { en: 'Drafting report', zhCn: '报告生成中', zhHk: '報告生成中' }),
      tone: 'gold',
    },
    READY_FOR_EXECUTION: {
      label: localizedCopy(locale, { en: 'Ready for execution', zhCn: '可执行', zhHk: '可執行' }),
      tone: 'success',
    },
    EXECUTING: {
      label: localizedCopy(locale, { en: 'Executing', zhCn: '执行中', zhHk: '執行中' }),
      tone: 'gold',
    },
    MONITORING: {
      label: localizedCopy(locale, { en: 'Monitoring', zhCn: '监控中', zhHk: '監控中' }),
      tone: 'info',
    },
    COMPLETED: {
      label: localizedCopy(locale, { en: 'Completed', zhCn: '已完成', zhHk: '已完成' }),
      tone: 'success',
    },
    FAILED: {
      label: localizedCopy(locale, { en: 'Failed', zhCn: '失败', zhHk: '失敗' }),
      tone: 'danger',
    },
  }

  return mapping[status] ?? { label: status, tone: 'neutral' }
}

export function averageConfidence(values: number[]) {
  if (!values.length) {
    return undefined
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function sessionConfidence(
  session: AnalysisSession,
  report?: AnalysisReport,
) {
  const conclusionAverage = averageConfidence(
    session.conclusions.map((item) => item.confidence),
  )
  const evidenceAverage = averageConfidence(
    (report?.evidence ?? session.evidence).map((item) => item.confidence),
  )

  if (typeof conclusionAverage === 'number' && typeof evidenceAverage === 'number') {
    return (conclusionAverage + evidenceAverage) / 2
  }

  return conclusionAverage ?? evidenceAverage
}

export function confidenceMeta(confidence?: number, locale?: LanguageCode) {
  if (typeof confidence !== 'number') {
    return {
      label: localizedCopy(locale, {
        en: 'Needs evidence',
        zhCn: '需要更多证据',
        zhHk: '需要更多證據',
      }),
      tone: 'neutral' as const,
    }
  }

  if (confidence >= 0.82) {
    return {
      label: localizedCopy(locale, { en: 'High confidence', zhCn: '高置信度', zhHk: '高置信度' }),
      tone: 'success' as const,
    }
  }

  if (confidence >= 0.66) {
    return {
      label: localizedCopy(locale, { en: 'Medium confidence', zhCn: '中等置信度', zhHk: '中等置信度' }),
      tone: 'gold' as const,
    }
  }

  return {
    label: localizedCopy(locale, { en: 'Low confidence', zhCn: '低置信度', zhHk: '低置信度' }),
    tone: 'warning' as const,
  }
}

export function evidenceFreshnessMeta(item: EvidenceItem, locale?: LanguageCode) {
  if (item.freshness) {
    const bucketTone =
      item.freshness.bucket === 'fresh'
        ? 'success'
        : item.freshness.bucket === 'aging'
          ? 'warning'
          : item.freshness.bucket === 'stale'
            ? 'danger'
            : 'neutral'

    return {
      label: item.freshness.label,
      tone: bucketTone as 'success' | 'warning' | 'danger' | 'neutral',
    }
  }

  const ageHours = Math.max(
    1,
    Math.round(
      (Date.now() - new Date(item.fetchedAt).getTime()) / (1000 * 60 * 60),
    ),
  )

  if (ageHours <= 48) {
    return {
      label: localizedCopy(locale, { en: 'Fresh source', zhCn: '新近来源', zhHk: '新近來源' }),
      tone: 'success' as const,
    }
  }

  if (ageHours <= 24 * 30) {
    return {
      label: localizedCopy(locale, { en: 'Aging source', zhCn: '来源偏旧', zhHk: '來源偏舊' }),
      tone: 'warning' as const,
    }
  }

  return {
    label: localizedCopy(locale, { en: 'Potentially stale', zhCn: '可能过期', zhHk: '可能過期' }),
    tone: 'danger' as const,
  }
}

export function evidenceDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'unknown'
  }
}

export function extractExecutiveSummary(markdown: string, locale?: LanguageCode) {
  const plain = markdown
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    plain.find((line) => !line.endsWith(':')) ??
    localizedCopy(locale, {
      en: 'Structured report generated.',
      zhCn: '结构化报告已生成。',
      zhHk: '結構化報告已生成。',
    })
  )
}

export function reportState(
  session: AnalysisSession,
  report?: AnalysisReport,
  locale?: LanguageCode,
) {
  if (session.status !== 'COMPLETED') {
    if (
      session.status === 'READY_FOR_EXECUTION' ||
      session.status === 'EXECUTING' ||
      session.status === 'MONITORING'
    ) {
      return {
        label: localizedCopy(locale, {
          en: 'Execution-ready',
          zhCn: '执行就绪',
          zhHk: '執行就緒',
        }),
        tone: 'success' as const,
      }
    }
    return {
      label: localizedCopy(locale, { en: 'Draft', zhCn: '草稿', zhHk: '草稿' }),
      tone: 'neutral' as const,
    }
  }

  const staleEvidence = (report?.evidence ?? []).some(
    (item) => evidenceFreshnessMeta(item, locale).tone === 'danger',
  )

  if ((report?.unknowns?.length ?? 0) > 2 || (report?.warnings?.length ?? 0) > 1) {
    return {
      label: localizedCopy(locale, { en: 'Needs review', zhCn: '需要复核', zhHk: '需要覆核' }),
      tone: 'warning' as const,
    }
  }

  if (staleEvidence) {
    return {
      label: localizedCopy(locale, {
        en: 'Updated with new evidence',
        zhCn: '已结合新证据更新',
        zhHk: '已結合新證據更新',
      }),
      tone: 'info' as const,
    }
  }

  return {
    label: localizedCopy(locale, { en: 'Completed', zhCn: '已完成', zhHk: '已完成' }),
    tone: 'success' as const,
  }
}

export function reportPath(sessionId: string) {
  return `/reports/${sessionId}`
}

export function sessionPath(sessionId: string) {
  return `/sessions/${sessionId}`
}

export function continuePath(session: AnalysisSession) {
  if (session.status === 'CLARIFYING') {
    return `/sessions/${session.id}/clarify`
  }

  if (
    session.status === 'READY_FOR_EXECUTION' ||
    session.status === 'EXECUTING' ||
    session.status === 'MONITORING' ||
    session.status === 'COMPLETED'
  ) {
    return reportPath(session.id)
  }

  return `/sessions/${session.id}/analyzing`
}

export function sessionKeyConclusion(session: AnalysisSession) {
  return session.conclusions[0]?.conclusion ?? session.lastInsight
}

export function currentUnderstanding(session: AnalysisSession, locale?: LanguageCode) {
  const resolvedLocale = currentLocale(locale)
  const items = [
    session.intakeContext.budgetRange
      ? localizedCopy(resolvedLocale, {
          en: `Budget range: ${session.intakeContext.budgetRange}`,
          zhCn: `预算范围：${session.intakeContext.budgetRange}`,
          zhHk: `預算範圍：${session.intakeContext.budgetRange}`,
        })
      : null,
    session.intakeContext.timeHorizonLabel
      ? localizedCopy(resolvedLocale, {
          en: `Time horizon: ${session.intakeContext.timeHorizonLabel}`,
          zhCn: `时间周期：${session.intakeContext.timeHorizonLabel}`,
          zhHk: `時間週期：${session.intakeContext.timeHorizonLabel}`,
        })
      : null,
    session.intakeContext.riskPreferenceLabel
      ? localizedCopy(resolvedLocale, {
          en: `Risk preference: ${session.intakeContext.riskPreferenceLabel}`,
          zhCn: `风险偏好：${session.intakeContext.riskPreferenceLabel}`,
          zhHk: `風險偏好：${session.intakeContext.riskPreferenceLabel}`,
        })
      : null,
    session.intakeContext.mustHaveGoals?.length
      ? localizedCopy(resolvedLocale, {
          en: `Must-have goals: ${session.intakeContext.mustHaveGoals.join(', ')}`,
          zhCn: `必须满足的目标：${session.intakeContext.mustHaveGoals.join('、')}`,
          zhHk: `必須滿足的目標：${session.intakeContext.mustHaveGoals.join('、')}`,
        })
      : null,
    session.intakeContext.mustAvoidOutcomes?.length
      ? localizedCopy(resolvedLocale, {
          en: `Must-avoid outcomes: ${session.intakeContext.mustAvoidOutcomes.join(', ')}`,
          zhCn: `必须规避的结果：${session.intakeContext.mustAvoidOutcomes.join('、')}`,
          zhHk: `必須避免的結果：${session.intakeContext.mustAvoidOutcomes.join('、')}`,
        })
      : null,
  ]

  return items.filter(Boolean) as string[]
}

export function calculationTitle(task: CalculationTask, locale?: LanguageCode) {
  const mapping: Record<string, { en: string; zhCn: string; zhHk: string }> = {
    'budget-band': { en: 'Budget range', zhCn: '预算区间', zhHk: '預算區間' },
    'safety-buffer': { en: 'Safety buffer', zhCn: '安全缓冲', zhHk: '安全緩衝' },
    'break-even': { en: 'Breakeven point', zhCn: '盈亏平衡点', zhHk: '損益平衡點' },
    'opportunity-cost': { en: 'Opportunity cost', zhCn: '机会成本', zhHk: '機會成本' },
  }

  const entry = mapping[task.taskType]
  if (!entry) {
    return task.taskType.replace(/-/g, ' ')
  }

  return localizedCopy(locale, {
    en: entry.en,
    zhCn: entry.zhCn,
    zhHk: entry.zhHk,
  })
}
