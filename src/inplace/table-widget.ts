import { Annotation } from "@codemirror/state"
import { EditorView, WidgetType } from "@codemirror/view"
import { type Align, type Grid, serializeGrid } from "../toolbar/table-grid"

/** Marks a transaction that came from an editable table widget's own DOM. */
export const fromTableWidget = Annotation.define<boolean>()

export interface ParsedTable {
  head: string[]
  body: string[][]
  aligns: Align[]
}

const trimmed = (t: ParsedTable): ParsedTable => ({
  head: t.head.map((s) => s.trim()),
  body: t.body.map((r) => r.map((s) => s.trim())),
  aligns: t.aligns,
})

function focusEnd(cell: HTMLElement) {
  cell.focus()
  const range = document.createRange()
  range.selectNodeContents(cell)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/**
 * A GFM table rendered as an editable `<table>` (`inPlace.table === "cells"`).
 * The widget owns its DOM while mounted: every cell edit, row add, or paste
 * mutates the DOM, then serializes the whole table back into the document with
 * the `fromTableWidget` annotation so `tableField` remaps rather than rebuilds
 * and DOM focus survives. Document changes without the annotation (external
 * edits) rebuild the widget from scratch. `current` tracks the DOM state so a
 * post-edit rebuild still compares equal and is skipped.
 *
 * The widget never stores its document range — a serialize dispatch shifts it —
 * so `bounds()` re-derives it from `posAtDOM` plus a scan of contiguous pipe
 * lines every time it is needed.
 */
export class EditableTableWidget extends WidgetType {
  private table: HTMLTableElement | null = null
  private current: ParsedTable

  constructor(readonly data: ParsedTable) {
    super()
    this.current = trimmed(data)
  }

  override eq(other: EditableTableWidget) {
    return JSON.stringify(this.current) === JSON.stringify(trimmed(other.data))
  }

  override ignoreEvent() {
    return true
  }

  /** The table's current `[from, to]` in the document, derived from the DOM. */
  private bounds(view: EditorView): { from: number; to: number } {
    const doc = view.state.doc
    let line = doc.lineAt(view.posAtDOM(this.table!))
    const from = line.from
    let to = line.to
    while (line.number < doc.lines) {
      const next = doc.line(line.number + 1)
      if (!next.text.trim() || !next.text.includes("|")) break
      line = next
      to = line.to
    }
    return { from, to }
  }

  private mkCell(text: string, col: number, header: boolean): HTMLTableCellElement {
    const el = document.createElement(header ? "th" : "td")
    el.className = "cm-inplace-tcell"
    // The attribute (not just the IDL prop) makes the cell a focus target, so
    // `document.activeElement` becomes the cell and CodeMirror's `updateSelection`
    // stops forcing the DOM caret back to the (atomic) widget boundary.
    el.setAttribute("contenteditable", "true")
    el.textContent = text
    const a = this.data.aligns[col]
    if (a) el.style.textAlign = a
    return el
  }

  private mkRow(): HTMLTableRowElement {
    const tr = document.createElement("tr")
    for (let i = 0; i < this.data.aligns.length; i++) tr.appendChild(this.mkCell("", i, false))
    return tr
  }

  private allCells(): HTMLTableCellElement[] {
    if (!this.table) return []
    return [
      ...this.table.tHead!.rows[0]!.cells,
      ...[...this.table.tBodies[0]!.rows].flatMap((r) => [...r.cells]),
    ]
  }

  /** The caret's spot inside the table as (cell index, character offset). */
  private readCaret(): { index: number; offset: number } | null {
    if (!this.table) return null
    const sel = this.table.ownerDocument.getSelection()
    const node = sel?.anchorNode
    if (!node || !this.table.contains(node)) return null
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element)
    const cell = el?.closest("th, td") as HTMLTableCellElement | null
    if (!cell) return null
    const index = this.allCells().indexOf(cell)
    if (index < 0) return null
    const offset =
      node === cell
        ? sel!.anchorOffset === 0
          ? 0
          : (cell.textContent ?? "").length
        : sel!.anchorOffset
    return { index, offset }
  }

  /**
   * Put the caret back at (cell index, character offset). A `sync` dispatch runs
   * CodeMirror's DOM reconciliation over the replaced range, which drops the
   * selection out of the edited cell (or to the first one) — this restores it,
   * once synchronously and once after CodeMirror's post-update measure.
   */
  private writeCaret(caret: { index: number; offset: number }) {
    const cell = this.allCells()[caret.index]
    if (!cell) return
    const doc = cell.ownerDocument
    const textNode = cell.firstChild?.nodeType === Node.TEXT_NODE ? cell.firstChild : null
    const offset = Math.min(caret.offset, (cell.textContent ?? "").length)
    const range = doc.createRange()
    if (textNode) range.setStart(textNode, offset)
    else range.selectNodeContents(cell)
    range.collapse(true)
    const sel = doc.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    cell.focus()
  }

  /** Read the live DOM into a grid and push it to the document. */
  private sync(view: EditorView) {
    if (!this.table) return
    const caret = this.readCaret()
    const head = [...this.table.tHead!.rows[0]!.cells].map((c) =>
      (c.textContent ?? "").replace(/\r?\n/g, " "),
    )
    const body = [...this.table.tBodies[0]!.rows].map((r) =>
      [...r.cells].map((c) => (c.textContent ?? "").replace(/\r?\n/g, " ")),
    )
    const grid: Grid = { rows: [head, ...body], aligns: this.data.aligns }
    const text = serializeGrid(grid)
    this.current = trimmed({ head, body, aligns: this.data.aligns })
    const { from, to } = this.bounds(view)
    if (view.state.sliceDoc(from, to) === text) return
    view.dispatch({
      changes: { from, to, insert: text },
      annotations: fromTableWidget.of(true),
      userEvent: "input",
    })
    if (caret) {
      this.writeCaret(caret)
      requestAnimationFrame(() => {
        if (this.table) this.writeCaret(caret)
      })
    }
  }

  private onKey(event: KeyboardEvent, view: EditorView) {
    const cell = (event.target as HTMLElement).closest("td, th") as HTMLTableCellElement | null
    if (!cell || !this.table) return
    const cells = this.allCells()
    const i = cells.indexOf(cell)
    const row = cell.parentElement as HTMLTableRowElement
    const col = [...row.cells].indexOf(cell)

    if (event.key === "Tab") {
      event.preventDefault()
      event.stopPropagation()
      const next = event.shiftKey ? cells[i - 1] : cells[i + 1]
      if (next) return focusEnd(next)
      if (!event.shiftKey) {
        const tr = this.mkRow()
        this.table.tBodies[0]!.appendChild(tr)
        focusEnd(tr.cells[0]!)
        this.sync(view)
      }
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      event.stopPropagation()
      const below =
        row.parentElement!.tagName === "THEAD"
          ? this.table.tBodies[0]!.rows[0]
          : (row.nextElementSibling as HTMLTableRowElement | null)
      if (below) return focusEnd(below.cells[col]!)
      const tr = this.mkRow()
      this.table.tBodies[0]!.appendChild(tr)
      focusEnd(tr.cells[col]!)
      this.sync(view)
      return
    }
    const lastBodyRow = row.parentElement?.tagName === "TBODY" && row.nextElementSibling === null
    if (event.key === "ArrowDown" && lastBodyRow) {
      event.preventDefault()
      event.stopPropagation()
      const { to } = this.bounds(view)
      view.focus()
      view.dispatch({ selection: { anchor: Math.min(to + 1, view.state.doc.length) } })
    }
    if (event.key === "ArrowUp" && cell.tagName === "TH") {
      event.preventDefault()
      event.stopPropagation()
      const { from } = this.bounds(view)
      view.focus()
      view.dispatch({ selection: { anchor: Math.max(from - 1, 0) } })
    }
  }

  toDOM(view: EditorView) {
    const table = document.createElement("table")
    this.table = table
    table.className = "cm-inplace-table cm-inplace-table-edit"

    const hr = table.createTHead().insertRow()
    this.data.head.forEach((t, i) => hr.appendChild(this.mkCell(t, i, true)))
    const tbody = table.createTBody()
    for (const bodyRow of this.data.body) {
      const tr = tbody.insertRow()
      for (let i = 0; i < this.data.aligns.length; i++) {
        tr.appendChild(this.mkCell(bodyRow[i] ?? "", i, false))
      }
    }

    // Keep the pointer event away from CodeMirror's delegated handler: it would
    // snap the click to the atomic widget boundary and pull focus back to
    // `.cm-content`, landing the caret in the first cell. Not `preventDefault` —
    // the browser still focuses the clicked cell and places the caret there.
    table.addEventListener("mousedown", (e) => e.stopPropagation())

    table.addEventListener("input", (e) => {
      if ((e as InputEvent).isComposing) return
      this.sync(view)
    })
    table.addEventListener("compositionend", () => this.sync(view))
    table.addEventListener("keydown", (e) => this.onKey(e, view))
    table.addEventListener("paste", (e) => {
      e.preventDefault()
      const text = (e.clipboardData?.getData("text/plain") ?? "").replace(/\r?\n/g, " ")
      document.execCommand("insertText", false, text)
    })
    return table
  }

  override destroy() {
    this.table = null
  }
}
