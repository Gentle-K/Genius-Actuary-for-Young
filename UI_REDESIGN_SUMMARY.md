# UI Redesign Summary

## Brand shift

- `FinPlanner` has been replaced with `Genius Actuary`.
- The product now presents as a personal AI decision analysis workspace instead of a finance or ERP dashboard.
- Core product language now centers on `analysis`, `evidence`, `calculations`, `uncertainties`, `recommendation`, and `report`.

## Route mapping

| Old template area | New route | New product role |
| --- | --- | --- |
| Dashboard | `/new-analysis` | Start a new analysis |
| Transactions | `/sessions` | Analysis sessions list |
| Invoices | `/evidence` | Evidence library |
| Reports | `/reports` | Report library |
| Calendar | `/calculations` | Calculation workspace |
| Company and users | `/settings` | Personal settings |
| N/A | `/sessions/:sessionId` | Session detail |
| N/A | `/sessions/:sessionId/clarify` | Dynamic clarification flow |
| N/A | `/sessions/:sessionId/analyzing` | Analysis in progress |
| N/A | `/reports/:reportId` | Final report detail |

Legacy finance-oriented routes now redirect into the new structure where possible.

## Navigation

The left navigation is now:

1. `New Analysis`
2. `Sessions`
3. `Reports`
4. `Evidence`
5. `Calculations`
6. `Settings`

## Shared UI system

The redesign introduced or rebuilt these reusable product components:

- `AppShell`
- `SidebarNav`
- `TopBar`
- `PageHeader`
- `MetricCard`
- `SectionCard`
- `FilterBar`
- `SearchInput`
- `StatusBadge`
- `ConfidenceBadge`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `SourceCard`
- `ConclusionCard`
- `CalculationCard`
- `SessionCard`
- `ClarificationQuestionCard`
- `ReportSection`

## Page remap

- `Login` is now a landing + auth entry with product value framing, demo entry, and privacy/terms cues.
- `New Analysis` now starts the MVP flow directly with mode selection, problem input, optional constraints, draft persistence, recent sessions, and example reports.
- `Sessions` now shows searchable, filterable decision-analysis sessions instead of transaction history.
- `Session Detail` now summarizes status, evidence, calculations, conclusions, and next actions.
- `Clarify` now exposes the dynamic follow-up question workflow with answer, skip, draft-save, and continue actions.
- `Analyzing` now shows progress steps, live metrics, worklog, fallback states, and conclusion preview instead of a generic loader.
- `Evidence` now functions as a source library with freshness, confidence, extracted facts, and report linkage.
- `Calculations` now shows deterministic tasks, formulas, inputs, outputs, and applicability notes instead of a calendar grid.
- `Reports` now lists completed analyses with summaries and decision-facing metrics.
- `Report Detail` now renders an audit-friendly long-form report with assumptions, facts, costs, risks, scenarios, calculations, evidence, unknowns, recommendation, and disclaimer.
- `Settings` now reflects a personal product configuration surface instead of company/user administration.

## Mock data direction

- Mock sessions now reflect personal decision analysis scenarios.
- Clarification questions, evidence items, calculations, and reports follow API-shaped product objects rather than finance-template placeholders.
- Report payloads include assumptions, warnings, unknowns, option profiles, budget summaries, and evidence freshness cues for realistic frontend integration.
