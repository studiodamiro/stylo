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
import { selectionBarEnabled } from "./config"

const IDS: ToolbarCommandId[] = ["bold", "italic", "strike", "code", "link", "wikilink", "math"]

class SelectionBar implements PluginValue {
  private bar: HTMLElement
  private buttons = new Map<ToolbarCommandId, HTMLButtonElement>()
  private onScroll = () => this.render()

  constructor(private view: EditorView) {
    const doc = view.dom.ownerDocument
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
        cmd.run(view)
        view.focus()
        this.render()
      })
      this.buttons.set(id, b)
      this.bar.appendChild(b)
    }
    // Inside `.cm-editor` so the `inPlaceTheme` rules and `--stylo-*` tokens
    // reach it; the bar is `position: fixed`, positioned against the viewport.
    view.dom.appendChild(this.bar)
    view.scrollDOM.addEventListener("scroll", this.onScroll, { passive: true })
  }

  update(u: ViewUpdate) {
    if (u.selectionSet || u.docChanged || u.geometryChanged || u.focusChanged) this.render()
  }

  private render() {
    const { view } = this
    const sel = view.state.selection.main
    if (!view.state.facet(selectionBarEnabled) || sel.empty || !view.hasFocus) {
      this.bar.hidden = true
      return
    }
    const from = view.coordsAtPos(sel.from)
    const to = view.coordsAtPos(sel.to)
    if (!from || !to) {
      this.bar.hidden = true
      return
    }
    for (const [id, b] of this.buttons) {
      const cmd = BUILTIN_BY_ID[id]!
      const off = Boolean(cmd.disabled?.(view.state))
      b.disabled = off
      b.toggleAttribute("data-active", !off && Boolean(cmd.isActive?.(view.state)))
    }
    this.bar.hidden = false
    const win = view.dom.ownerDocument.defaultView
    const vw = win?.innerWidth ?? 0
    const rect = this.bar.getBoundingClientRect()
    const midX = (Math.min(from.left, to.left) + Math.max(from.right, to.right)) / 2
    // Above the selection, unless that would clear the top of the editor (and
    // land on the toolbar) — then drop it below the selection instead.
    const editorTop = view.dom.getBoundingClientRect().top
    const above = Math.min(from.top, to.top) - rect.height - 6
    const below = Math.max(from.bottom, to.bottom) + 6
    this.bar.style.left = `${Math.max(4, Math.min(midX - rect.width / 2, vw - rect.width - 4))}px`
    this.bar.style.top = `${above < editorTop + 2 ? below : above}px`
  }

  destroy() {
    this.view.scrollDOM.removeEventListener("scroll", this.onScroll)
    this.bar.remove()
  }
}

export const selectionBar = ViewPlugin.fromClass(SelectionBar)
