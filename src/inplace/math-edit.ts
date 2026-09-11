/**
 * Click a rendered `$…$` / one-line `$$…$$` math widget in the seamless canvas
 * and its LaTeX editor opens at the pointer — the same field the right-click
 * menu uses. Hovering one shows the same source in a read-only bubble. Under
 * `reveal: "never"` the source is otherwise never on screen (the KaTeX widget
 * replaces the whole span), so these are the write and read halves of the
 * affordance the Stage 4 link field gives links (ADR-007 seamless exceptions,
 * dependable-tracker item 9c).
 *
 * A multi-line `$$` block's widget resolves to its opening-fence line, whose
 * text is just `$$` — `mathAtIn` finds nothing there, so both routes no-op and
 * leave that construct's existing caret-reveal untouched.
 */

import {
  type EditorView,
  hoverTooltip,
  type Tooltip,
  ViewPlugin,
  type PluginValue,
} from "@codemirror/view"
import { inPlaceConfigFacet } from "./config"
import { createContextMenu, type ContextMenu } from "./context-menu"
import { mathRow } from "./context-menu-actions"
import { mathAtIn } from "./math"

class MathClickEditor implements PluginValue {
  private menu: ContextMenu
  private contentDOM: HTMLElement
  private onClick: (e: MouseEvent) => void

  constructor(view: EditorView) {
    this.menu = createContextMenu(view.dom.ownerDocument)
    view.dom.appendChild(this.menu.el)
    this.contentDOM = view.contentDOM

    this.onClick = (e: MouseEvent) => {
      if (!view.state.facet(inPlaceConfigFacet).math) return
      const target = e.target as HTMLElement | null
      const el = target?.closest(".cm-inplace-math")
      if (!el) return

      // `posAtCoords` over a widget is unreliable (see menu-plugin.ts's HR
      // fix); `posAtDOM` on the widget element itself always resolves.
      const pos = view.posAtDOM(el as HTMLElement)
      if (pos < 0) return
      const line = view.state.doc.lineAt(pos)
      if (!mathAtIn(line.text, pos - line.from)) return

      view.dispatch({ selection: { anchor: pos } })
      this.menu.showField(mathRow(view), e.clientX, e.clientY)
    }
    this.contentDOM.addEventListener("click", this.onClick)
  }

  destroy() {
    this.contentDOM.removeEventListener("click", this.onClick)
    this.menu.destroy()
  }
}

export const mathClickEditor = ViewPlugin.fromClass(MathClickEditor)

export const mathHoverTooltip = hoverTooltip((view, pos): Tooltip | null => {
  if (!view.state.facet(inPlaceConfigFacet).math) return null
  const line = view.state.doc.lineAt(pos)
  const parts = mathAtIn(line.text, pos - line.from)
  if (!parts) return null
  const from = line.from + parts.from
  const to = line.from + parts.to
  return {
    pos: from,
    end: to,
    above: true,
    create() {
      const dom = document.createElement("div")
      dom.className = "cm-inplace-href-tip"
      dom.textContent = parts.src
      return { dom }
    },
  }
})
