import type { Range } from "@codemirror/state"
import { Decoration, type EditorView } from "@codemirror/view"
import { WIKILINK_PATTERN } from "../wikilink"
import { inCodeContext, type Tree } from "./scan"

/**
 * Regex pass for `[[wikilinks]]` — the CodeMirror grammar has no node for them.
 * Collapses each match to its label and tags it with `data-stylo-wikilink`
 * (the delegated click handler in `inPlaceExtension` reads that attribute).
 */
export function scanWikilinks(
  view: EditorView,
  from: number,
  to: number,
  revealed: Set<number>,
  tree: Tree,
  out: Range<Decoration>[],
): void {
  const text = view.state.doc.sliceString(from, to)
  if (!text.includes("[[")) return

  for (const match of text.matchAll(WIKILINK_PATTERN)) {
    const [raw = "", rawTarget = "", rawLabel] = match
    const target = rawTarget.trim()
    const start = from + (match.index ?? 0)
    if (!target || inCodeContext(tree, start + 1)) continue

    const end = start + raw.length
    const labelStart = rawLabel != null ? start + 2 + rawTarget.length + 1 : start + 2
    const labelEnd = end - 2

    out.push(
      Decoration.mark({
        class: "cm-inplace-link cm-inplace-wikilink",
        attributes: { "data-stylo-wikilink": target },
      }).range(labelStart, labelEnd),
    )
    if (!revealed.has(view.state.doc.lineAt(start).number)) {
      out.push(Decoration.replace({}).range(start, labelStart))
      out.push(Decoration.replace({}).range(labelEnd, end))
    }
  }
}
