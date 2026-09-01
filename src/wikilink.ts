/**
 * `[[target]]` or `[[target|label]]`. Capture group 1 is the target, group 2 the
 * optional display label. The `g` flag is set for `matchAll` / `exec` loops;
 * callers that keep the regex across calls must reset `lastIndex` (or use
 * `matchAll`, which is stateless).
 *
 * Single source of truth for both the render-side plugin (`remark-wikilink`) and
 * the in-place decoration scanner, so the two never drift.
 */
export const WIKILINK_PATTERN = /\[\[([^\]|\n]+?)(?:\|([^\]\n]+?))?\]\]/g
