import { useEffect, useReducer } from "react"
import type { ReactNode } from "react"
import type { EditorState } from "@codemirror/state"
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

/** A button to render, normalised from a built-in id or a custom item. */
interface Btn {
  key: string
  icon: ReactNode
  title: string
  run: (view: EditorView) => unknown
  isActive?: (state: EditorState) => boolean
  disabled?: (state: EditorState) => boolean
}

/** Resolve one non-separator item to a renderable button, or `null` to skip it. */
function toButton(item: Exclude<ToolbarItem, "|">, icons: ToolbarProps["icons"]): Btn | null {
  if (typeof item !== "string") {
    const { id, icon, title, run, isActive, disabled } = item
    return { key: id, icon, title, run, isActive, disabled }
  }
  const cmd = BUILTIN_BY_ID[item]
  if (!cmd) return null
  return {
    key: item,
    icon: icons?.[item] ?? DEFAULT_ICONS[item],
    title: cmd.title,
    run: cmd.run,
    isActive: cmd.isActive,
    disabled: cmd.disabled,
  }
}

/**
 * Formatting bar above the editing surface. It holds no document state — each
 * button runs a command against the live `EditorView`. Pressed states are read
 * back from the view whenever the selection, keys, or pointer move. Built-in
 * ids and consumer-supplied {@link ToolbarCustomItem}s render through the same
 * button path.
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
        const btn = toButton(item, icons)
        if (!btn) return null
        const off = disabled || !view || Boolean(btn.disabled?.(view.state))
        const active = Boolean(!off && view && btn.isActive?.(view.state))
        return (
          <button
            key={btn.key}
            type="button"
            className={styles.toolbarButton}
            data-command={btn.key}
            title={btn.title}
            aria-label={btn.title}
            aria-pressed={btn.isActive ? active : undefined}
            data-active={active ? "" : undefined}
            disabled={off}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!view) return
              btn.run(view)
              refresh()
            }}
          >
            {btn.icon}
          </button>
        )
      })}
    </div>
  )
}
