import { expect, test } from '@playwright/test'

import { installMockWalletProvider, primeRestAppState } from '../utils/mock-app'

const TX_HASH =
  '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
const DEBUG_AUTH_HEADER = `Basic ${Buffer.from('debug-admin:codex-e2e-secret').toString('base64')}`

test.setTimeout(60_000)

test('rest-backed RWA workbench flow reaches execute, simulate, receipt, and monitoring state', async ({
  page,
}) => {
  await installMockWalletProvider(page)
  await primeRestAppState(page, {
    accessToken: 'cookie_session',
    refreshToken: 'cookie_session',
    currentUser: {
      id: 'rest-rwa-e2e',
      name: 'REST RWA E2E',
      email: 'rest-rwa@browser.local',
      title: 'Browser-linked account',
      locale: 'en',
      roles: ['analyst'],
      lastActiveAt: new Date().toISOString(),
    },
  })

  const baseUrl = 'http://127.0.0.1:4273'
  const seedResponse = await page.context().request.post(
    `${baseUrl}/api/debug/e2e/seed-ready-session`,
    {
      headers: {
        Authorization: DEBUG_AUTH_HEADER,
        'Content-Type': 'application/json',
        'X-App-Locale': 'en',
      },
      data: {
        mode: 'strategy_compare',
        locale: 'en',
        problem_statement:
          'Allocate idle USDT from the wallet into one eligible HashKey Chain RWA sleeve.',
        intake_context: {
          investment_amount: 10000,
          base_currency: 'USDT',
          preferred_asset_ids: [],
          holding_period_days: 30,
          risk_tolerance: 'balanced',
          liquidity_need: 't_plus_3',
          minimum_kyc_level: 0,
          wallet_address: '',
          wants_onchain_attestation: true,
          additional_constraints: '',
        },
      },
    },
  )
  expect(seedResponse.ok()).toBeTruthy()
  const seedPayload = (await seedResponse.json()) as { session_id: string }
  const sessionId = seedPayload.session_id

  let seededSession: {
    execution_plan?: {
      target_asset?: string
      source_asset?: string
      ticket_size?: number
      source_chain?: string
    } | null
    report?: {
      recommended_allocations?: Array<{
        asset_id?: string
        suggested_amount?: number
      }>
      asset_cards?: Array<{
        asset_id?: string
        settlement_asset?: string
      }>
    } | null
    wallet_address?: string
    safe_address?: string
    source_asset?: string
    ticket_size?: number
    intake_context?: {
      wallet_address?: string
      safe_address?: string
      source_asset?: string
      source_chain?: string
      ticket_size?: number
      investment_amount?: number
    }
  } | null = null

  await expect
    .poll(async () => {
      const response = await page.context().request.get(
        `${baseUrl}/api/sessions/${sessionId}`,
      )
      if (response.ok()) {
        seededSession = (await response.json()) as typeof seededSession
      }
      return response.ok()
    })
    .toBe(true)

  const targetAsset =
    seededSession?.execution_plan?.target_asset ||
    seededSession?.report?.recommended_allocations?.[0]?.asset_id ||
    seededSession?.report?.asset_cards?.[0]?.asset_id ||
    ''
  const sourceAsset =
    seededSession?.execution_plan?.source_asset ||
    seededSession?.source_asset ||
    seededSession?.intake_context?.source_asset ||
    seededSession?.report?.asset_cards?.find((item) => item.asset_id === targetAsset)
      ?.settlement_asset ||
    'USDT'
  const ticketSize =
    seededSession?.execution_plan?.ticket_size ||
    seededSession?.ticket_size ||
    seededSession?.intake_context?.ticket_size ||
    seededSession?.report?.recommended_allocations?.[0]?.suggested_amount ||
    seededSession?.intake_context?.investment_amount ||
    0
  const sourceChain =
    seededSession?.execution_plan?.source_chain ||
    seededSession?.intake_context?.source_chain ||
    'hashkey'

  expect(targetAsset).toBeTruthy()
  expect(ticketSize).toBeGreaterThan(0)

  const prepareResponse = await page.context().request.post(
    `${baseUrl}/api/rwa/execute/prepare`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-App-Locale': 'en',
      },
      data: {
        session_id: sessionId,
        source_asset: sourceAsset,
        target_asset: targetAsset,
        amount: ticketSize,
        wallet_address:
          seededSession?.wallet_address ||
          seededSession?.intake_context?.wallet_address ||
          '',
        safe_address:
          seededSession?.safe_address ||
          seededSession?.intake_context?.safe_address ||
          '',
        source_chain: sourceChain,
        include_attestation: true,
        generate_only: true,
      },
    },
  )
  expect(prepareResponse.ok()).toBeTruthy()

  await page.goto(`/reports/${sessionId}`)

  await expect(
    page.getByRole('button', { name: 'Review execution plan' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Execute on HashKey Chain' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Review execution plan' }).click()

  await expect(page).toHaveURL(/\/sessions\/[^/]+\/execute$/)
  await expect(
    page.getByRole('button', { name: 'Generate submit receipt' }),
  ).toBeVisible()
  await expect(page.getByPlaceholder('0x...')).toBeVisible()

  await page.getByRole('button', { name: 'Generate submit receipt' }).click()
  await expect(page.getByRole('heading', { name: /receipt$/i })).toBeVisible()
  await expect(page.getByText('Receipt timeline')).toBeVisible()
  await page.keyboard.press('Escape')

  const executeSessionId = page.url().match(/\/sessions\/([^/]+)\/execute$/)?.[1]
  expect(executeSessionId).toBeTruthy()

  await page.getByPlaceholder('0x...').fill(TX_HASH)
  await page.getByPlaceholder('Optional block number').fill('88')
  await page.getByRole('button', { name: 'Record tx hash / block' }).click()

  await expect
    .poll(
      async () => {
        const response = await page.context().request.get(
          `${baseUrl}/api/sessions/${executeSessionId}`,
        )
        expect(response.ok()).toBeTruthy()
        const payload = (await response.json()) as {
          transaction_receipts?: Array<{ tx_hash?: string }>
        }
        return payload.transaction_receipts ?? []
      },
      {
        timeout: 10_000,
      },
    )
    .toContainEqual(
      expect.objectContaining({
        tx_hash: TX_HASH,
      }),
    )

  const anchorResponse = await page.context().request.post(
    `${baseUrl}/api/reports/${executeSessionId}/anchor`,
    {
      data: {
        network: 'testnet',
        transaction_hash: TX_HASH,
        submitted_by: '0x1234567890abcdef1234567890abcdef12345678',
        block_number: 88,
      },
    },
  )
  expect(anchorResponse.ok()).toBeTruthy()
  const anchorPayload = (await anchorResponse.json()) as {
    record?: { transaction_hash?: string }
  }
  expect(anchorPayload.record?.transaction_hash).toBe(TX_HASH)

  await expect
    .poll(
      async () => {
        const response = await page.context().request.get(
          `${baseUrl}/api/sessions/${executeSessionId}`,
        )
        expect(response.ok()).toBeTruthy()
        const payload = (await response.json()) as {
          report_anchor_records?: Array<{ transaction_hash?: string }>
        }
        return payload.report_anchor_records ?? []
      },
      {
        timeout: 10_000,
      },
    )
    .toContainEqual(
      expect.objectContaining({
        transaction_hash: TX_HASH,
      }),
    )
})
