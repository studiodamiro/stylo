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

/** Is there a decoration carrying `className` anywhere in the document? */
function hasClass(view: EditorView, className: string): boolean {
  const set = view.plugin(inPlacePlugin)?.decorations
  if (!set) return false
  let found = false
  set.between(0, view.state.doc.length, (_from, _to, deco) => {
    const c = deco.spec.class
    if (typeof c === "string" && c.includes(className)) found = true
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
  expect(hasClass(view, "cm-inplace-h1")).toBe(true)
})

test("the # marker is hidden off the heading line and revealed on it", async () => {
  const { view } = await mount("# Title\n\nbody")

  view.dispatch({ selection: { anchor: view.state.doc.length } })
  expect(hidesAMarker(view)).toBe(true)

  view.dispatch({ selection: { anchor: 1 } })
  expect(hidesAMarker(view)).toBe(false)
})

test("bold text is styled and its ** markers hide off-line, reveal on-line", async () => {
  const { view } = await mount("normal **bold** normal\n\nsecond line")

  view.dispatch({ selection: { anchor: view.state.doc.length } })
  expect(hasClass(view, "cm-inplace-strong")).toBe(true)
  expect(hidesAMarker(view)).toBe(true)

  view.dispatch({ selection: { anchor: 10 } }) // inside "bold"
  expect(hidesAMarker(view)).toBe(false)
})

test("italic, strikethrough, and inline code each get a decoration", async () => {
  const { view } = await mount("an *emphasis*, a ~~strike~~, and `code` here\n\nx")

  expect(hasClass(view, "cm-inplace-em")).toBe(true)
  expect(hasClass(view, "cm-inplace-strike")).toBe(true)
  expect(hasClass(view, "cm-inplace-code")).toBe(true)
})

test("emphasis inside a heading is still decorated", async () => {
  const { view } = await mount("## has **bold** inside\n\nsecond line")

  expect(hasClass(view, "cm-inplace-h2")).toBe(true)
  expect(hasClass(view, "cm-inplace-strong")).toBe(true)
})

test("a standard link is styled and its syntax hides off-line, reveals on-line", async () => {
  const { view } = await mount("see [the docs](https://x.dev) now\n\nsecond line")

  view.dispatch({ selection: { anchor: view.state.doc.length } })
  expect(hasClass(view, "cm-inplace-link")).toBe(true)
  expect(hidesAMarker(view)).toBe(true)

  view.dispatch({ selection: { anchor: 7 } }) // inside the link text
  expect(hidesAMarker(view)).toBe(false)
})

test("a wikilink collapses to its label and carries the target", async () => {
  const { view } = await mount("go to [[Notes/Home|home]] please\n\nsecond line")
  view.dispatch({ selection: { anchor: view.state.doc.length } })

  let target: string | undefined
  view.plugin(inPlacePlugin)!.decorations.between(0, view.state.doc.length, (_f, _t, deco) => {
    const attrs = deco.spec.attributes as Record<string, string> | undefined
    if (attrs && attrs["data-stylo-wikilink"]) target = attrs["data-stylo-wikilink"]
  })
  expect(target).toBe("Notes/Home")
  expect(hidesAMarker(view)).toBe(true)
})

test("a wikilink inside inline code is left as literal text", async () => {
  const { view } = await mount("literal `[[Note]]` here\n\nsecond line")
  expect(hasClass(view, "cm-inplace-wikilink")).toBe(false)
})
