/**
 * ADR-007 Stage 2 — insertion association at a hidden marker's edge.
 *
 * With a construct's markers hidden and atomic, the caret at the visual end of a
 * bold word actually sits *before* the hidden `**`, so a keystroke there lands
 * inside the markup: `**bold**` + "x" → `**boldx**`. This transaction filter
 * moves a single boundary insertion to the outer edge of the marker run, so it
 * lands on the side the user perceives: `**bold**x`. The mirror case at the
 * front of the word is handled the same way (`x**bold**`, never `**xbold**`).
 *
 * Scope: the paired-mark inline constructs whose *both* delimiters are hidden —
 * strong / emphasis / strikethrough / inline code. Links and wikilinks keep a
 * directly editable label, so typing at a label edge is left alone.
 */

import { syntaxTree } from "@codemirror/language"
import { EditorState, type Extension } from "@codemirror/state"
import { markersHidden, wrapAt } from "./edit-boundaries"
import type { Tree } from "./scan"
import { fromTableWidget } from "./table-widget"

/** The paired inline-mark nodes `decorate.ts` hides (both delimiters). */
const MARK_NODES = new Set(["EmphasisMark", "CodeMark", "StrikethroughMark"])

/** Slide across an unbroken run of inline-mark nodes from `pos` in `dir`. */
function skipMarks(tree: Tree, pos: number, dir: -1 | 1): number {
  let p = pos
  for (;;) {
    const node = tree.resolveInner(p, dir)
    if (!MARK_NODES.has(node.name) || node.from >= node.to) return p
    const next = dir < 0 ? node.from : node.to
    if (next === p) return p
    p = next
  }
}

/**
 * The position a boundary insertion at `pos` should be redirected to, or `pos`
 * itself when it is not exactly at a hidden wrapper's content edge. A nested
 * `***word***` is escaped in full — the marker run at the edge is crossed as a
 * unit regardless of how many levels it stacks.
 */
function associatedPos(state: EditorState, pos: number): number {
  const w = wrapAt(state, pos, true)
  if (!w) return pos
  const tree = syntaxTree(state)
  if (pos === w.contentTo) return skipMarks(tree, pos, 1)
  if (pos === w.contentFrom) return skipMarks(tree, pos, -1)
  return pos
}

export const inPlaceInsertAssociation: Extension = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr
  if (tr.isUserEvent("undo") || tr.isUserEvent("redo")) return tr
  if (tr.annotation(fromTableWidget)) return tr
  const start = tr.startState
  const sel = start.selection.main
  if (!sel.empty) return tr
  if (!markersHidden(start, start.doc.lineAt(sel.head).number)) return tr

  // Only a single pure insertion exactly at the caret.
  const inserts: string[] = []
  let count = 0
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    count++
    if (fromA === toA && fromA === sel.head && inserted.length > 0) {
      inserts.push(inserted.toString())
    }
  })
  const insert = inserts[0]
  if (count !== 1 || insert === undefined) return tr

  const target = associatedPos(start, sel.head)
  if (target === sel.head) return tr

  return {
    changes: { from: target, insert },
    selection: { anchor: target + insert.length },
    scrollIntoView: true,
    userEvent: "input.type",
  }
})
