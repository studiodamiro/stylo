import type { Align } from "../toolbar/table-grid"

/** A structural edit requested from a handle menu or an edge `+`. */
export type StructOp =
  | { kind: "insertColumn"; at: number; focus: [number, number] }
  | { kind: "deleteColumn"; at: number; focus: [number, number] }
  | { kind: "insertRow"; at: number; focus: [number, number] }
  | { kind: "deleteRow"; at: number; focus: [number, number] }
  | { kind: "align"; at: number; value: Align }

export interface GizmoHost {
  /** Current grid shape, read when a menu opens. */
  dims: () => { cols: number; rows: number; alignAt: (c: number) => Align }
  /** Apply a structural edit to the model and reserialise. */
  run: (op: StructOp) => void
}

export interface TableGizmos {
  /** Overlay to append inside the positioned table wrapper. */
  el: HTMLElement
  /** Re-place the handles against the current `<table>` layout. */
  layout: (table: HTMLTableElement) => void
  /** Drop the document-level menu listeners. */
  destroy: () => void
}

interface MenuItem {
  label: string
  active?: boolean
  op: StructOp
}

/**
 * The hover affordances on an editable table: a `+` on the right edge and the
 * bottom edge, and a `⋯` handle centred on every column header and every row.
 * Each handle opens a small menu of structural operations. The overlay is
 * `contenteditable="false"` and only its buttons take pointer events, so a click
 * on the table between handles still lands in a cell.
 */
export function createTableGizmos(doc: Document, host: GizmoHost): TableGizmos {
  const el = doc.createElement("div")
  el.className = "cm-inplace-table-gizmos"
  el.setAttribute("contenteditable", "false")

  const colWrap = doc.createElement("div")
  const rowWrap = doc.createElement("div")
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
  el.append(addCol, addRow, colWrap, rowWrap, menu)

  let unbind: (() => void) | null = null
  const closeMenu = () => {
    menu.hidden = true
    unbind?.()
    unbind = null
  }
  const openMenu = (anchor: HTMLElement, items: MenuItem[]) => {
    closeMenu()
    menu.replaceChildren(
      ...items.map((it) => {
        const b = button("cm-inplace-tm-item", it.label, () => {
          host.run(it.op)
          closeMenu()
        })
        b.textContent = it.label
        if (it.active) b.dataset.active = ""
        return b
      }),
    )
    const a = anchor.getBoundingClientRect()
    const base = el.getBoundingClientRect()
    menu.style.left = `${a.left - base.left}px`
    menu.style.top = `${a.bottom - base.top + 4}px`
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

  const columnItems = (c: number): MenuItem[] => {
    const { cols, alignAt } = host.dims()
    const items: MenuItem[] = [
      { label: "Insert left", op: { kind: "insertColumn", at: c, focus: [1, c] } },
      { label: "Insert right", op: { kind: "insertColumn", at: c + 1, focus: [1, c + 1] } },
    ]
    if (cols > 1) {
      items.push({ label: "Delete column", op: { kind: "deleteColumn", at: c, focus: [1, c - 1] } })
    }
    for (const value of ["left", "center", "right"] as const) {
      items.push({
        label: `Align ${value}`,
        active: alignAt(c) === value,
        op: { kind: "align", at: c, value },
      })
    }
    return items
  }

  const rowItems = (r: number): MenuItem[] => {
    const { rows } = host.dims()
    const items: MenuItem[] = []
    if (r > 0)
      items.push({ label: "Insert above", op: { kind: "insertRow", at: r, focus: [r, 0] } })
    items.push({ label: "Insert below", op: { kind: "insertRow", at: r + 1, focus: [r + 1, 0] } })
    if (r > 0 && rows > 2) {
      items.push({ label: "Delete row", op: { kind: "deleteRow", at: r, focus: [r, 0] } })
    }
    return items
  }

  const handle = (kind: "column" | "row", index: number) => {
    const b = button(
      `cm-inplace-tg-handle cm-inplace-tg-handle-${kind === "column" ? "col" : "row"}`,
      kind === "column" ? "Column options" : "Row options",
      () => openMenu(b, kind === "column" ? columnItems(index) : rowItems(index)),
    )
    b.textContent = "⋯"
    return b
  }

  const place = (b: HTMLElement, x: number, y: number) => {
    b.style.left = `${x}px`
    b.style.top = `${y}px`
  }

  const layout = (table: HTMLTableElement) => {
    closeMenu()
    const trs = [...table.rows]
    const ths = [...(table.tHead?.rows[0]?.cells ?? [])]
    if (!trs.length || !ths.length) return

    // Position against the cell grid, not the table's border box (which carries
    // vertical padding), so the handles sit exactly on the outer edges.
    const base = el.getBoundingClientRect()
    const top = trs[0]!.getBoundingClientRect().top - base.top
    const bottom = trs[trs.length - 1]!.getBoundingClientRect().bottom - base.top
    const left = ths[0]!.getBoundingClientRect().left - base.left
    const right = ths[ths.length - 1]!.getBoundingClientRect().right - base.left

    place(addCol, right, (top + bottom) / 2)
    place(addRow, (left + right) / 2, bottom)
    colWrap.replaceChildren(
      ...ths.map((th, c) => {
        const b = handle("column", c)
        const r = th.getBoundingClientRect()
        place(b, r.left + r.width / 2 - base.left, top)
        return b
      }),
    )
    rowWrap.replaceChildren(
      ...trs.map((tr, r) => {
        const b = handle("row", r)
        const r0 = tr.getBoundingClientRect()
        place(b, left, r0.top + r0.height / 2 - base.top)
        return b
      }),
    )
  }

  return { el, layout, destroy: closeMenu }
}
