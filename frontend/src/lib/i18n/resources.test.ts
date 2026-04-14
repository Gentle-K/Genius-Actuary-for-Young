import { describe, expect, it } from 'vitest'

import {
  enProductCopy,
  zhCnProductCopy,
  zhHkProductCopy,
} from '@/lib/i18n/product-copy'

type TranslationTree = Record<string, unknown>
function collectLeafKeys(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string' || Array.isArray(value) || value === null) {
    return prefix ? [prefix] : []
  }

  if (!value || typeof value !== 'object') {
    return prefix ? [prefix] : []
  }

  return Object.entries(value as TranslationTree).flatMap(([key, nested]) =>
    collectLeafKeys(nested, prefix ? `${prefix}.${key}` : key),
  )
}

function getLeafValue(tree: TranslationTree, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') {
      return undefined
    }
    return (current as TranslationTree)[key]
  }, tree)
}

const allowedEnglishTokens = [
  'Genius Actuary',
  'HashKey',
  'Chain',
  'RWA',
  'USDC',
  'USD',
  'HKD',
  'USDT',
  'KYC',
  'SBT',
  'MMF',
  'ERC20',
  'Safe',
  'T+0',
  'T+3',
  'T+N',
  'API',
  'AI',
  'PDF',
  'CSV',
  'MIME',
]

function stripAllowedTokens(value: string) {
  const withoutInterpolations = value
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, '')
  return allowedEnglishTokens.reduce(
    (current, token) => current.replaceAll(token, ''),
    withoutInterpolations,
  )
}

describe('i18n resources', () => {
  it('keeps en, zh-CN, and zh-HK in key parity', () => {
    const reference = collectLeafKeys(enProductCopy as TranslationTree).sort()
    expect(collectLeafKeys(zhCnProductCopy as TranslationTree).sort()).toEqual(reference)
    expect(collectLeafKeys(zhHkProductCopy as TranslationTree).sort()).toEqual(reference)
  })

  it('keeps Chinese locale dictionaries free of long accidental English UI copy', () => {
    const localeTrees = {
      'zh-CN': zhCnProductCopy as TranslationTree,
      'zh-HK': zhHkProductCopy as TranslationTree,
    } as const

    const referenceKeys = collectLeafKeys(enProductCopy as TranslationTree)

    for (const locale of Object.keys(localeTrees) as Array<keyof typeof localeTrees>) {
      for (const key of referenceKeys) {
        const value = getLeafValue(localeTrees[locale], key)
        if (typeof value !== 'string') {
          continue
        }

        const normalized = stripAllowedTokens(value)
        const longEnglishFragments = normalized.match(/[A-Za-z][A-Za-z\s/-]{5,}/g) ?? []
        expect(longEnglishFragments, `${locale}:${key}`).toEqual([])
      }
    }
  })
})
