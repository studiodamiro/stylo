import { EditorSelection, EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { expect, test } from "vitest"
import { selectionUIFacet } from "../src/inplace/config"
import { measureBarPlacement } from "../src/inplace/selection-bar-position"

function mkView(doc: string, anchor: number, head: number): EditorView {
  return new EditorView({
    state: EditorState.create({
      doc,
      selection: EditorSelection.single(anchor, head),
      extensions: [selectionUIFacet.of("bar"), EditorState.readOnly.of(true)],
    }),
  })
}

test("a read-only editor never places the selection bar, even over a non-empty selection", () => {
  const view = mkView("make this bold", 5, 9) // "this"
  expect(measureBarPlacement(view, document.createElement("div"), ["bold"])).toBeNull()
})
