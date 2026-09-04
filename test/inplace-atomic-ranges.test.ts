import { markdownLanguage } from "@codemirror/lang-markdown"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { expect, test } from "vitest"
import { inPlaceConfigFacet, resolveToggles, revealModeFacet } from "../src/inplace/config"
import { inPlaceDecorations, inPlacePlugin } from "../src/inplace/plugin"

function mkView(doc: string, caret = 0): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc,
      selection: EditorSelection.single(caret),
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

// Caret on the leading `x` line, outside the callout, so its markers stay
// hidden. Callout head `> [!note]` starts at offset 3: `>`@3 space@4 token@5..12;
// the bare `>` body line is @13.
const DOC = "x\n\n> [!note]\n>\n"

test("an empty callout line keeps a landable caret position", () => {
  const ranges = atomicRanges(mkView(DOC))
  // `>` hidden at 3..4, `[!note]` token hidden at 5..12 — the space at 4..5 is
  // not covered, so the caret can land there.
  expect(ranges).toContainEqual([3, 4])
  expect(ranges).toContainEqual([5, 12])
  expect(ranges.some(([from, to]) => from <= 4 && to >= 5)).toBe(false)
  // the bare `>` body line (13..14) is hidden but not atomic
  expect(ranges.some(([from, to]) => from === 13 && to === 14)).toBe(false)
})

test("a callout line with content still hides `> ` atomically", () => {
  const ranges = atomicRanges(mkView("x\n\n> [!note] Title\n> body\n"))
  // head: `> [!note] ` (3..13) hidden as one atomic run; "Title" stays
  expect(ranges).toContainEqual([3, 13])
  // body line: `> ` hidden atomically at 19..21, "body" visible
  expect(ranges).toContainEqual([19, 21])
})

test("caret in the callout reveals `> ` and the token for the whole block", () => {
  // caret on the head line (offset 4, inside `> [!note]`)
  const ranges = atomicRanges(mkView(DOC, 4))
  // nothing in the callout is hidden while the caret is in it
  expect(ranges.every(([from]) => from < 3)).toBe(true)
})
