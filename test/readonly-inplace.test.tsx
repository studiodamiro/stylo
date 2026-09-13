import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EditorView } from "@codemirror/view"
import { Stylo } from "../src/Stylo"

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  document.querySelectorAll(".cm-inplace-menu, .cm-inplace-selbar").forEach((n) => n.remove())
})

async function mount(value: string, readOnly?: boolean) {
  const result = render(
    <Stylo value={value} onChange={() => {}} mode="in-place" readOnly={readOnly} />,
  )
  await vi.waitFor(() => {
    if (!result.container.querySelector(".cm-editor")) throw new Error("not mounted")
  })
  const view = EditorView.findFromDOM(result.container.querySelector(".cm-editor") as HTMLElement)
  if (!view) throw new Error("no EditorView")
  return { view, rerender: result.rerender }
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

test("readOnly keeps the right-click menu from opening and leaves the browser's own menu alone", async () => {
  const { view } = await mount("a plain paragraph", true)
  const e = rightClick(view)
  expect(e.defaultPrevented).toBe(false)
  expect(document.querySelector(".cm-inplace-menu-panel")).toBeNull()
})

test("readOnly keeps a long-press from opening the menu", async () => {
  const { view } = await mount("Heading here", true)
  vi.useFakeTimers()
  view.contentDOM.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      clientX: 20,
      clientY: 20,
      pointerType: "touch",
    }),
  )
  vi.advanceTimersByTime(500)
  expect(document.querySelector(".cm-inplace-menu-panel")).toBeNull()
})

test("flipping readOnly live (no remount) stops the menu from opening", async () => {
  const { view, rerender } = await mount("a plain paragraph", false)
  rightClick(view)
  expect(document.querySelector(".cm-inplace-menu-panel"), "opens while writable").not.toBeNull()
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

  rerender(<Stylo value="a plain paragraph" onChange={() => {}} mode="in-place" readOnly={true} />)
  const e = rightClick(view)
  expect(e.defaultPrevented, "browser menu now allowed through").toBe(false)
  expect(document.querySelector(".cm-inplace-menu-panel"), "no longer opens").toBeNull()
})
