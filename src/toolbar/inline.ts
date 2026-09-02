import { EditorSelection } from "@codemirror/state"
import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"

/** Regex-escape a literal so it can be spliced into a pattern. */
function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Toggle an inline wrapping mark (`**`, `*`, `~~`, `` ` ``, `$`) around each
 * selection range. A range already wrapped — whether the marks are inside or
 * around the selection — is unwrapped; an empty range gets an empty pair with
 * the caret parked between the marks.
 */
export function toggleWrap(view: EditorView, mark: string): boolean {
  const m = mark.length
  view.dispatch({
    ...view.state.changeByRange((range) => {
      const { from, to } = range
      const s = view.state
      const inner = s.sliceDoc(from, to)

      // The selection covers the marks: `**bold**` is selected.
      if (inner.length >= 2 * m && inner.startsWith(mark) && inner.endsWith(mark)) {
        return {
          changes: [
            { from, to: from + m },
            { from: to - m, to },
          ],
          range: EditorSelection.range(from, to - 2 * m),
        }
      }
      // The marks sit just outside the selection or caret.
      if (s.sliceDoc(from - m, from) === mark && s.sliceDoc(to, to + m) === mark) {
        return {
          changes: [
            { from: from - m, to: from },
            { from: to, to: to + m },
          ],
          range:
            from === to
              ? EditorSelection.cursor(from - m)
              : EditorSelection.range(from - m, to - m),
        }
      }
      // Otherwise wrap.
      return {
        changes: [
          { from, insert: mark },
          { from: to, insert: mark },
        ],
        range:
          from === to ? EditorSelection.cursor(from + m) : EditorSelection.range(from + m, to + m),
      }
    }),
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/** True when the primary selection sits within a `mark…mark` span on its line. */
export function wrapActive(state: EditorState, mark: string): boolean {
  const range = state.selection.main
  const line = state.doc.lineAt(range.head)
  const pattern = new RegExp(esc(mark) + "(?!\\s)(?:[^]*?\\S)??" + esc(mark), "g")
  for (let m: RegExpExecArray | null; (m = pattern.exec(line.text));) {
    if (m[0].length <= 2 * mark.length) continue // an empty pair — `$$`, `****`
    // Inline `$…$` must not be read out of a `$$` block-math fence.
    if (
      mark === "$" &&
      (line.text[m.index - 1] === "$" || line.text[m.index + m[0].length] === "$")
    ) {
      continue
    }
    const start = line.from + m.index
    if (range.from >= start && range.to <= start + m[0].length) return true
  }
  return false
}

/** The `[text](url)` span under the primary caret, or `null`. */
function linkAt(state: EditorState): { from: number; to: number; text: string } | null {
  const { head } = state.selection.main
  const line = state.doc.lineAt(head)
  const re = /\[([^\]]*)\]\([^)]*\)/g
  for (let m: RegExpExecArray | null; (m = re.exec(line.text));) {
    const from = line.from + m.index
    const to = from + m[0].length
    if (head >= from && head <= to) return { from, to, text: m[1] ?? "" }
  }
  return null
}

/**
 * Wrap the selection as `[text](url)` with the `url` placeholder selected — or,
 * when the caret is already in a link, unlink it: the label text stays, the
 * `](url)` wrapper goes.
 */
export function toggleLink(view: EditorView): boolean {
  const existing = linkAt(view.state)
  if (existing) {
    view.dispatch({
      changes: { from: existing.from, to: existing.to, insert: existing.text },
      selection: EditorSelection.range(existing.from, existing.from + existing.text.length),
      scrollIntoView: true,
    })
    view.focus()
    return true
  }
  const { from, to } = view.state.selection.main
  const text = view.state.sliceDoc(from, to) || "text"
  const urlAt = from + text.length + 3 // past `[` + text + `](`
  view.dispatch({
    changes: { from, to, insert: `[${text}](url)` },
    selection: EditorSelection.range(urlAt, urlAt + 3),
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/** True when the primary caret sits inside a `[…](…)` span on its line. */
export function linkActive(state: EditorState): boolean {
  return linkAt(state) !== null
}
