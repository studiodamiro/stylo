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
import { selectionBarItemsFacet, selectionUIFacet } from "./config"
import { createContextMenu, type ContextMenu } from "./context-menu"
import { cellHasSelection, linkRow, wikiLinkRow } from "./context-menu-actions"

interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

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
    if (u.selectionSet || u.docChanged || u.focusChanged) this.schedule()
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

  /** The screen box of the current text selection — editor or table cell. */
  private selectionBox(): { box: Box; inCell: boolean } | null {
    const { view } = this
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

  private measure(): Placement {
    const { view } = this
    if (view.state.facet(selectionUIFacet) !== "bar") return null
    const found = this.selectionBox()
    if (!found) return null
    const { box, inCell } = found
    // The editor-selection path needs editor focus; the cell path is already
    // gated on the cell being `document.activeElement` (via `cellHasSelection`).
    if (!inCell && !view.hasFocus) return null

    const barRect = this.bar.getBoundingClientRect() // `[hidden]` hides visibility only
    const vw = view.dom.ownerDocument.defaultView?.innerWidth ?? 0
    const midX = (box.left + box.right) / 2
    const editorTop = view.dom.getBoundingClientRect().top
    const aboveTop = box.top - barRect.height - 6
    const belowTop = box.bottom + 6

    const disabled: Record<string, boolean> = {}
    const active: Record<string, boolean> = {}
    for (const id of this.ids) {
      const cmd = BUILTIN_BY_ID[id]!
      // Every mark applies to a non-empty cell selection; `isActive` / `disabled`
      // read `state.selection`, which is collapsed there, so skip them.
      const off = inCell ? false : Boolean(cmd.disabled?.(view.state))
      disabled[id] = off
      active[id] = !off && !inCell && Boolean(cmd.isActive?.(view.state))
    }
    // Nothing the bar offers applies here (a fenced code / `$$` / frontmatter
    // selection) — show no bar rather than a row of dead buttons.
    if (this.ids.every((id) => disabled[id])) return null
    return {
      left: Math.max(4, Math.min(midX - barRect.width / 2, vw - barRect.width - 4)),
      top: aboveTop < editorTop + 2 ? belowTop : aboveTop,
      disabled,
      active,
    }
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

type Placement = null | {
  left: number
  top: number
  disabled: Record<string, boolean>
  active: Record<string, boolean>
}

export const selectionBar = ViewPlugin.fromClass(SelectionBar)
