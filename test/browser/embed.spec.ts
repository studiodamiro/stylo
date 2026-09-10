import { expect, test } from "@playwright/test"
import { line, openFixture } from "./_fixture"

test.describe("![[embed]] on the in-place canvas", () => {
  test("portals the host node into a slot in the canvas", async ({ page }) => {
    await openFixture(page, { mode: "in-place", doc: "embed", embed: "1" })
    // Caret away from the embed line so the rendered form shows.
    await line(page, 0).click()

    const body = page.locator(".cm-content .cm-inplace-embed .fixture-embed")
    await expect(body).toBeVisible()
    await expect(body).toContainText("embed: Weekly note")
  })

  test("reveals the raw source when the caret is on the line", async ({ page }) => {
    await openFixture(page, { mode: "in-place", doc: "embed", embed: "1" })
    await line(page, 0).click()
    await expect(page.locator(".cm-inplace-embed .fixture-embed")).toBeVisible()

    // Click the slot's own box (not the host content) to drop the caret on the line.
    await page.locator(".cm-content .cm-inplace-embed").click({ position: { x: 2, y: 2 } })
    await expect(page.locator(".cm-inplace-embed")).toHaveCount(0)
    await expect(line(page, 4)).toHaveText("![[Weekly note]]")
  })

  test("interactive host content keeps its own clicks", async ({ page }) => {
    await openFixture(page, { mode: "in-place", doc: "embed", embed: "1" })
    await line(page, 0).click()

    const button = page.locator(".cm-inplace-embed .fixture-embed button")
    await button.click()
    // The click did not collapse the embed to raw source.
    await expect(page.locator(".cm-inplace-embed .fixture-embed")).toBeVisible()
  })

  test("without embedSource the reference stays a literal ! plus a wikilink chip", async ({
    page,
  }) => {
    await openFixture(page, { mode: "in-place", doc: "embed" })
    await line(page, 0).click()

    await expect(page.locator(".cm-inplace-embed")).toHaveCount(0)
    await expect(page.locator(".cm-content .cm-inplace-wikilink")).toHaveText("Weekly note")
  })
})
