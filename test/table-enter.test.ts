import { markdownLanguage } from "@codemirror/lang-markdown"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { expect, test } from "vitest"
import {
  inPlaceConfigFacet,
  resolveToggles,
  revealModeFacet,
  tableEditingFacet,
} from "../src/inplace/config"
import { inPlaceDecorations } from "../src/inplace/plugin"
import { enterTableFromAbove, enterTableFromBelow } from "../src/inplace/table-enter"
import { tableField } from "../src/inplace/tables"

function mkView(doc: string, caret: number, table: "source" | "cells" = "source"): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc,
      selection: EditorSelection.single(caret),
      extensions: [
        markdownLanguage,
        inPlaceConfigFacet.of(resolveToggles()),
        tableEditingFacet.of(table),
        revealModeFacet.of("caret"),
        inPlaceDecorations(),
        tableField,
      ],
    }),
  })
}

/** How many table lines are currently collapsed into a rendered widget. */
function widgetCount(view: EditorView): number {
  let n = 0
  view.state.field(tableField).between(0, view.state.doc.length, () => {
    n++
  })
  return n
}

// 1 "intro" · 2 "" · 3-5 table · 6 "" · 7 "after"
const DOC = "intro\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\nafter\n"

test("source mode: ArrowDown from the blank line above lands on the table's first source line", () => {
  const view = mkView(DOC, DOC.indexOf("\n\n") + 1) // caret on the blank line 2
  expect(widgetCount(view)).toBe(1) // rendered while the caret is outside

  expect(enterTableFromAbove(view)).toBe(true)
  const head = view.state.selection.main.head
  expect(view.state.doc.lineAt(head).number).toBe(3)
  expect(head).toBe(view.state.doc.line(3).from)
  expect(widgetCount(view)).toBe(0) // caret on a table line reveals the source
})

test("source mode: ArrowUp from the blank line below lands at the end of the last source line", () => {
  const view = mkView(DOC, DOC.lastIndexOf("\n\n") + 1) // caret on the blank line 6
  expect(enterTableFromBelow(view)).toBe(true)
  const head = view.state.selection.main.head
  expect(view.state.doc.lineAt(head).number).toBe(5)
  expect(head).toBe(view.state.doc.line(5).to)
  expect(widgetCount(view)).toBe(0)
})

test("no-op when the adjacent line is not a table edge", () => {
  const inIntro = mkView(DOC, 1) // line 1, blank line 2 sits between it and the table
  expect(enterTableFromAbove(inIntro)).toBe(false)
  expect(inIntro.state.selection.main.head).toBe(1)

  const inAfter = mkView(DOC, DOC.indexOf("after")) // line 7, blank line 6 between
  expect(enterTableFromBelow(inAfter)).toBe(false)
})

test("cells mode: engages the table without moving the document selection", () => {
  const view = mkView(DOC, DOC.indexOf("\n\n") + 1, "cells")
  const before = view.state.selection.main.head
  expect(enterTableFromAbove(view)).toBe(true)
  // Focus is handed to the widget's cell DOM; the editor selection stays put,
  // where source mode would have moved it onto the table's first line.
  expect(view.state.selection.main.head).toBe(before)
})
