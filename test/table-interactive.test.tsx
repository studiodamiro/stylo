import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EditorView } from "@codemirror/view"
import { Stylo } from "../src/Stylo"
import { tableField } from "../src/inplace/tables"
import { BUILTIN_BY_ID } from "../src/toolbar/commands"
import type { InPlaceConfig } from "../src/types"

afterEach(cleanup)

async function mount(value: string, inPlace?: InPlaceConfig) {
  let latest = value
  const result = render(
    <Stylo
      value={value}
      onChange={(next) => {
        latest = next
      }}
      mode="in-place"
      inPlace={inPlace}
    />,
  )
  await vi.waitFor(() => {
    if (!result.container.querySelector(".cm-editor")) throw new Error("not mounted")
  })
  const view = EditorView.findFromDOM(result.container.querySelector(".cm-editor") as HTMLElement)
  if (!view) throw new Error("no EditorView")
  return { ...result, view, doc: () => latest }
}

async function editCells(view: EditorView) {
  return vi.waitFor(() => {
    const el = view.contentDOM.querySelector<HTMLTableElement>("table.cm-inplace-table-edit")
    if (!el) throw new Error("editable table not rendered")
    return el
  })
}

const T = "| A | B |\n| - | - |\n| 1 | 2 |"

test('table: "cells" renders contentEditable cells; the default does not', async () => {
  const editable = await mount(T, { table: "cells" })
  const table = await editCells(editable.view)
  const cells = table.querySelectorAll<HTMLTableCellElement>("th, td")
  expect(cells).toHaveLength(4)
  expect([...cells].every((c) => c.getAttribute("contenteditable") === "true")).toBe(true)

  const plain = await mount(T)
  plain.view.dispatch({ selection: { anchor: plain.view.state.doc.length } })
  expect(plain.view.contentDOM.querySelector(".cm-inplace-table-edit")).toBeNull()
  expect(plain.view.contentDOM.querySelector("table [contenteditable]")).toBeNull()
})

test("editing a cell reserializes the whole table back into the document", async () => {
  const { view, doc } = await mount(T, { table: "cells" })
  const table = await editCells(view)
  const firstBodyCell = table.querySelector<HTMLTableCellElement>("tbody td")!

  firstBodyCell.textContent = "hello"
  firstBodyCell.dispatchEvent(new Event("input", { bubbles: true }))

  expect(view.state.doc.toString()).toBe("| A     | B   |\n| ----- | --- |\n| hello | 2   |")
  expect(doc()).toBe(view.state.doc.toString())
})

test("a cell renders Markdown while unfocused and shows raw source while focused", async () => {
  const { view } = await mount("| Rich |\n| - |\n| **b** `c` |\n\ntail", { table: "cells" })
  const table = await editCells(view)
  const cell = table.querySelector<HTMLTableCellElement>("tbody td")!

  // unfocused: rendered
  expect(cell.querySelector("strong")?.textContent).toBe("b")
  expect(cell.querySelector("code")?.textContent).toBe("c")

  // focusin: swaps to the raw source, a single text node
  cell.dispatchEvent(new FocusEvent("focusin", { bubbles: true }))
  expect(cell.querySelector("strong")).toBeNull()
  expect(cell.textContent).toBe("**b** `c`")

  // focusout (leaving the table): re-renders from the (unchanged) source
  cell.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: view.contentDOM }))
  expect(cell.querySelector("strong")?.textContent).toBe("b")
})

test("editing a cell's raw source keeps the change and re-renders it on blur", async () => {
  const { view } = await mount("| H |\n| - |\n| *old* |\n\ntail", { table: "cells" })
  const table = await editCells(view)
  const cell = table.querySelector<HTMLTableCellElement>("tbody td")!

  cell.dispatchEvent(new FocusEvent("focusin", { bubbles: true }))
  expect(cell.textContent).toBe("*old*")
  cell.textContent = "**new**"
  cell.dispatchEvent(new Event("input", { bubbles: true }))
  expect(view.state.doc.toString()).toContain("| **new** |")

  cell.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: view.contentDOM }))
  expect(cell.querySelector("strong")?.textContent).toBe("new")
})

test("a widget edit maps the decoration instead of rebuilding it", async () => {
  const { view } = await mount(T, { table: "cells" })
  const table = await editCells(view)
  const before = view.state.field(tableField)
  expect(before.size).toBe(1)

  const cell = table.querySelector<HTMLTableCellElement>("thead th")!
  cell.textContent = "Alpha"
  cell.dispatchEvent(new Event("input", { bubbles: true }))

  const after = view.state.field(tableField)
  expect(after.size).toBe(1)
  // Same rendered <table> element survives the edit — focus is not lost.
  expect(view.contentDOM.querySelector("table.cm-inplace-table-edit")).toBe(table)
})

test("Tab past the last cell appends a row", async () => {
  const { view } = await mount(T, { table: "cells" })
  const table = await editCells(view)
  const lastCell = [...table.querySelectorAll<HTMLTableCellElement>("tbody td")].at(-1)!

  lastCell.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }))

  expect(view.state.doc.toString()).toBe(
    "| A   | B   |\n| --- | --- |\n| 1   | 2   |\n|     |     |",
  )
})

/** The cell the DOM caret currently sits in, and its `(row, col)`. */
function caretCell(view: EditorView) {
  const sel = view.dom.ownerDocument.getSelection()
  const node = sel?.anchorNode
  const cell = (
    node instanceof Element ? node : node?.parentElement
  )?.closest<HTMLTableCellElement>("th, td")
  if (!cell) return null
  const row = cell.parentElement as HTMLTableRowElement
  const rows = [...cell.closest("table")!.querySelectorAll("tr")]
  return { cell, row: rows.indexOf(row), col: [...row.cells].indexOf(cell) }
}

const raf = () => new Promise((r) => requestAnimationFrame(() => r(null)))

test("a sync keeps the caret in the edited cell, not the first one", async () => {
  const { view } = await mount("intro", { table: "cells" })
  view.dispatch({ selection: { anchor: view.state.doc.length } })
  BUILTIN_BY_ID.table!.run(view)
  await vi.waitFor(() => {
    if (!caretCell(view)) throw new Error("no caret")
  })

  // Tab through the skeleton, append a row past the end, Tab into its 2nd
  // column — the append fires a sync, which used to drop the caret.
  for (let k = 0; k < 5; k++) {
    caretCell(view)!.cell.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }))
    await raf()
  }
  expect(caretCell(view)).toMatchObject({ row: 2, col: 1 })

  caretCell(view)!.cell.textContent = "value"
  caretCell(view)!.cell.dispatchEvent(new Event("input", { bubbles: true }))
  await raf()

  expect(caretCell(view)).toMatchObject({ row: 2, col: 1 })
  expect(view.state.doc.toString().trimEnd().split("\n").at(-1)).toBe("|          | value    |")
})

test("mousedown in a cell does not reveal the source — the widget owns the click", async () => {
  const { view } = await mount(T, { table: "cells" })
  const table = await editCells(view)
  const cell = table.querySelector<HTMLTableCellElement>("tbody td")!

  // The widget stops the mousedown from reaching CodeMirror's delegated
  // handler, which would otherwise snap the caret to the widget boundary.
  const reachedCM = vi.fn()
  view.contentDOM.addEventListener("mousedown", reachedCM)
  cell.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))

  expect(reachedCM).not.toHaveBeenCalled()
  expect(view.state.field(tableField).size).toBe(1)
  expect(view.contentDOM.querySelector("table.cm-inplace-table-edit")).toBe(table)
})

test('the "table" toolbar command puts the caret in the first cell in cells mode', async () => {
  const { view } = await mount("intro", { table: "cells" })
  view.dispatch({ selection: { anchor: view.state.doc.length } })
  BUILTIN_BY_ID.table!.run(view)

  // Assert the DOM selection the helper places — where the caret lands.
  const anchorCell = await vi.waitFor(() => {
    const node = view.dom.ownerDocument.getSelection()?.anchorNode
    const cell = (node instanceof Element ? node : node?.parentElement)?.closest("th, td")
    if (!cell?.closest(".cm-inplace-table-edit")) throw new Error("caret not in a cell")
    return cell as HTMLElement
  })
  expect(anchorCell.tagName).toBe("TH")
  expect(anchorCell.textContent).toBe("Column 1")
})

test('the "table" toolbar command does not throw on the plain source surface', () => {
  const { getByRole } = render(<Stylo value="x" onChange={() => {}} mode="source" />)
  const view = EditorView.findFromDOM(
    (getByRole("textbox") as HTMLElement).closest(".cm-editor") as HTMLElement,
  )!
  expect(() => BUILTIN_BY_ID.table!.run(view)).not.toThrow()
  expect(view.state.doc.toString()).toContain("| Column 1 | Column 2 |")
})

test("Enter in the last row appends a row", async () => {
  const { view } = await mount(T, { table: "cells" })
  const table = await editCells(view)
  const bodyCell = table.querySelector<HTMLTableCellElement>("tbody td")!

  bodyCell.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))

  expect(view.state.doc.toString()).toBe(
    "| A   | B   |\n| --- | --- |\n| 1   | 2   |\n|     |     |",
  )
})
