import type { EditorState } from "@codemirror/state"
import { EditorSelection } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { frontmatterRange } from "../frontmatter"

/** The 1-based line numbers the primary selection touches. */
export function selectedLines(state: EditorState): [number, number] {
  const { from, to } = state.selection.main
  return [state.doc.lineAt(from).number, state.doc.lineAt(to).number]
}

/**
 * Set, swap, or clear an ATX heading prefix on every line the selection touches.
 * A line already at `level` is cleared; any other level (or none) is set to it.
 */
export function toggleHeading(view: EditorView, level: number): boolean {
  const prefix = "#".repeat(level) + " "
  const s = view.state
  const [first, last] = selectedLines(s)
  const changes = []
  for (let n = first; n <= last; n++) {
    const line = s.doc.line(n)
    const m = /^(#{1,6}) +/.exec(line.text)
    if (m && m[1]!.length === level) {
      changes.push({ from: line.from, to: line.from + m[0].length })
    } else if (m) {
      changes.push({ from: line.from, to: line.from + m[0].length, insert: prefix })
    } else {
      changes.push({ from: line.from, insert: prefix })
    }
  }
  view.dispatch({ changes, scrollIntoView: true })
  view.focus()
  return true
}

/** Strip any ATX heading prefix from every line the selection touches — the
 *  explicit "back to body text" that toggling a heading level does obliquely. */
export function clearHeading(view: EditorView): boolean {
  const s = view.state
  const [first, last] = selectedLines(s)
  const changes = []
  for (let n = first; n <= last; n++) {
    const line = s.doc.line(n)
    const m = /^#{1,6} +/.exec(line.text)
    if (m) changes.push({ from: line.from, to: line.from + m[0].length })
  }
  if (!changes.length) return false
  view.dispatch({ changes, scrollIntoView: true })
  view.focus()
  return true
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
