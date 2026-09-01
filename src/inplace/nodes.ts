import type { Range, Text } from "@codemirror/state"
import { Decoration } from "@codemirror/view"
import type { SyntaxNodeRef } from "@lezer/common"
import type { ResolvedToggles } from "./config"
import { BulletWidget, CheckboxWidget, HrWidget } from "./widgets"

const HEADING = /^ATXHeading([1-6])$/
const BULLET = /^[-*+]$/

/** Inline spans: style the text between the markers, hide the markers off-caret. */
const INLINE: Record<string, { mark: string; className: string; toggle: "emphasis" | "code" }> = {
  StrongEmphasis: { mark: "EmphasisMark", className: "cm-inplace-strong", toggle: "emphasis" },
  Emphasis: { mark: "EmphasisMark", className: "cm-inplace-em", toggle: "emphasis" },
  Strikethrough: { mark: "StrikethroughMark", className: "cm-inplace-strike", toggle: "emphasis" },
  // Grouped with fenced/indented code under the `code` toggle, not `emphasis`.
  InlineCode: { mark: "CodeMark", className: "cm-inplace-code", toggle: "code" },
}

export interface NodeCtx {
  doc: Text
  revealed: Set<number>
  out: Range<Decoration>[]
  toggles: ResolvedToggles
  /** End of the frontmatter block, or -1. Nodes within are left to `frontmatterField`. */
  fmEnd: number
}

/** Decorate one syntax node. Returns `false` to stop descent, `undefined` to continue. */
export function decorateNode(node: SyntaxNodeRef, ctx: NodeCtx): boolean | undefined {
  const { doc, revealed, out, toggles, fmEnd } = ctx
  if (node.to <= fmEnd) return false

  const heading = HEADING.exec(node.name)
  if (heading) {
    if (toggles.headings) {
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
    }
    return // descend: emphasis / links inside the heading still get decorated
  }

  const rule = INLINE[node.name]
  if (rule) {
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

  if (node.name === "Link") {
    const before = doc.sliceString(Math.max(0, node.from - 1), node.from)
    const after = doc.sliceString(node.to, node.to + 1)
    if (before === "[" && after === "]") return false // inner of a [[wikilink]]
    if (!toggles.links) return false

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
    if (!toggles.horizontalRule) return false
    const line = doc.lineAt(node.from)
    if (!revealed.has(line.number)) {
      out.push(Decoration.replace({ widget: new HrWidget() }).range(line.from, line.to))
    }
    return false
  }

  if (node.name === "Blockquote") {
    if (toggles.blockquote) {
      const first = doc.lineAt(node.from).number
      const last = doc.lineAt(Math.min(node.to, doc.length)).number
      for (let n = first; n <= last; n++) {
        out.push(Decoration.line({ class: "cm-inplace-quote" }).range(doc.line(n).from))
      }
    }
    return // descend for the quoted inline content and each line's QuoteMark
  }

  if (node.name === "QuoteMark") {
    if (!toggles.blockquote) return false
    const line = doc.lineAt(node.from)
    if (!revealed.has(line.number)) {
      out.push(Decoration.replace({}).range(node.from, Math.min(node.to + 1, line.to)))
    }
    return false
  }

  if (node.name === "ListMark") {
    const text = doc.sliceString(node.from, node.to)
    const line = doc.lineAt(node.from)
    const item = node.node.parent
    const isTask = Boolean(item?.getChild("Task") ?? item?.getChild("TaskMarker"))
    if (revealed.has(line.number)) return false
    if (isTask) {
      // Hide "- " so the row reads as just the checkbox and its text.
      if (toggles.tasks) {
        out.push(Decoration.replace({}).range(node.from, Math.min(node.to + 1, line.to)))
      }
    } else if (toggles.lists && BULLET.test(text)) {
      out.push(Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to))
    }
    return false
  }

  if (node.name === "TaskMarker") {
    if (!toggles.tasks) return false
    if (!revealed.has(doc.lineAt(node.from).number)) {
      const checked = doc.sliceString(node.from + 1, node.to - 1).toLowerCase() === "x"
      out.push(
        Decoration.replace({ widget: new CheckboxWidget(checked) }).range(node.from, node.to),
      )
    }
    return false
  }

  if (node.name === "FencedCode" || node.name === "CodeBlock") {
    if (!toggles.code) return false
    const fenced = node.name === "FencedCode"
    const first = doc.lineAt(node.from).number
    const last = doc.lineAt(node.to > node.from ? node.to - 1 : node.to).number

    let blockRevealed = false
    for (let n = first; n <= last && !blockRevealed; n++) {
      if (revealed.has(n)) blockRevealed = true
    }
    // Off-caret, a fence line's ``` text is replaced with nothing; the emptied
    // row (collapsed to zero line-height) then serves as the container's pad.
    const emptyFences = fenced && last > first && !blockRevealed

    for (let n = first; n <= last; n++) {
      const isFence = fenced && (n === first || n === last)
      let cls = "cm-inplace-mono"
      if (n === first) cls += " cm-inplace-code-top"
      if (n === last) cls += " cm-inplace-code-bottom"
      if (isFence) cls += emptyFences ? " cm-inplace-code-pad" : " cm-inplace-fence"
      out.push(Decoration.line({ class: cls }).range(doc.line(n).from))
      if (isFence && emptyFences) {
        const l = doc.line(n)
        out.push(Decoration.replace({}).range(l.from, l.to))
      }
    }
    return false
  }

  return
}
