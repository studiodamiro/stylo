import type { Blockquote, Root } from "mdast"
import { visit } from "unist-util-visit"
import { CALLOUT_TOKEN, calloutBucket } from "../callout"

/**
 * Turns an Obsidian callout blockquote (`> [!note] Title`) into a
 * `<blockquote class="stylo-callout stylo-callout-<bucket>" data-callout="note">`.
 * The `[!type]` token is stripped from the first line; a `::before` label keyed
 * off `data-callout` stands in for it (matching the in-place canvas). The
 * `-` / `+` fold marker is accepted and ignored — the box always renders open.
 */
export function remarkCallout() {
  return (tree: Root) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const para = node.children[0]
      if (para?.type !== "paragraph") return
      const first = para.children[0]
      if (first?.type !== "text") return

      const m = CALLOUT_TOKEN.exec(first.value)
      if (!m) return

      first.value = first.value.slice(m[0].length)
      const type = m[1]!.toLowerCase()
      node.data ??= {}
      const props = (node.data.hProperties ??= {}) as Record<string, unknown>
      props.className = ["stylo-callout", `stylo-callout-${calloutBucket(type)}`]
      props["data-callout"] = type
    })
  }
}
