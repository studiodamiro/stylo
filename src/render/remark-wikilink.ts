import type { Link, Root, Text } from "mdast"
import { visit } from "unist-util-visit"

const PATTERN = /\[\[([^\]|\n]+?)(?:\|([^\]\n]+?))?\]\]/g

/**
 * Rewrites `[[target]]` and `[[target|label]]` inside text into link nodes that
 * carry a `data-wikilink` attribute holding the target. The rendered href is
 * inert (`#`); navigation is the host's job via `onWikiLinkClick`.
 */
export function remarkWikilink() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (parent == null || index == null || !node.value.includes("[[")) return

      const out: Array<Text | Link> = []
      let cursor = 0

      for (const match of node.value.matchAll(PATTERN)) {
        const [raw = "", rawTarget = "", rawLabel] = match
        const start = match.index ?? 0
        if (start > cursor) {
          out.push({ type: "text", value: node.value.slice(cursor, start) })
        }
        out.push({
          type: "link",
          url: "#",
          data: { hProperties: { "data-wikilink": rawTarget.trim() } },
          children: [{ type: "text", value: (rawLabel ?? rawTarget).trim() }],
        })
        cursor = start + raw.length
      }

      if (cursor === 0) return
      if (cursor < node.value.length) {
        out.push({ type: "text", value: node.value.slice(cursor) })
      }

      parent.children.splice(index, 1, ...out)
      return index + out.length
    })
  }
}
