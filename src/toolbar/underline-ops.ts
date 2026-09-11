import type { InlineStr } from "./inline-ops"

/** The `<u>…</u>` span of `text` covering `head` (case-insensitive), or `null`. */
export function underlineAtIn(
  text: string,
  head: number,
): { from: number; to: number; inner: string } | null {
  const re = /<u>([\s\S]*?)<\/u>/gi
  for (let m: RegExpExecArray | null; (m = re.exec(text));) {
    const from = m.index
    const to = from + m[0].length
    if (head >= from && head <= to) return { from, to, inner: m[1] ?? "" }
  }
  return null
}

/**
 * Toggle `<u>…</u>` around `[from, to)` of `text`. Markdown has no underline, so
 * this is a raw HTML tag pair — it renders wherever the host renders inline HTML
 * (Obsidian, GitHub). Wrap the slice, or unwrap a span the caret is already in
 * to its inner text.
 */
export function underlineString(text: string, from: number, to: number): InlineStr {
  const hit = underlineAtIn(text, from)
  if (hit) {
    return {
      text: text.slice(0, hit.from) + hit.inner + text.slice(hit.to),
      from: hit.from,
      to: hit.from + hit.inner.length,
    }
  }
  const inner = text.slice(from, to) || "text"
  return {
    text: text.slice(0, from) + `<u>${inner}</u>` + text.slice(to),
    from: from + 3, // past `<u>`
    to: from + 3 + inner.length,
  }
}
