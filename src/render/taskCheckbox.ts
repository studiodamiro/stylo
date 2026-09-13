/**
 * A task-list item's own `[ ]` / `[x]` marker sits right after its bullet or
 * ordinal and indentation — nothing else can appear before it on the line.
 * Anchoring the match to the very start of the item's raw text (from mdast's
 * `position.start.offset`) makes this safe even when the item's own text
 * could otherwise read as another marker further into the line.
 */
const CHECKBOX_PREFIX = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[([ xX])\]/

/**
 * Locates the exact `[ ]` / `[x]` substring of a task-list item within
 * `value`, given the raw offset where the item itself starts (a GFM
 * `listItem`'s `position.start.offset`, as parsed by `remark-gfm`).
 * Returns `null` if the prefix doesn't match a checkbox — it always should
 * for a node `remark-gfm` marked `checked`, but a raw markdown edit racing
 * the render is not impossible.
 */
export function findCheckboxOffsets(
  value: string,
  itemStart: number,
): { start: number; end: number } | null {
  const prefix = value.slice(itemStart, itemStart + 40)
  const match = CHECKBOX_PREFIX.exec(prefix)
  if (!match) return null
  const start = itemStart + match[0].length - 3
  return { start, end: start + 3 }
}
