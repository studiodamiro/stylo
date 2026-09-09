import type { ReactNode } from "react"
import type { ToolbarCommandId, ToolbarItem } from "../types"
import { DEFAULT_ICONS } from "../toolbar/icons"
import { BUILTIN_LABELS } from "../toolbar/labels"

/** The `"|"` separator slot. */
export const SEPARATOR = "|" as const

export function isSeparator(item: ToolbarItem): item is "|" {
  return item === SEPARATOR
}

/** Stable identity of a non-separator item; `null` for a separator. */
export function itemId(item: ToolbarItem): string | null {
  if (isSeparator(item)) return null
  return typeof item === "string" ? item : item.id
}

/** React key for a slot — separators fall back to their position. */
export function itemKey(item: ToolbarItem, index: number): string {
  return itemId(item) ?? `separator-${index}`
}

interface Display {
  /** `null` for a separator. */
  id: string | null
  label: string
  icon: ReactNode
}

/** Icon + label for a slot, honouring a consumer `icons` override for built-ins. */
export function resolveDisplay(
  item: ToolbarItem,
  icons?: Partial<Record<ToolbarCommandId, ReactNode>>,
): Display {
  if (isSeparator(item)) return { id: null, label: "Separator", icon: null }
  if (typeof item !== "string") return { id: item.id, label: item.title, icon: item.icon }
  return {
    id: item,
    label: BUILTIN_LABELS[item] ?? item,
    icon: icons?.[item] ?? DEFAULT_ICONS[item] ?? null,
  }
}

/** Palette entries not already on the bar (matched by id; separators excluded). */
export function availableNotOnBar(
  available: readonly ToolbarItem[],
  onBar: readonly ToolbarItem[],
): ToolbarItem[] {
  const used = new Set(onBar.map(itemId).filter((id): id is string => id !== null))
  return available.filter((item) => {
    const id = itemId(item)
    return id !== null && !used.has(id)
  })
}

export function move<T>(arr: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length || from === to) return arr.slice()
  const next = arr.slice()
  const [picked] = next.splice(from, 1)
  next.splice(to, 0, picked as T)
  return next
}

export function removeAt<T>(arr: readonly T[], index: number): T[] {
  const next = arr.slice()
  next.splice(index, 1)
  return next
}

export function append<T>(arr: readonly T[], value: T): T[] {
  return [...arr, value]
}
