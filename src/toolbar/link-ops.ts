import type { InlineStr } from "./inline-ops"

/** The `[text](url)` span of `text` covering `head`, or `null`. */
export function linkAtIn(
  text: string,
  head: number,
): { from: number; to: number; label: string } | null {
  const re = /\[([^\]]*)\]\([^)]*\)/g
  for (let m: RegExpExecArray | null; (m = re.exec(text));) {
    const from = m.index
    const to = from + m[0].length
    if (head >= from && head <= to) return { from, to, label: m[1] ?? "" }
  }
  return null
}

/**
 * Like {@link linkAtIn} but also breaks out the URL and its `[from, to)` span
 * within `text`, for editing just the `(…)` part in place.
 */
export function linkPartsIn(
  text: string,
  head: number,
): { from: number; to: number; label: string; url: string; urlFrom: number; urlTo: number } | null {
  const re = /\[([^\]]*)\]\(([^)]*)\)/g
  for (let m: RegExpExecArray | null; (m = re.exec(text));) {
    const from = m.index
    const to = from + m[0].length
    if (head >= from && head <= to) {
      const label = m[1] ?? ""
      const url = m[2] ?? ""
      const urlFrom = from + 1 + label.length + 2 // `[` + label + `](`
      return { from, to, label, url, urlFrom, urlTo: urlFrom + url.length }
    }
  }
  return null
}

/** Toggle `[text](url)` around `[from, to)` of `text` — wrap, or unlink to the label. */
export function linkString(text: string, from: number, to: number): InlineStr {
  const hit = linkAtIn(text, from)
  if (hit) {
    return {
      text: text.slice(0, hit.from) + hit.label + text.slice(hit.to),
      from: hit.from,
      to: hit.from + hit.label.length,
    }
  }
  const label = text.slice(from, to) || "text"
  const urlAt = from + label.length + 3 // past `[` + label + `](`
  return {
    text: text.slice(0, from) + `[${label}](url)` + text.slice(to),
    from: urlAt,
    to: urlAt + 3,
  }
}
