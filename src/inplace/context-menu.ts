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
  /** Native `title` tooltip — e.g. why a disabled row is disabled. */
  title?: string
  onSelect: () => void
}

export interface MenuSubmenu {
  label: string
  icon?: string
  rows: MenuRow[]
  /** Greyed, and its flyout never opens. */
  disabled?: boolean
}

/** A row whose flyout is a single text input plus optional action buttons. */
export interface MenuField {
  field: true
  label: string
  icon?: string
  value: string
  placeholder?: string
  onSubmit: (value: string) => void
  actions?: MenuAction[]
}

export type MenuRow = MenuAction | MenuSubmenu | MenuField | "separator"

export interface ContextMenu {
  /** Append once to a stable container (typically `document.body`). */
  readonly el: HTMLElement
  readonly isOpen: boolean
  /** Render `rows` and show the menu at a viewport point, clamped on-screen. */
  show: (rows: MenuRow[], x: number, y: number) => void
  /** Show a single field panel directly, with no wrapping menu row. */
  showField: (field: MenuField, x: number, y: number) => void
  hide: () => void
  /** Remove the element and drop document listeners. */
  destroy: () => void
}

const isSubmenu = (r: MenuRow): r is MenuSubmenu => typeof r !== "string" && "rows" in r
const isField = (r: MenuRow): r is MenuField => typeof r !== "string" && "field" in r

export function createContextMenu(doc: Document, className = "cm-inplace-menu"): ContextMenu {
  const win = doc.defaultView
  // A non-interactive full-viewport layer; the panels inside it take pointers.
  const root = doc.createElement("div")
  root.className = className
  root.setAttribute("contenteditable", "false")
  root.hidden = true

  let flyout: HTMLElement | null = null
  let unbind: (() => void) | null = null

  // A flyout is sticky: once open it stays until a different flyout row opens,
  // a plain row is hovered, or the whole menu is dismissed. No hover-out timer
  // — that made the panel close mid-approach on a real mouse path.
  const clearFlyout = () => {
    flyout?.remove()
    flyout = null
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
    if (a.title) b.title = a.title
    if (a.active) b.dataset.active = ""
    if (a.disabled) {
      b.disabled = true
    } else {
      holdFocus(b)
      // Hovering a plain row dismisses any open flyout (but not one it belongs
      // to — a flyout's own rows call this too and must be ignored).
      b.addEventListener("pointerenter", () => {
        if (!b.closest(`.${className}-panel[data-for]`)) clearFlyout()
      })
      b.addEventListener("click", (e) => {
        e.stopPropagation()
        hide()
        a.onSelect()
      })
    }
    return b
  }

  // A row that opens a flyout panel — used by both submenus and field rows. The
  // flyout is sticky (opens on hover or click, no auto-close timer).
  const flyoutRow = (
    text: string,
    icon: string | undefined,
    build: () => HTMLElement,
    disabled = false,
  ) => {
    const b = doc.createElement("button")
    b.type = "button"
    b.className = `${className}-item ${className}-parent`
    label(b, text, icon)
    if (disabled) {
      b.disabled = true
      return b
    }
    holdFocus(b)
    const open = () => {
      if (flyout?.dataset.for === text) return
      clearFlyout()
      const panel = build()
      panel.dataset.for = text
      root.appendChild(panel)
      placeFlyout(panel, b.getBoundingClientRect())
      flyout = panel
      // `preventScroll` — a focus-induced scroll would trip the menu's own
      // dismiss-on-scroll handler and close it the instant the field opens.
      ;(panel.querySelector("input") as HTMLInputElement | null)?.focus({ preventScroll: true })
    }
    b.addEventListener("pointerenter", open)
    b.addEventListener("click", (e) => {
      e.stopPropagation()
      open()
    })
    return b
  }

  const fieldPanel = (f: MenuField): HTMLElement => {
    const panel = doc.createElement("div")
    panel.className = `${className}-panel`
    const input = doc.createElement("input")
    input.type = "text"
    input.className = `${className}-input`
    input.value = f.value
    if (f.placeholder) input.placeholder = f.placeholder
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return
      e.preventDefault()
      const v = input.value.trim()
      hide()
      f.onSubmit(v)
    })
    panel.appendChild(input)
    for (const a of f.actions ?? []) panel.appendChild(actionButton(a))
    return panel
  }

  const buildPanel = (rows: MenuRow[]): HTMLElement => {
    const panel = doc.createElement("div")
    panel.className = `${className}-panel`
    for (const r of rows) {
      if (r === "separator") {
        const sep = doc.createElement("div")
        sep.className = `${className}-sep`
        panel.appendChild(sep)
      } else if (isSubmenu(r)) {
        panel.appendChild(flyoutRow(r.label, r.icon, () => buildPanel(r.rows), r.disabled))
      } else if (isField(r)) {
        panel.appendChild(flyoutRow(r.label, r.icon, () => fieldPanel(r)))
      } else {
        panel.appendChild(actionButton(r))
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

  // A flyout sits to the right of its parent row; if it would run off-screen it
  // flips to the left instead of being shoved back over the menu (which would
  // leave a gap the pointer has to cross, closing it mid-approach).
  const placeFlyout = (panel: HTMLElement, host: DOMRect) => {
    const vw = win?.innerWidth ?? 0
    const vh = win?.innerHeight ?? 0
    panel.style.left = "0"
    panel.style.top = "0"
    const { width, height } = panel.getBoundingClientRect()
    const right = host.right - 4
    const left = right + width > vw - 4 ? host.left - width + 4 : right
    panel.style.left = `${Math.max(4, left)}px`
    panel.style.top = `${Math.max(4, Math.min(host.top - 4, vh - height - 4))}px`
  }

  const armDismiss = () => {
    const outside = (e: Event) => !root.contains(e.target as Node)
    const onDown = (e: Event) => {
      if (outside(e)) hide()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide()
    }
    // Ignore scrolls that come from inside the menu — e.g. the URL input
    // scrolling its own text as you type past its width.
    const onScroll = (e: Event) => {
      if (outside(e)) hide()
    }
    // `pointerdown` as well as `mousedown` — a touch tap outside fires only the
    // former, and without it the menu could not be dismissed on a touch device.
    doc.addEventListener("pointerdown", onDown, true)
    doc.addEventListener("mousedown", onDown, true)
    doc.addEventListener("keydown", onKey, true)
    doc.addEventListener("scroll", onScroll, true)
    unbind = () => {
      doc.removeEventListener("pointerdown", onDown, true)
      doc.removeEventListener("mousedown", onDown, true)
      doc.removeEventListener("keydown", onKey, true)
      doc.removeEventListener("scroll", onScroll, true)
    }
  }

  const show = (rows: MenuRow[], x: number, y: number) => {
    hide()
    const main = buildPanel(rows)
    root.appendChild(main)
    root.hidden = false
    place(main, x, y)
    armDismiss()
  }

  // Show one field panel directly (no wrapping menu) — the selection bar's link
  // button opens the URL editor this way.
  const showField = (f: MenuField, x: number, y: number) => {
    hide()
    const panel = fieldPanel(f)
    root.appendChild(panel)
    root.hidden = false
    place(panel, x, y)
    ;(panel.querySelector("input") as HTMLInputElement | null)?.focus({ preventScroll: true })
    armDismiss()
  }

  return {
    el: root,
    get isOpen() {
      return !root.hidden
    },
    show,
    showField,
    hide,
    destroy: () => {
      hide()
      root.remove()
    },
  }
}
