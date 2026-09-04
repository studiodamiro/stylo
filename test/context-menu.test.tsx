import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EditorView } from "@codemirror/view"
import { Stylo } from "../src/Stylo"
import type { InPlaceConfig } from "../src/types"

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  document.querySelectorAll(".cm-inplace-menu, .cm-inplace-selbar").forEach((n) => n.remove())
})

async function mount(value: string, inPlace?: InPlaceConfig) {
  const result = render(
    <Stylo value={value} onChange={() => {}} mode="in-place" inPlace={inPlace} />,
  )
  await vi.waitFor(() => {
    if (!result.container.querySelector(".cm-editor")) throw new Error("not mounted")
  })
  const view = EditorView.findFromDOM(result.container.querySelector(".cm-editor") as HTMLElement)
  if (!view) throw new Error("no EditorView")
  return { view }
}

function rightClick(view: EditorView): MouseEvent {
  const e = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    clientX: 20,
    clientY: 20,
  })
  view.contentDOM.dispatchEvent(e)
  return e
}

/** A touch long-press: hold for the 500 ms the canvas waits, no `contextmenu`.
 *  Leaves fake timers installed; the file's `afterEach` restores them. */
function longPress(view: EditorView, x = 20, y = 20) {
  vi.useFakeTimers()
  view.contentDOM.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: x,
      clientY: y,
      pointerType: "touch",
    }),
  )
  vi.advanceTimersByTime(500)
}

test("right-click in the canvas opens the Stylo menu and suppresses the native one", async () => {
  const { view } = await mount("a plain paragraph")
  const e = rightClick(view)
  expect(e.defaultPrevented).toBe(true)
  expect(document.querySelector(".cm-inplace-menu-panel")).not.toBeNull()
})

test("right-clicking a word selects it and opens the grouped menu", async () => {
  const { view } = await mount("Heading here")
  rightClick(view)
  const text = document.querySelector(".cm-inplace-menu-panel")?.textContent ?? ""
  expect(text).toContain("Add link")
  expect(text).toContain("Format")
  expect(view.state.selection.main.empty, "the word under the pointer got selected").toBe(false)
})

test("right-clicking inside a hidden-marker run selects the whole phrase", async () => {
  const { view } = await mount("**two words** trailing", { reveal: "never" })
  rightClick(view) // pointer resolves to ~start of doc, inside the bold run
  const sel = view.state.selection.main
  expect(sel.empty).toBe(false)
  expect(view.state.sliceDoc(sel.from, sel.to)).toBe("two words")
})

test("right-clicking a plain word still selects just that word", async () => {
  const { view } = await mount("plain words here", { reveal: "never" })
  rightClick(view)
  const sel = view.state.selection.main
  expect(view.state.sliceDoc(sel.from, sel.to)).toBe("plain")
})

test("right-clicking a link selects the whole construct, so Bold wraps it", async () => {
  const { view } = await mount("[two words](http://x) trailing", { reveal: "never" })
  rightClick(view)
  const sel = view.state.selection.main
  expect(view.state.sliceDoc(sel.from, sel.to)).toBe("[two words](http://x)")
})

test("right-clicking a wikilink selects the whole construct", async () => {
  const { view } = await mount("[[Page Name]] trailing", { reveal: "never" })
  rightClick(view)
  const sel = view.state.selection.main
  expect(view.state.sliceDoc(sel.from, sel.to)).toBe("[[Page Name]]")
})

test("phrase-wide right-click works even with the line's markers revealed", async () => {
  const { view } = await mount("**two words** trailing", { reveal: "caret" })
  view.dispatch({ selection: { anchor: 4 } }) // caret on the line → markers shown
  rightClick(view)
  const sel = view.state.selection.main
  expect(view.state.sliceDoc(sel.from, sel.to)).toBe("two words")
})

test("inPlace.contextMenu = false leaves the browser menu alone", async () => {
  const { view } = await mount("a plain paragraph", { contextMenu: false })
  const e = rightClick(view)
  expect(e.defaultPrevented).toBe(false)
  expect(document.querySelector(".cm-inplace-menu-panel")).toBeNull()
})

test("a long-press opens the canvas menu on touch and selects the word", async () => {
  const { view } = await mount("Heading here")
  longPress(view)
  expect(document.querySelector(".cm-inplace-menu-panel")).not.toBeNull()
  expect(view.state.selection.main.empty, "word under the finger got selected").toBe(false)
})

test("a long-press then the browser's synthesised contextmenu open one menu", async () => {
  const { view } = await mount("a plain paragraph")
  longPress(view)
  // Android also fires `contextmenu` off the same gesture; it must not re-open.
  view.contentDOM.dispatchEvent(
    new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20 }),
  )
  expect(document.querySelectorAll(".cm-inplace-menu-panel")).toHaveLength(1)
})

test("inPlace.contextMenu = false ignores a long-press too", async () => {
  const { view } = await mount("a plain paragraph", { contextMenu: false })
  longPress(view)
  expect(document.querySelector(".cm-inplace-menu-panel")).toBeNull()
})

test("the canvas right-click menu does not take over an editable table cell", async () => {
  const { view } = await mount("| a | b |\n| - | - |\n| c | d |\n", { table: "cells" })
  const cell = view.dom.querySelector(".cm-inplace-table-edit td, .cm-inplace-table-edit th")
  // Table editing may be unavailable in jsdom; only assert when the cell exists.
  if (!cell) return
  const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
  cell.dispatchEvent(e)
  // The widget's own structural menu (same shell, mounted inside .cm-content)
  // may open; the canvas menu (mounted on .cm-editor, outside .cm-content) must not.
  const canvasPanels = [...document.querySelectorAll(".cm-inplace-menu-panel")].filter(
    (p) => !view.contentDOM.contains(p),
  )
  expect(canvasPanels).toHaveLength(0)
})

test("the selection bar element is mounted for an in-place editor", async () => {
  await mount("some text here")
  expect(document.querySelector(".cm-inplace-selbar")).not.toBeNull()
})

test("selecting text and right-clicking yields an 'Add external link' flyout with an input", async () => {
  const { view } = await mount("make this a link")
  view.dispatch({ selection: { anchor: 5, head: 9 } }) // "this"

  const e = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    clientX: 20,
    clientY: 20,
  })
  view.contentDOM.dispatchEvent(e)

  const panel = document.querySelector(".cm-inplace-menu-panel")
  expect(panel, "menu panel rendered").not.toBeNull()

  const items = [...panel!.querySelectorAll(".cm-inplace-menu-item")]
  const linkRow = items.find((el) => el.textContent?.trim() === "Add external link") as
    HTMLElement | undefined
  expect(linkRow, "an 'Add external link' row exists").toBeDefined()
  expect(
    linkRow!.classList.contains("cm-inplace-menu-parent"),
    "the link row is a flyout parent",
  ).toBe(true)

  linkRow!.dispatchEvent(new Event("pointerenter", { bubbles: true }))
  const input = document.querySelector(".cm-inplace-menu-input")
  expect(input, "a URL input appeared in the flyout").not.toBeNull()
})

test("the Insert submenu flyout opens on pointerenter on an empty line", async () => {
  const { view } = await mount("")
  view.contentDOM.dispatchEvent(
    new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }),
  )
  const items = [...document.querySelectorAll(".cm-inplace-menu-item")]
  const insert = items.find((el) => el.textContent?.trim() === "Insert") as HTMLElement | undefined
  expect(insert, "Insert row exists").toBeDefined()
  insert!.dispatchEvent(new Event("pointerenter", { bubbles: true }))
  const panels = document.querySelectorAll(".cm-inplace-menu-panel")
  expect(panels.length, "a flyout panel opened alongside the main panel").toBeGreaterThan(1)
})
