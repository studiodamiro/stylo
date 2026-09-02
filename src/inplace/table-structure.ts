import type { Align } from "../toolbar/table-grid"

/**
 * The editable table's grid model: `rows` is `[header, ...body]` as raw cell
 * strings, `aligns` is one entry per column. Every operation here mutates both
 * in place and keeps them dimensionally consistent, so the widget can hand the
 * result straight to `serializeGrid`. The guards keep the table well-formed —
 * always a header, at least one body row, at least one column.
 */
export interface GridModel {
  rows: string[][]
  aligns: Align[]
}

const cols = (g: GridModel): number => g.aligns.length

/** Insert a blank column before index `at` (`at === cols` appends). */
export function insertColumn(g: GridModel, at: number): void {
  const i = Math.max(0, Math.min(at, cols(g)))
  for (const row of g.rows) row.splice(i, 0, "")
  g.aligns.splice(i, 0, "")
}

/** Remove column `at`, unless it is the only one. */
export function deleteColumn(g: GridModel, at: number): void {
  if (cols(g) <= 1 || at < 0 || at >= cols(g)) return
  for (const row of g.rows) row.splice(at, 1)
  g.aligns.splice(at, 1)
}

/** Insert a blank body row before index `at` (`at === rows.length` appends). */
export function insertRow(g: GridModel, at: number): void {
  const i = Math.max(1, Math.min(at, g.rows.length)) // never above the header
  g.rows.splice(i, 0, new Array(cols(g)).fill(""))
}

/** Remove row `at`, unless it is the header or the last remaining body row. */
export function deleteRow(g: GridModel, at: number): void {
  if (at <= 0 || at >= g.rows.length || g.rows.length <= 2) return
  g.rows.splice(at, 1)
}

/** Set column `c`'s alignment (`""` clears it back to default). */
export function setAlign(g: GridModel, c: number, align: Align): void {
  if (c >= 0 && c < cols(g)) g.aligns[c] = align
}
