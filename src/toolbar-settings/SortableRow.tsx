import type { ReactNode } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import styles from "./StyloToolbarSettings.module.css"

/**
 * One draggable row in the "On the bar" list. The drag handle carries the
 * `@dnd-kit` listeners (pointer and keyboard), so the row's own action buttons
 * stay independently focusable and clickable.
 */
export function SortableRow({
  id,
  label,
  icon,
  position,
  count,
  actions,
}: {
  id: string
  label: string
  icon: ReactNode
  position: number
  count: number
  actions: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  return (
    <li
      ref={setNodeRef}
      className={styles.row}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-dragging={isDragging || undefined}
    >
      <button
        type="button"
        className={styles.handle}
        aria-label={`Reorder ${label}, position ${position} of ${count}`}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⠿</span>
      </button>
      <span className={styles.glyph} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.label}>{label}</span>
      <span className={styles.rowActions}>{actions}</span>
    </li>
  )
}
