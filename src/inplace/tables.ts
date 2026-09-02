import { syntaxTree } from "@codemirror/language"
import { type EditorState, type Range, StateField, type Text } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view"
import type { SyntaxNode } from "@lezer/common"
import { type Align, parseGrid } from "../toolbar/table-grid"
import { inPlaceConfigFacet, tableEditingFacet } from "./config"
import { frontmatterRange } from "./frontmatter"
import { revealedLines } from "./reveal"
import { EditableTableWidget, fromTableWidget, type ParsedTable } from "./table-widget"

/**
 * A GFM pipe table rendered as a real `<table>`. Cell text is shown verbatim —
 * inline formatting inside cells (`**bold**`, `` `code` ``, links, math) is a
 * follow-up; the caret entering any table line reveals the full source.
 */
class TableWidget extends WidgetType {
  constructor(readonly table: ParsedTable) {
    super()
  }

  override eq(other: TableWidget) {
    return JSON.stringify(this.table) === JSON.stringify(other.table)
  }

  toDOM() {
    const { head, body, aligns } = this.table
    const el = document.createElement("table")
    el.className = "cm-inplace-table"

    const hr = el.createTHead().insertRow()
    head.forEach((text, i) => {
      const th = document.createElement("th")
      th.textContent = text
      th.dataset.styloRow = "0"
      th.dataset.styloCol = String(i)
      align(th, aligns[i])
      hr.appendChild(th)
    })

    const tbody = el.createTBody()
    body.forEach((row, r) => {
      const tr = tbody.insertRow()
      for (let i = 0; i < head.length; i++) {
        const td = tr.insertCell()
        td.textContent = row[i] ?? ""
        td.dataset.styloRow = String(r + 1)
        td.dataset.styloCol = String(i)
        align(td, aligns[i])
      }
    })
    return el
  }

  override ignoreEvent() {
    return false
  }
}

function align(cell: HTMLTableCellElement, value: Align | undefined) {
  if (value) cell.style.textAlign = value
}

/**
 * Parse a `Table` syntax node into `{ head, body, aligns }` by pipe-splitting
 * its raw lines. The Lezer parser omits a `TableCell` node for a whitespace-only
 * cell, so a tree-based read collapses `| | x |` to a single column — pull the
 * cells from the text instead, reusing the toolbar's grid parser.
 */
function parseTable(node: SyntaxNode, doc: Text): ParsedTable | null {
  const first = doc.lineAt(node.from).number
  const last = doc.lineAt(node.to).number
  const lines: string[] = []
  for (let n = first; n <= last; n++) lines.push(doc.line(n).text)

  const grid = parseGrid(lines)
  if (!grid || grid.rows.length === 0) return null
  return { head: grid.rows[0]!, body: grid.rows.slice(1), aligns: grid.aligns }
}

function build(state: EditorState): DecorationSet {
  if (!state.facet(inPlaceConfigFacet).tables) return Decoration.none
  const editable = state.facet(tableEditingFacet) === "cells"
  const tree = syntaxTree(state)
  const fm = frontmatterRange(state.doc)
  const revealed = editable ? null : revealedLines(state)
  const out: Range<Decoration>[] = []

  tree.iterate({
    enter: (node) => {
      if (node.name !== "Table") return undefined
      if (fm && node.from < fm.to) return false

      // In "cells" mode the editable widget stays mounted; the caret lives in
      // its contentEditable cells, so there is no source to reveal.
      if (revealed) {
        const first = state.doc.lineAt(node.from).number
        const last = state.doc.lineAt(node.to).number
        for (let n = first; n <= last; n++) {
          if (revealed.has(n)) return false
        }
      }

      const parsed = parseTable(node.node, state.doc)
      if (parsed) {
        const widget = editable ? new EditableTableWidget(parsed) : new TableWidget(parsed)
        out.push(Decoration.replace({ widget, block: true }).range(node.from, node.to))
      }
      return false
    },
  })

  return Decoration.set(out, true)
}

/**
 * Renders GFM tables in place. A state field, not the view plugin, because the
 * replacement spans line breaks. The whole document is scanned — tables are few.
 */
export const tableField = StateField.define<DecorationSet>({
  create: build,
  update: (value, tr) => {
    // An edit from the editable widget's own DOM: keep the widget instance
    // (and its focused cell) by mapping the existing decoration through the
    // change instead of rebuilding. The block-replace range maps cleanly —
    // its `from` side is negative (→ change start), its `to` side positive
    // (→ change end) — so the mapped span is exactly the new table.
    if (tr.annotation(fromTableWidget)) return value.map(tr.changes)
    return tr.docChanged || tr.selection ? build(tr.state) : value
  },
  provide: (field) => [
    EditorView.decorations.from(field),
    EditorView.atomicRanges.of((view) => view.state.field(field)),
  ],
})
