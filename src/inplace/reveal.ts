import type { EditorState } from "@codemirror/state"

/**
 * Line numbers (1-based) that a selection range currently touches. A node whose
 * line is in this set keeps its raw Markdown markers visible for editing;
 * elsewhere the decoration builder hides them.
 */
export function revealedLines(state: EditorState): Set<number> {
  const lines = new Set<number>()
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number
    const last = state.doc.lineAt(range.to).number
    for (let n = first; n <= last; n++) lines.add(n)
  }
  return lines
}
