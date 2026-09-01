import { syntaxTree } from "@codemirror/language"
import { type EditorState, type Range, StateField, type Text } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view"
import type { SyntaxNode } from "@lezer/common"
import { frontmatterRange } from "./frontmatter"
import { revealedLines } from "./reveal"

type Align = "" | "left" | "center" | "right"

interface ParsedTable {
  head: string[]
  body: string[][]
  aligns: Align[]
}

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
      align(th, aligns[i])
      hr.appendChild(th)
    })

    const tbody = el.createTBody()
    for (const row of body) {
      const tr = tbody.insertRow()
      for (let i = 0; i < head.length; i++) {
        const td = tr.insertCell()
        td.textContent = row[i] ?? ""
        align(td, aligns[i])
      }
    }
    return el
  }

  override ignoreEvent() {
    return false
  }
}

function align(cell: HTMLTableCellElement, value: Align | undefined) {
  if (value) cell.style.textAlign = value
}

function alignOf(segment: string): Align {
  const left = segment.startsWith(":")
  const right = segment.endsWith(":")
  return left && right ? "center" : right ? "right" : left ? "left" : ""
}

function cellsOf(row: SyntaxNode, doc: Text): string[] {
  return row.getChildren("TableCell").map((c) => doc.sliceString(c.from, c.to).trim())
}

function parseTable(table: SyntaxNode, doc: Text): ParsedTable | null {
  const header = table.getChild("TableHeader")
  if (!header) return null

  const delimiter = table
    .getChildren("TableDelimiter")
    .find((d) => doc.sliceString(d.from, d.to).includes("-"))
  const aligns = delimiter
    ? doc
        .sliceString(delimiter.from, delimiter.to)
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(alignOf)
    : []

  return {
    head: cellsOf(header, doc),
    body: table.getChildren("TableRow").map((r) => cellsOf(r, doc)),
    aligns,
  }
}

function build(state: EditorState): DecorationSet {
  const tree = syntaxTree(state)
  const fm = frontmatterRange(state.doc)
  const revealed = revealedLines(state)
  const out: Range<Decoration>[] = []

  tree.iterate({
    enter: (node) => {
      if (node.name !== "Table") return undefined
      if (fm && node.from < fm.to) return false

      const first = state.doc.lineAt(node.from).number
      const last = state.doc.lineAt(node.to).number
      for (let n = first; n <= last; n++) {
        if (revealed.has(n)) return false
      }

      const parsed = parseTable(node.node, state.doc)
      if (parsed) {
        out.push(
          Decoration.replace({ widget: new TableWidget(parsed), block: true }).range(
            node.from,
            node.to,
          ),
        )
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
  update: (value, tr) => (tr.docChanged || tr.selection ? build(tr.state) : value),
  provide: (field) => [
    EditorView.decorations.from(field),
    EditorView.atomicRanges.of((view) => view.state.field(field)),
  ],
})
