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
  const view = EditorView.findFromDOM(result.container.querySelector(".cm-editor") as HTMLElement)
  if (!view) throw new Error("no EditorView")
  return { view }
}

const clickEl = (el: Element) =>
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 5, clientY: 5 }))

const fieldInput = () => document.querySelector<HTMLInputElement>(".cm-inplace-menu-input")

test("clicking a collapsed external link opens the URL field, prefilled", async () => {
  const { view } = await mount("see [the docs](http://example.com) here", {
    reveal: "never",
  })
  const link = view.contentDOM.querySelector(".cm-inplace-link")
  expect(link, "the link rendered collapsed").not.toBeNull()

  clickEl(link!)
  const input = fieldInput()
  expect(input, "a URL field opened").not.toBeNull()
  expect(input!.value).toBe("http://example.com")
})

test("no popup under reveal: 'caret' — inline editing is the path there", async () => {
  const { view } = await mount("see [the docs](http://example.com) here")
  clickEl(view.contentDOM.querySelector(".cm-inplace-link")!)
  expect(fieldInput()).toBeNull()
})

test("a wikilink click is left to navigation, not the URL editor", async () => {
  const { view } = await mount("go [[Some Page]] now", { reveal: "never" })
  clickEl(view.contentDOM.querySelector(".cm-inplace-wikilink")!)
  expect(fieldInput()).toBeNull()
})

test("clicking plain text does nothing", async () => {
  const { view } = await mount("just a plain paragraph here", { reveal: "never" })
  clickEl(view.contentDOM)
  expect(fieldInput()).toBeNull()
})
