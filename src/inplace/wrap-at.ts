/**
 * The hidden-marker inline construct at a document position — used by
 * `edit-boundaries.ts`'s Backspace/Delete/arrow commands, `edit-insert-assoc.ts`,
 * and the right-click menu's phrase-select (`menu-plugin.ts`). Split out of
 * `edit-boundaries.ts` since it is detection, not editing.
 */

import { syntaxTree } from "@codemirror/language"
import type { EditorState } from "@codemirror/state"
import type { SyntaxNode } from "@lezer/common"
import { WIKILINK_PATTERN } from "../wikilink"
import { inPlaceConfigFacet, revealModeFacet } from "./config"
import { revealedLines } from "./reveal"

/** Paired-marker inline nodes whose markers `decorate.ts` hides. */
const WRAP: Record<string, { markType: string; toggle: "emphasis" | "code" }> = {
  StrongEmphasis: { markType: "EmphasisMark", toggle: "emphasis" },
  Emphasis: { markType: "EmphasisMark", toggle: "emphasis" },
  Strikethrough: { markType: "StrikethroughMark", toggle: "emphasis" },
  InlineCode: { markType: "CodeMark", toggle: "code" },
}

export interface Wrap {
  from: number
  to: number
  contentFrom: number
  contentTo: number
  /** `"mark"` — a paired inline mark (`**`, `*`, `~~`, `` ` ``); `"link"` — a
   *  link or wikilink, whose label is not itself a Markdown context, so a
   *  right-click formats the *whole* construct rather than the label. */
  kind: "mark" | "link"
}

/** Are inline markers on this line hidden right now? */
export function markersHidden(state: EditorState, lineNumber: number): boolean {
  return state.facet(revealModeFacet) === "never" || !revealedLines(state).has(lineNumber)
}

/**
 * The hidden-marker inline construct enclosing `pos`, or `null`. With
 * `emphasisOnly`, only the paired-mark constructs whose *both* delimiters are
 * hidden count (strong / emphasis / strike / inline code) — links and wikilinks
 * keep a directly editable label, so their edges are not boundary-escaped.
 *
 * By default the construct's markers must be hidden right now (boundary editing
 * only applies then); `ignoreReveal` drops that check for callers that just want
 * the span — the right-click menu selecting the whole phrase, which should work
 * whether or not the caret has revealed the line.
 */
export function wrapAt(
  state: EditorState,
  pos: number,
  emphasisOnly = false,
  ignoreReveal = false,
): Wrap | null {
  const line = state.doc.lineAt(pos)
  if (!ignoreReveal && !markersHidden(state, line.number)) return null
  const toggles = state.facet(inPlaceConfigFacet)
  const tree = syntaxTree(state)

  for (const bias of [-1, 1] as const) {
    for (let node: SyntaxNode | null = tree.resolveInner(pos, bias); node; node = node.parent) {
      const rule = WRAP[node.name]
      if (rule) {
        if (!toggles[rule.toggle]) break
        const marks = node.getChildren(rule.markType)
        const open = marks[0]
        const close = marks[marks.length - 1]
        if (!open || !close || open === close) break
        return {
          from: node.from,
          to: node.to,
          contentFrom: open.to,
          contentTo: close.from,
          kind: "mark",
        }
      }
      if (node.name === "Link") {
        if (emphasisOnly) break
        if (state.doc.sliceString(Math.max(0, node.from - 1), node.from) === "[") break // [[wiki]] inner
        if (!toggles.links) break
        const marks = node.getChildren("LinkMark")
        if (marks.length < 2) break
        return {
          from: node.from,
          to: node.to,
          contentFrom: marks[0]!.to,
          contentTo: marks[1]!.from,
          kind: "link",
        }
      }
    }
  }

  // Wikilinks have no grammar node — scan the caret line.
  if (toggles.wikilinks && !emphasisOnly) {
    for (const m of line.text.matchAll(WIKILINK_PATTERN)) {
      const from = line.from + (m.index ?? 0)
      const to = from + m[0].length
      if (pos < from || pos > to) continue
      const target = m[1] ?? ""
      const labelled = m[2] != null
      return {
        from,
        to,
        contentFrom: from + 2 + (labelled ? target.length + 1 : 0),
        contentTo: to - 2,
        kind: "link",
      }
    }
  }
  return null
}
