import { type EditorState, StateField, type Text } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view"
import { inPlaceConfigFacet } from "./config"

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

function build(state: EditorState): DecorationSet {
  if (!state.facet(inPlaceConfigFacet).frontmatter) return Decoration.none
  const range = frontmatterRange(state.doc)
  if (!range) return Decoration.none

  const first = state.doc.lineAt(range.from).number
  const last = state.doc.lineAt(range.to).number
  const revealed = state.selection.ranges.some((r) => {
    const l = state.doc.lineAt(r.from).number
    return l >= first && l <= last
  })

  const out = []
  for (let n = first; n <= last; n++) {
    const line = state.doc.line(n)
    const cls = n === first ? "cm-inplace-fm cm-inplace-fm-first" : "cm-inplace-fm"
    out.push(Decoration.line({ class: cls }).range(line.from))
    // Hide the `---` fences off-caret; keep the row (no height collapse).
    if ((n === first || n === last) && !revealed && line.to > line.from) {
      out.push(Decoration.replace({}).range(line.from, line.to))
    }
  }
  return Decoration.set(out, true)
}

/**
 * Recesses the leading YAML block — muted, monospace, with a "Properties" label
 * on the first line — without collapsing it. Line decorations only: the rows
 * keep their height, so click-to-position stays accurate (an earlier `block`
 * widget that folded the block to a one-line chip desynced it). A state field,
 * not the plugin, only because the region has no grammar node to hang off.
 */
export const frontmatterField = StateField.define<DecorationSet>({
  create: build,
  update: (value, tr) => (tr.docChanged || tr.selection ? build(tr.state) : value),
  provide: (field) => EditorView.decorations.from(field),
})
