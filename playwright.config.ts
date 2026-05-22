import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  reporter: 'line',
  timeout: 45_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:8788',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run build && pnpm exec wrangler dev server-build/index.js --port 8788 --var SESSION_SECRET:local-dev-secret',
    url: 'http://127.0.0.1:8788',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
