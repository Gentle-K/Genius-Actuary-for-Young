export type TransactionFailureReason =
  | 'user_rejected'
  | 'wrong_network'
  | 'insufficient_gas'
  | 'contract_revert'
  | 'rpc_failure'
  | 'unknown'

export interface TransactionFailureInfo {
  reason: TransactionFailureReason
  message: string
  retryable: boolean
}

function errorCode(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) {
    return Number((error as { code?: number | string }).code)
  }
  return undefined
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  if (typeof error === 'string' && error.trim()) {
    return error
  }
  if (typeof error === 'object' && error && 'shortMessage' in error) {
    const shortMessage = String(
      (error as { shortMessage?: string }).shortMessage ?? '',
    ).trim()
    if (shortMessage) {
      return shortMessage
    }
  }
  return 'Unexpected transaction failure.'
}

export function classifyTransactionError(error: unknown): TransactionFailureInfo {
  const message = errorMessage(error)
  const normalized = message.toLowerCase()
  const code = errorCode(error)

  if (
    code === 4001 ||
    /user rejected|user denied|rejected the request|denied transaction signature/.test(
      normalized,
    )
  ) {
    return {
      reason: 'user_rejected',
      message,
      retryable: true,
    }
  }

  if (
    /wrong network|network mismatch|chain mismatch|unsupported chain|switch to hashkey/.test(
      normalized,
    )
  ) {
    return {
      reason: 'wrong_network',
      message,
      retryable: true,
    }
  }

  if (
    /insufficient funds|insufficient balance|gas required exceeds|intrinsic gas too low|base fee exceeds gas limit|insufficient gas/.test(
      normalized,
    )
  ) {
    return {
      reason: 'insufficient_gas',
      message,
      retryable: true,
    }
  }

  if (
    /execution reverted|contract function execution error|reverted|call exception/.test(
      normalized,
    )
  ) {
    return {
      reason: 'contract_revert',
      message,
      retryable: false,
    }
  }

  if (
    /rpc|json-rpc|http request failed|failed to fetch|network error|timeout|timed out|connection refused/.test(
      normalized,
    )
  ) {
    return {
      reason: 'rpc_failure',
      message,
      retryable: true,
    }
  }

  return {
    reason: 'unknown',
    message,
    retryable: true,
  }
}
