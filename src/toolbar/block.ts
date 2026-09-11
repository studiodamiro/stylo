import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"

/** The 1-based line numbers the primary selection touches. */
export function selectedLines(state: EditorState): [number, number] {
  const { from, to } = state.selection.main
  return [state.doc.lineAt(from).number, state.doc.lineAt(to).number]
}

export interface LinePrefixSpec {
  /** Detects this exact prefix; `match[0]` (from line start) is what gets stripped. */
  match: RegExp
  /**
   * Inserted after any indent when the prefix is absent. A function receives the
   * 0-based position among the lines being prefixed — used to number an ordered
   * list `1.`, `2.`, `3.` rather than stamping `1.` on every line.
   */
  insert: string | ((n: number) => string)
  /**
   * When set, an existing *sibling* prefix matched here (another list marker) is
   * overwritten rather than stacked, so the list buttons stay mutually
   * exclusive. `siblings[1]` is the indent, `siblings[0]` the marker to replace.
   */
  siblings?: RegExp
}

/**
 * Toggle a Markdown line prefix (`> `, `- `, `1. `, `- [ ] `) over the selected
 * lines. If every non-blank line already carries it the block is stripped;
 * otherwise it is added to the lines that lack it — replacing a sibling list
 * marker in place when `spec.siblings` says to.
 */
export function toggleLinePrefix(view: EditorView, spec: LinePrefixSpec): boolean {
  const s = view.state
  const [first, last] = selectedLines(s)
  // A lone blank line: start the list / quote on it rather than skipping it.
  const soleBlank = first === last && !s.doc.line(first).text.trim()
  let allHave = !soleBlank
  for (let n = first; n <= last && allHave; n++) {
    const t = s.doc.line(n).text
    if (t.trim() && !spec.match.test(t)) allHave = false
  }
  const changes = []
  let added = 0
  for (let n = first; n <= last; n++) {
    const line = s.doc.line(n)
    if (!line.text.trim() && !soleBlank) continue
    const m = spec.match.exec(line.text)
    if (allHave) {
      if (m) changes.push({ from: line.from, to: line.from + m[0].length })
      continue
    }
    if (m) continue // mixed selection — this line already has the target prefix
    const prefix = typeof spec.insert === "function" ? spec.insert(added++) : spec.insert
    const sib = spec.siblings?.exec(line.text)
    if (sib) {
      changes.push({
        from: line.from + (sib[1] ?? "").length,
        to: line.from + sib[0].length,
        insert: prefix,
      })
    } else {
      const indent = /^\s*/.exec(line.text)![0].length
      changes.push({ from: line.from + indent, insert: prefix })
    }
  }
  if (!changes.length) return false
  view.dispatch({ changes, scrollIntoView: true })
  view.focus()
  return true
}

/** True when the primary caret's line carries the prefix. */
export function linePrefixActive(state: EditorState, match: RegExp): boolean {
  return match.test(state.doc.lineAt(state.selection.main.head).text)
}
