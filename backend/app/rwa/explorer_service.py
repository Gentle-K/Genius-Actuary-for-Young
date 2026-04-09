"""Centralized explorer URL builders for HashKey Chain mainnet and testnet.

All explorer links in reports, attestation drafts, tx drafts, and evidence
panels should be constructed through this module to ensure consistency.
"""

from __future__ import annotations

from app.domain.rwa import HashKeyChainConfig


def _explorer_base(chain_config: HashKeyChainConfig, network: str) -> str:
    if network.strip().lower() == "testnet":
        return chain_config.testnet_explorer_url.rstrip("/")
    return chain_config.mainnet_explorer_url.rstrip("/")


def tx_url(chain_config: HashKeyChainConfig, network: str, tx_hash: str) -> str:
    """Build an explorer URL for a transaction hash."""
    return f"{_explorer_base(chain_config, network)}/tx/{tx_hash}"


def address_url(chain_config: HashKeyChainConfig, network: str, address: str) -> str:
    """Build an explorer URL for a contract or wallet address."""
    return f"{_explorer_base(chain_config, network)}/address/{address}"


def token_url(chain_config: HashKeyChainConfig, network: str, token_address: str) -> str:
    """Build an explorer URL for a token contract."""
    return f"{_explorer_base(chain_config, network)}/token/{token_address}"


def block_url(chain_config: HashKeyChainConfig, network: str, block_number: int) -> str:
    """Build an explorer URL for a block."""
    return f"{_explorer_base(chain_config, network)}/block/{block_number}"


def rpc_url_for(chain_config: HashKeyChainConfig, network: str) -> str:
    """Resolve the JSON-RPC URL for a given network."""
    if network.strip().lower() == "testnet":
        return chain_config.testnet_rpc_url
    return chain_config.mainnet_rpc_url


def chain_id_for(chain_config: HashKeyChainConfig, network: str) -> int:
    """Resolve the chain ID for a given network."""
    if network.strip().lower() == "testnet":
        return chain_config.testnet_chain_id
    return chain_config.mainnet_chain_id


def kyc_docs_url(chain_config: HashKeyChainConfig) -> str:
    """Return the best KYC documentation URL from the chain config."""
    for url in chain_config.docs_urls:
        if "/Tools/KYC" in url:
            return url
    return ""


def oracle_docs_url(chain_config: HashKeyChainConfig) -> str:
    """Return the best oracle documentation URL from the chain config."""
    for url in chain_config.docs_urls:
        if "/Tools/Oracle" in url:
            return url
    return ""
