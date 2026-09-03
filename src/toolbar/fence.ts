import { syntaxTree } from "@codemirror/language"
import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { selectedLines } from "./block"

/** The `{ from, to }` of the fenced code block enclosing `pos`, or `null`. */
function enclosingFence(state: EditorState, pos: number): { from: number; to: number } | null {
  for (let node = syntaxTree(state).resolveInner(pos, 0); node; node = node.parent!) {
    if (node.name === "FencedCode") return { from: node.from, to: node.to }
    if (!node.parent) break
  }
  return null
}

/**
 * Wrap the selected lines in a ```` ``` ```` fence, or unwrap the block when the
 * caret already sits inside one.
 */
export function toggleFencedCode(view: EditorView): boolean {
  const s = view.state
  const fence = enclosingFence(s, s.selection.main.head)

  if (fence) {
    const open = s.doc.lineAt(fence.from)
    const close = s.doc.lineAt(fence.to)
    const changes = [{ from: open.from, to: Math.min(open.to + 1, s.doc.length) }]
    if (close.number !== open.number) {
      changes.push({ from: Math.max(close.from - 1, 0), to: close.to })
    }
    view.dispatch({ changes, scrollIntoView: true })
  } else {
    const [first, last] = selectedLines(s)
    view.dispatch({
      changes: [
        { from: s.doc.line(first).from, insert: "```\n" },
        { from: s.doc.line(last).to, insert: "\n```" },
      ],
      // Land the caret on the line between the fences, not before the opener.
      selection: { anchor: s.doc.line(first).from + 4 },
      scrollIntoView: true,
    })
  }
  view.focus()
  return true
}

/** True when the primary caret is inside a fenced code block. */
export function fencedCodeActive(state: EditorState): boolean {
  return enclosingFence(state, state.selection.main.head) !== null
}

/**
 * The info-string (language) span on the opening fence of the block at the
 * caret, plus its current text. `null` when the caret is not in a fence. The
 * opening line may be hidden in the seamless canvas, but its text is still in
 * the document, so this stays editable through the menu.
 */
export function fenceInfoAt(
  state: EditorState,
): { from: number; to: number; lang: string } | null {
  const fence = enclosingFence(state, state.selection.main.head)
  if (!fence) return null
  const open = state.doc.lineAt(fence.from)
  const m = /^(\s*(?:`{3,}|~{3,})[ \t]*)(.*?)[ \t]*$/.exec(open.text)
  if (!m) return null
  const from = open.from + m[1]!.length
  return { from, to: from + m[2]!.length, lang: m[2]! }
}

/** A line that is exactly a `$$` math fence. */
const MATH_FENCE = /^\s*\$\$\s*$/

/**
 * The `[openLine, closeLine]` of the `$$` block enclosing `caretLine`, or
 * `null`. Found by pairing `$$` fence lines across the whole document — the
 * Markdown grammar has no math node to walk.
 */
function enclosingMath(state: EditorState, caretLine: number): [number, number] | null {
  let openLine = 0
  let count = 0
  for (let n = 1; n <= state.doc.lines; n++) {
    if (!MATH_FENCE.test(state.doc.line(n).text)) continue
    count++
    if (count % 2 === 1) {
      openLine = n
      // The caret sitting on the opening `$$` still counts as inside the block.
      if (n > caretLine) return null
    } else if (n >= caretLine) {
      return [openLine, n]
    }
  }
  return null
}

/**
 * Wrap the selected lines in a `$$` … `$$` block, or unwrap the block the caret
 * already sits in.
 */
export function toggleMathBlock(view: EditorView): boolean {
  const s = view.state
  const [first, last] = selectedLines(s)
  const pair = enclosingMath(s, s.doc.lineAt(s.selection.main.head).number)

  if (pair) {
    const openLine = s.doc.line(pair[0])
    const closeLine = s.doc.line(pair[1])
    view.dispatch({
      changes: [
        { from: openLine.from, to: Math.min(openLine.to + 1, s.doc.length) },
        { from: Math.max(closeLine.from - 1, 0), to: closeLine.to },
      ],
      scrollIntoView: true,
    })
  } else {
    view.dispatch({
      changes: [
        { from: s.doc.line(first).from, insert: "$$\n" },
        { from: s.doc.line(last).to, insert: "\n$$" },
      ],
      // Land the caret on the line between the fences, not before the opener.
      selection: { anchor: s.doc.line(first).from + 3 },
      scrollIntoView: true,
    })
  }
  view.focus()
  return true
}

/** True when the primary caret is inside a `$$` math block. */
export function mathBlockActive(state: EditorState): boolean {
  return enclosingMath(state, state.doc.lineAt(state.selection.main.head).number) !== null
}
