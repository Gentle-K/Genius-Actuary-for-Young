import type { LanguageCode } from '@/types'
import { toIntlLocale } from '@/lib/i18n/locale'

export function formatDateTime(value: string, language: LanguageCode = 'en') {
  return new Intl.DateTimeFormat(toIntlLocale(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatDate(value: string, language: LanguageCode = 'en') {
  return new Intl.DateTimeFormat(toIntlLocale(language), {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function formatNumber(value: number, language: LanguageCode = 'en') {
  return new Intl.NumberFormat(toIntlLocale(language), {
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number, language: LanguageCode = 'en') {
  return new Intl.NumberFormat(toIntlLocale(language), {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatCurrency(
  value: number,
  currency = 'USD',
  language: LanguageCode = 'en',
) {
  return formatMoney(value, currency, language, { maximumFractionDigits: 0 })
}

const tokenCodeSet = new Set(['USDT', 'USDC', 'BTC', 'HSK', 'ETH'])

function isIsoCurrencyCode(currency: string) {
  return /^[A-Z]{3}$/.test(currency) && !tokenCodeSet.has(currency)
}

export function formatMoney(
  value: number | undefined,
  currency = 'USD',
  language: LanguageCode = 'en',
  options: Intl.NumberFormatOptions = {},
) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--'
  }

  const locale = toIntlLocale(language)
  if (isIsoCurrencyCode(currency.toUpperCase())) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
      ...options,
    }).format(value)
  }

  const digits =
    typeof options.maximumFractionDigits === 'number'
      ? options.maximumFractionDigits
      : currency.toUpperCase() === 'BTC'
        ? 6
        : 2

  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value)} ${currency.toUpperCase()}`
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 ** 2) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  if (bytes < 1024 ** 3) {
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  }

  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}
