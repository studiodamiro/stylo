import type { ToolbarCommandId, ToolbarConfig } from "../types"

/** An entry in the rendered bar: a command id, or `"|"` for a separator. */
export type ToolbarItem = ToolbarCommandId | "|"

/**
 * The full built-in bar, in display order. Grouped by kind: history, headings,
 * inline text (+ link), the three list markers, block structure, then code and
 * math together.
 */
export const DEFAULT_TOOLBAR_ITEMS: ToolbarItem[] = [
  "undo",
  "redo",
  "|",
  "h1",
  "h2",
  "h3",
  "|",
  "bold",
  "italic",
  "strike",
  "link",
  "wikilink",
  "|",
  "bulletList",
  "orderedList",
  "task",
  "|",
  "quote",
  "hr",
  "frontmatter",
  "table",
  "|",
  "code",
  "codeBlock",
  "math",
  "mathBlock",
]

/**
 * Resolve the `toolbar` prop to the list to render:
 * `undefined` / `true` → the default set, `false` → no bar (`null`), an object →
 * its `items` or the default.
 */
export function resolveToolbarItems(
  config: boolean | ToolbarConfig | undefined,
): ToolbarItem[] | null {
  if (config === false) return null
  if (config === undefined || config === true) return DEFAULT_TOOLBAR_ITEMS
  return config.items ?? DEFAULT_TOOLBAR_ITEMS
}
