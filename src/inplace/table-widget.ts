import { Annotation } from "@codemirror/state"
import { EditorView, WidgetType } from "@codemirror/view"
import { handleCellShortcut } from "../toolbar/cell-inline"
import { type Align, serializeGrid } from "../toolbar/table-grid"
import { cellHasSelection, cellSelectionRows } from "./context-menu-actions"
import { renderInline } from "./inline-md"
import {
  gridOf,
  offsetFromPoint,
  placeCaret,
  renderedCaretOffset,
  trimGrid,
  unescapePipe,
} from "./table-cell-dom"
import { createTableGizmos, type StructOp, type TableGizmos } from "./table-gizmos"
import {
  deleteColumn,
  deleteRow,
  type GridModel,
  insertColumn,
  insertRow,
  setAlign,
} from "./table-structure"

/** Marks a transaction that came from an editable table widget's own DOM. */
export const fromTableWidget = Annotation.define<boolean>()

export interface ParsedTable {
  head: string[]
  body: string[][]
  aligns: Align[]
}

/**
 * A GFM table rendered as an editable `<table>` (`inPlace.table === "cells"`).
 * The widget owns its DOM while mounted and keeps `rows` — the raw cell strings —
 * as its source of truth. A cell shows its Markdown **rendered** (`renderInline`)
 * while unfocused and swaps to the **raw source** as a plain text node while it
 * has focus, mirroring the per-line reveal on the main canvas. Every edit
 * re-serializes `rows` into the document with the `fromTableWidget` annotation
 * so `tableField` remaps rather than rebuilds and DOM focus survives.
 *
 * The widget never stores its document range — a serialize dispatch shifts it —
 * so `bounds()` re-derives it from `posAtDOM` plus a scan of contiguous pipe
 * lines every time it is needed.
 */
export class EditableTableWidget extends WidgetType {
  private table: HTMLTableElement | null = null
  private rows: string[][]
  private editing: HTMLTableCellElement | null = null
  private syncing = false
  /** Rendered-text offset from the mousedown that is bringing a cell into edit. */
  private pendingOffset: number | null = null
  private current: string[][]
  private gizmos: TableGizmos | null = null

  constructor(readonly data: ParsedTable) {
    super()
    this.rows = gridOf(data)
    this.current = trimGrid(this.rows)
  }

  override eq(other: EditableTableWidget) {
    // While this instance owns mounted DOM, force CodeMirror to run the new
    // instance's `toDOM` on a rebuild rather than swapping the instance behind
    // the live DOM (which leaves the new one un-initialised — `table` null).
    // Widget-originated edits use the `fromTableWidget` annotation path, which
    // never calls `eq`, so this only bites on a genuine external reload.
    if (this.table) return false
    return JSON.stringify(this.current) === JSON.stringify(other.current)
  }

  override ignoreEvent() {
    return true
  }

  private cols(): number {
    return this.data.aligns.length
  }

  /**
   * The table's current `[from, to]` in the document, derived from the DOM.
   * `posAtDOM` may land on any line of the widget, so the scan grows the span in
   * both directions across contiguous non-blank pipe lines.
   */
  private bounds(view: EditorView): { from: number; to: number } {
    const doc = view.state.doc
    const pipe = (n: number) => {
      const t = doc.line(n).text
      return t.trim() !== "" && t.includes("|")
    }
    let first = doc.lineAt(view.posAtDOM(this.table!)).number
    let last = first
    while (first > 1 && pipe(first - 1)) first--
    while (last < doc.lines && pipe(last + 1)) last++
    return { from: doc.line(first).from, to: doc.line(last).to }
  }

  private cellAt(r: number, c: number): HTMLTableCellElement | null {
    if (!this.table) return null
    const row = r === 0 ? this.table.tHead!.rows[0]! : this.table.tBodies[0]!.rows[r - 1]
    return (row?.cells[c] as HTMLTableCellElement) ?? null
  }

  private coords(cell: HTMLTableCellElement): { r: number; c: number } {
    return { r: Number(cell.dataset.r), c: Number(cell.dataset.c) }
  }

  /** Draw `cell` from `rows[r][c]` — raw text when `raw`, rendered otherwise. */
  private paint(cell: HTMLTableCellElement, raw: boolean) {
    const { r, c } = this.coords(cell)
    const text = this.rows[r]?.[c] ?? ""
    cell.replaceChildren(
      raw ? cell.ownerDocument.createTextNode(text) : renderInline(unescapePipe(text)),
    )
  }

  private mkCell(r: number, c: number, header: boolean): HTMLTableCellElement {
    const el = document.createElement(header ? "th" : "td")
    el.className = "cm-inplace-tcell"
    // The attribute (not just the IDL prop) makes the cell a focus target, so
    // `document.activeElement` becomes the cell and CodeMirror's `updateSelection`
    // stops forcing the DOM caret back to the (atomic) widget boundary.
    el.setAttribute("contenteditable", "true")
    el.dataset.r = String(r)
    el.dataset.c = String(c)
    const a = this.data.aligns[c]
    if (a) el.style.textAlign = a
    this.paint(el, false)
    return el
  }

  /** Rebuild `<thead>` / `<tbody>` from the current grid model. */
  private renderCells() {
    const table = this.table!
    table.replaceChildren()
    const hr = table.createTHead().insertRow()
    for (let c = 0; c < this.cols(); c++) hr.appendChild(this.mkCell(0, c, true))
    const tbody = table.createTBody()
    for (let r = 1; r < this.rows.length; r++) {
      const tr = tbody.insertRow()
      for (let c = 0; c < this.cols(); c++) tr.appendChild(this.mkCell(r, c, false))
    }
  }

  private appendRow() {
    insertRow(this.model(), this.rows.length)
    this.renderCells()
    this.gizmos?.layout(this.table!)
  }

  private model(): GridModel {
    return { rows: this.rows, aligns: this.data.aligns }
  }

  /** Apply a structural edit from a gizmo, rebuild, restore focus, reserialize. */
  private runOp(view: EditorView, op: StructOp) {
    if (!this.table) return // a destroyed instance whose menu is still on screen
    const g = this.model()
    if (op.kind === "insertColumn") insertColumn(g, op.at)
    else if (op.kind === "deleteColumn") deleteColumn(g, op.at)
    else if (op.kind === "insertRow") insertRow(g, op.at)
    else if (op.kind === "deleteRow") deleteRow(g, op.at)
    else setAlign(g, op.at, g.aligns[op.at] === op.value ? "" : op.value)

    // Reserialise first so the document is canonical, then rebuild our own DOM
    // from the settled model — no window where the two disagree.
    this.editing = null
    this.sync(view)
    this.renderCells()
    this.gizmos?.layout(this.table!)
    if (op.kind !== "align") {
      const r = Math.max(0, Math.min(op.focus[0], this.rows.length - 1))
      const c = Math.max(0, Math.min(op.focus[1], this.cols() - 1))
      this.cellAt(r, c)?.focus()
    }
  }

  /** Commit `cell`'s edited text into `rows` and, unless it keeps focus, re-render it. */
  private finish(cell: HTMLTableCellElement, keepRaw: boolean) {
    const { r, c } = this.coords(cell)
    if (this.rows[r]) this.rows[r]![c] = (cell.textContent ?? "").replace(/\r?\n/g, " ")
    if (!keepRaw) this.paint(cell, false)
  }

  private onFocusIn(event: FocusEvent) {
    const cell = (event.target as HTMLElement).closest<HTMLTableCellElement>("td, th")
    if (!cell || cell === this.editing) return
    // Prefer the offset from the mousedown that started this focus; the DOM
    // selection isn't placed yet when `focusin` fires from a click.
    const offset = this.pendingOffset ?? renderedCaretOffset(cell)
    this.pendingOffset = null
    if (this.editing) this.finish(this.editing, false)
    this.editing = cell
    this.paint(cell, true)
    placeCaret(cell, offset)
  }

  private onFocusOut(event: FocusEvent) {
    if (this.syncing || !this.editing) return
    const to = event.relatedTarget as Node | null
    if (to && this.table?.contains(to)) return // moving to another cell — its focusin handles it
    this.finish(this.editing, false)
    this.editing = null
  }

  /** The selection as (row, col, anchor offset, head offset) within the editing cell. */
  private readCaret(): { r: number; c: number; offset: number; head: number } | null {
    if (!this.editing) return null
    const { r, c } = this.coords(this.editing)
    const sel = this.editing.ownerDocument.getSelection()
    const text = this.editing.firstChild
    const end = (this.editing.textContent ?? "").length
    const offset = sel?.anchorNode === text ? (sel?.anchorOffset ?? 0) : end
    const head = sel?.focusNode === text ? (sel?.focusOffset ?? offset) : offset
    return { r, c, offset, head }
  }

  private writeCaret(caret: { r: number; c: number; offset: number; head: number }) {
    const cell = this.cellAt(caret.r, caret.c)
    if (cell) placeCaret(cell, caret.offset, caret.head)
  }

  /** Serialize `rows` into the document. */
  private sync(view: EditorView) {
    if (!this.table) return
    const caret = this.readCaret()
    const text = serializeGrid({ rows: this.rows, aligns: this.data.aligns })
    this.current = trimGrid(this.rows)
    const { from, to } = this.bounds(view)
    if (view.state.sliceDoc(from, to) === text) return

    // `syncing` is true only across the synchronous dispatch, so a blur that
    // CodeMirror's reconciliation triggers there is ignored, while a real user
    // focusout right after still re-renders the cell.
    this.syncing = true
    view.dispatch({
      changes: { from, to, insert: text },
      annotations: fromTableWidget.of(true),
      userEvent: "input",
    })
    this.syncing = false
    if (caret) {
      this.writeCaret(caret)
      requestAnimationFrame(() => {
        if (this.table && caret) this.writeCaret(caret)
      })
    }
  }

  private onKey(event: KeyboardEvent, view: EditorView) {
    const cell = (event.target as HTMLElement).closest<HTMLTableCellElement>("td, th")
    if (!cell || !this.table) return
    // Mod-b / Mod-i / Mod-k never reach CodeMirror's keymap from inside a
    // widget (`ignoreEvent`), so the widget applies them to the cell itself.
    if (handleCellShortcut(event, cell)) {
      event.stopPropagation()
      return
    }
    const { r, c } = this.coords(cell)
    const lastRow = this.rows.length - 1

    if (event.key === "Tab") {
      event.preventDefault()
      event.stopPropagation()
      const flat = r * this.cols() + c + (event.shiftKey ? -1 : 1)
      if (flat < 0) return
      if (flat >= this.rows.length * this.cols()) {
        if (event.shiftKey) return
        this.appendRow()
        this.cellAt(lastRow + 1, 0)?.focus()
        this.sync(view)
        return
      }
      this.cellAt(Math.floor(flat / this.cols()), flat % this.cols())?.focus()
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      event.stopPropagation()
      if (r < lastRow) return this.cellAt(r + 1, c)?.focus()
      this.appendRow()
      this.cellAt(lastRow + 1, c)?.focus()
      this.sync(view)
      return
    }
    if (event.key === "ArrowDown" && r === lastRow) {
      event.preventDefault()
      event.stopPropagation()
      const { to } = this.bounds(view)
      view.focus()
      view.dispatch({ selection: { anchor: Math.min(to + 1, view.state.doc.length) } })
    }
    if (event.key === "ArrowUp" && r === 0) {
      event.preventDefault()
      event.stopPropagation()
      const { from } = this.bounds(view)
      view.focus()
      view.dispatch({ selection: { anchor: Math.max(from - 1, 0) } })
    }
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement("div")
    wrap.className = "cm-inplace-table-wrap"
    const table = document.createElement("table")
    this.table = table
    this.editing = null
    table.className = "cm-inplace-table cm-inplace-table-edit"
    this.renderCells()

    // Keep the pointer event away from CodeMirror's delegated handler: it would
    // snap the click to the atomic widget boundary and pull focus back to
    // `.cm-content`. Not `preventDefault` — the browser still focuses the cell.
    table.addEventListener("mousedown", (e) => {
      e.stopPropagation()
      const cell = (e.target as HTMLElement).closest<HTMLTableCellElement>("td, th")
      this.pendingOffset =
        cell && cell !== this.editing ? offsetFromPoint(cell, e.clientX, e.clientY) : null
    })
    table.addEventListener("focusin", (e) => this.onFocusIn(e))
    table.addEventListener("focusout", (e) => this.onFocusOut(e))
    const onEdit = (cell: HTMLTableCellElement | null) => {
      if (!cell) return
      // `focusin` normally sets `editing` first; adopt the cell if an `input`
      // somehow beat it (or a test dispatches one directly).
      this.editing = cell
      this.finish(cell, true)
      this.sync(view)
    }
    table.addEventListener("input", (e) => {
      if ((e as InputEvent).isComposing) return
      onEdit((e.target as HTMLElement).closest<HTMLTableCellElement>("td, th"))
    })
    table.addEventListener("compositionend", (e) =>
      onEdit((e.target as HTMLElement).closest<HTMLTableCellElement>("td, th")),
    )
    table.addEventListener("keydown", (e) => this.onKey(e, view))
    table.addEventListener("paste", (e) => {
      e.preventDefault()
      const text = (e.clipboardData?.getData("text/plain") ?? "").replace(/\r?\n/g, " ")
      document.execCommand("insertText", false, text)
    })
    // Right-click (and long-press on touch) opens the structural menu for the
    // cell under the pointer. With a text selection in the cell the Format group
    // (and clipboard) is appended below the row / column / align actions, so one
    // menu covers both the table and the selected characters.
    table.addEventListener("contextmenu", (e) => {
      const cell = (e.target as HTMLElement).closest<HTMLTableCellElement>("td, th")
      if (!cell) return
      e.preventDefault()
      e.stopPropagation()
      const extra = cellHasSelection(view) ? cellSelectionRows(view) : undefined
      this.gizmos?.openFor(cell, e.clientX, e.clientY, extra)
    })

    this.gizmos = createTableGizmos(document, {
      dims: () => ({
        cols: this.cols(),
        rows: this.rows.length,
        alignAt: (c) => this.data.aligns[c] ?? "",
      }),
      run: (op) => this.runOp(view, op),
    })
    wrap.append(table, this.gizmos.el)
    wrap.addEventListener("mouseenter", () => this.gizmos?.layout(table))
    requestAnimationFrame(() => this.gizmos?.layout(table))
    return wrap
  }

  override destroy() {
    this.gizmos?.destroy()
    this.gizmos = null
    this.table = null
    this.editing = null
  }
}
