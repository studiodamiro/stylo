/**
 * Pure geometry for `selection-bar.ts`: where the current selection sits on
 * screen, and where the bar should place itself against it. Split out so the
 * plugin class stays about wiring, not measurement.
 */

import type { EditorView } from "@codemirror/view"
import type { ToolbarCommandId } from "../types"
import { BUILTIN_BY_ID } from "../toolbar/commands"
import { selectionUIFacet } from "./config"
import { cellHasSelection } from "./context-menu-actions"
import { menuOpenField } from "./menu-open"

export interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

export type Placement = null | {
  left: number
  top: number
  disabled: Record<string, boolean>
  active: Record<string, boolean>
}

/** The screen box of the current text selection — editor or table cell. */
export function selectionBox(view: EditorView): { box: Box; inCell: boolean } | null {
  const sel = view.state.selection.main
  if (!sel.empty) {
    const from = view.coordsAtPos(sel.from)
    const to = view.coordsAtPos(sel.to)
    if (!from || !to) return null
    return {
      inCell: false,
      box: {
        left: Math.min(from.left, to.left),
        right: Math.max(from.right, to.right),
        top: Math.min(from.top, to.top),
        bottom: Math.max(from.bottom, to.bottom),
      },
    }
  }
  if (!cellHasSelection(view)) return null
  const dom = view.dom.ownerDocument.getSelection()
  if (!dom || dom.rangeCount === 0) return null
  const r = dom.getRangeAt(0).getBoundingClientRect()
  return { inCell: true, box: { left: r.left, right: r.right, top: r.top, bottom: r.bottom } }
}

/**
 * Where the bar should sit against the current selection, or `null` to hide
 * it. `bar` supplies its own size via `getBoundingClientRect()` — `[hidden]`
 * hides visibility only, so this still works while the bar is hidden.
 */
export function measureBarPlacement(
  view: EditorView,
  bar: HTMLElement,
  ids: ToolbarCommandId[],
): Placement {
  if (view.state.facet(selectionUIFacet) !== "bar") return null
  // The right-click menu is up — yield to it rather than stack two popups.
  // The bar re-measures and returns when `menuOpenField` clears.
  if (view.state.field(menuOpenField, false)) return null
  const found = selectionBox(view)
  if (!found) return null
  const { box, inCell } = found
  // The editor-selection path needs editor focus; the cell path is already
  // gated on the cell being `document.activeElement` (via `cellHasSelection`).
  if (!inCell && !view.hasFocus) return null

  const barRect = bar.getBoundingClientRect()
  const vw = view.dom.ownerDocument.defaultView?.innerWidth ?? 0
  const midX = (box.left + box.right) / 2
  const editorTop = view.dom.getBoundingClientRect().top
  const aboveTop = box.top - barRect.height - 6
  const belowTop = box.bottom + 6

  const disabled: Record<string, boolean> = {}
  const active: Record<string, boolean> = {}
  for (const id of ids) {
    const cmd = BUILTIN_BY_ID[id]!
    // Every mark applies to a non-empty cell selection; `isActive` / `disabled`
    // read `state.selection`, which is collapsed there, so skip them.
    const off = inCell ? false : Boolean(cmd.disabled?.(view.state))
    disabled[id] = off
    active[id] = !off && !inCell && Boolean(cmd.isActive?.(view.state))
  }
  // Nothing the bar offers applies here (a fenced code / `$$` / frontmatter
  // selection) — show no bar rather than a row of dead buttons.
  if (ids.every((id) => disabled[id])) return null
  return {
    left: Math.max(4, Math.min(midX - barRect.width / 2, vw - barRect.width - 4)),
    top: aboveTop < editorTop + 2 ? belowTop : aboveTop,
    disabled,
    active,
  }
}
