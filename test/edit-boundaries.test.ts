import { markdownLanguage } from "@codemirror/lang-markdown"
import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { expect, test } from "vitest"
import { inPlaceConfigFacet, resolveToggles, revealModeFacet } from "../src/inplace/config"
import {
  deleteAcrossMarkerBackward,
  deleteAcrossMarkerForward,
} from "../src/inplace/edit-boundaries"
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

test("Backspace at the front of a bold word deletes the space, keeps the bold", () => {
  const view = mkView("a **bold** b", 4) // caret visually before "bold", just past the hidden **
  expect(deleteAcrossMarkerBackward(view)).toBe(true)
  expect(view.state.doc.toString()).toBe("a**bold** b")
})

test("Backspace just past the hidden closing ** removes the last content char, keeps the bold", () => {
  const view = mkView("a **bold** b", 10)
  expect(deleteAcrossMarkerBackward(view)).toBe(true)
  expect(view.state.doc.toString()).toBe("a **bol** b")
})

test("nested ***bold+italic***: Backspace at the front keeps both marks", () => {
  const view = mkView("x ***b*** y", 5) // caret before "b"
  expect(deleteAcrossMarkerBackward(view)).toBe(true)
  expect(view.state.doc.toString()).toBe("x***b*** y")
})

test("Delete before a bold word removes the first content char, keeps the bold", () => {
  const view = mkView("a **bold** b", 2) // caret before the hidden opening **
  expect(deleteAcrossMarkerForward(view)).toBe(true)
  expect(view.state.doc.toString()).toBe("a **old** b")
})

test("Delete after a bold word's content eats the following space, keeps the bold", () => {
  const view = mkView("a **bold** b", 8)
  expect(deleteAcrossMarkerForward(view)).toBe(true)
  expect(view.state.doc.toString()).toBe("a **bold**b")
})

test("Backspace inside the content is left to the default handler", () => {
  const view = mkView("a **bold** b", 6)
  expect(deleteAcrossMarkerBackward(view)).toBe(false)
  expect(view.state.doc.toString()).toBe("a **bold** b")
})

test("emptying a wrapper's last character takes the now-useless markers with it", () => {
  const view = mkView("a **x** b", 7) // caret just past the hidden closing **
  expect(deleteAcrossMarkerBackward(view)).toBe(true)
  expect(view.state.doc.toString()).toBe("a  b")
})

test("Backspace steps over a hidden [ and deletes the space before a link", () => {
  const view = mkView("see [x](http://a) end", 5)
  expect(deleteAcrossMarkerBackward(view)).toBe(true)
  expect(view.state.doc.toString()).toBe("see[x](http://a) end")
})

test("Backspace steps over a hidden [[ and deletes the space before a wikilink", () => {
  const view = mkView("go [[Page]] now", 5)
  expect(deleteAcrossMarkerBackward(view)).toBe(true)
  expect(view.state.doc.toString()).toBe("go[[Page]] now")
})

test("with reveal: caret and the caret on the line, the key is not hijacked", () => {
  const view = mkView("a **bold** b", 4, "caret")
  expect(deleteAcrossMarkerBackward(view)).toBe(false)
  expect(view.state.doc.toString()).toBe("a **bold** b")
})

test("a non-empty selection is left alone", () => {
  const view = new EditorView({
    state: EditorState.create({
      doc: "a **bold** b",
      selection: EditorSelection.single(4, 8),
      extensions: [
        markdownLanguage,
        inPlaceConfigFacet.of(resolveToggles()),
        revealModeFacet.of("never"),
        inPlaceDecorations(),
      ],
    }),
  })
  expect(deleteAcrossMarkerBackward(view)).toBe(false)
})
