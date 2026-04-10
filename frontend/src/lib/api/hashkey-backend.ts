import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import {
  mapKycSnapshot,
  type BackendKycCheckResponse,
  type BackendOracleSnapshotResponse,
} from '@/lib/api/adapters/genius-backend'
import type {
  MarketDataSnapshot,
  WalletKycSnapshot,
  WalletNetworkKey,
} from '@/types'

export async function fetchBackendKycSnapshot(
  walletAddress: string,
  network: WalletNetworkKey,
): Promise<WalletKycSnapshot> {
  const response = await apiClient.request<BackendKycCheckResponse>(
    endpoints.backend.walletKyc(walletAddress, network),
  )
  return mapKycSnapshot(response.result)
}

export async function fetchBackendOracleSnapshots(
  network: WalletNetworkKey,
): Promise<MarketDataSnapshot[]> {
  const response = await apiClient.request<BackendOracleSnapshotResponse>(
    endpoints.backend.oracleSnapshots(network),
  )
  return response.snapshots.map((snapshot) => ({
    feedId: snapshot.feed_id,
    pair: snapshot.pair,
    network: snapshot.network === 'mainnet' ? 'mainnet' : 'testnet',
    sourceName: snapshot.source_name,
    sourceUrl: snapshot.source_url,
    feedAddress: snapshot.feed_address,
    explorerUrl: snapshot.explorer_url ?? '',
    price:
      typeof snapshot.price === 'number' ? snapshot.price : undefined,
    decimals: snapshot.decimals,
    fetchedAt: snapshot.fetched_at,
    updatedAt: snapshot.updated_at ?? undefined,
    roundId:
      typeof snapshot.round_id === 'number' ? snapshot.round_id : undefined,
    note: snapshot.note ?? '',
    status: snapshot.status,
  }))
}
