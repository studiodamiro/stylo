import react from "@vitejs/plugin-react"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["test/setup.ts"],
    // Unit suite only. The Playwright specs under `test/browser/` are `*.spec.ts`
    // and run via `npm run test:browser` — never here.
    include: ["test/**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, "test/browser/**"],
  },
})
