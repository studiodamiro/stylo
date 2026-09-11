/**
 * Pure DOM-selection reading for a table cell — the part of
 * `EditableTableWidget.readCaret` that doesn't need the widget's row/col
 * bookkeeping. Split out of `table-widget.ts`.
 */

/** The selection's offset (and, if different, its head) within `cell`'s text. */
export function caretInCell(cell: HTMLTableCellElement): { offset: number; head: number } {
  const sel = cell.ownerDocument.getSelection()
  const text = cell.firstChild
  const end = (cell.textContent ?? "").length
  const offset = sel?.anchorNode === text ? (sel?.anchorOffset ?? 0) : end
  const head = sel?.focusNode === text ? (sel?.focusOffset ?? offset) : offset
  return { offset, head }
}
