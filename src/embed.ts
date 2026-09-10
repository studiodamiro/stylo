/**
 * `![[ref]]` transclusion. Capture group 1 is the raw reference — everything
 * between `![[` and `]]`, passed to the host verbatim (any `#heading`,
 * `#^blockid`, or `|size` suffix included). The `g` flag is set for
 * `matchAll` / `exec` loops.
 *
 * Deliberately not built on `WIKILINK_PATTERN`: in an embed the `|` is a size
 * hint (`![[image.png|300]]`), not a display label, so Stylo does not split on
 * it — the whole reference goes to `embedSource`.
 */
export const EMBED_PATTERN = /!\[\[([^\]\n]+?)\]\]/g

/** True when `text` (trimmed) is exactly one `![[ref]]` and nothing else. */
export function isLoneEmbed(text: string): boolean {
  const trimmed = text.trim()
  EMBED_PATTERN.lastIndex = 0
  const m = EMBED_PATTERN.exec(trimmed)
  return m != null && m[0].length === trimmed.length
}
