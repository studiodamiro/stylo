import type { Paragraph, PhrasingContent, Root, Text } from "mdast"
import { SKIP, visit } from "unist-util-visit"
import { EMBED_PATTERN, isLoneEmbed } from "../embed"

/**
 * Turns `![[ref]]` transclusion syntax into empty carrier elements the `Embed`
 * component (wired in `Preview`) fills from the host's `embedSource`.
 *
 * - A **lone** `![[ref]]` — the whole paragraph, trimmed — becomes a block
 *   `<div class="stylo-embed" data-stylo-embed="ref">`.
 * - A `![[ref]]` **inside other text** becomes an inline
 *   `<span class="stylo-embed" data-stylo-embed-inline="ref">`, and the
 *   surrounding text is preserved around it. The host node should be phrasing
 *   content in this case.
 *
 * `![[…]]` inside inline or fenced code is left literal (it is not a `text`
 * node). Must run before `remarkWikilink`, or the inner `[[ref]]` is rewritten
 * to a link first. Off unless the consumer passes `embedSource` — `Preview` only
 * adds this plugin then.
 */
export function remarkEmbed() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node: Paragraph) => {
      const only = node.children.length === 1 ? node.children[0] : undefined
      if (only?.type !== "text" || !isLoneEmbed(only.value)) return

      EMBED_PATTERN.lastIndex = 0
      const ref = (EMBED_PATTERN.exec(only.value.trim())?.[1] ?? "").trim()
      if (!ref) return

      node.children = []
      node.data ??= {}
      node.data.hName = "div"
      node.data.hProperties = { className: ["stylo-embed"], "data-stylo-embed": ref }
    })

    visit(tree, "text", (node: Text, index, parent) => {
      if (index == null || parent == null || !node.value.includes("![[")) return

      const parts: PhrasingContent[] = []
      let cursor = 0
      // `matchAll` seeds its internal copy from the shared regex's `lastIndex`;
      // reset it so the scan starts at 0 (the lone-paragraph pass above left it
      // mid-string).
      EMBED_PATTERN.lastIndex = 0
      for (const match of node.value.matchAll(EMBED_PATTERN)) {
        const ref = (match[1] ?? "").trim()
        if (!ref) continue
        const start = match.index ?? 0
        if (start > cursor) parts.push({ type: "text", value: node.value.slice(cursor, start) })
        parts.push({
          type: "text",
          value: "",
          data: {
            hName: "span",
            hProperties: { className: ["stylo-embed"], "data-stylo-embed-inline": ref },
            hChildren: [],
          },
        })
        cursor = start + match[0].length
      }

      if (!parts.length) return
      if (cursor < node.value.length) parts.push({ type: "text", value: node.value.slice(cursor) })
      parent.children.splice(index, 1, ...parts)
      return [SKIP, index + parts.length]
    })
  }
}
