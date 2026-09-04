import type { Range, Text } from "@codemirror/state"
import { Decoration } from "@codemirror/view"
import type { SyntaxNodeRef } from "@lezer/common"
import { CALLOUT_HEAD_LINE, calloutBucket } from "../callout"
import type { ResolvedToggles } from "./config"
import { BulletWidget, CheckboxWidget, HrWidget } from "./widgets"

const HEADING = /^ATXHeading([1-6])$/
const SETEXT = /^SetextHeading([12])$/
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
  /** Lines the caret actually touches. Equals `revealed` except under
   *  `reveal: "never"`, where `revealed` is empty but this is not — a few
   *  constructs (fenced code) still reveal their delimiters on caret entry
   *  because there is no other way to see or remove them. */
  caretRevealed: Set<number>
  out: Range<Decoration>[]
  toggles: ResolvedToggles
  /** End of the frontmatter block, or -1. Nodes within are left to `frontmatterField`. */
  fmEnd: number
}

/** Decorate one syntax node. Returns `false` to stop descent, `undefined` to continue. */
export function decorateNode(node: SyntaxNodeRef, ctx: NodeCtx): boolean | undefined {
  const { doc, revealed, caretRevealed, out, toggles, fmEnd } = ctx
  if (node.to <= fmEnd) return false

  const heading = HEADING.exec(node.name)
  if (heading) {
    if (toggles.headings) {
      const line = doc.lineAt(node.from)
      out.push(
        Decoration.line({
          class: `cm-inplace-heading cm-inplace-h${heading[1]}`,
          // Expose the heading to assistive tech and outline tools. Under
          // `reveal: "never"` the `#` markers are never in the DOM, so the ARIA
          // role is the only structural cue left. A `role`/`aria-level` on the
          // line stands in for an `<hN>` tag, which CodeMirror's line rendering
          // does not let us emit.
          attributes: { role: "heading", "aria-level": heading[1]! },
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
  const setext = SETEXT.exec(node.name)
  if (setext) {
    if (toggles.headings) {
      const textLine = doc.lineAt(node.from)
      out.push(
        Decoration.line({
          class: `cm-inplace-heading cm-inplace-h${setext[1]}`,
          attributes: { role: "heading", "aria-level": setext[1]! },
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
    return // descend: emphasis / code inside the label still gets its marks hidden
  }

  if (node.name === "HorizontalRule") {
    if (!toggles.horizontalRule) return false
    const line = doc.lineAt(node.from)
    // `caretRevealed`, not `revealed`: with the caret on the rule line the raw
    // `---` shows again (even under `reveal: "never"`), so there is a visible
    // caret to sit on and the marker is editable — the same exception fenced
    // code and `$$` math make.
    if (!caretRevealed.has(line.number)) {
      // Zero the line's own text-row strut; the widget alone sets the height.
      out.push(Decoration.line({ class: "cm-inplace-hr-line" }).range(line.from))
      out.push(Decoration.replace({ widget: new HrWidget() }).range(line.from, line.to))
    }
    return false
  }

  if (node.name === "Blockquote") {
    if (toggles.blockquote) {
      const first = doc.lineAt(node.from).number
      const last = doc.lineAt(Math.min(node.to, doc.length)).number
      const headLine = doc.line(first)
      // `> [!type]` turns the blockquote into a callout: a coloured box, the
      // `[!type]` token hidden off-caret (a `data-callout` label takes its
      // place), the rest of the head line read as the title.
      const head = CALLOUT_HEAD_LINE.exec(headLine.text)
      const kind = head ? calloutBucket(head[3]!) : null
      for (let n = first; n <= last; n++) {
        const base = kind ? `cm-inplace-callout cm-inplace-callout-${kind}` : "cm-inplace-quote"
        const cls = kind && n === first ? `${base} cm-inplace-callout-head` : base
        const spec = kind
          ? { class: cls, attributes: { "data-callout": head![3]!.toLowerCase() } }
          : { class: cls }
        out.push(Decoration.line(spec).range(doc.line(n).from))
      }
      if (kind && !revealed.has(first)) {
        const tokenFrom = headLine.from + head![1]!.length
        out.push(Decoration.replace({}).range(tokenFrom, tokenFrom + head![2]!.length))
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

    // `caretRevealed`, not `revealed`: a fenced block shows its ``` on caret
    // entry even under `reveal: "never"`, because the fence has no on-screen
    // affordance for editing — hiding it for good would trap the block (you
    // could never delete a fence to unwrap it). Parallels the `$$` math block.
    let blockRevealed = false
    for (let n = first; n <= last && !blockRevealed; n++) {
      if (caretRevealed.has(n)) blockRevealed = true
    }
    // Off-caret, a fence line's ``` text is replaced with nothing and the row
    // collapsed to zero line-height, so the container reads as just its padding
    // and the code. Safe for click-to-position because the padding lives on the
    // same line decoration CodeMirror measures — no margin escapes its height map.
    const emptyFences = fenced && last > first && !blockRevealed

    for (let n = first; n <= last; n++) {
      const isFence = fenced && (n === first || n === last)
      let cls = "cm-inplace-mono"
      if (n === first) cls += " cm-inplace-code-top"
      if (n === last) cls += " cm-inplace-code-bottom"
      if (isFence) cls += emptyFences ? " cm-inplace-code-pad" : " cm-inplace-fence"
      const line = doc.line(n)
      out.push(Decoration.line({ class: cls }).range(line.from))
      if (isFence && emptyFences && line.to > line.from) {
        out.push(Decoration.replace({}).range(line.from, line.to))
      }
    }
    return false
  }

  return
}
