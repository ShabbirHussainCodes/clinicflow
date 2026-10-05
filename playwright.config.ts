import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

import { AUTOMATION_E2E } from "./e2e/automation-config";

// Local Supabase connection details written by `npm run env:local`.
loadEnv({ path: ".env.local", quiet: true });

/**
 * End-to-end tests run against a PRODUCTION build (`next build && next start`) so the real
 * Content-Security-Policy, caching and bundling behaviour is exercised, and against the LOCAL
 * Supabase stack (`npm run db:start` must be running). See docs/TESTING.md.
 *
 * Optional overrides:
 *   E2E_PORT              port for the app server (default 3100)
 *   E2E_CHROMIUM_PATH     path to a Chromium binary when Playwright's own download is unavailable
 *   E2E_SKIP_BUILD=1      reuse an existing .next build
 */
const port = Number(process.env.E2E_PORT ?? 3100);
const chromiumPath = process.env.E2E_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
      testIgnore: /.*\.mobile\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /.*\.mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: process.env.E2E_SKIP_BUILD
      ? `npm run start -- --port ${port}`
      : `npm run build && npm run start -- --port ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      // Generous limit so repeated test bookings are not throttled.
      BOOKING_RATE_LIMIT_PER_HOUR: "1000",
      LOGIN_ATTEMPTS_PER_15_MIN: "1000",
      // Automation dispatcher pointed at a local receiver started by e2e/automation.spec.ts.
      CRON_SECRET: AUTOMATION_E2E.cronSecret,
      N8N_WEBHOOK_SECRET: AUTOMATION_E2E.webhookSecret,
      N8N_WEBHOOK_AUTH_TOKEN: AUTOMATION_E2E.authToken,
      N8N_WEBHOOK_URL: `http://127.0.0.1:${AUTOMATION_E2E.receiverPort}${AUTOMATION_E2E.receiverPath}`,
      SHOW_DEMO_NOTICE: "true",
    },
  },
});
