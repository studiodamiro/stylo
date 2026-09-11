import { expect, type Locator, test } from "@playwright/test"
import { openFixture } from "./_fixture"

/** The center point of a locator, for `page.mouse` — KaTeX's nested inline
 *  markup can put a locator's own coordinate-based `.click()` / `.hover()` off
 *  the glyph it actually paints, even with `force: true`; raw mouse coords at
 *  the box center land reliably. */
async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

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

  test("reveal='never' keeps inline math a widget and edits it through a click", async ({
    page,
  }) => {
    await openFixture(page, { mode: "in-place", doc: "math", reveal: "never" })
    const inline = page.locator(".cm-inplace-math:not(.cm-inplace-math-block)").first()
    await expect(inline).toBeVisible()
    // The raw source's own annotation — proof of what's currently rendered,
    // without needing to reveal the (never-revealing) source.
    await expect(inline.locator("annotation")).toHaveText("e^{i\\pi} + 1 = 0")

    const at = await centerOf(inline)
    await page.mouse.click(at.x, at.y)
    const input = page.locator(".cm-inplace-menu-input")
    await expect(input).toHaveValue("e^{i\\pi} + 1 = 0")
    await input.fill("x^2")
    await input.press("Enter")

    await expect(page.locator(".cm-inplace-menu-input")).toHaveCount(0)
    await expect(
      page.locator(".cm-inplace-math:not(.cm-inplace-math-block) annotation"),
    ).toHaveText("x^2")
  })

  test("reveal='never' — hovering inline math shows its raw source in a tooltip", async ({
    page,
  }) => {
    await openFixture(page, { mode: "in-place", doc: "math", reveal: "never" })
    const inline = page.locator(".cm-inplace-math:not(.cm-inplace-math-block)").first()
    const at = await centerOf(inline)
    await page.mouse.move(at.x, at.y)
    await expect(page.locator(".cm-inplace-href-tip")).toHaveText("e^{i\\pi} + 1 = 0")
  })

  test("a multi-line $$ block's fence click does not open the Math field", async ({ page }) => {
    await openFixture(page, { mode: "in-place", doc: "math", reveal: "never" })
    const block = page.locator(".cm-inplace-math-block").first()
    await expect(block).toBeVisible()
    const at = await centerOf(block)
    await page.mouse.click(at.x, at.y)
    await expect(page.locator(".cm-inplace-menu-input")).toHaveCount(0)
  })
})
