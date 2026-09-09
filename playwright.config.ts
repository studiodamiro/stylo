import { defineConfig, devices } from "@playwright/test"

/**
 * Browser tests — the coverage jsdom cannot give. The in-place canvas is layout
 * and interaction: caret-driven marker reveal, `coordsAtPos` click mapping,
 * floating-popup positioning, the sticky-toolbar rAF watchdog, real KaTeX
 * rendering. Every one of those has been verified by hand against Chrome before;
 * this makes it a gate instead.
 *
 * The unit suite (`npm run test`, Vitest + jsdom) stays the first line of
 * defence — fast, no browser. These specs are `*.spec.ts` under `test/browser/`
 * so the two never overlap.
 */
const PORT = 5199

export default defineConfig({
  testDir: "test/browser",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/fixture.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
