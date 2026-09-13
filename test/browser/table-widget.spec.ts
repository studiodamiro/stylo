import { expect, test } from "@playwright/test"
import { openFixture } from "./_fixture"

test.describe("editable table widget (table=cells)", () => {
  test("ArrowDown out of the last row lands below the table, not above it, when nothing follows it", async ({
    page,
  }) => {
    await openFixture(page, { mode: "in-place", doc: "table", table: "cells" })
    const table = page.locator(".cm-inplace-table-edit")
    await expect(table).toBeVisible()
    const tableBox = (await table.boundingBox())!

    const lastCell = table.locator("tbody tr:last-child td").last()
    await lastCell.click()
    await page.keyboard.press("End")
    await page.keyboard.press("ArrowDown")

    // The table widget stays mounted (no row got appended, no content lost),
    // and the caret's line now renders below it — not snapped back above it,
    // which is what an atomic-range boundary with nothing past it used to do.
    await expect(table).toBeVisible()
    const line = page.locator(".cm-content .cm-line").last()
    const lineBox = (await line.boundingBox())!
    expect(lineBox.y).toBeGreaterThan(tableBox.y + tableBox.height - 1)
  })
})
