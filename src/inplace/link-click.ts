/**
 * Click a collapsed `[text](url)` in the seamless canvas and its URL editor
 * opens at the pointer — the same field the right-click menu and the selection
 * bar use. Under `reveal: "never"` the `(url)` is never on screen as text, so a
 * plain click otherwise has nowhere to go for an edit. The read side is
 * `link-hover.ts`; this is the write side (ADR-007 Stage 5, the click half).
 *
 * Scope:
 * - Only under `reveal: "never"`. In `"caret"` mode a click already reveals the
 *   source on that line, so inline editing is the path there.
 * - External links only. A wikilink click is navigation (`onWikiLinkClick`);
 *   its target stays editable through hover + the right-click menu.
 */

import { ViewPlugin, type EditorView, type PluginValue } from "@codemirror/view"
import { inPlaceConfigFacet, revealModeFacet } from "./config"
import { createContextMenu, type ContextMenu } from "./context-menu"
import { linkRow } from "./context-menu-actions"

class LinkClickEditor implements PluginValue {
  private menu: ContextMenu
  private contentDOM: HTMLElement
  private onClick: (e: MouseEvent) => void

  constructor(view: EditorView) {
    this.menu = createContextMenu(view.dom.ownerDocument)
    view.dom.appendChild(this.menu.el)
    this.contentDOM = view.contentDOM

    this.onClick = (e: MouseEvent) => {
      if (view.state.facet(revealModeFacet) !== "never") return
      if (!view.state.facet(inPlaceConfigFacet).links) return
      const target = e.target as HTMLElement | null
      const el = target?.closest(".cm-inplace-link")
      if (!el || el.classList.contains("cm-inplace-wikilink")) return

      let pos = view.posAtDOM(el as HTMLElement)
      if (pos < 0) {
        const at = view.posAtCoords({ x: e.clientX, y: e.clientY })
        if (at == null) return
        pos = at
      }
      view.dispatch({ selection: { anchor: pos } })
      this.menu.showField(linkRow(view), e.clientX, e.clientY)
    }
    this.contentDOM.addEventListener("click", this.onClick)
  }

  destroy() {
    this.contentDOM.removeEventListener("click", this.onClick)
    this.menu.destroy()
  }
}

export const linkClickEditor = ViewPlugin.fromClass(LinkClickEditor)
