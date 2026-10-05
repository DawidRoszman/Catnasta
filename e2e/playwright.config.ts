import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against a Catnasta stack that's already up (`docker compose up -d --build`).
 *   BASE_URL  frontend URL (default http://localhost:3000)
 *   API_URL   API URL the tests use to set up opponents (default http://localhost:5001)
 */
export default defineConfig({
  testDir: "tests",
  // Every test signs up its own players and deals its own tables, so they can share the stack.
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
