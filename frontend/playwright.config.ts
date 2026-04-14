import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/specs',
  outputDir: '../test-results/e2e/artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['list'],
    ['json', { outputFile: '../test-results/e2e/playwright.json' }],
    ['html', { outputFolder: '../reports/playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4273',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        'APP_ENV=test DEBUG_USERNAME=debug-admin DEBUG_PASSWORD=codex-e2e-secret ANALYSIS_ADAPTER=mock SEARCH_ADAPTER=mock CHART_ADAPTER=structured CALCULATION_MCP_ENABLED=true SESSION_DB_PATH=/tmp/genius-actuary-e2e.db /Users/kk./Desktop/Gay/.venv-backend/bin/python -m uvicorn app.main:app --app-dir /Users/kk./Desktop/Gay/backend --host 127.0.0.1 --port 8010',
      url: 'http://127.0.0.1:8010/health',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        'VITE_PROXY_TARGET=http://127.0.0.1:8010 VITE_WS_PROXY_TARGET=ws://127.0.0.1:8010 npm run dev -- --mode test --host 127.0.0.1 --port 4273',
      url: 'http://127.0.0.1:4273',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
