import type { ToolbarCommandId, ToolbarConfig, ToolbarItem } from "../types"

/**
 * An entry in the rendered bar: a built-in command id, `"|"` for a separator,
 * or a consumer-supplied {@link ToolbarCustomItem}. Defined in `types.ts`;
 * re-exported here because the toolbar internals are the main consumers.
 */
export type { ToolbarItem }

/**
 * The full built-in bar, in display order. Grouped by kind: history, headings,
 * inline text (+ link), the three list markers, block structure, then code and
 * math together. Built-in ids only — a consumer adds custom items through the
 * `toolbar` prop.
 */
export const DEFAULT_TOOLBAR_ITEMS: (ToolbarCommandId | "|")[] = [
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
