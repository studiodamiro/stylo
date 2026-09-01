import type { Range, Text } from "@codemirror/state"
import { Decoration } from "@codemirror/view"
import type { SyntaxNodeRef } from "@lezer/common"
import { BulletWidget, HrWidget } from "./widgets"

const HEADING = /^ATXHeading([1-6])$/
const BULLET = /^[-*+]$/

/** Inline spans: style the text between the markers, hide the markers off-caret. */
const INLINE: Record<string, { mark: string; className: string }> = {
  StrongEmphasis: { mark: "EmphasisMark", className: "cm-inplace-strong" },
  Emphasis: { mark: "EmphasisMark", className: "cm-inplace-em" },
  Strikethrough: { mark: "StrikethroughMark", className: "cm-inplace-strike" },
  InlineCode: { mark: "CodeMark", className: "cm-inplace-code" },
}

/** Blocks whose lines must stay monospace on the otherwise-proportional canvas. */
const MONO_BLOCK = new Set(["FencedCode", "CodeBlock"])

export interface NodeCtx {
  doc: Text
  revealed: Set<number>
  out: Range<Decoration>[]
  atomic: Range<Decoration>[]
  /** End of the frontmatter block, or -1. Nodes within are left to `frontmatterField`. */
  fmEnd: number
}

/** Decorate one syntax node. Returns `false` to stop descent, `undefined` to continue. */
export function decorateNode(node: SyntaxNodeRef, ctx: NodeCtx): boolean | undefined {
  const { doc, revealed, out, atomic, fmEnd } = ctx
  if (node.to <= fmEnd) return false

  const heading = HEADING.exec(node.name)
  if (heading) {
    const line = doc.lineAt(node.from)
    out.push(
      Decoration.line({ class: `cm-inplace-heading cm-inplace-h${heading[1]}` }).range(line.from),
    )
    if (!revealed.has(line.number)) {
      const hm = node.node.firstChild
      if (hm?.name === "HeaderMark") {
        out.push(Decoration.replace({}).range(hm.from, Math.min(hm.to + 1, line.to)))
      }
    }
    return // descend: emphasis / links inside the heading still get decorated
  }

  const rule = INLINE[node.name]
  if (rule) {
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

  if (node.name === "Link") {
    const before = doc.sliceString(Math.max(0, node.from - 1), node.from)
    const after = doc.sliceString(node.to, node.to + 1)
    if (before === "[" && after === "]") return false // inner of a [[wikilink]]

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
    return false
  }

  if (node.name === "HorizontalRule") {
    const line = doc.lineAt(node.from)
    if (!revealed.has(line.number)) {
      const deco = Decoration.replace({ widget: new HrWidget() })
      out.push(deco.range(line.from, line.to))
      atomic.push(deco.range(line.from, line.to))
    }
    return false
  }

  if (node.name === "Blockquote") {
    const first = doc.lineAt(node.from).number
    const last = doc.lineAt(Math.min(node.to, doc.length)).number
    for (let n = first; n <= last; n++) {
      out.push(Decoration.line({ class: "cm-inplace-quote" }).range(doc.line(n).from))
    }
    return // descend for the quoted inline content
  }

  if (node.name === "ListMark") {
    const text = doc.sliceString(node.from, node.to)
    // A task item wraps its content in a `Task` node (holding the `TaskMarker`);
    // leave `- [ ]` fully as source — checkboxes are deferred.
    const item = node.node.parent
    const isTask = Boolean(item?.getChild("Task") ?? item?.getChild("TaskMarker"))
    if (BULLET.test(text) && !isTask && !revealed.has(doc.lineAt(node.from).number)) {
      out.push(Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to))
    }
    return false
  }

  if (MONO_BLOCK.has(node.name)) {
    const first = doc.lineAt(node.from).number
    const last = doc.lineAt(Math.min(node.to, doc.length)).number
    for (let n = first; n <= last; n++) {
      out.push(Decoration.line({ class: "cm-inplace-mono" }).range(doc.line(n).from))
    }
    return false
  }

  return
}
