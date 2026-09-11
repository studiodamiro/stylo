/**
 * ADR-007 seamless exceptions — a thematic break under `reveal: "never"`.
 *
 * The `---` / `***` / `___` line renders as an atomic `<hr>` widget and no
 * longer reveals its source on caret entry. There is nothing to *edit* in a
 * rule, so the affordance it needs is removal: Backspace or Delete while the
 * caret sits on the rendered rule takes the whole line out. The "Remove
 * divider" row in the right-click menu is the pointer equivalent.
 *
 * Fires only while the rule's source is hidden, so `reveal: "caret"` with the
 * caret on the line — where the `---` shows as editable text — is untouched.
 */

import { syntaxTree } from "@codemirror/language"
import { Prec, type EditorState, type Extension } from "@codemirror/state"
import { type Command, type EditorView, keymap } from "@codemirror/view"
import { toggleHorizontalRule } from "../toolbar/rule"
import { activeTableCell } from "../toolbar/cell-inline"
import { markersHidden } from "./edit-boundaries"

/** The primary caret's line is a thematic break whose source is currently hidden. */
export function onHiddenRule(state: EditorState): boolean {
  const sel = state.selection.main
  if (!sel.empty) return false
  const line = state.doc.lineAt(sel.head)
  if (!markersHidden(state, line.number)) return false
  for (let node = syntaxTree(state).resolveInner(line.from, 1); node; node = node.parent!) {
    if (node.name === "HorizontalRule") return true
    if (!node.parent) break
  }
  return false
}

/** Backspace / Delete on a rendered rule line — remove the rule. */
export const removeHiddenRule: Command = (view: EditorView): boolean => {
  if (activeTableCell(view)) return false
  if (!onHiddenRule(view.state)) return false
  return toggleHorizontalRule(view) // the caret is on the rule, so this removes it
}

export const inPlaceDividerEdit: Extension = Prec.high(
  keymap.of([
    { key: "Backspace", run: removeHiddenRule },
    { key: "Delete", run: removeHiddenRule },
  ]),
)
