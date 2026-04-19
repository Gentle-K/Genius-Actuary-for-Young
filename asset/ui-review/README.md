# UI Review Capture Set

Captured on `2026-04-19` from the running frontend with Playwright.

Most desktop and mobile screens use the mock/demo workspace so the UI stays deterministic.
`desktop/09-execution.png` uses the verified demo execution flow so the execution desk shows a real submit/receipt surface.

## Desktop

- `01-login.png` Login page
- `02-new-analysis.png` New analysis intake
- `03-assets-hub.png` RWA asset hub
- `04-asset-proof.png` Asset proof page
- `05-sessions.png` Sessions list
- `06-clarification.png` Clarification round
- `07-reports.png` Reports list
- `08-report-detail.png` Report detail
- `09-execution.png` Execution desk
- `10-portfolio.png` Portfolio
- `11-evidence.png` Evidence library
- `12-calculations.png` Calculations
- `13-settings-dark.png` Workspace settings, dark theme
- `14-stocks-cockpit.png` Stocks trading cockpit
- `15-stocks-candidates.png` Stocks candidates
- `16-stocks-orders.png` Stocks orders and positions
- `17-stocks-settings-dark.png` Stocks settings, dark theme
- `18-settings-light.png` Workspace settings, light theme
- `19-stocks-settings-light.png` Stocks settings, light theme

## Mobile

- `01-new-analysis-mobile.png` New analysis
- `02-report-detail-mobile.png` Report detail
- `03-stocks-cockpit-mobile.png` Stocks cockpit
- `04-stocks-settings-mobile.png` Stocks settings

## Verification

- `npm --prefix frontend run lint`
- `npm --prefix frontend run test:unit`
- `npm --prefix frontend run build`
- `cd frontend && npx playwright test --config playwright.config.ts e2e/specs/shell-locale-auth.spec.ts e2e/specs/route-smoke.spec.ts`
- `cd frontend && npx playwright test --config playwright.config.ts e2e/specs/ui-review-capture.spec.ts`
