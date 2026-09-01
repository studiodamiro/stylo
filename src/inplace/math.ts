import { syntaxTree } from "@codemirror/language"
import { type EditorState, type Range, StateField } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view"
import katex from "katex"
import { revealedLines } from "./reveal"
import { inCodeContext, rangeRevealed, type Tree } from "./scan"

// The `\w` / whitespace guards keep "$100 and $200" from reading as math.
const INLINE_MATH = /(?<![\w$])\$(?!\s)([^\n$]+?)(?<!\s)\$(?![\w$])/g
const ONE_LINE_BLOCK = /(?<![\w$])\$\$([^\n$]+?)\$\$(?![\w$])/g
const ANY_BLOCK = /(?<![\w$])\$\$([^]+?)\$\$/g

class MathWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly block: boolean,
  ) {
    super()
  }

  override eq(other: MathWidget) {
    return other.src === this.src && other.block === this.block
  }

  toDOM() {
    const el = document.createElement(this.block ? "div" : "span")
    el.className = this.block ? "cm-inplace-math cm-inplace-math-block" : "cm-inplace-math"
    try {
      katex.render(this.src, el, { displayMode: this.block, throwOnError: false })
    } catch {
      el.textContent = this.block ? `$$${this.src}$$` : `$${this.src}$`
    }
    return el
  }

  override ignoreEvent() {
    return false
  }
}

/**
 * Viewport pass for `$…$` and single-line `$$…$$` — the CodeMirror grammar has
 * no math node. Off-caret matches become KaTeX widgets; their ranges are also
 * pushed to `atomic` so the caret steps over them. Multi-line `$$` blocks are
 * handled by `blockMathField` instead (a plugin may not replace line breaks).
 */
export function scanInlineMath(
  view: EditorView,
  from: number,
  to: number,
  revealed: Set<number>,
  tree: Tree,
  out: Range<Decoration>[],
  atomic: Range<Decoration>[],
): void {
  const text = view.state.doc.sliceString(from, to)
  if (!text.includes("$")) return
  const { doc } = view.state
  const claimed: Array<[number, number]> = []

  for (const m of text.matchAll(ONE_LINE_BLOCK)) {
    const src = (m[1] ?? "").trim()
    const start = from + (m.index ?? 0)
    const end = start + (m[0] ?? "").length
    if (!src || inCodeContext(tree, start + 2)) continue
    claimed.push([start, end])
    if (rangeRevealed(revealed, doc, start, end)) continue
    add(out, atomic, start, end, src, true)
  }

  for (const m of text.matchAll(INLINE_MATH)) {
    const src = (m[1] ?? "").trim()
    const start = from + (m.index ?? 0)
    const end = start + (m[0] ?? "").length
    if (!src || inCodeContext(tree, start + 1)) continue
    if (claimed.some(([s, e]) => start >= s && end <= e)) continue
    if (rangeRevealed(revealed, doc, start, end)) continue
    add(out, atomic, start, end, src, false)
  }
}

function add(
  out: Range<Decoration>[],
  atomic: Range<Decoration>[],
  from: number,
  to: number,
  src: string,
  block: boolean,
): void {
  const deco = Decoration.replace({ widget: new MathWidget(src, block) })
  out.push(deco.range(from, to))
  atomic.push(deco.range(from, to))
}

/**
 * Multi-line `$$…$$` blocks, whose delimiters sit alone on their own lines.
 * A state field (not a plugin) because the replacement spans line breaks. Not
 * viewport-scoped — the whole document is scanned — but `$$` blocks are few.
 */
export const blockMathField = StateField.define<DecorationSet>({
  create: buildBlockMath,
  update(value, tr) {
    return tr.docChanged || tr.selection ? buildBlockMath(tr.state) : value
  },
  provide: (field) => [
    EditorView.decorations.from(field),
    EditorView.atomicRanges.of((view) => view.state.field(field)),
  ],
})

function buildBlockMath(state: EditorState): DecorationSet {
  const text = state.doc.toString()
  if (!text.includes("$$")) return Decoration.none

  const out: Range<Decoration>[] = []
  const revealed = revealedLines(state)
  const tree = syntaxTree(state)

  for (const m of text.matchAll(ANY_BLOCK)) {
    const raw = m[0] ?? ""
    const src = (m[1] ?? "").trim()
    if (!src || !raw.includes("\n")) continue

    const start = m.index ?? 0
    const end = start + raw.length
    const startLine = state.doc.lineAt(start)
    const endLine = state.doc.lineAt(end)
    const before = state.doc.sliceString(startLine.from, start).trim()
    const after = state.doc.sliceString(end, endLine.to).trim()
    if (before !== "" || after !== "") continue
    if (inCodeContext(tree, start + 2)) continue
    if (rangeRevealed(revealed, state.doc, start, end)) continue

    out.push(
      Decoration.replace({ widget: new MathWidget(src, true), block: true }).range(start, end),
    )
  }

  return Decoration.set(out, true)
}
