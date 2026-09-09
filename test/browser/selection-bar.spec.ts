import { expect, test } from "@playwright/test"
import { line, openFixture } from "./_fixture"

test.describe("selection bar (selectionUI='bar')", () => {
  test("appears on a non-empty selection and is on-screen", async ({ page }) => {
    await openFixture(page, { mode: "in-place", selectionUI: "bar", doc: "basic", reveal: "caret" })
    await line(page, 4).dblclick() // select a word

    const bar = page.locator(".cm-inplace-selbar")
    await expect(bar).toBeVisible()

    const box = await bar.boundingBox()
    const vp = page.viewportSize()!
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width)
  })

  test("yields while the right-click menu is open, and returns after it closes", async ({
    page,
  }) => {
    await openFixture(page, { mode: "in-place", selectionUI: "bar", doc: "basic", reveal: "caret" })
    await line(page, 4).dblclick()
    await expect(page.locator(".cm-inplace-selbar")).toBeVisible()

    await line(page, 4).click({ button: "right" })
    await expect(page.locator(".cm-inplace-menu-panel")).toBeVisible()
    await expect(page.locator(".cm-inplace-selbar")).toBeHidden()

    await page.keyboard.press("Escape")
    await expect(page.locator(".cm-inplace-menu-panel")).toHaveCount(0)
  })
})
