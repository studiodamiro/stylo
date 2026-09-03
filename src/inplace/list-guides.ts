/**
 * Vertical indent guides for nested lists on the in-place canvas — one faint
 * rule per nesting level, drawn from the list's left padding (Obsidian /
 * Notion). Purely decorative: a `.cm-inplace-li` line decoration carrying the
 * nesting depth in `--sl-li-depth`, which the theme turns into that many guide
 * rules via a background gradient.
 *
 * Only a list item's *own* lines are decorated — the range stops before its
 * first nested list — so each line's depth is its innermost item's.
 */

import type { Range, Text } from "@codemirror/state"
import { Decoration } from "@codemirror/view"
import type { SyntaxNodeRef } from "@lezer/common"
import type { ResolvedToggles } from "./config"
import type { Tree } from "./scan"

/** Nesting depth of a `ListItem` node: 1 at the top level, 2 once nested, … */
function depthOf(node: SyntaxNodeRef): number {
  let depth = 1
  for (let p = node.node.parent; p; p = p.parent) {
    if (p.name === "ListItem") depth++
  }
  return depth
}

export function scanListGuides(
  from: number,
  to: number,
  tree: Tree,
  doc: Text,
  toggles: ResolvedToggles,
  out: Range<Decoration>[],
): void {
  if (!toggles.lists) return
  const seen = new Set<number>()

  tree.iterate({
    from,
    to,
    enter: (node) => {
      if (node.name !== "ListItem") return
      const guides = depthOf(node) - 1
      if (guides < 1) return

      const firstLine = doc.lineAt(node.from).number
      const nested = node.node.getChild("BulletList") ?? node.node.getChild("OrderedList")
      const lastLine = doc.lineAt(nested ? nested.from - 1 : Math.min(node.to, doc.length)).number

      for (let n = firstLine; n <= lastLine; n++) {
        if (seen.has(n)) continue
        seen.add(n)
        out.push(
          Decoration.line({
            class: "cm-inplace-li",
            attributes: { style: `--sl-li-depth:${guides}` },
          }).range(doc.line(n).from),
        )
      }
    },
  })
}
