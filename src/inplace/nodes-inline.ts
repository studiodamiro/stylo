/**
 * `decorateNode` branches for inline constructs: paired marks (bold / italic /
 * strike / inline code) and links. Split out of `nodes.ts`, which keeps the
 * dispatch and the block-level constructs.
 */

import { Decoration } from "@codemirror/view"
import type { SyntaxNodeRef } from "@lezer/common"
import { CALLOUT_HEAD_LINE } from "../callout"
import type { NodeCtx } from "./nodes"

/** Inline spans: style the text between the markers, hide the markers off-caret. */
export const INLINE: Record<
  string,
  { mark: string; className: string; toggle: "emphasis" | "code" }
> = {
  StrongEmphasis: { mark: "EmphasisMark", className: "cm-inplace-strong", toggle: "emphasis" },
  Emphasis: { mark: "EmphasisMark", className: "cm-inplace-em", toggle: "emphasis" },
  Strikethrough: { mark: "StrikethroughMark", className: "cm-inplace-strike", toggle: "emphasis" },
  // Grouped with fenced/indented code under the `code` toggle, not `emphasis`.
  InlineCode: { mark: "CodeMark", className: "cm-inplace-code", toggle: "code" },
}

export function decorateInlineMark(
  node: SyntaxNodeRef,
  ctx: NodeCtx,
  rule: (typeof INLINE)[string],
): boolean | undefined {
  const { doc, revealed, out, toggles } = ctx
  if (!toggles[rule.toggle]) return
  const marks = node.node.getChildren(rule.mark)
  const open = marks[0]
  const close = marks[marks.length - 1]
  const paired = open && close && open !== close
  const from = paired ? open.to : node.from
  const to = paired ? close.from : node.to
  if (to > from) {
    out.push(Decoration.mark({ class: rule.className }).range(from, to))
  }
  if (paired && !revealed.has(doc.lineAt(node.from).number)) {
    out.push(Decoration.replace({}).range(open.from, open.to))
    out.push(Decoration.replace({}).range(close.from, close.to))
  }
  return
}

export function decorateLink(node: SyntaxNodeRef, ctx: NodeCtx): boolean | undefined {
  const { doc, revealed, out, toggles } = ctx
  const before = doc.sliceString(Math.max(0, node.from - 1), node.from)
  const after = doc.sliceString(node.to, node.to + 1)
  if (before === "[" && after === "]") return false // inner of a [[wikilink]]
  if (!toggles.links) return false

  // `[!type]` in a callout head parses as a shortcut Link — it belongs to the
  // Blockquote / QuoteMark handling, so don't hide its brackets here.
  const linkLine = doc.lineAt(node.from)
  const calloutHead = CALLOUT_HEAD_LINE.exec(linkLine.text)
  if (calloutHead && node.from - linkLine.from < calloutHead[1]!.length + calloutHead[2]!.length) {
    return false
  }

  const marks = node.node.getChildren("LinkMark")
  if (marks.length >= 2) {
    const open = marks[0]!
    const shut = marks[1]!
    if (shut.from > open.to) {
      out.push(Decoration.mark({ class: "cm-inplace-link" }).range(open.to, shut.from))
    }
    if (!revealed.has(doc.lineAt(node.from).number)) {
      out.push(Decoration.replace({}).range(node.from, open.to))
      out.push(Decoration.replace({}).range(shut.from, node.to))
    }
  }
  return // descend: emphasis / code inside the label still gets its marks hidden
}
