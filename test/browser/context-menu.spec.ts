import { expect, test } from "@playwright/test"
import { line, openFixture } from "./_fixture"

test.describe("in-place right-click menu", () => {
  test("opens on right-click and suppresses the native menu", async ({ page }) => {
    await openFixture(page, { mode: "in-place", doc: "basic" })
    await line(page, 4).click({ button: "right" })
    await expect(page.locator(".cm-inplace-menu-panel")).toBeVisible()
  })

  test("stays within the viewport when opened near the right edge", async ({ page }) => {
    await openFixture(page, { mode: "in-place", doc: "basic" })
    const target = line(page, 4)
    const box = (await target.boundingBox())!
    // Right-click as far right as the line reaches.
    await target.click({ button: "right", position: { x: box.width - 2, y: box.height / 2 } })

    const panel = page.locator(".cm-inplace-menu-panel")
    await expect(panel).toBeVisible()
    const pb = (await panel.boundingBox())!
    const vp = page.viewportSize()!
    expect(pb.x).toBeGreaterThanOrEqual(0)
    expect(pb.y).toBeGreaterThanOrEqual(0)
    expect(pb.x + pb.width).toBeLessThanOrEqual(vp.width + 1)
    expect(pb.y + pb.height).toBeLessThanOrEqual(vp.height + 1)
  })

  test("dismisses on outside click", async ({ page }) => {
    await openFixture(page, { mode: "in-place", doc: "basic" })
    await line(page, 4).click({ button: "right" })
    await expect(page.locator(".cm-inplace-menu-panel")).toBeVisible()
    await page.mouse.click(5, 5)
    await expect(page.locator(".cm-inplace-menu-panel")).toHaveCount(0)
  })
})
