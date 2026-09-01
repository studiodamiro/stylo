import { type EditorState, StateField, type Text } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view"

/**
 * The leading `---` … `---` YAML block, if present. The CodeMirror grammar has
 * no frontmatter node — it parses the fences as two horizontal rules — so the
 * region is found by hand and `decorate.ts` skips anything inside it.
 */
export function frontmatterRange(doc: Text): { from: number; to: number } | null {
  if (doc.lines < 2 || doc.line(1).text.trim() !== "---") return null
  for (let n = 2; n <= doc.lines; n++) {
    if (doc.line(n).text.trim() === "---") return { from: 0, to: doc.line(n).to }
  }
  return null
}

class FrontmatterWidget extends WidgetType {
  override eq() {
    return true
  }

  toDOM() {
    const el = document.createElement("div")
    el.className = "cm-inplace-frontmatter"
    el.textContent = "Properties"
    return el
  }
}

function build(state: EditorState): DecorationSet {
  const range = frontmatterRange(state.doc)
  if (!range) return Decoration.none

  const closing = state.doc.lineAt(range.to).number
  for (const r of state.selection.ranges) {
    if (state.doc.lineAt(r.from).number <= closing) return Decoration.none
  }

  return Decoration.set(
    Decoration.replace({ widget: new FrontmatterWidget(), block: true }).range(
      range.from,
      range.to,
    ),
  )
}

/**
 * Hides the frontmatter block behind a small chip, revealing the source when the
 * caret enters it. A state field, not a plugin, because the replacement spans
 * line breaks.
 */
export const frontmatterField = StateField.define<DecorationSet>({
  create: build,
  update: (value, tr) => (tr.docChanged || tr.selection ? build(tr.state) : value),
  provide: (field) => [
    EditorView.decorations.from(field),
    EditorView.atomicRanges.of((view) => view.state.field(field)),
  ],
})
