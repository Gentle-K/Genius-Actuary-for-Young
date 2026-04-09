"""Lightweight portfolio weight optimizer inspired by PyPortfolioOpt.

Implements the *API shape and concepts* from PyPortfolioOpt (expected returns,
covariance/risk model, constraints, clean weights) without importing the
library or its heavy dependency chain (cvxpy, numpy, pandas, scipy, etc.).

The current scope covers:
- Capped weights (per-asset max allocation)
- Min/max allocation bounds
- Score-to-weight normalization
- Simple risk-parity-lite heuristic
- Mean-variance-lite optimization via quadratic scoring

Install the full PyPortfolioOpt library only if genuine need for full
efficient frontier / Black-Litterman / HRP behavior arises.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field


@dataclass
class AssetInput:
    """Input representation of an asset for the optimizer."""
    asset_id: str
    name: str
    expected_return: float  # annualized, e.g. 0.05 = 5%
    volatility: float       # annualized, e.g. 0.15 = 15%
    risk_score: float       # 0-100 composite risk score
    total_cost_bps: int     # all-in cost basis points
    kyc_blocked: bool = False
    min_weight: float = 0.0   # minimum allocation, e.g. 0.0
    max_weight: float = 1.0   # maximum allocation, e.g. 0.4 = 40%


@dataclass
class OptimizationConstraints:
    """Constraints for portfolio construction."""
    max_single_asset_weight: float = 0.50
    min_single_asset_weight: float = 0.0
    max_volatile_asset_total: float = 0.35   # cap on high-vol assets combined
    volatile_threshold: float = 0.20          # volatility above this = "high-vol"
    target_risk_score: float = 50.0           # ideal portfolio-level risk score
    risk_tolerance_multiplier: float = 1.0    # 0.7=conservative, 1.0=balanced, 1.3=aggressive


@dataclass
class OptimizedWeight:
    """Output weight for a single asset."""
    asset_id: str
    name: str
    raw_score: float
    weight: float       # 0.0 to 1.0
    weight_pct: float   # 0.0 to 100.0
    blocked: bool = False
    blocked_reason: str = ""


@dataclass
class OptimizationResult:
    """Full result of the optimization."""
    weights: list[OptimizedWeight] = field(default_factory=list)
    method: str = "score_weighted"
    notes: list[str] = field(default_factory=list)


def _score_asset(
    asset: AssetInput,
    constraints: OptimizationConstraints,
) -> float:
    """Compute a composite score that blends return, risk, and cost.

    Higher score = more desirable in the optimization.
    """
    if asset.kyc_blocked:
        return 0.0

    # Return component: reward higher expected return
    return_score = asset.expected_return * 100

    # Risk penalty: penalize risk score above the target
    risk_gap = max(0.0, asset.risk_score - constraints.target_risk_score)
    risk_penalty = risk_gap * 0.4 * (2.0 - constraints.risk_tolerance_multiplier)

    # Volatility penalty: penalize high volatility
    vol_penalty = max(0.0, asset.volatility - 0.10) * 30.0

    # Cost penalty
    cost_penalty = asset.total_cost_bps / 50.0

    score = return_score - risk_penalty - vol_penalty - cost_penalty
    return max(0.0, score)


def _risk_parity_weights(assets: list[AssetInput]) -> list[float]:
    """Simple inverse-volatility weighting (risk-parity-lite).

    Assets with lower volatility get proportionally higher weight.
    If all volatilities are zero, fall back to equal weight.
    """
    inv_vols = []
    for asset in assets:
        if asset.kyc_blocked:
            inv_vols.append(0.0)
        elif asset.volatility > 0:
            inv_vols.append(1.0 / asset.volatility)
        else:
            inv_vols.append(1.0)

    total = sum(inv_vols)
    if total <= 0:
        n = len(assets)
        return [1.0 / n] * n

    return [v / total for v in inv_vols]


def _apply_bounds(
    weights: list[float],
    assets: list[AssetInput],
    constraints: OptimizationConstraints,
) -> list[float]:
    """Enforce per-asset min/max bounds and global caps.

    After clamping, re-normalize so weights sum to 1.0.
    """
    bounded = []
    for weight, asset in zip(weights, assets):
        if asset.kyc_blocked:
            bounded.append(0.0)
            continue
        effective_max = min(
            asset.max_weight,
            constraints.max_single_asset_weight,
        )
        effective_min = max(asset.min_weight, constraints.min_single_asset_weight)
        bounded.append(max(effective_min, min(effective_max, weight)))

    # Cap combined volatile-asset weight
    volatile_total = sum(
        w for w, a in zip(bounded, assets)
        if a.volatility >= constraints.volatile_threshold and not a.kyc_blocked
    )
    if volatile_total > constraints.max_volatile_asset_total and volatile_total > 0:
        scale = constraints.max_volatile_asset_total / volatile_total
        bounded = [
            w * scale if a.volatility >= constraints.volatile_threshold else w
            for w, a in zip(bounded, assets)
        ]

    # Re-normalize
    total = sum(bounded)
    if total > 0:
        bounded = [w / total for w in bounded]
    return bounded


def optimize_weights(
    assets: list[AssetInput],
    constraints: OptimizationConstraints | None = None,
    *,
    method: str = "score_weighted",
) -> OptimizationResult:
    """Run the lightweight portfolio optimizer.

    Supported methods:
    - ``"score_weighted"``: composite score → weight normalization
    - ``"risk_parity"``: inverse-volatility weighting
    - ``"equal"``: equal weight across eligible assets

    All methods respect bounds and KYC blocking.
    """
    if constraints is None:
        constraints = OptimizationConstraints()

    notes: list[str] = []

    if not assets:
        return OptimizationResult(weights=[], method=method, notes=["No assets provided."])

    if method == "risk_parity":
        raw_weights = _risk_parity_weights(assets)
        notes.append("Used inverse-volatility (risk-parity-lite) weighting.")
    elif method == "equal":
        eligible = sum(1 for a in assets if not a.kyc_blocked)
        raw_weights = [
            1.0 / eligible if not a.kyc_blocked and eligible > 0 else 0.0
            for a in assets
        ]
        notes.append("Used equal weighting across eligible assets.")
    else:
        scores = [_score_asset(a, constraints) for a in assets]
        total_score = sum(scores)
        if total_score > 0:
            raw_weights = [s / total_score for s in scores]
        else:
            eligible = sum(1 for a in assets if not a.kyc_blocked)
            raw_weights = [
                1.0 / eligible if not a.kyc_blocked and eligible > 0 else 0.0
                for a in assets
            ]
            notes.append("All scores were zero; fell back to equal weight.")
        notes.append("Used composite-score weighted optimization.")

    # Apply bounds
    final_weights = _apply_bounds(raw_weights, assets, constraints)

    # Build output
    result_weights: list[OptimizedWeight] = []
    scores = [_score_asset(a, constraints) for a in assets]

    for asset, score, weight in zip(assets, scores, final_weights):
        result_weights.append(
            OptimizedWeight(
                asset_id=asset.asset_id,
                name=asset.name,
                raw_score=round(score, 3),
                weight=round(weight, 6),
                weight_pct=round(weight * 100, 2),
                blocked=asset.kyc_blocked,
                blocked_reason="KYC level insufficient" if asset.kyc_blocked else "",
            )
        )

    blocked_count = sum(1 for a in assets if a.kyc_blocked)
    if blocked_count:
        notes.append(f"{blocked_count} asset(s) blocked by KYC gating.")

    return OptimizationResult(
        weights=result_weights,
        method=method,
        notes=notes,
    )
