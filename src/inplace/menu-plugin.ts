/**
 * Owns the in-place right-click menu: one `ContextMenu` per editor, a
 * `contextmenu` listener on the content DOM, and the rule for when Stylo takes
 * over from the browser's own menu (see the 2026-09-03 journal note).
 */

import { ViewPlugin, type EditorView, type PluginValue } from "@codemirror/view"
import { contextMenuEnabled } from "./config"
import { createContextMenu, type ContextMenu } from "./context-menu"
import { menuRows } from "./context-menu-actions"
import { wrapAt } from "./edit-boundaries"

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

      // Editable tables run their own context menu (structural rows, plus the
      // format group when a cell has a selection) and stop propagation before
      // this fires. Anything from that subtree that still reaches here is not a
      // cell — leave it to the browser.
      if (target?.closest(".cm-inplace-table-edit")) return

      // A right-click that landed inside a selection may have collapsed it in
      // the DOM before this fired — put it back so the menu still offers the
      // selection rows (Link field, inline marks).
      if (this.stashed && view.state.selection.main.empty) {
        view.dispatch({ selection: this.stashed })
      } else if (view.state.selection.main.empty) {
        // No prior selection: select what the pointer is on so the menu offers
        // formatting for it. Inside an inline mark run (`**two words**`,
        // `*a phrase*`, `~~struck~~`, `` `code` ``) take the run's text, so a
        // toggle hits all of it. Inside a link or wikilink take the *whole*
        // construct — `[a b](url)`, `[[Page|a b]]` — because its label is not a
        // Markdown context: Bold there must wrap the link (`**[a b](url)**`),
        // never land `**` inside it. Otherwise the single word; failing that
        // (blank line, whitespace, punctuation) just drop the caret.
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
        if (pos != null) {
          const wrap = wrapAt(view.state, pos, false, true)
          let span = view.state.wordAt(pos) ?? { anchor: pos }
          if (wrap?.kind === "link") span = { anchor: wrap.from, head: wrap.to }
          else if (wrap && wrap.contentTo > wrap.contentFrom)
            span = { anchor: wrap.contentFrom, head: wrap.contentTo }
          view.dispatch({ selection: span })
        }
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
