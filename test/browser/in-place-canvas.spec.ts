import { expect, test } from "@playwright/test"
import { line, openFixture } from "./_fixture"

test.describe("in-place canvas", () => {
  test("a heading renders larger than body text", async ({ page }) => {
    await openFixture(page, { mode: "in-place", doc: "basic" })
    const headingSize = await line(page, 0).evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    )
    const bodySize = await line(page, 4).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(headingSize).toBeGreaterThan(bodySize * 1.5)
  })

  test("reveal='caret' hides the heading marker off the line and shows it on the line", async ({
    page,
  }) => {
    await openFixture(page, { mode: "in-place", doc: "basic", reveal: "caret" })

    // Caret on a plain paragraph — the `# ` marker is replaced, not in the text.
    await line(page, 4).click()
    await expect.poll(() => line(page, 0).innerText()).toBe("Field notes")
    expect(
      await line(page, 0).evaluate((el) => !!el.querySelector('span[contenteditable="false"]')),
    ).toBe(true)

    // Caret on the heading line — the raw `# ` is revealed as editable text.
    await line(page, 0).click()
    await expect.poll(() => line(page, 0).innerText()).toBe("# Field notes")
  })

  test("emphasis markers are not shown as text off the caret", async ({ page }) => {
    await openFixture(page, { mode: "in-place", doc: "basic", reveal: "caret" })
    await line(page, 4).click() // caret away from the bold run on line 2
    const bold = page.locator(".cm-inplace-strong")
    await expect(bold).toHaveText("bold")
    await expect(line(page, 2)).not.toContainText("**")
  })
})
