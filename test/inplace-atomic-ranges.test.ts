import { markdownLanguage } from "@codemirror/lang-markdown"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { expect, test } from "vitest"
import { inPlaceConfigFacet, resolveToggles, revealModeFacet } from "../src/inplace/config"
import { inPlaceDecorations, inPlacePlugin } from "../src/inplace/plugin"

function mkView(doc: string): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc,
      selection: EditorSelection.single(0),
      extensions: [
        markdownLanguage,
        inPlaceConfigFacet.of(resolveToggles()),
        revealModeFacet.of("never"),
        inPlaceDecorations(),
      ],
    }),
  })
}

function atomicRanges(view: EditorView): [number, number][] {
  const set = view.plugin(inPlacePlugin)!.atomic
  const out: [number, number][] = []
  set.between(0, view.state.doc.length, (from, to) => {
    out.push([from, to])
  })
  return out
}

test("a nested ***word*** prefix is one atomic range, not two touching ones", () => {
  const view = mkView("x ***word*** y")
  const ranges = atomicRanges(view)
  // "x " = 0..2, "***" = 2..5, "word" = 5..9, "***" = 9..12
  expect(ranges).toContainEqual([2, 5])
  expect(ranges).toContainEqual([9, 12])
  // no seam at 3 or 4 — nothing ends strictly inside the prefix
  expect(ranges.some(([, to]) => to === 3 || to === 4)).toBe(false)
})

test("separated markers stay separate", () => {
  const view = mkView("a **b** c")
  const ranges = atomicRanges(view)
  expect(ranges).toContainEqual([2, 4])
  expect(ranges).toContainEqual([5, 7])
})
