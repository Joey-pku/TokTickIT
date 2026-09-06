import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e/lab-02', globalSetup: './e2e/support/global-setup.ts',
  workers: 1, fullyParallel: false, retries: 0, timeout: 30000,
  expect: { timeout: 2000 },
  reporter: [['list'], ['json', { outputFile: process.env.E2E_REPORT || 'artifacts/lab-02/results/e2e.json' }]],
  outputDir: 'test-results',
  use: { baseURL: 'http://127.0.0.1:5174', viewport: { width: 1280, height: 800 }, trace: 'retain-on-failure' },
});
