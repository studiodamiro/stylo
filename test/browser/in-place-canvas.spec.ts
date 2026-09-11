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

  test("reveal='never' keeps a fenced block's ``` hidden with the caret inside it", async ({
    page,
  }) => {
    await openFixture(page, { mode: "in-place", doc: "code", reveal: "never" })

    // Caret on the code line — the fences on 4 and 6 stay collapsed.
    await line(page, 5).click()
    await expect(line(page, 5)).toHaveText("const answer = 42")
    await expect(line(page, 4)).not.toContainText("```")
    await expect(line(page, 6)).not.toContainText("```")

    // The info string is still reachable through the right-click menu.
    await line(page, 5).click({ button: "right" })
    await expect(page.locator(".cm-inplace-menu-panel")).toContainText("Language")
  })

  test("reveal='never' renders a rule as a widget and removes it from the menu", async ({
    page,
  }) => {
    await openFixture(page, { mode: "in-place", doc: "rule", reveal: "never" })

    const hr = page.locator(".cm-inplace-hr")
    await expect(hr).toHaveCount(1)
    await expect(line(page, 4)).not.toContainText("---")

    // Caret on the rule line keeps it a widget — no raw source.
    await hr.click()
    await expect(hr).toHaveCount(1)
    await expect(line(page, 4)).not.toContainText("---")

    // Right-click → Remove divider takes it out.
    await hr.click({ button: "right" })
    const panel = page.locator(".cm-inplace-menu-panel")
    await expect(panel).toContainText("Remove divider")
    await panel.getByText("Remove divider").click()
    await expect(page.locator(".cm-inplace-hr")).toHaveCount(0)
  })

  test("reveal='never' — Backspace on a clicked rule removes it", async ({ page }) => {
    await openFixture(page, { mode: "in-place", doc: "rule", reveal: "never" })
    await page.locator(".cm-inplace-hr").click()
    await page.keyboard.press("Backspace")
    await expect(page.locator(".cm-inplace-hr")).toHaveCount(0)
    await expect(page.locator(".cm-content")).not.toContainText("---")
  })
})
