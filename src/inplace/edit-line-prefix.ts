/**
 * ADR-007 Stage 3 — line-prefix backspace.
 *
 * With `## `, `> `, `- ` and friends hidden and atomic, the caret at the visual
 * start of a heading / quote / list line sits just past the hidden prefix.
 * Backspace there removes one level of prefix instead of joining the line to the
 * one above — the Notion "backspace to unstyle" gesture:
 *
 * - heading  → paragraph (the whole `#{1,6} ` goes)
 * - quote    → one `> ` level out (nested quotes step out one at a time)
 * - list     → outdent one step, or drop the marker when already flush
 * - task     → paragraph (`- [ ] ` goes)
 *
 * Only fires while that prefix is actually hidden (so `reveal: "caret"` with the
 * caret on the line is untouched — the prefix is visible there and a normal
 * backspace edits it).
 */

import { Prec, type Extension } from "@codemirror/state"
import { type Command, type EditorView, keymap } from "@codemirror/view"
import { activeTableCell } from "../toolbar/cell-inline"
import { markersHidden } from "./edit-boundaries"

interface PrefixEdit {
  /** Length of the whole hidden prefix — the caret at visual column 0 sits here. */
  prefixLen: number
  /** `[start, end)` within the line to remove for "one level out". */
  drop: [number, number]
}

function prefixEditAt(text: string): PrefixEdit | null {
  const heading = /^#{1,6} /.exec(text)
  if (heading) return { prefixLen: heading[0].length, drop: [0, heading[0].length] }

  const quote = /^(?:> ?)+/.exec(text)
  if (quote) {
    const one = /^> ?/.exec(text)![0].length
    return { prefixLen: quote[0].length, drop: [0, one] }
  }

  const task = /^(\s*)[-*+] \[[ xX]\] /.exec(text)
  if (task) return { prefixLen: task[0].length, drop: [0, task[0].length] }

  const list = /^(\s*)([-*+] |\d+[.)] )/.exec(text)
  if (list) {
    const indent = list[1]!
    if (indent) {
      const step = indent.startsWith("\t") ? 1 : Math.min(2, indent.length)
      return { prefixLen: list[0].length, drop: [0, step] }
    }
    return { prefixLen: list[2]!.length, drop: [0, list[2]!.length] }
  }
  return null
}

/** Backspace at visual column 0 of a hidden-prefix line — one level out. */
export const unwrapLinePrefix: Command = (view: EditorView): boolean => {
  if (activeTableCell(view)) return false
  const { state } = view
  const sel = state.selection.main
  if (!sel.empty) return false

  const line = state.doc.lineAt(sel.head)
  if (!markersHidden(state, line.number)) return false

  const edit = prefixEditAt(line.text)
  if (!edit) return false

  // Visual column 0: the caret is within the hidden prefix run — atomic ranges
  // collapse every position from `line.from` to the prefix end to one pixel.
  if (sel.head < line.from || sel.head > line.from + edit.prefixLen) return false

  const [ds, de] = edit.drop
  view.dispatch({
    changes: { from: line.from + ds, to: line.from + de, insert: "" },
    selection: { anchor: line.from + ds },
    userEvent: "delete.backward",
    scrollIntoView: true,
  })
  return true
}

export const inPlaceLinePrefixEdit: Extension = Prec.high(
  keymap.of([{ key: "Backspace", run: unwrapLinePrefix }]),
)
