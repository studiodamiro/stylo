import type { Paragraph, Root } from "mdast"
import { visit } from "unist-util-visit"
import { EMBED_PATTERN, isLoneEmbed } from "../embed"

/**
 * Turns a paragraph that is nothing but `![[ref]]` into an empty
 * `<div class="stylo-embed" data-stylo-embed="ref">`. The `Embed` component
 * (wired in `Preview`) reads `data-stylo-embed` and renders whatever the host's
 * `embedSource` resolves the reference to.
 *
 * Only a lone embed — the whole paragraph, trimmed — is recognised. An
 * `![[ref]]` sitting inside other text is left as literal text; treating it as a
 * block would nest a host-supplied `<div>` inside a `<p>`. Must run before
 * `remarkWikilink`, or the inner `[[ref]]` is rewritten to a link first.
 *
 * Off unless the consumer passes `embedSource` — `Preview` only adds this plugin
 * to the pipeline then, so a paragraph like `![[x]]` renders unchanged otherwise.
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
  }
}
