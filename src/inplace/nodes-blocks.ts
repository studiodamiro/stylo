/**
 * `decorateNode` branches for block-level constructs: thematic breaks,
 * blockquotes / callouts, list markers, and fenced / indented code. Split out
 * of `nodes.ts`, which keeps the dispatch and the inline constructs.
 */

import { Decoration } from "@codemirror/view"
import type { SyntaxNodeRef } from "@lezer/common"
import { CALLOUT_HEAD_LINE, calloutBucket } from "../callout"
import type { NodeCtx } from "./nodes"
import { BulletWidget, CheckboxWidget, HrWidget } from "./widgets"

const BULLET = /^[-*+]$/

export function decorateRule(node: SyntaxNodeRef, ctx: NodeCtx): boolean | undefined {
  const { doc, revealed, out, toggles } = ctx
  if (!toggles.horizontalRule) return false
  const line = doc.lineAt(node.from)
  // `revealed`, not `caretRevealed`: under `reveal: "never"` the rule no
  // longer shows its `---` on caret entry — there is nothing to edit in a
  // thematic break, so the affordance is removal instead (Backspace / Delete
  // on the line, or the "Remove divider" menu row; see `edit-divider.ts` and
  // the ADR-007 rollout log). Under `reveal: "caret"` `revealed` equals the
  // caret set, so that mode is unchanged.
  if (!revealed.has(line.number)) {
    // Zero the line's own text-row strut; the widget alone sets the height.
    out.push(Decoration.line({ class: "cm-inplace-hr-line" }).range(line.from))
    out.push(Decoration.replace({ widget: new HrWidget() }).range(line.from, line.to))
  }
  return false
}

export function decorateBlockquote(node: SyntaxNodeRef, ctx: NodeCtx): boolean | undefined {
  const { doc, revealed, caretRevealed, out, toggles, quoteRevealed } = ctx
  if (toggles.blockquote) {
    const first = doc.lineAt(node.from).number
    const last = doc.lineAt(Math.min(node.to, doc.length)).number
    const headLine = doc.line(first)
    // `> [!type]` turns the blockquote into a callout: a coloured box, the
    // `[!type]` token hidden off-caret (a `data-callout` label takes its
    // place), the rest of the head line read as the title.
    const head = CALLOUT_HEAD_LINE.exec(headLine.text)
    const kind = head ? calloutBucket(head[3]!) : null

    // Caret anywhere in the block → show every `> ` and the `[!type]` token
    // raw for the whole block, the way a fenced code / `$$` block reveals its
    // delimiters. Recorded for the `QuoteMark` children visited next.
    let blockRevealed = false
    for (let n = first; n <= last; n++) if (caretRevealed.has(n)) blockRevealed = true
    if (blockRevealed) for (let n = first; n <= last; n++) quoteRevealed.add(n)

    for (let n = first; n <= last; n++) {
      let cls = kind ? `cm-inplace-callout cm-inplace-callout-${kind}` : "cm-inplace-quote"
      if (kind && n === first) cls += " cm-inplace-callout-head"
      if (kind && n === last) cls += " cm-inplace-callout-foot"
      const attributes: Record<string, string> = {}
      if (kind) attributes["data-callout"] = head![3]!.toLowerCase()
      if (kind && blockRevealed) attributes["data-revealed"] = ""
      out.push(Decoration.line({ class: cls, attributes }).range(doc.line(n).from))
    }
    if (kind && !blockRevealed && !revealed.has(first)) {
      const tokenFrom = headLine.from + head![1]!.length
      out.push(Decoration.replace({}).range(tokenFrom, tokenFrom + head![2]!.length))
    }
  }
  return // descend for the quoted inline content and each line's QuoteMark
}

export function decorateQuoteMark(node: SyntaxNodeRef, ctx: NodeCtx): boolean | undefined {
  const { doc, revealed, out, toggles, quoteRevealed } = ctx
  if (!toggles.blockquote) return false
  const line = doc.lineAt(node.from)
  if (!revealed.has(line.number) && !quoteRevealed.has(line.number)) {
    // Hide `> ` including its trailing space — unless nothing else on the line
    // is visible (an empty quote line, or a callout head with no title). Then
    // hide only `>`, leaving the space as a landable caret home: a fully
    // hidden line has no spot to click or land a vertical arrow on.
    const withSpace = Math.min(node.to + 1, line.to)
    const head = CALLOUT_HEAD_LINE.exec(line.text)
    const rest = head
      ? line.text.slice(head[1]!.length + head[2]!.length)
      : line.text.slice(withSpace - line.from)
    out.push(Decoration.replace({}).range(node.from, rest.trim() === "" ? node.to : withSpace))
  }
  return false
}

export function decorateListMark(node: SyntaxNodeRef, ctx: NodeCtx): boolean | undefined {
  const { doc, revealed, out, toggles } = ctx
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

export function decorateTaskMarker(node: SyntaxNodeRef, ctx: NodeCtx): boolean | undefined {
  const { doc, revealed, out, toggles } = ctx
  if (!toggles.tasks) return false
  if (!revealed.has(doc.lineAt(node.from).number)) {
    const checked = doc.sliceString(node.from + 1, node.to - 1).toLowerCase() === "x"
    out.push(Decoration.replace({ widget: new CheckboxWidget(checked) }).range(node.from, node.to))
  }
  return false
}

export function decorateCode(node: SyntaxNodeRef, ctx: NodeCtx): boolean | undefined {
  const { doc, revealed, caretRevealed, out, toggles } = ctx
  if (!toggles.code) return false
  const fenced = node.name === "FencedCode"
  const first = doc.lineAt(node.from).number
  const last = doc.lineAt(node.to > node.from ? node.to - 1 : node.to).number
  // A block with at least one line between its fences. A body-less block
  // (` ``` ` / ` ``` ` with nothing between) has no content line for the
  // caret to land on, so it keeps the caret-reveal escape hatch below.
  const hasBody = last > first + 1

  // `revealed`, not `caretRevealed`: under `reveal: "never"` a fenced block
  // no longer shows its ``` on caret entry — the info string is edited and
  // the block unwrapped through the right-click menu's Language field, the
  // parallel of the Stage 4 link field (ADR-007). Under `reveal: "caret"`
  // `revealed` already equals the caret set, so this is unchanged there.
  // The one hold-out is a body-less block: with nothing to land on inside
  // it, the caret still reveals its fences as the only way to see or delete
  // it.
  let blockRevealed = false
  for (let n = first; n <= last && !blockRevealed; n++) {
    if (revealed.has(n) || (!hasBody && caretRevealed.has(n))) blockRevealed = true
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
