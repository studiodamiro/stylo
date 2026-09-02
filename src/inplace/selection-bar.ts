/**
 * A floating inline-formatting bar that follows a non-empty selection in the
 * in-place canvas, Notion style. Inline marks only — bold, italic,
 * strikethrough, inline code, link, wikilink, inline math; block and insert
 * actions live on the right-click menu.
 */

import { ViewPlugin, type EditorView, type PluginValue, type ViewUpdate } from "@codemirror/view"
import type { ToolbarCommandId } from "../types"
import { BUILTIN_BY_ID } from "../toolbar/commands"
import { ICON_PATHS, iconSvg } from "../toolbar/icon-paths"
import { selectionUIFacet } from "./config"
import { createContextMenu, type ContextMenu } from "./context-menu"
import { linkRow, wikiLinkRow } from "./context-menu-actions"

const IDS: ToolbarCommandId[] = ["bold", "italic", "strike", "code", "link", "wikilink", "math"]

class SelectionBar implements PluginValue {
  private bar: HTMLElement
  private buttons = new Map<ToolbarCommandId, HTMLButtonElement>()
  private linkMenu: ContextMenu
  // Scrolling detaches the bar from its selection — just dismiss it. It returns,
  // repositioned, on the next selection change.
  private onScroll = () => {
    this.bar.hidden = true
  }

  constructor(private view: EditorView) {
    const doc = view.dom.ownerDocument
    this.linkMenu = createContextMenu(doc)
    view.dom.appendChild(this.linkMenu.el)
    this.bar = doc.createElement("div")
    this.bar.className = "cm-inplace-selbar"
    this.bar.setAttribute("contenteditable", "false")
    this.bar.hidden = true
    for (const id of IDS) {
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
        // The link / wikilink buttons open a URL/target editor rather than
        // dropping a `[text](url)` / `[[target]]` placeholder.
        const field =
          id === "link" ? linkRow(view) : id === "wikilink" ? wikiLinkRow(view) : null
        if (field) {
          const r = b.getBoundingClientRect()
          this.linkMenu.showField(field, r.left, r.bottom + 6)
          return
        }
        cmd.run(view)
        view.focus()
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
    view.dom.ownerDocument.addEventListener("scroll", this.onScroll, true)
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

  private measure(): Placement {
    const { view } = this
    const sel = view.state.selection.main
    if (view.state.facet(selectionUIFacet) !== "bar" || sel.empty || !view.hasFocus) return null
    const from = view.coordsAtPos(sel.from)
    const to = view.coordsAtPos(sel.to)
    if (!from || !to) return null

    const rect = this.bar.getBoundingClientRect() // measurable — `[hidden]` only hides visibility
    const vw = view.dom.ownerDocument.defaultView?.innerWidth ?? 0
    const midX = (Math.min(from.left, to.left) + Math.max(from.right, to.right)) / 2
    // Above the selection, unless that clears the top of the editor (landing on
    // the toolbar) — then drop it below.
    const editorTop = view.dom.getBoundingClientRect().top
    const aboveTop = Math.min(from.top, to.top) - rect.height - 6
    const belowTop = Math.max(from.bottom, to.bottom) + 6

    const disabled: Record<string, boolean> = {}
    const active: Record<string, boolean> = {}
    for (const id of IDS) {
      const cmd = BUILTIN_BY_ID[id]!
      const off = Boolean(cmd.disabled?.(view.state))
      disabled[id] = off
      active[id] = !off && Boolean(cmd.isActive?.(view.state))
    }
    // Nothing the bar offers applies here (a fenced code / `$$` / frontmatter
    // selection) — show no bar rather than a row of dead buttons.
    if (IDS.every((id) => disabled[id])) return null
    return {
      left: Math.max(4, Math.min(midX - rect.width / 2, vw - rect.width - 4)),
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
    this.view.dom.ownerDocument.removeEventListener("scroll", this.onScroll, true)
    this.linkMenu.destroy()
    this.bar.remove()
  }
}

type Placement =
  | null
  | {
      left: number
      top: number
      disabled: Record<string, boolean>
      active: Record<string, boolean>
    }

export const selectionBar = ViewPlugin.fromClass(SelectionBar)
