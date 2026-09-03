import { Prec, type Extension } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { cellSourcePos } from "../toolbar/table"
import type { InPlaceConfig } from "../types"
import {
  contextMenuEnabled,
  inPlaceConfigFacet,
  linkOpenFacet,
  menuGroupsFacet,
  resolveContextMenu,
  resolveSelectionBarItems,
  resolveToggles,
  revealModeFacet,
  selectionBarItemsFacet,
  selectionUIFacet,
  tableEditingFacet,
} from "./config"
import { inPlaceEditBoundaries } from "./edit-boundaries"
import { inPlaceAutoformat } from "./autoformat"
import { inPlaceInsertAssociation } from "./edit-insert-assoc"
import { inPlaceLinePrefixEdit } from "./edit-line-prefix"
import { frontmatterField } from "./frontmatter"
import { linkClickEditor } from "./link-click"
import { linkHoverTooltip } from "./link-hover"
import { blockMathField } from "./math"
import { contextMenuLayer } from "./menu-plugin"
import { inPlaceDecorations } from "./plugin"
import { selectionBar } from "./selection-bar"
import { tableField } from "./tables"
import { inPlaceTheme } from "./theme"

export interface InPlaceOptions {
  /** Fired when a collapsed `[[wikilink]]` is clicked in the canvas. */
  onWikiLinkClick?: (target: string) => void
  /** Fired by the link editor's "Open link" action with the link's href. */
  onLinkClick?: (href: string) => void
  /** Which decoration types render; see ADR-005. Applied once, at construction. */
  inPlace?: InPlaceConfig
}

/**
 * Rendered widgets with no interior text position. A click on one (its body,
 * KaTeX internals, the empty parts of an `<hr>`) can leave the caret unplaced,
 * so nothing reveals — this hands it to the widget's edge instead. Everything
 * else, text and line padding alike, stays with CodeMirror.
 */
const REVEAL_WIDGET = ".cm-inplace-math, .cm-inplace-hr, .cm-inplace-table"

/**
 * Character offset of a screen point within a rendered table cell's text,
 * clamped to that text. Lets a click land mid-word instead of at the cell's
 * start when the source is revealed. Returns 0 where the browser can't resolve
 * a caret (jsdom, or a click on the cell's padding beyond the text).
 */
function caretOffsetInCell(cell: HTMLElement, x: number, y: number): number {
  const text = cell.firstChild
  const len = cell.textContent?.length ?? 0
  if (!text || text.nodeType !== Node.TEXT_NODE || len === 0) return 0

  const doc = cell.ownerDocument as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }
  let node: Node | null = null
  let offset = 0
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y)
    if (p) [node, offset] = [p.offsetNode, p.offset]
  } else if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y)
    if (r) [node, offset] = [r.startContainer, r.startOffset]
  }

  if (node === text) return Math.min(offset, len)
  if (node === cell) return offset > 0 ? len : 0 // clicked the cell padding
  return 0
}

/**
 * The complete in-place canvas layer: decoration plugin, display theme, a
 * reveal-on-click fallback for rendered widgets, and a delegated click handler
 * for wikilinks.
 *
 * The theme is raised with `Prec.high` so its `.cm-content` font rule overrides
 * the base editor theme (which sets the source surface to monospace) for
 * in-place editors only.
 */
export function inPlaceExtension(opts: InPlaceOptions = {}): Extension {
  const menu = resolveContextMenu(opts.inPlace?.contextMenu)
  return [
    inPlaceConfigFacet.of(resolveToggles(opts.inPlace)),
    tableEditingFacet.of(opts.inPlace?.table ?? "source"),
    revealModeFacet.of(opts.inPlace?.reveal ?? "caret"),
    linkOpenFacet.of(opts.onLinkClick ?? null),
    contextMenuEnabled.of(menu.enabled),
    menuGroupsFacet.of(menu.groups),
    selectionUIFacet.of(opts.inPlace?.selectionUI ?? "menu"),
    selectionBarItemsFacet.of(resolveSelectionBarItems(opts.inPlace?.selectionBarItems)),
    inPlaceDecorations(),
    // Backspace: the line-prefix unwrap gets first refusal, then the
    // step-over-markers handler, then CodeMirror's default.
    inPlaceLinePrefixEdit,
    inPlaceEditBoundaries,
    inPlaceInsertAssociation,
    inPlaceAutoformat,
    blockMathField,
    frontmatterField,
    tableField,
    contextMenuLayer,
    selectionBar,
    linkClickEditor,
    linkHoverTooltip,
    Prec.high(inPlaceTheme),
    EditorView.domEventHandlers({
      mousedown(event, view) {
        const target = event.target as HTMLElement | null
        // An editable table (`inPlace.table: "cells"`) owns its own clicks —
        // the mousedown places the caret in a contentEditable cell.
        if (target?.closest(".cm-inplace-table-edit")) return false
        const widget = target?.closest<HTMLElement>(REVEAL_WIDGET)
        if (!widget) return false // text or padding — CodeMirror places the caret
        let pos = view.posAtDOM(widget)
        if (pos < 0) return false
        // A rendered table: reveal the source at the cell that was clicked, not
        // at the table's first cell (`posAtDOM` gives the widget's start).
        const cell = target?.closest<HTMLElement>("[data-stylo-row]")
        if (cell && widget.contains(cell)) {
          const at = cellSourcePos(
            view.state.doc,
            pos,
            Number(cell.dataset.styloRow),
            Number(cell.dataset.styloCol),
          )
          if (at != null) pos = at + caretOffsetInCell(cell, event.clientX, event.clientY)
        }
        view.focus()
        view.dispatch({ selection: { anchor: pos } })
        return true
      },
      click(event) {
        if (!opts.onWikiLinkClick) return false
        const el = (event.target as HTMLElement | null)?.closest("[data-stylo-wikilink]")
        if (!el) return false
        opts.onWikiLinkClick(el.getAttribute("data-stylo-wikilink") ?? "")
        return false
      },
    }),
  ]
}
