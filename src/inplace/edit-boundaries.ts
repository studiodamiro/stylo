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
 * This covers both a plain caret move and `Shift`-extending a selection, which
 * the stock `select*` commands park on the near edge just the same.
 */

import { EditorSelection, Prec, type Extension } from "@codemirror/state"
import { type Command, type EditorView, keymap } from "@codemirror/view"
import { activeTableCell } from "../toolbar/cell-inline"
import { inPlacePlugin } from "./plugin"
import { markersHidden, wrapAt } from "./wrap-at"

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
 * hidden markers, take one more so every press moves the caret visibly — even
 * when that extra step leaves the line, which is what a bold word at column 0
 * needs (the run sits against the line start, so the only visible landing is the
 * end of the line above). `onlyHiddenMarkers` never spans a line break — a
 * newline is not a hidden marker — so the guard there is enough.
 *
 * With `extend` the selection head moves and the anchor stays put — the same
 * fix for `Shift`-arrow, whose stock command also parks on the near edge.
 */
const arrowAcrossMarkers =
  (forward: boolean, extend: boolean): Command =>
  (view: EditorView): boolean => {
    if (activeTableCell(view)) return false
    const sel = view.state.selection.main
    if (!extend && !sel.empty) return false
    if (!markersHidden(view.state, view.state.doc.lineAt(sel.head).number)) return false

    let moved = view.moveByChar(sel, forward)
    const lo = Math.min(sel.head, moved.head)
    const hi = Math.max(sel.head, moved.head)
    if (onlyHiddenMarkers(view, lo, hi)) moved = view.moveByChar(moved, forward)
    if (moved.head === sel.head) return false
    const range = extend
      ? EditorSelection.range(sel.anchor, moved.head)
      : EditorSelection.cursor(moved.head)
    view.dispatch({ selection: range, userEvent: "select" })
    return true
  }

/** Plain caret step across a hidden marker run (leftward). */
export const arrowAcrossMarkerLeft: Command = arrowAcrossMarkers(false, false)
/** Plain caret step — the forward mirror. */
export const arrowAcrossMarkerRight: Command = arrowAcrossMarkers(true, false)
/** `Shift`-extend the selection head across a hidden marker run (leftward). */
export const selectAcrossMarkerLeft: Command = arrowAcrossMarkers(false, true)
/** `Shift`-extend — the forward mirror. */
export const selectAcrossMarkerRight: Command = arrowAcrossMarkers(true, true)

export const inPlaceEditBoundaries: Extension = Prec.high(
  keymap.of([
    { key: "Backspace", run: deleteAcrossMarkerBackward },
    { key: "Delete", run: deleteAcrossMarkerForward },
    { key: "ArrowLeft", run: arrowAcrossMarkerLeft },
    { key: "ArrowRight", run: arrowAcrossMarkerRight },
    { key: "Shift-ArrowLeft", run: selectAcrossMarkerLeft },
    { key: "Shift-ArrowRight", run: selectAcrossMarkerRight },
  ]),
)
