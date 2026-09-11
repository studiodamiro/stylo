/**
 * Editing a rendered `$…$` / one-line `$$…$$` math span: the right-click
 * **Math** field (`mathRow`), and its click / hover counterparts on the canvas
 * — clicking a widget opens the same field at the pointer, hovering shows the
 * source in a read-only bubble. Under `reveal: "never"` the source is
 * otherwise never on screen (the KaTeX widget replaces the whole span), so
 * these are the affordance the Stage 4 link field gives links (ADR-007
 * seamless exceptions, dependable-tracker item 9c).
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
import { ICON_PATHS } from "../toolbar/icon-paths"
import { inPlaceConfigFacet } from "./config"
import { createContextMenu, type ContextMenu, type MenuField } from "./context-menu"
import { mathAtIn } from "./math"

/**
 * The **Math** row: an editable LaTeX field. Prefilled, with **Remove math**,
 * when the caret sits in an existing `$…$` or one-line `$$…$$` span — its
 * source has no other on-screen home under `reveal: "never"`, the rendered
 * KaTeX widget replaces the whole thing. Otherwise an empty field that wraps
 * the selection as `$…$` on submit, the same shape as the link rows.
 */
export function mathRow(view: EditorView): MenuField {
  const { state } = view
  const sel = state.selection.main
  const line = state.doc.lineAt(sel.head)
  const parts = mathAtIn(line.text, sel.head - line.from)

  if (parts) {
    const from = line.from + parts.from
    const to = line.from + parts.to
    const fence = parts.block ? "$$" : "$"
    return {
      field: true,
      label: "Edit math",
      icon: ICON_PATHS.math,
      value: parts.src,
      placeholder: "e^{i\\pi} + 1 = 0",
      onSubmit: (src) => {
        const trimmed = src.trim()
        if (trimmed) view.dispatch({ changes: { from, to, insert: `${fence}${trimmed}${fence}` } })
        view.focus()
      },
      actions: [
        {
          label: "Remove math",
          onSelect: () => {
            view.dispatch({
              changes: { from, to, insert: parts.src },
              selection: { anchor: from, head: from + parts.src.length },
            })
            view.focus()
          },
        },
      ],
    }
  }

  const label = state.sliceDoc(sel.from, sel.to)
  return {
    field: true,
    label: "Add math",
    icon: ICON_PATHS.math,
    value: "",
    placeholder: "e^{i\\pi} + 1 = 0",
    onSubmit: (src) => {
      const t = src.trim() || label || "x"
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: `$${t}$` },
        selection: { anchor: sel.from + 1, head: sel.from + 1 + t.length },
      })
      view.focus()
    },
  }
}

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
