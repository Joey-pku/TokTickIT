import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/lab-02/**/*.spec.ts', '**/lab-03/**/*.spec.ts'],
  globalSetup: './e2e/support/global-setup.ts',
  workers: 1, fullyParallel: false, retries: 0, timeout: 30000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['json', { outputFile: process.env.E2E_REPORT || 'test-results/e2e.json' }]],
  outputDir: 'test-results',
  use: { baseURL: 'http://localhost:5174', viewport: { width: 1280, height: 800 }, trace: 'retain-on-failure' },
});
