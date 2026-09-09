import { expect, test } from "@playwright/test"
import { openFixture } from "./_fixture"

test.describe("sticky toolbar", () => {
  test("stays pinned to the top through a window scroll", async ({ page }) => {
    await openFixture(page, { mode: "in-place", sticky: "top", doc: "long" })
    const toolbar = page.locator('[role="toolbar"][aria-label="Formatting"]')
    await expect(toolbar).toBeVisible()

    const topBefore = (await toolbar.boundingBox())!.y
    expect(topBefore).toBeLessThanOrEqual(1)

    await page.mouse.wheel(0, 1500)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500)
    // Give the rAF visibility watchdog a couple of frames to re-assert.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    )

    const topAfter = (await toolbar.boundingBox())!.y
    expect(topAfter).toBeLessThanOrEqual(1)
    await expect(toolbar).toBeVisible()
  })
})
