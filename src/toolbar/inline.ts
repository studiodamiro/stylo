import { EditorSelection } from "@codemirror/state"
import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { esc, linkAtIn, wikiLinkAtIn, wrapOp } from "./inline-ops"

/**
 * Toggle an inline wrapping mark (`**`, `*`, `~~`, `` ` ``, `$`) around each
 * selection range. A range already wrapped — whether the marks are inside or
 * around the selection — is unwrapped; an empty range gets an empty pair with
 * the caret parked between the marks. Applying `*` to `**bold**` (or `**` to
 * `*em*`) nests rather than eating a marker. The edit logic lives in
 * {@link wrapOp}; this binds it to the view's selection(s).
 */
export function toggleWrap(view: EditorView, mark: string): boolean {
  const text = view.state.doc.toString()
  view.dispatch({
    ...view.state.changeByRange((range) => {
      const op = wrapOp(text, range.from, range.to, mark)
      return {
        changes: op.changes,
        range:
          op.from === op.to
            ? EditorSelection.cursor(op.from)
            : EditorSelection.range(op.from, op.to),
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

/** The `[text](url)` span under the primary caret, in document coordinates. */
function linkAt(state: EditorState): { from: number; to: number; text: string } | null {
  const { head } = state.selection.main
  const line = state.doc.lineAt(head)
  const hit = linkAtIn(line.text, head - line.from)
  return hit ? { from: line.from + hit.from, to: line.from + hit.to, text: hit.label } : null
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

/** The `[[target|label]]` span under the primary caret, in document coordinates. */
function wikiLinkAt(state: EditorState): { from: number; to: number; text: string } | null {
  const { head } = state.selection.main
  const line = state.doc.lineAt(head)
  const hit = wikiLinkAtIn(line.text, head - line.from)
  return hit ? { from: line.from + hit.from, to: line.from + hit.to, text: hit.label } : null
}

/**
 * Wrap the selection as `[[target]]` with the target text selected — or, when
 * the caret is already in a wikilink, unwrap it: the display text (the label if
 * there is one, else the target) stays, the `[[ … ]]` and any `|label` go.
 */
export function toggleWikiLink(view: EditorView): boolean {
  const existing = wikiLinkAt(view.state)
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
  const text = view.state.sliceDoc(from, to) || "target"
  view.dispatch({
    changes: { from, to, insert: `[[${text}]]` },
    selection: EditorSelection.range(from + 2, from + 2 + text.length),
    scrollIntoView: true,
  })
  view.focus()
  return true
}

/** True when the primary caret sits inside a `[[…]]` span on its line. */
export function wikiLinkActive(state: EditorState): boolean {
  return wikiLinkAt(state) !== null
}
