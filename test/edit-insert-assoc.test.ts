import { markdownLanguage } from "@codemirror/lang-markdown"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { expect, test } from "vitest"
import { inPlaceConfigFacet, resolveToggles, revealModeFacet } from "../src/inplace/config"
import { inPlaceInsertAssociation } from "../src/inplace/edit-insert-assoc"
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
        inPlaceInsertAssociation,
      ],
    }),
  })
}

const type = (view: EditorView, ch: string) => view.dispatch(view.state.replaceSelection(ch))

test("typing at the end of a bold word lands outside the markers", () => {
  const view = mkView("a **bold** b", 8) // just before the hidden closing **
  type(view, "x")
  expect(view.state.doc.toString()).toBe("a **bold**x b")
  expect(view.state.selection.main.head).toBe(11)
})

test("typing at the start of a bold word lands before the markers", () => {
  const view = mkView("a **bold** b", 4) // just after the hidden opening **
  type(view, "x")
  expect(view.state.doc.toString()).toBe("a x**bold** b")
})

test("nested ***word*** is escaped in full at the trailing edge", () => {
  const view = mkView("a ***x*** b", 6) // just before the innermost closing *
  type(view, "y")
  expect(view.state.doc.toString()).toBe("a ***x***y b")
})

test("nested ***word*** is escaped in full at the leading edge", () => {
  const view = mkView("a ***x*** b", 5) // just after the innermost opening *
  type(view, "y")
  expect(view.state.doc.toString()).toBe("a y***x*** b")
})

test("typing inside the word is left alone", () => {
  const view = mkView("a **bold** b", 6)
  type(view, "x")
  expect(view.state.doc.toString()).toBe("a **boxld** b")
})

test("inline code boundary is escaped too", () => {
  const view = mkView("a `code` b", 7) // before the closing `
  type(view, "x")
  expect(view.state.doc.toString()).toBe("a `code`x b")
})

test("reveal: 'caret' with the caret on the line does not remap", () => {
  const view = mkView("a **bold** b", 8, "caret")
  type(view, "x")
  expect(view.state.doc.toString()).toBe("a **boldx** b")
})

test("a link label edge is not escaped — the label stays editable", () => {
  const view = mkView("see [label](http://a) end", 10) // end of "label"
  type(view, "x")
  expect(view.state.doc.toString()).toBe("see [labelx](http://a) end")
})
