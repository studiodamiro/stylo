import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EditorView, type WidgetType } from "@codemirror/view"
import { Stylo } from "../src/Stylo"
import { frontmatterField } from "../src/inplace/frontmatter"
import { blockMathField } from "../src/inplace/math"
import { inPlacePlugin } from "../src/inplace/plugin"
import { BulletWidget, HrWidget } from "../src/inplace/widgets"

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

/** Does the live decoration set hide a marker range (a bare replace decoration)? */
function hidesAMarker(view: EditorView): boolean {
  const set = view.plugin(inPlacePlugin)?.decorations
  if (!set) return false
  let found = false
  set.between(0, view.state.doc.length, (from, to, deco) => {
    if (from < to && !deco.spec.class && !deco.spec.widget) found = true
  })
  return found
}

/** The math widgets currently rendered — from the plugin and the block field. */
function mathWidgets(view: EditorView): { src: string; block: boolean }[] {
  const found: { src: string; block: boolean }[] = []
  const collect = (set: import("@codemirror/view").DecorationSet | undefined) => {
    set?.between(0, view.state.doc.length, (_from, _to, deco) => {
      const w = deco.spec.widget as { src?: string; block?: boolean } | undefined
      if (w && typeof w.src === "string") found.push({ src: w.src, block: Boolean(w.block) })
    })
  }
  collect(view.plugin(inPlacePlugin)?.decorations)
  collect(view.state.field(blockMathField, false))
  return found
}

/** Count the widget decorations of a given type in the plugin's set. */
function countWidgets(view: EditorView, Ctor: abstract new () => unknown): number {
  let n = 0
  view.plugin(inPlacePlugin)?.decorations.between(0, view.state.doc.length, (_f, _t, deco) => {
    if (deco.spec.widget instanceof Ctor) n += 1
  })
  return n
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

test("inline and block math become widgets off-line, source on-line", async () => {
  const { view } = await mount("text $a+b$ more\n\n$$\nx^2\n$$\n\ntail")

  view.dispatch({ selection: { anchor: view.state.doc.length } })
  const widgets = mathWidgets(view)
  expect(widgets.some((w) => !w.block && w.src === "a+b")).toBe(true)
  expect(widgets.some((w) => w.block && w.src.includes("x^2"))).toBe(true)

  view.dispatch({ selection: { anchor: 6 } }) // onto the inline-math line
  expect(mathWidgets(view).some((w) => w.src === "a+b")).toBe(false)
})

test("$100 and $200 is not treated as math", async () => {
  const { view } = await mount("it costs $100 and $200 total\n\ntail")
  view.dispatch({ selection: { anchor: view.state.doc.length } })
  expect(mathWidgets(view)).toHaveLength(0)
})

test("math inside inline code is left literal", async () => {
  const { view } = await mount("literal `$x$` here\n\ntail")
  view.dispatch({ selection: { anchor: view.state.doc.length } })
  expect(mathWidgets(view)).toHaveLength(0)
})

test("frontmatter is hidden off-caret and revealed when the caret enters it", async () => {
  const { view } = await mount("---\ntitle: x\ntags: [a]\n---\n\n# Body")

  view.dispatch({ selection: { anchor: view.state.doc.length } })
  expect(view.state.field(frontmatterField).size).toBe(1)

  view.dispatch({ selection: { anchor: view.state.doc.line(2).from } })
  expect(view.state.field(frontmatterField).size).toBe(0)
})

test("a horizontal rule becomes a widget off-line, source on-line", async () => {
  const { view } = await mount("above\n\n---\n\nbelow")

  view.dispatch({ selection: { anchor: view.state.doc.length } })
  expect(countWidgets(view, HrWidget)).toBe(1)

  view.dispatch({ selection: { anchor: view.state.doc.line(3).from } })
  expect(countWidgets(view, HrWidget)).toBe(0)
})

test("blockquote lines get the quote class", async () => {
  const { view } = await mount("> quoted one\n> quoted two\n\ntail")
  expect(hasClass(view, "cm-inplace-quote")).toBe(true)
})

test("fenced code: mono container, fences emptied off-block and shown on-caret", async () => {
  const { view } = await mount("text\n\n```ts\nconst a = 1\n```\n\ntail")

  const emptiedFenceLines = () => {
    let n = 0
    view.plugin(inPlacePlugin)!.decorations.between(0, view.state.doc.length, (from, to, deco) => {
      if (from < to && !deco.spec.class && !deco.spec.widget) n += 1
    })
    return n
  }

  expect(hasClass(view, "cm-inplace-mono")).toBe(true)
  expect(hasClass(view, "cm-inplace-code-top")).toBe(true)
  expect(hasClass(view, "cm-inplace-code-pad")).toBe(true)
  expect(emptiedFenceLines()).toBe(2)

  view.dispatch({ selection: { anchor: view.state.doc.line(4).from } })
  expect(emptiedFenceLines()).toBe(0)
  expect(hasClass(view, "cm-inplace-fence")).toBe(true)
})

test("a dash bullet is swapped for a glyph, but a task item is left alone", async () => {
  const { view } = await mount("- plain item\n- [ ] a task\n\ntail")
  view.dispatch({ selection: { anchor: view.state.doc.length } })
  expect(countWidgets(view, BulletWidget)).toBe(1)
})

test("a math widget renders KaTeX markup", async () => {
  const { view } = await mount("a $x^2$ b\n\ntail")
  view.dispatch({ selection: { anchor: view.state.doc.length } })

  let dom: HTMLElement | undefined
  view.plugin(inPlacePlugin)!.decorations.between(0, view.state.doc.length, (_f, _t, deco) => {
    const w = deco.spec.widget as WidgetType | undefined
    if (w) dom = w.toDOM(view) as HTMLElement
  })
  expect(dom?.querySelector(".katex")).not.toBeNull()
})

function atomicCount(view: EditorView): number {
  let n = 0
  view.plugin(inPlacePlugin)!.atomic.between(0, view.state.doc.length, (from, to) => {
    if (from < to) n += 1
  })
  return n
}

test("hidden markers are registered as atomic ranges", async () => {
  const { view } = await mount("line one\n\nsome **bold** here")
  view.dispatch({ selection: { anchor: 0 } }) // caret off the bold line

  expect(hidesAMarker(view)).toBe(true)
  expect(atomicCount(view)).toBe(2) // the two hidden ** markers

  view.dispatch({ selection: { anchor: view.state.doc.length } }) // onto the bold line
  expect(atomicCount(view)).toBe(0)
})

test("an unclosed ** does not crash and is not collapsed", async () => {
  const { view } = await mount("line one\n\n**not closed here")
  view.dispatch({ selection: { anchor: 0 } })

  expect(hidesAMarker(view)).toBe(false)
  expect(atomicCount(view)).toBe(0)
})

test("a document-wide selection reveals every marker", async () => {
  const { view } = await mount("# Heading\n\n**bold** and `code` and [[Link]]")
  view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } })

  expect(hidesAMarker(view)).toBe(false)
  expect(atomicCount(view)).toBe(0)
})
