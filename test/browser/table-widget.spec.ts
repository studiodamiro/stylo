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

  test("a host that stretches the wrap to 100% gets a table flush with its outer edge, gizmos intact", async ({
    page,
  }) => {
    await openFixture(page, { mode: "in-place", doc: "table", table: "cells" })
    // Mirrors a host making an in-place table span its full column width, the
    // way `preview`'s unwrapped `<table>` already does by default.
    await page.addStyleTag({
      content: `
        .cm-inplace-table-wrap { display: block; width: 100%; box-sizing: border-box; }
        .cm-inplace-table { width: 100%; }
      `,
    })
    const wrap = page.locator(".cm-inplace-table-wrap")
    const table = page.locator(".cm-inplace-table")
    const wrapBox = (await wrap.boundingBox())!
    const tableBox = (await table.boundingBox())!

    // The table itself reaches the wrap's real outer edge — no gap held open
    // by the gizmo gutter, which the wrap's own `width: 100%` used to shrink
    // the table by (`.cm-inplace-table-wrap`'s reserved right-hand padding).
    expect(tableBox.x).toBeCloseTo(wrapBox.x, 0)
    expect(tableBox.x + tableBox.width).toBeCloseTo(wrapBox.x + wrapBox.width, 0)

    // The add-column strip still renders past the table's right edge and is
    // genuinely hit-testable there, not clipped by the now-unpadded wrap.
    await wrap.hover()
    const addCol = page.locator(".cm-inplace-tg-addcol")
    const colBox = (await addCol.boundingBox())!
    expect(colBox.x).toBeGreaterThanOrEqual(tableBox.x + tableBox.width - 1)
    const hit = await page.evaluate(
      ({ cx, cy }) => (document.elementFromPoint(cx, cy) as HTMLElement | null)?.className ?? null,
      { cx: colBox.x + colBox.width / 2, cy: colBox.y + colBox.height / 2 },
    )
    expect(hit).toContain("cm-inplace-tg-addcol")

    // And it still works: clicking it inserts a column.
    const colsBefore = await table.locator("thead th").count()
    await addCol.click()
    await expect(table.locator("thead th")).toHaveCount(colsBefore + 1)
  })
})
