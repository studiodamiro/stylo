/**
 * Hover a link or wikilink in the in-place canvas and a small bubble shows where
 * it points — the raw `(url)` of a `[text](url)`, or the `[[target]]`. Under
 * `reveal: "never"` the destination is otherwise never on screen, so this is the
 * read affordance for it (ADR-007 Stage 5, the hover half).
 */

import { syntaxTree } from "@codemirror/language"
import { type EditorView, hoverTooltip, type Tooltip } from "@codemirror/view"
import type { SyntaxNode } from "@lezer/common"
import { WIKILINK_PATTERN } from "../wikilink"
import { inPlaceConfigFacet } from "./config"

const stripAngles = (s: string): string => s.replace(/^<([^]*)>$/, "$1").trim()

const bubble = (from: number, to: number, text: string): Tooltip | null => {
  if (!text) return null
  return {
    pos: from,
    end: to,
    above: true,
    create() {
      const dom = document.createElement("div")
      dom.className = "cm-inplace-href-tip"
      dom.textContent = text
      return { dom }
    },
  }
}

/** The `[text](url)` destination at `pos`, or `null`. */
function linkDestAt(view: EditorView, pos: number): Tooltip | null {
  for (
    let node: SyntaxNode | null = syntaxTree(view.state).resolveInner(pos, -1);
    node;
    node = node.parent
  ) {
    if (node.name !== "Link") continue
    if (view.state.doc.sliceString(Math.max(0, node.from - 1), node.from) === "[") break // [[wiki]]
    const url = node.getChild("URL")
    const dest = url
      ? view.state.sliceDoc(url.from, url.to)
      : view.state.sliceDoc(node.from, node.to)
    return bubble(node.from, node.to, stripAngles(dest))
  }
  return null
}

/** The `[[target]]` at `pos` on its line, or `null`. */
function wikiTargetAt(view: EditorView, pos: number): Tooltip | null {
  const line = view.state.doc.lineAt(pos)
  for (const m of line.text.matchAll(WIKILINK_PATTERN)) {
    const from = line.from + (m.index ?? 0)
    const to = from + m[0].length
    if (pos < from || pos > to) continue
    return bubble(from, to, (m[1] ?? "").trim())
  }
  return null
}

export const linkHoverTooltip = hoverTooltip((view, pos): Tooltip | null => {
  const toggles = view.state.facet(inPlaceConfigFacet)
  return (
    (toggles.links ? linkDestAt(view, pos) : null) ??
    (toggles.wikilinks ? wikiTargetAt(view, pos) : null)
  )
})
