/**
 * Owns the in-place right-click menu: one `ContextMenu` per editor, a
 * `contextmenu` listener on the content DOM, and the rule for when Stylo takes
 * over from the browser's own menu (see the 2026-09-03 journal note).
 */

import { ViewPlugin, type EditorView, type PluginValue } from "@codemirror/view"
import { contextMenuEnabled } from "./config"
import { createContextMenu, type ContextMenu } from "./context-menu"
import { cellHasSelection, menuRows } from "./context-menu-actions"

class ContextMenuController implements PluginValue {
  private menu: ContextMenu
  private onContextMenu: (e: MouseEvent) => void
  private onPointerDown: () => void
  private contentDOM: HTMLElement
  /** Selection captured at pointer-down — a right-click can collapse it before
   *  `contextmenu` fires, which would drop the selection-aware menu rows. */
  private stashed: { anchor: number; head: number } | null = null

  constructor(view: EditorView) {
    this.menu = createContextMenu(view.dom.ownerDocument)
    // Inside `.cm-editor` so the `inPlaceTheme` rules (an `EditorView.theme`,
    // scoped to that element) reach it and the `--stylo-*` tokens inherit. The
    // panels are `position: fixed`, so placement is still viewport-relative.
    view.dom.appendChild(this.menu.el)

    this.contentDOM = view.contentDOM
    this.onPointerDown = () => {
      const s = view.state.selection.main
      this.stashed = s.empty ? null : { anchor: s.anchor, head: s.head }
    }
    this.contentDOM.addEventListener("pointerdown", this.onPointerDown, true)

    this.onContextMenu = (e: MouseEvent) => {
      if (!view.state.facet(contextMenuEnabled)) return
      const target = e.target as HTMLElement | null

      // Inside an editable table: a collapsed caret gets the widget's own
      // structural menu (it stops propagation before this fires). Only a
      // selection inside a cell reaches here — offer inline actions for it.
      const inEditableTable = Boolean(target?.closest(".cm-inplace-table-edit"))
      if (inEditableTable && !cellHasSelection(view)) return

      // A right-click that landed inside a selection may have collapsed it in
      // the DOM before this fired — put it back so the menu still offers the
      // selection rows (Link field, inline marks).
      if (this.stashed && view.state.selection.main.empty) {
        view.dispatch({ selection: this.stashed })
      } else if (!inEditableTable && view.state.selection.main.empty) {
        // No prior selection: drop the caret where the pointer is so the menu
        // reflects that block, not wherever the caret happened to rest.
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
        if (pos != null) view.dispatch({ selection: { anchor: pos } })
      }

      // Every in-canvas target is handled: even a plain paragraph with no
      // selection has Insert + clipboard to offer, and adding a block is a
      // right-click action. Targets outside `.cm-content` never reach here, so
      // the browser's own menu still shows there.
      e.preventDefault()
      this.menu.show(menuRows(view), e.clientX, e.clientY)
    }
    this.contentDOM.addEventListener("contextmenu", this.onContextMenu)
  }

  destroy() {
    this.contentDOM.removeEventListener("pointerdown", this.onPointerDown, true)
    this.contentDOM.removeEventListener("contextmenu", this.onContextMenu)
    this.menu.destroy()
  }
}

export const contextMenuLayer = ViewPlugin.fromClass(ContextMenuController)
