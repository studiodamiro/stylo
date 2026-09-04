/**
 * Owns the in-place right-click menu: one `ContextMenu` per editor, a
 * `contextmenu` listener on the content DOM, and the rule for when Stylo takes
 * over from the browser's own menu (see the 2026-09-03 journal note). On touch
 * there is no `contextmenu` event, so a long-press opens the same menu.
 */

import { ViewPlugin, type EditorView, type PluginValue } from "@codemirror/view"
import { contextMenuEnabled } from "./config"
import { createContextMenu, type ContextMenu } from "./context-menu"
import { menuRows } from "./context-menu-actions"
import { wrapAt } from "./edit-boundaries"
import { attachLongPress, type LongPressHandle } from "./long-press"

class ContextMenuController implements PluginValue {
  private view: EditorView
  private menu: ContextMenu
  private onContextMenu: (e: MouseEvent) => void
  private onPointerDown: () => void
  private longPress: LongPressHandle
  private contentDOM: HTMLElement
  /** Selection captured at pointer-down — a right-click can collapse it before
   *  `contextmenu` fires, which would drop the selection-aware menu rows. */
  private stashed: { anchor: number; head: number } | null = null
  /** When a long-press last opened the menu. Android also synthesises a
   *  `contextmenu` from the same gesture; one that lands within the window is
   *  swallowed so the menu does not re-open on top of itself. */
  private longPressAt = 0

  constructor(view: EditorView) {
    this.view = view
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
      const target = e.target as HTMLElement | null
      if (!view.state.facet(contextMenuEnabled)) return

      // Editable tables run their own context menu (structural rows, plus the
      // format group when a cell has a selection) and stop propagation before
      // this fires. Anything from that subtree that still reaches here is not a
      // cell — leave it to the browser.
      if (target?.closest(".cm-inplace-table-edit")) return

      // Every in-canvas target is handled: even a plain paragraph with no
      // selection has Insert + clipboard to offer, and adding a block is a
      // right-click action. Targets outside `.cm-content` never reach here, so
      // the browser's own menu still shows there.
      e.preventDefault()
      // Cancel any press still counting down, and drop a `contextmenu` that the
      // browser fired off a long-press that already opened the menu.
      this.longPress.cancel()
      if (Date.now() - this.longPressAt < 700) return
      this.openMenuAt(e.clientX, e.clientY, target)
    }
    this.contentDOM.addEventListener("contextmenu", this.onContextMenu)

    this.longPress = attachLongPress(this.contentDOM, {
      onLongPress: (x, y, t) => {
        this.longPressAt = Date.now()
        this.openMenuAt(x, y, t as HTMLElement | null)
      },
    })
  }

  /** Open the canvas menu at a screen point, from a right-click or a long-press.
   *  Reconciles the selection first so the menu offers the right rows. */
  private openMenuAt(clientX: number, clientY: number, target: HTMLElement | null) {
    const view = this.view
    if (!view.state.facet(contextMenuEnabled)) return
    if (target?.closest(".cm-inplace-table-edit")) return

    // A press that landed inside a selection may have collapsed it in the DOM
    // before this fired — put it back so the menu still offers the selection
    // rows (Link field, inline marks).
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
      const pos = view.posAtCoords({ x: clientX, y: clientY })
      if (pos != null) {
        const wrap = wrapAt(view.state, pos, false, true)
        let span = view.state.wordAt(pos) ?? { anchor: pos }
        if (wrap?.kind === "link") span = { anchor: wrap.from, head: wrap.to }
        else if (wrap && wrap.contentTo > wrap.contentFrom)
          span = { anchor: wrap.contentFrom, head: wrap.contentTo }
        view.dispatch({ selection: span })
      }
    }

    this.menu.show(menuRows(view), clientX, clientY)
  }

  destroy() {
    this.contentDOM.removeEventListener("pointerdown", this.onPointerDown, true)
    this.contentDOM.removeEventListener("contextmenu", this.onContextMenu)
    this.longPress.dispose()
    this.menu.destroy()
  }
}

export const contextMenuLayer = ViewPlugin.fromClass(ContextMenuController)
