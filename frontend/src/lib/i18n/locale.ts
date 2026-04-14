import type { LanguageCode } from '@/types'

export const SUPPORTED_LOCALES = ['en', 'zh-CN', 'zh-HK'] as const satisfies readonly LanguageCode[]
export const DEFAULT_LOCALE: LanguageCode = 'en'
const HONG_KONG_TERM_REPLACEMENTS: Array<[string, string]> = [
  ['支持', '支援'],
  ['默认', '預設'],
  ['字符串', '字串'],
  ['数据', '資料'],
  ['资金', '資金'],
  ['风险', '風險'],
  ['图表', '圖表'],
  ['设置', '設定'],
  ['资产', '資產'],
  ['组合', '組合'],
  ['监控', '監控'],
  ['钱包', '錢包'],
  ['浏览器', '瀏覽器'],
  ['连接', '連結'],
  ['链接', '連結'],
  ['证据', '證據'],
  ['报告', '報告'],
  ['执行', '執行'],
  ['结论', '結論'],
  ['推荐', '建議'],
  ['建议', '建議'],
  ['结算', '結算'],
  ['条款', '條款'],
  ['细分', '細分'],
  ['链上', '鏈上'],
  ['链下', '鏈下'],
  ['读取', '讀取'],
  ['历史', '歷史'],
  ['说明', '說明'],
  ['选项', '選項'],
  ['状态', '狀態'],
  ['验证', '驗證'],
  ['问题', '問題'],
  ['计划', '計劃'],
  ['补充', '補充'],
  ['净值', '淨值'],
  ['发行人', '發行人'],
  ['预言机', '預言機'],
  ['综合', '綜合'],
  ['比较', '比較'],
  ['口径', '口徑'],
  ['调整', '調整'],
  ['适合', '適合'],
  ['周转', '週轉'],
]

export function normalizeLanguageCode(value: string | null | undefined): LanguageCode {
  const normalized = (value ?? '').trim().toLowerCase()

  if (normalized === 'zh-hk' || normalized === 'zh-tw' || normalized === 'zh-mo') {
    return 'zh-HK'
  }

  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-sg') {
    return 'zh-CN'
  }

  return 'en'
}

export function isChineseLocale(value: string | null | undefined): boolean {
  return normalizeLanguageCode(value) !== 'en'
}

export function toIntlLocale(value: string | null | undefined): string {
  return normalizeLanguageCode(value)
}

export function localeUsesCjkTypography(value: string | null | undefined): boolean {
  return isChineseLocale(value)
}

export function toHongKongChinese(value: string): string {
  if (!value) {
    return value
  }

  return HONG_KONG_TERM_REPLACEMENTS.reduce(
    (current, [source, target]) => current.replaceAll(source, target),
    value,
  )
}
