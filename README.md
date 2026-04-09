# Genius Actuary

Genius Actuary is now positioned as a HashKey Chain RWA decision engine. This repository contains the FastAPI backend, the React + TypeScript frontend under `frontend/`, and older proposal artifacts kept for reference.

## Product summary

The current product is no longer a generic “AI analysis demo”. It is a full RWA allocation and due-diligence workflow for HashKey Chain:

- Page 1: structured intake for investment amount, base currency, holding period, risk tolerance, liquidity need, KYC level, wallet address, on-chain attestation preference, and selected assets
- Page 2: session workspace that drives clarification, evidence collection, deterministic calculations, and chart generation
- Page 3: final RWA report with asset cards, RiskVector decomposition, holding-period simulations, recommended allocations, evidence panel, transaction draft, and attestation draft

The backend keeps the final report deterministic and evidence-linked. The OpenAI-compatible model adapter is optional and mainly used for question/planning/report language generation. If the model path fails, the backend falls back to the built-in RWA rules engine.

## New capabilities

### HashKey Chain integration

- Built-in HashKey Chain bootstrap payload exposed to the frontend
- Mainnet / testnet chain metadata, RPC URLs, and explorer URLs
- Optional `PLAN_REGISTRY_ADDRESS` and `KYC_SBT_ADDRESS` wiring
- Seeded HashKey asset library based on official network and token references

### RWA asset library

The backend now ships a structured asset template library, including:

- HashKey USDT
- HashKey USDC
- CPIC Estable MMF
- Hong Kong regulated silver RWA demo
- Tokenized real estate demo
- HashKey WBTC benchmark

Each asset template carries structured fields for:

- asset type, issuer, custody, settlement asset, and execution style
- expected return range, volatility, max drawdown, fees, slippage, and liquidity window
- KYC requirement, minimum ticket, oracle assumptions, upgradeability, admin-key flags, and evidence URLs

### Deterministic RWA engine

The backend now computes:

- `RiskVector` across market, liquidity, peg/redemption, issuer/custody, smart-contract, oracle, and compliance-access dimensions
- holding-period simulations with P10 / P50 / P90 outcomes
- `VaR(95)` and `CVaR(95)` style downside metrics
- drawdown estimates and scenario notes
- allocation recommendations based on risk tolerance, liquidity constraints, and KYC gating
- transaction execution draft with step-by-step actions and fee estimates
- on-chain attestation draft with report hash, portfolio hash, and registry readiness

### Frontend report experience

The React frontend now renders:

- RWA intake and asset selection
- chain configuration summary
- asset analysis cards
- holding-period simulation summaries
- comparison tables and chart artifacts
- evidence panel with linked sources
- recommended weights and suggested ticket sizes
- tx draft and on-chain attestation draft
- assumptions, disclaimers, and calculation summaries

### Debug and operations

- protected debug login page and debug-only audit/session pages
- cookie-based anonymous session isolation for normal product use
- backend `.env` is ignored by git for local API secret storage
- OpenAI-compatible adapter and mock adapter remain switchable

## Repository layout

- `Agent/`: proposal, planning, and reference documents already tracked in the repository
- `backend/`: FastAPI backend, orchestrator loop, RWA domain engine, session persistence
- `frontend/`: React + TypeScript + Vite product frontend
- `frontend-demo/`: legacy static prototype retained for reference
- `.github/workflows/ci.yml`: frontend CI pipeline

## Backend highlights

- FastAPI API surface for frontend bootstrap and session lifecycle
- SQLite-backed session persistence
- RWA-specific domain models for intake context, chain config, asset templates, simulations, tx drafts, and attestation drafts
- OpenAI-compatible analysis adapter with deterministic fallback
- mock or Brave-style search adapter support
- deterministic chart artifacts derived from report data
- stable frontend-facing contracts for session creation, progress, and final reports

Key routes:

- `GET /health`
- `GET /api/frontend/bootstrap`
- `POST /api/sessions`
- `GET /api/sessions/{session_id}`
- `POST /api/sessions/{session_id}/step`

## Frontend highlights

- React + TypeScript + Vite + Tailwind CSS v4
- TanStack Query, React Router, Zustand persist, ECharts
- mock + REST adapter switch
- black-gold design system shared across dark / light / system modes
- analysis flow rebuilt around HashKey Chain RWA intake, analysis, and report pages
- report rendering for RiskVector, simulations, evidence, tx draft, and attestation draft

## Quick start

### Backend

```bash
cd backend
python3.13 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Environment notes

Backend secrets and model settings should live in `backend/.env`. Keep that file local only.

Important backend variables:

- `ANALYSIS_ADAPTER`
- `ANALYSIS_PROVIDER`
- `ANALYSIS_API_BASE_URL`
- `ANALYSIS_API_KEY`
- `ANALYSIS_MODEL`
- `HASHKEY_TESTNET_CHAIN_ID`
- `HASHKEY_TESTNET_RPC_URL`
- `HASHKEY_TESTNET_EXPLORER_URL`
- `HASHKEY_MAINNET_CHAIN_ID`
- `HASHKEY_MAINNET_RPC_URL`
- `HASHKEY_MAINNET_EXPLORER_URL`
- `PLAN_REGISTRY_ADDRESS`
- `KYC_SBT_ADDRESS`
- `DEBUG_USERNAME`
- `DEBUG_PASSWORD`

The default OpenAI-compatible example in `backend/.env.example` uses:

- provider: `openai-compatible`
- base URL: `https://api.openai.com/v1`
- model: `gpt-4.1-mini`

## Verification

Latest local verification completed in this repository:

- `cd frontend && npm run test:run`
- `cd frontend && npm run build`
- `cd backend && python3.13 -m venv .venv-test && . .venv-test/bin/activate && pip install -r requirements.txt && python -m unittest discover -s tests`

Status at verification time:

- frontend tests: passed
- frontend production build: passed
- backend unit tests: passed

## Product rules

- Every clarification question must allow custom user input. Preset options are shortcuts only.
- RWA outputs must stay evidence-linked, risk-decomposed, and reproducible.
- The UI should not own orchestration logic; it should consume typed backend contracts.
- API secrets must stay in local `.env` files and must not be committed.

## Additional docs

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)
