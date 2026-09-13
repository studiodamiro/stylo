/**
 * A floating inline-formatting bar that follows a non-empty selection in the
 * in-place canvas, Notion style. Inline marks only — bold, italic,
 * strikethrough, inline code, link, wikilink, inline math; block and insert
 * actions live on the right-click menu.
 *
 * It follows an editor selection (`state.selection`) and also a text selection
 * inside an editable table cell (a DOM selection — the widget is atomic, so it
 * never reaches `state.selection`). In a cell the mark buttons route through
 * `runInlineInCell`; the link / wikilink field editors do not apply there, so
 * those buttons fall back to the plain toggle.
 */

import { ViewPlugin, type EditorView, type PluginValue, type ViewUpdate } from "@codemirror/view"
import type { ToolbarCommandId } from "../types"
import { activeTableCell } from "../toolbar/cell-inline"
import { BUILTIN_BY_ID } from "../toolbar/commands"
import { ICON_PATHS, iconSvg } from "../toolbar/icon-paths"
import { selectionBarItemsFacet } from "./config"
import { createContextMenu, type ContextMenu } from "./context-menu"
import { linkRow, wikiLinkRow } from "./link-row"
import { menuOpenField } from "./menu-open"
import { measureBarPlacement, type Placement } from "./selection-bar-position"

class SelectionBar implements PluginValue {
  private bar: HTMLElement
  private ids: ToolbarCommandId[]
  private buttons = new Map<ToolbarCommandId, HTMLButtonElement>()
  private linkMenu: ContextMenu
  // Scrolling detaches the bar from its selection — just dismiss it. It returns,
  // repositioned, on the next selection change.
  private onScroll = () => {
    this.bar.hidden = true
  }
  // A cell's text selection lives in the DOM, so no `ViewUpdate` fires for it.
  private onSelectionChange = () => {
    if (activeTableCell(this.view)) this.schedule()
  }

  constructor(private view: EditorView) {
    const doc = view.dom.ownerDocument
    this.ids = view.state.facet(selectionBarItemsFacet)
    this.linkMenu = createContextMenu(doc)
    view.dom.appendChild(this.linkMenu.el)
    this.bar = doc.createElement("div")
    this.bar.className = "cm-inplace-selbar"
    this.bar.setAttribute("contenteditable", "false")
    this.bar.hidden = true
    for (const id of this.ids) {
      const cmd = BUILTIN_BY_ID[id]!
      const b = doc.createElement("button")
      b.type = "button"
      b.className = "cm-inplace-selbar-btn"
      b.title = cmd.title
      b.setAttribute("aria-label", cmd.title)
      b.appendChild(iconSvg(doc, ICON_PATHS[id] ?? ""))
      b.addEventListener("mousedown", (e) => e.preventDefault())
      b.addEventListener("click", (e) => {
        e.preventDefault()
        const inCell = Boolean(activeTableCell(view))
        // The link / wikilink buttons open a URL/target editor rather than
        // dropping a placeholder — but that editor works on `state.selection`,
        // so in a cell they fall back to the plain toggle.
        const field =
          !inCell && id === "link"
            ? linkRow(view)
            : !inCell && id === "wikilink"
              ? wikiLinkRow(view)
              : null
        if (field) {
          const r = b.getBoundingClientRect()
          this.linkMenu.showField(field, r.left, r.bottom + 6)
          return
        }
        cmd.run(view)
        if (!inCell) view.focus() // a cell keeps its own DOM focus
        this.schedule()
      })
      this.buttons.set(id, b)
      this.bar.appendChild(b)
    }
    // Inside `.cm-editor` so the `inPlaceTheme` rules and `--stylo-*` tokens
    // reach it; the bar is `position: fixed`, positioned against the viewport.
    view.dom.appendChild(this.bar)
    // Capture phase catches a scroll on any ancestor — the editor's own
    // scroller, or the page, when the editor grows with its content.
    doc.addEventListener("scroll", this.onScroll, true)
    doc.addEventListener("selectionchange", this.onSelectionChange)
  }

  update(u: ViewUpdate) {
    // Not `geometryChanged` — scrolling dismisses the bar (see `onScroll`)
    // rather than re-chasing the selection.
    const menuToggled =
      u.startState.field(menuOpenField, false) !== u.state.field(menuOpenField, false)
    // A live `readOnly` flip (no remount) needs its own trigger: it changes
    // neither the selection, the doc, nor focus, so none of the other checks
    // would otherwise catch a bar left showing over a selection made just
    // before `readOnly` turned on.
    const readOnlyToggled = u.startState.readOnly !== u.state.readOnly
    if (u.selectionSet || u.docChanged || u.focusChanged || menuToggled || readOnlyToggled)
      this.schedule()
  }

  /**
   * Layout reads (`coordsAtPos`, `getBoundingClientRect`) are illegal inside an
   * `update`, so the placement is computed in a measure phase and applied in the
   * write phase. `key: this` collapses repeats within one cycle.
   */
  private schedule() {
    this.view.requestMeasure({
      key: this,
      read: () => this.measure(),
      write: (m) => this.apply(m),
    })
  }

  private measure(): Placement {
    return measureBarPlacement(this.view, this.bar, this.ids)
  }

  private apply(m: Placement) {
    if (!m) {
      this.bar.hidden = true
      return
    }
    this.bar.hidden = false
    this.bar.style.left = `${m.left}px`
    this.bar.style.top = `${m.top}px`
    for (const [id, b] of this.buttons) {
      b.disabled = m.disabled[id]!
      b.toggleAttribute("data-active", m.active[id]!)
    }
  }

  destroy() {
    const doc = this.view.dom.ownerDocument
    doc.removeEventListener("scroll", this.onScroll, true)
    doc.removeEventListener("selectionchange", this.onSelectionChange)
    this.linkMenu.destroy()
    this.bar.remove()
  }
}

export const selectionBar = ViewPlugin.fromClass(SelectionBar)
