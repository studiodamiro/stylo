/**
 * Pure grid-to-DOM rendering for `EditableTableWidget`: building a cell and
 * rebuilding the whole `<thead>`/`<tbody>` from the grid model. Split out of
 * `table-widget.ts` since this half needs nothing from the widget's editing /
 * focus state — just the current rows, alignments, and the `embeds` flag.
 */

import type { Align } from "../toolbar/table-grid"
import { renderInline } from "./inline-md"
import { unescapePipe } from "./table-cell-dom"

export interface CellGrid {
  rows: string[][]
  aligns: Align[]
  embeds: boolean
}

/** Draw `cell` from `grid.rows[r][c]` (read off its own `data-r`/`data-c`) —
 *  raw text when `raw`, rendered otherwise. */
export function paintCell(cell: HTMLTableCellElement, grid: CellGrid, raw: boolean): void {
  const r = Number(cell.dataset.r)
  const c = Number(cell.dataset.c)
  const text = grid.rows[r]?.[c] ?? ""
  cell.replaceChildren(
    raw ? cell.ownerDocument.createTextNode(text) : renderInline(unescapePipe(text), grid.embeds),
  )
}

function mkCell(grid: CellGrid, r: number, c: number, header: boolean): HTMLTableCellElement {
  const el = document.createElement(header ? "th" : "td")
  el.className = "cm-inplace-tcell"
  // The attribute (not just the IDL prop) makes the cell a focus target, so
  // `document.activeElement` becomes the cell and CodeMirror's `updateSelection`
  // stops forcing the DOM caret back to the (atomic) widget boundary.
  el.setAttribute("contenteditable", "true")
  el.dataset.r = String(r)
  el.dataset.c = String(c)
  const a = grid.aligns[c]
  if (a) el.style.textAlign = a
  paintCell(el, grid, false)
  return el
}

/** Rebuild `table`'s `<thead>` / `<tbody>` from the current grid model. */
export function renderTableCells(table: HTMLTableElement, grid: CellGrid): void {
  table.replaceChildren()
  const cols = grid.aligns.length
  const hr = table.createTHead().insertRow()
  for (let c = 0; c < cols; c++) hr.appendChild(mkCell(grid, 0, c, true))
  const tbody = table.createTBody()
  for (let r = 1; r < grid.rows.length; r++) {
    const tr = tbody.insertRow()
    for (let c = 0; c < cols; c++) tr.appendChild(mkCell(grid, r, c, false))
  }
}
