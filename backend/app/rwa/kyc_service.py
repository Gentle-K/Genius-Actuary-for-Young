"""Backend-owned KYC SBT reader for HashKey Chain.

Makes a direct JSON-RPC ``eth_call`` to the configured KYC SBT contract's
``isHuman(address)`` function.  The result is returned as a
``KycOnchainResult`` that the report engine uses to override any
user-declared KYC level — ensuring on-chain truth always wins.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

from app.domain.rwa import HashKeyChainConfig, KycOnchainResult
from app.rwa.explorer_service import address_url, kyc_docs_url, rpc_url_for

logger = logging.getLogger(__name__)

# keccak256("isHuman(address)") → first 4 bytes = 0x4a93658e
IS_HUMAN_SELECTOR = "0x4a93658e"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _encode_address(wallet_address: str) -> str:
    """ABI-encode an address as a 32-byte padded hex word."""
    cleaned = wallet_address.lower().replace("0x", "")
    return cleaned.zfill(64)


def _kycSbt_address_for(chain_config: HashKeyChainConfig, network: str) -> str:
    if network.strip().lower() == "testnet":
        return chain_config.testnet_kyc_sbt_address or chain_config.kyc_sbt_address or ""
    return chain_config.mainnet_kyc_sbt_address or chain_config.kyc_sbt_address or ""


def read_kyc_from_chain(
    chain_config: HashKeyChainConfig,
    wallet_address: str,
    network: str = "testnet",
    *,
    timeout_seconds: float = 8.0,
) -> KycOnchainResult:
    """Read KYC/SBT status for a wallet address from HashKey Chain.

    Returns a ``KycOnchainResult`` with ``is_human``, ``level``, and
    metadata.  If the contract is not configured or the call fails, the
    result will have ``is_human=False`` and ``level=0`` with an
    explanatory ``note``.
    """
    fetched_at = _utcnow()
    contract_address = _kycSbt_address_for(chain_config, network)

    if not wallet_address:
        return KycOnchainResult(
            wallet_address=wallet_address,
            network=network,
            contract_address=contract_address,
            is_human=False,
            level=0,
            source_url=kyc_docs_url(chain_config),
            fetched_at=fetched_at,
            note="No wallet address provided.",
        )

    if not contract_address:
        return KycOnchainResult(
            wallet_address=wallet_address,
            network=network,
            contract_address="",
            is_human=False,
            level=0,
            source_url=kyc_docs_url(chain_config),
            fetched_at=fetched_at,
            note=f"KYC SBT contract is not configured for {network}.",
        )

    rpc_endpoint = rpc_url_for(chain_config, network)
    call_data = IS_HUMAN_SELECTOR + _encode_address(wallet_address)

    payload = {
        "jsonrpc": "2.0",
        "method": "eth_call",
        "params": [
            {"to": contract_address, "data": call_data},
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
            logger.warning(
                "KYC RPC error for %s on %s: %s",
                wallet_address,
                network,
                error_message,
            )
            return KycOnchainResult(
                wallet_address=wallet_address,
                network=network,
                contract_address=contract_address,
                is_human=False,
                level=0,
                source_url=kyc_docs_url(chain_config),
                explorer_url=address_url(chain_config, network, contract_address),
                fetched_at=fetched_at,
                note=f"RPC error: {error_message}",
            )

        hex_data = result.get("result", "0x")
        if not hex_data or hex_data == "0x" or len(hex_data) < 66:
            return KycOnchainResult(
                wallet_address=wallet_address,
                network=network,
                contract_address=contract_address,
                is_human=False,
                level=0,
                source_url=kyc_docs_url(chain_config),
                explorer_url=address_url(chain_config, network, contract_address),
                fetched_at=fetched_at,
                note="Empty or invalid response from KYC SBT contract.",
            )

        # Decode: isHuman returns (bool verified, uint8 level)
        data = hex_data.replace("0x", "").zfill(128)
        is_human = int(data[0:64], 16) != 0
        level = int(data[64:128], 16)

        return KycOnchainResult(
            wallet_address=wallet_address,
            network=network,
            contract_address=contract_address,
            is_human=is_human,
            level=level,
            source_url=kyc_docs_url(chain_config),
            explorer_url=address_url(chain_config, network, contract_address),
            fetched_at=fetched_at,
            note=(
                "Onchain KYC/SBT eligibility detected."
                if is_human
                else "No onchain KYC/SBT eligibility detected for this wallet."
            ),
        )

    except (httpx.HTTPError, httpx.TimeoutException, ValueError, IndexError) as exc:
        logger.warning(
            "KYC SBT read failed for %s on %s: %s",
            wallet_address,
            network,
            exc,
        )
        return KycOnchainResult(
            wallet_address=wallet_address,
            network=network,
            contract_address=contract_address,
            is_human=False,
            level=0,
            source_url=kyc_docs_url(chain_config),
            explorer_url=address_url(chain_config, network, contract_address),
            fetched_at=fetched_at,
            note=str(exc),
        )
