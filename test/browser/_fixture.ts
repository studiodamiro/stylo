import type { Page } from "@playwright/test"

/**
 * Open the browser-test fixture (`playground/fixture.html`) with a config
 * built from query params, and wait for the editor surface to mount.
 * See the fixture file for the full param list.
 */
export async function openFixture(page: Page, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  await page.goto(`/fixture.html${qs ? `?${qs}` : ""}`)
  await page.waitForSelector("[data-stylo-mode]")
  if (params.mode === undefined || params.mode === "in-place" || params.mode === "source") {
    await page.waitForSelector(".cm-editor")
  }
}

/** The in-place canvas line at `index` (0-based). */
export const line = (page: Page, index: number) => page.locator(".cm-content .cm-line").nth(index)
