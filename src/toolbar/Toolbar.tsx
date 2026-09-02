import { useEffect, useReducer } from "react"
import type { ReactNode } from "react"
import type { EditorView } from "@codemirror/view"
import styles from "../styles/stylo.module.css"
import type { ToolbarCommandId } from "../types"
import { BUILTIN_BY_ID } from "./commands"
import type { ToolbarItem } from "./config"
import { DEFAULT_ICONS } from "./icons"

export interface ToolbarProps {
  /** The surface the commands act on. `null` while a lazy view is mounting. */
  view: EditorView | null
  /** Ordered items to render; `"|"` is a separator. */
  items: ToolbarItem[]
  /** Per-id glyph overrides; any id left out keeps its built-in icon. */
  icons?: Partial<Record<ToolbarCommandId, ReactNode>>
  /** Render every button inert (e.g. a read-only surface). */
  disabled?: boolean
}

/**
 * Formatting bar above the editing surface. It holds no document state — each
 * button runs a command against the live `EditorView`. Pressed states are read
 * back from the view whenever the selection, keys, or pointer move.
 */
export function Toolbar({ view, items, icons, disabled }: ToolbarProps) {
  const [, refresh] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    if (!view) return
    const el = view.contentDOM
    const events = ["keyup", "mouseup", "input", "focus", "blur"] as const
    for (const ev of events) el.addEventListener(ev, refresh)
    return () => {
      for (const ev of events) el.removeEventListener(ev, refresh)
    }
  }, [view])

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
      {items.map((item, i) => {
        if (item === "|") {
          return <span key={`sep-${i}`} className={styles.toolbarSep} aria-hidden="true" />
        }
        const cmd = BUILTIN_BY_ID[item]
        if (!cmd) return null
        const off = disabled || !view || Boolean(cmd.disabled?.(view.state))
        const active = Boolean(!off && view && cmd.isActive?.(view.state))
        return (
          <button
            key={item}
            type="button"
            className={styles.toolbarButton}
            title={cmd.title}
            aria-label={cmd.title}
            aria-pressed={cmd.isActive ? active : undefined}
            data-active={active ? "" : undefined}
            disabled={off}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!view) return
              cmd.run(view)
              refresh()
            }}
          >
            {icons?.[item] ?? DEFAULT_ICONS[item]}
          </button>
        )
      })}
    </div>
  )
}
