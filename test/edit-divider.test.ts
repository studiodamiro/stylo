import { markdownLanguage } from "@codemirror/lang-markdown"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { expect, test } from "vitest"
import { inPlaceConfigFacet, resolveToggles, revealModeFacet } from "../src/inplace/config"
import { onHiddenRule, removeHiddenRule } from "../src/inplace/edit-divider"
import { inPlaceDecorations } from "../src/inplace/plugin"

function mkView(doc: string, head: number, reveal: "caret" | "never" = "never"): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc,
      selection: EditorSelection.single(head),
      extensions: [
        markdownLanguage,
        inPlaceConfigFacet.of(resolveToggles()),
        revealModeFacet.of(reveal),
        inPlaceDecorations(),
      ],
    }),
  })
}

test("Backspace on a rendered `---` line removes the rule", () => {
  const view = mkView("above\n\n---\n\nbelow", 7) // start of the `---` line
  expect(onHiddenRule(view.state)).toBe(true)
  expect(removeHiddenRule(view)).toBe(true)
  expect(view.state.doc.toString()).toBe("above\n\n\nbelow")
})

test("`***` is a rule too", () => {
  const view = mkView("a\n\n***\n\nb", 4)
  expect(onHiddenRule(view.state)).toBe(true)
  expect(removeHiddenRule(view)).toBe(true)
  expect(view.state.doc.toString()).toBe("a\n\n\nb")
})

test("no-op away from a rule", () => {
  const view = mkView("above\n\n---\n\nbelow", 0)
  expect(onHiddenRule(view.state)).toBe(false)
  expect(removeHiddenRule(view)).toBe(false)
  expect(view.state.doc.toString()).toBe("above\n\n---\n\nbelow")
})

test("no-op under reveal: 'caret' with the caret on the rule — a normal edit runs", () => {
  const view = mkView("above\n\n---\n\nbelow", 7, "caret")
  expect(onHiddenRule(view.state)).toBe(false)
  expect(removeHiddenRule(view)).toBe(false)
})

test("no-op with a non-empty selection", () => {
  const view = new EditorView({
    state: EditorState.create({
      doc: "above\n\n---\n\nbelow",
      selection: EditorSelection.single(7, 10),
      extensions: [
        markdownLanguage,
        inPlaceConfigFacet.of(resolveToggles()),
        revealModeFacet.of("never"),
        inPlaceDecorations(),
      ],
    }),
  })
  expect(onHiddenRule(view.state)).toBe(false)
  expect(removeHiddenRule(view)).toBe(false)
})

test("a Setext underline (`---` under text) is not a rule", () => {
  const view = mkView("My Title\n---\n\nbody", 9) // on the `---` underline
  expect(onHiddenRule(view.state)).toBe(false)
  expect(removeHiddenRule(view)).toBe(false)
})
