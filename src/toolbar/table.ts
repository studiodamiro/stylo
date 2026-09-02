import {
  ChangeSet,
  EditorSelection,
  EditorState,
  type Extension,
  type Text,
} from "@codemirror/state"
import { keymap } from "@codemirror/view"
import type { EditorView } from "@codemirror/view"
import { cellBounds, type Grid, parseGrid, serializeGrid } from "./table-grid"

interface Region {
  from: number
  to: number
  lines: string[]
}

/** The contiguous pipe-table block containing `pos`, if it parses as a table. */
export function findTable(doc: Text, pos: number): Region | null {
  const at = doc.lineAt(pos)
  if (!at.text.includes("|")) return null
  let first = at.number
  while (first > 1) {
    const t = doc.line(first - 1).text
    if (!t.includes("|") || !t.trim()) break
    first--
  }
  let last = at.number
  while (last < doc.lines) {
    const t = doc.line(last + 1).text
    if (!t.includes("|") || !t.trim()) break
    last++
  }
  if (last - first < 1) return null
  const lines: string[] = []
  for (let n = first; n <= last; n++) lines.push(doc.line(n).text)
  if (!parseGrid(lines)) return null
  return { from: doc.line(first).from, to: doc.line(last).to, lines }
}

interface CellLoc {
  row: number // index into grid.rows (header = 0)
  col: number
  offset: number // char offset within the cell's trimmed content
  onDelimiter: boolean
}

function locate(lines: string[], from: number, caret: number): CellLoc | null {
  let lineStart = from
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (caret <= lineStart + line.length) {
      const x = caret - lineStart
      if (i === 1) {
        let pipes = 0
        for (let k = 0; k < x && k < line.length; k++) if (line[k] === "|") pipes++
        return { row: 0, col: Math.max(0, pipes - 1), offset: 0, onDelimiter: true }
      }
      const bounds = cellBounds(line)
      let col = 0
      for (let c = 0; c < bounds.length; c++) {
        col = c
        if (x <= bounds[c]!.end) break
      }
      const b = bounds[col]
      const offset = b ? Math.max(0, Math.min(x, b.contentEnd) - b.contentStart) : 0
      return { row: i === 0 ? 0 : i - 1, col, offset, onDelimiter: false }
    }
    lineStart += line.length + 1
  }
  return null
}

function resolve(text: string, from: number, loc: CellLoc): number {
  const lines = text.split("\n")
  const idx = loc.onDelimiter ? 1 : loc.row === 0 ? 0 : loc.row + 1
  let pos = from
  for (let i = 0; i < idx; i++) pos += lines[i]!.length + 1
  const bounds = cellBounds(lines[idx]!)
  const b = bounds[Math.min(loc.col, bounds.length - 1)]
  if (!b) return pos
  return pos + b.contentStart + Math.min(loc.offset, b.contentEnd - b.contentStart)
}

const SKELETON = "| Column 1 | Column 2 |\n| -------- | -------- |\n|          |          |"

/** Insert a starter table at the cursor and select the first header cell. */
export function insertTable(view: EditorView): boolean {
  const { from, to } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const lead = line.text.slice(0, from - line.from).trim() ? "\n\n" : ""
  const cellAt = from + lead.length + 2 // past "| "
  view.dispatch({
    changes: { from, to, insert: lead + SKELETON + "\n" },
    selection: EditorSelection.range(cellAt, cellAt + 8), // "Column 1"
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/** True when the primary caret is inside a pipe table. */
export function tableActive(state: EditorState): boolean {
  return findTable(state.doc, state.selection.main.head) !== null
}

/** Rewrite the table to an aligned grid and move the caret to `target` cell. */
function navigate(view: EditorView, target: (grid: Grid, loc: CellLoc) => CellLoc | null): boolean {
  const region = findTable(view.state.doc, view.state.selection.main.head)
  if (!region) return false
  const grid = parseGrid(region.lines)
  const loc = locate(region.lines, region.from, view.state.selection.main.head)
  if (!grid || !loc) return false
  const next = target(grid, loc)
  if (!next) return false
  const aligned = serializeGrid(grid)
  view.dispatch({
    changes: { from: region.from, to: region.to, insert: aligned },
    selection: EditorSelection.cursor(resolve(aligned, region.from, next)),
    scrollIntoView: true,
  })
  view.focus()
  return true
}

function step(grid: Grid, loc: CellLoc, dir: 1 | -1): CellLoc | null {
  const cols = grid.aligns.length
  let { row, col } = loc
  col += dir
  if (col >= cols) {
    row++
    col = 0
  } else if (col < 0) {
    row--
    col = cols - 1
  }
  if (row < 0) return null
  if (row >= grid.rows.length) grid.rows.push(new Array(cols).fill(""))
  return { row, col, offset: 0, onDelimiter: false }
}

function down(grid: Grid, loc: CellLoc): CellLoc | null {
  const row = loc.row + 1
  if (row >= grid.rows.length) grid.rows.push(new Array(grid.aligns.length).fill(""))
  return { row, col: loc.col, offset: 0, onDelimiter: false }
}

/**
 * Table editing keys, live only when the caret is inside a pipe table:
 * Tab / Shift-Tab walk the cells (Tab past the end adds a row), Enter drops to
 * the cell below (adding a row at the bottom). Every move re-aligns the grid.
 * Outside a table the bindings return false, so normal Tab / Enter are intact.
 */
export const tableKeymap: Extension = keymap.of([
  { key: "Tab", run: (v) => navigate(v, (g, l) => step(g, l, 1)) },
  { key: "Shift-Tab", run: (v) => navigate(v, (g, l) => step(g, l, -1)) },
  { key: "Enter", run: (v) => navigate(v, down) },
])

/**
 * Live pipe alignment. On every typing / deletion transaction whose caret ends
 * up inside a table, the grid is re-serialized and the change composed into the
 * same transaction (one undo step). Idempotent, so it does not re-trigger.
 */
export const tableRealign: Extension = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr
  if (!tr.isUserEvent("input") && !tr.isUserEvent("delete")) return tr
  const head = tr.newSelection.main.head
  const region = findTable(tr.newDoc, head)
  if (!region) return tr
  const grid = parseGrid(region.lines)
  if (!grid) return tr
  const aligned = serializeGrid(grid)
  if (aligned === region.lines.join("\n")) return tr
  const loc = locate(region.lines, region.from, head)
  const align = ChangeSet.of(
    [{ from: region.from, to: region.to, insert: aligned }],
    tr.newDoc.length,
  )
  return {
    changes: tr.changes.compose(align),
    selection: loc ? EditorSelection.cursor(resolve(aligned, region.from, loc)) : tr.newSelection,
    effects: tr.effects,
    scrollIntoView: tr.scrollIntoView,
  }
})
