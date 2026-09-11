import type { Range, Text } from "@codemirror/state"
import { Decoration } from "@codemirror/view"
import type { SyntaxNodeRef } from "@lezer/common"
import type { ResolvedToggles } from "./config"
import { INLINE, decorateInlineMark, decorateLink } from "./nodes-inline"
import {
  decorateBlockquote,
  decorateCode,
  decorateListMark,
  decorateQuoteMark,
  decorateRule,
  decorateTaskMarker,
} from "./nodes-blocks"

const HEADING = /^ATXHeading([1-6])$/
const SETEXT = /^SetextHeading([12])$/

export interface NodeCtx {
  doc: Text
  revealed: Set<number>
  /** Lines the caret actually touches. Equals `revealed` except under
   *  `reveal: "never"`, where `revealed` is empty but this is not — a few
   *  constructs (setext underline, blockquote markers, a body-less fenced
   *  block) still reveal their delimiters on caret entry because there is no
   *  other way to see or remove them. */
  caretRevealed: Set<number>
  out: Range<Decoration>[]
  toggles: ResolvedToggles
  /** End of the frontmatter block, or -1. Nodes within are left to `frontmatterField`. */
  fmEnd: number
  /** Lines of a blockquote / callout whose block the caret is in — its `> ` and
   *  `[!type]` markers show raw, like a fenced code / `$$` block. Filled by the
   *  `Blockquote` handler before its `QuoteMark` children are visited. */
  quoteRevealed: Set<number>
}

function decorateHeading(node: SyntaxNodeRef, ctx: NodeCtx, level: string): boolean | undefined {
  const { doc, revealed, out, toggles } = ctx
  if (toggles.headings) {
    const line = doc.lineAt(node.from)
    out.push(
      Decoration.line({
        class: `cm-inplace-heading cm-inplace-h${level}`,
        // Expose the heading to assistive tech and outline tools. Under
        // `reveal: "never"` the `#` markers are never in the DOM, so the ARIA
        // role is the only structural cue left. A `role`/`aria-level` on the
        // line stands in for an `<hN>` tag, which CodeMirror's line rendering
        // does not let us emit.
        attributes: { role: "heading", "aria-level": level },
      }).range(line.from),
    )
    if (!revealed.has(line.number)) {
      const hm = node.node.firstChild
      if (hm?.name === "HeaderMark") {
        out.push(Decoration.replace({}).range(hm.from, Math.min(hm.to + 1, line.to)))
      }
    }
  }
  return // descend: emphasis / links inside the heading still get decorated
}

// A Setext heading is text with `===` / `---` on the next line (what you get
// by typing `---` directly under a line, no blank between). Style the text
// line like an ATX heading; hide the underline and collapse its row so it
// reads as one heading, not "text then a rule". `caretRevealed`, not
// `revealed`: the underline shows again whenever the caret is on either line,
// even under `reveal: "never"`, so it stays editable and the caret is visible.
function decorateSetext(node: SyntaxNodeRef, ctx: NodeCtx, level: string): boolean | undefined {
  const { doc, caretRevealed, out, toggles } = ctx
  if (toggles.headings) {
    const textLine = doc.lineAt(node.from)
    out.push(
      Decoration.line({
        class: `cm-inplace-heading cm-inplace-h${level}`,
        attributes: { role: "heading", "aria-level": level },
      }).range(textLine.from),
    )
    const hm = node.node.getChild("HeaderMark")
    if (hm) {
      const underline = doc.lineAt(hm.from)
      if (!caretRevealed.has(textLine.number) && !caretRevealed.has(underline.number)) {
        out.push(Decoration.line({ class: "cm-inplace-setext-rule" }).range(underline.from))
        out.push(Decoration.replace({}).range(hm.from, hm.to))
      }
    }
  }
  return // descend: inline emphasis inside the heading text
}

/** Decorate one syntax node. Returns `false` to stop descent, `undefined` to continue. */
export function decorateNode(node: SyntaxNodeRef, ctx: NodeCtx): boolean | undefined {
  if (node.to <= ctx.fmEnd) return false

  const heading = HEADING.exec(node.name)
  if (heading) return decorateHeading(node, ctx, heading[1]!)

  const setext = SETEXT.exec(node.name)
  if (setext) return decorateSetext(node, ctx, setext[1]!)

  const rule = INLINE[node.name]
  if (rule) return decorateInlineMark(node, ctx, rule)

  if (node.name === "Link") return decorateLink(node, ctx)
  if (node.name === "HorizontalRule") return decorateRule(node, ctx)
  if (node.name === "Blockquote") return decorateBlockquote(node, ctx)
  if (node.name === "QuoteMark") return decorateQuoteMark(node, ctx)
  if (node.name === "ListMark") return decorateListMark(node, ctx)
  if (node.name === "TaskMarker") return decorateTaskMarker(node, ctx)
  if (node.name === "FencedCode" || node.name === "CodeBlock") return decorateCode(node, ctx)

  return
}
