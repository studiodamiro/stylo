import type { EditorState } from "@codemirror/state"
import { EditorSelection } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"

/** A CommonMark thematic break: three or more `-`, `*`, or `_`, spaces allowed. */
const THEMATIC_BREAK = /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/

/**
 * Insert a `---` thematic break, or remove the one the caret is on. A blank line
 * is inserted before the rule when the current line has content — otherwise
 * CommonMark reads `text` + `---` as a setext H2, not a divider.
 */
export function toggleHorizontalRule(view: EditorView): boolean {
  const s = view.state
  const line = s.doc.lineAt(s.selection.main.head)

  if (THEMATIC_BREAK.test(line.text)) {
    view.dispatch({
      changes: { from: line.from, to: Math.min(line.to + 1, s.doc.length) },
      scrollIntoView: true,
    })
  } else if (line.text.trim() === "") {
    view.dispatch({
      changes: { from: line.from, to: line.to, insert: "---" },
      selection: EditorSelection.cursor(line.from + 3),
      scrollIntoView: true,
    })
  } else {
    const insert = "\n\n---\n"
    view.dispatch({
      changes: { from: line.to, insert },
      selection: EditorSelection.cursor(line.to + insert.length),
      scrollIntoView: true,
    })
  }
  view.focus()
  return true
}

/** True when the primary caret's line is a thematic break. */
export function horizontalRuleActive(state: EditorState): boolean {
  return THEMATIC_BREAK.test(state.doc.lineAt(state.selection.main.head).text)
}
