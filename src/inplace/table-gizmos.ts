import type { Align } from "../toolbar/table-grid"
import { createContextMenu, type ContextMenu, type MenuRow } from "./context-menu"

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

/**
 * Editable-table affordances, Obsidian style: a `+` on the right edge (append
 * column) and the bottom edge (append row), shown on hover, plus a right-click /
 * long-press context menu on any cell for the full structural set. No persistent
 * per-row / per-column chrome — the menu is contextual to the clicked cell, so it
 * stays in reach on a table of any height. The menu reuses the canvas's shared
 * `ContextMenu` shell (`context-menu.ts`); only the edge strips are bespoke.
 */
export function createTableGizmos(doc: Document, host: GizmoHost): TableGizmos {
  const el = doc.createElement("div")
  el.className = "cm-inplace-table-gizmos"
  el.setAttribute("contenteditable", "false")

  const menu: ContextMenu = createContextMenu(doc)

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

  /**
   * A full-edge hit strip: the whole right edge adds a column, the whole bottom
   * edge adds a row — click anywhere along it, Obsidian style. The strip is
   * invisible until the pointer is over it; a CSS-drawn `+` cross is its only
   * mark (a font glyph never sits at the optical centre of its box).
   */
  const edge = (axis: "col" | "row", label: string, onClick: () => void) => {
    const strip = button(`cm-inplace-tg-edge cm-inplace-tg-add${axis}`, label, onClick)
    const plus = doc.createElement("span")
    plus.className = "cm-inplace-tg-plus"
    strip.appendChild(plus)
    return strip
  }

  const addCol = edge("col", "Add column", () =>
    host.run({ kind: "insertColumn", at: host.dims().cols, focus: [1, host.dims().cols] }),
  )
  const addRow = edge("row", "Add row", () =>
    host.run({ kind: "insertRow", at: host.dims().rows, focus: [host.dims().rows, 0] }),
  )
  el.append(addCol, addRow, menu.el)

  const rows = (r: number, c: number): MenuRow[] => {
    const { cols, rows: rowCount, alignAt } = host.dims()
    const item = (label: string, op: StructOp, active = false): MenuRow => ({
      label,
      active,
      onSelect: () => host.run(op),
    })
    const list: MenuRow[] = [
      item("Insert row above", { kind: "insertRow", at: r, focus: [r, c] }),
      item("Insert row below", { kind: "insertRow", at: r + 1, focus: [r + 1, c] }),
      item("Insert column left", { kind: "insertColumn", at: c, focus: [r, c] }),
      item("Insert column right", { kind: "insertColumn", at: c + 1, focus: [r, c + 1] }),
    ]
    if (r > 0 && rowCount > 2) {
      list.push(item("Delete row", { kind: "deleteRow", at: r, focus: [r, c] }))
    }
    if (cols > 1) {
      list.push(item("Delete column", { kind: "deleteColumn", at: c, focus: [r, c - 1] }))
    }
    list.push("separator")
    for (const value of ["left", "center", "right"] as const) {
      list.push(item(`Align ${value}`, { kind: "align", at: c, value }, alignAt(c) === value))
    }
    return list
  }

  const openFor = (cell: HTMLElement, x: number, y: number) => {
    menu.show(rows(Number(cell.dataset.r), Number(cell.dataset.c)), x, y)
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
    // Identical clearance from the grid edge on both strips — the table's own
    // padding is asymmetric (`1em 0 1.4em`), so the gap is added here, not in CSS.
    const GAP = 3
    // right edge, spanning the grid height
    addCol.style.left = `${right + GAP}px`
    addCol.style.top = `${top}px`
    addCol.style.height = `${bottom - top}px`
    // bottom edge, spanning the grid width
    addRow.style.left = `${left}px`
    addRow.style.top = `${bottom + GAP}px`
    addRow.style.width = `${right - left}px`
  }

  return { el, layout, openFor, destroy: () => menu.destroy() }
}
