import { afterEach, expect, test, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { EditorView } from "@codemirror/view"
import { Stylo } from "../src/Stylo"
import { embedField } from "../src/inplace/embed"
import { inPlacePlugin } from "../src/inplace/plugin"
import type { EmbedSource } from "../src/types"

afterEach(cleanup)

async function mount(value: string, embedSource?: EmbedSource) {
  const result = render(
    <Stylo value={value} onChange={() => {}} mode="in-place" embedSource={embedSource} />,
  )
  await vi.waitFor(() => {
    if (!result.container.querySelector(".cm-editor")) throw new Error("not mounted")
  })
  const view = EditorView.findFromDOM(result.container.querySelector(".cm-editor") as HTMLElement)
  if (!view) throw new Error("no EditorView")
  return { ...result, view }
}

/** The `![[ref]]` embed widgets currently in the field, by reference. */
function embedRefs(view: EditorView): string[] {
  const out: string[] = []
  view.state.field(embedField, false)?.between(0, view.state.doc.length, (_f, _t, deco) => {
    const ref = (deco.spec.widget as { ref?: string } | undefined)?.ref
    if (typeof ref === "string") out.push(ref)
  })
  return out
}

/** Is the inner `[[ref]]` of a `![[ref]]` decorated as a wikilink? */
function hasWikilinkDecoration(view: EditorView): boolean {
  let found = false
  view.plugin(inPlacePlugin)?.decorations.between(0, view.state.doc.length, (_f, _t, deco) => {
    const c = deco.spec.class
    if (typeof c === "string" && c.includes("cm-inplace-wikilink")) found = true
  })
  return found
}

const canned: EmbedSource = (ref) => <div data-testid="resolved">resolved: {ref}</div>

test("a lone ![[ref]] line becomes an embed widget when embedSource is set", async () => {
  const { view } = await mount("# Title\n\n![[Weekly note]]\n", canned)
  expect(embedRefs(view)).toEqual(["Weekly note"])
})

test("no embedSource — no embed widget, and the inner [[ref]] still renders as a wikilink", async () => {
  const { view } = await mount("![[Weekly note]]\n")
  expect(embedRefs(view)).toEqual([])
  expect(hasWikilinkDecoration(view)).toBe(true)
})

test("with embedSource, scanWikilinks yields the [[ref]] inside a ![[ref]]", async () => {
  const { view } = await mount("![[Weekly note]]\n", canned)
  expect(hasWikilinkDecoration(view)).toBe(false)
})

test("the embed is withheld while the caret is on its line", async () => {
  const { view } = await mount("para\n\n![[Note]]\n", canned)
  expect(embedRefs(view)).toEqual(["Note"])

  const line = view.state.doc.line(3)
  view.dispatch({ selection: { anchor: line.from } })
  expect(embedRefs(view)).toEqual([])

  view.dispatch({ selection: { anchor: 0 } })
  expect(embedRefs(view)).toEqual(["Note"])
})

test("an ![[ref]] mixed into a sentence stays literal", async () => {
  const { view } = await mount("see ![[Note]] here\n", canned)
  expect(embedRefs(view)).toEqual([])
})

// The slot DOM and the portalled host node are layout-dependent (CodeMirror
// renders no widgets into a zero-height jsdom viewport); that path is covered
// by test/browser/embed.spec.ts.
