import { expect, test } from "@playwright/test"
import { openFixture } from "./_fixture"

test.describe("[[wikilink]] autocomplete", () => {
  test("typing inside [[ opens the popup, and accepting inserts a closed link", async ({
    page,
  }) => {
    await openFixture(page, { mode: "source", wikilinks: "1", doc: "basic" })
    await page.locator(".cm-content .cm-line").first().click()
    await page.keyboard.press("End")
    await page.keyboard.type(" [[Guide/API")

    const popup = page.locator(".cm-tooltip-autocomplete")
    await expect(popup).toBeVisible()
    await expect(popup.locator("li")).toHaveText(["Guide/API Reference"])

    // Click the row rather than pressing Enter: the keymap ignores Enter for
    // ~75ms after the popup opens (interactionDelay), which the CI runner hits.
    await popup.locator("li").first().click()
    await expect(page.locator(".cm-content .cm-line").first()).toHaveText(
      "# Field notes [[Guide/API Reference]]",
    )
  })

  test("no popup without a wikiLinkSource", async ({ page }) => {
    await openFixture(page, { mode: "source", doc: "basic" })
    await page.locator(".cm-content .cm-line").first().click()
    await page.keyboard.press("End")
    await page.keyboard.type(" [[Guide")
    await expect(page.locator(".cm-tooltip-autocomplete")).toHaveCount(0)
  })

  test("works on the in-place canvas too", async ({ page }) => {
    await openFixture(page, { mode: "in-place", wikilinks: "1", doc: "basic" })
    await page.locator(".cm-content .cm-line").nth(4).click()
    await page.keyboard.press("End")
    await page.keyboard.type(" [[Getting")

    const popup = page.locator(".cm-tooltip-autocomplete")
    await expect(popup).toBeVisible()
    await popup.locator("li").first().click()
    await expect(page.locator(".cm-content .cm-line").nth(4)).toContainText("[[Getting Started]]")
  })
})
