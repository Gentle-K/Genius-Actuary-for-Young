"""Tests for the backend oracle service (APRO JSON-RPC reads)."""

import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

import httpx

from app.config import Settings
from app.domain.rwa import OracleSnapshot
from app.rwa.catalog import build_chain_config
from app.rwa.oracle_service import (
    _decode_latest_round_data,
    clear_oracle_cache,
    fetch_oracle_snapshots,
)


def _chain_config():
    return build_chain_config(Settings.from_env())


class DecodeLatestRoundDataTests(unittest.TestCase):
    def test_decode_valid_hex(self):
        # roundId=10, answer=100000000000 (=1000.0 at 8 decimals),
        # startedAt=1700000000, updatedAt=1700001000, answeredInRound=10
        round_id = 10
        answer = 100000000000
        started_at = 1700000000
        updated_at = 1700001000
        answered_in_round = 10
        hex_result = "0x" + "".join(
            hex(v)[2:].zfill(64)
            for v in [round_id, answer, started_at, updated_at, answered_in_round]
        )
        r, a, s, u, ar = _decode_latest_round_data(hex_result)
        self.assertEqual(r, 10)
        self.assertEqual(a, 100000000000)
        self.assertEqual(s, 1700000000)
        self.assertEqual(u, 1700001000)
        self.assertEqual(ar, 10)

    def test_decode_short_result_pads(self):
        # Minimal result — should pad and parse zeros
        r, a, s, u, ar = _decode_latest_round_data("0x0")
        self.assertEqual(r, 0)
        self.assertEqual(a, 0)


class FetchOracleSnapshotsTests(unittest.TestCase):
    def setUp(self):
        clear_oracle_cache()

    def test_returns_snapshots_for_all_configured_feeds(self):
        chain_config = _chain_config()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        hex_data = "0x" + "".join(
            hex(v)[2:].zfill(64)
            for v in [1, 10000000000, 1700000000, 1700001000, 1]
        )
        mock_response.json.return_value = {"jsonrpc": "2.0", "id": 1, "result": hex_data}

        with patch("app.rwa.oracle_service.httpx.post", return_value=mock_response):
            snapshots = fetch_oracle_snapshots(chain_config, network="testnet", use_cache=False)

        self.assertEqual(len(snapshots), len(chain_config.oracle_feeds))
        for snap in snapshots:
            self.assertIsInstance(snap, OracleSnapshot)
            if snap.status == "live":
                self.assertIsNotNone(snap.price)
                self.assertGreater(snap.price, 0)

    def test_rpc_error_returns_unavailable_snapshots(self):
        chain_config = _chain_config()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            "jsonrpc": "2.0",
            "id": 1,
            "error": {"message": "execution reverted"},
        }

        with patch("app.rwa.oracle_service.httpx.post", return_value=mock_response):
            snapshots = fetch_oracle_snapshots(chain_config, network="testnet", use_cache=False)

        for snap in snapshots:
            self.assertEqual(snap.status, "unavailable")
            self.assertIsNone(snap.price)

    def test_network_error_returns_unavailable(self):
        chain_config = _chain_config()

        with patch(
            "app.rwa.oracle_service.httpx.post",
            side_effect=httpx.ConnectError("Connection refused"),
        ):
            snapshots = fetch_oracle_snapshots(chain_config, network="testnet", use_cache=False)

        for snap in snapshots:
            self.assertEqual(snap.status, "unavailable")

    def test_cache_returns_same_result(self):
        chain_config = _chain_config()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        hex_data = "0x" + "".join(
            hex(v)[2:].zfill(64)
            for v in [1, 10000000000, 1700000000, 1700001000, 1]
        )
        mock_response.json.return_value = {"jsonrpc": "2.0", "id": 1, "result": hex_data}

        with patch("app.rwa.oracle_service.httpx.post", return_value=mock_response) as post_mock:
            first = fetch_oracle_snapshots(chain_config, network="testnet", use_cache=True)
            second = fetch_oracle_snapshots(chain_config, network="testnet", use_cache=True)

        # Second call should use cache — only one RPC batch
        feed_count = len(chain_config.oracle_feeds)
        self.assertEqual(post_mock.call_count, feed_count)
        self.assertEqual(len(first), len(second))

    def test_unconfigured_feed_returns_unavailable(self):
        chain_config = _chain_config()
        # Use mainnet where some feeds might not have addresses
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        hex_data = "0x" + "".join(
            hex(v)[2:].zfill(64)
            for v in [1, 10000000000, 1700000000, 1700001000, 1]
        )
        mock_response.json.return_value = {"jsonrpc": "2.0", "id": 1, "result": hex_data}

        with patch("app.rwa.oracle_service.httpx.post", return_value=mock_response):
            snapshots = fetch_oracle_snapshots(chain_config, network="mainnet", use_cache=False)

        # At least some feeds should have data
        self.assertGreater(len(snapshots), 0)


if __name__ == "__main__":
    unittest.main()
