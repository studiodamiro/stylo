import type { EditorState } from "@codemirror/state"
import { EditorSelection } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { frontmatterRange } from "../frontmatter"

/**
 * Toggle the leading `---` YAML block. With none present, the top of the
 * document — line 1 through the last selected line — is wrapped in `---` fences
 * (so the "type it, select it, click" flow works). With one present, only the
 * two fence lines are removed; the YAML text stays in the document. Keeping it
 * out of rendered output is the preview pipeline's job, not this toggle's.
 */
export function toggleFrontmatter(view: EditorView): boolean {
  const s = view.state
  const range = frontmatterRange(s.doc)

  if (range) {
    const open = s.doc.lineAt(range.from)
    const close = s.doc.lineAt(range.to)
    view.dispatch({
      changes: [
        { from: open.from, to: Math.min(open.to + 1, s.doc.length) },
        { from: close.from, to: Math.min(close.to + 1, s.doc.length) },
      ],
      scrollIntoView: true,
    })
  } else {
    const lastLine = s.doc.lineAt(s.selection.main.to).number
    view.dispatch({
      changes: [
        { from: 0, insert: "---\n" },
        { from: s.doc.line(lastLine).to, insert: "\n---" },
      ],
      selection: EditorSelection.cursor(4), // first line inside the block
      scrollIntoView: true,
    })
  }
  view.focus()
  return true
}

/** True when the document has a leading `---` YAML block. */
export function frontmatterActive(state: EditorState): boolean {
  return frontmatterRange(state.doc) !== null
}
