/**
 * A pointer-positioned menu shell for the in-place canvas. It owns the popup
 * element, its placement, one level of flyout submenu, and dismissal (outside
 * press, Escape, scroll). It knows nothing about editor commands; the caller
 * passes plain rows with `onSelect` callbacks.
 */

import { iconSvg } from "../toolbar/icon-paths"

export interface MenuAction {
  label: string
  /** Stroke-path data for a leading glyph (see `toolbar/icon-paths`). */
  icon?: string
  /** Rendered with emphasis when true. */
  active?: boolean
  /** Shown greyed and not selectable. */
  disabled?: boolean
  onSelect: () => void
}

export interface MenuSubmenu {
  label: string
  icon?: string
  rows: MenuRow[]
}

export type MenuRow = MenuAction | MenuSubmenu | "separator"

export interface ContextMenu {
  /** Append once to a stable container (typically `document.body`). */
  readonly el: HTMLElement
  readonly isOpen: boolean
  /** Render `rows` and show the menu at a viewport point, clamped on-screen. */
  show: (rows: MenuRow[], x: number, y: number) => void
  hide: () => void
  /** Remove the element and drop document listeners. */
  destroy: () => void
}

const isSubmenu = (r: MenuRow): r is MenuSubmenu => typeof r !== "string" && "rows" in r

export function createContextMenu(doc: Document, className = "cm-inplace-menu"): ContextMenu {
  const win = doc.defaultView
  // A non-interactive full-viewport layer; the panels inside it take pointers.
  const root = doc.createElement("div")
  root.className = className
  root.setAttribute("contenteditable", "false")
  root.hidden = true

  let flyout: HTMLElement | null = null
  let flyoutTimer: number | undefined
  let unbind: (() => void) | null = null

  const clearFlyout = () => {
    flyout?.remove()
    flyout = null
    win?.clearTimeout(flyoutTimer)
  }
  // Hover intent: the submenu stays open while the pointer is over its parent
  // row or the panel itself, and only closes after a grace period once it has
  // left both — so a diagonal move from the parent to the panel is forgiving.
  const cancelClose = () => win?.clearTimeout(flyoutTimer)
  const armClose = () => {
    win?.clearTimeout(flyoutTimer)
    flyoutTimer = win?.setTimeout(clearFlyout, 300)
  }

  const hide = () => {
    if (root.hidden) return
    clearFlyout()
    root.hidden = true
    root.replaceChildren()
    unbind?.()
    unbind = null
  }

  // A mousedown inside the menu must not blur the editor before the click fires.
  const holdFocus = (el: HTMLElement) =>
    el.addEventListener("mousedown", (e) => {
      e.preventDefault()
      e.stopPropagation()
    })

  const label = (el: HTMLElement, text: string, icon?: string) => {
    if (icon) el.appendChild(iconSvg(doc, icon))
    const span = doc.createElement("span")
    span.textContent = text
    el.appendChild(span)
  }

  const actionButton = (a: MenuAction): HTMLElement => {
    const b = doc.createElement("button")
    b.type = "button"
    b.className = `${className}-item`
    label(b, a.label, a.icon)
    if (a.active) b.dataset.active = ""
    if (a.disabled) {
      b.disabled = true
    } else {
      holdFocus(b)
      b.addEventListener("click", (e) => {
        e.stopPropagation()
        hide()
        a.onSelect()
      })
    }
    return b
  }

  const submenuButton = (s: MenuSubmenu): HTMLElement => {
    const b = doc.createElement("button")
    b.type = "button"
    b.className = `${className}-item ${className}-parent`
    label(b, s.label, s.icon)
    holdFocus(b)
    const openFlyout = () => {
      cancelClose()
      if (flyout?.dataset.for === s.label) return
      clearFlyout()
      const panel = buildPanel(s.rows)
      panel.dataset.for = s.label
      panel.addEventListener("pointerenter", cancelClose)
      panel.addEventListener("pointerleave", armClose)
      root.appendChild(panel)
      const host = b.getBoundingClientRect()
      place(panel, host.right - 4, host.top - 4)
      flyout = panel
    }
    b.addEventListener("pointerenter", openFlyout)
    b.addEventListener("pointerleave", armClose)
    b.addEventListener("click", (e) => {
      e.stopPropagation()
      openFlyout()
    })
    return b
  }

  const buildPanel = (rows: MenuRow[]): HTMLElement => {
    const panel = doc.createElement("div")
    panel.className = `${className}-panel`
    for (const r of rows) {
      if (r === "separator") {
        const sep = doc.createElement("div")
        sep.className = `${className}-sep`
        panel.appendChild(sep)
      } else {
        panel.appendChild(isSubmenu(r) ? submenuButton(r) : actionButton(r))
      }
    }
    return panel
  }

  // Place a fixed-position panel at (x, y), nudged back on-screen on overflow.
  const place = (panel: HTMLElement, x: number, y: number) => {
    const vw = win?.innerWidth ?? 0
    const vh = win?.innerHeight ?? 0
    panel.style.left = "0"
    panel.style.top = "0"
    const { width, height } = panel.getBoundingClientRect()
    panel.style.left = `${Math.max(4, Math.min(x, vw - width - 4))}px`
    panel.style.top = `${Math.max(4, Math.min(y, vh - height - 4))}px`
  }

  const show = (rows: MenuRow[], x: number, y: number) => {
    hide()
    const main = buildPanel(rows)
    root.appendChild(main)
    root.hidden = false
    place(main, x, y)

    const onDown = (e: Event) => {
      if (!root.contains(e.target as Node)) hide()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide()
    }
    doc.addEventListener("mousedown", onDown, true)
    doc.addEventListener("keydown", onKey, true)
    doc.addEventListener("scroll", hide, true)
    unbind = () => {
      doc.removeEventListener("mousedown", onDown, true)
      doc.removeEventListener("keydown", onKey, true)
      doc.removeEventListener("scroll", hide, true)
    }
  }

  return {
    el: root,
    get isOpen() {
      return !root.hidden
    },
    show,
    hide,
    destroy: () => {
      hide()
      root.remove()
    },
  }
}
