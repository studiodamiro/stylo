import { useEffect, useId, useRef, useState } from "react"
import type { KeyboardEvent, ReactNode } from "react"
import type { ToolbarCommandId, ToolbarItem } from "../types"
import { DEFAULT_TOOLBAR_ITEMS } from "../toolbar/config"
import { ALL_BUILTIN_IDS } from "../toolbar/labels"
import styles from "./StyloToolbarSettings.module.css"
import {
  append,
  availableNotOnBar,
  itemKey,
  move,
  removeAt,
  resolveDisplay,
  SEPARATOR,
} from "./items"

export interface StyloToolbarSettingsProps {
  /** The toolbar items — the same array passed to `<Stylo toolbar={{ items }}>`. */
  value: ToolbarItem[]
  /** Called with the next items array on every change. */
  onChange: (next: ToolbarItem[]) => void
  /**
   * Every item the user may pick from. Defaults to all built-in command ids;
   * pass a list to add `ToolbarCustomItem`s or to hold some built-ins back.
   */
  available?: ToolbarItem[]
  /** Per-id glyph overrides, matching `<Stylo icons>`. */
  icons?: Partial<Record<ToolbarCommandId, ReactNode>>
  /** Extra class on the root element. */
  className?: string
}

/**
 * A keyboard-accessible editor for the formatting bar's `items`. Controlled:
 * the host owns `value`, persists it, and feeds it to both this component and
 * `<Stylo>`. Holds no state of its own beyond the live-region message.
 *
 * Reordering is by the ↑ / ↓ buttons on each row, or the Arrow keys while a row
 * is focused. Pointer drag-and-drop is a separate, additive layer (not yet
 * shipped) — see the ADR-002 §2 design note.
 */
export function StyloToolbarSettings({
  value,
  onChange,
  available,
  icons,
  className,
}: StyloToolbarSettingsProps) {
  const barHeadId = useId()
  const availHeadId = useId()
  const [message, setMessage] = useState("")
  const rowRefs = useRef<(HTMLLIElement | null)[]>([])
  const focusAfter = useRef<number | null>(null)

  // Restore focus to the row that moved / was added, after the list re-renders.
  useEffect(() => {
    if (focusAfter.current == null) return
    rowRefs.current[focusAfter.current]?.focus()
    focusAfter.current = null
  })

  const paletteItems = availableNotOnBar(available ?? ALL_BUILTIN_IDS, value)

  function reorder(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return
    const label = resolveDisplay(value[from]!, icons).label
    onChange(move(value, from, to))
    focusAfter.current = to
    setMessage(`${label} moved to position ${to + 1} of ${value.length}`)
  }

  function removeSlot(index: number) {
    const label = resolveDisplay(value[index]!, icons).label
    onChange(removeAt(value, index))
    focusAfter.current = Math.min(index, value.length - 2)
    setMessage(`${label} removed from the bar`)
  }

  function add(item: ToolbarItem) {
    onChange(append(value, item))
    focusAfter.current = value.length
    setMessage(`${resolveDisplay(item, icons).label} added to the bar`)
  }

  function reset() {
    onChange([...DEFAULT_TOOLBAR_ITEMS])
    setMessage("Toolbar reset to the default set")
  }

  function onRowKeyDown(e: KeyboardEvent<HTMLLIElement>, index: number) {
    if (e.key === "ArrowUp") {
      e.preventDefault()
      reorder(index, index - 1)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      reorder(index, index + 1)
    }
  }

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <section className={styles.col}>
        <h3 className={styles.colHead} id={barHeadId}>
          On the bar
        </h3>
        <ul className={styles.list} aria-labelledby={barHeadId}>
          {value.map((item, i) => {
            const { icon, label } = resolveDisplay(item, icons)
            return (
              <li
                key={itemKey(item, i)}
                ref={(el) => {
                  rowRefs.current[i] = el
                }}
                className={styles.row}
                tabIndex={0}
                aria-label={`${label}, position ${i + 1} of ${value.length}`}
                onKeyDown={(e) => onRowKeyDown(e, i)}
              >
                <span className={styles.glyph} aria-hidden="true">
                  {icon}
                </span>
                <span className={styles.label}>{label}</span>
                <span className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    title="Move up"
                    aria-label={`Move ${label} up`}
                    disabled={i === 0}
                    onClick={() => reorder(i, i - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    title="Move down"
                    aria-label={`Move ${label} down`}
                    disabled={i === value.length - 1}
                    onClick={() => reorder(i, i + 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    title="Remove"
                    aria-label={`Remove ${label} from the bar`}
                    onClick={() => removeSlot(i)}
                  >
                    ✕
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
        <div className={styles.footer}>
          <button type="button" className={styles.textButton} onClick={() => add(SEPARATOR)}>
            Add separator
          </button>
          <button type="button" className={styles.textButton} onClick={reset}>
            Reset to default
          </button>
        </div>
      </section>

      <section className={styles.col}>
        <h3 className={styles.colHead} id={availHeadId}>
          Available
        </h3>
        <ul className={styles.list} aria-labelledby={availHeadId}>
          {paletteItems.length === 0 && (
            <li className={styles.empty}>Every button is on the bar.</li>
          )}
          {paletteItems.map((item, i) => {
            const { icon, label } = resolveDisplay(item, icons)
            return (
              <li key={itemKey(item, i)} className={styles.row}>
                <span className={styles.glyph} aria-hidden="true">
                  {icon}
                </span>
                <span className={styles.label}>{label}</span>
                <span className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.textButton}
                    aria-label={`Add ${label} to the bar`}
                    onClick={() => add(item)}
                  >
                    Add
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <div aria-live="polite" className={styles.srOnly}>
        {message}
      </div>
    </div>
  )
}
