import { syntaxTree } from "@codemirror/language"
import type { Range } from "@codemirror/state"
import { Decoration, type DecorationSet, type EditorView } from "@codemirror/view"
import { frontmatterRange } from "./frontmatter"
import { scanInlineMath } from "./math"
import { decorateNode } from "./nodes"
import { revealedLines } from "./reveal"
import { scanWikilinks } from "./wikilinks"

export interface InPlaceDecorations {
  decorations: DecorationSet
  /** Widget replacements the caret should step over rather than into. */
  atomic: DecorationSet
}

/**
 * Build the in-place decoration set for the visible viewport only — the syntax
 * tree is walked across `view.visibleRanges`, never the whole document, so the
 * cost stays bounded on long notes. Decorations are collected unordered and
 * sorted by `Decoration.set`, which tolerates the overlaps that nested emphasis
 * and marker-inside-styled-span produce. Multi-line `$$` blocks and the
 * frontmatter block are handled by their own state fields (a plugin may not
 * replace line breaks).
 */
export function buildDecorations(view: EditorView): InPlaceDecorations {
  const out: Range<Decoration>[] = []
  const atomic: Range<Decoration>[] = []
  const revealed = revealedLines(view.state)
  const tree = syntaxTree(view.state)
  const { doc } = view.state
  const ctx = { doc, revealed, out, atomic, fmEnd: frontmatterRange(doc)?.to ?? -1 }

  for (const range of view.visibleRanges) {
    tree.iterate({
      from: range.from,
      to: range.to,
      enter: (node) => decorateNode(node, ctx),
    })
    scanWikilinks(view, range.from, range.to, revealed, tree, out)
    scanInlineMath(view, range.from, range.to, revealed, tree, out, atomic)
  }

  return {
    decorations: Decoration.set(out, true),
    atomic: Decoration.set(atomic, true),
  }
}
