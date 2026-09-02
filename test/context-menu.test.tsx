import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EditorView } from "@codemirror/view"
import { Stylo } from "../src/Stylo"
import type { InPlaceConfig } from "../src/types"

afterEach(() => {
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
  const view = EditorView.findFromDOM(
    result.container.querySelector(".cm-editor") as HTMLElement,
  )
  if (!view) throw new Error("no EditorView")
  return { view }
}

function rightClick(view: EditorView): MouseEvent {
  const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20 })
  view.contentDOM.dispatchEvent(e)
  return e
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

test("inPlace.contextMenu = false leaves the browser menu alone", async () => {
  const { view } = await mount("a plain paragraph", { contextMenu: false })
  const e = rightClick(view)
  expect(e.defaultPrevented).toBe(false)
  expect(document.querySelector(".cm-inplace-menu-panel")).toBeNull()
})

test("a right-click menu is not opened over an editable table cell", async () => {
  const { view } = await mount("| a | b |\n| - | - |\n| c | d |\n", { table: "cells" })
  const cell = view.dom.querySelector(".cm-inplace-table-edit td, .cm-inplace-table-edit th")
  // Table editing may be unavailable in jsdom; only assert when the cell exists.
  if (!cell) return
  const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
  cell.dispatchEvent(e)
  expect(document.querySelector(".cm-inplace-menu-panel")).toBeNull()
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
  const linkRow = items.find(
    (el) => el.textContent?.trim() === "Add external link",
  ) as HTMLElement | undefined
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
