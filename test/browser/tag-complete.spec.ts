import { expect, test } from "@playwright/test"
import { openFixture } from "./_fixture"

test.describe("#tag autocomplete", () => {
  test("typing after # opens the popup, and accepting inserts the tag", async ({ page }) => {
    await openFixture(page, { mode: "source", tags: "1", doc: "basic" })
    await page.locator(".cm-content .cm-line").first().click()
    await page.keyboard.press("End")
    await page.keyboard.type(" #proj")

    const popup = page.locator(".cm-tooltip-autocomplete")
    await expect(popup).toBeVisible()
    await expect(popup.locator("li")).toHaveText(["project", "project/urgent"])

    // Click the row rather than pressing Enter: the keymap ignores Enter for
    // ~75ms after the popup opens (interactionDelay), which the CI runner hits.
    await popup.locator("li").first().click()
    await expect(page.locator(".cm-content .cm-line").first()).toHaveText("# Field notes #project")
  })

  test("no popup without a tagSource", async ({ page }) => {
    await openFixture(page, { mode: "source", doc: "basic" })
    await page.locator(".cm-content .cm-line").first().click()
    await page.keyboard.press("End")
    await page.keyboard.type(" #proj")
    await expect(page.locator(".cm-tooltip-autocomplete")).toHaveCount(0)
  })

  test("works on the in-place canvas too", async ({ page }) => {
    await openFixture(page, { mode: "in-place", tags: "1", doc: "basic" })
    await page.locator(".cm-content .cm-line").nth(4).click()
    await page.keyboard.press("End")
    await page.keyboard.type(" #recipe")

    const popup = page.locator(".cm-tooltip-autocomplete")
    await expect(popup).toBeVisible()
    await popup.locator("li").first().click()
    await expect(page.locator(".cm-content .cm-line").nth(4)).toContainText("#recipe")
  })
})
