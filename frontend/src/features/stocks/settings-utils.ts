import type { StocksSettings } from '@/types'

export interface StocksSettingsDraft {
  whitelist: string
  defaultMode: 'paper' | 'live'
  notificationsEnabled: string
  singleCap: string
  grossCap: string
  dailyLoss: string
  maxPositions: string
  maxEntries: string
  tradingWindow: string
  extendedHours: string
  marketableLimit: string
}

export type StocksSettingsValidationErrors = Partial<
  Record<
    keyof StocksSettingsDraft,
    | 'invalid_range'
    | 'invalid_integer'
    | 'invalid_window'
    | 'empty_whitelist'
  >
>

function boolToString(value: boolean) {
  return value ? 'true' : 'false'
}

function percentToString(value: number) {
  return String(Math.round(value * 100))
}

export function buildStocksSettingsDraft(
  settings?: StocksSettings,
): StocksSettingsDraft {
  return {
    whitelist: settings?.whitelist.join(', ') ?? '',
    defaultMode: settings?.defaultMode ?? 'paper',
    notificationsEnabled: boolToString(settings?.notificationsEnabled ?? true),
    singleCap: percentToString(settings?.riskLimits.singlePositionCapPct ?? 0.1),
    grossCap: percentToString(settings?.riskLimits.grossExposureCapPct ?? 0.35),
    dailyLoss: percentToString(settings?.riskLimits.dailyLossStopPct ?? 0.03),
    maxPositions: String(settings?.riskLimits.maxOpenPositions ?? 4),
    maxEntries: String(settings?.riskLimits.maxNewEntriesPerSymbolPerDay ?? 1),
    tradingWindow: settings?.riskLimits.tradingWindowEt ?? '09:35-15:45',
    extendedHours: boolToString(settings?.riskLimits.allowExtendedHours ?? false),
    marketableLimit: boolToString(settings?.riskLimits.useMarketableLimitOrders ?? true),
  }
}

export function normalizeTickerList(raw: string) {
  const seen = new Set<string>()

  return raw
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0)
    .filter((item) => {
      if (seen.has(item)) {
        return false
      }
      seen.add(item)
      return true
    })
}

function parseNumber(value: string) {
  return Number(value.trim())
}

function isPercentWithin(value: string, max: number) {
  const numeric = parseNumber(value)
  return Number.isFinite(numeric) && numeric > 0 && numeric <= max
}

function isPositiveInteger(value: string, min: number, max?: number) {
  const numeric = Number(value.trim())
  return Number.isInteger(numeric) && numeric >= min && (max == null || numeric <= max)
}

export function isValidTradingWindow(value: string) {
  const match = value.trim().match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/)
  if (!match) {
    return false
  }

  const [, startHour, startMinute, endHour, endMinute] = match
  const start = Number(startHour) * 60 + Number(startMinute)
  const end = Number(endHour) * 60 + Number(endMinute)

  return start < end && start >= 0 && end <= 24 * 60
}

export function validateStocksSettingsDraft(
  draft: StocksSettingsDraft,
): StocksSettingsValidationErrors {
  const errors: StocksSettingsValidationErrors = {}

  if (!normalizeTickerList(draft.whitelist).length) {
    errors.whitelist = 'empty_whitelist'
  }
  if (!isPercentWithin(draft.singleCap, 10)) {
    errors.singleCap = 'invalid_range'
  }
  if (!isPercentWithin(draft.grossCap, 35)) {
    errors.grossCap = 'invalid_range'
  }
  if (!isPercentWithin(draft.dailyLoss, 3)) {
    errors.dailyLoss = 'invalid_range'
  }
  if (!isPositiveInteger(draft.maxPositions, 1, 4)) {
    errors.maxPositions = 'invalid_integer'
  }
  if (!isPositiveInteger(draft.maxEntries, 1)) {
    errors.maxEntries = 'invalid_integer'
  }
  if (!isValidTradingWindow(draft.tradingWindow)) {
    errors.tradingWindow = 'invalid_window'
  }

  return errors
}

export function toStocksSettingsPayload(
  draft: StocksSettingsDraft,
): StocksSettings {
  return {
    whitelist: normalizeTickerList(draft.whitelist),
    defaultMode: draft.defaultMode,
    notificationsEnabled: draft.notificationsEnabled === 'true',
    riskLimits: {
      singlePositionCapPct: parseNumber(draft.singleCap) / 100,
      grossExposureCapPct: parseNumber(draft.grossCap) / 100,
      dailyLossStopPct: parseNumber(draft.dailyLoss) / 100,
      maxOpenPositions: parseNumber(draft.maxPositions),
      maxNewEntriesPerSymbolPerDay: parseNumber(draft.maxEntries),
      tradingWindowEt: draft.tradingWindow.trim(),
      allowExtendedHours: draft.extendedHours === 'true',
      useMarketableLimitOrders: draft.marketableLimit === 'true',
    },
  }
}

export function stocksSettingsDraftEqual(
  left: StocksSettingsDraft,
  right: StocksSettingsDraft,
) {
  return JSON.stringify(toStocksSettingsPayload(left)) === JSON.stringify(toStocksSettingsPayload(right))
}

export function requiresLiveSettingsConfirmation(
  baseline: StocksSettingsDraft,
  draft: StocksSettingsDraft,
) {
  if (stocksSettingsDraftEqual(baseline, draft)) {
    return false
  }

  return baseline.defaultMode === 'live' || draft.defaultMode === 'live'
}
