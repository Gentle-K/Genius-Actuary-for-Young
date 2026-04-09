"""Backend-owned oracle reader for HashKey Chain APRO price feeds.

Makes direct JSON-RPC ``eth_call`` requests to the configured oracle feed
contracts.  Results are normalized into ``OracleSnapshot`` objects that get
injected into analysis reports, ensuring the backend is the single source
of truth for price references used in recommendations.

The frontend may still do lightweight reads for instant UI refresh, but
those are display-only and must not be the sole source for exported reports.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

import httpx

from app.domain.rwa import (
    HashKeyChainConfig,
    OracleFeedConfig,
    OracleSnapshot,
)
from app.rwa.explorer_service import address_url, oracle_docs_url, rpc_url_for

logger = logging.getLogger(__name__)

# ABI-encoded function selector for ``latestRoundData()`` — no arguments.
# keccak256("latestRoundData()") → 0xfeaf968c
LATEST_ROUND_DATA_SELECTOR = "0xfeaf968c"

# Brief in-memory cache to avoid hammering the RPC on every report.
_cache: dict[str, tuple[float, list[OracleSnapshot]]] = {}
CACHE_TTL_SECONDS = 60.0


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _decode_latest_round_data(hex_result: str) -> tuple[int, int, int, int, int]:
    """Decode the ABI-encoded return of ``latestRoundData()``.

    Returns: (roundId, answer, startedAt, updatedAt, answeredInRound)
    """
    # Remove 0x prefix, left-pad to 320 hex chars (5 x 64)
    data = hex_result.replace("0x", "").zfill(320)
    round_id = int(data[0:64], 16)
    answer = int(data[64:128], 16)
    # answer is int256 — handle negative values via two's complement
    if answer >= 2**255:
        answer -= 2**256
    started_at = int(data[128:192], 16)
    updated_at = int(data[192:256], 16)
    answered_in_round = int(data[256:320], 16)
    return round_id, answer, started_at, updated_at, answered_in_round


def _feed_address_for(feed: OracleFeedConfig, network: str) -> str:
    if network.strip().lower() == "testnet":
        return feed.testnet_address or ""
    return feed.mainnet_address or ""


def _read_single_feed(
    rpc_endpoint: str,
    feed: OracleFeedConfig,
    network: str,
    chain_config: HashKeyChainConfig,
    *,
    timeout_seconds: float = 8.0,
) -> OracleSnapshot:
    """Read one oracle feed via JSON-RPC ``eth_call``."""
    feed_address = _feed_address_for(feed, network)
    fetched_at = _utcnow()

    if not feed_address:
        return OracleSnapshot(
            feed_id=feed.feed_id,
            pair=feed.pair,
            network=network,
            source_name=feed.source_name,
            source_url=feed.docs_url or oracle_docs_url(chain_config),
            feed_address="",
            price=None,
            decimals=feed.decimals,
            fetched_at=fetched_at,
            note=f"Oracle feed not configured for {network}.",
            status="unavailable",
        )

    payload = {
        "jsonrpc": "2.0",
        "method": "eth_call",
        "params": [
            {"to": feed_address, "data": LATEST_ROUND_DATA_SELECTOR},
            "latest",
        ],
        "id": 1,
    }

    try:
        response = httpx.post(
            rpc_endpoint,
            json=payload,
            timeout=timeout_seconds,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        result = response.json()

        if "error" in result:
            error_message = result["error"].get("message", str(result["error"]))
            logger.warning("Oracle RPC error for %s: %s", feed.pair, error_message)
            return OracleSnapshot(
                feed_id=feed.feed_id,
                pair=feed.pair,
                network=network,
                source_name=feed.source_name,
                source_url=feed.docs_url or oracle_docs_url(chain_config),
                feed_address=feed_address,
                explorer_url=address_url(chain_config, network, feed_address),
                price=None,
                decimals=feed.decimals,
                fetched_at=fetched_at,
                note=f"RPC error: {error_message}",
                status="unavailable",
            )

        hex_data = result.get("result", "0x")
        if not hex_data or hex_data == "0x" or len(hex_data) < 66:
            return OracleSnapshot(
                feed_id=feed.feed_id,
                pair=feed.pair,
                network=network,
                source_name=feed.source_name,
                source_url=feed.docs_url or oracle_docs_url(chain_config),
                feed_address=feed_address,
                explorer_url=address_url(chain_config, network, feed_address),
                price=None,
                decimals=feed.decimals,
                fetched_at=fetched_at,
                note="Empty or invalid response from oracle contract.",
                status="unavailable",
            )

        round_id, answer, _started_at, updated_at_ts, _answered_in_round = (
            _decode_latest_round_data(hex_data)
        )
        price = answer / (10 ** feed.decimals) if feed.decimals > 0 else float(answer)
        updated_at = (
            datetime.fromtimestamp(updated_at_ts, tz=timezone.utc)
            if updated_at_ts > 0
            else None
        )

        return OracleSnapshot(
            feed_id=feed.feed_id,
            pair=feed.pair,
            network=network,
            source_name=feed.source_name,
            source_url=feed.docs_url or oracle_docs_url(chain_config),
            feed_address=feed_address,
            explorer_url=address_url(chain_config, network, feed_address),
            price=price,
            decimals=feed.decimals,
            fetched_at=fetched_at,
            updated_at=updated_at,
            round_id=round_id,
            note="Live price fetched from HashKey APRO oracle via backend JSON-RPC.",
            status="live",
        )

    except (httpx.HTTPError, httpx.TimeoutException, ValueError, IndexError) as exc:
        logger.warning("Oracle read failed for %s on %s: %s", feed.pair, network, exc)
        return OracleSnapshot(
            feed_id=feed.feed_id,
            pair=feed.pair,
            network=network,
            source_name=feed.source_name,
            source_url=feed.docs_url or oracle_docs_url(chain_config),
            feed_address=feed_address,
            explorer_url=address_url(chain_config, network, feed_address),
            price=None,
            decimals=feed.decimals,
            fetched_at=fetched_at,
            note=str(exc),
            status="unavailable",
        )


def fetch_oracle_snapshots(
    chain_config: HashKeyChainConfig,
    network: str = "testnet",
    *,
    timeout_seconds: float = 8.0,
    use_cache: bool = True,
) -> list[OracleSnapshot]:
    """Fetch all configured oracle feeds for the given network.

    Returns a list of ``OracleSnapshot`` objects, one per feed.  Failed
    feeds are included with ``status="unavailable"`` so the report can
    show partial data plus an explicit gap note.
    """
    cache_key = f"oracle:{network}"
    if use_cache and cache_key in _cache:
        cached_at, cached_snapshots = _cache[cache_key]
        if time.monotonic() - cached_at < CACHE_TTL_SECONDS:
            return cached_snapshots

    rpc_endpoint = rpc_url_for(chain_config, network)
    snapshots: list[OracleSnapshot] = []

    for feed in chain_config.oracle_feeds:
        snapshot = _read_single_feed(
            rpc_endpoint,
            feed,
            network,
            chain_config,
            timeout_seconds=timeout_seconds,
        )
        snapshots.append(snapshot)

    _cache[cache_key] = (time.monotonic(), snapshots)
    return snapshots


def clear_oracle_cache() -> None:
    """Clear the in-memory oracle cache (useful in tests)."""
    _cache.clear()
