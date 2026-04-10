"""Tests for the backend KYC SBT service (JSON-RPC reads)."""

import unittest
from unittest.mock import patch, MagicMock

import httpx

from app.config import Settings
from app.domain.rwa import KycOnchainResult, KycStatus
from app.rwa.catalog import build_chain_config
from app.rwa.kyc_service import read_kyc_from_chain


def _chain_config():
    return build_chain_config(Settings.from_env())


class KycServiceTests(unittest.TestCase):
    def test_empty_wallet_returns_not_verified(self):
        chain_config = _chain_config()
        result = read_kyc_from_chain(chain_config, "", "testnet")
        self.assertIsInstance(result, KycOnchainResult)
        self.assertFalse(result.is_human)
        self.assertEqual(result.level, 0)
        self.assertEqual(result.status, KycStatus.NONE)
        self.assertIn("No wallet", result.note)

    def test_unconfigured_contract_returns_not_verified(self):
        chain_config = _chain_config()
        # Override KYC contract addresses to empty
        chain_config.testnet_kyc_sbt_address = ""
        chain_config.mainnet_kyc_sbt_address = ""
        chain_config.kyc_sbt_address = ""
        result = read_kyc_from_chain(
            chain_config, "0x1234567890abcdef1234567890abcdef12345678", "testnet"
        )
        self.assertFalse(result.is_human)
        self.assertEqual(result.status, KycStatus.UNAVAILABLE)
        self.assertIn("not configured", result.note)

    def test_rpc_success_verified(self):
        chain_config = _chain_config()
        chain_config.testnet_kyc_sbt_address = "0x" + "aa" * 20
        chain_config.kyc_sbt_address = chain_config.testnet_kyc_sbt_address
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        # isHuman returns (true=1, level=2)
        hex_data = "0x" + hex(1)[2:].zfill(64) + hex(2)[2:].zfill(64)
        mock_response.json.return_value = {"jsonrpc": "2.0", "id": 1, "result": hex_data}

        with patch("app.rwa.kyc_service.httpx.post", return_value=mock_response):
            result = read_kyc_from_chain(
                chain_config, "0x1234567890abcdef1234567890abcdef12345678", "testnet"
            )

        self.assertTrue(result.is_human)
        self.assertEqual(result.level, 2)
        self.assertEqual(result.status, KycStatus.APPROVED)
        self.assertIn("eligibility detected", result.note)

    def test_rpc_success_not_verified(self):
        chain_config = _chain_config()
        chain_config.testnet_kyc_sbt_address = "0x" + "bb" * 20
        chain_config.kyc_sbt_address = chain_config.testnet_kyc_sbt_address
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        # isHuman returns (false=0, level=0)
        hex_data = "0x" + hex(0)[2:].zfill(64) + hex(0)[2:].zfill(64)
        mock_response.json.return_value = {"jsonrpc": "2.0", "id": 1, "result": hex_data}

        with patch("app.rwa.kyc_service.httpx.post", return_value=mock_response):
            result = read_kyc_from_chain(
                chain_config, "0x1234567890abcdef1234567890abcdef12345678", "testnet"
        )

        self.assertFalse(result.is_human)
        self.assertEqual(result.level, 0)
        self.assertEqual(result.status, KycStatus.NONE)

    def test_rpc_error_returns_not_verified(self):
        chain_config = _chain_config()
        chain_config.testnet_kyc_sbt_address = "0x" + "cc" * 20
        chain_config.kyc_sbt_address = chain_config.testnet_kyc_sbt_address
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            "jsonrpc": "2.0",
            "id": 1,
            "error": {"message": "execution reverted"},
        }

        with patch("app.rwa.kyc_service.httpx.post", return_value=mock_response):
            result = read_kyc_from_chain(
                chain_config, "0x1234567890abcdef1234567890abcdef12345678", "testnet"
        )

        self.assertFalse(result.is_human)
        self.assertEqual(result.status, KycStatus.UNAVAILABLE)
        self.assertIn("RPC error", result.note)

    def test_network_error_returns_not_verified(self):
        chain_config = _chain_config()
        chain_config.testnet_kyc_sbt_address = "0x" + "dd" * 20
        chain_config.kyc_sbt_address = chain_config.testnet_kyc_sbt_address

        with patch(
            "app.rwa.kyc_service.httpx.post",
            side_effect=httpx.ConnectError("Connection refused"),
        ):
            result = read_kyc_from_chain(
                chain_config, "0x1234567890abcdef1234567890abcdef12345678", "testnet"
        )

        self.assertFalse(result.is_human)
        self.assertEqual(result.level, 0)
        self.assertEqual(result.status, KycStatus.UNAVAILABLE)


class ExplorerServiceTests(unittest.TestCase):
    def test_tx_url(self):
        from app.rwa.explorer_service import tx_url
        chain_config = _chain_config()
        url = tx_url(chain_config, "testnet", "0xdeadbeef")
        self.assertIn("/tx/0xdeadbeef", url)
        self.assertIn("testnet", url.lower())

    def test_address_url(self):
        from app.rwa.explorer_service import address_url
        chain_config = _chain_config()
        url = address_url(chain_config, "mainnet", "0xcafe")
        self.assertIn("/address/0xcafe", url)

    def test_token_url(self):
        from app.rwa.explorer_service import token_url
        chain_config = _chain_config()
        url = token_url(chain_config, "testnet", "0x1234")
        self.assertIn("/token/0x1234", url)

    def test_rpc_url_for(self):
        from app.rwa.explorer_service import rpc_url_for
        chain_config = _chain_config()
        rpc = rpc_url_for(chain_config, "testnet")
        self.assertIn("http", rpc)

    def test_chain_id_for(self):
        from app.rwa.explorer_service import chain_id_for
        chain_config = _chain_config()
        chain_id = chain_id_for(chain_config, "testnet")
        self.assertEqual(chain_id, 133)


if __name__ == "__main__":
    unittest.main()
