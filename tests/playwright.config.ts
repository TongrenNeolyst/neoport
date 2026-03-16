import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "../temp/test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Hide Next.js dev overlay during tests
    contextOptions: {
      hasTouch: false,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "cd ../web && NEXT_PRIVATE_DISABLE_DEV_OVERLAY=1 pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
