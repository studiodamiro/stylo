import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EditorView } from "@codemirror/view"
import { Stylo } from "../src/Stylo"
import { inPlacePlugin } from "../src/inplace/plugin"

afterEach(cleanup)

async function mount(value: string) {
  const result = render(<Stylo value={value} onChange={() => {}} mode="in-place" />)
  // The in-place surface is a lazy chunk — wait for the editor to attach.
  await vi.waitFor(() => {
    if (!result.container.querySelector(".cm-editor")) throw new Error("not mounted")
  })
  const view = EditorView.findFromDOM(result.container.querySelector(".cm-editor") as HTMLElement)
  if (!view) throw new Error("no EditorView")
  return { ...result, view }
}

/** Does the live decoration set hide a marker range (a replace decoration)? */
function hidesAMarker(view: EditorView): boolean {
  const set = view.plugin(inPlacePlugin)?.decorations
  if (!set) return false
  let found = false
  set.between(0, view.state.doc.length, (from, to, deco) => {
    if (from < to && !deco.spec.class) found = true
  })
  return found
}

test("in-place mounts a CodeMirror surface, no warnings", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  const { container } = await mount("# Title\n\nbody")

  expect(container.querySelector(".cm-editor")).not.toBeNull()
  expect(container.querySelector('[data-stylo-mode="in-place"]')).not.toBeNull()
  expect(warn).not.toHaveBeenCalled()

  warn.mockRestore()
})

test("a heading carries a display-size line decoration", async () => {
  const { view } = await mount("# Title\n\nbody")

  let h1 = false
  view.plugin(inPlacePlugin)!.decorations.between(0, view.state.doc.length, (_from, _to, deco) => {
    if (typeof deco.spec.class === "string" && deco.spec.class.includes("cm-inplace-h1")) {
      h1 = true
    }
  })
  expect(h1).toBe(true)
})

test("the # marker is hidden off the heading line and revealed on it", async () => {
  const { view } = await mount("# Title\n\nbody")

  view.dispatch({ selection: { anchor: view.state.doc.length } })
  expect(hidesAMarker(view)).toBe(true)

  view.dispatch({ selection: { anchor: 1 } })
  expect(hidesAMarker(view)).toBe(false)
})
