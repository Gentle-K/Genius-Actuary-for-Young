# Audit Report

## Scope

Repository audit completed on 2026-04-10 in a Windows PowerShell environment at `C:\Users\ROG\Desktop\Gay`.

Verified checks before implementation:

- `cd frontend && npm run build`: passed
- `cd frontend && npm run test:run`: passed
- `cd frontend && npm run lint`: failed on one warning treated as error
- `cd backend && python -m unittest discover -s tests`: passed
- Session lifecycle verified through FastAPI `TestClient`: `CLARIFYING -> ANALYZING -> READY_FOR_REPORT -> COMPLETED`

Important environment note:

- `scripts/test_smoke.sh` and `scripts/test_full.sh` are Unix shell scripts and are not runnable as-is in the current Windows PowerShell environment because `bash` is unavailable here.

## Feature Inventory

### Working now

- FastAPI backend boots through importable app factory and exposes session, bootstrap, KYC, oracle, and attestation routes.
- Session lifecycle works end-to-end in mock analysis mode.
- Existing strengths are present and functional:
  - deterministic RWA analysis engine
  - risk decomposition / `RiskVector`
  - holding-period simulation
  - comparison tables
  - chart artifact generation
  - evidence collection
  - recommendation and markdown report generation
- Frontend app builds successfully.
- Frontend Vitest suite passes.
- Backend unittest suite passes.
- Wallet connect, network detection, network switching, and attestation write helpers exist in the frontend.
- Plan Registry contract and deploy script exist.
- Backend already owns oracle JSON-RPC reads and KYC JSON-RPC reads.
- Explorer URL builders already exist on the backend.

### Partially working

- Result page can display attestation draft state and can submit an attestation inline from the report page.
- Wallet-aware intake page exists and uses connected wallet state.
- Oracle snapshots are included in backend bootstrap and backend reports.
- KYC override logic exists in the backend report builder.
- Restricted assets are not silently removed from allocation output.

### Placeholder / demo-only / misleading

- [`frontend/src/features/analysis/pages/execution-page.tsx`](C:/Users/ROG/Desktop/Gay/frontend/src/features/analysis/pages/execution-page.tsx) is a placeholder and hardcodes `null as any` for report, chain config, and attestation data.
- Frontend still reads KYC and oracle data directly from chain with `viem`, bypassing backend ownership even though backend endpoints already exist.
- Evidence metadata is produced in the backend but not fully preserved in frontend mapping, so report UI loses source classification detail.
- Cross-platform test execution is incomplete: shell scripts assume Bash, `jq`, `curl`, and `python3.13`.

## Broken Flow Inventory

### 1. Execution page flow

- The dedicated execution route is non-functional because it never loads real session/report data.
- This means the required pre-check -> sign -> submit -> pending -> success/failure execution page flow is not actually wired end-to-end.

### 2. Backend/frontend source-of-truth split

- Backend already exposes:
  - `GET /api/oracle/snapshots`
  - `GET /api/kyc/{wallet_address}`
- Frontend ignores those for live UX and instead reads both KYC and oracle data directly with `viem`.
- This breaks the product rule that backend should own oracle normalization and reporting inputs.

### 3. Oracle contract data mapping

- Backend bootstrap returns `oracle_snapshots`, but frontend bootstrap mapping currently drops them.
- Result page then compensates with frontend-side live reads instead of backend-owned data.

### 4. Evidence traceability in UI

- Backend session evidence items include `source_type` and `source_tag`, but frontend adapter types currently drop those fields.
- Result page evidence cards therefore lose proof-layer labeling and source classification in practice.

### 5. Network consistency in execution draft

- Verified report generation currently produces:
  - attestation network: `testnet`
  - tx draft chain id: `177` / mainnet
- `build_tx_draft()` hardcodes HashKey mainnet for the initial switch step and ERC20 explorer links.
- This creates a confusing mixed-network execution plan.

### 6. Demo environment targeting

- Chain config defaults to `mainnet` even though the requested primary demo environment is testnet.
- Oracle snapshots therefore default to mainnet in reports/bootstraps unless overridden, which weakens testnet demo coherence.

### 7. Script portability

- `scripts/test_smoke.sh` and `scripts/test_full.sh` are not runnable in the current Windows environment.
- This blocks the repo from being consistently testable across the stated environment.

## Missing Feature Inventory

- Dedicated, real execution console page backed by session/report data.
- Structured transaction error classification:
  - user rejection
  - wrong network
  - insufficient gas / insufficient funds
  - contract revert
  - RPC failure
- Report-time KYC snapshot surfaced as structured report data.
- Report-time wallet/network snapshot surfaced clearly in the result UI/export flow.
- Backend-owned live oracle display flow in the frontend.
- Full proof-layer rendering in the evidence panel:
  - source type
  - source tag
  - fetched time
  - status / freshness context
- Report export actions wired into the result UI.
- Cross-platform test runners for the required smoke/full flows.

## Bug List

1. `ExecutionPage` is a dead route due to placeholder `null as any` state.
2. Frontend bootstrap mapper drops backend `oracle_snapshots`.
3. Frontend backend adapter drops evidence `source_type` / `source_tag`.
4. `build_tx_draft()` hardcodes mainnet, causing report/network inconsistency with testnet attestation.
5. `build_chain_config()` hardcodes `default_execution_network="mainnet"`, conflicting with testnet-first demo expectations.
6. `npm run lint` fails because [`frontend/src/features/analysis/components/RiskRadarChart.tsx`](C:/Users/ROG/Desktop/Gay/frontend/src/features/analysis/components/RiskRadarChart.tsx) exports non-component helpers in a component file while `react-refresh/only-export-components` is enforced as warning-free.
7. Shell-based regression scripts are not portable to the current Windows environment.

## Architecture Risks

- Frontend `web3` layer currently owns both wallet actions and data reads; that mixes execution concerns with backend-owned business truth.
- Report page has become a large orchestration surface rather than a pure presentation layer.
- Execution logic is split between a placeholder execution page and an inline report-page mutation flow.
- Backend report model is strong, but some structured metadata is lost in frontend mapping, reducing traceability.

## Dependency / Environment Risks

- Current scripted test flow assumes Unix shell tooling.
- Current repo verification depends on a Python environment with backend dependencies installed, but the local global Python here does not include `uvicorn`.
- Frontend lint is warning-intolerant, so minor React Fast Refresh violations fail CI-style checks.
- `frontend/coverage/` is checked into the repo and adds noise during audit/search.

## Highest-Priority Fixes

1. Make backend the live source of truth for KYC and oracle reads in the frontend.
2. Replace the placeholder execution page with a real session-backed execution state machine.
3. Repair frontend mapping so evidence/source metadata and bootstrap oracle snapshots are preserved.
4. Fix network consistency for testnet-first demo flows and execution drafts.
5. Repair lint failure and make smoke/full test flows runnable in this environment.
6. Upgrade result/report UI to show KYC snapshot, oracle snapshot, proof-layer evidence detail, attestation receipt, and export actions coherently.

## Recommended Implementation Order

1. Fix frontend contract mapping gaps:
   - bootstrap oracle snapshots
   - evidence source metadata
   - any report snapshot fields added during implementation
2. Move frontend KYC/oracle queries to backend-backed APIs.
3. Add testnet-first network config and repair tx draft network handling.
4. Implement the dedicated execution page with explicit execution states and error classification.
5. Upgrade result page to use backend-owned oracle/KYC/evidence data and expose export actions.
6. Fix lint and add focused tests for the new mapping/execution logic.
7. Replace shell-only test logic with cross-platform runners while preserving the existing script entry points.

## Implementation Notes

- The repository does not need a destructive rewrite. The current backend contracts and domain model are a strong base.
- The biggest issue is not “nothing works”; it is that several product-critical flows are only partially integrated, duplicated, or routed around the backend.
- Implementation should stay incremental and preserve the current RWA engine, comparison/report generation, and evidence/risk logic.
