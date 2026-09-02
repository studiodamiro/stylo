import type { Align } from "../toolbar/table-grid"

/** A structural edit requested from an edge `+` or the cell context menu. */
export type StructOp =
  | { kind: "insertColumn"; at: number; focus: [number, number] }
  | { kind: "deleteColumn"; at: number; focus: [number, number] }
  | { kind: "insertRow"; at: number; focus: [number, number] }
  | { kind: "deleteRow"; at: number; focus: [number, number] }
  | { kind: "align"; at: number; value: Align }

export interface GizmoHost {
  /** Current grid shape, read when the menu opens. */
  dims: () => { cols: number; rows: number; alignAt: (c: number) => Align }
  /** Apply a structural edit to the model and reserialise. */
  run: (op: StructOp) => void
}

export interface TableGizmos {
  /** Overlay to append inside the positioned table wrapper. */
  el: HTMLElement
  /** Re-place the edge `+` buttons against the current `<table>` layout. */
  layout: (table: HTMLTableElement) => void
  /** Open the structural menu for `cell` at a screen point. */
  openFor: (cell: HTMLElement, x: number, y: number) => void
  /** Drop the document-level menu listeners. */
  destroy: () => void
}

interface MenuEntry {
  label?: string
  active?: boolean
  op?: StructOp
}

/**
 * Editable-table affordances, Obsidian style: a `+` on the right edge (append
 * column) and the bottom edge (append row), shown on hover, plus a right-click /
 * long-press context menu on any cell for the full structural set. No persistent
 * per-row / per-column chrome — the menu is contextual to the clicked cell, so it
 * stays in reach on a table of any height.
 */
export function createTableGizmos(doc: Document, host: GizmoHost): TableGizmos {
  const el = doc.createElement("div")
  el.className = "cm-inplace-table-gizmos"
  el.setAttribute("contenteditable", "false")

  const menu = doc.createElement("div")
  menu.className = "cm-inplace-table-menu"
  menu.hidden = true

  const button = (className: string, label: string, onClick: () => void) => {
    const b = doc.createElement("button")
    b.type = "button"
    b.className = className
    b.setAttribute("aria-label", label)
    b.addEventListener("mousedown", (e) => {
      e.preventDefault()
      e.stopPropagation()
    })
    b.addEventListener("click", (e) => {
      e.stopPropagation()
      onClick()
    })
    return b
  }

  const addCol = button("cm-inplace-tg-add cm-inplace-tg-addcol", "Add column", () =>
    host.run({ kind: "insertColumn", at: host.dims().cols, focus: [1, host.dims().cols] }),
  )
  addCol.textContent = "+"
  const addRow = button("cm-inplace-tg-add cm-inplace-tg-addrow", "Add row", () =>
    host.run({ kind: "insertRow", at: host.dims().rows, focus: [host.dims().rows, 0] }),
  )
  addRow.textContent = "+"
  el.append(addCol, addRow, menu)

  let unbind: (() => void) | null = null
  const closeMenu = () => {
    menu.hidden = true
    unbind?.()
    unbind = null
  }

  const entries = (r: number, c: number): MenuEntry[] => {
    const { cols, rows, alignAt } = host.dims()
    const list: MenuEntry[] = [
      { label: "Insert row above", op: { kind: "insertRow", at: r, focus: [r, c] } },
      { label: "Insert row below", op: { kind: "insertRow", at: r + 1, focus: [r + 1, c] } },
      { label: "Insert column left", op: { kind: "insertColumn", at: c, focus: [r, c] } },
      { label: "Insert column right", op: { kind: "insertColumn", at: c + 1, focus: [r, c + 1] } },
    ]
    if (r > 0 && rows > 2) {
      list.push({ label: "Delete row", op: { kind: "deleteRow", at: r, focus: [r, c] } })
    }
    if (cols > 1) {
      list.push({ label: "Delete column", op: { kind: "deleteColumn", at: c, focus: [r, c - 1] } })
    }
    list.push({})
    for (const value of ["left", "center", "right"] as const) {
      list.push({
        label: `Align ${value}`,
        active: alignAt(c) === value,
        op: { kind: "align", at: c, value },
      })
    }
    return list
  }

  const openFor = (cell: HTMLElement, x: number, y: number) => {
    closeMenu()
    const r = Number((cell as HTMLElement).dataset.r)
    const c = Number((cell as HTMLElement).dataset.c)
    menu.replaceChildren(
      ...entries(r, c).map((it) => {
        if (!it.label) {
          const sep = doc.createElement("div")
          sep.className = "cm-inplace-tm-sep"
          return sep
        }
        const b = button("cm-inplace-tm-item", it.label, () => {
          if (it.op) host.run(it.op)
          closeMenu()
        })
        b.textContent = it.label
        if (it.active) b.dataset.active = ""
        return b
      }),
    )
    const base = el.getBoundingClientRect()
    menu.style.left = `${x - base.left}px`
    menu.style.top = `${y - base.top}px`
    menu.hidden = false
    const onDown = (e: Event) => {
      if (!menu.contains(e.target as Node)) closeMenu()
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeMenu()
    doc.addEventListener("mousedown", onDown, true)
    doc.addEventListener("keydown", onKey, true)
    unbind = () => {
      doc.removeEventListener("mousedown", onDown, true)
      doc.removeEventListener("keydown", onKey, true)
    }
  }

  const layout = (table: HTMLTableElement) => {
    const trs = [...table.rows]
    if (!trs.length) return
    const base = el.getBoundingClientRect()
    const top = trs[0]!.getBoundingClientRect().top - base.top
    const bottom = trs[trs.length - 1]!.getBoundingClientRect().bottom - base.top
    const rect = table.getBoundingClientRect()
    const left = rect.left - base.left
    const right = rect.right - base.left
    addCol.style.left = `${right}px`
    addCol.style.top = `${(top + bottom) / 2}px`
    addRow.style.left = `${(left + right) / 2}px`
    addRow.style.top = `${bottom}px`
  }

  return { el, layout, openFor, destroy: closeMenu }
}
