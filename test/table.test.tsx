import { afterEach, expect, test } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EditorSelection, EditorState, Text } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { markdownLanguage } from "@codemirror/lang-markdown"
import { Stylo } from "../src/Stylo"
import { BUILTIN_BY_ID } from "../src/toolbar/commands"
import { cellSourcePos, tableKeymap, tableRealign } from "../src/toolbar/table"
import { parseGrid, serializeGrid } from "../src/toolbar/table-grid"

afterEach(cleanup)

function mkView(doc: string, anchor = 0, head = anchor): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc,
      extensions: [markdownLanguage, tableRealign, tableKeymap],
      selection: EditorSelection.single(anchor, head),
    }),
  })
}

/** Dispatch a keystroke through the view's keymap facet. */
function press(view: EditorView, key: string, shift = false) {
  const ev = new KeyboardEvent("keydown", { key, shiftKey: shift, bubbles: true })
  view.contentDOM.dispatchEvent(ev)
}

// ---- grid ----

test("serializeGrid pads columns and rebuilds the delimiter with alignment", () => {
  const grid = parseGrid(["| a | bbbb |", "| :- | -: |", "| cccccc | d |"])!
  expect(serializeGrid(grid)).toBe(
    ["| a      | bbbb |", "| :----- | ---: |", "| cccccc |    d |"].join("\n"),
  )
})

test("serializeGrid is idempotent", () => {
  const once = serializeGrid(parseGrid(["| a | b |", "| - | - |", "| c | d |"])!)
  expect(serializeGrid(parseGrid(once.split("\n"))!)).toBe(once)
})

test("cellSourcePos points at the content start of the clicked cell", () => {
  const doc = Text.of(["x", "", "| A  | B  |", "| -- | -- |", "|    | hi |", "| yo |    |"])
  const from = doc.line(3).from // table starts on line 3
  // header row 0 col 1 -> the "B"
  expect(
    doc.sliceString(cellSourcePos(doc, from, 0, 1)!, cellSourcePos(doc, from, 0, 1)! + 1),
  ).toBe("B")
  // body row 1 col 1 -> the "hi" (its blank col-0 sibling must not shift it)
  const p = cellSourcePos(doc, from, 1, 1)!
  expect(doc.sliceString(p, p + 2)).toBe("hi")
  // body row 2 col 0 -> the "yo"
  const q = cellSourcePos(doc, from, 2, 0)!
  expect(doc.sliceString(q, q + 2)).toBe("yo")
})

// ---- insert ----

test("table command inserts a skeleton and selects the first header cell", () => {
  const view = mkView("", 0)
  BUILTIN_BY_ID.table!.run(view)
  expect(view.state.doc.toString()).toBe(
    "| Column 1 | Column 2 |\n| -------- | -------- |\n|          |          |\n",
  )
  const { from, to } = view.state.selection.main
  expect(view.state.sliceDoc(from, to)).toBe("Column 1")
})

test("table command breaks to a new block when the line has text", () => {
  const view = mkView("intro", 5)
  BUILTIN_BY_ID.table!.run(view)
  expect(view.state.doc.toString().startsWith("intro\n\n| Column 1 |")).toBe(true)
})

// ---- navigation ----

const T = "| a | b |\n| - | - |\n| c | d |"

test("Tab moves to the next cell and re-aligns", () => {
  const view = mkView(T, 2) // in header cell "a"
  press(view, "Tab")
  const { head } = view.state.selection.main
  // caret now in the second header cell of the aligned grid
  expect(view.state.doc.toString()).toBe("| a   | b   |\n| --- | --- |\n| c   | d   |")
  expect(view.state.sliceDoc(head, head + 1)).toBe("b")
})

test("Tab past the last cell of the last row appends a row", () => {
  const view = mkView(T, 26) // in the last body cell "d"
  press(view, "Tab")
  expect(view.state.doc.toString()).toBe(
    "| a   | b   |\n| --- | --- |\n| c   | d   |\n|     |     |",
  )
})

test("Shift-Tab from the first header cell escapes (no change)", () => {
  const view = mkView(T, 2)
  const before = view.state.doc.toString()
  press(view, "Tab", true)
  expect(view.state.doc.toString()).toBe(before)
})

test("Enter in the last row appends a row and drops into it", () => {
  const view = mkView(T, 21) // in body cell "c"
  press(view, "Enter")
  expect(view.state.doc.toString()).toBe(
    "| a   | b   |\n| --- | --- |\n| c   | d   |\n|     |     |",
  )
})

// ---- live realign ----

test("typing in a cell re-aligns the whole grid in one step", () => {
  const view = mkView("| a | b |\n| - | - |\n| c | d |", 3) // after "a"
  view.dispatch(view.state.replaceSelection("X"), { userEvent: "input.type" })
  expect(view.state.doc.toString()).toBe("| aX  | b   |\n| --- | --- |\n| c   | d   |")
})

test("realign leaves a non-table pipe line alone", () => {
  const view = mkView("a | b not a table", 0)
  view.dispatch(view.state.replaceSelection("Z"), { userEvent: "input.type" })
  expect(view.state.doc.toString()).toBe("Za | b not a table")
})

test("Stylo source mode shows the table button", () => {
  const { container } = render(<Stylo value="x" onChange={() => {}} mode="source" />)
  expect(container.querySelector('button[aria-label="Table"]')).not.toBeNull()
})
