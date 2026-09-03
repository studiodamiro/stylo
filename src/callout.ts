/**
 * Obsidian-style callouts: a blockquote whose first line is `> [!type]`,
 * optionally `> [!type] Title` or `> [!type]- Title` (the `-` / `+` fold marker
 * is parsed but Stylo always renders expanded).
 *
 * Single source of truth for the in-place decoration scanner (`nodes.ts`) and
 * the preview remark plugin (`remark-callout.ts`), so the two never drift. The
 * many Obsidian type names collapse to five colour buckets; the raw type is kept
 * on a `data-callout` attribute for a `::before` label and consumer styling.
 */

/** `[!type]` with an optional fold marker, anchored after any `>` prefix. */
export const CALLOUT_TOKEN = /^\[!(\w+)\][+-]?[ \t]*/

/** A blockquote head line in the in-place canvas: `> ` prefix, then the token. */
export const CALLOUT_HEAD_LINE = /^([\s>]*)(\[!(\w+)\][+-]?[ \t]*)/

export type CalloutBucket = "note" | "tip" | "warn" | "danger" | "example"

const BUCKET: Record<string, CalloutBucket> = {
  note: "note",
  info: "note",
  abstract: "note",
  summary: "note",
  tldr: "note",
  tip: "tip",
  hint: "tip",
  important: "tip",
  success: "tip",
  check: "tip",
  done: "tip",
  question: "warn",
  help: "warn",
  faq: "warn",
  warning: "warn",
  caution: "warn",
  attention: "warn",
  todo: "warn",
  failure: "danger",
  fail: "danger",
  missing: "danger",
  danger: "danger",
  error: "danger",
  bug: "danger",
  example: "example",
  quote: "example",
  cite: "example",
}

/** The colour bucket for a callout type; unknown types read as `note`. */
export function calloutBucket(type: string): CalloutBucket {
  return BUCKET[type.toLowerCase()] ?? "note"
}
