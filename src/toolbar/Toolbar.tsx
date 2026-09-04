import { useEffect, useReducer, useState } from "react"
import type { ReactNode } from "react"
import type { EditorState } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import styles from "../styles/stylo.module.css"
import type { ToolbarCommandId } from "../types"
import { BUILTIN_BY_ID } from "./commands"
import type { ToolbarItem } from "./config"
import { DEFAULT_ICONS } from "./icons"
import { useKeyboardInset } from "./keyboard-inset"

export interface ToolbarProps {
  /** The surface the commands act on. `null` while a lazy view is mounting. */
  view: EditorView | null
  /** Ordered items to render; `"|"` is a separator. */
  items: ToolbarItem[]
  /** Per-id glyph overrides; any id left out keeps its built-in icon. */
  icons?: Partial<Record<ToolbarCommandId, ReactNode>>
  /** Render every button inert (e.g. a read-only surface). */
  disabled?: boolean
  /** Fix the bar to a window edge (normalised from `ToolbarConfig.sticky`; the
   *  caller resolves `true` to `"bottom"`). */
  sticky?: "top" | "bottom" | false
  /** Fade the bar out while the editing surface is unfocused (`ToolbarConfig.stickyVisibility`). */
  stickyVisibility?: "consistent" | "dynamic"
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
export function Toolbar({ view, items, icons, disabled, sticky, stickyVisibility }: ToolbarProps) {
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const [focused, setFocused] = useState(false)
  // Only "bottom" needs keyboard tracking — nothing eats into the top of the
  // screen the way a keyboard eats the bottom.
  const keyboardInset = useKeyboardInset(sticky === "bottom")

  useEffect(() => {
    if (!view) return
    const el = view.contentDOM
    setFocused(view.hasFocus)
    const onFocus = () => {
      setFocused(true)
      refresh()
    }
    const onBlur = () => {
      setFocused(false)
      refresh()
    }
    const events = ["keyup", "mouseup", "input"] as const
    for (const ev of events) el.addEventListener(ev, refresh)
    el.addEventListener("focus", onFocus)
    el.addEventListener("blur", onBlur)
    return () => {
      for (const ev of events) el.removeEventListener(ev, refresh)
      el.removeEventListener("focus", onFocus)
      el.removeEventListener("blur", onBlur)
    }
  }, [view])

  // "dynamic" fades the bar out while nothing is focused, so it doesn't sit
  // over the content while the caret is elsewhere (e.g. scrolling to read).
  const dynamicHidden = Boolean(sticky) && stickyVisibility === "dynamic" && !focused

  const className = [
    styles.toolbar,
    sticky && styles.toolbarSticky,
    sticky === "top" && styles.toolbarStickyTop,
    sticky === "bottom" && styles.toolbarStickyBottom,
    dynamicHidden && styles.toolbarStickyHidden,
  ]
    .filter(Boolean)
    .join(" ")
  // `transform`, not `bottom` — a `position: fixed` element repositioned via
  // `bottom` doesn't reliably repaint in step with the keyboard animation on
  // iOS Safari; `translateY` forces a compositor update on every
  // `visualViewport` event instead. The bar's resting position (keyboard
  // closed) is `bottom: 0` in CSS; this only nudges it up. `"top"` needs no
  // offset at all.
  const stickyStyle =
    sticky === "bottom" ? { transform: `translateY(-${keyboardInset}px)` } : undefined

  return (
    <div
      className={className}
      role="toolbar"
      aria-label="Formatting"
      aria-hidden={dynamicHidden || undefined}
      style={stickyStyle}
    >
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
