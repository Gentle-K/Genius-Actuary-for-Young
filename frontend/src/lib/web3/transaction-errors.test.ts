import { describe, expect, it } from 'vitest'

import { classifyTransactionError, errorMessage } from '@/lib/web3/transaction-errors'

describe('transaction error classification', () => {
  it('detects user rejection errors', () => {
    const result = classifyTransactionError({
      code: 4001,
      shortMessage: 'User rejected the request.',
    })

    expect(result.reason).toBe('user_rejected')
    expect(result.retryable).toBe(true)
  })

  it('detects wrong network errors', () => {
    const result = classifyTransactionError(new Error('Wrong network: switch to HashKey testnet'))

    expect(result.reason).toBe('wrong_network')
    expect(result.retryable).toBe(true)
  })

  it('detects contract revert errors', () => {
    const result = classifyTransactionError(new Error('Execution reverted: KYC required'))

    expect(result.reason).toBe('contract_revert')
    expect(result.retryable).toBe(false)
  })

  it('falls back to a stable message for unknown errors', () => {
    expect(errorMessage({})).toBe('Unexpected transaction failure.')
  })
})
