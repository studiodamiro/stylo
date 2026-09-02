import { EditorSelection } from "@codemirror/state"
import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { WIKILINK_PATTERN } from "../wikilink"

/** Regex-escape a literal so it can be spliced into a pattern. */
function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** The characters that can stack as inline marks around a span. */
const MARK_CHARS = "*~`$"

/** The maximal run of {@link MARK_CHARS} touching `pos` on the given side. */
function markRun(s: EditorState, pos: number, dir: -1 | 1): { text: string; from: number } {
  const end = s.doc.length
  let from = pos
  let to = pos
  if (dir < 0) while (from > 0 && MARK_CHARS.includes(s.sliceDoc(from - 1, from))) from--
  else while (to < end && MARK_CHARS.includes(s.sliceDoc(to, to + 1))) to++
  return { text: s.sliceDoc(from, dir < 0 ? pos : to), from }
}

/** Offset and length of the first group of `ch` inside a mark run. */
function charGroup(run: string, ch: string): { start: number; len: number } | null {
  const start = run.indexOf(ch)
  if (start < 0) return null
  let len = 0
  while (run[start + len] === ch) len++
  return { start, len }
}

/**
 * Do `before` / `after` counts of the mark character flanking a range represent
 * an instance of exactly `mark` to strip? A `**`/`~~` needs at least its length;
 * a single `*` needs an *odd* count — so `*x*` and `***x***` unwrap the italic,
 * but `**x**` keeps the bold and the italic nests instead.
 */
function surroundsExactly(before: number, after: number, m: number): boolean {
  if (before < m || after < m) return false
  return m > 1 || (before % 2 === 1 && after % 2 === 1)
}

/**
 * Toggle an inline wrapping mark (`**`, `*`, `~~`, `` ` ``, `$`) around each
 * selection range. A range already wrapped — whether the marks are inside or
 * around the selection — is unwrapped; an empty range gets an empty pair with
 * the caret parked between the marks. Applying `*` to `**bold**` (or `**` to
 * `*em*`) nests rather than eating a marker.
 */
export function toggleWrap(view: EditorView, mark: string): boolean {
  const m = mark.length
  const ch = mark[0]!
  view.dispatch({
    ...view.state.changeByRange((range) => {
      const { from, to } = range
      const s = view.state
      const inner = s.sliceDoc(from, to)

      // The selection covers the marks: `**bold**` is selected.
      let lead = 0
      while (inner[lead] === ch) lead++
      let tail = 0
      while (inner[inner.length - 1 - tail] === ch) tail++
      if (
        inner.length >= 2 * m &&
        inner.startsWith(mark) &&
        inner.endsWith(mark) &&
        surroundsExactly(lead, tail, m)
      ) {
        return {
          changes: [
            { from, to: from + m },
            { from: to - m, to },
          ],
          range: EditorSelection.range(from, to - 2 * m),
        }
      }
      // `mark` is somewhere in the stack of marks flanking the range — possibly
      // with other marks (`~~`, `*`) between it and the text, as in
      // `***~~word~~***`. Find its char-group on each side and strip `m` from
      // the group's inner edge, leaving any surrounding marks untouched.
      const left = markRun(s, from, -1)
      const right = markRun(s, to, 1)
      const lg = charGroup(left.text, ch)
      const rg = charGroup(right.text, ch)
      if (lg && rg && surroundsExactly(lg.len, rg.len, m)) {
        const lInner = left.from + lg.start + lg.len // group's edge nearest the text
        const rInner = to + rg.start
        return {
          changes: [
            { from: lInner - m, to: lInner },
            { from: rInner, to: rInner + m },
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

/** The `[[target|label]]` span under the primary caret, or `null`. */
function wikiLinkAt(state: EditorState): { from: number; to: number; text: string } | null {
  const { head } = state.selection.main
  const line = state.doc.lineAt(head)
  for (const m of line.text.matchAll(WIKILINK_PATTERN)) {
    const from = line.from + (m.index ?? 0)
    const to = from + m[0].length
    if (head >= from && head <= to) return { from, to, text: m[2] || m[1] || "" }
  }
  return null
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
