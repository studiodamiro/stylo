/**
 * ADR-007 Stage 2 (first slice): editing at a hidden marker's edge.
 *
 * Under `reveal: "never"` (or off-caret under `"caret"`) an inline construct's
 * markers are hidden and atomic. The stock Backspace/Delete skips the whole
 * atomic range and eats the marker itself, stranding its partner — and for a
 * nested `***word***` it strips a level of formatting per keypress.
 *
 * Here the key steps *over* the run of hidden markers and removes the real
 * character beyond them instead: Backspace at the front of a bold word deletes
 * the space before it, the bold stays. The one exception is deleting the last
 * character *inside* a wrapper — the now-empty markers go with it.
 *
 * Arrow keys get the same treatment: `atomicRanges` leaves both edges of a
 * hidden run as caret stops that render at the same point, so a press can look
 * like it did nothing — when a step only crossed hidden markers, take one more.
 */

import { syntaxTree } from "@codemirror/language"
import { type EditorState, Prec, type Extension } from "@codemirror/state"
import { type Command, type EditorView, keymap } from "@codemirror/view"
import type { SyntaxNode } from "@lezer/common"
import { WIKILINK_PATTERN } from "../wikilink"
import { activeTableCell } from "../toolbar/cell-inline"
import { inPlaceConfigFacet, revealModeFacet } from "./config"
import { inPlacePlugin } from "./plugin"
import { revealedLines } from "./reveal"

/** Paired-marker inline nodes whose markers `decorate.ts` hides. */
const WRAP: Record<string, { markType: string; toggle: "emphasis" | "code" }> = {
  StrongEmphasis: { markType: "EmphasisMark", toggle: "emphasis" },
  Emphasis: { markType: "EmphasisMark", toggle: "emphasis" },
  Strikethrough: { markType: "StrikethroughMark", toggle: "emphasis" },
  InlineCode: { markType: "CodeMark", toggle: "code" },
}

export interface Wrap {
  from: number
  to: number
  contentFrom: number
  contentTo: number
}

/** Are inline markers on this line hidden right now? */
export function markersHidden(state: EditorState, lineNumber: number): boolean {
  return state.facet(revealModeFacet) === "never" || !revealedLines(state).has(lineNumber)
}

/**
 * Slide `pos` across an unbroken run of hidden inline markers in direction
 * `dir`. A `***word***` prefix (two adjacent hidden replace ranges) is crossed
 * in one step; a solid character or a widget stops it.
 */
function skipHiddenMarkers(view: EditorView, pos: number, dir: -1 | 1): number {
  const set = view.plugin(inPlacePlugin)?.decorations
  if (!set) return pos
  const end = dir < 0 ? 0 : view.state.doc.length
  let p = pos
  for (let moved = true; moved;) {
    moved = false
    set.between(Math.min(p, end), Math.max(p, end), (from, to, deco) => {
      if (from >= to || deco.spec.widget || deco.spec.class) return
      if (dir < 0 ? to === p : from === p) {
        p = dir < 0 ? from : to
        moved = true
      }
    })
  }
  return p
}

/**
 * The hidden-marker inline construct enclosing `pos`, or `null`. With
 * `emphasisOnly`, only the paired-mark constructs whose *both* delimiters are
 * hidden count (strong / emphasis / strike / inline code) — links and wikilinks
 * keep a directly editable label, so their edges are not boundary-escaped.
 */
export function wrapAt(state: EditorState, pos: number, emphasisOnly = false): Wrap | null {
  const line = state.doc.lineAt(pos)
  if (!markersHidden(state, line.number)) return null
  const toggles = state.facet(inPlaceConfigFacet)
  const tree = syntaxTree(state)

  for (const bias of [-1, 1] as const) {
    for (let node: SyntaxNode | null = tree.resolveInner(pos, bias); node; node = node.parent) {
      const rule = WRAP[node.name]
      if (rule) {
        if (!toggles[rule.toggle]) break
        const marks = node.getChildren(rule.markType)
        const open = marks[0]
        const close = marks[marks.length - 1]
        if (!open || !close || open === close) break
        return { from: node.from, to: node.to, contentFrom: open.to, contentTo: close.from }
      }
      if (node.name === "Link") {
        if (emphasisOnly) break
        if (state.doc.sliceString(Math.max(0, node.from - 1), node.from) === "[") break // [[wiki]] inner
        if (!toggles.links) break
        const marks = node.getChildren("LinkMark")
        if (marks.length < 2) break
        return {
          from: node.from,
          to: node.to,
          contentFrom: marks[0]!.to,
          contentTo: marks[1]!.from,
        }
      }
    }
  }

  // Wikilinks have no grammar node — scan the caret line.
  if (toggles.wikilinks && !emphasisOnly) {
    for (const m of line.text.matchAll(WIKILINK_PATTERN)) {
      const from = line.from + (m.index ?? 0)
      const to = from + m[0].length
      if (pos < from || pos > to) continue
      const target = m[1] ?? ""
      const labelled = m[2] != null
      return {
        from,
        to,
        contentFrom: from + 2 + (labelled ? target.length + 1 : 0),
        contentTo: to - 2,
      }
    }
  }
  return null
}

/** Backspace/Delete that steps over hidden markers instead of eating them. */
const deleteAcrossMarkers =
  (dir: -1 | 1): Command =>
  (view: EditorView): boolean => {
    if (activeTableCell(view)) return false
    const sel = view.state.selection.main
    if (!sel.empty) return false
    const { state } = view
    if (!markersHidden(state, state.doc.lineAt(sel.head).number)) return false

    const solid = skipHiddenMarkers(view, sel.head, dir)
    if (solid === sel.head) return false // no hidden marker in the way — let the default run

    const doc = state.doc
    if (dir < 0 ? solid <= 0 : solid >= doc.length) return true // nothing beyond — swallow

    let from = dir < 0 ? solid - 1 : solid
    let to = dir < 0 ? solid : solid + 1

    // Removing the last character inside a wrapper leaves empty markers — take
    // the wrapper with it, then keep walking out: a nested `***x***` empties its
    // outer `**…**` too, and stopping after one level would strand a bare
    // `****` / ``` `` ``` / `[]()`. Probing at `from` (once it is the run's outer
    // edge) is what lets `resolveInner` climb to the enclosing construct.
    for (
      let w = wrapAt(state, from);
      w && from <= w.contentFrom && to >= w.contentTo && w.contentTo > w.contentFrom;
      w = wrapAt(state, from)
    ) {
      if (w.from >= from && w.to <= to) break // no growth — the run is fully covered
      from = Math.min(from, w.from)
      to = Math.max(to, w.to)
    }

    view.dispatch({
      changes: { from, to, insert: "" },
      selection: { anchor: from },
      userEvent: dir < 0 ? "delete.backward" : "delete.forward",
      scrollIntoView: true,
    })
    return true
  }

/** Backspace that steps over a hidden marker rather than stranding it. */
export const deleteAcrossMarkerBackward: Command = deleteAcrossMarkers(-1)
/** Delete — the forward mirror. */
export const deleteAcrossMarkerForward: Command = deleteAcrossMarkers(1)

/** Is `[from, to)` covered entirely by hidden marker replacements (so the two
 *  ends render at the same screen point)? */
function onlyHiddenMarkers(view: EditorView, from: number, to: number): boolean {
  if (to <= from) return false
  const set = view.plugin(inPlacePlugin)?.decorations
  if (!set) return false
  let covered = from
  set.between(from, to, (a, b, deco) => {
    if (deco.spec.widget || deco.spec.class || b <= a) return
    if (a <= covered) covered = Math.max(covered, b)
  })
  return covered >= to
}

/**
 * Arrow-key motion that doesn't "stick" on a hidden marker run. `atomicRanges`
 * leaves *both* edges of a run as caret stops, and they render at the same
 * point, so one arrow press looks like it did nothing. When a step only crossed
 * hidden markers, take one more so every press moves the caret visibly.
 */
const arrowAcrossMarkers =
  (forward: boolean): Command =>
  (view: EditorView): boolean => {
    if (activeTableCell(view)) return false
    const sel = view.state.selection.main
    if (!sel.empty) return false
    if (!markersHidden(view.state, view.state.doc.lineAt(sel.head).number)) return false

    let range = view.moveByChar(sel, forward)
    const lo = Math.min(sel.head, range.head)
    const hi = Math.max(sel.head, range.head)
    if (onlyHiddenMarkers(view, lo, hi)) {
      const next = view.moveByChar(range, forward)
      if (view.state.doc.lineAt(next.head).number === view.state.doc.lineAt(sel.head).number) {
        range = next
      }
    }
    if (range.head === sel.head) return false
    view.dispatch({ selection: range, userEvent: "select" })
    return true
  }

export const inPlaceEditBoundaries: Extension = Prec.high(
  keymap.of([
    { key: "Backspace", run: deleteAcrossMarkerBackward },
    { key: "Delete", run: deleteAcrossMarkerForward },
    { key: "ArrowLeft", run: arrowAcrossMarkers(false) },
    { key: "ArrowRight", run: arrowAcrossMarkers(true) },
  ]),
)
