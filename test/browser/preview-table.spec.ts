import { expect, test } from "@playwright/test"
import { openFixture } from "./_fixture"

test.describe("preview table width", () => {
  test("a host's width:100% on <table> reaches the real rendered grid, not just a disconnected outer box", async ({
    page,
  }) => {
    await openFixture(page, { mode: "preview", doc: "table" })
    // Mirrors a host forcing the table itself full width (Sympose does this
    // with `!important`). Before the wrapper, `display: block` directly on
    // `<table>` disabled its table-layout algorithm, so this stretched only
    // the outer box while the actual grid stayed content-sized underneath.
    await page.addStyleTag({ content: `table { width: 100% !important; }` })

    const table = page.locator(".stylo table")
    const firstRow = page.locator(".stylo table tr").first()
    expect(await table.evaluate((el) => getComputedStyle(el).display)).toBe("table")

    const tableBox = (await table.boundingBox())!
    const rowBox = (await firstRow.boundingBox())!
    // The rendered grid (a row's own box) now matches the table's box —
    // previously this gap was the full reserved/disconnected width.
    expect(Math.abs(tableBox.width - rowBox.width)).toBeLessThan(2)
  })

  test("a table wider than its column still scrolls on the wrapper, not the whole preview", async ({
    page,
  }) => {
    await openFixture(page, { mode: "preview", doc: "table" })
    await page.addStyleTag({ content: `table { width: 1400px !important; }` })

    const wrap = page.locator(".stylo .stylo-table-wrap")
    const scrollWidth = await wrap.evaluate((el) => el.scrollWidth)
    const wrapBox = (await wrap.boundingBox())!
    expect(scrollWidth).toBeGreaterThan(1300)
    // The wrap's own visible box stays clamped to its column, even though its
    // scrollable content is much wider.
    expect(wrapBox.width).toBeLessThan(900)
  })
})
