/**
 * Keyboard entry into a table.
 *
 * A GFM table renders as one block widget spanning every table line, registered
 * as a single atomic range — so stock vertical cursor motion skips the whole
 * construct and ArrowDown from the line above lands *below* the table, never in
 * it.
 *
 * Here ArrowDown on the line directly above a table (ArrowUp directly below)
 * steps in instead. In `table: "cells"` it focuses the near edge cell; in
 * `source` it drops the caret on the adjacent table source line, which reveals
 * the raw pipe syntax the same way a blockquote or fenced block reveals on
 * caret entry.
 */

import { Prec, type Extension } from "@codemirror/state"
import { type Command, type EditorView, keymap, type WidgetType } from "@codemirror/view"
import { activeTableCell } from "../toolbar/cell-inline"
import { tableEditingFacet } from "./config"
import { EditableTableWidget } from "./table-widget"
import { tableField } from "./tables"

const arrowIntoTable =
  (forward: boolean): Command =>
  (view: EditorView): boolean => {
    if (activeTableCell(view)) return false
    const sel = view.state.selection.main
    if (!sel.empty) return false
    const { doc } = view.state
    const line = doc.lineAt(sel.head)
    const edgeLineNo = forward ? line.number + 1 : line.number - 1
    if (edgeLineNo < 1 || edgeLineNo > doc.lines) return false
    const edge = doc.line(edgeLineNo)

    let from = -1
    let to = -1
    let widget: WidgetType | undefined
    view.state.field(tableField).between(edge.from, edge.to, (a, b, deco) => {
      // Entering from above, the table must start on the adjacent line; from
      // below, it must end on it. A middle line is never an entry point.
      if (forward ? a === edge.from : b === edge.to) {
        from = a
        to = b
        widget = deco.spec.widget
        return false
      }
    })
    if (from < 0) return false

    if (view.state.facet(tableEditingFacet) === "cells") {
      return widget instanceof EditableTableWidget && widget.focusEdge(forward ? "first" : "last")
    }

    // Source mode: land on the table's near source line and let the reveal
    // follow from the selection change.
    const anchor = forward ? doc.lineAt(from).from : doc.lineAt(to).to
    view.dispatch({ selection: { anchor }, userEvent: "select", scrollIntoView: true })
    return true
  }

/** ArrowDown that steps into a table on the line below. */
export const enterTableFromAbove: Command = arrowIntoTable(true)
/** ArrowUp that steps into a table on the line above. */
export const enterTableFromBelow: Command = arrowIntoTable(false)

export const inPlaceTableEnter: Extension = Prec.high(
  keymap.of([
    { key: "ArrowDown", run: enterTableFromAbove },
    { key: "ArrowUp", run: enterTableFromBelow },
  ]),
)
