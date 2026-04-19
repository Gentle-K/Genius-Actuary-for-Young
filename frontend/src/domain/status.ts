import type { ApiMode, AutopilotState, ExecutionReadiness, SessionStatus, TradingMode } from '@/types'

export type AnalysisStatus =
  | 'draft'
  | 'clarifying'
  | 'evidence_collecting'
  | 'calculating'
  | 'report_ready'
  | 'execution_ready'
  | 'blocked'
  | 'executed'
  | 'monitoring'
  | 'archived'

export type AssetEligibilityStatus =
  | 'view_only'
  | 'conditional'
  | 'eligible'
  | 'blocked'
  | 'stale'
  | 'expired'

export type ExecutionStatus =
  | 'not_started'
  | 'package_ready'
  | 'preflight_failed'
  | 'awaiting_signature'
  | 'submitted'
  | 'confirmed'
  | 'settling'
  | 'settled'
  | 'failed'
  | 'cancelled'

export type TradingAutomationStatus =
  | 'paper_paused'
  | 'paper_armed'
  | 'paper_running'
  | 'live_blocked'
  | 'live_ready'
  | 'live_armed'
  | 'live_running'
  | 'kill_switch_active'

export type EnvironmentMode = 'demo' | 'paper' | 'live'
export type StatusSeverity = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

export interface StatusDescriptor {
  label: string
  severity: StatusSeverity
  reason?: string
  nextAction?: string
  lastUpdated?: string
  requiredChecks: string[]
  blockingChecks: string[]
}

export interface DisabledActionState {
  disabled: boolean
  reason?: string
}

export function resolveEnvironmentMode(
  pathname: string,
  apiMode: ApiMode,
  stocksMode?: string | null,
): EnvironmentMode {
  if (pathname.startsWith('/stocks')) {
    return stocksMode === 'live' ? 'live' : 'paper'
  }

  return apiMode === 'mock' ? 'demo' : 'live'
}

export function resolveDataTruthState(params: {
  apiMode: ApiMode
  pathname: string
  stocksMode?: TradingMode
  providerStatuses?: Array<{ status: 'connected' | 'simulated' | 'unavailable'; updatedAt?: string }>
  lastUpdated?: string
}): StatusDescriptor {
  const stale =
    params.lastUpdated &&
    Date.now() - new Date(params.lastUpdated).getTime() > 60 * 60 * 1000

  if (stale) {
    return {
      label: 'Stale',
      severity: 'warning',
      reason: 'The latest sync is older than one hour.',
      nextAction: 'Refresh the workspace before taking a live-sensitive action.',
      lastUpdated: params.lastUpdated,
      requiredChecks: ['Recent sync timestamp'],
      blockingChecks: [],
    }
  }

  if (params.apiMode === 'mock') {
    return {
      label: 'Mock',
      severity: 'info',
      reason: 'This screen is using demo data from the mock adapter.',
      nextAction: 'Use rest mode to inspect connected backend state.',
      lastUpdated: params.lastUpdated,
      requiredChecks: ['Mock adapter active'],
      blockingChecks: [],
    }
  }

  if (params.pathname.startsWith('/stocks') && params.stocksMode === 'paper') {
    return {
      label: 'Paper-only',
      severity: 'info',
      reason: 'Orders and performance are simulated in paper mode.',
      nextAction: 'Review promotion-gate blockers before arming live mode.',
      lastUpdated: params.lastUpdated,
      requiredChecks: ['Paper broker account'],
      blockingChecks: [],
    }
  }

  if (params.providerStatuses?.some((provider) => provider.status === 'simulated')) {
    return {
      label: 'Simulated',
      severity: 'info',
      reason: 'At least one provider is in simulated mode.',
      nextAction: 'Inspect provider readiness before relying on execution or market data.',
      lastUpdated: params.lastUpdated,
      requiredChecks: ['Provider readiness'],
      blockingChecks: [],
    }
  }

  return {
    label: 'Connected',
    severity: 'success',
    reason: 'This view is reading from connected backend data.',
    nextAction: 'Continue with the next safe action shown on the page.',
    lastUpdated: params.lastUpdated,
    requiredChecks: ['Backend connection'],
    blockingChecks: [],
  }
}

export function toAnalysisStatus(status: SessionStatus): AnalysisStatus {
  switch (status) {
    case 'INIT':
      return 'draft'
    case 'CLARIFYING':
      return 'clarifying'
    case 'ANALYZING':
      return 'evidence_collecting'
    case 'READY_FOR_REPORT':
    case 'REPORTING':
      return 'calculating'
    case 'READY_FOR_EXECUTION':
      return 'execution_ready'
    case 'EXECUTING':
      return 'executed'
    case 'MONITORING':
      return 'monitoring'
    case 'FAILED':
      return 'blocked'
    case 'COMPLETED':
      return 'report_ready'
    default:
      return 'archived'
  }
}

export function getAnalysisStatusDescriptor(status: AnalysisStatus, updatedAt?: string): StatusDescriptor {
  switch (status) {
    case 'draft':
      return {
        label: 'Draft',
        severity: 'info',
        reason: 'The intake has started but required inputs are still missing.',
        nextAction: 'Finish the identity and decision steps, then create the session.',
        lastUpdated: updatedAt,
        requiredChecks: ['Decision brief', 'Time horizon'],
        blockingChecks: [],
      }
    case 'clarifying':
      return {
        label: 'Clarifying',
        severity: 'warning',
        reason: 'The system is waiting for missing facts, preferences, or constraints.',
        nextAction: 'Answer the current question or mark it uncertain with context.',
        lastUpdated: updatedAt,
        requiredChecks: ['Clarification queue'],
        blockingChecks: [],
      }
    case 'evidence_collecting':
      return {
        label: 'Evidence Collecting',
        severity: 'info',
        reason: 'Evidence and constraints are still being assembled.',
        nextAction: 'Wait for the report-ready state or reopen clarification if new facts appear.',
        lastUpdated: updatedAt,
        requiredChecks: ['Evidence coverage'],
        blockingChecks: [],
      }
    case 'calculating':
      return {
        label: 'Calculating',
        severity: 'info',
        reason: 'The system is converting evidence into comparable outputs and report sections.',
        nextAction: 'Review calculations once the report is ready.',
        lastUpdated: updatedAt,
        requiredChecks: ['Calculation tasks'],
        blockingChecks: [],
      }
    case 'report_ready':
      return {
        label: 'Report Ready',
        severity: 'success',
        reason: 'The report can be reviewed without taking action yet.',
        nextAction: 'Open the report and inspect unresolved risks before preparing execution.',
        lastUpdated: updatedAt,
        requiredChecks: ['Report rendered'],
        blockingChecks: [],
      }
    case 'execution_ready':
      return {
        label: 'Execution Ready',
        severity: 'success',
        reason: 'The analysis has advanced to an execution-preparation state.',
        nextAction: 'Open the execution package and review every preflight check.',
        lastUpdated: updatedAt,
        requiredChecks: ['Execution package'],
        blockingChecks: [],
      }
    case 'executed':
      return {
        label: 'Submitted',
        severity: 'warning',
        reason: 'The execution flow has started and still requires monitoring.',
        nextAction: 'Track receipts and settlement updates before treating the action as final.',
        lastUpdated: updatedAt,
        requiredChecks: ['Receipt or issuer confirmation'],
        blockingChecks: [],
      }
    case 'monitoring':
      return {
        label: 'Monitoring',
        severity: 'success',
        reason: 'The session is in post-execution monitoring.',
        nextAction: 'Review portfolio or monitoring alerts for freshness and settlement changes.',
        lastUpdated: updatedAt,
        requiredChecks: ['Monitoring route'],
        blockingChecks: [],
      }
    case 'blocked':
      return {
        label: 'Blocked',
        severity: 'danger',
        reason: 'A required step or dependency has failed.',
        nextAction: 'Inspect blockers and retry only after the failure is understood.',
        lastUpdated: updatedAt,
        requiredChecks: [],
        blockingChecks: ['Execution or analysis failure'],
      }
    case 'archived':
      return {
        label: 'Archived',
        severity: 'neutral',
        reason: 'This item is no longer active.',
        nextAction: 'Start a new analysis if the decision context has changed.',
        lastUpdated: updatedAt,
        requiredChecks: [],
        blockingChecks: [],
      }
  }
}

export function getAssetEligibilityDescriptor(params: {
  status: AssetEligibilityStatus
  blockers?: string[]
  updatedAt?: string
}): StatusDescriptor {
  const blockers = params.blockers ?? []

  switch (params.status) {
    case 'eligible':
      return {
        label: 'Eligible',
        severity: 'success',
        reason: 'Required checks currently pass for this asset.',
        nextAction: 'Prepare the execution package and review route details.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Eligibility', 'Route availability'],
        blockingChecks: blockers,
      }
    case 'conditional':
      return {
        label: 'Conditional',
        severity: 'warning',
        reason: 'The asset is visible, but one or more actions must be completed first.',
        nextAction: 'Resolve the listed blockers before treating the asset as executable.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Conditional gate'],
        blockingChecks: blockers,
      }
    case 'view_only':
      return {
        label: 'View Only',
        severity: 'info',
        reason: 'This asset can be verified but not executed from this console.',
        nextAction: 'Use the proof and source trail for review rather than execution.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Proof visibility'],
        blockingChecks: blockers,
      }
    case 'stale':
      return {
        label: 'Stale',
        severity: 'warning',
        reason: 'Freshness checks are outside the valid window.',
        nextAction: 'Refresh the proof and oracle context before proceeding.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Freshness window'],
        blockingChecks: blockers,
      }
    case 'expired':
      return {
        label: 'Expired',
        severity: 'danger',
        reason: 'This asset state is no longer valid for execution preparation.',
        nextAction: 'Reload the asset state and confirm a new proof snapshot.',
        lastUpdated: params.updatedAt,
        requiredChecks: [],
        blockingChecks: blockers,
      }
    case 'blocked':
      return {
        label: 'Blocked',
        severity: 'danger',
        reason: 'Required checks currently fail for this asset.',
        nextAction: 'Resolve the listed blockers or switch to another route.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Eligibility gate'],
        blockingChecks: blockers,
      }
  }
}

export function toExecutionStatus(params: {
  readiness?: ExecutionReadiness
  lifecycle?: string
  hasReceipt?: boolean
  failed?: boolean
}): ExecutionStatus {
  if (params.failed) return 'failed'
  if (params.lifecycle === 'completed') return 'settled'
  if (params.lifecycle === 'pending_settlement') return 'settling'
  if (params.lifecycle === 'submitted' || params.hasReceipt) return 'submitted'
  if (params.lifecycle === 'redirect_required' || params.readiness === 'requires_issuer') {
    return 'awaiting_signature'
  }
  if (params.readiness === 'blocked') return 'preflight_failed'
  if (params.readiness === 'view_only') return 'not_started'
  if (params.readiness === 'ready' || params.lifecycle === 'prepared') return 'package_ready'
  return 'not_started'
}

export function getExecutionStatusDescriptor(params: {
  status: ExecutionStatus
  blockers?: string[]
  updatedAt?: string
}): StatusDescriptor {
  const blockers = params.blockers ?? []

  switch (params.status) {
    case 'package_ready':
      return {
        label: 'Package Ready',
        severity: 'success',
        reason: 'The package can be reviewed before any irreversible action.',
        nextAction: 'Run every preflight check and inspect the transaction preview.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Preflight checklist'],
        blockingChecks: blockers,
      }
    case 'preflight_failed':
      return {
        label: 'Preflight Failed',
        severity: 'danger',
        reason: 'One or more required checks are still failing.',
        nextAction: 'Resolve blockers before retrying the package.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Preflight checklist'],
        blockingChecks: blockers,
      }
    case 'awaiting_signature':
      return {
        label: 'Awaiting External Step',
        severity: 'warning',
        reason: 'A signature, issuer action, or redirected step is still required.',
        nextAction: 'Complete the external step, then record the result.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Signature or issuer step'],
        blockingChecks: blockers,
      }
    case 'submitted':
      return {
        label: 'Submitted',
        severity: 'warning',
        reason: 'The submission has been recorded but finality is not confirmed yet.',
        nextAction: 'Monitor the receipt timeline until confirmation or settlement.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Receipt'],
        blockingChecks: blockers,
      }
    case 'confirmed':
      return {
        label: 'Confirmed',
        severity: 'success',
        reason: 'The submission has chain or issuer confirmation.',
        nextAction: 'Keep monitoring until settlement is complete.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Confirmation'],
        blockingChecks: blockers,
      }
    case 'settling':
      return {
        label: 'Settling',
        severity: 'warning',
        reason: 'The action is confirmed but settlement is still in progress.',
        nextAction: 'Keep the monitoring surface open until settlement completes.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Settlement route'],
        blockingChecks: blockers,
      }
    case 'settled':
      return {
        label: 'Settled',
        severity: 'success',
        reason: 'Settlement is complete.',
        nextAction: 'Review receipts and move to portfolio monitoring.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Settlement complete'],
        blockingChecks: blockers,
      }
    case 'failed':
      return {
        label: 'Failed',
        severity: 'danger',
        reason: 'The package or submission failed.',
        nextAction: 'Review the failure before retrying or switching routes.',
        lastUpdated: params.updatedAt,
        requiredChecks: [],
        blockingChecks: blockers.length ? blockers : ['Execution failure'],
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        severity: 'neutral',
        reason: 'The package was cancelled before completion.',
        nextAction: 'Re-open the package only if the decision still stands.',
        lastUpdated: params.updatedAt,
        requiredChecks: [],
        blockingChecks: [],
      }
    case 'not_started':
    default:
      return {
        label: 'Not Started',
        severity: 'neutral',
        reason: 'No execution package has been prepared yet.',
        nextAction: 'Start from analysis or proof review before preparing execution.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Execution package'],
        blockingChecks: blockers,
      }
  }
}

export function toTradingAutomationStatus(params: {
  mode: TradingMode
  autopilotState?: AutopilotState
  killSwitchActive?: boolean
  eligibleForLiveArm?: boolean
}): TradingAutomationStatus {
  if (params.killSwitchActive || params.autopilotState === 'halted') {
    return 'kill_switch_active'
  }

  if (params.mode === 'paper') {
    if (params.autopilotState === 'running') return 'paper_running'
    if (params.autopilotState === 'armed') return 'paper_armed'
    return 'paper_paused'
  }

  if (!params.eligibleForLiveArm) {
    return 'live_blocked'
  }

  if (params.autopilotState === 'running') return 'live_running'
  if (params.autopilotState === 'armed') return 'live_armed'
  return 'live_ready'
}

export function getTradingAutomationStatusDescriptor(params: {
  status: TradingAutomationStatus
  blockers?: string[]
  updatedAt?: string
}): StatusDescriptor {
  const blockers = params.blockers ?? []

  switch (params.status) {
    case 'paper_paused':
      return {
        label: 'Paper Paused',
        severity: 'neutral',
        reason: 'Paper trading is available but not armed.',
        nextAction: 'Arm paper autopilot when you are ready to resume scans.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Paper account'],
        blockingChecks: blockers,
      }
    case 'paper_armed':
      return {
        label: 'Paper Armed',
        severity: 'warning',
        reason: 'Paper autopilot is armed and ready for the next scan cycle.',
        nextAction: 'Run or wait for the next paper cycle, then inspect decisions.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Paper account', 'Risk limits'],
        blockingChecks: blockers,
      }
    case 'paper_running':
      return {
        label: 'Paper Running',
        severity: 'success',
        reason: 'Paper autopilot is actively scanning and trading in simulation.',
        nextAction: 'Monitor candidates, orders, and replay before promoting live mode.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Paper account', 'Risk limits'],
        blockingChecks: blockers,
      }
    case 'live_blocked':
      return {
        label: 'Live Blocked',
        severity: 'danger',
        reason: 'Promotion-gate or provider blockers still prevent live arming.',
        nextAction: blockers[0] ?? 'Resolve live blockers before arming live mode.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Promotion gate', 'Provider readiness'],
        blockingChecks: blockers,
      }
    case 'live_ready':
      return {
        label: 'Live Ready',
        severity: 'warning',
        reason: 'Live mode is available but not armed.',
        nextAction: 'Review live risk limits, then arm live autopilot deliberately.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Promotion gate', 'Live providers'],
        blockingChecks: blockers,
      }
    case 'live_armed':
      return {
        label: 'Live Armed',
        severity: 'warning',
        reason: 'Live autopilot is armed and waiting for the next cycle.',
        nextAction: 'Keep the kill switch accessible and monitor the next decision cycle.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Live providers', 'Risk limits'],
        blockingChecks: blockers,
      }
    case 'live_running':
      return {
        label: 'Live Running',
        severity: 'danger',
        reason: 'Live autopilot is actively able to place real orders.',
        nextAction: 'Use the kill switch immediately if the state is unexpected.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Live providers', 'Risk limits'],
        blockingChecks: blockers,
      }
    case 'kill_switch_active':
      return {
        label: 'Kill Switch Active',
        severity: 'danger',
        reason: 'New entries are halted. Only risk-reducing actions should continue.',
        nextAction: 'Inspect the halt reason before resuming.',
        lastUpdated: params.updatedAt,
        requiredChecks: ['Manual operator review'],
        blockingChecks: blockers.length ? blockers : ['Kill switch active'],
      }
  }
}

export function getCreateSessionActionState(params: {
  problem: string
  timeHorizon: string
  budgetRange: string
}): DisabledActionState {
  if (!params.problem.trim() || params.problem.trim().length < 12) {
    return {
      disabled: true,
      reason: 'Create analysis session disabled: add a decision brief first.',
    }
  }

  if (!params.timeHorizon.trim()) {
    return {
      disabled: true,
      reason: 'Create analysis session disabled: add a time horizon first.',
    }
  }

  if (!params.budgetRange.trim()) {
    return {
      disabled: true,
      reason: 'Create analysis session disabled: add a budget range first.',
    }
  }

  return { disabled: false }
}

export function getPrepareExecutionActionState(params: {
  executionReadiness?: ExecutionReadiness
  blockers?: string[]
}): DisabledActionState {
  if (params.executionReadiness === 'view_only') {
    return {
      disabled: true,
      reason: 'Execution package disabled: this asset is proof-only in this workspace.',
    }
  }

  if (params.executionReadiness === 'blocked' || (params.blockers?.length ?? 0) > 0) {
    return {
      disabled: true,
      reason: params.blockers?.[0] ?? 'Execution package disabled: resolve blockers first.',
    }
  }

  return { disabled: false }
}

export function getSubmitExecutionActionState(params: {
  environmentMode: EnvironmentMode
  blockers?: string[]
  ready?: boolean
}): DisabledActionState {
  if (params.environmentMode === 'demo') {
    return {
      disabled: true,
      reason: 'Live-like submission disabled: this workspace is in demo mode.',
    }
  }

  if (!params.ready || (params.blockers?.length ?? 0) > 0) {
    return {
      disabled: true,
      reason: params.blockers?.[0] ?? 'Submission disabled: complete every preflight check first.',
    }
  }

  return { disabled: false }
}

export function getLiveAutopilotActionState(params: {
  eligibleForLiveArm?: boolean
  blockers?: string[]
}): DisabledActionState {
  if (!params.eligibleForLiveArm) {
    return {
      disabled: true,
      reason: params.blockers?.[0] ?? 'Live autopilot blocked: promotion gate is not complete.',
    }
  }

  return { disabled: false }
}

export function getLiveTabActionState(params: {
  eligibleForLiveArm?: boolean
  blockers?: string[]
}): DisabledActionState {
  if (!params.eligibleForLiveArm) {
    return {
      disabled: true,
      reason: params.blockers?.[0] ?? 'Live mode blocked: paper-trading requirements are still incomplete.',
    }
  }

  return { disabled: false }
}
