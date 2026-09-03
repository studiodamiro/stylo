import type { ParsedTable } from "./table-widget"

/** `[head, ...body]` as raw cell strings — the editable widget's source of truth. */
export const gridOf = (t: ParsedTable): string[][] => [t.head, ...t.body].map((r) => [...r])

export const trimGrid = (rows: string[][]): string[][] => rows.map((r) => r.map((s) => s.trim()))

/** A GFM cell escapes a literal pipe as `\|`; unescape before inline parsing. */
export const unescapePipe = (s: string): string => s.replace(/\\\|/g, "|")

/** Total length of the text nodes inside `cell` that precede `target`. */
function textBefore(cell: HTMLElement, target: Node): number {
  const walker = cell.ownerDocument.createTreeWalker(cell, NodeFilter.SHOW_TEXT)
  let offset = 0
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n === target) return offset
    offset += n.textContent?.length ?? 0
  }
  return offset
}

/** Char offset of the DOM selection within `cell`'s rendered text. */
export function renderedCaretOffset(cell: HTMLElement): number {
  const sel = cell.ownerDocument.getSelection()
  const node = sel?.anchorNode
  if (!node || !cell.contains(node)) return 0
  if (node.nodeType === Node.TEXT_NODE) return textBefore(cell, node) + (sel?.anchorOffset ?? 0)
  return (sel?.anchorOffset ?? 0) > 0 ? (cell.textContent ?? "").length : 0
}

/** `[from, to]` char offsets of the DOM selection within `cell`'s text. */
export function selectionOffsets(cell: HTMLElement): { from: number; to: number } {
  const sel = cell.ownerDocument.getSelection()
  const end = (cell.textContent ?? "").length
  const at = (node: Node | null | undefined, off: number): number => {
    if (!node || !cell.contains(node)) return end
    if (node.nodeType === Node.TEXT_NODE) return textBefore(cell, node) + off
    return off > 0 ? end : 0
  }
  if (!sel || sel.rangeCount === 0) return { from: end, to: end }
  const a = at(sel.anchorNode, sel.anchorOffset)
  const b = at(sel.focusNode, sel.focusOffset)
  return { from: Math.min(a, b), to: Math.max(a, b) }
}

type PointDoc = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
}

/** Char offset within `cell`'s rendered text at a screen point, `0` if unresolved. */
export function offsetFromPoint(cell: HTMLElement, x: number, y: number): number {
  const doc = cell.ownerDocument as PointDoc
  let node: Node | null = null
  let nodeOffset = 0
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y)
    if (p) [node, nodeOffset] = [p.offsetNode, p.offset]
  } else if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y)
    if (r) [node, nodeOffset] = [r.startContainer, r.startOffset]
  }
  if (!node || !cell.contains(node)) return 0
  return textBefore(cell, node) + (node.nodeType === Node.TEXT_NODE ? nodeOffset : 0)
}

const WORD_CHAR = /[\p{L}\p{N}_]/u

/**
 * Select the word at a screen point in `cell`'s raw text — the cell equivalent
 * of the canvas's "right-click selects the word under the pointer". Returns
 * `false` (leaving any caret / selection untouched) when the point is on
 * whitespace or punctuation, so a menu opened there still has a target.
 */
export function selectWordAtPoint(cell: HTMLElement, x: number, y: number): boolean {
  const text = cell.textContent ?? ""
  const at = offsetFromPoint(cell, x, y)
  let from = at
  let to = at
  while (from > 0 && WORD_CHAR.test(text[from - 1]!)) from--
  while (to < text.length && WORD_CHAR.test(text[to]!)) to++
  if (to <= from) return false
  placeCaret(cell, from, to)
  return true
}

/**
 * Select `cell`'s first text node from char `offset` to char `head` (both
 * clamped). With `head` omitted or equal, the caret is simply parked at `offset`.
 */
export function placeCaret(cell: HTMLElement, offset: number, head = offset) {
  cell.focus()
  const doc = cell.ownerDocument
  const range = doc.createRange()
  const text = cell.firstChild
  if (text && text.nodeType === Node.TEXT_NODE) {
    const len = text.textContent?.length ?? 0
    range.setStart(text, Math.min(Math.min(offset, head), len))
    range.setEnd(text, Math.min(Math.max(offset, head), len))
  } else {
    range.selectNodeContents(cell)
  }
  if (offset === head) range.collapse(true)
  const sel = doc.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}
