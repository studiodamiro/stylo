import { expect, test } from "@playwright/test"
import { openFixture } from "./_fixture"

test.describe("KaTeX math", () => {
  test("renders a display block in preview with real dimensions", async ({ page }) => {
    await openFixture(page, { mode: "preview", doc: "math" })
    const display = page.locator(".katex-display").first()
    await expect(display).toBeVisible()
    const box = (await display.boundingBox())!
    expect(box.width).toBeGreaterThan(20)
    expect(box.height).toBeGreaterThan(10)
  })

  test("renders inline and block math on the in-place canvas", async ({ page }) => {
    await openFixture(page, { mode: "in-place", doc: "math", reveal: "caret" })
    // Caret away from the math so the rendered form (not the source) is shown.
    await page.locator(".cm-content .cm-line").nth(0).click()
    await expect(page.locator(".cm-content .katex").first()).toBeVisible()
    expect(await page.locator(".cm-content .katex").count()).toBeGreaterThanOrEqual(2)
  })
})
